<template>
  <Toolbar>
    <template #start>
      <PeriodSelector v-model:period="period" @update:period="onChangePeriod" :only-type="!['table', 'pie'].includes(displayType)" />
      <Dropdown v-model="categorySelected" :options="['All', ...expenseCategories]" placeholder="Select a Category" class="pt-1 pb-1 ml-1 mr-1 w-12rem text-center" panelClass="z-5" v-if="displayType === 'bar'"/>
    </template>
    <template #end>
        <SelectButton v-model="displayType" :options="displayOptions" optionValue="id" @update:modelValue="onChangeDisplayType" >
	        <template #option="{option}">
              <i :class="option.icon"></i>
          </template>
        </SelectButton>
    </template>
  </Toolbar>
  
  <TreeTable 
    :value="byCategory" 
    v-if="displayType === 'table'"
    responsiveLayout="scroll"
    scrollDirection="both"
    :resizableColumns="true" columnResizeMode="fit" showGridlines
    :scrollable="true"
    >
    <Column field="name" header="Name" footer="Total" :expander="true" style="width:200px; z-index: 1;" frozen></Column>
    <template v-for="(title, index) in [0,1,2,3,4]" :key="`${title}-${index}`">
      <Column :header="periodLabel(period.type, increasePeriod(period.type, period.value, -index) )"  style="width:200px">
        <template #body="{node}">
          <div class="grid" style="width: 100%">
            <div class="text-right" style="width: 100%">
                {{ $format.currency(node.data.values[index], node.data.currency || 'cop') }}
            </div>
            <div style="width: 100%"
              :class="{ 'text-right': true, 'text-red-400': node.data.values[0]- node.data.values[index] > 0, 'text-green-400': node.data.values[0]- node.data.values[index] < 0}"
              v-if="index>0 && node.data.values[index] > 0">
              ({{ format.percent( (node.data.values[0]- node.data.values[index])/node.data.values[index] ) }})
            </div>
            <div class="text-right" style="width: 100%" v-else>&nbsp;</div>
            <div class="text-right" style="width: 100%">
              <ProgressBar 
                :class="{ error: node.data.values[index] > node.data.budget[0], 'mt-1':true, 'text-xs': true, 'h-1rem': true }"
                :showValue="true" 
                :value="Math.trunc(100*node.data.values[index]/node.data.budget[index])"
                v-tooltip.top="$format.currency(node.data.budget[index], node.data.currency || 'cop')"
                v-if="node.data.budget[index]"
                />
            </div>
          </div>
        </template>
        <template #footer>
          <div class="grid" style="width: 100%">
            <div class="text-right" style="width: 100%">{{ $format.currency(getTotal(index), 'cop')}}</div>
            <div style="width: 100%" 
              :class="{ 'text-right': true, 'text-red-400': getTotal(0) - getTotal(index) > 0, 'text-green-400': getTotal(0) - getTotal(index) < 0}"
              v-if="index>0 && getTotal(index) > 0">
                ({{ format.percent( (getTotal(0) - getTotal(index))/getTotal(index) ) }})
            </div>
            <div class="text-right" style="width: 100%" v-else>&nbsp;</div>
            <div class="text-right" style="width: 100%">
              <ProgressBar 
                :class="{ error: getTotal(index) > getTotalBudget(index), 'mt-2':true, }"
                :showValue="true" 
                :value="Math.trunc(100*getTotal(index)/getTotalBudget(index))" 
                v-tooltip.right="getTotalBudget(index)"
                v-if="getTotalBudget(index)" />
            </div>
          </div>
        </template>
      </Column>
    </template>
    </TreeTable>
  <!-- <div style="max-width:600px">
  <Chart type="doughnut" :data="pieData" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }}" " />
  </div> -->

  <GChart
    v-if="displayType === 'pie'"
    :settings="{ packages: ['corechart','treemap'] }"
    type="TreeMap"
    :data="treeMap.data"
    :options="treeMap.options"
  />
  <template  v-if="displayType === 'bar'">
    <div>
      <h1>{{barData.title}}</h1>
      <Chart type="bar" :data="barData" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }, scales: { x: {stacked: true}, y: {stacked: true} }}" />
    </div>
  </template>

  <!-- <template v-for="data in barData" :key="data.title"  v-if="displayType === 'bar'">
    <div>
      <h1>{{data.title}}</h1>
      <Chart type="bar" :data="data" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }, scales: { x: {stacked: true}, y: {stacked: true} }}" />
    </div>
  </template> -->

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
  import { computed, ref, onMounted } from 'vue'
  import { Period } from '@/types';
  import { getCurrentPeriod, increasePeriod, periodLabel, BACKGROUNDS_COLOR_GRAPH } from '@/helpers/options.js';
  import format from '@/format';

  const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
  });

  const displayType = ref('table');
  const displayOptions = [{id: 'table', icon:'pi pi-table'}, {id: 'pie', icon:'pi pi-chart-pie'}, {id:'bar', icon:'pi pi-chart-bar'}];
  const store = useStore();
  const expenseCategories = computed(() => Object.keys(store.getters['accounts/expensesByCategories']))
  const categorySelected = ref('All');

  function getTotalByCategory( category: any, balance: any, budget?: any) {
      var children = undefined;
      var values = category.type === 'Category' ? [] : balance[category.id].map( v => v.value);
      var vBudget = (category.type === 'Category' || !budget) ? [] : budget[category.id];
      if ( category.children ) {
        children = Object.keys(category.children).map((key) => getTotalByCategory(category.children[key], balance, budget));
        values = children.reduce( (ant, child) => {
            if (!ant) {
              ant = Array.from(new Array(child.data.values.length), () => 0);
            }
            return ant.map( (v, index) => {
              if (child.data.currency!=='cop' && child.data.values[index]) {
                return v + (child.data.values[index] * store.getters['values/getValue']( new Date(period.value.value.year, period.value.value.month, 1), 'cop', child.data.currency))  
              }
              return v + child.data.values[index] 
            } );
        }, undefined );
        vBudget = budget && children.reduce( (ant, child) => {
            if (!ant) {
              ant = Array.from(new Array(child.data.values.length), () => 0);
            }
            return ant.map( (v, index) => {
              if (child.data.currency!=='cop' && child.data.budget[index]) {
                return v + (child.data.budget[index] * store.getters['values/getValue']( new Date(period.value.value.year, period.value.value.month, 1), 'cop', child.data.currency))  
              }
              return v + child.data.budget[index]
            }  );
        }, undefined );

      }
      return { 
        key: category.type === 'Category' ? category.name : category.id,
        data: {
          name: category.name,
          values: values,
          budget: vBudget,
          currency: category.currency || 'cop'
        },
        children
      };
  }

  const byCategory = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 5, period.value.value);
      const budget = store.getters['budget/getBudgetGrupedByPeriod'](period.value.type, 5, period.value.value);
      const expences = store.getters['accounts/expensesByCategories'];

      return Object.keys(expences).map( (key) => getTotalByCategory(expences[key], balance, budget));
  });

  const treeMap = computed(() => {
    const groupElements = (group: any, parent: string) => group.reduce( (arr: any[], g: any) => {
        const n = parent !== 'Total' ? `${parent}::${g.data.name}` : g.data.name;
        arr.push([n, parent, g.data.values[0], 
        g.data.values[0] - g.data.values[1] ]);
        if (g.children) {
          arr.push(...groupElements(g.children, n));
        }
        return arr;
      }, []);

    const data = [['Expense', 'Parent', 'Value', 'Diff'], ['Total', null, 0, 0], ...groupElements(byCategory.value, 'Total') ];

    return {
      data,
      options: {
        nableHighlight: true,
        maxDepth: 1,
        maxPostDepth: 2,
        minHighlightColor: '#8c6bb1',
        midHighlightColor: '#9ebcda',
        maxHighlightColor: '#edf8fb',
        minColor: '#009688',
        midColor: '#f7f7f7',
        maxColor: '#ee8100',
        headerHeight: 20,
        showScale: true,
        height: 500,
        generateTooltip: (row, value, size) => {
            return '<div class="bg-blue-900 border-blue-100 p-2 border-3">' +
              '<span>' + format.currency(value, 'cop') + '</span><br />' +
           '</div>'
        }
      }
    }
  });

  const barData = computed(() => {
    var currentPeriod = getCurrentPeriod();
    const numPeriods = period.value.type === Period.Month ? 13 : period.value.type === Period.Quarter ? 9 : 10;
    const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, numPeriods, currentPeriod);
    const expences = store.getters['accounts/expensesByCategories'];

    var grouped = Object.keys(expences).map( (key) => getTotalByCategory(expences[key], balance));
    const labels = [];
    for (var i = 1 ; i < numPeriods + 1; i++) {
      labels.push(`${currentPeriod.year}${period.value.type === Period.Month ? '/'+currentPeriod.month: ''}${period.value.type === Period.Quarter ? '/'+currentPeriod.quarter: ''}`);
      currentPeriod = increasePeriod(period.value.type, currentPeriod, -1);
    }

    if (categorySelected.value !== 'All' ) {
      grouped = grouped.find( g => g.data.name === categorySelected.value).children;
    }

    const pieData = {
        title: categorySelected.value === 'All' ? 'TOTAL' : categorySelected.value,
        labels: labels.reverse(),
        datasets: grouped.map( (c: any, index) => {
          return {
            type: 'bar',
            label: c.data.name,
            backgroundColor: BACKGROUNDS_COLOR_GRAPH[index],
            data: c.data.values.reverse()
          };
        })
    }

      //   ...grouped.filter(g => g.children && g.children.length).map( (g: any) => {
  //     return  {
  //       title: g.data.name,
  //       labels: labels.reverse(),
  //       datasets: g.children.map( (c: any, index) => {
  //         return {
  //           type: 'bar',
  //           label: c.data.name,
  //           backgroundColor: BACKGROUNDS_COLOR_GRAPH[index],
  //           data: c.data.values.reverse()
  //         };
  //       })
  //     }

    return pieData;
  });

  // const barData = computed(() => {
  //   var currentPeriod = getCurrentPeriod();
  //   const numPeriods = period.value.type === Period.Month ? 13 : period.value.type === Period.Quarter ? 9 : 10;
  //   const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, numPeriods, currentPeriod);
  //   const expences = store.getters['accounts/expensesByCategories'];

  //   const grouped = Object.keys(expences).map( (key) => getTotalByCategory(expences[key], balance));
  //   const labels = [];
  //   for (var i = 1 ; i < numPeriods + 1; i++) {
  //     labels.push(`${currentPeriod.year}${period.value.type === Period.Month ? '/'+currentPeriod.month: ''}${period.value.type === Period.Quarter ? '/'+currentPeriod.quarter: ''}`);
  //     currentPeriod = increasePeriod(period.value.type, currentPeriod, -1);
  //   }

  //   const pieData = [{
  //       title: 'TOTAL',
  //       labels: labels.reverse(),
  //       datasets: grouped.map( (c: any, index) => {
  //         return {
  //           type: 'bar',
  //           label: c.data.name,
  //           backgroundColor: BACKGROUNDS_COLOR_GRAPH[index],
  //           data: c.data.values.reverse()
  //         };
  //       })
  //   },
  //   ...grouped.filter(g => g.children && g.children.length).map( (g: any) => {
  //     return  {
  //       title: g.data.name,
  //       labels: labels.reverse(),
  //       datasets: g.children.map( (c: any, index) => {
  //         return {
  //           type: 'bar',
  //           label: c.data.name,
  //           backgroundColor: BACKGROUNDS_COLOR_GRAPH[index],
  //           data: c.data.values.reverse()
  //         };
  //       })
  //     }
  //   }) ]
  //   return pieData;
  // });


  const getTotal = (index: number) => byCategory.value.reduce( (ant, v) => ant + v.data.values[index] , 0);
  const getTotalBudget = (index: number) => byCategory.value.reduce( (ant, v) => ant + v.data.budget[index] , 0);

  function onChangePeriod() {
    store.dispatch('balance/getBalanceForYear', {year: period.value.value.year})
  }
  function onChangeDisplayType() {
    if(displayType.value === 'bar') {
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 1})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 2})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 3})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 4})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 5})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 6})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 7})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 8})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 9})
      store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 10})
    }
  }

</script>
