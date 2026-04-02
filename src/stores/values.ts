import { defineStore } from "pinia";
import { ref, type Ref, toRaw } from "vue";
import { readJsonFile } from "@/helpers/files";
import { Currency, Period, type PeriodParams } from "@/types";
import { increasePeriod } from "@/helpers/options";
import * as idb from "@/helpers/idb";

type valueData = Record<string, Record<string, number>>;
type YearlyValueData = Record<number, valueData>;

export const useValuesStore = defineStore("values", () => {
  const values: Ref<Record<number, YearlyValueData>> = ref({});

  function getValue(
    date: Date,
    asset: string,
    currency: string,
    maxLevels: number = 3,
  ): number {
    if (asset === currency) {
      return 1;
    }

    let currentPeriod: PeriodParams = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      quarter: 1,
    };

    for (let level = 0; level < maxLevels; level++) {
      const valuesForYear = values.value[currentPeriod.year];
      if (!valuesForYear) {
        currentPeriod = increasePeriod(Period.Month, currentPeriod, -1);
        continue;
      }

      const monthData = valuesForYear[currentPeriod.month];
      if (monthData) {
        const directRate = monthData[asset]?.[currency];
        if (directRate !== undefined) {
          return directRate;
        }
        const inverseRate = monthData[currency]?.[asset];
        if (inverseRate !== undefined) {
          return inverseRate > 0 ? 1 / inverseRate : 0;
        }
      }

      currentPeriod = increasePeriod(Period.Month, currentPeriod, -1);
    }

    if (asset !== Currency.USD && currency !== Currency.USD) {
      const assetToUsd = getValue(date, asset, Currency.USD, 2);
      const usdToCurrency = getValue(date, Currency.USD, currency, 2);

      if (assetToUsd > 0 && usdToCurrency > 0) {
        const result = assetToUsd * usdToCurrency;
        return Number.isFinite(result) && result > 0 ? result : 0;
      }
    }

    return 0;
  }

  function joinValues(
    date: Date,
    currency: string,
    values: { value: number; asset: string; entity?: string }[],
  ) {
    return values.reduce((ant: number, v: any) => {
      return (
        ant +
        (v.asset === currency
          ? v.value
          : v.value * getValue(date, v.asset, currency))
      );
    }, 0);
  }

  async function setValuesForMonth(
    year: number,
    month: number,
    newValue: valueData,
  ) {
    const data = (await loadValuesForYear(year, false)) || {};
    data[month] = newValue;
    idb.saveJsonFile({
      id: `values_${year}.json`,
      data: toRaw(data),
      date_cached: Date.now(),
      to_sync: true,
    });
    values.value[year] = data;

    // context.dispatch('balance/recalculateBalance', {year, month, save: true}, {root: true});
  }

  async function loadValuesForYear(year: number, reload: boolean = false) {
    if (!reload && values.value[year]) {
      return values.value[year];
    }
    values.value[year] = await readJsonFile(`values_${year}.json`, !reload);
    return values.value[year];
  }

  return { values, loadValuesForYear, getValue, setValuesForMonth, joinValues };
});
