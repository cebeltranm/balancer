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
      comments: { food: { 1: ["note"] } },
    });

    const store = useBudgetStore();
    const data = await store.loadBudgetForYear(2025, true);

    expect(data.food[1]).toBe(100);
    expect(store.comments[2025].food[1]).toEqual(["note"]);
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
      2025: { food: { 1: ["a"], 3: ["b", "c"] } },
    };

    const grouped = budgetStore.getBudgetGrupedByPeriod(Period.Quarter, 1, {
      year: 2025,
      quarter: 1,
      month: 3,
    });

    expect(grouped.budget.food[0]).toBe(350);
    expect(grouped.comments.food[0]).toEqual(["a", "b", "c"]);
  });

  it("persists yearly budget and updates pending sync", async () => {
    const store = useBudgetStore();
    await store.setBudgetForYear(
      2025,
      { food: { 1: 90 } },
      { food: { 1: ["ok"] } },
    );

    expect(idb.saveJsonFile).toHaveBeenCalledTimes(1);
    expect(idb.saveJsonFile).toHaveBeenCalledWith({
      id: "budget_2025.json",
      data: { values: { food: { 1: 90 } }, comments: { food: { 1: ["ok"] } } },
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
    store.comments = { 2025: { food: { 1: ["existing"] } } };

    await expect(
      store.setBudgetForYear(
        2025,
        { food: { 1: 90 } },
        { food: { 1: ["new"] } },
      ),
    ).rejects.toBe(error);

    expect(updatePendingToSync).not.toHaveBeenCalled();
    expect(store.budget[2025].food[1]).toBe(100);
    expect(store.comments[2025].food[1]).toEqual(["existing"]);
  });
});
