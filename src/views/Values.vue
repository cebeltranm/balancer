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
    >
    <Column field="entity" header="Entity" style="width:100px"></Column>
    <Column field="type" header="Type" style="width:120px"></Column>
    <Column field="name" header="Name" style="width:150px" fixed></Column>
    <Column field="currency" header="Currency" style="width:80px"></Column>
    <Column header="value" style="width:200px">
        <template #body="slotProps">
            <div class="text-right" style="width:100%">
                {{$format.currency(slotProps.data.value, slotProps.data.currency)}}
            </div>
        </template>
        <template #editor="{ data }">
            <InputNumber v-model="data.value" mode="currency" :currency="data.currency || Currency.USD" :maxFractionDigits="data.currency === Currency.BTC ? 10: 0" currencyDisplay="code" locale="en-US" autofocus/>
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
      height: 70vh;
  }
</style>

<script lang="ts" setup>
import PeriodSelector from '@/components/PeriodSelector.vue'
import { getCurrentPeriod, rowPendingSyncClass } from '@/helpers/options';
import { AccountGroupType, AccountType, Currency, Period } from '@/types';
import { computed, onMounted, watch, ref } from 'vue';
import { useStore } from 'vuex';
import { getBinanceValues } from '@/helpers/binance';

  const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
  });

  const store = useStore();
  const values = ref([]);

  const pendingToSave = ref(false);

  watch( () => store.state.values.values[period.value.value.year], () => recalculateValues(), {deep: true})

  function recalculateValues() {
    pendingToSave.value = false;
    const date = new Date( period.value.value.year, period.value.value.month - 1, 2 );
    const prevDate = new Date( period.value.value.year - (period.value.value.month === 1 ? 1 : 0), period.value.value.month - (period.value.value.month === 1 ? 1 : 2), 2 );
    const prevYear = new Date( period.value.value.year - 1, period.value.value.month - 1, 2 );
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
          m_m: [AccountType.Stock, AccountType.ETF, AccountType.Crypto, AccountType.Property].includes(a.type) && store.getters['values/getValue'](prevDate, a.id, a.currency) ? (-1 + store.getters['values/getValue'](date, a.id, a.currency) / store.getters['values/getValue'](prevDate, a.id, a.currency) ) : undefined,
          m_y: [AccountType.Stock, AccountType.ETF, AccountType.Crypto, AccountType.Property].includes(a.type) && store.getters['values/getValue'](prevYear, a.id, a.currency) ? (-1 + store.getters['values/getValue'](date, a.id, a.currency) / store.getters['values/getValue'](prevYear, a.id, a.currency) ) : undefined
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
    const current = getCurrentPeriod();
    const day = current.year === period.value.value.year &&  current.month === period.value.value.month ? new Date().getDay() : 31;
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
            case AccountType.ETF:
            case AccountType.CDT:
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