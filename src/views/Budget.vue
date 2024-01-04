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
          {{format.currency(getTotal(null, null), CURRENCY)}}
         </template>
    </Column>
    <Column v-for="m of months" :key="m" :header="format.month(m)" class="text-right p-0" style="width:150px">
        <template #body="{ data }">
            <div class="text-right m-2 p-1 p-overlay-badge" @contextmenu="onShowContextMenu($event, data, m)">
                {{format.currency( data.type === AccountType.Category ? getTotal(data, m) : data[m], data.currency)}}
                <Badge v-if="data.type !== AccountType.Category && comments && comments[data.id] && comments[data.id][m]" class="ml-auto" :value="comments[data.id][m]?.length" @click.stop.prevent="editComments($event, data, m)" />
            </div>
        </template>
        <template #editor="{ data }">
            <InputNumber v-if="data.type !== AccountType.Category" v-model="data[m]" mode="currency" :currency="data.currency || CURRENCY" currencyDisplay="code" locale="en-US" @contextmenu="onShowContextMenu($event, data, m)" autofocus/>
        </template>
         <template #footer>
          {{format.currency(getTotal(null, m), CURRENCY)}}
         </template>
    </Column>
  </DataTable>
  <ContextMenu ref="contextMenu" :model="contextMenuItems">
    <template #item="{ item, props }">
        <a v-ripple class="flex align-items-center" v-bind="props.action">
            <span :class="item.icon" />
            <span class="ml-2">{{ item.label }}</span>
            <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
            <span v-if="item.shortcut" class="ml-auto border-1 surface-border border-round surface-100 text-xs p-1">{{ item.shortcut }}</span>
            <i v-if="item.items" class="pi pi-angle-right ml-auto text-primary"></i>
        </a>
    </template>
    </ContextMenu>
    <CommentsDialog ref="commentDialog" @update:modelValue="addComments($event)"></CommentsDialog>
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
import CommentsDialog from '@/components/CommentsDialog.vue'
import { getCurrentPeriod, getPeriodDate, rowPendingSyncClass } from '@/helpers/options';
import { AccountGroupType, AccountType, Currency, Period } from '@/types';
import { onMounted, watch, ref, inject } from 'vue';
import { useStore } from 'vuex';
import { EVENTS, FORM_WITH_PENDING_EVENTS } from '@/helpers/events';
import format from '@/format';
import { isDesktop } from '@/helpers/browser';

import type { Ref } from 'vue';
import { computed } from 'vue';

const CURRENCY: Ref | undefined = inject('CURRENCY');

const contextMenu = ref();
const commentDialog = ref();

  const period = ref({
    type: Period.Year,
    value: getCurrentPeriod()
  });

  const store = useStore();
  const values: Ref<any> = ref([]);
  const comments: Ref<any> = ref({});
  const pendingToSave = ref(false);
  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const selecteMenuData : Ref<any> = ref(null);

  const contextMenuItems = [
    {
        label: 'Apply next',
        icon: 'pi pi-play',
        command: () => {
            for (var i = 1 + Number(selecteMenuData.value.month); i < 13; i++) {
                selecteMenuData.value.data[i] = selecteMenuData.value.data[selecteMenuData.value.month];    
            }
        }
    },
    {
        label: 'Remove',
        icon: 'pi pi-delete-left',
        command: () => {
            selecteMenuData.value.data[selecteMenuData.value.month] = undefined;
        }
        // shortcut: '⌘+D'
    },
    {
        label: 'Add Comment',
        icon: 'pi pi-plus-circle',
        // shortcut: '⌘+A',
        badge: 0,
        command: () => {
            commentDialog.value.show((comments.value && selecteMenuData.value && selecteMenuData.value.data && comments.value[selecteMenuData.value.data.id] && comments.value[selecteMenuData.value.data.id][selecteMenuData.value.month]) || []);
        }
    },
    ];

  watch( () => store.state.budget.budget[period.value.value.year], () => recalculateValues(), {deep: true})


  async function recalculateValues() {
    pendingToSave.value = false;
    EVENTS.emit(FORM_WITH_PENDING_EVENTS, false);

    const date = getPeriodDate(period.value.type, period.value.value);
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
    var res: any = [];
    if (accounts[AccountGroupType.Expenses]) {
      res = Object.keys( accounts[AccountGroupType.Expenses] ).reduce( (ant: any, a) => {
        const account = accounts[AccountGroupType.Expenses][a];
        if (account.type === AccountType.Category) {
            ant.push({
                type: AccountType.Category,
                name: a,
                currency: CURRENCY.value
            });
            ant.push(...getByCategory(a, '', account.children));
        }
        return ant;
      }, [])
    }
    values.value = res;
    comments.value = await store.dispatch('budget/getBudgetCommentsForYear', {year: period.value.value.year});
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
        const date = getPeriodDate(period.value.type, period.value.value);
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
        return store.getters['values/joinValues'](date, (data && data.currency) || CURRENCY?.value, totals);
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
            }, {}),
            comments: comments.value
        });
    }

    const onShowContextMenu = (event: any, data: any, m: any) => {
        selecteMenuData.value = {month: m, data};
        if (data && data.type === AccountType.Expense) {
            contextMenu.value.show(event);
        }
    };
    const editComments = (event: any, data: any, m: any) => {
        selecteMenuData.value = {month: m, data};
        if (data && data.type === AccountType.Expense) {
            commentDialog.value.show((comments.value && selecteMenuData.value && selecteMenuData.value.data && comments.value[selecteMenuData.value.data.id] && comments.value[selecteMenuData.value.data.id][selecteMenuData.value.month]) || []);
        }
    };
    function addComments(comment: any) {
        if (comment) {
            if (comment.length> 0) {
                if (!comments.value) {
                    comments.value = {};
                }
                if (!comments.value[selecteMenuData.value.data.id]) {
                    comments.value[selecteMenuData.value.data.id] = {};
                }
                comments.value[selecteMenuData.value.data.id][selecteMenuData.value.month] = comment;
            } else if (comments.value[selecteMenuData.value.data.id] && comments.value[selecteMenuData.value.data.id][selecteMenuData.value.month]) {
                delete comments.value[selecteMenuData.value.data.id][selecteMenuData.value.month];
            }
            selecteMenuData.value.data.to_sync = true
            pendingToSave.value = true;
        }
    }
</script>