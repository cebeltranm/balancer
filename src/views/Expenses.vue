<template>
  <Toolbar>
    <template #start>
      <PeriodSelector v-model:period="period" :only-type="!['table', 'pie'].includes(displayType)" />
        <!-- <Button icon="pi pi-caret-left" @click="reducePeriod" :disabled="!canReduce" v-if="['table', 'pie'].includes(displayType)" />
        <Dropdown v-model="typePeriod" :options="periodTypes" optionLabel="name" optionValue="value"  placeholder="Select a Period" class="pt-1 pb-1 ml-1 mr-1 w-12rem text-center" />
        <Button icon="pi pi-caret-right" class="ml-0" @click="increasePeriod" :disabled="!canIncrease"  v-if="['table', 'pie'].includes(displayType)"/> -->
    </template>
    <template #end>
        <SelectButton v-model="displayType" :options="displayOptions" optionValue="id">
	        <template #option="{option}">
              <i :class="option.icon"></i>
          </template>
        </SelectButton>
    </template>
  </Toolbar>
  
  <TreeTable :value="byCategory" v-if="displayType === 'table'">
    <Column field="name" header="Name" footer="Total" :expander="true"></Column>
    <Column header="Budget">
      <template #body="{node}">
          <ProgressBar 
            :class="{ error: node.data.values[0] > node.data.budget[0] }"
            :showValue="true" 
            :value="Math.trunc(100*node.data.values[0]/node.data.budget[0])"
            v-tooltip.left="$format.currency(node.data.budget[0], node.data.currency || 'cop')"
            v-if="node.data.budget[0]" />
      </template>
      <template #footer>
        <ProgressBar 
            :class="{ error: getTotal > getTotalBudget }"
            :showValue="true" 
            :value="Math.trunc(100*getTotal/getTotalBudget)" 
            v-tooltip.left="$format.currency(getTotalBudget, 'cop')"
            v-if="getTotalBudget" />
      </template>
    </Column>
    <Column header="Value">
      <template #body="{node}"><div class="text-right">
        {{ $format.currency(node.data.values[0], node.data.currency || 'cop') }}
        </div></template>
      <template #footer><div class="text-right">{{ $format.currency(getTotal, 'cop')}}</div></template>
    </Column>
  </TreeTable>
  <div style="max-width:600px">
  <Chart type="doughnut" :data="pieData" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }}" v-if="displayType === 'pie'" />
  </div>
  <Chart type="bar" :data="barData" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }, scales: { x: {stacked: true}, y: {stacked: true} }}"  v-if="displayType === 'bar'" />

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
  import { getCurrentPeriod, BACKGROUNDS_COLOR_GRAPH } from '@/helpers/options.js';
  import format from '@/format';

  const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
  });

  const displayType = ref('table');
  const displayOptions = [{id: 'table', icon:'pi pi-table'}, {id: 'pie', icon:'pi pi-chart-pie'}, {id:'bar', icon:'pi pi-chart-bar'}];
  const store = useStore();

  function getTotalByCategory( category: any, balance: any, budget?: any) {
      var children = undefined;
      var values = category.type === 'Category' ? [] : balance[category.id];
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
              return child.data.budget;
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
          currency: category.currency
        },
        children
      };
  }

  const byCategory = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 1, period.value.value);
      const budget = store.getters['budget/getBudgetGrupedByPeriod'](period.value.type, 1, period.value.value);
      const expences = store.getters['accounts/expensesByCategories'];

      return Object.keys(expences).map( (key) => getTotalByCategory(expences[key], balance, budget));
  });

  const pieData = computed(() => {
    return {labels: byCategory.value.map( c => c.data.name),
        datasets: [
            {
                data: byCategory.value.map( c => c.data.values[0]),
                backgroundColor: BACKGROUNDS_COLOR_GRAPH,
                // hoverBackgroundColor: ["#64B5F6","#81C784","#FFB74D"]
            }
        ]};
  });

  const barData = computed(() => {
    const currentPeriod = getCurrentPeriod();
    const numPeriods = period.value.type === Period.Month ? 13 : period.value.type === Period.Quarter ? 9 : 5;
    const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, numPeriods, currentPeriod);
    const expences = store.getters['accounts/expensesByCategories'];

    const grouped = Object.keys(expences).map( (key) => getTotalByCategory(expences[key], balance));
    
    const labels = [];
    for (var i = 1 ; i < numPeriods + 1; i++) {
      labels.push(`${currentPeriod.year}${period.value.type === Period.Month ? '/'+currentPeriod.month: ''}${period.value.type === Period.Quarter ? '/'+currentPeriod.quarter: ''}`);
      switch(period.value.type){
      case Period.Quarter:
        currentPeriod.year = currentPeriod.quarter === 1 ? currentPeriod.year - 1 : currentPeriod.year;
        currentPeriod.quarter = currentPeriod.quarter === 1 ? 4 : currentPeriod.quarter - 1;
        break;
      case Period.Year:
        currentPeriod.year = currentPeriod.year - 1;
        break;
      default:
        currentPeriod.year = currentPeriod.month === 1 ? currentPeriod.year - 1 : currentPeriod.year;
        currentPeriod.month = currentPeriod.month === 1 ? 12 : currentPeriod.month - 1;
      }
    }

    return {labels: labels.reverse(),
        datasets: grouped.map( (c: any, index) => {
          return {
            type: 'bar',
            label: c.data.name,
            backgroundColor: BACKGROUNDS_COLOR_GRAPH[index],
            data: c.data.values.reverse()
          };
        })
        };
  });


  const getTotal = computed(() => byCategory.value.reduce( (ant, v) => ant + v.data.values[0] , 0) );
  const getTotalBudget = computed(() => byCategory.value.reduce( (ant, v) => ant + v.data.budget[0] , 0) );

</script>
