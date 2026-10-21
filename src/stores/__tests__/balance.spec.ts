import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import { useBalanceStore } from "@/stores/balance";
import { useStorageStore } from "@/stores/storage";
import { readJsonFile } from "@/helpers/files";
import * as idb from "@/helpers/idb";
import { PersistedFileError } from "@/helpers/persistedFileErrors";
import {
  AccountGroupType,
  AccountType,
  Period,
  type BalanceEntry,
} from "@/types";

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
}));

vi.mock("@/helpers/idb", () => ({
  getAllTransactions: vi.fn(),
  saveJsonFile: vi.fn(),
}));

vi.mock("@/helpers/options", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/helpers/options")>();

  return {
    ...actual,
    getCurrentPeriod: vi.fn(() => ({ year: 2026, month: 5, quarter: 2 })),
  };
});

function entry(partial: Partial<BalanceEntry>): BalanceEntry {
  return {
    value: 0,
    expenses: 0,
    in: 0,
    out: 0,
    in_local: 0,
    out_local: 0,
    units: 0,
    ...partial,
  };
}

describe("balance store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(readJsonFile).mockReset();
    vi.mocked(idb.getAllTransactions).mockResolvedValue([]);
    vi.mocked(idb.saveJsonFile).mockReset();
  });

  it("sums expense values and keeps latest cash value for quarter grouping", () => {
    const accountsStore = useAccountsStore();
    const balanceStore = useBalanceStore();

    accountsStore.accounts = {
      expense_food: {
        id: "expense_food",
        name: "Food",
        type: AccountType.Expense,
        currency: "usd",
        category: ["Living"],
      },
      cash_wallet: {
        id: "cash_wallet",
        name: "Wallet",
        type: AccountType.Cash,
        currency: "usd",
        category: ["Cash"],
      },
    };

    balanceStore.balance = {
      2025: {
        expense_food: {
          1: entry({ value: 10 }),
          2: entry({ value: 20 }),
          3: entry({ value: 30 }),
        },
        cash_wallet: {
          1: entry({ value: 100 }),
          2: entry({ value: 150 }),
          3: entry({ value: 120 }),
        },
      },
    };

    const grouped = balanceStore.getBalanceGroupedByPeriods(Period.Quarter, 1, {
      year: 2025,
      quarter: 1,
      month: 3,
    });

    expect(grouped.expense_food[0].value).toBe(60);
    expect(grouped.cash_wallet[0].value).toBe(120);
  });

  it("sums investment flow fields and keeps latest ETF units/value for quarter grouping", () => {
    const accountsStore = useAccountsStore();
    const balanceStore = useBalanceStore();

    accountsStore.accounts = {
      etf_spy: {
        id: "etf_spy",
        name: "SPY",
        type: AccountType.ETF,
        currency: "usd",
        category: ["Index"],
        entity: "BrokerA",
      },
    };

    expect(accountsStore.getAccountGroupType("etf_spy")).toBe(
      AccountGroupType.Investments,
    );

    balanceStore.balance = {
      2025: {
        etf_spy: {
          1: entry({
            value: 200,
            in: 5,
            out: 1,
            in_local: 2,
            out_local: 0,
            expenses: 0.5,
            units: 2,
          }),
          2: entry({
            value: 300,
            in: 3,
            out: 4,
            in_local: 1,
            out_local: 1,
            expenses: 0.2,
            units: 3,
          }),
          3: entry({
            value: 400,
            in: 0,
            out: 2,
            in_local: 0,
            out_local: 1,
            expenses: 0.1,
            units: 4,
          }),
        },
      },
    };

    const grouped = balanceStore.getBalanceGroupedByPeriods(Period.Quarter, 1, {
      year: 2025,
      quarter: 1,
      month: 3,
    });

    expect(grouped.etf_spy[0].value).toBe(400);
    expect(grouped.etf_spy[0].units).toBe(4);
    expect(grouped.etf_spy[0].in).toBe(8);
    expect(grouped.etf_spy[0].out).toBe(7);
    expect(grouped.etf_spy[0].in_local).toBe(3);
    expect(grouped.etf_spy[0].out_local).toBe(2);
    expect(grouped.etf_spy[0].expenses).toBeCloseTo(0.8);
  });

  it("defaults missing balance fields and ignores deprecated structures", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      if (fileName === "balance_2025.json") {
        return {
          cash_wallet: {
            1: {
              value: 125,
              legacyValue: 100,
            },
          },
          legacySummary: {
            value: 999,
          },
        };
      }

      return false;
    });

    const balanceStore = useBalanceStore();
    const data = await balanceStore.loadBalanceForYear(2025, true);

    expect(readJsonFile).toHaveBeenCalledWith("balance_2025.json", false);
    expect(data).toEqual({
      cash_wallet: {
        1: entry({ value: 125 }),
      },
    });
  });

  it("recalculates the current month when its balance does not exist", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      switch (fileName) {
        case "accounts.json":
          return {
            cash_wallet: {
              name: "Wallet",
              type: AccountType.Cash,
              currency: "usd",
              category: ["Cash"],
            },
          };
        case "balance_2026.json":
        case "values_2026.json":
        case "transactions_2026_5.json":
          return false;
        default:
          return false;
      }
    });

    const balanceStore = useBalanceStore();
    await balanceStore.ensureCurrentMonthBalance(true);

    expect(balanceStore.balance[2026].cash_wallet[5]).toEqual(
      entry({ value: 0 }),
    );
    expect(idb.saveJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "balance_2026.json",
        to_sync: true,
        skip_conflict_check: true,
      }),
    );
  });

  it("caches the recalculated balance without queueing it while offline", async () => {
    vi.mocked(readJsonFile).mockResolvedValue(false);
    useStorageStore().status.offline = true;

    const balanceStore = useBalanceStore();
    await balanceStore.recalculateBalance(2026, 5, true);

    expect(idb.saveJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "balance_2026.json",
        to_sync: false,
        skip_conflict_check: true,
      }),
    );
  });

  describe("recalculation formulas by account type", () => {
    const accountDefs = {
      cash: { name: "Cash", type: AccountType.Cash, currency: "usd" },
      bank: { name: "Bank", type: AccountType.BankAccount, currency: "usd" },
      card: { name: "Card", type: AccountType.CreditCard, currency: "usd" },
      loan: { name: "Loan", type: AccountType.Loan, currency: "usd" },
      receivable: {
        name: "Receivable",
        type: AccountType.AccountReceivable,
        currency: "usd",
      },
      payable: {
        name: "Payable",
        type: AccountType.AccountPayable,
        currency: "usd",
      },
      salary: { name: "Salary", type: AccountType.Income, currency: "usd" },
      food: { name: "Food", type: AccountType.Expense, currency: "usd" },
      house: { name: "House", type: AccountType.Property, currency: "usd" },
      fund: { name: "Fund", type: AccountType.Investment, currency: "usd" },
      spy: { name: "SPY", type: AccountType.ETF, currency: "usd" },
    };

    it("computes every account type from previous balance, transactions, and values", async () => {
      vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
        switch (fileName) {
          case "accounts.json":
            return Object.fromEntries(
              Object.entries(accountDefs).map(([id, a]) => [
                id,
                { ...a, category: ["Test"] },
              ]),
            );
          case "balance_2026.json":
            return {
              cash: { 4: entry({ value: 100 }) },
              bank: { 4: entry({ value: 200 }) },
              card: { 4: entry({ value: -50 }) },
              loan: { 4: entry({ value: -1000 }) },
              receivable: { 4: entry({ value: 30 }) },
              payable: { 4: entry({ value: -20 }) },
              spy: { 4: entry({ units: 2 }) },
            };
          case "values_2026.json":
            return {
              5: {
                house: { usd: 5000 },
                fund: { usd: 1200 },
                spy: { usd: 10 },
              },
            };
          case "transactions_2026_5.json":
            return [
              {
                description: "Mixed",
                values: [
                  { accountId: "cash", accountValue: 10 },
                  { accountId: "bank", accountValue: -25 },
                  { accountId: "card", accountValue: -5 },
                  { accountId: "loan", accountValue: 100 },
                  { accountId: "receivable", accountValue: 7 },
                  { accountId: "payable", accountValue: 3 },
                  { accountId: "salary", accountValue: -300 },
                  { accountId: "food", accountValue: 40 },
                  { accountId: "spy", accountValue: 100, units: 3 },
                ],
              },
            ];
          default:
            return false;
        }
      });

      const balanceStore = useBalanceStore();
      await balanceStore.recalculateBalance(2026, 5, false);
      const may = (id: string) => balanceStore.balance[2026][id][5];

      expect(may("cash").value).toBe(110);
      expect(may("bank").value).toBe(175);
      expect(may("card").value).toBe(-55);
      expect(may("loan").value).toBe(-900);
      expect(may("receivable").value).toBe(37);
      expect(may("payable").value).toBe(-17);
      expect(may("salary").value).toBe(300);
      expect(may("food").value).toBe(40);
      expect(may("house").value).toBe(5000);
      expect(may("fund").value).toBe(1200);
      // Units accumulate on top of the previous month and are priced by values.
      expect(may("spy").units).toBe(5);
      expect(may("spy").value).toBe(50);
      expect(idb.saveJsonFile).not.toHaveBeenCalled();
    });
  });

  describe("multi-month recursive recalculation", () => {
    it("recalculating an earlier month updates every later month through the current month", async () => {
      vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
        switch (fileName) {
          case "accounts.json":
            return {
              cash: {
                name: "Cash",
                type: AccountType.Cash,
                currency: "usd",
                category: ["Cash"],
              },
              food: {
                name: "Food",
                type: AccountType.Expense,
                currency: "usd",
                category: ["Living"],
              },
            };
          case "balance_2026.json":
            return {
              cash: {
                2: entry({ value: 100 }),
                3: entry({ value: 999 }),
                4: entry({ value: 999 }),
                5: entry({ value: 999 }),
              },
            };
          case "transactions_2026_3.json":
            return [
              {
                description: "Deposit",
                values: [{ accountId: "cash", accountValue: 20 }],
              },
            ];
          case "transactions_2026_5.json":
            return [
              {
                description: "Lunch",
                values: [
                  { accountId: "cash", accountValue: -5 },
                  { accountId: "food", accountValue: 5 },
                ],
              },
            ];
          default:
            return false;
        }
      });

      const balanceStore = useBalanceStore();
      await balanceStore.recalculateBalance(2026, 3, true);

      const cash = balanceStore.balance[2026].cash;
      expect(cash[2].value).toBe(100);
      expect(cash[3].value).toBe(120);
      expect(cash[4].value).toBe(120);
      expect(cash[5].value).toBe(115);
      // Expense accounts restart each month rather than carrying over.
      expect(balanceStore.balance[2026].food[4].value).toBe(0);
      expect(balanceStore.balance[2026].food[5].value).toBe(5);
      // Months after the current month are not touched.
      expect(cash[6]).toBeUndefined();
      // Only the current month is saved by the recursion.
      expect(idb.saveJsonFile).toHaveBeenCalledTimes(1);
      expect(idb.saveJsonFile).toHaveBeenCalledWith(
        expect.objectContaining({ id: "balance_2026.json", to_sync: true }),
      );
    });

    it("carries a December balance into January of the following year", async () => {
      vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
        switch (fileName) {
          case "accounts.json":
            return {
              cash: {
                name: "Cash",
                type: AccountType.Cash,
                currency: "usd",
                category: ["Cash"],
              },
            };
          case "balance_2025.json":
            return { cash: { 11: entry({ value: 50 }) } };
          case "transactions_2025_12.json":
            return [
              {
                description: "Gift",
                values: [{ accountId: "cash", accountValue: 10 }],
              },
            ];
          default:
            return false;
        }
      });

      const balanceStore = useBalanceStore();
      await balanceStore.recalculateBalance(2025, 12, false);

      expect(balanceStore.balance[2025].cash[12].value).toBe(60);
      expect(balanceStore.balance[2026].cash[1].value).toBe(60);
      expect(balanceStore.balance[2026].cash[5].value).toBe(60);
    });
  });

  it("keeps the current month balance when it already exists", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      if (fileName === "balance_2026.json") {
        return {
          cash_wallet: {
            5: entry({ value: 125 }),
          },
        };
      }

      return false;
    });

    const balanceStore = useBalanceStore();
    await balanceStore.ensureCurrentMonthBalance(true);

    expect(balanceStore.balance[2026].cash_wallet[5].value).toBe(125);
    expect(idb.saveJsonFile).not.toHaveBeenCalled();
  });

  it("replaces an existing month when recalculation is explicitly requested", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      switch (fileName) {
        case "accounts.json":
          return {
            cash_wallet: {
              name: "Wallet",
              type: AccountType.Cash,
              currency: "usd",
              category: ["Cash"],
            },
          };
        case "balance_2026.json":
          return {
            cash_wallet: {
              4: entry({ value: 100 }),
              5: entry({ value: 999 }),
            },
          };
        case "transactions_2026_5.json":
          return [
            {
              description: "Cash deposit",
              values: [{ accountId: "cash_wallet", accountValue: 50 }],
            },
          ];
        default:
          return false;
      }
    });

    const balanceStore = useBalanceStore();
    await balanceStore.recalculateBalance(2026, 5, true);

    expect(balanceStore.balance[2026].cash_wallet[5]).toEqual(
      entry({ value: 150 }),
    );
    expect(idb.saveJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "balance_2026.json",
        to_sync: true,
        skip_conflict_check: true,
      }),
    );
  });

  it("exposes a force recalculation action for authenticated balance rebuilds", () => {
    const balanceStore = useBalanceStore();

    expect(typeof (balanceStore as any).forceRecalculateBalance).toBe(
      "function",
    );
  });

  it("returns warning metadata when source data required for recalculation is missing", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      switch (fileName) {
        case "accounts.json":
          return {
            brokerage: {
              name: "Brokerage",
              type: AccountType.Stock,
              currency: "usd",
              category: ["Investments"],
            },
            old_brokerage: {
              name: "Old Brokerage",
              type: AccountType.Stock,
              currency: "usd",
              category: ["Investments"],
              hideSince: "2026-01-01",
            },
          };
        case "balance_2026.json":
        case "values_2026.json":
        case "transactions_2026_5.json":
          return false;
        default:
          return false;
      }
    });

    const balanceStore = useBalanceStore();
    const result = (await balanceStore.recalculateBalance(
      2026,
      5,
      true,
    )) as any;

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "transactions_2026_5.json",
          type: "missing-source-data",
        }),
        expect.objectContaining({
          source: "values_2026.json",
          type: "missing-source-data",
        }),
        expect.objectContaining({
          accountId: "brokerage",
          type: "missing-rate-or-value",
        }),
      ]),
    );
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: "old_brokerage",
        }),
      ]),
    );
  });

  it("does not warn about missing values when only hidden accounts require values", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      switch (fileName) {
        case "accounts.json":
          return {
            old_brokerage: {
              name: "Old Brokerage",
              type: AccountType.Stock,
              currency: "usd",
              category: ["Investments"],
              hideSince: "2026-01-01",
            },
          };
        case "balance_2026.json":
        case "values_2026.json":
        case "transactions_2026_5.json":
          return false;
        default:
          return false;
      }
    });

    const balanceStore = useBalanceStore();
    const result = (await balanceStore.recalculateBalance(
      2026,
      5,
      true,
    )) as any;

    expect(result.warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "values_2026.json",
        }),
        expect.objectContaining({
          accountId: "old_brokerage",
        }),
      ]),
    );
  });

  it("does not warn when an account has an explicit zero value", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      switch (fileName) {
        case "accounts.json":
          return {
            brokerage: {
              name: "Brokerage",
              type: AccountType.Stock,
              currency: "usd",
              category: ["Investments"],
            },
          };
        case "values_2026.json":
          return {
            5: {
              brokerage: {
                usd: 0,
              },
            },
          };
        case "balance_2026.json":
        case "transactions_2026_5.json":
          return false;
        default:
          return false;
      }
    });

    const balanceStore = useBalanceStore();
    const result = (await balanceStore.recalculateBalance(
      2026,
      5,
      true,
    )) as any;

    expect(balanceStore.balance[2026].brokerage[5].value).toBe(0);
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: "brokerage",
          type: "missing-rate-or-value",
        }),
      ]),
    );
  });
});

describe("balance store invalid persisted files (data-model.md)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(readJsonFile).mockReset();
    vi.mocked(idb.getAllTransactions).mockResolvedValue([]);
    vi.mocked(idb.saveJsonFile).mockReset();
  });

  it("does not recalculate or save over an invalid balance file when bootstrapping the current month", async () => {
    const error = new PersistedFileError(
      "invalid_file",
      "balance_2026.json",
      "balance_2026.json contains invalid JSON.",
    );
    vi.mocked(readJsonFile).mockRejectedValue(error);
    const balanceStore = useBalanceStore();

    await expect(balanceStore.ensureCurrentMonthBalance(true)).rejects.toBe(
      error,
    );

    expect(balanceStore.balance).toEqual({});
    expect(idb.saveJsonFile).not.toHaveBeenCalled();
  });

  it("does not save a recalculation when the values file is invalid", async () => {
    const error = new PersistedFileError(
      "invalid_file",
      "values_2026.json",
      "values_2026.json contains invalid JSON.",
    );
    vi.mocked(readJsonFile).mockImplementation(async (fileName: string) => {
      if (fileName === "values_2026.json") {
        throw error;
      }
      return {};
    });
    const balanceStore = useBalanceStore();

    await expect(balanceStore.recalculateBalance(2026, 5, true)).rejects.toBe(
      error,
    );

    expect(idb.saveJsonFile).not.toHaveBeenCalled();
  });

  it("does not save a recalculation when a transactions file is invalid", async () => {
    const error = new PersistedFileError(
      "invalid_file",
      "transactions_2026_5.json",
      "transactions_2026_5.json contains invalid JSON.",
    );
    vi.mocked(readJsonFile).mockImplementation(async (fileName: string) => {
      if (fileName === "transactions_2026_5.json") {
        throw error;
      }
      return {};
    });
    const balanceStore = useBalanceStore();

    await expect(balanceStore.recalculateBalance(2026, 5, true)).rejects.toBe(
      error,
    );

    expect(idb.saveJsonFile).not.toHaveBeenCalled();
  });

  it("rejects a balance file with a malformed shape without accepting it", async () => {
    vi.mocked(readJsonFile).mockResolvedValue([1]);
    const balanceStore = useBalanceStore();

    await expect(
      balanceStore.loadBalanceForYear(2026, true),
    ).rejects.toMatchObject({
      code: "malformed_file",
      fileName: "balance_2026.json",
    });

    expect(balanceStore.balance[2026]).toBeUndefined();
    expect(idb.saveJsonFile).not.toHaveBeenCalled();
  });
});
