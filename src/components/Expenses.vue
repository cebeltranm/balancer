<template>
 <v-card >
    <v-toolbar flat>
      <v-select 
        :items="PERIODS" 
        v-model="selectedPeriod" 
        variant="plain" 
        density="comfortable"
        hide-details/>
      <v-select 
        :items="optionsPerPeriod" 
        v-model="selectedPeriodOption" 
        variant="plain" 
        item-title="name" 
        item-value="value" 
        density="comfortable"
        hide-details/>
      <v-spacer></v-spacer>
      <v-btn-toggle v-model="optionSelected">
        <v-btn icon>
          <v-icon icon="list" />
        </v-btn>

        <v-btn icon>
          <v-icon icon="pie_chart" />
        </v-btn>
      </v-btn-toggle>      
    </v-toolbar>
    <v-divider></v-divider>
    <v-list lines="two">
      <account-item v-for="group in expenses" :key="group.name" :account="group" />
    </v-list>
 </v-card>
</template>
<!-- 
   <template v-slot:title>
    <v-select
        :items="options"
        label="Standard variant"
      ></v-select>
    </template> -->

<script lang='ts' setup>
import { ref, watchEffect, onMounted } from 'vue';
import { useIntl } from 'vue-intl';
import { computed } from '@vue/reactivity';
import { useStore } from 'vuex';
import AccountItem from '@/components/AccountItem.vue';
import { PERIODS, getOptionPerPeriod } from '@/helpers/options';

const store = useStore();
const intl = useIntl();

const expenses = ref({}); // computed(() => store.getters['accounts/expensesByCategories'] );

const years=[0,1,2,3,4,5].map( m => (new Date()).getYear() + 1900 - m );

const selectedPeriod = ref(PERIODS[0]);
const optionsPerPeriod = ref(getOptionPerPeriod(PERIODS[0]));
const selectedPeriodOption = ref(optionsPerPeriod.value[0]);
watchEffect(() => { 
  optionsPerPeriod.value = getOptionPerPeriod(selectedPeriod.value); 
  selectedPeriodOption.value = optionsPerPeriod.value[0];
} )

const optionSelected = ref(0);
const totalValue = ref(0);
const totalBudget = ref(0);

function getValue(account: any, key:string) {
  account[key] = 10;
  if (account.childs)
    account[key] = Object.keys(account.childs).reduce( (sum:number, id:string) => sum + getValue(account.childs[id], key), account[key]);;
  return account[key];
}

watchEffect(() => {
  const exp = store.getters['accounts/expensesByCategories'];
  totalValue.value = Object.keys(exp).reduce( (sum:number, id:string) => sum + getValue(exp[id], 'value'), 0);
  totalBudget.value = Object.keys(exp).reduce( (sum:number, id:string) => sum + getValue(exp[id], 'budget'), 0);
  expenses.value = exp;
})

onMounted(() => {
  store.dispatch('budget/loadBudget', (new Date()).getYear() + 1900);
})
</script>
