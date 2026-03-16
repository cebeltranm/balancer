<template>
  <Toolbar>
    <template #start>
      <PeriodSelector
        v-model:period="period"
        @update:period="onChangePeriod"
        :only-period="true"
      />
    </template>
    <template #end>
      <Button label="Save" @click="save" :disabled="!pendingToSave" />
      <Button icon="pi pi-sync" @click="syncValues" class="ml-1" />
    </template>
  </Toolbar>
  <div class="values">
    <DataTable
      :value="values"
      @cell-edit-complete="onValueEdit"
      responsiveLayout="scroll"
      :resizableColumns="true"
      columnResizeMode="fit"
      showGridlines
      class="p-datatable-sm"
      editMode="cell"
      :scrollable="true"
      :rowClass="rowPendingSyncClass"
      scrollHeight="flex"
      scrollDirection="both"
      filterDisplay="menu"
      :globalFilterFields="['entity', 'type']"
      v-model:filters="filters"
    >
      <Column
        field="entity"
        header="Entity"
        style="width: 100px"
        :showFilterMatchModes="false"
        class="p-column-filter"
      >
        <template #body="{ data }">
          {{ data.entity }}
        </template>
        <template #filter="{ filterModel }">
          <MultiSelect v-model="filterModel.value" :options="entities" />
        </template>
      </Column>
      <Column
        field="type"
        header="Type"
        style="width: 120px"
        :showFilterMatchModes="false"
      >
        <template #body="{ data }">
          {{ data.type }}
        </template>
        <template #filter="{ filterModel }">
          <MultiSelect v-model="filterModel.value" :options="types" />
        </template>
      </Column>
      <Column field="name" header="Name" style="width: 150px" fixed></Column>
      <Column field="currency" header="Currency" style="width: 80px"></Column>
      <Column header="value" style="width: 200px" v-tooltip.top="'teest'">
        <template #body="slotProps">
          <div class="text-right" style="width: 100%">
            {{
              $format.currency(slotProps.data.value, slotProps.data.currency)
            }}
          </div>
        </template>
        <template #editor="{ data }">
          <InputNumber
            v-model="data.value"
            mode="currency"
            :currency="data.currency || Currency.USD"
            :maxFractionDigits="data.currency === Currency.BTC ? 10 : 2"
            currencyDisplay="code"
            locale="en-US"
            autofocus
          />
        </template>
      </Column>
      <Column field="m_m" header="MoM" style="width: 80px">
        <template #body="slotProps">
          <div
            :class="{
              'text-right': true,
              'text-red-400': slotProps.data.m_m < 0,
              'text-green-400': slotProps.data.m_m > 0,
            }"
          >
            {{ slotProps.data.m_m && $format.percent(slotProps.data.m_m) }}
          </div>
        </template>
      </Column>
      <Column field="m_m" header="YoY" style="width: 80px">
        <template #body="slotProps">
          <div
            :class="{
              'text-right': true,
              'text-red-400': slotProps.data.m_y < 0,
              'text-green-400': slotProps.data.m_y > 0,
            }"
          >
            {{ slotProps.data.m_y && $format.percent(slotProps.data.m_y) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.values {
  height: calc(100vh - 130px);
}

:deep(.p-column-header-content) {
  width: 100%;
}

@media (max-width: 600px) {
  .values {
    height: calc(100vh - 11rem);
  }
}
</style>

<script lang="ts" setup>
import PeriodSelector from "@/components/PeriodSelector.vue";
import {
  getCurrentPeriod,
  getPeriodDate,
  increasePeriod,
  rowPendingSyncClass,
} from "@/helpers/options";
import {
  AccountGroupType,
  AccountType,
  Currency,
  Period,
  StockApiType,
} from "@/types";
import { computed, onMounted, watch, ref } from "vue";
import { FilterMatchMode } from "@primevue/core/api";
import type { Account } from "@/types";
import { useValuesStore } from "@/stores/values";
import { useAccountsStore } from "@/stores/accounts";
import { useConfigStore } from "@/stores/config";
import { useStorageStore } from "@/stores/storage";
import { useBalanceStore } from "@/stores/balance";

const valuesStore = useValuesStore();
const accountsStore = useAccountsStore();
const configStore = useConfigStore();
const storageStore = useStorageStore();
const balanceStore = useBalanceStore();

const period = ref({
  type: Period.Month,
  value: getCurrentPeriod(),
});

const values = ref([]);

const pendingToSave = ref(false);

const filters = ref({
  entity: { value: null, matchMode: FilterMatchMode.IN },
  type: { value: null, matchMode: FilterMatchMode.IN },
});

const entities = computed(() => [
  ...new Set(values.value.map((v) => v.entity)),
]);
const types = computed(() => [...new Set(values.value.map((v) => v.type))]);

watch(
  () => valuesStore.values,
  () => recalculateValues(),
  { deep: true },
);

function recalculateValues() {
  pendingToSave.value = false;
  const date = getPeriodDate(period.value.type, period.value.value);
  const prevDate = getPeriodDate(
    period.value.type,
    increasePeriod(Period.Month, period.value.value, -1),
  );
  const prevYear = new Date(
    date.getFullYear() - 1,
    date.getMonth(),
    date.getDate(),
  );
  const accounts = accountsStore.activeAccounts(date);
  const currencies = accounts.reduce((ant: any[], a: any) => {
    if (
      // [AccountType.Expense, AccountType.BankAccount, AccountType.CreditCard].includes(a.type) &&
      a.currency !== Currency.USD &&
      !ant.includes(a.currency)
    ) {
      ant.push(a.currency);
    }
    return ant;
  }, []);

  const investments = accounts.filter((a) =>
    [AccountGroupType.Investments, AccountGroupType.FixedAssets].includes(
      accountsStore.getAccountGroupType(a.id),
    ),
  );

  values.value = [
    ...currencies.map((c) => ({
      id: `${c}_usd`,
      type: "Currency",
      name: Currency.USD,
      currency: c,
      value: valuesStore.getValue(date, Currency.USD, c),
      m_m: valuesStore.getValue(prevDate, Currency.USD, c)
        ? (valuesStore.getValue(date, Currency.USD, c) -
            valuesStore.getValue(prevDate, Currency.USD, c)) /
          valuesStore.getValue(prevDate, Currency.USD, c)
        : undefined,
      m_y: valuesStore.getValue(prevYear, Currency.USD, c)
        ? (valuesStore.getValue(date, Currency.USD, c) -
            valuesStore.getValue(prevYear, Currency.USD, c)) /
          valuesStore.getValue(prevYear, Currency.USD, c)
        : undefined,
    })),
    ...investments.map((a) => ({
      entity: a.entity,
      id: a.id,
      type: a.type,
      name: a.name,
      currency: a.currency,
      value: valuesStore.getValue(date, a.id, a.currency),
      m_m: valuesStore.getValue(prevDate, a.id, a.currency)
        ? (valuesStore.getValue(date, a.id, a.currency) -
            valuesStore.getValue(prevDate, a.id, a.currency)) /
          valuesStore.getValue(prevDate, a.id, a.currency)
        : undefined,
      m_y: valuesStore.getValue(prevYear, a.id, a.currency)
        ? (valuesStore.getValue(date, a.id, a.currency) -
            valuesStore.getValue(prevYear, a.id, a.currency)) /
          valuesStore.getValue(prevYear, a.id, a.currency)
        : undefined,
    })),
  ];
}

function onChangePeriod() {
  valuesStore.loadValuesForYear(period.value.value.year - 1, false);
  recalculateValues();
}

onMounted(() => {
  // configStore.loadConfig({reload: false});
  recalculateValues();
});

function onValueEdit(event: any) {
  const { data, newData } = event;
  const newValue = Number(newData.value);
  if (newValue >= 0 && newValue !== data.value) {
    data.value = newValue;
    data.to_sync = true;
    pendingToSave.value = true;
  }
}

async function syncValues() {
  async function process() {
    const promises = [syncCurrencies(), syncCruptoInBTC()];
    const current = getCurrentPeriod();
    const accounts = accountsStore.activeAccounts(
      getPeriodDate(period.value.type, period.value.value),
    );

    const symbols = accounts
      .filter((a: Account) =>
        [AccountGroupType.Investments, AccountGroupType.FixedAssets].includes(
          accountsStore.getAccountGroupType(a.id),
        ),
      )
      .filter((a: Account) => a.symbol);
    if (symbols.length > 0) {
      const config = configStore.config?.stock_api;
      if (config && config.type && config.key) {
        switch (config.type) {
          case StockApiType.AlphaVantage:
            if (
              current.year === period.value.value.year &&
              current.month === period.value.value.month
            ) {
              promises.push(syncAlphaVantage(config.key, symbols));
            }
            break;
          case StockApiType.MarketStack:
            if (
              current.year === period.value.value.year &&
              current.month === period.value.value.month
            ) {
              promises.push(syncMarketStack(config.key, symbols));
            }
            break;
          case StockApiType.RapidApi:
            if (
              current.year === period.value.value.year &&
              current.month === period.value.value.month
            ) {
              promises.push(syncRaidApi(config.key, config.host, symbols));
            }
            break;
        }
      }
    }
    return Promise.all(promises);
  }

  return storageStore.executeInSync(process());
}

async function syncCruptoInBTC() {
  const res = await getCurrencyValues("btc");
  if (res.status === 200) {
    const data = await res.json();
    values.value.forEach((v: any) => {
      if (
        v.type === "Crypto" &&
        v.currency === "btc" &&
        data.btc[v.name.toLowerCase()] &&
        1 / Number(data.btc[v.name.toLowerCase()]) !== v.value
      ) {
        v.value = 1 / Number(data.btc[v.name.toLowerCase()]);
        v.to_sync = true;
        pendingToSave.value = true;
      }
      if (
        v.type === "Crypto" &&
        v.currency === "usd" &&
        v.name.toLowerCase() === "btc" &&
        data.btc["usd"] &&
        data.btc["usd"] !== v.value
      ) {
        v.value = data.btc["usd"];
        v.to_sync = true;
        pendingToSave.value = true;
      }
    });
  }
}

async function getCurrencyValues(currency: string) {
  const current = getCurrentPeriod();
  let date = "latest";
  if (
    current.year > period.value.value.year ||
    current.month > period.value.value.month
  ) {
    date =
      period.value.value.year < 2024 || period.value.value.month < 3
        ? new Date(period.value.value.year, period.value.value.month - 1, 30)
            .toISOString()
            .split("T")[0]
        : `${period.value.value.year}.${period.value.value.month}.30`;
  }

  const url =
    period.value.value.year < 2024 ||
    (period.value.value.year === 2024 && period.value.value.month < 3)
      ? `https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/${date}/currencies/${currency}.json`
      : `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${currency}.json?rand=${Math.random()}`;
  return fetch(url);
}

async function syncCurrencies() {
  const res = await getCurrencyValues("usd");
  if (res.status === 200) {
    const data = await res.json();
    values.value.forEach((v: any) => {
      if (
        v.type === "Currency" &&
        data.usd[v.currency] &&
        Number(data.usd[v.currency]) !== v.value
      ) {
        v.value = Number(data.usd[v.currency]);
        v.to_sync = true;
        pendingToSave.value = true;
      }
    });
  }
}

// AlphaVantage https://www.alphavantage.co
async function syncAlphaVantage(key: string, accounts: Account[]) {
  const current = getCurrentPeriod();
  if (
    period.value.value.month === current.month ||
    period.value.value.year === current.year
  ) {
    for (const a of accounts) {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&datatype=json&symbol=${a.symbol}&apikey=${key}`;
      const res = await fetch(url);
      if (res.status === 200) {
        const data = await res.json();
        if (data && data["Global Quote"]["05. price"]) {
          const v = values.value.find((v) => v.id === a.id);
          if (v) {
            v.value = data["Global Quote"]["05. price"];
            v.to_sync = true;
            pendingToSave.value = true;
          }
        }
      }
      // return;
    }
  }
}

// Market Stack https://marketstack.com/
async function syncMarketStack(key: string, accounts: Account[]) {
  const current = getCurrentPeriod();
  let date = "latest";
  if (
    period.value.value.month !== current.month ||
    period.value.value.year !== current.year
  ) {
    date = getPeriodDate(period.value.type, period.value.value).toISOString();
  }

  const url = `http://api.marketstack.com/v1/eod/${date}?access_key=${key}&symbols=${accounts.map((a) => a.symbol).join(",")}`;
  const res = await fetch(url);
  if (res.status === 200) {
    const data = await res.json();
    if (data && data.data && data.data.length > 0) {
      data.data.forEach((s) => {
        const a = accounts.find((y) => y.symbol === s.symbol);
        if (a) {
          const v = values.value.find((v) => v.id === a.id);
          if (v) {
            v.value = Number(s.close);
            v.to_sync = true;
            pendingToSave.value = true;
          }
        }
      });
    }
  }
}

// Market Stack https://rapidapi.com/
async function syncRaidApi(key: string, host: string, accounts: Account[]) {
  const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&fields=regularMarketPrice&symbols=${accounts.map((a) => a.symbol).join(",")}`;
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": host,
    },
  };

  const res = await fetch(url, options);
  if (res.status === 200) {
    const data = await res.json();

    if (
      data &&
      data.quoteResponse &&
      data.quoteResponse.result &&
      data.quoteResponse.result.length > 0
    ) {
      data.quoteResponse.result.forEach((s) => {
        const a = accounts.find((y) => y.symbol === s.symbol);
        if (a) {
          const v = values.value.find((v) => v.id === a.id);
          if (v) {
            v.value = Number(s.regularMarketPrice);
            v.to_sync = true;
            pendingToSave.value = true;
          }
        }
      });
    }
  }
}

async function save() {
  await valuesStore.setValuesForMonth(
    period.value.value.year,
    period.value.value.month,
    values.value.reduce((ant: any, v: any) => {
      switch (v.type) {
        case "Currency":
          ant["usd"] = ant["usd"] || {};
          ant["usd"][v.currency] = v.value;
          break;
        case AccountType.Investment:
        case AccountType.MutualFund:
        case AccountType.ETF:
        case AccountType.CD:
        case AccountType.Stock:
        case AccountType.Crypto:
        case AccountType.Property:
          ant[v.id] = {
            [v.currency]: v.value,
          };
          break;
      }
      return ant;
    }, {}),
  );
  balanceStore.recalculateBalance(
    period.value.value.year,
    period.value.value.month,
    true,
  );
}
</script>
