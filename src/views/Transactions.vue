<template>
  <Toolbar>
    <template #start>
        <AccountsSelector v-model:accounts="accounts" :date="selectedDate"/>
    </template>
    <template #end>
        <PeriodSelector v-model:period="period" @update:period="onChangePeriod" :only-period="true" />
    </template>
  </Toolbar>
  <div class="transacctions">
  <DataTable :value="list"
    responsiveLayout="scroll" 
    :resizableColumns="true" columnResizeMode="fit" showGridlines
    class="p-datatable-sm"
    :rowClass="rowClass"
    :scrollable="true"
    scrollHeight="flex"
    scrollDirection="both"
    >
    <Column header="Date" style="min-width:70px; width:80px">
        <template #body="slotProps">
        {{$format.date(slotProps.data.date)}}
        </template>
    </Column>
    <Column field="account" header="Account"  style="min-width:100px; width:150px" v-if="isDesktop()"></Column>
    <Column field="description" header="Description"  style="min-width:100px; width:150px">
      <template #footer>Total</template>
    </Column>
    <Column field="tags" header="Tags" style="width:50px" v-if="isDesktop()">
      <template #body="slotProps">
        <Chip v-for="tag in slotProps.data.tags" :key="tag" :label="tag" />
      </template>
    </Column>
    <Column header="Value" class="text-right"  style="width:100px">
        <template #body="slotProps"><div :class="{ 'text-right': true, 'text-red-400': slotProps.data.value < 0, 'text-green-400': slotProps.data.value > 0}" style="width: 100%">
        {{$format.currency(slotProps.data.value, slotProps.data.currency)}}
        </div></template>
        <template #footer><div class="text-right" style="width: 100%">{{$format.currency(getTotal(), CURRENCY)}}</div></template>
    </Column>
    <Column  style="width:50px">
        <template #body="slotProps">
            <Button icon="pi pi-pencil" @click="editTrans(slotProps.data.id, $event)" />
            <Button icon="pi pi-times" @click="deleteTrans(slotProps.data.id, $event)" class="p-button-danger ml-2"/>
        </template>
    </Column>
  </DataTable>
  </div>
  <TransactionEditDialog :transaction="transToEdit" ref="transactionDialog"/>
</template>

<style scoped>
    .transacctions {
        height: calc(100vh - 14rem);
    }
    @media (max-width: 600px) {
    .transacctions {
      height: calc(100vh - 11rem);
    }
  }

</style>

<script lang="ts" setup>
  import AccountsSelector from '@/components/AccountsSelector.vue'
  import PeriodSelector from '@/components/PeriodSelector.vue'
  import TransactionEditDialog from '@/components/TransactionEditDialog.vue'

  import { useStore } from 'vuex';
  import { computed, ref, onMounted, toRaw, inject } from 'vue'
  import { getCurrentPeriod, getPeriodDate } from '@/helpers/options.js';
  import { Currency, Period } from '@/types';
  import { useConfirm } from "primevue/useconfirm";
  import { EVENTS } from '@/helpers/events';
  import { isDesktop } from '@/helpers/browser';

  import type { Ref } from 'vue';

  const CURRENCY: Ref | undefined = inject('CURRENCY');

  const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
  });

  const selectedDate = ref(new Date(period.value.value.year, period.value.value.month - 1, 1));

  const accounts = ref([]);

  const store = useStore();
  const confirm = useConfirm();

  var transToEdit = ref();
  const transactionDialog = ref<InstanceType<typeof TransactionEditDialog> | null>(null);
  
  const list = computed(() => {
    if (store.state.transactions.values[period.value.value.year] && store.state.transactions.values[period.value.value.year][period.value.value.month]) {
        return store.state.transactions.values[period.value.value.year][period.value.value.month].filter( t => !t.deleted).reduce( (ant, t) => {
            return ant.concat(t.values.filter( (v: any) => accounts.value.includes(v.accountId) ).map( (v: any) => ({
                id: t.id,
                date: t.date, description: t.description, tags: t.tags,
                account: store.getters['accounts/getAccountFullName'](v.accountId), 
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

  function getTotal() {
    return store.getters['values/joinValues']( 
      selectedDate.value,
      CURRENCY?.value,
      list.value.map( l => ({value: l.value, asset: l.currency}))
    );
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
    transToEdit.value = getTransaction(id);
    transactionDialog.value?.show();
  }
  function onChangePeriod() {
    selectedDate.value = getPeriodDate(period.value.type, period.value.value);
    if (!store.state.transactions.values[period.value.value.year] || !store.state.transactions.values[period.value.value.year][period.value.value.month]) {
        store.dispatch('transactions/getTransactionsForMonth', {year: period.value.value.year, month: period.value.value.month})
    }
  }
</script>
