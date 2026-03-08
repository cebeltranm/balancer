import { beforeEach, describe, expect, it, vi } from "vitest";

const { put, getAllKeys, getAll, get, del } = vi.hoisted(() => ({
  put: vi.fn(),
  getAllKeys: vi.fn(),
  getAll: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}));

vi.mock("idb", () => ({
  openDB: vi.fn().mockResolvedValue({
    put,
    getAllKeys,
    getAll,
    get,
    delete: del,
  }),
  deleteDB: vi.fn(),
  wrap: vi.fn(),
  unwrap: vi.fn(),
}));

import {
  countFilesToSync,
  countTransactions,
  getAllFilesInCache,
  getAllTransactions,
  getJsonFile,
  removeFile,
  removeTransactions,
  saveJsonFile,
  saveTransaction,
} from "@/helpers/idb";

describe("idb helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves and queries transactions/files through idb db methods", async () => {
    getAllKeys
      .mockResolvedValueOnce(["t1", "t2"])
      .mockResolvedValueOnce(["f1"]);
    getAll
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ to_sync: true }, { to_sync: false }]);
    get.mockResolvedValue({ id: "config.json" });

    await saveTransaction({ id: 1 });
    expect(put).toHaveBeenCalledWith("transactions", { id: 1 });

    expect(await countTransactions()).toBe(2);
    expect(await getAllTransactions()).toEqual([{ id: 1 }]);
    await removeTransactions(["a", "b"]);
    expect(del).toHaveBeenCalledWith("transactions", "a");

    await saveJsonFile({ id: "x.json" });
    expect(put).toHaveBeenCalledWith("files", { id: "x.json" });

    expect(await getJsonFile("config.json")).toEqual({ id: "config.json" });
    expect(await getAllFilesInCache()).toEqual(["f1"]);

    await removeFile("x.json");
    expect(del).toHaveBeenCalledWith("files", "x.json");

    expect(await countFilesToSync()).toBe(1);
  });
});
