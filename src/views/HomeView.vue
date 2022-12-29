<template>
  <div class="grid justify-content-center">
    <div class="col-6 lg:col-4 md:col-4 xl:col-3 sm:text-lg" v-for="item in values" :key="`${item.key}-${item.currency}`">
      <AccountValueCard :name="item.name" :value="item.value" :currency="item.currency" />
    </div>

  </div>
</template>

<script lang="ts" setup>
  import AccountValueCard from '@/components/AccountValueCard.vue'
  import { getCurrentPeriod } from '@/helpers/options';
  import { AccountType } from '@/types';

  import { computed } from '@vue/runtime-core'
  import { useStore } from 'vuex';


  const store = useStore();


  const values = computed(() => {
    const currentPeriod = getCurrentPeriod();
    const balance =  store.state.balance.balance[currentPeriod.year];
    if (balance) {
      var types = {
        'Expenses': [AccountType.Expense],
        'Credit Cards': [AccountType.CreditCard],
      }

      if (store.state.storage.status.authenticated) {
        types = {
          ...types,
          'Cash': [AccountType.Cash],
          'Bank Accounts': [AccountType.BankAccount],
          'Accounts Receivable': [AccountType.AccountReceivable],
        }
      }

      const total = Object.keys(store.state.accounts.accounts).reduce ( (ant, k) => {
        const a = store.state.accounts.accounts[k];
        if (balance[a.id] && balance[a.id][currentPeriod.month] && balance[a.id][currentPeriod.month].value) {
          const t = Object.keys(types).find( t => types[t].includes(a.type));
          if (t) {
            ant[t][a.currency] = (ant[t][a.currency] || 0) + balance[a.id][currentPeriod.month].value;
          }
        }
        return ant;
      }, Object.keys(types).reduce( (ant, k) => ({...ant, [k]: {} }), {} ));

      return Object.keys(total).reduce( (ant, k) => {
        return [...ant, ...Object.keys(total[k]).map( c => ({name: k, currency:c, value: total[k][c]}))]
      }, []);
    }

    return [];
  });
</script>
