<template>
  <Toolbar>
    <template #start>
        <AccountsSelector v-model:accounts="accounts"/>
    </template>
    <template #end>
        <PeriodSelector v-model:period="period" @update:period="onChangePeriod" :only-period="true" />
    </template>
  </Toolbar>
  <DataTable :value="list" :rows="20" :paginator="true" 
    responsiveLayout="scroll" 
    :resizableColumns="true" columnResizeMode="fit" showGridlines
    class="p-datatable-sm"
    :rowClass="rowClass">
    <Column header="Date">
        <template #body="slotProps">
        {{$format.date(slotProps.data.date)}}
        </template>
    </Column>
    <Column field="account" header="Account"></Column>
    <Column field="description" header="Description"></Column>
    <Column header="Value" class="text-right">
        <template #body="slotProps"><div class="text-right">
        {{$format.currency(slotProps.data.value, slotProps.data.currency)}}
        </div></template>
    </Column>
    <Column>
        <template #body="slotProps">
            <Button icon="pi pi-pencil" @click="editTrans(slotProps.data.id, $event)" />
            <Button icon="pi pi-times" @click="deleteTrans(slotProps.data.id, $event)" class="p-button-danger ml-2"/>
        </template>
    </Column>
  </DataTable>
</template>

<script lang="ts" setup>
  import AccountsSelector from '@/components/AccountsSelector.vue'
  import PeriodSelector from '@/components/PeriodSelector.vue'

  import { useStore } from 'vuex';
  import { computed, ref, onMounted, toRaw } from 'vue'
  import { getCurrentPeriod } from '@/helpers/options.js';
  import { Period } from '@/types';
  import { useConfirm } from "primevue/useconfirm";
  import { EVENTS } from '@/helpers/events';

  const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
  });

  const accounts = ref([]);

  const store = useStore();
  const confirm = useConfirm();
  
  const list = computed(() => {
    if (store.state.transactions.values[period.value.value.year] && store.state.transactions.values[period.value.value.year][period.value.value.month]) {
        return store.state.transactions.values[period.value.value.year][period.value.value.month].filter( t => !t.deleted).reduce( (ant, t) => {
            return ant.concat(t.values.filter( (v: any) => accounts.value.includes(v.accountId) ).map( (v: any) => ({
                id: t.id,
                date: t.date, description: t.description,
                account: store.state.accounts.accounts[v.accountId].name, 
                value: v.accountValue,
                currency: store.state.accounts.accounts[v.accountId].currency,
                to_sync: t.to_sync,
            })));
        } , []);
    }
    return [];
  })

  function rowClass(data: any) {
    return data.to_sync ? 'bg-red-900': null;
  }

  function getTransaction(id: string){
    if (store.state.transactions.values[period.value.value.year] && store.state.transactions.values[period.value.value.year][period.value.value.month]) {
        return store.state.transactions.values[period.value.value.year][period.value.value.month].find( t => t.id === id)
    }
  }

  function deleteTrans(id: string, event: any) {
    confirm.require({
        target: event.currentTarget,
        message: 'Are you sure you want to delete this trannsaction?',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
            const trans = getTransaction(id);
            await store.dispatch('transactions/deleteTransaction', toRaw(trans));
            EVENTS.emit('message', { message: 'Transaction deleted'})
            trans.deleted = true;
        },
        reject: () => {
        }
    });
  }
  function editTrans(id: string) {
    console.log('editTrans', getTransaction(id));
  }
  function onChangePeriod() {
    if (!store.state.transactions.values[period.value.value.year] || !store.state.transactions.values[period.value.value.year][period.value.value.month]) {
        store.dispatch('transactions/getTransactionsForMonth', {year: period.value.value.year, month: period.value.value.month})
    }
  }

</script>
