import { defineStore } from "pinia";
import { ref, type Ref } from "vue";
import { readJsonFile } from "@/helpers/files";
import {
  Period,
  type PeriodParams,
  type BalanceEntry,
  type Account,
  AccountGroupType,
  AccountType,
  type Transaction,
} from "@/types";
import { useAccountsStore } from "@/stores/accounts";
import { useValuesStore } from "@/stores/values";
import { useTransactionsStore } from "@/stores/transactions";
import { groupDataByPeriods } from "@/helpers/groupData";
import * as idb from "../helpers/idb";
import { toRaw } from "vue";
import { getCurrentPeriod, increasePeriod } from "@/helpers/options";
import {
  createEmptyBalanceEntry,
  normalizeYearlyBalanceData,
  type YearlyBalanceData,
} from "@/helpers/persistedShapes";

type GroupedBalanceData = Record<string, BalanceEntry[]>;
type BalanceRecalculationWarning = {
  type: "missing-source-data" | "missing-rate-or-value";
  source?: string;
  accountId?: string;
  message: string;
};

type BalanceRecalculationResult = YearlyBalanceData & {
  warnings?: BalanceRecalculationWarning[];
};

function addWarning(
  warnings: BalanceRecalculationWarning[],
  warning: BalanceRecalculationWarning,
) {
  const alreadyAdded = warnings.some(
    (existing) =>
      existing.type === warning.type &&
      existing.source === warning.source &&
      existing.accountId === warning.accountId,
  );
  if (!alreadyAdded) {
    warnings.push(warning);
  }
}

function attachWarnings(
  yearlyData: YearlyBalanceData,
  warnings: BalanceRecalculationWarning[],
): BalanceRecalculationResult {
  Object.defineProperty(yearlyData, "warnings", {
    value: warnings,
    enumerable: false,
    configurable: true,
  });
  return yearlyData as BalanceRecalculationResult;
}

function isHiddenForMonth(account: Account, monthDate: Date): boolean {
  return Boolean(
    account.hideSince &&
      new Date(
        account.hideSince.getFullYear(),
        account.hideSince.getMonth(),
        1,
      ) <= monthDate,
  );
}

export const useBalanceStore = defineStore("balance", () => {
  const balance: Ref<Record<number, YearlyBalanceData>> = ref({});
  const accountsStore = useAccountsStore();
  const valuesStore = useValuesStore();
  const transactionsStore = useTransactionsStore();

  function hasValueEntry(date: Date, asset: string, currency: string): boolean {
    if (asset === currency) {
      return true;
    }

    let currentPeriod: PeriodParams = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      quarter: 1,
    };

    for (let level = 0; level < 3; level++) {
      const monthData =
        valuesStore.values[currentPeriod.year]?.[currentPeriod.month];
      if (
        monthData &&
        (monthData[asset]?.[currency] !== undefined ||
          monthData[currency]?.[asset] !== undefined)
      ) {
        return true;
      }
      currentPeriod = increasePeriod(Period.Month, currentPeriod, -1);
    }

    return false;
  }

  /**
   * Gets balance data grouped by periods
   * @param type - The period type (Month, Quarter, Year)
   * @param numPeriods - Number of periods to retrieve
   * @param params - Period parameters containing year, month, and quarter
   * @returns Grouped balance data for all accounts across the specified periods
   */
  function getBalanceGroupedByPeriods(
    type: Period,
    numPeriods: number,
    params: PeriodParams,
  ): GroupedBalanceData {
    return groupDataByPeriods<BalanceEntry>(
      type,
      numPeriods,
      params,
      Object.keys(accountsStore.accounts),
      (accountId: string, year: number, months: number[]) =>
        months
          .map(
            (monthNum) =>
              balance.value[year]?.[accountId]?.[monthNum] as
                | BalanceEntry
                | undefined,
          )
          .reduce((accumulated, monthValue) => {
            const result: BalanceEntry = { ...createEmptyBalanceEntry() };
            const account = accountsStore.accounts[accountId];

            if (
              account &&
              [AccountType.Expense, AccountType.Income].includes(account.type)
            ) {
              result.value = accumulated.value + (monthValue?.value ?? 0);
            } else {
              result.value = monthValue?.value ?? accumulated.value;
            }

            if (
              accountsStore.getAccountGroupType(accountId) ===
              AccountGroupType.Investments
            ) {
              const investmentFields = [
                "in",
                "out",
                "in_local",
                "out_local",
                "expenses",
              ] as const;
              investmentFields.forEach((field) => {
                result[field] = accumulated[field] + (monthValue?.[field] ?? 0);
              });
            }
            if (
              account &&
              [AccountType.ETF, AccountType.Stock, AccountType.Crypto].includes(
                account.type,
              )
            ) {
              result.units = monthValue?.units ?? accumulated.units;
            }

            return result;
          }, createEmptyBalanceEntry()),
    );
  }
  //  processBalanceValue(account, accumulated, monthValue)
  /**
   * Loads balance data for a specific year
   * @param year - The year to load balance data for
   * @param reload - Whether to force reload even if data exists
   * @returns Promise resolving to the balance data for the year
   */
  async function loadBalanceForYear(
    year: number,
    reload = false,
  ): Promise<YearlyBalanceData | null> {
    if (!reload && balance.value[year]) {
      return balance.value[year];
    }

    const fileName = `balance_${year}.json`;
    const yearlyData = normalizeYearlyBalanceData(
      await readJsonFile(fileName, !reload),
      fileName,
    );
    if (yearlyData) {
      balance.value[year] = yearlyData;
    }

    return yearlyData;
  }

  function hasBalanceForMonth(
    year: number,
    month: number,
    yearlyData: YearlyBalanceData | null = balance.value[year] || null,
  ): boolean {
    return yearlyData
      ? Object.values(yearlyData).some((accountBalance) =>
          Boolean(accountBalance?.[month]),
        )
      : false;
  }

  async function ensureCurrentMonthBalance(save: boolean): Promise<void> {
    const { year, month } = getCurrentPeriod();
    const yearlyData = await loadBalanceForYear(year, false);

    if (!hasBalanceForMonth(year, month, yearlyData)) {
      await recalculateBalance(year, month, save);
    }
  }

  async function recalculateBalance(
    year: number,
    month: number,
    save: boolean,
    warnings: BalanceRecalculationWarning[] = [],
  ): Promise<BalanceRecalculationResult> {
    const JANUARY = 1;
    const DECEMBER = 12;
    const currentPeriod = getCurrentPeriod();

    const valuesData = await valuesStore.loadValuesForYear(year, false);
    const accounts = (await accountsStore.loadAccounts(false)) as Record<
      string,
      Account
    >;
    const yearBalance = (await loadBalanceForYear(year, false)) || {};
    const prevBalance =
      month === JANUARY
        ? await loadBalanceForYear(year - 1, false)
        : yearBalance;
    const prevMonth = month === JANUARY ? DECEMBER : month - 1;
    const monthDate = new Date(year, month - 1, 1);

    const transactions = await transactionsStore.loadTransactionsForMonth(
      year,
      month,
    );
    if (!transactions) {
      const source = `transactions_${year}_${month}.json`;
      addWarning(warnings, {
        type: "missing-source-data",
        source,
        message: `${source} is missing. Recalculated balances may be incomplete.`,
      });
    }

    const accountsRequiringValues = Object.values(accounts).filter(
      (account) =>
        !isHiddenForMonth(account, monthDate) &&
        [
          AccountType.Investment,
          AccountType.CD,
          AccountType.Property,
          AccountType.MutualFund,
          AccountType.ETF,
          AccountType.Stock,
          AccountType.Crypto,
        ].includes(account.type),
    );
    if (
      accountsRequiringValues.length > 0 &&
      Object.keys(valuesData).length === 0
    ) {
      const source = `values_${year}.json`;
      addWarning(warnings, {
        type: "missing-source-data",
        source,
        message: `${source} is missing. Recalculated balances may be incomplete.`,
      });
    }

    // Calculate account value changes from transactions
    const accountValueChanges: Record<string, number> = {};
    if (transactions) {
      for (const transaction of transactions) {
        for (const value of transaction.values) {
          const accountValue = value.accountValue || 0;
          accountValueChanges[value.accountId] =
            (accountValueChanges[value.accountId] || 0) + accountValue;
        }
      }
    }

    // Calculate investment data from transactions
    interface InvestmentData {
      in: number;
      out: number;
      in_local: number;
      out_local: number;
      expenses: number;
      units: number;
    }

    const investmentData: Record<string, InvestmentData> = {};
    if (transactions) {
      const investmentTransactions = transactions.filter((t: Transaction) =>
        t.values.some(
          (v: any) =>
            accountsStore.getAccountGroupType(v.accountId) ===
            AccountGroupType.Investments,
        ),
      );

      for (const transaction of investmentTransactions) {
        const investmentValues = transaction.values.filter(
          (v: any) =>
            accountsStore.getAccountGroupType(v.accountId) ===
            AccountGroupType.Investments,
        );

        for (let invIndex = 0; invIndex < investmentValues.length; invIndex++) {
          const investment = investmentValues[invIndex];
          const accountId = investment.accountId;

          // Initialize investment data if not exists
          if (!investmentData[accountId]) {
            investmentData[accountId] = {
              in: 0,
              out: 0,
              in_local: 0,
              out_local: 0,
              expenses: 0,
              units: 0,
            };
          }

          // Add units if present
          if (investment.units) {
            investmentData[accountId].units += investment.units;
          }

          // Process all transaction values for this investment
          for (const transactionValue of transaction.values) {
            const valueGroupType = accountsStore.getAccountGroupType(
              transactionValue.accountId,
            );
            const transactionValueAmount = transactionValue.accountValue || 0;

            // Handle expenses (only count once per transaction)
            if (
              valueGroupType === AccountGroupType.Expenses &&
              invIndex === 0
            ) {
              investmentData[accountId].expenses += transactionValueAmount;
            }
            // Handle investment flows (exclude self-transfers)
            else if (transactionValue.accountId !== accountId) {
              const isSameEntity =
                valueGroupType === AccountGroupType.Investments &&
                accounts[accountId]?.entity &&
                accounts[transactionValue.accountId]?.entity &&
                accounts[accountId].entity ===
                  accounts[transactionValue.accountId].entity;

              const investmentValue = investment.accountValue || 0;
              const positiveFlow = Math.max(0, investmentValue);
              const negativeFlow = Math.min(0, investmentValue);

              if (isSameEntity) {
                investmentData[accountId].in_local += positiveFlow;
                investmentData[accountId].out_local -= negativeFlow;
              } else {
                investmentData[accountId].in += positiveFlow;
                investmentData[accountId].out -= negativeFlow;
              }
            }
          }
        }
      }
    }

    // Calculate balance for each account
    for (const accountKey of Object.keys(accounts)) {
      const account = accounts[accountKey];
      const accountId = account.id;

      // Initialize account balance structure
      if (!yearBalance[accountId]) {
        yearBalance[accountId] = {};
      }
      if (!yearBalance[accountId][month]) {
        yearBalance[accountId][month] = createEmptyBalanceEntry();
      }

      const monthlyBalance = yearBalance[accountId][month];
      const valueChange = accountValueChanges[accountId] || 0;
      const investment = investmentData[accountId];

      // Calculate balance based on account type
      switch (account.type) {
        case AccountType.Expense:
          monthlyBalance.value = valueChange;
          break;

        case AccountType.Income:
          monthlyBalance.value = -valueChange;
          break;

        case AccountType.Cash:
        case AccountType.CreditCard:
        case AccountType.Loan:
        case AccountType.BankAccount:
        case AccountType.AccountReceivable:
        case AccountType.AccountPayable:
          {
            const previousValue =
              prevBalance?.[accountId]?.[prevMonth]?.value || 0;
            monthlyBalance.value = previousValue + valueChange;
          }
          break;

        case AccountType.Investment:
        case AccountType.CD:
        case AccountType.Property:
        case AccountType.MutualFund:
          if (investment) {
            monthlyBalance.in = investment.in;
            monthlyBalance.out = investment.out;
            monthlyBalance.in_local = investment.in_local;
            monthlyBalance.out_local = investment.out_local;
            monthlyBalance.expenses = investment.expenses;
            monthlyBalance.units = investment.units;
          }
          {
            const accountValue = valuesStore.getValue(
              monthDate,
              accountId,
              account.currency,
            );
            if (
              !hasValueEntry(monthDate, accountId, account.currency) &&
              !isHiddenForMonth(account, monthDate)
            ) {
              addWarning(warnings, {
                type: "missing-rate-or-value",
                accountId,
                message: `${accountId} is missing a value for ${year}-${month}. Recalculated balances may be incomplete.`,
              });
            }
            monthlyBalance.value = accountValue || 0;
          }
          break;

        case AccountType.ETF:
        case AccountType.Stock:
        case AccountType.Crypto:
          {
            const currentUnits = investment?.units || 0;
            const previousUnits =
              prevBalance?.[accountId]?.[prevMonth]?.units || 0;
            const totalUnits = currentUnits + previousUnits;

            if (investment) {
              monthlyBalance.in = investment.in;
              monthlyBalance.out = investment.out;
              monthlyBalance.in_local = investment.in_local;
              monthlyBalance.out_local = investment.out_local;
              monthlyBalance.expenses = investment.expenses;
            }
            monthlyBalance.units = totalUnits;
            {
              const accountValue = valuesStore.getValue(
                monthDate,
                accountId,
                account.currency,
              );
              if (
                !hasValueEntry(monthDate, accountId, account.currency) &&
                !isHiddenForMonth(account, monthDate)
              ) {
                addWarning(warnings, {
                  type: "missing-rate-or-value",
                  accountId,
                  message: `${accountId} is missing a value for ${year}-${month}. Recalculated balances may be incomplete.`,
                });
              }
              monthlyBalance.value = totalUnits * (accountValue || 0);
            }
          }
          break;
      }
    }

    // Update the balance store
    balance.value[year] = yearBalance;

    // Recursively recalculate future months if needed
    const shouldRecalculateNext =
      year < currentPeriod.year ||
      (year === currentPeriod.year && month < currentPeriod.month);
    if (shouldRecalculateNext) {
      const nextYear = month === DECEMBER ? year + 1 : year;
      const nextMonth = month === DECEMBER ? JANUARY : month + 1;
      await recalculateBalance(nextYear, nextMonth, save, warnings);
    }

    // Save data if required
    const shouldSave =
      save &&
      (month === DECEMBER ||
        (month === currentPeriod.month && year === currentPeriod.year));
    if (shouldSave) {
      idb.saveJsonFile({
        id: `balance_${year}.json`,
        data: toRaw(yearBalance),
        date_cached: Date.now(),
        to_sync: true,
      });
    }

    return attachWarnings(yearBalance, warnings);
  }

  async function forceRecalculateBalance(
    year: number,
    month: number,
  ): Promise<BalanceRecalculationResult> {
    return recalculateBalance(year, month, true);
  }

  return {
    balance,
    getBalanceGroupedByPeriods,
    loadBalanceForYear,
    ensureCurrentMonthBalance,
    recalculateBalance,
    forceRecalculateBalance,
  };
});
