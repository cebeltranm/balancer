import { inject, type Ref } from "vue";
import { AccountType, type PeriodOption } from "@/types";
import { increasePeriod, getPeriodDate } from "@/helpers/options.js";
import { useValuesStore } from "@/stores/values";

interface ValueData {
  value: number;
  in: number;
  in_local: number;
  out: number;
  out_local: number;
  expenses: number;
  gp?: number;
  gp_value?: number;
}

interface CategoryData {
  name: string;
  fullName: string;
  code?: string;
  logo?: string;
  values: ValueData[];
  currency: string;
  isCategory: boolean;
  expected?: any;
  missingRates?: MissingRate[];
}

interface CategoryResult {
  key: string;
  data: CategoryData;
  children?: CategoryResult[];
}

interface MissingRate {
  accountId: string;
  accountName: string;
  asset: string;
  currency: string;
}

export function useTotalByCategory() {
  const CURRENCY: Ref | undefined = inject("CURRENCY");
  const valuesStore = useValuesStore();

  function addMissingRate(
    missingRates: MissingRate[],
    missingRate: MissingRate,
  ) {
    if (
      !missingRates.some(
        (m) =>
          m.accountId === missingRate.accountId &&
          m.asset === missingRate.asset &&
          m.currency === missingRate.currency,
      )
    ) {
      missingRates.push(missingRate);
    }
  }

  function get(
    category: any,
    balance: any,
    period: PeriodOption,
    displayType: string,
  ): CategoryResult {
    let children: CategoryResult[] = [];
    const missingRates: MissingRate[] = [];
    let values =
      category.type === AccountType.Category ? [] : balance[category.id];
    if (category.percentage) {
      values = values.map((v: any) => ({
        value: v.value * category.percentage,
        in: v.in * category.percentage,
        in_local: v.in_local * category.percentage,
        out: v.out * category.percentage,
        out_local: v.out_local * category.percentage,
        expenses: v.expenses * category.percentage,
      }));
    }
    if (category.children) {
      children = Object.keys(category.children).map((key) =>
        get(category.children[key], balance, period, displayType),
      );
      children.forEach((child) =>
        child.data.missingRates?.forEach((missingRate) =>
          addMissingRate(missingRates, missingRate),
        ),
      );
      values = children.reduce(
        (ant, child) => {
          return ant.map((v, index) => {
            if (
              CURRENCY?.value &&
              child.data.currency !== CURRENCY.value &&
              child.data.values[index]
            ) {
              const conversionDate = getPeriodDate(
                period.type,
                index > 0
                  ? increasePeriod(period.type, period.value, -index)
                  : period.value,
              );
              const conv = valuesStore.getValue(
                conversionDate,
                child.data.currency,
                CURRENCY.value,
              );
              if (
                conv === 0 &&
                !valuesStore.hasValue(
                  conversionDate,
                  child.data.currency,
                  CURRENCY.value,
                )
              ) {
                addMissingRate(missingRates, {
                  accountId: child.key,
                  accountName: child.data.fullName || child.data.name,
                  asset: child.data.currency,
                  currency: CURRENCY.value,
                });
              }
              return {
                value: v.value + child.data.values[index].value * conv,
                in: v.in + child.data.values[index].in * conv,
                in_local:
                  v.in_local + (child.data.values[index].in_local || 0) * conv,
                out: v.out + child.data.values[index].out * conv,
                out_local:
                  v.out_local +
                  (child.data.values[index].out_local || 0) * conv,
                expenses: v.expenses + child.data.values[index].expenses * conv,
              };
            }
            return {
              value: v.value + (child?.data?.values?.[index]?.value || 0),
              in: v.in + (child?.data?.values?.[index]?.in || 0),
              in_local:
                v.in_local + (child?.data?.values?.[index]?.in_local || 0),
              out: v.out + (child?.data?.values?.[index]?.out || 0),
              out_local:
                v.out_local + (child?.data?.values?.[index]?.out_local || 0),
              expenses:
                v.expenses + (child?.data?.values?.[index]?.expenses || 0),
            };
          });
        },
        Array.from(new Array(children?.[0]?.data?.values.length || 0), () => ({
          value: 0,
          in: 0,
          out: 0,
          expenses: 0,
          in_local: 0,
          out_local: 0,
        })),
      );
    }
    for (let i = 0; i < values.length - 1; i++) {
      const div1 =
        (values[i].value || 0) +
        (values[i].out || 0) +
        (values[i].out_local || 0);
      const div2 =
        values[i + 1].value +
        values[i].in +
        (values[i].in_local || 0) +
        (values[i].expenses || 0);
      values[i].gp = div2 ? ((div1 || 0) - div2) / div2 : 0;
      values[i].gp_value = div2 ? (div1 || 0) - div2 : 0;
    }
    return {
      key: category.id || category.name,
      data: {
        name:
          category.entity && displayType !== "table"
            ? category.symbol || category.name
            : category.name,
        fullName:
          category.entity && displayType !== "table"
            ? `${category.entity}::${category.name}`
            : category.name,
        code: category.symbol,
        logo: category.logo,
        values: values,
        currency: category.currency || CURRENCY?.value,
        isCategory: category.type === AccountType.Category,
        expected: category.expected,
        missingRates: missingRates.length ? missingRates : undefined,
      },
      children: children.length > 0 ? children : undefined,
    };
  }

  return get;
}
