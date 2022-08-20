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
<DataTable :value="values" 
    @cell-edit-complete="onValueEdit"
    responsiveLayout="scroll" 
    :resizableColumns="true" columnResizeMode="fit" showGridlines
    class="p-datatable-sm"
    editMode="cell"
    :rowClass="rowPendingSyncClass"
    >
    <Column field="entity" header="Entity"></Column>
    <Column field="type" header="Type"></Column>
    <Column field="name" header="Name"></Column>
    <Column field="currency" header="Currency"></Column>
    <Column header="value" class="text-right">
        <template #body="slotProps">
            <div class="text-right">
                {{$format.currency(slotProps.data.value, slotProps.data.currency)}}
            </div>
        </template>
        <template #editor="{ data }">
            <InputNumber v-model="data.value" mode="currency" :currency="data.currency || Currency.USD" currencyDisplay="code" locale="en-US" autofocus/>
        </template>
    </Column>
  </DataTable>
</template>

<script lang="ts" setup>
import PeriodSelector from '@/components/PeriodSelector.vue'
import { getCurrentPeriod, rowPendingSyncClass } from '@/helpers/options';
import { AccountGroupType, AccountType, Currency, Period } from '@/types';
import { computed, onMounted, watch, ref } from 'vue';
import { useStore } from 'vuex';

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
    const date = new Date( period.value.value.year, period.value.value.month -1, 1 );
    const accounts = store.getters['accounts/activeAccounts'](date);
    const currencies = accounts.reduce( (ant: any[], a:any) => {
        if (
            [AccountType.Expense, AccountType.BankAccount, AccountType.CreditCard].includes(a.type) &&
            a.currency !== Currency.USD && 
            !ant.includes(a.currency)
        ) {
            ant.push(a.currency)
        }
        return ant;
    }, []);

    const investments = accounts.filter( a => store.getters['accounts/getAccountGroupType'](a.id) === AccountGroupType.Investments );

    values.value = [
        ...currencies.map( (c) => ({
            id: `${c}_usd`,
            type: 'Currency',
            name: Currency.USD,
            currency: c,
            value: store.getters['values/getValue'](date, Currency.USD, c)
        })),
        ...investments.map( (a) => ({
          entity: a.entity,
          id: a.id,
          type:  a.type,
          name: a.name, 
          currency: a.currency,
          value: store.getters['values/getValue'](date, a.id, a.currency)
        }))
    ];
  };

  function onChangePeriod() {
    recalculateValues();
  }

  onMounted(() => {
    recalculateValues();
  })

  function onValueEdit(event: any) {
    let { data, newData } = event;
    const newValue = Number(newData.value);
    if ( newValue > 0 && newValue !== data.value ) {
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