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
  <TreeTable :value="byCategory" v-if="displayType === 'table'" :showGridlines="true" :resizableColumns="true">
    <Column field="name" header="Name" footer="Total" :expander="true"></Column>
    <Column header="In/Out">
      <template #body="{node}"><div 
        :class="{ 'text-right': true, 'text-red-400': getInOut(node.data.values[0]) < 0, 'text-green-400': getInOut(node.data.values[0]) > 0}" 
        v-tooltip.bottom="'IN: '+ $format.currency(node.data.values[0].in, node.data.currency || 'cop')+
            '\nOUT: '+$format.currency(node.data.values[0].out, node.data.currency || 'cop') +
            '\nLOCAL IN: '+$format.currency(node.data.values[0].in_local, node.data.currency || 'cop') +
            '\nLOCAL OUT: '+$format.currency(node.data.values[0].out_local, node.data.currency || 'cop')">
        {{ $format.currency(getInOut(node.data.values[0]), node.data.currency || 'cop') }}
        </div></template>
      <template #footer><div :class="{ 'text-right': true, 'text-red-400': getInOut(getTotal) < 0, 'text-green-400': getInOut(getTotal) > 0}">{{ $format.currency(getInOut(getTotal), 'cop')}}</div></template>
    </Column>
    <Column header="Expenses">
      <template #body="{node}"><div :class="{ 'text-right': true, 'text-red-400': node.data.values[0].expenses > 0}">
        {{ $format.currency(node.data.values[0].expenses, node.data.currency || 'cop') }}
        </div></template>
      <template #footer><div :class="{ 'text-right': true, 'text-red-400': getTotal < 0, 'text-green-400': getTotal > 0}">{{ $format.currency(getTotal.expenses, 'cop')}}</div></template>
    </Column>
    <Column header="G/P">
      <template #body="{node}"><div :class="{ 'text-right': true, 'text-red-400': node.data.values[0].gp < 0, 'text-green-400': node.data.values[0].gp > 0}">
        {{ $format.percent( node.data.values[0].gp )}}
        </div></template>
      <template #footer><div :class="{ 'text-right': true, 'text-red-400': getTotal.gp < 0, 'text-green-400': getTotal.gp > 0}">{{ $format.percent( getTotal.gp ) }}</div></template>
    </Column>
    <Column header="Balance">
      <template #body="{node}">
        <div :class="{ 'text-right': true, 'text-red-400': node.data.values[0] < 0, 'text-green-400': node.data.values[0] > 0}">
        {{ $format.currency(node.data.values[0].value, node.data.currency || 'cop') }}
        </div>
        <div v-if="node.data.values[0].units" class="text-sm text-right">({{$format.number(node.data.values[0].units)}} und)</div>
      </template>
      <template #footer><div :class="{ 'text-right': true, 'text-red-400': getTotal < 0, 'text-green-400': getTotal > 0}">{{ $format.currency(getTotal.value, 'cop')}}</div></template>
    </Column>
  </TreeTable>
  <div class="flex"  v-if="displayType === 'pie'" >
    <Chart type="pie" :data="pieDataByEntity" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }}"/>
    <Chart type="pie" :data="pieDataByType" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }}"/>
    <Chart type="pie" :data="pieDataByRisk" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }}"/>
  </div>
    <!--
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
  import { computed, ref, onMounted } from 'vue'
  import { AccountGroupType, AccountType, Period } from '@/types';
  import { getCurrentPeriod, BACKGROUNDS_COLOR_GRAPH } from '@/helpers/options.js';
  import format from '@/format';

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
      var values = category.type === AccountType.Category ? [] : balance[category.id];
      if ( category.children ) {
        children = Object.keys(category.children).map((key) => getTotalByCategory(category.children[key], balance));
        values = children.reduce( (ant, child) => {
            if (!ant) {
              ant = Array.from(new Array(child.data.values.length), () => ({ value: 0, in: 0, out: 0, expenses: 0 }));
            }
            return ant.map( (v, index) => {
              if (child.data.currency!=='cop' && child.data.values[index]) {
                return {
                  value: v.value + (child.data.values[index].value * store.getters['values/getValue']( new Date(period.value.value.year, period.value.value.month, 1), child.data.currency, 'cop')),
                  in: v.in + (child.data.values[index].in * store.getters['values/getValue']( new Date(period.value.value.year, period.value.value.month, 1), child.data.currency, 'cop')),
                  out: v.out + (child.data.values[index].out * store.getters['values/getValue']( new Date(period.value.value.year, period.value.value.month, 1), child.data.currency, 'cop')),
                  expenses: v.expenses + (child.data.values[index].expenses * store.getters['values/getValue']( new Date(period.value.value.year, period.value.value.month, 1), child.data.currency, 'cop')),
                }
              }
              return {
                value: v.value + child.data.values[index].value,
                in: v.in + child.data.values[index].in,
                out: v.out + child.data.values[index].out,
                expenses: v.expenses + child.data.values[index].expenses,
              }
            } );
        }, undefined );
      }
      for (var i = 0; i < values.length - 1; i++ ) {
        // const in_out = (values[i].in || 0 ) + ( values[i].in_local || 0 ) + ( values[i].expenses || 0 ) - (values[i].out || 0) - ( values[i].out_local || 0 );
        // const div1 = (values[i].value || 0) + ( in_out < 0 ? -in_out : 0);
        // const div2 = values[i + 1].value + ( in_out > 0 ? in_out : 0);

        const div1 = (values[i].value || 0) + (values[i].out || 0) + ( values[i].out_local || 0 );
        const div2 = values[i + 1].value + values[i].in + ( values[i].in_local || 0 ) + ( values[i].expenses || 0 );
        values[i].gp = (div2 ) ? (div1-div2) / div2 : 0; 
      }
      return { 
        key: category.type === AccountType.Category ? category.name : category.id,
        data: {
          name: category.name,
          values: values,
          currency: category.currency || 'cop'
        },
        children
      };
  }

  const byCategory = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 2, period.value.value);
      const inv = store.getters['accounts/accountsGroupByCategories']([AccountGroupType.Investments], new Date(period.value.value.year, period.value.value.month, 1), period.value.type);
      const data =  inv?.Investments && Object.keys(inv.Investments).map( (key) => getTotalByCategory( inv.Investments[key], balance));
      return data || [];
  });

  const byType = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 2, period.value.value);
      const inv = store.getters['accounts/accountsGroupByType']([AccountGroupType.Investments], new Date(period.value.value.year, period.value.value.month, 1), period.value.type);
      const data =  inv && Object.keys(inv).map( (key) => getTotalByCategory( 
        {
          type: AccountType.Category,
          name: key,
          children: inv[key]
        }, balance));
      return data || [];
  });

  const byRisk = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 2, period.value.value);
      const inv = store.getters['accounts/investmentsGroupByRisk'](new Date(period.value.value.year, period.value.value.month, 1), period.value.type);
      const data =  inv && Object.keys(inv).map( (key) => getTotalByCategory( 
        {
          type: AccountType.Category,
          name: key,
          children: inv[key]
        }, balance));
      return data || [];
  });

  function getInOut(val: any){
    return val.in + (val.in_local || 0) - val.out -  (val.out_local || 0)
  }

  const getTotal = computed(() => {
    const val1 = byCategory.value.reduce( (ant, v) => ({
      value: ant.value + v.data.values[0].value,
      in: ant.in + v.data.values[0].in,
      out: ant.out + v.data.values[0].out,
      expenses: ant.expenses + v.data.values[0].expenses,
      }), { value: 0, in: 0, out: 0, expenses: 0})

    const val2 = byCategory.value.reduce( (ant, v) => ant + v.data.values[1].value, 0)

    const div1 = val1.value + val1.out;
    const div2 = val2 + val1.in + ( val1.expenses || 0 );

    return {
      ...val1,
      gp: (div2 > 0) ? (div1-div2) / div2 : 0
    };
    } );

  const pieDataByEntity = computed(() => {
    return {labels: byCategory.value.map( c => c.data.name),
        datasets: [
            {
                data: byCategory.value.map( c => c.data.values[0].value),
                backgroundColor: BACKGROUNDS_COLOR_GRAPH,
            }
        ]};
  });

  const pieDataByType = computed(() => {
    return {labels: byType.value.map( c => c.data.name),
        datasets: [
            {
                data: byType.value.map( c => c.data.values[0].value),
                backgroundColor: BACKGROUNDS_COLOR_GRAPH,
            }
        ]};
  });

  const pieDataByRisk = computed(() => {
    return {labels: byRisk.value.map( c => c.data.name),
        datasets: [
            {
                data: byRisk.value.map( c => c.data.values[0].value),
                backgroundColor: BACKGROUNDS_COLOR_GRAPH,
            }
        ]};
  });
  function onChangePeriod() {
    store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 1})
  }

</script>