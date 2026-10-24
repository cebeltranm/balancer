import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/helpers/idb", () => ({
  getJsonFile: vi.fn(),
  saveJsonFile: vi.fn(),
}));

const readJsonFileMock = vi.fn();
const writeJsonFileMock = vi.fn();

vi.mock("@/helpers/storage", () => ({
  getStorage: () => ({
    readJsonFile: readJsonFileMock,
    writeJsonFile: writeJsonFileMock,
  }),
}));

import * as idb from "@/helpers/idb";
import { CLEAR_MESSAGES, EVENTS } from "@/helpers/events";
import {
  approveInvalidFileOverwrite,
  isInvalidRemoteFile,
  readJsonFile,
  writeJsonFile,
} from "@/helpers/files";
import { PersistedFileError } from "@/helpers/persistedFileErrors";

describe("files helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached data when available", async () => {
    vi.mocked(idb.getJsonFile).mockResolvedValue({ data: { a: 1 } } as any);

    const data = await readJsonFile("config.json", true);
    expect(data).toEqual({ a: 1 });
    expect(readJsonFileMock).not.toHaveBeenCalled();
  });

  it("serves cached data without contacting the provider while offline (RT-024)", async () => {
    vi.mocked(idb.getJsonFile).mockResolvedValue({ data: { a: 1 } } as any);
    readJsonFileMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(readJsonFile("config.json", true)).resolves.toEqual({ a: 1 });
    expect(readJsonFileMock).not.toHaveBeenCalled();
  });

  it("returns an unavailable result instead of throwing for an uncached file while offline (RT-024)", async () => {
    vi.mocked(idb.getJsonFile).mockResolvedValue(undefined as any);
    readJsonFileMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(readJsonFile("values_2025.json", true)).resolves.toBe(false);
    expect(idb.saveJsonFile).not.toHaveBeenCalled();
  });

  it("reads from storage and caches result", async () => {
    vi.mocked(idb.getJsonFile).mockResolvedValue(undefined as any);
    readJsonFileMock.mockResolvedValue({ b: 2 });

    const data = await readJsonFile("config.json", true);
    expect(data).toEqual({ b: 2 });
    expect(idb.saveJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "config.json", to_sync: false }),
    );
  });

  it("does not cache invalid remote JSON or overwrite it automatically", async () => {
    const emit = vi.spyOn(EVENTS, "emit");
    vi.mocked(idb.getJsonFile).mockResolvedValue(undefined as any);
    readJsonFileMock.mockRejectedValueOnce(
      new PersistedFileError(
        "invalid_file",
        "accounts.json",
        "accounts.json contains invalid JSON.",
      ),
    );

    await expect(readJsonFile("accounts.json", true)).rejects.toMatchObject({
      code: "invalid_file",
      fileName: "accounts.json",
      recoverable: true,
    });

    const saved = await writeJsonFile("accounts.json", { accounts: {} });

    expect(saved).toBe(false);
    expect(idb.saveJsonFile).not.toHaveBeenCalled();
    expect(writeJsonFileMock).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith("message", {
      severity: "error",
      summary: "Invalid file",
      message: expect.stringContaining("accounts.json"),
      life: 0,
      closable: true,
      group: "invalid-file:accounts.json",
      fileName: "accounts.json",
    });
  });

  it.each([
    "accounts.json",
    "config.json",
    "values_2025.json",
    "budget_2025.json",
    "balance_2025.json",
    "transactions_2025_2.json",
  ])(
    "shows a persistent error toast naming %s and blocks writes to it",
    async (fileName) => {
      const emit = vi.spyOn(EVENTS, "emit");
      vi.mocked(idb.getJsonFile).mockResolvedValue(undefined as any);
      readJsonFileMock.mockRejectedValueOnce(
        new PersistedFileError("malformed_file", fileName, "malformed"),
      );

      await expect(readJsonFile(fileName, true)).rejects.toMatchObject({
        code: "malformed_file",
        fileName,
        recoverable: true,
      });

      expect(emit).toHaveBeenCalledWith(
        "message",
        expect.objectContaining({
          severity: "error",
          life: 0,
          closable: true,
          message: expect.stringContaining(fileName),
          group: `invalid-file:${fileName}`,
        }),
      );
      await expect(writeJsonFile(fileName, {})).resolves.toBe(false);
      expect(writeJsonFileMock).not.toHaveBeenCalled();
      expect(idb.saveJsonFile).not.toHaveBeenCalled();
    },
  );

  it("clears the invalid-file toast group when a later read succeeds", async () => {
    const emit = vi.spyOn(EVENTS, "emit");
    vi.mocked(idb.getJsonFile).mockResolvedValue(undefined as any);
    readJsonFileMock.mockRejectedValueOnce(
      new PersistedFileError("invalid_file", "values_2025.json", "invalid"),
    );
    await expect(readJsonFile("values_2025.json", true)).rejects.toBeTruthy();

    readJsonFileMock.mockResolvedValueOnce({ ok: 1 });
    await expect(readJsonFile("values_2025.json", true)).resolves.toEqual({
      ok: 1,
    });

    expect(emit).toHaveBeenCalledWith(
      CLEAR_MESSAGES,
      "invalid-file:values_2025.json",
    );
  });

  it("logs a failed write with console.error, not console.log", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const failure = new Error("disk full");
    writeJsonFileMock.mockRejectedValueOnce(failure);

    await expect(writeJsonFile("x.json", { x: 1 })).resolves.toBe(false);

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("x.json"),
      failure,
    );
    expect(log).not.toHaveBeenCalled();
  });

  it("writes through storage and caches on success", async () => {
    writeJsonFileMock.mockResolvedValue(true);

    const ok = await writeJsonFile("x.json", { x: 1 });
    expect(ok).toBe(true);
    expect(idb.saveJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "x.json", data: { x: 1 } }),
    );
  });

  describe("RT-051 recovery", () => {
    it("reports the file as invalid, then valid after an uncached retry succeeds", async () => {
      vi.mocked(idb.getJsonFile).mockResolvedValue(undefined as any);
      readJsonFileMock.mockRejectedValueOnce(
        new PersistedFileError("invalid_file", "values_2031.json", "bad"),
      );
      await expect(readJsonFile("values_2031.json", false)).rejects.toThrow();
      expect(isInvalidRemoteFile("values_2031.json")).toBe(true);

      readJsonFileMock.mockResolvedValueOnce({ ok: 1 });
      await expect(readJsonFile("values_2031.json", false)).resolves.toEqual({
        ok: 1,
      });
      expect(isInvalidRemoteFile("values_2031.json")).toBe(false);
    });

    it("keeps serving the cached copy while the remote file is invalid", async () => {
      vi.mocked(idb.getJsonFile).mockResolvedValue({ data: { a: 1 } } as any);
      await expect(readJsonFile("values_2032.json", true)).resolves.toEqual({
        a: 1,
      });
      expect(readJsonFileMock).not.toHaveBeenCalled();
    });

    it("keeps the invalid state when a retry still finds an invalid file", async () => {
      vi.mocked(idb.getJsonFile).mockResolvedValue(undefined as any);
      readJsonFileMock.mockRejectedValue(
        new PersistedFileError("invalid_file", "values_2033.json", "bad"),
      );
      await expect(readJsonFile("values_2033.json", false)).rejects.toThrow();
      await expect(readJsonFile("values_2033.json", false)).rejects.toThrow();
      expect(isInvalidRemoteFile("values_2033.json")).toBe(true);
      await expect(writeJsonFile("values_2033.json", {})).resolves.toBe(false);
      readJsonFileMock.mockReset();
    });

    it("lets an approved overwrite read the invalid file as missing and write it", async () => {
      const emit = vi.spyOn(EVENTS, "emit");
      vi.mocked(idb.getJsonFile).mockResolvedValue(undefined as any);
      readJsonFileMock.mockRejectedValue(
        new PersistedFileError("invalid_file", "balance_2034.json", "bad"),
      );
      await expect(readJsonFile("balance_2034.json", false)).rejects.toThrow();

      approveInvalidFileOverwrite("balance_2034.json");
      expect(emit).toHaveBeenCalledWith(
        CLEAR_MESSAGES,
        "invalid-file:balance_2034.json",
      );
      await expect(readJsonFile("balance_2034.json", false)).resolves.toBe(
        false,
      );
      expect(isInvalidRemoteFile("balance_2034.json")).toBe(false);

      writeJsonFileMock.mockResolvedValue(true);
      await expect(writeJsonFile("balance_2034.json", { a: 1 })).resolves.toBe(
        true,
      );
      expect(writeJsonFileMock).toHaveBeenCalledWith("balance_2034.json", {
        a: 1,
      });
      readJsonFileMock.mockReset();
    });
  });
});
