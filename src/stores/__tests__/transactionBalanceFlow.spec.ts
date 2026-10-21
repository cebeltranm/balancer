import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import { useBalanceStore } from "@/stores/balance";
import { useStorageStore } from "@/stores/storage";
import { useTransactionsStore } from "@/stores/transactions";
import {
  idbFake,
  remote,
  resetFakeBackend,
  seedRemote,
} from "@/test/fakeBackend";

// IMP-27 (RECOMMENDED integration, specs/testing-strategy.md, Transactions):
// edit-as-delete-plus-new-save followed by balance recalculation across the
// real transactions, balance, and storage stores, files/sync helpers, and
// the real balance calculation. Only IndexedDB and the remote provider are
// replaced by in-memory fakes.

vi.mock("lodash-es/debounce", () => ({ default: (fn: any) => fn }));
vi.mock(
  "@/helpers/idb",
  async () => (await import("@/test/fakeBackend")).idbFake,
);
vi.mock(
  "@/helpers/storage",
  async () => (await import("@/test/fakeBackend")).storageModuleFake,
);
vi.mock("@/helpers/options", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/helpers/options")>();
  return {
    ...actual,
    getCurrentPeriod: vi.fn(() => ({ year: 2026, month: 5, quarter: 2 })),
  };
});

const entry = (value: number) => ({
  value,
  expenses: 0,
  in: 0,
  out: 0,
  in_local: 0,
  out_local: 0,
  units: 0,
});

const trade = (id: number, amount: number) => ({
  id,
  date: "2026-03-10",
  description: "Groceries",
  values: [
    { accountId: "cash", value: -amount, accountValue: -amount },
    { accountId: "food", value: amount, accountValue: amount },
  ],
});

describe("transaction edit → balance recalculation (IMP-27)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetFakeBackend();
    seedRemote("accounts.json", {
      cash: { type: "Cash", name: "Wallet", currency: "usd" },
      food: { type: "Expense", name: "Food", currency: "usd" },
    });
    seedRemote("values_2026.json", {});
    seedRemote("transactions_2026_3.json", [trade(1, 100)]);
    seedRemote("balance_2026.json", {
      cash: { 2: entry(500), 3: entry(400), 4: entry(400), 5: entry(400) },
      food: { 3: entry(100), 4: entry(0), 5: entry(0) },
    });
  });

  it("recalculates balances from the edited month after the delete + save syncs", async () => {
    const accountsStore = useAccountsStore();
    const transactionsStore = useTransactionsStore();
    const balanceStore = useBalanceStore();
    const storageStore = useStorageStore();

    await accountsStore.loadAccounts(false);
    await transactionsStore.loadTransactionsForMonth(2026, 3);
    await balanceStore.loadBalanceForYear(2026);
    expect(balanceStore.balance[2026].cash[3].value).toBe(400);

    // Edit while offline: the original is queued as deleted and the edited
    // copy is queued under a new id, exactly as TransactionEditDialog does.
    storageStore.status.offline = true;
    const original = transactionsStore.transactions[2026][3][0];
    await transactionsStore.deleteTransaction(original);
    await transactionsStore.saveTransaction(trade(2, 60));

    const pending = await idbFake.getAllTransactions();
    expect(pending.map((t: any) => [t.id, !!t.deleted])).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(transactionsStore.transactions[2026][3].map((t) => t.id)).toEqual([
      2,
    ]);
    // Balance is derived data and stays stale until sync recalculates it.
    expect(balanceStore.balance[2026].cash[3].value).toBe(400);

    remote.reads.length = 0;
    storageStore.status.offline = false;
    storageStore.sync();

    await vi.waitFor(() => {
      expect(remote.files.get("balance_2026.json")?.cash?.[3]?.value).toBe(440);
      expect(storageStore.status.inSync).toBe(false);
    });

    // The remote transactions file holds the edited copy only.
    expect(
      remote.files.get("transactions_2026_3.json").map((t: any) => t.id),
    ).toEqual([2]);
    expect(await idbFake.countTransactions()).toBe(0);

    // The edited month and every later month up to the current one are
    // recalculated, in the store and in the uploaded balance file.
    const uploaded = remote.files.get("balance_2026.json");
    for (const month of [3, 4, 5]) {
      expect(uploaded.cash[month].value).toBe(440);
      expect(balanceStore.balance[2026].cash[month].value).toBe(440);
    }
    expect(uploaded.food[3].value).toBe(60);
    expect(uploaded.food[4].value).toBe(0);
    expect(balanceStore.balance[2026].food[3].value).toBe(60);

    // Months before the earliest changed month are not recalculated.
    expect(uploaded.cash[2].value).toBe(500);
    expect(remote.reads).not.toContain("transactions_2026_2.json");
    expect(transactionsStore.transactions[2026][3].map((t) => t.id)).toEqual([
      2,
    ]);
  });
});
