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
import { EVENTS } from "@/helpers/events";
import { readJsonFile, writeJsonFile } from "@/helpers/files";
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
    });
  });

  it("writes through storage and caches on success", async () => {
    writeJsonFileMock.mockResolvedValue(true);

    const ok = await writeJsonFile("x.json", { x: 1 });
    expect(ok).toBe(true);
    expect(idb.saveJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "x.json", data: { x: 1 } }),
    );
  });
});
