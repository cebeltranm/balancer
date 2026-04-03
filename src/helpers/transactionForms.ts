import {
  AccountGroupType,
  AccountType,
  Period,
  type Account,
  type Transaction,
} from "@/types";
import type { ZodError } from "zod";

type AccountsStoreLike = {
  accounts: Record<string, Account>;
  activeAccounts: (
    date: Date,
    period?: Period,
    groupTypes?: AccountGroupType[],
  ) => Account[];
  getAccountFullName: (id: string) => string;
};

export interface AccountOption {
  id: string;
  name: string;
  currency: string;
}

export const PAYMENT_ACCOUNT_TYPES = [
  AccountType.Cash,
  AccountType.CreditCard,
  AccountType.BankAccount,
  AccountType.AccountReceivable,
  AccountType.AccountPayable,
];

export const TRANSFER_ACCOUNT_TYPES = [
  AccountType.Cash,
  AccountType.CreditCard,
  AccountType.BankAccount,
  AccountType.AccountReceivable,
  AccountType.AccountPayable,
];

export function buildAccountOptions(
  accountsStore: AccountsStoreLike,
  date: Date,
  options: {
    groupTypes?: AccountGroupType[];
    allowedTypes?: AccountType[];
    nameFormatter?: (name: string) => string;
  } = {},
): AccountOption[] {
  const { groupTypes, allowedTypes, nameFormatter } = options;

  return accountsStore
    .activeAccounts(date, Period.Month, groupTypes)
    .filter((account) => !allowedTypes || allowedTypes.includes(account.type))
    .map((account) => {
      const fullName = accountsStore.getAccountFullName(account.id);
      return {
        id: account.id,
        name: nameFormatter ? nameFormatter(fullName) : fullName,
        currency: account.currency,
      };
    });
}

export function formatExpenseAccountName(name: string) {
  return name.replace("Expense:", "");
}

export function collectRecentTransactions<T>(
  transactions: Record<number, Record<number, Transaction[]>>,
  query: string,
  mapper: (transaction: Transaction) => T | null,
  fromDate: Date = new Date(),
  maxResults: number = 5,
  maxMonths: number = 6,
) {
  const results: T[] = [];
  let year = fromDate.getFullYear();
  let month = fromDate.getMonth() + 1;
  let steps = 0;
  const normalizedQuery = query.toLowerCase();

  while (results.length < maxResults && steps < maxMonths) {
    if (transactions[year]?.[month]) {
      for (const transaction of transactions[year][month]) {
        if (!transaction.description.toLowerCase().includes(normalizedQuery)) {
          continue;
        }

        const mapped = mapper(transaction);
        if (mapped) {
          results.push(mapped);
        }

        if (results.length >= maxResults) {
          break;
        }
      }
    }

    steps++;
    year = month === 1 ? year - 1 : year;
    month = month === 1 ? 12 : month - 1;
  }

  return results;
}

export function flattenFieldErrors(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  return Object.keys(fieldErrors).reduce(
    (errors, key) => {
      const message = fieldErrors[key]?.[0];
      if (message) {
        errors[key] = message;
      }
      return errors;
    },
    {} as Record<string, string>,
  );
}
