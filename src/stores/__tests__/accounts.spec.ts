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

  it("ignores deprecated account structures when loading versionless files", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      cash_1: {
        name: "Wallet",
        type: AccountType.Cash,
        currency: "usd",
        legacyBalance: 100,
      },
    });

    const store = useAccountsStore();
    const loaded = await store.loadAccounts(true);

    expect(loaded.cash_1).toEqual({
      id: "cash_1",
      name: "Wallet",
      type: AccountType.Cash,
      currency: "usd",
    });
  });

  it("rejects accounts missing required fields without replacing current state", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      cash_1: {
        type: AccountType.Cash,
        currency: "usd",
      },
    });

    const store = useAccountsStore();
    store.accounts = {
      existing: {
        id: "existing",
        name: "Existing",
        type: AccountType.Cash,
        currency: "usd",
      },
    };

    await expect(store.loadAccounts(true)).rejects.toMatchObject({
      code: "malformed_file",
      fileName: "accounts.json",
      recoverable: true,
    });
    expect(store.accounts).toEqual({
      existing: {
        id: "existing",
        name: "Existing",
        type: AccountType.Cash,
        currency: "usd",
      },
    });
  });

  it("rejects unsupported account type values without loading them into grouping state", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      legacy_cash: {
        name: "Legacy Wallet",
        type: "Cash Account",
        currency: "usd",
      },
    });

    const store = useAccountsStore();

    await expect(store.loadAccounts(true)).rejects.toMatchObject({
      code: "malformed_file",
      fileName: "accounts.json",
      recoverable: true,
    });
    expect(store.accounts).toEqual({});
    expect(store.getAccountGroupType("legacy_cash")).toBeNull();
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

  it("archives an existing account by preserving it with hideSince", async () => {
    vi.mocked(writeJsonFile).mockResolvedValue(true);
    const store = useAccountsStore();
    store.accounts = {
      keep_me: {
        id: "keep_me",
        name: "Keep",
        type: AccountType.Cash,
        currency: "cop",
      },
    };

    const saved = await store.saveAccount({
      ...store.accounts.keep_me,
      hideSince: new Date("2025-03-01T00:00:00.000Z"),
    });

    expect(saved).toBe(true);
    expect(writeJsonFile).toHaveBeenCalledWith("accounts.json", {
      keep_me: {
        name: "Keep",
        type: AccountType.Cash,
        currency: "cop",
        hideSince: "2025-03-01",
      },
    });
  });

  it("blocks hard deletion and keeps the account payload available", async () => {
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

    expect(saved).toBe(false);
    expect(store.accounts.remove_me).toEqual({
      id: "remove_me",
      name: "Remove",
      type: AccountType.Income,
      currency: "cop",
    });
    expect(writeJsonFile).not.toHaveBeenCalled();
  });
});
