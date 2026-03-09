<template>
  <Toolbar>
    <template #start>
      <PeriodSelector
        v-model:period="period"
        @update:period="onChangePeriod"
        :only-type="!['table', 'pie'].includes(displayType)"
      />
      <Select
        v-model="typeInvestment"
        :options="[
          'ByAssetClass',
          'ByRegion',
          'ByCategory',
          'ByType',
          'ByRisk',
          'ByCurrency',
        ]"
        placeholder="Select a group type"
        class="pt-1 pb-1 ml-1 mr-1 w-12rem text-center"
        panelClass="z-5"
        v-if="displayType === 'pie'"
      />
      <AccountsSelector
        v-model:accounts="selectedAccounts"
        :groups="[AccountGroupType.Investments]"
        :date="getPeriodDate(period.type, period.value)"
        v-if="displayType === 'bar'"
      />
    </template>
    <template #end>
      <SelectButton
        v-model="displayType"
        :options="displayOptions"
        optionValue="id"
        @update:modelValue="onChangeDisplayType"
      >
        <template #option="{ option }">
          <i :class="option.icon"></i>
        </template>
      </SelectButton>
    </template>
  </Toolbar>
  <template v-if="storageStore.status.authenticated">
    <table-view
      v-if="displayType === 'table'"
      :accountsGrouped="accountsGroupBy"
      :total="getTotal"
    />
    <pie-view
      v-if="displayType === 'pie'"
      :accountsGrouped="accountsGroupBy"
      :total="getTotal"
      :date="getPeriodDate(period.type, period.value)"
    />
    <bar-view v-if="displayType === 'bar'" :total="getTotal" :period="period" />
  </template>
</template>

<style lang="scss" scoped>
:deep(.p-column-header-content) {
  width: 100%;
}
</style>

<script lang="ts" setup>
import AccountsSelector from "@/components/AccountsSelector.vue";
import PeriodSelector from "@/components/PeriodSelector.vue";
import TableView from "./table.vue";
import PieView from "./pie.vue";
import BarView from "./bar.vue";

import { computed, ref, inject } from "vue";
import {
  AccountGroupType,
  AccountType,
  Period,
  type PeriodOption,
} from "@/types";
import { getCurrentPeriod, getPeriodDate } from "@/helpers/options.js";
import {
  mapInvestmentsBySubCategory,
  accountsGrupedByAttribute,
} from "@/helpers/investments";
import { useStorageStore } from "@/stores/storage";
import { useAccountsStore } from "@/stores/accounts";
import { useBalanceStore } from "@/stores/balance";
import { useConfigStore } from "@/stores/config";
import { useValuesStore } from "@/stores/values";
import { useTotalByCategory } from "@/composables/totalByCategory";

import type { Ref } from "vue";

const _CURRENCY: Ref | undefined = inject("CURRENCY");

const period: Ref<PeriodOption> = ref({
  type: Period.Month,
  value: getCurrentPeriod(),
});

const storageStore = useStorageStore();
const accountsStore = useAccountsStore();
const balanceStore = useBalanceStore();
const configStore = useConfigStore();
const valuesStore = useValuesStore();
const totalByCategory = useTotalByCategory();

const typeInvestment = ref("ByAssetClass");

const displayType = ref("table");
const displayOptions = [
  { id: "table", icon: "pi pi-table" },
  { id: "pie", icon: "pi pi-chart-pie" },
  { id: "bar", icon: "pi pi-chart-bar" },
];
const selectedAccounts = ref([]);

const accountsGroupBy = computed(() => {
  const numPer =
    displayType.value !== "bar"
      ? 2
      : period.value.type === Period.Year
        ? 10
        : period.value.type === Period.Month
          ? 24
          : 16;
  const balance = balanceStore.getBalanceGroupedByPeriods(
    period.value.type,
    numPer,
    period.value.value,
  );
  let inv: any = {};
  if (displayType.value !== "pie" || typeInvestment.value === "ByCategory") {
    inv = accountsStore.accountsGroupByCategories(
      [AccountGroupType.Investments],
      getPeriodDate(period.value.type, period.value.value),
      period.value.type,
    );
    if (
      inv?.Investments &&
      displayType.value === "bar" &&
      selectedAccounts.value?.length > 0
    ) {
      inv = {
        Investments: Object.keys(inv.Investments)
          .filter(
            (key) =>
              Object.keys(inv.Investments[key].children).filter((entry) =>
                selectedAccounts.value.includes(entry),
              ).length > 0,
          )
          .reduce(
            (ant, key) => ({
              ...ant,
              [key]: {
                ...inv.Investments[key],
                children: Object.keys(inv.Investments[key].children)
                  .filter((entry) => selectedAccounts.value.includes(entry))
                  .reduce(
                    (ant, entry) => ({
                      ...ant,
                      [entry]: inv.Investments[key].children[entry],
                    }),
                    {},
                  ),
              },
            }),
            {},
          ),
      };
    }
    return (
      (inv?.Investments &&
        Object.keys(inv.Investments).map((key) =>
          totalByCategory(
            inv.Investments[key],
            balance,
            period.value,
            displayType.value,
          ),
        )) ||
      []
    );
  }
  const accounts = accountsStore.activeAccounts(
    getPeriodDate(period.value.type, period.value.value),
    period.value.type,
    [AccountGroupType.Investments],
  );
  switch (typeInvestment.value) {
    case "ByRegion":
      inv = accounts.reduce((ant: any, account: any) => {
        Object.keys(account.class || {}).forEach((c: string) => {
          Object.keys(account.class[c] || {}).forEach((r: string) => {
            if (!ant[r]) {
              ant[r] = {};
            }
            if (!ant[r][c]) {
              ant[r][c] = {};
            }
            ant[r][c][account.id] = {
              ...account,
              percentage: account.class[c][r],
            };
          });
        });
        return ant;
      }, {});
      break;
    case "ByRisk":
      inv = accountsGrupedByAttribute(accounts, "risk", 3);
      break;
    case "ByType":
      inv = accountsGrupedByAttribute(accounts, "type", "");
      break;
    case "ByCurrency":
      inv = accountsGrupedByAttribute(accounts, "currency", "");
      break;
    case "ByAssetClass":
      inv = accounts.reduce((ant: any, account: any) => {
        Object.keys(account.class || {}).forEach((c: string) => {
          if (!ant[c]) {
            ant[c] = {};
          }
          Object.keys(account.class[c] || {}).forEach((r: string) => {
            if (!ant[c][r]) {
              ant[c][r] = {};
            }
            ant[c][r][account.id] = {
              ...account,
              percentage: account.class[c][r],
            };
          });
        });
        return ant;
      }, {});
      break;
  }
  if (["ByRegion", "ByAssetClass"].includes(typeInvestment.value)) {
    const expecteComposed =
      typeInvestment.value === "ByAssetClass"
        ? configStore.invCompositionByAssetClass
        : configStore.invCompositionByRegion;
    const nestedCategories = mapInvestmentsBySubCategory(inv, expecteComposed);
    const data =
      nestedCategories.map((category) =>
        totalByCategory(category, balance, period.value, displayType.value),
      ) || [];
    return data;
  }
  return (
    (inv &&
      Object.keys(inv).map((key) =>
        totalByCategory(
          {
            type: AccountType.Category,
            name: key,
            children: inv[key],
          },
          balance,
          period.value,
          displayType.value,
        ),
      )) ||
    []
  );
});

const getTotal = computed(() => {
  type TotalEntry = {
    value: number;
    in: number;
    out: number;
    expenses: number;
  };
  const val1 = accountsGroupBy.value.reduce<TotalEntry[] | undefined>(
    (ant, child) => {
      if (!ant) {
        ant = Array.from(new Array(child.data.values.length), () => ({
          value: 0,
          in: 0,
          out: 0,
          expenses: 0,
        }));
      }
      return ant.map((v, index) => ({
        value: v.value + child.data.values[index].value,
        in: v.in + child.data.values[index].in,
        out: v.out + child.data.values[index].out,
        expenses: v.expenses + child.data.values[index].expenses,
      }));
    },
    undefined,
  );
  return val1
    ? val1.map((v, index) => {
        const val2 = index < val1.length - 1 ? val1[index + 1].value : v.value;
        const div1 = v.value + v.out;
        const div2 = val2 + v.in + (v.expenses || 0);
        return {
          ...v,
          gp: div2 > 0 ? (div1 - div2) / div2 : 0,
          gp_value: div2 > 0 ? div1 - div2 : 0,
        };
      })
    : [];
});

function onChangePeriod() {
  balanceStore.loadBalanceForYear(period.value.value.year - 1);
  valuesStore.loadValuesForYear(period.value.value.year - 1);
}

function onChangeDisplayType() {
  if (displayType.value === "bar") {
    for (let i = 0; i <= 10; i++) {
      balanceStore.loadBalanceForYear(period.value.value.year - i);
      valuesStore.loadValuesForYear(period.value.value.year - i);
    }
  }
}
</script>
