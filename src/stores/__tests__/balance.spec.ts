import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAccountsStore } from '@/stores/accounts';
import { useBalanceStore } from '@/stores/balance';
import { AccountGroupType, AccountType, Period, type BalanceEntry } from '@/types';

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

describe('balance store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('sums expense values and keeps latest cash value for quarter grouping', () => {
        const accountsStore = useAccountsStore();
        const balanceStore = useBalanceStore();

        accountsStore.accounts = {
            expense_food: {
                id: 'expense_food',
                name: 'Food',
                type: AccountType.Expense,
                currency: 'usd',
                category: ['Living'],
            },
            cash_wallet: {
                id: 'cash_wallet',
                name: 'Wallet',
                type: AccountType.Cash,
                currency: 'usd',
                category: ['Cash'],
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

    it('sums investment flow fields and keeps latest ETF units/value for quarter grouping', () => {
        const accountsStore = useAccountsStore();
        const balanceStore = useBalanceStore();

        accountsStore.accounts = {
            etf_spy: {
                id: 'etf_spy',
                name: 'SPY',
                type: AccountType.ETF,
                currency: 'usd',
                category: ['Index'],
                entity: 'BrokerA',
            },
        };

        expect(accountsStore.getAccountGroupType('etf_spy')).toBe(AccountGroupType.Investments);

        balanceStore.balance = {
            2025: {
                etf_spy: {
                    1: entry({ value: 200, in: 5, out: 1, in_local: 2, out_local: 0, expenses: 0.5, units: 2 }),
                    2: entry({ value: 300, in: 3, out: 4, in_local: 1, out_local: 1, expenses: 0.2, units: 3 }),
                    3: entry({ value: 400, in: 0, out: 2, in_local: 0, out_local: 1, expenses: 0.1, units: 4 }),
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
});
