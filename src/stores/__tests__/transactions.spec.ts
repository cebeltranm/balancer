import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useTransactionsStore } from "@/stores/transactions";
import { readJsonFile } from "@/helpers/files";
import * as idb from "@/helpers/idb";

const updatePendingToSync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
}));

vi.mock("@/helpers/idb", () => ({
  getAllTransactions: vi.fn(),
  saveTransaction: vi.fn(),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    updatePendingToSync,
  }),
}));

describe("transactions store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    updatePendingToSync.mockResolvedValue(undefined);
  });

  it("loads month transactions and merges pending entries", async () => {
    vi.mocked(readJsonFile).mockResolvedValue([
      { id: 1, date: "2025-02-15", description: "A", values: [] },
      { id: 2, date: "2025-02-10", description: "B", values: [] },
    ]);

    vi.mocked(idb.getAllTransactions).mockResolvedValue([
      { id: 1, date: "2025-02-15", description: "A-edit", values: [] },
      {
        id: 3,
        date: "2025-02-20",
        description: "C",
        values: [],
        deleted: false,
      },
      {
        id: 4,
        date: "2025-02-01",
        description: "D",
        values: [],
        deleted: true,
      },
    ] as any);

    const store = useTransactionsStore();
    const data = await store.loadTransactionsForMonth(2025, 2, true);

    expect(data.map((t: any) => t.id)).toEqual([3, 1, 2]);
    expect(data.find((t: any) => t.id === 1)?.to_sync).toBe(true);
  });

  it("saves transaction without to_sync and triggers pending update", async () => {
    vi.mocked(readJsonFile).mockResolvedValue([]);
    vi.mocked(idb.getAllTransactions).mockResolvedValue([] as any);

    const store = useTransactionsStore();
    await store.saveTransaction({
      id: 11,
      date: "2025-02-20",
      description: "new",
      values: [{ accountId: "a", accountValue: 10 }],
      to_sync: true,
    } as any);

    expect(idb.saveTransaction).toHaveBeenCalledWith({
      id: 11,
      date: "2025-02-20",
      description: "new",
      values: [{ accountId: "a", accountValue: 10 }],
    });
    expect(updatePendingToSync).toHaveBeenCalled();
  });

  it("marks transaction as deleted when deleting", async () => {
    const store = useTransactionsStore();
    await store.deleteTransaction({
      id: 99,
      date: "2025-02-20",
      description: "x",
      values: [],
    } as any);

    expect(idb.saveTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99, deleted: true }),
    );
    expect(updatePendingToSync).toHaveBeenCalled();
  });
});
