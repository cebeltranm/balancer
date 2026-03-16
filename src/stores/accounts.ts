import { defineStore } from "pinia";
import { computed, ref, type Ref } from "vue";
import { readJsonFile, writeJsonFile } from "@/helpers/files";
import type { Account } from "@/types";
import { AccountGroupType, AccountType, Period } from "@/types";

function getCategoryEntry(group: any, category: string) {
  if (!group[category]) {
    group[category] = {
      name: category,
      type: "Category",
      children: {},
    };
  }
  return group[category];
}

export const ACCOUNT_GROUP_TYPES: Record<AccountGroupType, AccountType[]> = {
  [AccountGroupType.Assets]: [AccountType.Cash, AccountType.BankAccount],
  [AccountGroupType.FixedAssets]: [AccountType.Property],
  [AccountGroupType.Investments]: [
    AccountType.Investment,
    AccountType.ETF,
    AccountType.CD,
    AccountType.Stock,
    AccountType.MutualFund,
    AccountType.Crypto,
  ],
  [AccountGroupType.AccountsReceivable]: [AccountType.AccountReceivable],
  [AccountGroupType.Liabilities]: [
    AccountType.CreditCard,
    AccountType.Loan,
    AccountType.AccountPayable,
  ],
  [AccountGroupType.Incomes]: [AccountType.Income],
  [AccountGroupType.Expenses]: [AccountType.Expense],
};

export const useAccountsStore = defineStore("accounts", () => {
  const accounts: Ref<Record<string, Account>> = ref({});

  type StoredAccount = Omit<Account, "id" | "activeFrom" | "hideSince"> & {
    activeFrom?: string;
    hideSince?: string;
  };

  function serializeAccount(account: Account): StoredAccount {
    const { id: _id, ...rest } = account;
    const serialized: StoredAccount = {
      ...rest,
      activeFrom: account.activeFrom
        ? account.activeFrom.toISOString().slice(0, 10)
        : undefined,
      hideSince: account.hideSince
        ? account.hideSince.toISOString().slice(0, 10)
        : undefined,
      category:
        account.category && account.category.length > 0
          ? [...account.category]
          : undefined,
      class: account.class
        ? Object.keys(account.class).reduce(
            (grouped, assetClass) => ({
              ...grouped,
              [assetClass]: { ...account.class?.[assetClass] },
            }),
            {},
          )
        : undefined,
    };

    return Object.keys(serialized).reduce((cleaned, key) => {
      const typedKey = key as keyof StoredAccount;
      if (serialized[typedKey] !== undefined) {
        cleaned[typedKey] = serialized[typedKey] as never;
      }
      return cleaned;
    }, {} as StoredAccount);
  }

  async function persistAccounts(nextAccounts: Record<string, Account>) {
    const serialized = Object.keys(nextAccounts).reduce(
      (accumulated, id) => {
        accumulated[id] = serializeAccount(nextAccounts[id]);
        return accumulated;
      },
      {} as Record<string, StoredAccount>,
    );
    const saved = await writeJsonFile("accounts.json", serialized);
    if (saved) {
      accounts.value = nextAccounts;
    }
    return saved;
  }

  // Getters
  const expensesByCategories = computed(() => {
    return Object.keys(accounts.value)
      .filter((id: string) => accounts.value[id]?.type === "Expense")
      .reduce((ant: any, id: string) => {
        const account = accounts.value[id];
        if (account) {
          if (account?.category?.length > 0) {
            const g = account.category.reduce((group: any, c: string) => {
              return getCategoryEntry(group, c).children;
            }, ant);
            if (g[account.name]) {
              g[account.name] = {
                children: g[account.name].children,
                ...account,
              };
            } else {
              g[account.name] = { ...account };
            }
          } else {
            getCategoryEntry(ant, "Others").children[account?.name] = {
              ...account,
            };
          }
        }
        return ant;
      }, {});
  });

  function activeAccounts(
    date: Date,
    period: Period = Period.Month,
    groupTypes?: AccountGroupType[],
  ): Account[] {
    return Object.keys(accounts.value)
      .filter((a: string) => {
        const fromYear = accounts.value[a]?.activeFrom?.getFullYear();
        const fromMonth =
          period === Period.Month
            ? accounts.value[a]?.activeFrom?.getMonth() || 0
            : 0;

        const toYear = accounts.value[a]?.hideSince?.getFullYear();
        const toMonth =
          period === Period.Month
            ? accounts.value[a]?.hideSince?.getMonth() || 12
            : 12;
        return (
          (!fromYear ||
            fromYear < date.getFullYear() ||
            (fromYear === date.getFullYear() &&
              fromMonth <= date.getMonth())) &&
          (!toYear ||
            toYear > date.getFullYear() ||
            (toYear === date.getFullYear() && toMonth > date.getMonth()))
        );
      })
      .filter(
        (account: any) =>
          !groupTypes || groupTypes.includes(getAccountGroupType(account)),
      )
      .map((a: string) => accounts.value[a]);
  }

  const accountsGroupByCategories = (
    groupTypes?: AccountGroupType[],
    date: Date = new Date(),
    period: Period = Period.Month,
  ) => {
    return activeAccounts(date, period, groupTypes).reduce(
      (ant: any, account: any) => {
        const type = Object.keys(ACCOUNT_GROUP_TYPES).find((k) =>
          ACCOUNT_GROUP_TYPES[k].includes(account.type),
        );
        if (!ant[type]) {
          ant[type] = {};
        }

        if (account.category && account.category.length > 0) {
          const g = account.category.reduce((group: any, c: string) => {
            return getCategoryEntry(group, c).children;
          }, ant[type]);
          if (g[account.id]) {
            g[account.id] = {
              children: g[account.id].children,
              ...account,
            };
          } else {
            g[account.name] = { ...account };
          }
        } else if (
          (account.entity && account.entity.trim() !== "") ||
          account.type === AccountType.Expense
        ) {
          getCategoryEntry(
            ant[type],
            account.type === AccountType.Expense ? "Others" : account.entity,
          ).children[account.id] = { ...account };
        } else {
          ant[type][account.id] = { ...account };
        }
        return ant;
      },
      {},
    );
  };

  const getAccountGroupType = (id: string): AccountGroupType | null => {
    if (!id || !accounts.value[id]) {
      return null;
    }
    return (
      (Object.keys(ACCOUNT_GROUP_TYPES) as AccountGroupType[]).find((k) =>
        ACCOUNT_GROUP_TYPES[k].includes(accounts.value[id].type),
      ) || null
    );
  };

  function getAccountFullName(id: string): string {
    const account = accounts.value[id];
    return (
      (account &&
        `${account.entity ? account.entity + ": " : ""}${account.type}: ${account.category ? account.category.join(": ") + ": " : ""}${account.name}`) ||
      ""
    );
  }

  function isAccountInUnits(id: string) {
    if (id && accounts.value[id]) {
      return [AccountType.ETF, AccountType.Stock, AccountType.Crypto].includes(
        accounts.value[id].type,
      );
    }
    return false;
  }

  // Actions
  async function loadAccounts(reload: boolean) {
    if (!reload && Object.keys(accounts.value).length > 0) {
      return accounts.value;
    }
    const lAccounts = await readJsonFile("accounts.json");
    Object.keys(lAccounts).forEach((id: string) => {
      lAccounts[id].id = id;
    });
    const nAccounts = Object.keys(lAccounts)
      .filter((id) => id != "default")
      .reduce((ant: any, id: string) => {
        ant[id] = {
          ...lAccounts[id],
          activeFrom:
            lAccounts[id].activeFrom && new Date(lAccounts[id].activeFrom),
          hideSince:
            lAccounts[id].hideSince && new Date(lAccounts[id].hideSince),
          id,
        };
        return ant;
      }, {});
    accounts.value = nAccounts;
    return nAccounts;
  }

  async function saveAccount(account: Account) {
    const nextAccounts = {
      ...accounts.value,
      [account.id]: {
        ...account,
        category:
          account.category && account.category.length > 0
            ? [...account.category]
            : undefined,
        class: account.class
          ? Object.keys(account.class).reduce(
              (grouped, assetClass) => ({
                ...grouped,
                [assetClass]: { ...account.class?.[assetClass] },
              }),
              {},
            )
          : undefined,
      },
    };
    return persistAccounts(nextAccounts);
  }

  async function removeAccountHideSince(id: string) {
    if (!accounts.value[id]) {
      return false;
    }
    const nextAccounts = {
      ...accounts.value,
      [id]: {
        ...accounts.value[id],
        hideSince: undefined,
      },
    };
    return persistAccounts(nextAccounts);
  }

  async function deleteAccount(id: string) {
    if (!accounts.value[id]) {
      return false;
    }
    const nextAccounts = Object.keys(accounts.value).reduce(
      (accumulated, accountId) => {
        if (accountId !== id) {
          accumulated[accountId] = accounts.value[accountId];
        }
        return accumulated;
      },
      {} as Record<string, Account>,
    );
    return persistAccounts(nextAccounts);
  }

  return {
    accounts,
    loadAccounts,
    expensesByCategories,
    isAccountInUnits,
    getAccountGroupType,
    accountsGroupByCategories,
    activeAccounts,
    getAccountFullName,
    saveAccount,
    removeAccountHideSince,
    deleteAccount,
  };
});
