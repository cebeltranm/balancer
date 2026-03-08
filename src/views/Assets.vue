<template>
  <Toolbar>
    <template #start>
      <PeriodSelector
        v-model:period="period"
        @update:period="onChangePeriod"
        :only-type="!['table', 'pie'].includes(displayType)"
      />
    </template>
    <template #end>
      <SelectButton
        v-model="displayType"
        :options="displayOptions"
        optionValue="id"
      >
        <template #option="{ option }">
          <i :class="option.icon"></i>
        </template>
      </SelectButton>
    </template>
  </Toolbar>
  <template v-if="storageStore.status.authenticated">
    <TreeTable :value="byCategory" v-if="displayType === 'table'">
      <Column field="name" header="Name" footer="Total" :expander="true">
        <template #body="{ node }">
          <router-link
            :to="{ path: '/transactions', query: { accounts: node.data.ids } }"
          >
            {{ node.data.name }}
          </router-link>
        </template>
      </Column>
      <Column header="Balance">
        <template #body="{ node }"
          ><div
            :class="{
              'text-right': true,
              'text-red-400': node.data.values[0] < 0,
              'text-green-400': node.data.values[0] > 0,
            }"
          >
            {{
              $format.currency(
                node.data.values[0],
                node.data.currency || CURRENCY,
              )
            }}
          </div></template
        >
        <template #footer
          ><div
            :class="{
              'text-right': true,
              'text-red-400': getTotal < 0,
              'text-green-400': getTotal > 0,
            }"
          >
            {{ $format.currency(getTotal, CURRENCY) }}
          </div></template
        >
      </Column>
    </TreeTable>
    <!--
    <div style="max-width:600px">
    <Chart type="doughnut" :data="pieData" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }}" v-if="displayType === 'pie'" />
    </div>
    <Chart type="bar" :data="barData" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }, scales: { x: {stacked: true}, y: {stacked: true} }}"  v-if="displayType === 'bar'" /> -->
  </template>
</template>

<style lang="scss">
.error.p-progressbar {
  .p-progressbar-value {
    background-color: var(--red-800);
  }
  .p-progressbar-label {
    color: var(--gray-50);
  }
}
</style>

<script lang="ts" setup>
import PeriodSelector from "@/components/PeriodSelector.vue";

import { computed, ref, inject } from "vue";
import { AccountGroupType, AccountType, Period } from "@/types";
import { getCurrentPeriod, getPeriodDate } from "@/helpers/options.js";
import { useStorageStore } from "@/stores/storage";
import { useAccountsStore } from "@/stores/accounts";
import { useBalanceStore } from "@/stores/balance";
import { useValuesStore } from "@/stores/values";
import type { Ref } from "vue";

const CURRENCY: Ref | undefined = inject("CURRENCY");
const storageStore = useStorageStore();
const accountsStore = useAccountsStore();
const balanceStore = useBalanceStore();
const valuesStore = useValuesStore();

const period = ref({
  type: Period.Month,
  value: getCurrentPeriod(),
});

const displayType = ref("table");
const displayOptions = [
  { id: "table", icon: "pi pi-table" },
  { id: "pie", icon: "pi pi-chart-pie" },
  { id: "bar", icon: "pi pi-chart-bar" },
];

function getTotalByCategory(category: any, balance: any) {
  let children = undefined;
  let values =
    category.type === AccountType.Category
      ? []
      : balance[category.id].map((v) => v.value);
  let ids = category.type === AccountType.Category ? [] : [category.id];
  if (category.children) {
    children = Object.keys(category.children).map((key) =>
      getTotalByCategory(category.children[key], balance),
    );
    values = children.reduce((ant, child) => {
      if (!ant) {
        ant = Array.from(new Array(child.data.values.length), () => 0);
      }
      return ant.map((v, index) => {
        if (
          child.data.currency !== CURRENCY?.value &&
          child.data.values[index]
        ) {
          return (
            v +
            child.data.values[index] *
              valuesStore.getValue(
                getPeriodDate(period.value.type, period.value.value),
                child.data.currency,
                CURRENCY?.value,
              )
          );
        }
        return v + child.data.values[index];
      });
    }, undefined);
    ids = [
      ...children.reduce((ant, child) => {
        for (const id of child.data.ids) {
          ant.add(id);
        }
        return ant;
      }, new Set()),
    ];
  }

  return {
    key: category.type === AccountType.Category ? category.name : category.id,
    data: {
      ids,
      name: category.name,
      values,
      currency: category.currency || CURRENCY?.value,
    },
    children,
  };
}

const byCategory = computed(() => {
  const balance = balanceStore.getBalanceGroupedByPeriods(
    period.value.type,
    1,
    period.value.value,
  );
  const assets = accountsStore.accountsGroupByCategories(
    [
      AccountGroupType.Assets,
      AccountGroupType.AccountsReceivable,
      AccountGroupType.Liabilities,
    ],
    getPeriodDate(period.value.type, period.value.value),
  );
  const data = Object.keys(assets).map((key) =>
    getTotalByCategory(
      {
        name: key,
        type: AccountType.Category,
        children: assets[key],
      },
      balance,
    ),
  );
  return data;
});

const getTotal = computed(() =>
  byCategory.value.reduce((ant, v) => ant + v.data.values[0], 0),
);

function onChangePeriod() {
  balanceStore.loadBalanceForYear(period.value.value.year, false);
}
</script>
