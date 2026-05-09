import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/helpers/idb", () => ({
  getAllTransactions: vi.fn(),
  saveJsonFile: vi.fn(),
  removeTransactions: vi.fn(),
  getAllFilesInCache: vi.fn(),
  getJsonFile: vi.fn(),
}));

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  getLastModificationMock: vi.fn(),
}));

vi.mock("@/helpers/storage", () => ({
  getStorage: vi.fn(() => ({
    getLastModification: storageMocks.getLastModificationMock,
  })),
}));

import * as idb from "@/helpers/idb";
import * as files from "@/helpers/files";
import { EVENTS } from "@/helpers/events";
import {
  getAllFilesInCache,
  syncFiles,
  syncTransactions,
} from "@/helpers/sync";

describe("sync helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.getLastModificationMock.mockResolvedValue(undefined);
  });

  it("syncs pending transactions by month and clears queue", async () => {
    vi.mocked(idb.getAllTransactions).mockResolvedValue([
      { id: 1, date: "2025-02-10", description: "local edit" },
      { id: 2, date: "2025-02-11", deleted: true },
      { id: 3, date: "2025-02-12", description: "local new" },
    ] as any);
    vi.mocked(files.readJsonFile).mockResolvedValue([
      { id: 1, date: "2025-02-10", description: "remote stale" },
      { id: 2, date: "2025-02-11", description: "remote deleted locally" },
      { id: 9, date: "2025-02-09", description: "remote kept" },
    ]);

    const res = await syncTransactions();

    expect(res).toEqual([{ year: 2025, month: 2 }]);
    expect(idb.saveJsonFile).toHaveBeenCalledWith({
      id: "transactions_2025_2.json",
      data: [
        { id: 9, date: "2025-02-09", description: "remote kept" },
        { id: 1, date: "2025-02-10", description: "local edit" },
        { id: 3, date: "2025-02-12", description: "local new" },
      ],
      date_cached: expect.any(Number),
      to_sync: true,
    });
    expect(idb.removeTransactions).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("lists cached file timestamps and syncs files marked to_sync", async () => {
    vi.mocked(idb.getAllFilesInCache).mockResolvedValue([
      "a.json",
      "b.json",
    ] as any);
    vi.mocked(idb.getJsonFile)
      .mockResolvedValueOnce({
        date_cached: 100,
        to_sync: true,
        data: { a: 1 },
      } as any)
      .mockResolvedValueOnce({
        date_cached: 200,
        to_sync: false,
        data: { b: 2 },
      } as any)
      .mockResolvedValueOnce({
        date_cached: 100,
        to_sync: true,
        data: { a: 1 },
      } as any)
      .mockResolvedValueOnce({
        date_cached: 200,
        to_sync: false,
        data: { b: 2 },
      } as any);
    vi.mocked(files.writeJsonFile).mockResolvedValue(true);

    const cache = await getAllFilesInCache();
    const synced = await syncFiles();

    expect(cache).toEqual({ "a.json": 100, "b.json": 200 });
    expect(synced).toEqual([{ fileName: "a.json", stored: true }, undefined]);
  });

  it("uploads whole-file conflicts with last writer wins and warning metadata", async () => {
    const emit = vi.spyOn(EVENTS, "emit");
    vi.mocked(idb.getAllFilesInCache).mockResolvedValue(["budget_2025.json"]);
    vi.mocked(idb.getJsonFile).mockResolvedValue({
      date_cached: 100,
      to_sync: true,
      data: { 1: { food: 50 } },
      remote_modified: 200,
    } as any);
    vi.mocked(files.writeJsonFile).mockResolvedValue(true);

    const synced = await syncFiles();

    expect(files.writeJsonFile).toHaveBeenCalledWith("budget_2025.json", {
      1: { food: 50 },
    });
    expect(synced).toEqual([
      {
        fileName: "budget_2025.json",
        stored: true,
        conflict: true,
        warning: expect.stringContaining("budget_2025.json"),
      },
    ]);
    expect(emit).toHaveBeenCalledWith("message", {
      severity: "warn",
      summary: "Sync conflict",
      message: expect.stringContaining("budget_2025.json"),
    });
  });

  it("reports failed uploads and leaves cached files queued for retry", async () => {
    vi.mocked(idb.getAllFilesInCache).mockResolvedValue(["values_2025.json"]);
    vi.mocked(idb.getJsonFile).mockResolvedValue({
      date_cached: 100,
      to_sync: true,
      data: { 1: { cash: 10 } },
    } as any);
    vi.mocked(files.writeJsonFile).mockResolvedValue(false);

    const synced = await syncFiles();

    expect(synced).toEqual([
      {
        fileName: "values_2025.json",
        stored: false,
        error: expect.stringContaining("values_2025.json"),
      },
    ]);
    expect(idb.getJsonFile).toHaveBeenCalledWith("values_2025.json");
    expect(idb.saveJsonFile).not.toHaveBeenCalled();
  });
});
