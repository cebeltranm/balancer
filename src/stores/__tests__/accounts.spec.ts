import { readFileSync } from "node:fs";
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

  describe("legacy account type aliases (RT-034)", () => {
    const legacyFile = () => ({
      old_cash: { name: "Wallet", type: "cash", currency: "usd" },
      old_saving: { name: "Savings", type: "SavingAccount", currency: "usd" },
    });

    it("RT-034: migrates cash to Cash and SavingAccount to BankAccount on load", async () => {
      vi.mocked(readJsonFile).mockResolvedValue(legacyFile());

      const store = useAccountsStore();
      const loaded = await store.loadAccounts(true);

      expect(loaded.old_cash.type).toBe(AccountType.Cash);
      expect(loaded.old_saving.type).toBe(AccountType.BankAccount);
      expect(store.accounts.old_cash.type).toBe(AccountType.Cash);
      expect(store.accounts.old_saving.type).toBe(AccountType.BankAccount);
    });

    it("RT-034: migrated accounts resolve to the assets group", async () => {
      vi.mocked(readJsonFile).mockResolvedValue(legacyFile());

      const store = useAccountsStore();
      await store.loadAccounts(true);

      expect(store.getAccountGroupType("old_cash")).toBe(
        AccountGroupType.Assets,
      );
      expect(store.getAccountGroupType("old_saving")).toBe(
        AccountGroupType.Assets,
      );
    });

    it("RT-034: loading legacy aliases does not write accounts.json", async () => {
      vi.mocked(readJsonFile).mockResolvedValue(legacyFile());

      const store = useAccountsStore();
      await store.loadAccounts(true);

      expect(writeJsonFile).not.toHaveBeenCalled();
    });

    it("RT-034: saving an account persists the migrated type, not the alias", async () => {
      vi.mocked(readJsonFile).mockResolvedValue(legacyFile());
      vi.mocked(writeJsonFile).mockResolvedValue(true);

      const store = useAccountsStore();
      await store.loadAccounts(true);
      await store.saveAccount({
        id: "new_cash",
        name: "New Wallet",
        type: AccountType.Cash,
        currency: "usd",
      });

      const [fileName, rawPayload] = vi.mocked(writeJsonFile).mock.calls[0];
      const payload = rawPayload as Record<string, { type: string }>;
      expect(fileName).toBe("accounts.json");
      expect(payload.old_cash.type).toBe(AccountType.Cash);
      expect(payload.old_saving.type).toBe(AccountType.BankAccount);
    });

    it.each([
      "CASH",
      "savingaccount",
      "Cash Account",
      "Savingaccount",
      " cash",
    ])("RT-034: rejects near-miss type %j as malformed_file", async (type) => {
      vi.mocked(readJsonFile).mockResolvedValue({
        bad: { name: "Bad", type, currency: "usd" },
      });

      const store = useAccountsStore();

      await expect(store.loadAccounts(true)).rejects.toMatchObject({
        code: "malformed_file",
        fileName: "accounts.json",
        recoverable: true,
      });
      expect(store.accounts).toEqual({});
    });

    it("RT-034: one unsupported type still rejects the whole file even when aliases are present", async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        ...legacyFile(),
        bad: { name: "Bad", type: "Nope", currency: "usd" },
      });

      const store = useAccountsStore();

      await expect(store.loadAccounts(true)).rejects.toMatchObject({
        code: "malformed_file",
      });
      expect(store.accounts).toEqual({});
    });
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

  // RT-023: the first-run seed must stay loadable by the account loader.
  it("loads every account in public/accounts.json (first-run seed)", async () => {
    const seed = JSON.parse(readFileSync("public/accounts.json", "utf-8"));
    vi.mocked(readJsonFile).mockResolvedValue(seed);

    const store = useAccountsStore();
    const loaded = await store.loadAccounts(true);

    const ids = Object.keys(seed).filter((id) => id !== "default");
    expect(Object.keys(loaded)).toEqual(ids);
    expect(ids.length).toBeGreaterThan(0);
    ids.forEach((id) => {
      expect(Object.values(AccountType)).toContain(loaded[id].type);
      expect(loaded[id].currency.trim()).not.toBe("");
    });
  });
});
