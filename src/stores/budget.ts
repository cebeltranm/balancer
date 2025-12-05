import { defineStore } from 'pinia';
import { ref, type Ref, toRaw } from 'vue';
import { readJsonFile } from '@/helpers/files';
import type { Period, PeriodParams } from '@/types';
import { useAccountsStore } from '@/stores/accounts';
import { useStorageStore } from '@/stores/storage';
import { groupDataByPeriods } from '@/helpers/groupData';
import * as idb from '@/helpers/idb';

type YearlyBudgetData = Record<string, Record<number, number>>;
type GroupedBudgetData = Record<string, number[]>;
type YearlyCommentsData = Record<string, Record<number, string[] | undefined>>;
type GroupedCommentsData = Record<string, string[][]>;

export const useBudgetStore = defineStore('budget', () => {
    const budget: Ref<Record<number, YearlyBudgetData>> = ref({});
    const comments: Ref<Record<number, YearlyCommentsData>> = ref({});
    const accountsStore = useAccountsStore();
    const storageStore = useStorageStore();

    function getBudgetGrupedByPeriod(type: Period, numPeriods: number, params: PeriodParams) {
        const groupedBudget: GroupedBudgetData = groupDataByPeriods<number>(
            type,
            numPeriods,
            params,
            Object.keys(accountsStore.accounts),
            (key: string, year: number, months: number[]) => months
                .map((m) => (budget.value?.[year]?.[key]?.[m] || 0))
                .reduce((ant, v) => ant + v, 0)
        )

        const groupedComments: GroupedCommentsData = groupDataByPeriods<string[]>(
            type,
            numPeriods,
            params,
            Object.keys(accountsStore.accounts),
            (key: string, year: number, months: number[]) => months
                .map((m) => (comments.value?.[year]?.[key]?.[m] || []))
                .filter((m) => m?.length > 0)
                .reduce((ant, v) => [...ant, ...v], [] as string[])
        )
        return { budget: groupedBudget, comments: groupedComments };
    }

    async function loadBudgetForYear(year: number, reload: boolean): Promise<YearlyBudgetData> {
        if (!reload && budget.value[year]) {
            return budget.value[year];
        }
        const data = await readJsonFile(`budget_${year}.json`, !reload)
        budget.value[year] = data.values || {};
        comments.value[year] = data.comments || {};
        return budget.value[year] || {};
    }

    async function setBudgetForYear(year: number, values: YearlyBudgetData, commentValues: YearlyCommentsData) {
        idb.saveJsonFile({
            id: `budget_${year}.json`,
            data: { values: toRaw(values), comments: toRaw(commentValues) },
            date_cached: Date.now(),
            to_sync: true,
        });
        budget.value[year] = values;
        comments.value[year] = commentValues;
        storageStore.updatePendingToSync();
    }

    return { budget, comments, loadBudgetForYear, getBudgetGrupedByPeriod, setBudgetForYear };
});