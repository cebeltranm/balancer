<template>
<div class="trans-edit-content">
<Dialog v-model:visible="visible" :style="{width: '960px'}" :breakpoints="{'960px': '80vw', '640px': '100vw'}" header="Transaction" :modal="true" class="p-fluid" id="trans-edit-dialog">
  <form @submit.prevent.stop="handleSubmit">
  <div class="grid formgrid sm:pt-2 pt-5">
    <div class="field col col-12 md:col-3">
        <div class="p-float-label">
            <Calendar id="date" v-model="v$.date.$model" :class="{'p-invalid':v$.date.$invalid && submitted}" :showIcon="true" />
            <label for="date" :class="{'p-error':v$.date.$invalid && submitted}">Date*</label>
        </div>
        <small v-if="(v$.date.$invalid && submitted) || v$.date.$pending.$response" class="p-error">{{v$.name.required.$message.replace('Value', 'Date')}}</small>
    </div>
    <div class="field col col-12 md:col-6">
        <div class="p-float-label">
            <AutoComplete v-if="!transaction?.id" id="description" v-model="v$.description.$model" :suggestions="suggestedTransactions" @item-select="onSelectTransaction" @complete="searchTransaction($event)" field="name" />
            <InputText v-if="transaction?.id" id="description" v-model="v$.description.$model" :class="{'p-invalid':v$.description.$invalid && submitted}" :showIcon="true" />
            <label for="description" :class="{'p-error':v$.description.$invalid && submitted}">Description*</label>
        </div>
        <small v-if="(v$.description.$invalid && submitted) || v$.description.$pending.$response" class="p-error">{{v$.description.required.$message}}</small>
    </div>
    <div class="field col col-12 md:col-3">
        <div class="p-float-label">
            <AutoComplete id="tags" :multiple="true" v-model="state.tags" :suggestions="suggestedTags" @complete="searchTags($event)" />
            <label for="tags">Tags</label>
        </div>
        <!-- <small v-if="(v$.tags.$invalid && submitted) || v$.tags.$pending.$response" class="p-error">{{v$.tags.required.$message}}</small> -->
    </div>
  </div>
  <div class="grid formgrid" v-for="(item, index) in state.values" :key="index">
    <div class="field col col-12 md:col-8  pt-3">
        <div class="p-float-label">
            <AutoComplete v-model="item.account" :suggestions="suggestedAccounts" field="name" @complete="searchAccounts($event, index)" :dropdown="true" 
              :class="{'p-invalid':v$.values.$each.$response.$data[index].account.$invalid && submitted}"
              @item-select="onUpdateAccount(index)"/>
            <label :class="{'p-error':v$.values.$each.$response.$data[index].account.$invalid && submitted}">Account*</label>
        </div>
        <small v-if="submitted" v-for="error in v$.values.$each.$response.$errors[index].account" :key="error" class="p-error">{{ error.$message }}</small>
    </div>
    <div class="field col col-8 col-offset-4 md:col-4 md:col-offset-0 pt-3">
        <div class="p-float-label">
            <InputNumber v-model="item.value" mode="currency" :currency="state.values[0].account?.currency || 'COP'" :maxFractionDigits="item.account?.currency === Currency.BTC ? 10: 2" currencyDisplay="code" locale="en-US" :class="{'p-invalid':v$.values.$each.$response.$data[index].value.$invalid && submitted}"/>
            <label  v-if="index>0 && item.account && item.account?.currency !== state.values[0].account?.currency" :class="{'p-error':v$.values.$each.$response.$data[index].accountValue.$invalid && submitted}">1 {{state.values[0].account?.currency}} = {{getRate(item.value, item.accountValue)}} {{item.account?.currency}}</label>
            <label v-else :class="{'p-error':v$.values.$each.$response.$data[index].value.$invalid && submitted}">Value*</label>
        </div>
        <small v-if="submitted" v-for="error in v$.values.$each.$response.$errors[index].value" :key="error" class="p-error">{{ error.$message }}</small>
    </div>

    <div class="field col col-8 col-offset-4 md:col-4 md:col-offset-8 pt-3" v-if="index>0 && item.account && item.account?.currency !== state.values[0].account?.currency">
        <div class="p-float-label">
            <InputNumber v-model="item.accountValue" mode="currency" :currency="item.account?.currency || 'COP'" :maxFractionDigits="item.account?.currency === Currency.BTC ? 10: 2" currencyDisplay="code" locale="en-US" :class="{'p-invalid':v$.values.$each.$response.$data[index].accountValue.$invalid && submitted}"/>
            <label :class="{'p-error':v$.values.$each.$response.$data[index].accountValue.$invalid && submitted}">1 {{item.account?.currency}} = {{getRate(item.accountValue, item.value)}} {{state.values[0].account?.currency}}</label>
        </div>
        <small v-if="submitted" v-for="error in v$.values.$each.$response.$errors[index].accountValue" :key="error" class="p-error">{{ error.$message }}</small>
    </div>

    <div class="field col col-8 col-offset-4 md:col-4 md:col-offset-8 pt-3" v-if="isAccountInUnits(item.account?.id)">
        <div class="p-float-label">
            <InputNumber v-model="item.units" mode="decimal" :maxFractionDigits="10" locale="en-US" :class="{'p-invalid':v$.values.$each.$response.$data[index].units?.$invalid && submitted}"/>
            <label  :class="{'p-error':v$.values.$each.$response.$data[index].accountValue.$invalid && submitted}">1 unit = {{getRate(item.units, item.accountValue || item.value)}} {{item.account?.currency}}</label>
        </div>
        <small v-if="submitted" v-for="error in v$.values.$each.$response.$errors[index].units" :key="error" class="p-error">{{ error.$message }}</small>
    </div>

  </div>
  </form>
  <template #footer>
    <div class="flex flex-row-reverse">
        <Button label="Save" @click="handleSubmit" />
        <Button label="Cancel" @click="close" class="p-button-text" />
    </div>
  </template>
</Dialog>
</div>
</template>

<style lang="scss">
#trans-edit-dialog {
  @media (max-width: 480px) {
    height: 100%;
    max-height: 100%;
    .p-dialog-header, .p-dialog-content, .p-dialog-footer {
      padding: 5px;
    }    
  }
  input.p-inputtext {
    @media (max-width: 480px) {
      font-size: 1.2rem;
    }
  }
} 
</style>

<script lang='ts' setup>
import { ref, reactive, computed, watch, watchEffect, onMounted } from 'vue';
import { useStore } from 'vuex';
import { type Account, type Transaction, Currency } from '@/types';
import { helpers, required } from "@vuelidate/validators";
import { useVuelidate } from "@vuelidate/core";
import { toRaw } from 'vue';

const props = defineProps<{
    transaction?: Transaction,
}>()

const visible = ref(false);
const suggestedAccounts = ref<any[] | undefined>(undefined);
const suggestedTransactions = ref<any[] | undefined>(undefined);
const suggestedTags = ref<string[]>([]);
const submitted = ref(false);

const store = useStore();

const emit = defineEmits(['update:transaction'])

const state = ref({
  date: new Date(),
  description: '',
  tags: [],
  values: [ { value: null, account: null, accountValue: null, units: null }, { value: null, account: null, accountValue: null, units: null }]
});

function accountValueRequired (value:any, parent: any) {
  if (parent?.account?.id && state.value.values[0].account?.id && parent?.account?.currency !== state.value.values[0].account?.currency) {
    return !!value;
  }
  return true;
}

function unitsValueRequired (value:any, parent: any) {
  if ( isAccountInUnits(parent.account?.id) ) {
    return value === 0 || !!value;
  }
  return true;
}

function positiveExpenses (value:any, parent: any) {
  if (parent?.account?.id && store.state.accounts.accounts[parent?.account?.id]) {
    return value > 0 || store.state.accounts.accounts[parent?.account?.id].type !== 'Expense';
  }
  return true;
}

const rules = {
  date: { required },
  description: { required },
  values: {
    $each: helpers.forEach({
      account: { required },
      value: { 
        required,
        positiveExpenses: helpers.withMessage('Should be positive', positiveExpenses)  
      },
      accountValue: { 
        accountValueRequired: helpers.withMessage('value is required', accountValueRequired) 
      },
      units: { 
        accountValueRequired: helpers.withMessage('units value is required', unitsValueRequired) 
      },
    })
  }
};
const v$ = useVuelidate(rules, state);

const getRate = (value: number, account_value: number) => value && account_value ? account_value/value : '';

function isAccountInUnits(id:string) {
  return id && store.getters['accounts/isAccountInUnits'](id);
}

function show() {
  visible.value = true;
  submitted.value = false;
}

function close() {
  visible.value = false;
  submitted.value = false;
}

defineExpose({
  show, close
})

const accountList = computed(() => {
  return store.getters['accounts/activeAccounts'](state.value.date).map( a => ({
    id: a.id,
    name: store.getters['accounts/getAccountFullName'](a.id),
    currency: a.currency
  }));
})

function searchAccounts(event: any, index: number) {
  setTimeout(() => {
    const newFiltered: any[] = [];
    if (!event.query.trim().length) {
      newFiltered.push(...accountList.value)
    } else {
      newFiltered.push(...accountList.value.filter( (a:any) => a.name.toLowerCase().indexOf(event.query.toLowerCase()) >= 0))
    }
    suggestedAccounts.value = newFiltered;
  },50);
}

function searchTransaction(event: any) {
  const newFiltered: any[] = [];
  var year = new Date().getFullYear();
  var month = new Date().getMonth() + 1;
  var steps = 0;
  const query = event.query.toLowerCase();

  setTimeout(() => {
    while (newFiltered.length < 5 && steps < 6) {
      if (store.state.transactions.values[year] && store.state.transactions.values[year][month] ) {
        newFiltered.push( 
          ...store.state.transactions.values[year][month]
            .filter( (t: any) => t.description.toLowerCase().indexOf(query) >= 0 )
            .map( (t: any) => ({
              id: t.id, 
              name: t.description,
              tags: t.tags,
              values: t.values
            }))
        );
      }
      steps++;
      year = month === 1 ? year -1 : year;
      month = month === 1 ? 12 : month - 1;
    }
    suggestedTransactions.value = newFiltered;
  }, 50);
}

function searchTags(event: any) {
  const query = event.query.toLowerCase();

  const tags = [ query ];
  tags.push(...store.getters['transactions/getLastTags'].filter( t => t.toLowerCase().indexOf(query) >= 0 ))
  suggestedTags.value = tags;
}


async function onSelectTransaction(event: any) {
  state.value.values = event.value.values.map( v => ({
    account: {
      id: store.state.accounts.accounts[v.accountId].id,
      currency: store.state.accounts.accounts[v.accountId].currency,
      name: store.getters['accounts/getAccountFullName'](v.accountId),
    },
    value: v.value,
    units: v.units,
    accountValue: v.accountValue
  }))  
  state.value.description = event.value.name;
  state.value.tags = event.value.tags;
}

async function onUpdateAccount (index: number) {
  if ( state.value.values[0].account?.currency !== state.value.values[index].account?.currency 
    && state.value.values[index].value) { 
    const rate = store.getters['values/getValue']( new Date(state.value.date), state.value.values[0].account?.currency, state.value.values[index].account?.currency );
    state.value.values[index].accountValue = state.value.values[index].value * rate;
  }
}

watch(
  () => state.value.values.map((v) => ({...v})),
    (t, oldT) => {
      if (t[0].value !== oldT[0].value && t[1].value === oldT[1].value) {
        if (
          (!oldT[0].value && !oldT[1].value) ||
          (oldT[0].value === -oldT[1].value)
          ) {
          state.value.values[1].value = -t[0].value;
        }
      }
    const sum = state.value.values.reduce( (ant:any, v:any, index:number) => ant + (v.account?.id ? v.value : 0), 0);
    // const lastPos = t.length - 1;
    if (sum === 0 || Math.abs(sum) < 0.00000000001) {
      if (t.length > 2 && (!t[t.length -1].account?.id || !t[t.length -1].value) ) {
        state.value.values.pop();
      }
    } else {
      if ( t[t.length - 1].account?.id ) {
        state.value.values.push({
          account: null,
          value: -sum,
          accountValue: null
        });
      } else {
        state.value.values[t.length - 1].value = -sum;
      }
    }
  },
  { deep: true }
)

async function handleSubmit() {
  const isFormCorrect = await v$.value.$validate()
  submitted.value = true;

  if (!isFormCorrect) {
      return;
  }

  if (props.transaction?.id) {
    store.dispatch('transactions/deleteTransaction', toRaw(props.transaction));
  }

  const trans = {
    ...props.transaction,
    id: Date.now(),
    date: state.value.date.toISOString().split('T')[0],
    description: state.value.description,
    tags: state.value.tags && state.value.tags.length > 0 && [...state.value.tags],
    values: state.value.values.map( v => ({
      accountId: v.account.id,
      value: v.value,
      units: v.units,
      accountValue: v.account.currency !== state.value.values[0].account.currency ? v.accountValue : v.value
    }))
  }
  await store.dispatch('transactions/saveTransaction', trans);
  close();
  emit('update:transaction', trans);
  state.value.values = [ { value: null, account: null, accountValue: null, units: null }, { value: null, account: null, accountValue: null, units: null }];
  state.value.description = '';
  state.value.tags = [];
}

function updatePropTransaction() {
  if (props.transaction) {
    state.value.date = new Date(`${props.transaction.date}T00:00:00.00`);
    state.value.description = props.transaction.description;
    state.value.tags = props.transaction.tags || [];
    state.value.values = props.transaction.values.map( v => ({
      account: {
        id: store.state.accounts.accounts[v.accountId].id,
        currency: store.state.accounts.accounts[v.accountId].currency,
        name: store.getters['accounts/getAccountFullName'](v.accountId),
      },
      value: v.value,
      units: v.units,
      accountValue: v.accountValue
    }))
  }
}

watch(() => props.transaction, () => {
  updatePropTransaction();
}, {deep: true})

onMounted( () => {
  if (props.transaction) {
    updatePropTransaction();
  }
} )

</script>
