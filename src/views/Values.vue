<template>
  <Toolbar>
    <template #start>
        <PeriodSelector v-model:period="period" @update:period="onChangePeriod" :only-period="true" />
    </template>
    <template #end>
        <Button label="Save" @click="save" :disabled="!pendingToSave" />
        <Button icon="pi pi-sync" @click="syncValues"  class="ml-1"/>
    </template>
  </Toolbar>
<div class="values">
<DataTable :value="values" 
    @cell-edit-complete="onValueEdit"
    responsiveLayout="scroll" 
    :resizableColumns="true" columnResizeMode="fit" showGridlines
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
    <Column field="entity" header="Entity" style="width:100px" :showFilterMatchModes="false" class="p-column-filter">
      <template #body="{data}">
          {{data.entity}}
      </template>
      <template #filter="{filterModel}">
        <MultiSelect v-model="filterModel.value" :options="entities" />
      </template>
    </Column>
    <Column field="type" header="Type" style="width:120px" :showFilterMatchModes="false">
      <template #body="{data}">
          {{data.type}}
      </template>
      <template #filter="{filterModel}">
        <MultiSelect v-model="filterModel.value" :options="types" />
      </template>
    </Column>
    <Column field="name" header="Name" style="width:150px" fixed></Column>
    <Column field="currency" header="Currency" style="width:80px"></Column>
    <Column header="value" style="width:200px" v-tooltip.top="'teest'">
        <template #body="slotProps">
            <div class="text-right" style="width:100%" 
              >
                {{$format.currency(slotProps.data.value, slotProps.data.currency)}}
            </div>
        </template>
        <template #editor="{ data }">
            <InputNumber v-model="data.value" mode="currency" :currency="data.currency || Currency.USD" :maxFractionDigits="data.currency === Currency.BTC ? 10: 2" currencyDisplay="code" locale="en-US" autofocus/>
        </template>
    </Column>
    <Column field="m_m" header="M/M" style="width:80px">
      <template #body="slotProps">
            <div :class="{ 'text-right': true, 'text-red-400': slotProps.data.m_m < 0, 'text-green-400':slotProps.data.m_m > 0}">
                {{slotProps.data.m_m && $format.percent(slotProps.data.m_m)}}
            </div>
        </template>
    </Column>
    <Column field="m_m" header="Y/Y" style="width:80px">
      <template #body="slotProps">
            <div :class="{ 'text-right': true, 'text-red-400': slotProps.data.m_y < 0, 'text-green-400':slotProps.data.m_y > 0}">
                {{slotProps.data.m_y && $format.percent(slotProps.data.m_y)}}
            </div>
        </template>
    </Column>
  </DataTable>
  </div>
</template>

<style scoped>
  .values {
      height: calc(100vh - 14rem);
  }
  :deep( .p-column-header-content ) {
    width: 100%;
  }
  @media (max-width: 600px) {
    .values {
      height: calc(100vh - 11rem);
    }
  }
</style>

<script lang="ts" setup>
import PeriodSelector from '@/components/PeriodSelector.vue'
import { getCurrentPeriod, getPeriodDate, increasePeriod, rowPendingSyncClass } from '@/helpers/options';
import { AccountGroupType, AccountType, Currency, Period } from '@/types';
import { computed, onMounted, watch, ref } from 'vue';
import { useStore } from 'vuex';
import {FilterMatchMode,FilterOperator} from 'primevue/api';

  const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
  });

  const store = useStore();
  const values = ref([]);

  const pendingToSave = ref(false);

  const filters = ref({
    'entity': {value: null, matchMode: FilterMatchMode.IN},
    'type': {value: null, matchMode: FilterMatchMode.IN}
  });

  const entities = computed(() => [...new Set( values.value.map( v => v.entity ))])
  const types = computed(() => [...new Set( values.value.map( v => v.type ))])

  watch( () => store.state.values.values[period.value.value.year], () => recalculateValues(), {deep: true})

  function recalculateValues() {
    pendingToSave.value = false;
    const date = getPeriodDate(period.value.type, period.value.value);
    const prevDate = getPeriodDate(period.value.type, increasePeriod(Period.Month, period.value.value, -1));
    const prevYear = getPeriodDate(period.value.type, increasePeriod(Period.Year, period.value.value, -1));
    const accounts = store.getters['accounts/activeAccounts'](date);
    const currencies = accounts.reduce( (ant: any[], a:any) => {
        if (
            // [AccountType.Expense, AccountType.BankAccount, AccountType.CreditCard].includes(a.type) &&
            a.currency !== Currency.USD && 
            !ant.includes(a.currency)
        ) {
            ant.push(a.currency)
        }
        return ant;
    }, []);

    const investments = accounts.filter( a => [AccountGroupType.Investments, AccountGroupType.FixedAssets].includes(store.getters['accounts/getAccountGroupType'](a.id)) );

    values.value = [
        ...currencies.map( (c) => ({
            id: `${c}_usd`,
            type: 'Currency',
            name: Currency.USD,
            currency: c,
            value: store.getters['values/getValue'](date, Currency.USD, c),
            m_m: store.getters['values/getValue'](prevDate, Currency.USD, c) ? (-1 + store.getters['values/getValue'](date, Currency.USD, c) / store.getters['values/getValue'](prevDate, Currency.USD, c) ) : undefined,
            m_y: store.getters['values/getValue'](prevYear, Currency.USD, c) ? (-1 + store.getters['values/getValue'](date, Currency.USD, c) / store.getters['values/getValue'](prevYear, Currency.USD, c) ) : undefined
        })),
        ...investments.map( (a) => ({
          entity: a.entity,
          id: a.id,
          type:  a.type,
          name: a.name, 
          currency: a.currency,
          value: store.getters['values/getValue'](date, a.id, a.currency),
          m_m: store.getters['values/getValue'](prevDate, a.id, a.currency) ? (-1 + store.getters['values/getValue'](date, a.id, a.currency) / store.getters['values/getValue'](prevDate, a.id, a.currency) ) : undefined,
          m_y: store.getters['values/getValue'](prevYear, a.id, a.currency) ? (-1 + store.getters['values/getValue'](date, a.id, a.currency) / store.getters['values/getValue'](prevYear, a.id, a.currency) ) : undefined
        }))
    ];
  };

  function onChangePeriod() {
    store.dispatch('values/getValuesForYear', {year: period.value.value.year - 1})
    recalculateValues();
  }

  onMounted(() => {
    recalculateValues();
  })

  function onValueEdit(event: any) {
    let { data, newData } = event;
    const newValue = Number(newData.value);
    if ( newValue >= 0 && newValue !== data.value ) {
        data.value = newValue
        data.to_sync = true
        pendingToSave.value = true;
    }
  }

  async function syncValues() {
    syncCurrencies();
    syncCruptoInBTC();
    syncFromYahoo();
  }

  async function syncCruptoInBTC() {
    const current = getCurrentPeriod();
    const day = current.year === period.value.value.year &&  current.month === period.value.value.month ? new Date().getDate() : 31;
    const date = new Date( period.value.value.year, period.value.value.month -1, day ).toISOString().split('T')[0];
    const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/${date}/currencies/btc.json`);
    if (res.status === 200) {
        const data = await res.json();
        values.value.forEach( (v:any) => {
            if (v.type === 'Crypto' && v.currency === 'btc' && data.btc[v.name.toLowerCase()] && (1 / Number(data.btc[v.name.toLowerCase()])) !== v.value) {
              v.value =  (1 / Number(data.btc[v.name.toLowerCase()]));
              v.to_sync = true
              pendingToSave.value = true;
            }
            if (v.type === 'Crypto' && v.currency === 'usd' && v.name.toLowerCase() === 'btc' && data.btc['usd'] && data.btc['usd'] !== v.value) {
              v.value =  data.btc['usd'];
              v.to_sync = true
              pendingToSave.value = true;
            }
        });
    }
  }

  async function syncCurrencies() {
    const current = getCurrentPeriod();
    const day = current.year === period.value.value.year &&  current.month === period.value.value.month ? new Date().getDate() : 31;
    const date = new Date( period.value.value.year, period.value.value.month -1, day ).toISOString().split('T')[0];
    const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/${date}/currencies/usd.json`);
    if (res.status === 200) {
        const data = await res.json();
        values.value.forEach( (v:any) => {
            if (v.type === 'Currency' && data.usd[v.currency] && Number(data.usd[v.currency]) !== v.value) {
                v.value =  Number(data.usd[v.currency]);
                v.to_sync = true
                pendingToSave.value = true;
            }
        });
    }
  }

  // YAHOO Stock values
  async function syncFromYahoo() {      
    const current = getCurrentPeriod();
    if (period.value.value.month === current.month && period.value.value.year === current.year) {
      const accounts = store.getters['accounts/activeAccounts'](getPeriodDate(period.value.type, period.value.value));
      const yahoo_symbols = accounts
        .filter( a => [AccountGroupType.Investments, AccountGroupType.FixedAssets].includes(store.getters['accounts/getAccountGroupType'](a.id)) )
        .filter( a => a.yahoo_symbol);
      if (yahoo_symbols.length > 0 ){
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?fields=regularMarketPrice&symbols=${yahoo_symbols.map(a => a.yahoo_symbol).join(',')}`;
        // var proxyUrl = 'https://thingproxy.freeboard.io/fetch/'
        var proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';
        const res = await fetch(proxyUrl + url)
        if (res.status === 200) {
          const data = await res.json();
          data.quoteResponse.result.forEach( s => {
            const a = yahoo_symbols.find( y => y.yahoo_symbol === s.symbol);
            if (a) {
              const v = values.value.find( v => v.id === a.id);
              if (v) {
                v.value = s.regularMarketPrice;
                v.to_sync = true
                pendingToSave.value = true;
              }
            }
          })
        }
      }
    }
  }

  async function save() {
    await store.dispatch('values/setValuesForMonth',  { 
        year: period.value.value.year, 
        month: period.value.value.month,   
        values: values.value.reduce( (ant: any, v:any) => {
          switch(v.type) {
            case 'Currency':
              ant['usd'] = ant['usd'] || {}
              ant['usd'][v.currency] = v.value
              break;
            case AccountType.Investment:
            case AccountType.MutualFund:
            case AccountType.ETF:
            case AccountType.CD:
            case AccountType.Stock:
            case AccountType.Crypto:
            case AccountType.Property:
              ant[v.id] = {
                    [v.currency]: v.value
                };
              break;
          }
          return ant;
        }, {})
    });
  }


</script>