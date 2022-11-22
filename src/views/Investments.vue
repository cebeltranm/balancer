<template>
  <Toolbar>
    <template #start>
      <PeriodSelector v-model:period="period" @update:period="onChangePeriod" :only-type="!['table', 'pie'].includes(displayType)" />
      <Dropdown v-model="typeInvestment" :options="['ByCategory', 'ByType', 'ByRisk', 'ByCurrency']" placeholder="Select a Period" class="pt-1 pb-1 ml-1 mr-1 w-12rem text-center" panelClass="z-5" v-if="displayType === 'pie'"/>
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
  <div class="investments" v-if="displayType === 'table'" >
  <TreeTable :value="byCategory"
    responsiveLayout="scroll"
    scrollDirection="both"
    :resizableColumns="true" columnResizeMode="fit" showGridlines
    :scrollable="true"
    >
    <Column field="name" header="Name" footer="Total" :expander="true" :style="`width:${isDesktop() ? 350 : 250}px; z-index:1;`" :frozen="isDesktop()">
      <template #body="{node}">
        <div class="flex flex-row flex-wrap" >
          <div class="align-items-center justify-content-center mr-2" v-if="!node.data.isCategory">
            <Avatar v-if="node.data.logo" :image="node.data.logo" :size="isDesktop() ? 'large' : 'small'" />
            <div v-else class="w-3rem h-3rem">&nbsp;</div>
            <!-- <Avatar v-else :label="node.data.name[0]" /> -->
          </div>
          <div class="align-items-center justify-content-center">
            <span>{{node.data.name}}</span> <br />
            <span v-if="node.data.code" class="text-xs"><a :href="'https://finance.yahoo.com/quote/' + node.data.code" target="_blank">({{node.data.code}})</a></span>
          </div>
        </div>
      </template>
    </Column>
    <Column header="In/Out" style="width:200px">
      <template #body="{node}"><div 
        :class="{ 'text-right': true, 'w-full': true, 'text-red-400': getInOut(node.data.values[0], node.data.isCategory) < 0, 'text-green-400': getInOut(node.data.values[0], node.data.isCategory) > 0}" 
        v-tooltip.bottom="'IN: '+ $format.currency(node.data.values[0].in, node.data.currency || CURRENCY)+
            '\nOUT: '+$format.currency(node.data.values[0].out, node.data.currency || CURRENCY) +
            '\nLOCAL IN: '+$format.currency(node.data.values[0].in_local, node.data.currency || CURRENCY) +
            '\nLOCAL OUT: '+$format.currency(node.data.values[0].out_local, node.data.currency || CURRENCY)">
        {{ $format.currency(getInOut(node.data.values[0], node.data.isCategory), node.data.currency || CURRENCY) }}
        </div></template>
      <template #footer><div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': getInOut(getTotal[0]) < 0, 'text-green-400': getInOut(getTotal[0]) > 0}">{{ $format.currency(getInOut(getTotal[0]), CURRENCY)}}</div></template>
    </Column>
    <Column header="Expenses"  style="width:150px">
      <template #body="{node}"><div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': node.data.values[0].expenses > 0}">
        {{ $format.currency(node.data.values[0].expenses, node.data.currency || CURRENCY) }}
        </div></template>
      <template #footer><div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': getTotal[0].expenses > 0, 'text-green-400': getTotal[0].expenses < 0}" v-if="getTotal && getTotal.length > 0">{{ $format.currency(getTotal[0].expenses, CURRENCY)}}</div></template>
    </Column>
    <Column header="G/P"  style="width:100px">
      <template #body="{node}"><div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': node.data.values[0].gp < 0, 'text-green-400': node.data.values[0].gp > 0}">
        {{ $format.percent( node.data.values[0].gp )}}
        </div></template>
      <template #footer><div :class="{ 'text-right': true, 'w-full': true, 'text-red-400': getTotal[0].gp < 0, 'text-green-400': getTotal[0].gp > 0}" v-if="getTotal && getTotal.length > 0">{{ $format.percent( getTotal[0].gp ) }}</div></template>
    </Column>
    <Column header="Balance"  style="width:200px">
      <template #body="{node}">
        <div class="w-full text-right">
          <div>
        {{ $format.currency(node.data.values[0].value, node.data.currency || CURRENCY) }}
        </div>
        <div v-if="node.data.values[0].units" class="text-sm">({{$format.number(node.data.values[0].units)}} und)</div>
        </div>
      </template>
      <template #footer><div :class="{ 'text-right': true, 'w-full': true}" v-if="getTotal && getTotal.length > 0">{{ $format.currency(getTotal[0].value, CURRENCY)}}</div></template>
    </Column> 
  </TreeTable>
  </div>
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

<style lang="scss" scoped>
  .investments {
      height: calc(100vh - 14rem);
  }
  :deep( .p-column-header-content ) {
    width: 100%;
  }
  @media (max-width: 600px) {
    .investments {
      height: calc(100vh - 11rem);
    }
  }
</style>

<script lang="ts" setup>
  import AccountsSelector from '@/components/AccountsSelector.vue'
  import PeriodSelector from '@/components/PeriodSelector.vue'

  import { useStore } from 'vuex';
  import { computed, ref, onMounted, inject } from 'vue'
  import { AccountGroupType, AccountType, Period } from '@/types';
  import { getCurrentPeriod, BACKGROUNDS_COLOR_GRAPH, increasePeriod, getPeriodDate } from '@/helpers/options.js';
  import format from '@/format';
  import { isDesktop } from '@/helpers/browser';
  
  import type { Ref } from 'vue';

  const CURRENCY: Ref | undefined = inject('CURRENCY');

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
              if (child.data.currency!==CURRENCY.value && child.data.values[index]) {
                const conv = store.getters['values/getValue']( 
                  getPeriodDate(period.value.type, index > 0 
                    ? increasePeriod( period.value.type, period.value.value, -index) 
                    : period.value.value),
                  child.data.currency,
                  CURRENCY.value);

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
        values[i].gp = (div2 ) ? ( (div1 || 0 ) - div2) / div2 : 0; 
      }
      return { 
        key: category.type === AccountType.Category ? category.name : category.id,
        data: {
          name: category.entity && displayType.value !== 'table' ? category.yahoo_symbol || category.name : category.name,
          fullName: category.entity && displayType.value !== 'table' ? `${category.entity}::${category.name}` : category.name,
          code: category.yahoo_symbol,
          logo: category.logo,
          values: values,
          currency: category.currency || CURRENCY.value,
          isCategory: category.type === AccountType.Category,
        },
        children
      };
  }

  const byCategory = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 2, period.value.value);
      const inv = store.getters['accounts/accountsGroupByCategories']([AccountGroupType.Investments], getPeriodDate(period.value.type, period.value.value), period.value.type);
      const data =  inv?.Investments && Object.keys(inv.Investments).map( (key) => getTotalByCategory( inv.Investments[key], balance));
      return data || [];
  });

  const byType = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 2, period.value.value);
      const inv = store.getters['accounts/accountsGroupByType']([AccountGroupType.Investments], getPeriodDate(period.value.type, period.value.value), period.value.type);
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
      const inv = store.getters['accounts/investmentsGroupByRisk']( getPeriodDate(period.value.type, period.value.value), period.value.type);
      const data =  inv && Object.keys(inv).map( (key) => getTotalByCategory( 
        {
          type: AccountType.Category,
          name: key,
          children: inv[key]
        }, balance));
      return data || [];
  });

  const byCurrency = computed(() => {
      const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, 2, period.value.value);
      const inv = store.getters['accounts/investmentsGroupByCurrency']( getPeriodDate(period.value.type, period.value.value), period.value.type);
      const data =  inv && Object.keys(inv).map( (key) => getTotalByCategory( 
        {
          type: AccountType.Category,
          name: key,
          children: inv[key]
        }, balance));
      return data || [];
  });

  function getInOut(val: any, isCategory?: boolean){
    if (isCategory) {
      return val ? val.in - val.out: 0;
    }
    return val ? val.in + (val.in_local || 0) - val.out -  (val.out_local || 0) : 0
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

    return val1 ? val1.map( (v, index) => {
      const val2 = index < val1.length - 1 ?  val1[index + 1].value : v.value;
      const div1 = v.value + v.out;
      const div2 = val2 + v.in + ( v.expenses || 0 );
      return {
        ...v,
        gp: (div2 > 0) ? (div1-div2) / div2 : 0
      }
    }) : []
  } );

  const treeMap = computed(() => {
    const groupElements = (group: any, parent: string, parentArr: any[]) => {
      const values = group.filter(g => g.data.values[0].value).map( (g: any) => {
        return g.data.currency === CURRENCY.value ? g.data.values[0].value :  g.data.values[0].value * store.getters['values/getValue']( getPeriodDate(period.value.type, period.value.value), g.data.currency, CURRENCY.value);
      });
      const total = values.reduce( (ant, g) => ant + g, 0 );
      const res = group.filter(g => g.data.values[0].value).reduce( (arr: any[], g: any, index: number) => {
        // const n = parent !== 'Total' ? `${parent}::${g.data.name}` : g.data.name;
        var n = g.data.name;
        const childsByName = arr.filter( ch => ch[0] === n );
        if (childsByName.length > 0) {
          n = `${n} ${childsByName.length + 1}`;
        }
        arr.push([
          n,
          parent, 
          values[index], -100*  
          g.data.values[0].gp,
          values[index] / total,
          g.data.values[0].gp,
          g.data.fullName
        ]);
        if (g.children) {
          groupElements(g.children, n, arr)
        }
        return arr;
      }, parentArr)
      return [ ['Total', null, total, 0, 1, 0, ''], ...res];
    };
    var gdata = [['Invest', 'Parent', 'Value', 'Diff', '%', 'gp', 'fullName'], ['Total', null, 0, 0, 1, 0, 'Total']];
    if (onChartReady.value && window.google && window.google.visualization) {
      var byValue = byCategory.value;
      if (typeInvestment.value === 'ByRisk') {
        byValue = byRisk.value;
      }
      if (typeInvestment.value === 'ByType') {
        byValue = byType.value;
      }
      if (typeInvestment.value === 'ByCurrency') {
        byValue = byCurrency.value;
      }

      var dataTable = groupElements(byValue, 'Total', []);
      const min = Math.min(...dataTable.map( t => t[3])) || -1;
      const max = Math.max(...dataTable.map( t => t[3])) || 1;
      dataTable = dataTable.map( (t, index) =>  [
          t[0], t[1], t[2], 
          t[3] < 0 ? - 100 * t[3]/min : 100 * t[3]/max, 
          t[4], t[5], t[6]
        ]);

      gdata = window.google.visualization.arrayToDataTable(
        [['Invest', 'Parent', 'Value', 'Diff', '%', 'gp', 'fullName'], ...dataTable ]
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
              '<span>' + (gdata.getValue && gdata.getValue(row, 6)) + '</span><br />' +
              '<span>' + (gdata.getValue && format.currency(gdata.getValue(row, 2), CURRENCY.value)) + '</span><br />' +
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
            data: data.map( d => d.value || 0).reverse()
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
                ant.push( Math.max(ant[ant.length -1 ] + v.in + (v.in_local || 0) + v.expenses - v.out - (v.out_local || 0), 0) || 0);
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
      for (var i = 0; i <= 10; i ++) {
        store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - i})
        store.dispatch('values/getValuesForYear', {year: period.value.value.year - i})
      }
    }
  }
</script>
