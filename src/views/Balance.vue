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
    <div class="balance">
    <DataTable :value="values" 
    showGridlines
    :rowClass="getRowClass"
    :scrollable="true"
    scrollDirection="both"
    scrollHeight="flex"
    >
    <Column header="Type" style="width:200px" footer="Net Worth" frozen>
         <template #body="{ data }"> {{ [AccountType.Category, 'Type'].includes(data.type) ? 'Total ':'' }} {{ data.name }} </template>
    </Column>
    <template v-for="(title, index) in periodTitles" :key="`${title}-${index}`">
        <Column :header="title" style="width:180px">
            <template #body="{ data }">
                <div class="text-right" style="width: 100%">
                    {{format.currency(data.values[index], 'cop')}}
                </div>
            </template>
            <template #footer><div class="text-right" style="width: 100%">{{ $format.currency(total[index], 'cop')}}</div></template>
        </Column>
        <Column header="%" style="width:80px" v-if="index > 0">
            <template #body="{ data }">
                <div class="text-right"  style="width: 100%">
                {{data.values[index - 1] && Math.abs( data.values[index]/data.values[index - 1]) < 100 ? format.percent(1 - data.values[index]/data.values[index - 1]) : ''}}
                </div>
            </template>
            <template #footer><div class="text-right" style="width: 100%">{{ $format.percent(1 - total[index] / total[index - 1])}}</div></template>
        </Column>
    </template>
    </DataTable>
    </div>
  </template>
</template>

<style scoped>
    .balance {
        height: 70vh;
    }
</style>

<script lang="ts" setup>
import PeriodSelector from '@/components/PeriodSelector.vue'
import format from '@/format';
import { getCurrentPeriod, rowPendingSyncClass } from '@/helpers/options';
import { AccountGroupType, AccountType, Period } from '@/types';
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

const period = ref({
    type: Period.Month,
    value: getCurrentPeriod()
});
const displayType = ref('table');
const displayOptions = [{id: 'table', icon:'pi pi-table'}, {id: 'pie', icon:'pi pi-chart-pie'}, {id:'bar', icon:'pi pi-chart-bar'}];
const values = ref([]);
const total = ref([]);

const isAuthenticated = computed(() => store.state.storage.status.authenticated);
const periodTitles = ref(['Period1', 'Period2', 'Period3', 'Period4'])

function getRowClass(data: any) {
    return data.type === AccountType.Category ? 'bg-blue-900': data.type === 'Type' ? 'bg-red-900' : null;
}

async function onChangePeriod() {
    await Promise.all([
        store.dispatch('balance/getBalanceForYear', {year: period.value.value.year}),
        store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 1}),
        store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 2}),
        store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 3}),
        store.dispatch('balance/getBalanceForYear', {year: period.value.value.year - 4}),
    ])
    recalculateValues();
}

async function recalculateValues() {
    const date = new Date( period.value.value.year, period.value.value.month -1, 2 );
    var per: any[]  = [{ period: period.value.value }];
    var totPer = 3;
    switch(period.value.type) {
        case Period.Month:
            if (period.value.value.month === 1) {
                per.push( { period: { year: period.value.value.year -1, month: 12 } } );
            } else {
                per.push( { period: { year: period.value.value.year, month: period.value.value.month - 1 } } );
            }
            per.push( { period: {year: period.value.value.year - 1, month: period.value.value.month}, position: 12 }  );
            totPer = 13;
            break;
        case Period.Quarter:
            if (period.value.value.quarter === 1) {
                per.push( { period: { year: period.value.value.year - 1, quarter: 4 } } );
            } else {
                per.push( { period: {year: period.value.value.year, quarter: period.value.value.quarter - 1} } );
            }
            per.push( { period: {year: period.value.value.year - 1, quarter: period.value.value.quarter}, position: 4 } );
            totPer = 5;
            break;
        case Period.Year:
            per.push( { period: {year: period.value.value.year - 1} } );
            per.push( { period: {year: period.value.value.year - 2} } );
    }
    var per = per.map( (p, index) => {
        return {
            ...p,
            position: p.position || index,
            date: new Date( 
                p.period.year, 
                period.value.type === Period.Year ? ( p.period.year < new Date().getFullYear() ? 11 : new Date().getMonth() -1 ) : 
                period.value.type === Period.Quarter ? ( p.period.quarter * 3 ) : p.period.month - 1,
                2 )
        }
    });

    periodTitles.value = per.map( (p) => {
        return `${p.period.year}` + (
            period.value.type === Period.Month ? ` / ${format.month(p.period.month)}` : 
            period.value.type === Period.Quarter ? ` / Q${p.period.quarter}` : '')
    } );

    const balance = store.getters['balance/getBalanceGroupedByPeriods'](period.value.type, totPer, period.value.value);
    values.value = [{
        type: "Type",
        name: "Assets",
        groups: [{
            type: AccountType.Category,
            name: "Cash",
            group: AccountGroupType.Assets
        }, {
            type: AccountType.Category,
            name: "Receivables",
            group: AccountGroupType.Receivables
        }, {
            type: AccountType.Category,
            name: "Investments",
            group: AccountGroupType.Investments
        }, {
            type: AccountType.Category,
            name: "FixedAssets",
            group: AccountGroupType.FixedAssets
        }]
    }, {
        type: "Type",
        name: "Liabilities",
        groups: [{
            type: AccountType.Category,
            name: "Liabilities",
            group: AccountGroupType.Liabilities
        }]
    }]    
    .reduce( (ant, t) => {
        const total = t.groups.reduce( (ant2, t2) => {
            const groups = Object.keys( balance )
                .filter( a => store.getters['accounts/getAccountGroupType'](a) === t2.group )
                .reduce( (all: any, a) => {
                    const account = store.state.accounts.accounts[a];
                    if (!all[account.type]) {
                        all[account.type] = {
                            type: account.type,
                            values: Array.from(new Array(per.length), () => 0)
                        }
                    }
                    for (var i = 0; i < per.length; i++) {
                        if (balance[a][ per[i].position ]) {
                            if (account.currency !== 'cop') {
                                all[account.type].values[i] += (balance[a][ per[i].position ].value * store.getters['values/getValue']( per[i].date, account.currency, 'cop'))  
                            } else {
                                all[account.type].values[i] += balance[a][ per[i].position ].value;
                            }
                        }
                    }
                    // console.log(balance[a]);
                    return all;
                }, {} );
            ant2.push(...Object.keys(groups).map( (key) => ({...groups[key], name: key}) ) );
            ant2.push({
                ...t2,
                values: Object.keys(groups).reduce( (v, key) => {
                    return v.map( (v1, index) => v1 + groups[key].values[index] )
                }, Array.from(new Array(per.length), () => 0) )
            })
            return ant2;
        }, [] );
        ant.push(...total);
        ant.push({
            ...t,
            values: total.filter( (g:any) => g.type === AccountType.Category).reduce( (v: any[], group: any) => {
                    return v.map( (v1, index) => v1 + group.values[index] )
                }, Array.from(new Array(per.length), () => 0) )
        })
        
        return ant;
    }, []);
    total.value = values.value.filter( (g:any) => g.type === 'Type').reduce( (v: any[], group: any) => {
                    return v.map( (v1, index) => v1 + group.values[index] )
        }, Array.from(new Array(per.length), () => 0) )
}

onMounted(() => {
    onChangePeriod();
})

</script>