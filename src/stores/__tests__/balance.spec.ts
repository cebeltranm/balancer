import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import { useBalanceStore } from "@/stores/balance";
import { readJsonFile } from "@/helpers/files";
import * as idb from "@/helpers/idb";
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
      }),
    );
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
});
