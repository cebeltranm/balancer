<template>
  <Toolbar>
    <template #start>
      <PeriodSelector v-model:period="period" @update:period="onChangePeriod" :only-type="!['table', 'pie'].includes(displayType)" />
      <Dropdown v-model="typeInvestment" :options="['ByCategory', 'ByType', 'ByRisk']" placeholder="Select a Period" class="pt-1 pb-1 ml-1 mr-1 w-12rem text-center" panelClass="z-5" v-if="displayType === 'pie'"/>
      <AccountsSelector v-model:accounts="accounts" :groups="[AccountGroupType.Investments]" :date="getPeriodDate(period.type, period.value)"  v-if="displayType === 'bar'"/>
    </template>
    <template #end>
        <SelectButton v-model="displayType" :options="displayOptions" optionValue="id" @update:modelValue="onChangeDisplayType" >
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
      <template #footer><div :class="{ 'text-right': true, 'text-red-400': getInOut(getTotal[0]) < 0, 'text-green-400': getInOut(getTotal[0]) > 0}">{{ $format.currency(getInOut(getTotal[0]), 'cop')}}</div></template>
    </Column>
    <Column header="Expenses">
      <template #body="{node}"><div :class="{ 'text-right': true, 'text-red-400': node.data.values[0].expenses > 0}">
        {{ $format.currency(node.data.values[0].expenses, node.data.currency || 'cop') }}
        </div></template>
      <template #footer><div :class="{ 'text-right': true, 'text-red-400': getTotal[0].expenses > 0, 'text-green-400': getTotal[0].expenses < 0}">{{ $format.currency(getTotal[0].expenses, 'cop')}}</div></template>
    </Column>
    <Column header="G/P">
      <template #body="{node}"><div :class="{ 'text-right': true, 'text-red-400': node.data.values[0].gp < 0, 'text-green-400': node.data.values[0].gp > 0}">
        {{ $format.percent( node.data.values[0].gp )}}
        </div></template>
      <template #footer><div :class="{ 'text-right': true, 'text-red-400': getTotal[0].gp < 0, 'text-green-400': getTotal[0].gp > 0}">{{ $format.percent( getTotal[0].gp ) }}</div></template>
    </Column>
    <Column header="Balance">
      <template #body="{node}">
        <div :class="{ 'text-right': true, 'text-red-400': node.data.values[0] < 0, 'text-green-400': node.data.values[0] > 0}">
        {{ $format.currency(node.data.values[0].value, node.data.currency || 'cop') }}
        </div>
        <div v-if="node.data.values[0].units" class="text-sm text-right">({{$format.number(node.data.values[0].units)}} und)</div>
      </template>
      <template #footer><div :class="{ 'text-right': true}">{{ $format.currency(getTotal[0].value, 'cop')}}</div></template>
    </Column>
  </TreeTable>
  <GChart
    v-if="displayType === 'pie'"
    :settings="{ packages: ['corechart','treemap'] }"
    type="TreeMap"
    :data="treeMap.data"
    :options="treeMap.options"
    @ready="() => onChartReady = true"
  />  
    
    <Chart type="line" :data="barData[0]" :options="{ plugins: { legend: { labels: { color: '#ffffff' } } }, scales: { x: {stacked: false}, y: {position: 'left'}, y1: {position: 'right'} }}"  v-if="displayType === 'bar'" /> 
    
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
  import AccountsSelector from '@/components/AccountsSelector.vue'
  import PeriodSelector from '@/components/PeriodSelector.vue'

  import { useStore } from 'vuex';
  import { computed, ref, onMounted } from 'vue'
  import { AccountGroupType, AccountType, Period } from '@/types';
  import { getCurrentPeriod, BACKGROUNDS_COLOR_GRAPH, increasePeriod, getPeriodDate } from '@/helpers/options.js';
  import format from '@/format';

  const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
  });

  const typeInvestment = ref('ByCategory');

  const displayType = ref('table');
  const displayOptions = [{id: 'table', icon:'pi pi-table'}, {id: 'pie', icon:'pi pi-chart-pie'}, {id:'bar', icon:'pi pi-chart-bar'}];
  const store = useStore();
  const accounts = ref([]);

  const isAuthenticated = computed(() => store.state.storage.status.authenticated);
  const onChartReady = ref(false);
  // const googleLoaded = computed(() => {
  //   console.log('check google', window.google);
  //   return (window.google && window.google.visualization);
  // });

  function getTotalByCategory( category: any, balance: any) {
      var children = undefined;
      var values = category.type === AccountType.Category ? [] : balance[category.id];
      if ( category.children ) {
        children = Object.keys(category.children).map((key) => getTotalByCategory(category.children[key], balance));
        values = children.reduce( (ant, child) => {
            if (!ant) {
              ant = Array.from(new Array(child.data.values.length), () => ({ value: 0, in: 0, out: 0, expenses: 0, in_local: 0, out_local: 0 }));
            }
            return ant.map( (v, index) => {
              if (child.data.currency!=='cop' && child.data.values[index]) {
                const conv = store.getters['values/getValue']( new Date(period.value.value.year, period.value.value.month, 1), child.data.currency, 'cop');

                return {
                  value: v.value + (child.data.values[index].value * conv),
                  in: v.in + (child.data.values[index].in * conv),
                  in_local: v.in_local + ((child.data.values[index].in_local || 0 ) * conv),
                  out: v.out + (child.data.values[index].out * conv),
                  out_local: v.out_local + ((child.data.values[index].out_local || 0 ) * conv),
                  expenses: v.expenses + (child.data.values[index].expenses * conv),
                }
              }
              return {
                value: v.value + child.data.values[index].value,
                in: v.in + child.data.values[index].in,
                in_local: v.in_local + (child.data.values[index].in_local || 0),
                out: v.out + child.data.values[index].out,
                out_local: v.out_local + (child.data.values[index].out_local || 0),
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
          name: category.entity ? `${category.entity}::${category.name}` : category.name,
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
    const val1 = byCategory.value.reduce( (ant, child) => {
      if (!ant) {
        ant = Array.from(new Array(child.data.values.length), () => ({ value: 0, in: 0, out: 0, expenses: 0}));
      }
      return ant.map( (v,index) => ({
        value: v.value + child.data.values[index].value,
        in: v.in + child.data.values[index].in,
        out: v.out + child.data.values[index].out,
        expenses: v.expenses + child.data.values[index].expenses,
      }) )
    }, undefined)

    return val1.map( (v, index) => {
      const val2 = index < val1.length - 1 ?  val1[index + 1].value : v.value;
      const div1 = v.value + v.out;
      const div2 = val2 + v.in + ( v.expenses || 0 );
      return {
        ...v,
        gp: (div2 > 0) ? (div1-div2) / div2 : 0
      }
    })
    } );

  const treeMap = computed(() => {
    const groupElements = (group: any, parent: string) => {
      const values = group.filter(g => g.data.values[0].value).map( (g: any) => {
        return g.data.currency === 'cop' ? g.data.values[0].value :  g.data.values[0].value * store.getters['values/getValue']( new Date(period.value.value.year, period.value.value.month, 1), g.data.currency, 'cop');
      });
      const total = values.reduce( (ant, g) => ant + g, 0 );

      const res = group.filter(g => g.data.values[0].value).reduce( (arr: any[], g: any, index: number) => {
        // const n = parent !== 'Total' ? `${parent}::${g.data.name}` : g.data.name;
        arr.push([g.data.name, parent, values[index], -100*  g.data.values[0].gp,
          values[index] / total,
          g.data.values[0].gp
          // g.data.values[0] - g.data.values[1] 
        ]);
        if (g.children) {
          arr.push(...groupElements(g.children, g.data.name));
        }
        return arr;
      }, [])
      return [ ['Total', null, total, 0, 1, 0], ...res];
    };

    var gdata = [['Invest', 'Parent', 'Value', 'Diff', '%', 'gp'], ['Total', null, 0, 0, 1, 0]];
    if (onChartReady.value && window.google && window.google.visualization) {
      var byValue = byCategory.value;
      if (typeInvestment.value === 'ByRisk') {
        byValue = byRisk.value;
      }
      if (typeInvestment.value === 'ByType') {
        byValue = byType.value;
      }

      gdata = window.google.visualization.arrayToDataTable(
        [['Invest', 'Parent', 'Value', 'Diff', '%', 'gp'], ...groupElements(byValue, 'Total') ]
      );
    }

    return {
      data: gdata,
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
        useWeightedAverageForAggregation: true,
        generateTooltip: (row, value, size) => {
            return '<div class="bg-blue-900 border-blue-100 p-2 border-3">' +
              '<span>' + (gdata.getValue && gdata.getValue(row, 0)) + '</span><br />' +
              '<span>' + (gdata.getValue && format.currency(gdata.getValue(row, 2), 'cop')) + '</span><br />' +
              '<span>' + (gdata.getValue && format.percent(gdata.getValue(row, 4))) + '</span><br />' +
              '<span>gp ' + (gdata.getValue && format.percent(gdata.getValue(row, 5))) + '</span><br />' +
           '</div>'
        }
      }
    }
  });

  const barData = computed(() => {
    const numPer = period.value.type === Period.Year ? 10 : period.value.type === Period.Month ? 24 : 16;
    const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, numPer, getCurrentPeriod());
    const ac = store.getters['accounts/activeAccounts'](getPeriodDate(period.value.type, getCurrentPeriod()), period.value.type);
    const acFiltered = accounts.value && accounts.value.length > 0 
      ? ac.filter( a => accounts.value.includes(a.id) )
      : ac.filter( a => AccountGroupType.Investments === store.getters['accounts/getAccountGroupType'](a.id) );

    const data =  getTotalByCategory( {
      name: 'Investments',
      children: acFiltered,
      type: AccountType.Category,
    }, balance).data.values;
    var currentPeriod = getCurrentPeriod();
    const labels = [];
    for (var i = 1 ; i < data.length + 1; i++) {
      labels.push(`${currentPeriod.year}${period.value.type === Period.Month ? '/'+currentPeriod.month: ''}${period.value.type === Period.Quarter ? '/'+currentPeriod.quarter: ''}`);
      currentPeriod = increasePeriod(period.value.type, currentPeriod, -1);
    }
    return [{
        title: 'TOTAL',
        labels: labels.reverse(),
        datasets: [{
            type: 'line',
            label: 'Value',
            yAxisID: 'y',
            backgroundColor: BACKGROUNDS_COLOR_GRAPH[0],
            borderColor: BACKGROUNDS_COLOR_GRAPH[0],
            data: data.map( d => d.value).reverse()
        }, {
            type: 'line',
            label: 'Invested',
            yAxisID: 'y',
            backgroundColor: BACKGROUNDS_COLOR_GRAPH[1],
            borderColor: BACKGROUNDS_COLOR_GRAPH[1],
            data: [...data].reverse().reduce( (ant, v) => {
                if (!ant) {
                  return [v.value]
                }
                ant.push( ant[ant.length -1 ] + v.in + (v.in_local || 0) + v.expenses - v.out - (v.out_local || 0));
                return ant;
              } , undefined)
        }, {
            type: 'bar',
            label: 'G/P',
            yAxisID: 'y1',
            backgroundColor: BACKGROUNDS_COLOR_GRAPH[4],
            data: data.map( d => 100*d.gp).reverse()
        }]
    }];
  });

  function onChangePeriod() {
    store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 1})
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
