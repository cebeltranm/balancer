import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import { AccountGroupType, AccountType, Period } from "@/types";
import { readJsonFile, writeJsonFile } from "@/helpers/files";

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

describe("accounts store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("loads accounts, excludes default entry, and parses dates", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      default: { name: "ignore me" },
      cash_1: {
        name: "Wallet",
        type: AccountType.Cash,
        currency: "usd",
        category: ["Cash"],
        activeFrom: "2025-01-01T00:00:00.000Z",
      },
    });

    const store = useAccountsStore();
    const loaded = await store.loadAccounts(true);

    expect(Object.keys(loaded)).toEqual(["cash_1"]);
    expect(loaded.cash_1.id).toBe("cash_1");
    expect(loaded.cash_1.activeFrom).toBeInstanceOf(Date);
  });

  it("returns proper group/type helpers and active accounts", () => {
    const store = useAccountsStore();
    store.accounts = {
      exp_food: {
        id: "exp_food",
        name: "Food",
        type: AccountType.Expense,
        currency: "usd",
        category: ["Living"],
      },
      etf_spy: {
        id: "etf_spy",
        name: "SPY",
        type: AccountType.ETF,
        currency: "usd",
        category: ["Index"],
        entity: "BrokerA",
        activeFrom: new Date("2024-01-01T00:00:00.000Z"),
      },
      old_cash: {
        id: "old_cash",
        name: "Old Cash",
        type: AccountType.Cash,
        currency: "usd",
        category: ["Cash"],
        hideSince: new Date("2024-01-01T00:00:00.000Z"),
      },
    };

    expect(store.getAccountGroupType("exp_food")).toBe(
      AccountGroupType.Expenses,
    );
    expect(store.getAccountGroupType("etf_spy")).toBe(
      AccountGroupType.Investments,
    );
    expect(store.isAccountInUnits("etf_spy")).toBe(true);
    expect(store.getAccountFullName("etf_spy")).toContain("ETF");

    const activeIn2025 = store.activeAccounts(
      new Date("2025-02-01T00:00:00.000Z"),
      Period.Month,
    );
    expect(activeIn2025.map((a) => a.id).sort()).toEqual([
      "etf_spy",
      "exp_food",
    ]);
  });

  it("saves accounts with serializable dates and account payload", async () => {
    vi.mocked(writeJsonFile).mockResolvedValue(true);
    const store = useAccountsStore();
    store.accounts = {
      exp_food: {
        id: "exp_food",
        name: "Food",
        type: AccountType.Expense,
        currency: "usd",
        category: ["Living"],
      },
    };

    const saved = await store.saveAccount({
      id: "cash_wallet",
      name: "Wallet",
      type: AccountType.Cash,
      currency: "cop",
      entity: "Cash",
      activeFrom: new Date("2025-01-01T00:00:00.000Z"),
    });

    expect(saved).toBe(true);
    expect(writeJsonFile).toHaveBeenCalledWith("accounts.json", {
      exp_food: {
        name: "Food",
        type: AccountType.Expense,
        currency: "usd",
        category: ["Living"],
      },
      cash_wallet: {
        name: "Wallet",
        type: AccountType.Cash,
        currency: "cop",
        entity: "Cash",
        activeFrom: "2025-01-01",
      },
    });
  });

  it("can unhide an existing account", async () => {
    vi.mocked(writeJsonFile).mockResolvedValue(true);
    const store = useAccountsStore();
    store.accounts = {
      hidden_income: {
        id: "hidden_income",
        name: "Old income",
        type: AccountType.Income,
        currency: "cop",
        hideSince: new Date("2025-01-01T00:00:00.000Z"),
      },
    };

    const saved = await store.removeAccountHideSince("hidden_income");

    expect(saved).toBe(true);
    expect(writeJsonFile).toHaveBeenCalledWith("accounts.json", {
      hidden_income: {
        name: "Old income",
        type: AccountType.Income,
        currency: "cop",
      },
    });
  });

  it("can delete an existing account", async () => {
    vi.mocked(writeJsonFile).mockResolvedValue(true);
    const store = useAccountsStore();
    store.accounts = {
      keep_me: {
        id: "keep_me",
        name: "Keep",
        type: AccountType.Cash,
        currency: "cop",
      },
      remove_me: {
        id: "remove_me",
        name: "Remove",
        type: AccountType.Income,
        currency: "cop",
      },
    };

    const saved = await store.deleteAccount("remove_me");

    expect(saved).toBe(true);
    expect(writeJsonFile).toHaveBeenCalledWith("accounts.json", {
      keep_me: {
        name: "Keep",
        type: AccountType.Cash,
        currency: "cop",
      },
    });
  });
});
