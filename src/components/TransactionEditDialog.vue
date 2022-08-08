<template>
<Dialog v-model:visible="visible" :style="{width: '960px'}" :breakpoints="{'960px': '75vw', '640px': '90vw'}" header="Transaction" :modal="true" class="p-fluid">
  <form @submit.prevent.stop="handleSubmit">
  <div class="grid formgrid pt-5">
    <div class="field col col-12 md:col-4">
        <div class="p-float-label">
            <Calendar id="date" v-model="v$.date.$model" :class="{'p-invalid':v$.date.$invalid && submitted}" :showIcon="true" />
            <label for="date" :class="{'p-error':v$.date.$invalid && submitted}">Date*</label>
        </div>
        <small v-if="(v$.date.$invalid && submitted) || v$.date.$pending.$response" class="p-error">{{v$.name.required.$message.replace('Value', 'Date')}}</small>
    </div>
    <div class="field col col-12 md:col-8">
        <div class="p-float-label">
            <InputText id="description" v-model="v$.description.$model" :class="{'p-invalid':v$.description.$invalid && submitted}" :showIcon="true" />
            <label for="date" :class="{'p-error':v$.description.$invalid && submitted}">Description*</label>
        </div>
        <small v-if="(v$.description.$invalid && submitted) || v$.description.$pending.$response" class="p-error">{{v$.description.required.$message}}</small>
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
            <InputNumber v-model="item.value" mode="currency" :currency="state.values[0].account?.currency || 'COP'" currencyDisplay="code" locale="en-US" :class="{'p-invalid':v$.values.$each.$response.$data[index].value.$invalid && submitted}"/>
            <label  v-if="index>0 && item.account && item.account?.currency !== state.values[0].account?.currency" :class="{'p-error':v$.values.$each.$response.$data[index].accountValue.$invalid && submitted}">1 {{state.values[0].account?.currency}} = {{getRate(item.value, item.accountValue)}} {{item.account?.currency}}</label>
            <label v-else :class="{'p-error':v$.values.$each.$response.$data[index].value.$invalid && submitted}">Value*</label>
        </div>
        <small v-if="submitted" v-for="error in v$.values.$each.$response.$errors[index].value" :key="error" class="p-error">{{ error.$message }}</small>
    </div>
    <div class="field col col-8 col-offset-4 md:col-4 md:col-offset-8 pt-3" v-if="index>0 && item.account && item.account?.currency !== state.values[0].account?.currency">
        <div class="p-float-label">
            <InputNumber v-model="item.accountValue" mode="currency" :currency="item.account?.currency || 'COP'" currencyDisplay="code" locale="en-US" :class="{'p-invalid':v$.values.$each.$response.$data[index].accountValue.$invalid && submitted}"/>
            <label :class="{'p-error':v$.values.$each.$response.$data[index].accountValue.$invalid && submitted}">1 {{item.account?.currency}} = {{getRate(item.accountValue, item.value)}} {{state.values[0].account?.currency}}</label>
        </div>
        <small v-if="submitted" v-for="error in v$.values.$each.$response.$errors[index].accountValue" :key="error" class="p-error">{{ error.$message }}</small>
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
</template>

<style scoped>
.transaction > div {
  padding-top: 0px;
  padding-bottom: 0px;
}
</style>

<script lang='ts' setup>
import { ref, reactive, computed, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import type { Transaction } from '@/types';
import { helpers, required } from "@vuelidate/validators";
import { useVuelidate } from "@vuelidate/core";


const visible = ref(false);
const suggestedAccounts = ref<any[] | undefined>(undefined);
const submitted = ref(false);

const store = useStore();

const state = ref({
  date: new Date(),
  description: '',
  values: [ { value: null, account: null, accountValue: null }, { value: null, account: null, accountValue: null }]
});

function accountValueRequired (value:any, parent: any) {
  if (parent?.account?.id && state.value.values[0].account?.id && parent?.account?.currency !== state.value.values[0].account?.currency) {
    return !!value;
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
    })
  }
};
const v$ = useVuelidate(rules, state);

const getRate = (value: number, account_value: number) => value && account_value ? value/account_value : '';

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

function searchAccounts(event: any, index: number) {
  setTimeout(() => {
    const newFiltered: any[] = [];
    if (!event.query.trim().length) {
      newFiltered.push(...store.getters['accounts/listAccounts'])
      if (index>0) {
        newFiltered.push(...store.getters['accounts/listExpenses'])
      }
    } else {
      newFiltered.push(...store.getters['accounts/listAccounts'].filter( (a:any) => a.name.toLowerCase().indexOf(event.query.toLowerCase()) >= 0))
      if (index>0) {
        newFiltered.push(...store.getters['accounts/listExpenses'].filter( (a:any) => a.name.toLowerCase().indexOf(event.query.toLowerCase()) >= 0))
      }
    }
    suggestedAccounts.value = newFiltered;
  },50);
}

async function onUpdateAccount (index: number) {
  if ( state.value.values[0].account?.currency !== state.value.values[index].account?.currency 
    && state.value.values[index].value) { 
    const rate = await store.dispatch('values/getValue', {
        date: new Date(state.value.date), 
        asset: state.value.values[index].account?.currency,
        currency:state.value.values[0].account?.currency
        });
    state.value.values[index].accountValue = state.value.values[index].value * rate;
  }
}

watch(
  () => state.value.values,
    (t, oldT) => {
    const sum = t.reduce( (ant:any, v:any, index:number) => ant + (v.account?.id ? v.value : 0), 0);
    const lastPos = t.length - 1;
    if (sum == 0) {
      if (t.length > 2 && (!t[t.length -1].account?.id || !t[t.length -1].value) ) {
        state.value.values.pop();
      }
    } else {
      if ( t[t.length - 1].account?.id ) {
        state.value.values.push({
          account: null,
          value: -sum
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

  const trans = {
    id: Date.now(),
    date: state.value.date.toISOString().split('T')[0],
    description: state.value.description,
    values: state.value.values.map( v => ({
      accountId: v.account.id,
      value: v.value,
      accountValue: v.account.currency !== state.value.values[0].account.currency ? v.accountValue : v.value
    }))
  }
  await store.dispatch('transactions/saveTransaction', trans);
  close();
}

</script>
