import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import { useBudgetStore } from "@/stores/budget";
import { Period } from "@/types";
import { readJsonFile } from "@/helpers/files";
import * as idb from "@/helpers/idb";

const updatePendingToSync = vi.fn();

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
}));

vi.mock("@/helpers/idb", () => ({
  saveJsonFile: vi.fn(),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    updatePendingToSync,
  }),
}));

describe("budget store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("loads yearly budget and comments", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      values: { food: { 1: 100 } },
      comments: { food: { 1: [{ m: "note", d: 1700000000000 }] } },
    });

    const store = useBudgetStore();
    const data = await store.loadBudgetForYear(2025, true);

    expect(data.food[1]).toBe(100);
    expect(store.comments[2025].food[1]).toEqual([
      { m: "note", d: 1700000000000 },
    ]);
  });

  it("uses default data for missing additive budget structures", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      values: { food: { 1: 100 } },
    });

    const store = useBudgetStore();
    const data = await store.loadBudgetForYear(2025, true);

    expect(data).toEqual({ food: { 1: 100 } });
    expect(store.comments[2025]).toEqual({});
  });

  it("groups budget and comments by period", () => {
    const accountsStore = useAccountsStore();
    const budgetStore = useBudgetStore();

    accountsStore.accounts = {
      food: {
        id: "food",
        name: "Food",
        type: "Expense" as any,
        currency: "usd",
        category: [],
      },
    };

    budgetStore.budget = {
      2025: { food: { 1: 100, 2: 200, 3: 50 } },
    };
    budgetStore.comments = {
      2025: {
        food: {
          1: [{ m: "a", d: 1 }],
          3: [
            { m: "b", d: 2 },
            { m: "c", d: 3 },
          ],
        },
      },
    };

    const grouped = budgetStore.getBudgetGrupedByPeriod(Period.Quarter, 1, {
      year: 2025,
      quarter: 1,
      month: 3,
    });

    expect(grouped.budget.food[0]).toBe(350);
    expect(grouped.comments.food[0]).toEqual([
      { m: "a", d: 1 },
      { m: "b", d: 2 },
      { m: "c", d: 3 },
    ]);
  });

  it("persists yearly budget and updates pending sync", async () => {
    const store = useBudgetStore();
    await store.setBudgetForYear(
      2025,
      { food: { 1: 90 } },
      { food: { 1: [{ m: "ok", d: 10 }] } },
    );

    expect(idb.saveJsonFile).toHaveBeenCalledTimes(1);
    expect(idb.saveJsonFile).toHaveBeenCalledWith({
      id: "budget_2025.json",
      data: {
        values: { food: { 1: 90 } },
        comments: { food: { 1: [{ m: "ok", d: 10 }] } },
      },
      date_cached: expect.any(Number),
      to_sync: true,
    });
    expect(updatePendingToSync).toHaveBeenCalledTimes(1);
    expect(store.budget[2025].food[1]).toBe(90);
  });

  it("treats failed local budget queue writes as blocking", async () => {
    const error = new Error("IndexedDB unavailable");
    const rejectedWrite = Promise.reject(error);
    rejectedWrite.catch(() => undefined);
    vi.mocked(idb.saveJsonFile).mockReturnValue(rejectedWrite as any);

    const store = useBudgetStore();
    store.budget = { 2025: { food: { 1: 100 } } };
    store.comments = {
      2025: { food: { 1: [{ m: "existing", d: 5 }] } },
    };

    await expect(
      store.setBudgetForYear(
        2025,
        { food: { 1: 90 } },
        { food: { 1: [{ m: "new", d: 6 }] } },
      ),
    ).rejects.toBe(error);

    expect(updatePendingToSync).not.toHaveBeenCalled();
    expect(store.budget[2025].food[1]).toBe(100);
    expect(store.comments[2025].food[1]).toEqual([{ m: "existing", d: 5 }]);
  });
  describe("budget comment shape (RT-033)", () => {
    beforeEach(() => {
      vi.mocked(idb.saveJsonFile).mockResolvedValue(undefined as any);
    });

    it("keeps stored { m, d } comments unchanged on load", async () => {
      const stored = [
        { m: "first", d: 1700000000000 },
        { m: "second", d: 1700000000001 },
      ];
      vi.mocked(readJsonFile).mockResolvedValue({
        values: {},
        comments: { food: { 1: stored } },
      });

      const store = useBudgetStore();
      await store.loadBudgetForYear(2025, true);

      expect(store.comments[2025].food[1]).toEqual(stored);
    });

    it("reads legacy plain-string comments as { m, d: 0 }", async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        values: {},
        comments: { food: { 1: ["old note", "another"] } },
      });

      const store = useBudgetStore();
      await store.loadBudgetForYear(2025, true);

      expect(store.comments[2025].food[1]).toEqual([
        { m: "old note", d: 0 },
        { m: "another", d: 0 },
      ]);
    });

    it("normalizes mixed arrays, keeping order and stored creation times", async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        values: {},
        comments: {
          food: { 1: ["legacy", { m: "new", d: 1700000000000 }, "legacy 2"] },
        },
      });

      const store = useBudgetStore();
      await store.loadBudgetForYear(2025, true);

      expect(store.comments[2025].food[1]).toEqual([
        { m: "legacy", d: 0 },
        { m: "new", d: 1700000000000 },
        { m: "legacy 2", d: 0 },
      ]);
    });

    it("does not add an author field to comments", async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        values: {},
        comments: { food: { 1: ["legacy", { m: "new", d: 5 }] } },
      });

      const store = useBudgetStore();
      await store.loadBudgetForYear(2025, true);

      for (const comment of store.comments[2025].food[1] || []) {
        expect(Object.keys(comment).sort()).toEqual(["d", "m"]);
      }
    });

    it("does not rewrite or queue a sync when a legacy year is only loaded", async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        values: {},
        comments: { food: { 1: ["legacy"] } },
      });

      const store = useBudgetStore();
      await store.loadBudgetForYear(2025, true);

      expect(idb.saveJsonFile).not.toHaveBeenCalled();
      expect(updatePendingToSync).not.toHaveBeenCalled();
    });

    it("writes legacy comments back in the { m, d } shape on the next save", async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        values: { food: { 1: 100 } },
        comments: { food: { 1: ["legacy"] } },
      });

      const store = useBudgetStore();
      await store.loadBudgetForYear(2025, true);
      await store.setBudgetForYear(
        2025,
        { food: { 1: 100 } },
        store.comments[2025],
      );

      expect(idb.saveJsonFile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "budget_2025.json",
          data: {
            values: { food: { 1: 100 } },
            comments: { food: { 1: [{ m: "legacy", d: 0 }] } },
          },
          to_sync: true,
        }),
      );
    });

    it("groups normalized legacy and current comments across months", async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        values: {},
        comments: {
          food: { 1: ["legacy"], 2: [{ m: "current", d: 9 }] },
        },
      });

      const accountsStore = useAccountsStore();
      accountsStore.accounts = {
        food: {
          id: "food",
          name: "Food",
          type: "Expense" as any,
          currency: "usd",
          category: [],
        },
      };
      const store = useBudgetStore();
      await store.loadBudgetForYear(2025, true);

      const grouped = store.getBudgetGrupedByPeriod(Period.Quarter, 1, {
        year: 2025,
        quarter: 1,
        month: 3,
      });

      expect(grouped.comments.food[0]).toEqual([
        { m: "legacy", d: 0 },
        { m: "current", d: 9 },
      ]);
    });
  });
});
