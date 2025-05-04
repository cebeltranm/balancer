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
    :resizableColumns="true" columnResizeMode="fit" showGridlines
    :rowClass="getRowClass"
    responsiveLayout="scroll" 
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
                    {{format.currency(data.values[index], CURRENCY)}}
                </div>
            </template>
            <template #footer><div class="text-right" style="width: 100%">{{ $format.currency(total[index], CURRENCY)}}</div></template>
        </Column>
        <Column header="&nabla; %" style="width:80px" v-if="index > 0">
            <template #body="{ data }">
                <div class="text-right"  style="width: 100%">
                {{data.values[0] && Math.abs( data.values[index]/data.values[0]) < 100 ? format.percent((data.values[0] - data.values[index])/data.values[index]) : ''}}
                </div>
            </template>
            <template #footer><div class="text-right" style="width: 100%">{{ $format.percent( (total[0] - total[index])/ total[index])}}</div></template>
        </Column>
    </template>
    </DataTable>
    </div>
  </template>
</template>

<style scoped>
    .balance {
        height: calc(100vh - 130px);
    }
    @media (max-width: 600px) {
    .balance {
      height: calc(100vh - 11rem);
    }
  }

</style>

<script lang="ts" setup>
import PeriodSelector from '@/components/PeriodSelector.vue'
import format from '@/format';
import { getCurrentPeriod, periodLabel, increasePeriod, rowPendingSyncClass } from '@/helpers/options';
import { AccountGroupType, AccountType, Period } from '@/types';
import { computed, onMounted, ref, inject } from 'vue';
import { useStore } from 'vuex';

import type { Ref } from 'vue';

const CURRENCY: Ref | undefined = inject('CURRENCY');

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
    // const date = new Date( period.value.value.year, period.value.value.month -1, 2 );
    var totPer = period.value.type === Period.Month ? 13 : 5;
    var totConsPer = period.value.type === Period.Month ? 3 : 5;
    var per: any[]  =  Array.from(new Array(totConsPer), (val, index) => ({period: increasePeriod(period.value.type, period.value.value, -index)}));

    if (period.value.type === Period.Month) {
        per.push( { period: {year: period.value.value.year - 1, month: period.value.value.month}, position: 12 }  );
    }

    var per = per.map( (p, index) => {
        const date = new Date( 
                p.period.year, 
                period.value.type === Period.Year ? ( p.period.year < new Date().getFullYear() ? 11 : new Date().getMonth() -1 ) : 
                period.value.type === Period.Quarter ? ( p.period.quarter * 3 ) : p.period.month - 1,
                2 );
        return {
            ...p,
            position: p.position || index,
            date: date.getTime() > Date.now() ? new Date() : date
        }
    });



    periodTitles.value = per.map( (p) => periodLabel(period.value.type, p.period));

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
            name: "Accounts Receivable",
            group: AccountGroupType.AccountsReceivable
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
                            if (account.currency !== CURRENCY?.value) {
                                all[account.type].values[i] += (balance[a][ per[i].position ].value * store.getters['values/getValue']( per[i].date, account.currency, CURRENCY?.value))  
                            } else {
                                all[account.type].values[i] += balance[a][ per[i].position ].value;
                            }
                        }
                    }
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