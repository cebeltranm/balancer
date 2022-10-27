<template>
  <Toolbar>
    <template #start>
        <PeriodSelector v-model:period="period" @update:period="onChangePeriod" :only-period="true" />
    </template>
    <template #end>
        <Button label="Save" @click="save" :disabled="!pendingToSave" />
    </template>
  </Toolbar>
  <div class="expenses">
  <DataTable :value="values" 
    @cell-edit-complete="onValueEdit"
    showGridlines
    editMode="cell"
    :rowClass="getRowClass"
    :scrollable="true"
    scrollDirection="both"
    scrollHeight="flex"
    >
    <Column header="Expense" style="width:200px" footer="Total" frozen>
         <template #body="{ data }">
          {{ data.type !== AccountType.Category ? "&nbsp;>&nbsp;&nbsp;" : "" }} {{ data.name }}
         </template>
    </Column>
    <Column header="Total" style="width:150px" :frozen="isDesktop()">
         <template #body="{ data }">
          {{format.currency(getTotal(data, null), data.currency)}}
         </template>
         <template #footer>
          {{format.currency(getTotal(null, null), 'cop')}}
         </template>
    </Column>
    <Column v-for="m of months" :key="m" :header="format.month(m)" class="text-right" style="width:150px">
        <template #body="{ data }">
            <div class="text-right">
                {{format.currency( data.type === AccountType.Category ? getTotal(data, m) : data[m], data.currency)}}
            </div>
        </template>
        <template #editor="{ data }">
            <InputNumber v-if="data.type !== AccountType.Category" v-model="data[m]" mode="currency" :currency="data.currency || Currency.COP" currencyDisplay="code" locale="en-US" autofocus/>
        </template>
         <template #footer>
          {{format.currency(getTotal(null, m), 'cop')}}
         </template>
    </Column>
  </DataTable>
  </div>
</template>

<style scoped>
.expenses {
    height: calc(100vh - 14rem);
}
@media (max-width: 600px) {
    .expenses {
      height: calc(100vh - 11rem);
    }
  }

</style>

<script lang="ts" setup>
import PeriodSelector from '@/components/PeriodSelector.vue'
import { getCurrentPeriod, rowPendingSyncClass } from '@/helpers/options';
import { AccountGroupType, AccountType, Currency, Period } from '@/types';
import { computed, onMounted, watch, ref } from 'vue';
import { useStore } from 'vuex';
import { EVENTS, FORM_WITH_PENDING_EVENTS } from '@/helpers/events';
import format from '@/format';
import { isDesktop } from '@/helpers/browser';

  const period = ref({
    type: Period.Year,
    value: getCurrentPeriod()
  });

  const store = useStore();
  const values = ref([]);
  const pendingToSave = ref(false);
  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  watch( () => store.state.budget.budget[period.value.value.year], () => recalculateValues(), {deep: true})

  async function recalculateValues() {
    pendingToSave.value = false;
    EVENTS.emit(FORM_WITH_PENDING_EVENTS, false);

    const date = new Date( period.value.value.year, period.value.value.month -1, 2 );
    const budget = await store.dispatch('budget/getBudgetForYear', {year: period.value.value.year})
    
    const getByCategory = (category: string, sub: string, accounts: any) => {
        return Object.keys(accounts).reduce( (ant: any[], a) => {
            const account = accounts[a];
            if (account.type === AccountType.Category) {
                ant.push(...getByCategory( category, `${account.name} / `, account.children ));
            } else {
                ant.push({
                    type: account.type,
                    name: `${sub}${account.name}`,
                    id: account.id,
                    currency: account.currency,
                    category,
                    ...months.reduce( (ant, m) => {
                        ant[m] = (budget && budget[account.id] && budget[account.id][m]) || null;
                        return ant;
                    }, {} )
                });
            }
            return ant;
        }, []);
    }

    const accounts = store.getters['accounts/accountsGroupByCategories']([AccountGroupType.Expenses], date)
    var res = [];
    if (accounts[AccountGroupType.Expenses]) {
      res = Object.keys( accounts[AccountGroupType.Expenses] ).reduce( (ant, a) => {
        const account = accounts[AccountGroupType.Expenses][a];
        if (account.type === AccountType.Category) {
            ant.push({
                type: AccountType.Category,
                name: a,
                currency: Currency.COP
            });
            ant.push(...getByCategory(a, '', account.children));
        }
        return ant;
      }, [])
    }
    values.value = res;
  }

  function onChangePeriod() {
    recalculateValues();
  }

  onMounted(()=>{
    recalculateValues();
  })

  function onValueEdit(event: any) {
        let { data, newData } = event;
        months.forEach(m => {
        const newValue = Number(newData[m]); 
            if ( newValue >= 0 && newValue !== data[m] ) {
                data[m] = newValue
                data.to_sync = true
                pendingToSave.value = true;
                EVENTS.emit(FORM_WITH_PENDING_EVENTS, true);
            }
        })
    }
    function getTotal(data, month) {
        if (data && data.type !== AccountType.Category && !month) {
            return months.reduce( (ant, m) => ant + data[m], 0 );
        }

        const opts = month ? [month] : months;
        const date = new Date( period.value.value.year, period.value.value.month -1, 1 );
        var vfiltered = values.value.filter( v => v.type !==  AccountType.Category )

        if (data && data.type === AccountType.Category) {
            vfiltered = vfiltered.filter( v => v.category === data.name)
        }

        const totals = vfiltered.reduce( (ant, v) => {
                ant.push(...Object.keys(v)
                    .filter( m => opts.includes(m) && v[m] )
                    .map( m => ({value: v[m], asset: v.currency })))
                return ant;
            }, []);
        return store.getters['values/joinValues'](date, (data && data.currency) || 'cop', totals);
    }

    function getRowClass(data: any) {
        return data.type === AccountType.Category ? 'bg-blue-900': rowPendingSyncClass(data)
    }

    async function save() {
        await store.dispatch('budget/setBudgetForYear',  { 
            year: period.value.value.year, 
            values: values.value.reduce( (ant: any, v:any) => {
                if (v.type !== AccountType.Category) {
                    ant[v.id] = months.reduce( (ant2, m) => {
                        ant2[m] = v[m];
                        return ant2;
                    }, {} );
                }
                return ant;
            }, {})
        });
    }
</script>