import type { Account, BalanceEntry, Transaction } from "@/types";
import { PersistedFileError } from "./persistedFileErrors";

export type StoredAccount = Omit<Account, "id" | "activeFrom" | "hideSince"> & {
  activeFrom?: string;
  hideSince?: string;
};

export type ValueData = Record<string, Record<string, number>>;
export type YearlyValueData = Record<number, ValueData>;
export type YearlyBalanceData = Record<string, Record<number, BalanceEntry>>;

function isMonthKey(key: string): boolean {
  const month = Number(key);
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

export function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertRecordFile(
  fileName: string,
  value: unknown,
): asserts value is Record<string, any> {
  if (!isRecord(value)) {
    throw new PersistedFileError(
      "malformed_file",
      fileName,
      `${fileName} has an invalid persisted shape.`,
    );
  }
}

export function createEmptyBalanceEntry(): BalanceEntry {
  return {
    value: 0,
    expenses: 0,
    in: 0,
    out: 0,
    in_local: 0,
    out_local: 0,
    units: 0,
  };
}

export function normalizeAccount(id: string, stored: StoredAccount): Account {
  const account: Account = {
    id,
    name: stored.name,
    type: stored.type,
    currency: stored.currency,
  };

  if (stored.category) {
    account.category = stored.category;
  }
  if (stored.entity) {
    account.entity = stored.entity;
  }
  if (stored.activeFrom) {
    account.activeFrom = new Date(stored.activeFrom);
  }
  if (stored.hideSince) {
    account.hideSince = new Date(stored.hideSince);
  }
  if (stored.symbol) {
    account.symbol = stored.symbol;
  }
  if (stored.logo) {
    account.logo = stored.logo;
  }
  if (stored.risk !== undefined) {
    account.risk = stored.risk;
  }
  if (stored.class) {
    account.class = stored.class;
  }

  return account;
}

function normalizeTransactionValue(value: any): Transaction["values"][number] {
  const normalized: Transaction["values"][number] = {
    accountId: value.accountId,
  };

  if (value.value !== undefined) {
    normalized.value = value.value;
  }
  if (value.accountValue !== undefined) {
    normalized.accountValue = value.accountValue;
  }
  if (value.units !== undefined) {
    normalized.units = value.units;
  }

  return normalized;
}

export function normalizeTransaction(transaction: any): Transaction {
  const normalized: Transaction = {
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    values: (transaction.values || []).map(normalizeTransactionValue),
  };

  if (transaction.tags) {
    normalized.tags = transaction.tags;
  }
  if (transaction.deleted) {
    normalized.deleted = transaction.deleted;
  }
  if (transaction.to_sync) {
    normalized.to_sync = transaction.to_sync;
  }

  return normalized;
}

export function normalizeConfig(config: any): Record<string, any> {
  const loadedConfig = config || {};
  return {
    ...loadedConfig,
    stock_api: loadedConfig.stock_api || {},
    inv_composition: loadedConfig.inv_composition || {},
  };
}

export function normalizeValueData(
  yearlyData: any,
  fileName = "values file",
): YearlyValueData {
  if (!yearlyData) {
    return {};
  }
  assertRecordFile(fileName, yearlyData);

  return Object.keys(yearlyData)
    .filter(isMonthKey)
    .reduce((yearData, month) => {
      const monthData = yearlyData[month] || {};
      assertRecordFile(fileName, monthData);
      const normalizedMonth = Object.keys(monthData).reduce((assets, asset) => {
        const assetData = monthData[asset] || {};
        assertRecordFile(fileName, assetData);
        const rates = Object.keys(assetData).reduce(
          (currencies, currency) => {
            if (typeof assetData[currency] === "number") {
              currencies[currency] = assetData[currency];
            }
            return currencies;
          },
          {} as Record<string, number>,
        );

        if (Object.keys(rates).length > 0) {
          assets[asset] = rates;
        }
        return assets;
      }, {} as ValueData);

      yearData[Number(month)] = normalizedMonth;
      return yearData;
    }, {} as YearlyValueData);
}

export function normalizeBalanceEntry(
  entry: Partial<BalanceEntry> = {},
): BalanceEntry {
  return {
    ...createEmptyBalanceEntry(),
    value: entry.value ?? 0,
    expenses: entry.expenses ?? 0,
    in: entry.in ?? 0,
    out: entry.out ?? 0,
    in_local: entry.in_local ?? 0,
    out_local: entry.out_local ?? 0,
    units: entry.units ?? 0,
  };
}

export function normalizeYearlyBalanceData(
  yearlyData: any,
  fileName = "balance file",
): YearlyBalanceData | null {
  if (!yearlyData) {
    return null;
  }
  assertRecordFile(fileName, yearlyData);

  return Object.keys(yearlyData).reduce((yearBalance, accountId) => {
    const accountBalance = yearlyData[accountId] || {};
    assertRecordFile(fileName, accountBalance);
    const normalizedAccountBalance = Object.keys(accountBalance)
      .filter(isMonthKey)
      .reduce(
        (months, month) => {
          assertRecordFile(fileName, accountBalance[month]);
          months[Number(month)] = normalizeBalanceEntry(accountBalance[month]);
          return months;
        },
        {} as Record<number, BalanceEntry>,
      );

    if (Object.keys(normalizedAccountBalance).length > 0) {
      yearBalance[accountId] = normalizedAccountBalance;
    }
    return yearBalance;
  }, {} as YearlyBalanceData);
}
