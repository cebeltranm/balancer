<template>
  <Toolbar>
    <template #start>
      <PeriodSelector v-model:period="period" @update:period="onChangePeriod" :only-type="!['table', 'pie'].includes(displayType)" />
    </template>
    <template #end>
        <SelectButton v-model="displayType" :options="displayOptions" optionValue="id">
	        <template #option="{option}">
              <i :class="option.icon"></i>
          </template>
        </SelectButton>
    </template>
  </Toolbar>
  <template v-if="isAuthenticated">
    <TreeTable :value="byCategory" v-if="displayType === 'table'">
      <Column field="name" header="Name" footer="Total" :expander="true"></Column>
      <Column header="Balance">
        <template #body="{node}"><div :class="{ 'text-right': true, 'text-red-400': node.data.values[0] < 0, 'text-green-400': node.data.values[0] > 0}">
          {{ $format.currency(node.data.values[0], node.data.currency || CURRENCY) }}
          </div></template>
        <template #footer><div :class="{ 'text-right': true, 'text-red-400': getTotal < 0, 'text-green-400': getTotal > 0}">{{ $format.currency(getTotal, CURRENCY)}}</div></template>
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
  import PeriodSelector from '@/components/PeriodSelector.vue'

  import { useStore } from 'vuex';
  import { computed, ref, onMounted, inject } from 'vue'
  import { AccountGroupType, AccountType, Period } from '@/types';
  import { getCurrentPeriod, BACKGROUNDS_COLOR_GRAPH, getPeriodDate } from '@/helpers/options.js';
  import format from '@/format';

  import type { Ref } from 'vue';

  const CURRENCY: Ref | undefined = inject('CURRENCY');

  const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
  });

  const displayType = ref('table');
  const displayOptions = [{id: 'table', icon:'pi pi-table'}, {id: 'pie', icon:'pi pi-chart-pie'}, {id:'bar', icon:'pi pi-chart-bar'}];
  const store = useStore();

  const isAuthenticated = computed(() => store.state.storage.status.authenticated);

  function getTotalByCategory( category: any, balance: any) {
      var children = undefined;
      var values = category.type === AccountType.Category ? [] : balance[category.id].map( v => v.value);
      if ( category.children ) {
        children = Object.keys(category.children).map((key) => getTotalByCategory(category.children[key], balance));
        values = children.reduce( (ant, child) => {
            if (!ant) {
              ant = Array.from(new Array(child.data.values.length), () => 0);
            }
            return ant.map( (v, index) => {
              if (child.data.currency!==CURRENCY?.value && child.data.values[index]) {
                return v + (child.data.values[index] * store.getters['values/getValue']( getPeriodDate(period.value.type, period.value.value), child.data.currency, CURRENCY?.value))  
              }
              return v + child.data.values[index] 
            } );
        }, undefined );
      }

      return { 
        key: category.type === AccountType.Category ? category.name : category.id,
        data: {
          name: category.name,
          values: values,
          currency: category.currency || CURRENCY?.value
        },
        children
      };
  }

  const byCategory = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 1, period.value.value);
      const assets = store.getters['accounts/accountsGroupByCategories']([AccountGroupType.Assets, AccountGroupType.AccountsReceivable, AccountGroupType.Liabilities], getPeriodDate(period.value.type, period.value.value));
      const data =  Object.keys(assets).map( (key) => getTotalByCategory(
        {
          name: key,
          type: AccountType.Category,
          children: assets[key]
        }
        , balance));
      return data;
  });

  // const pieData = computed(() => {
  //   return {labels: byCategory.value.map( c => c.data.name),
  //       datasets: [
  //           {
  //               data: byCategory.value.map( c => c.data.values[0]),
  //               backgroundColor: BACKGROUNDS_COLOR_GRAPH,
  //               // hoverBackgroundColor: ["#64B5F6","#81C784","#FFB74D"]
  //           }
  //       ]};
  // });

  // const barData = computed(() => {
  //   const currentPeriod = getCurrentPeriod();
  //   const numPeriods = period.value.type === Period.Month ? 13 : period.value.type === Period.Quarter ? 9 : 5;
  //   const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, numPeriods, currentPeriod);
  //   const expences = store.getters['accounts/expensesByCategories'];

  //   const grouped = Object.keys(expences).map( (key) => getTotalByCategory(expences[key], balance));
    
  //   const labels = [];
  //   for (var i = 1 ; i < numPeriods + 1; i++) {
  //     labels.push(`${currentPeriod.year}${period.value.type === Period.Month ? '/'+currentPeriod.month: ''}${period.value.type === Period.Quarter ? '/'+currentPeriod.quarter: ''}`);
  //     switch(period.value.type){
  //     case Period.Quarter:
  //       currentPeriod.year = currentPeriod.quarter === 1 ? currentPeriod.year - 1 : currentPeriod.year;
  //       currentPeriod.quarter = currentPeriod.quarter === 1 ? 4 : currentPeriod.quarter - 1;
  //       break;
  //     case Period.Year:
  //       currentPeriod.year = currentPeriod.year - 1;
  //       break;
  //     default:
  //       currentPeriod.year = currentPeriod.month === 1 ? currentPeriod.year - 1 : currentPeriod.year;
  //       currentPeriod.month = currentPeriod.month === 1 ? 12 : currentPeriod.month - 1;
  //     }
  //   }

  //   return {labels: labels.reverse(),
  //       datasets: grouped.map( (c: any, index) => {
  //         return {
  //           type: 'bar',
  //           label: c.data.name,
  //           backgroundColor: BACKGROUNDS_COLOR_GRAPH[index],
  //           data: c.data.values.reverse()
  //         };
  //       })
  //       };
  // });


  const getTotal = computed(() => byCategory.value.reduce( (ant, v) => ant + v.data.values[0] , 0) );

  function onChangePeriod() {
    store.dispatch('balance/getBalanceForYear', {year: period.value.value.year})
  }

</script>
