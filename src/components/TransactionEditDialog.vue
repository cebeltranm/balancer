<template>
<div class="trans-edit-content">
<Dialog v-model:visible="visible" :style="{width: '960px'}" :breakpoints="{'960px': '80vw', '640px': '100vw'}" header="Transaction" :modal="true" id="trans-edit-dialog">
  <Form v-slot="$form" @submit="handleSubmit" :initialValues="state" ref="form" :validateOnSubmit="true">
    <Fluid>
    <div class="grid formgrid sm:pt-2 pt-5">
      <div class="field col col-12 md:col-3 mb-0 pt-5">
        <FloatLabel>
          <DatePicker name="date" :showIcon="true" v-model="state.date" :invalid="formErrors?.date?._errors?.length > 0"/>
          <label for="date">Date</label>
        </FloatLabel>
        <Message v-if="formErrors?.date?._errors?.length > 0" severity="error" size="small" variant="simple">{{ formErrors.date._errors[0] }}</Message>
      </div>
      <div class="field col col-12 md:col-6 mb-0 pt-5">
        <FloatLabel>
          <AutoComplete v-if="!transaction?.id" name="description" v-model="state.description" 
            :suggestions="suggestedTransactions" @item-select="onSelectTransaction" @complete="searchTransaction($event)" optionLabel="name" 
            :invalid="formErrors?.description?._errors?.length > 0"/>
          <InputText v-else name="description" :showIcon="true"/>
          <label class="text-sm" for="description">Description</label>
        </FloatLabel>
        <Message v-if="formErrors?.description?._errors?.length > 0" severity="error" size="small" variant="simple">{{ formErrors.description._errors[0] }}</Message>
      </div>
      <div class="field col col-12 md:col-3  mb-0 pt-5">
        <FloatLabel>
            <AutoComplete id="tags" :multiple="true" v-model="state.tags" :suggestions="suggestedTags" @complete="searchTags($event)" 
            :invalid="formErrors?.tags?._errors?.length > 0"/>
            <label for="tags">tags</label>
        </FloatLabel>
        <Message v-if="formErrors?.tags?._errors?.length > 0" severity="error" size="small" variant="simple">{{ formErrors.tags._errors[0] }}</Message>
      </div>
    </div>
    <div class="grid formgrid" v-for="(item, index) in state.values" :key="index">
      <div class="field col col-12 md:col-8  mb-0 pt-5">
        <FloatLabel>
          <AutoComplete placeholder="Account" v-model="item.account" :suggestions="suggestedAccounts" optionLabel="name" @complete="searchAccounts($event, index)" :dropdown="true" 
              @item-select="onUpdateAccount(index)"
              :name="`values[${index}].account`" 
              :invalid="formErrors?.values?.[index]?.account?._errors?.length > 0"
              />
              <label for="account">Account</label>
            </FloatLabel>
            <Message v-if="formErrors?.values?.[index]?.account?._errors?.length > 0" 
              severity="error" size="small" variant="simple">{{ formErrors.values[index].account._errors[0] }}</Message>
      </div>
      <div class="field col col-8 col-offset-4 md:col-4 md:col-offset-0 pt-5 mb-0">
        <FloatLabel>
          <InputNumber v-model="item.value" mode="currency" :currency="state.values[0].account?.currency || 'COP'" :maxFractionDigits="item.account?.currency === Currency.BTC ? 10: 2" 
              currencyDisplay="code" locale="en-US" :name="`values[${index}].value`"
              :invalid="formErrors?.values?.[index]?.value?._errors?.length > 0"/>
          <label class="text-sm" v-if="index>0 && item.account && item.account?.currency !== state.values[0].account?.currency">1 {{state.values[0].account?.currency}} = {{getRate(item.value, item.accountValue)}} {{item.account?.currency}}</label>
          <label class="text-sm" v-else >Value*</label>
        </FloatLabel>
        <Message v-if="formErrors?.values?.[index]?.value?._errors?.length > 0" 
              severity="error" size="small" variant="simple">{{ formErrors.values[index].value._errors[0] }}</Message>
      </div>
      <div class="field col col-8 col-offset-4 md:col-4 md:col-offset-8 pt-5 mb-0" v-if="index>0 && item.account && item.account?.currency !== state.values[0].account?.currency">
        <FloatLabel>
            <InputNumber v-model="item.accountValue" mode="currency" :currency="item.account?.currency || 'COP'" :maxFractionDigits="item.account?.currency === Currency.BTC ? 10: 2" currencyDisplay="code" locale="en-US"
            :name="`values[${index}].accountValue`"/>
            <label>1 {{item.account?.currency}} = {{getRate(item.accountValue, item.value)}} {{state.values[0].account?.currency}}</label>
        </FloatLabel>
        <!-- <small v-if="submitted" v-for="error in v$.values.$each.$response.$errors[index].accountValue" :key="error" class="p-error">{{ error.$message }}</small> -->
      </div>
      <div class="field col col-8 col-offset-4 md:col-4 md:col-offset-8 pt-5 mb-0" v-if="isAccountInUnits(item.account?.id)">
        <FloatLabel>
            <InputNumber v-model="item.units" mode="decimal" :maxFractionDigits="10" locale="en-US" :name="`values[${index}].units`"
              :invalid="formErrors?.values?.[index]?.units?._errors?.length > 0"/>
            <label>1 unit = {{getRate(item.units, item.accountValue || item.value)}} {{item.account?.currency}}</label>
        </FloatLabel>
        <Message v-if="formErrors?.values?.[index]?.units?._errors?.length > 0" 
              severity="error" size="small" variant="simple">{{ formErrors.values[index].units._errors[0] }}</Message>
      </div>

    </div>
  </Fluid>
  </Form>
  <template #footer>
    <div class="flex flex-row-reverse">
        <Button label="Save" @click="() => form.submit()" />
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
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { z } from 'zod';
import { useStore } from 'vuex';
import { type Account, type Transaction, Currency } from '@/types';
// import { helpers, required } from "@vuelidate/validators";
// import { useVuelidate } from "@vuelidate/core";
import { toRaw } from 'vue';

const props = defineProps<{
    transaction?: Transaction,
}>()

const visible = ref(false);
const form = ref();
const suggestedAccounts = ref<any[] | undefined>(undefined);
const suggestedTransactions = ref<any[] | undefined>(undefined);
const suggestedTags = ref<string[]>([]);
// used to fix https://github.com/primefaces/primevue/issues/6924
const formErrors = ref({});
const submitted = ref(false);

const store = useStore();

const emit = defineEmits(['update:transaction'])

const state = ref({
  date: new Date(),
  description: '',
  tags: [],
  values: [ { value: null, account: null, accountValue: null, units: null }, { value: null, account: null, accountValue: null, units: null }]
});

const zodSchema = z.object({
    date: z.date({
      required_error: "Please select a date and time",
      invalid_type_error: "That's not a date!"
    }).max(new Date(), { message: "Can not add future transaction" }),
    description: z.string().min(5),
    tags: z.boolean().or(z.string().array().optional()),
    values: z.array(z.object({
      account: z.object({
        id: z.string(),
        currency: z.string(),
        name: z.string()
      }),
      value: z.number({required_error: "Value is required", invalid_type_error: "Value is required"}),
      accountValue: z.number().optional().nullable(),
      units: z.number().optional().nullable()
    }).refine((data) =>  !(data.account?.id && store.state.accounts.accounts[data?.account?.id]?.type === 'Expense' && data.value <= 0), {
        message: 'Should be positive for expenses',
        path: ["value"],
    }).refine((data) =>  {
      return !(isAccountInUnits(data.account?.id) && !data.units && data.units !== 0 )
    }, {
        message: 'units value is required',
        path: ["units"],
    })
  ).refine( (values) => {
    const sum = values.reduce( (ant:any, v:any) => ant + (v.account?.id ? v.value : 0), 0);
    return Math.abs(sum) < 0.00000000001;
  }, { message: "Sum of values should be 0" })
});

// const resolver = zodResolver( zodSchema );


const getRate = (value: number, account_value: number) => value && account_value ? account_value/value : '';

function isAccountInUnits(id:string) {
  return id && store.getters['accounts/isAccountInUnits'](id);
}

function show() {
  visible.value = true;
  submitted.value = false;
  formErrors.value = {};
}

function close() {
  visible.value = false;
  submitted.value = false;
  formErrors.value = {};
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

function validate() {
  const result = zodSchema.safeParse(state.value);
  if (!result.success) {
    formErrors.value = result.error.format();
  } else {
    formErrors.value = {};
  }
  return result.success;
}
watch(
  state.value,
  () => submitted.value && validate(),
  { deep: true }  
);

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

async function handleSubmit(event) {
  submitted.value = true;
  if (!validate()) {
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
  submitted.value = false;
  formErrors.value = {};
  updatePropTransaction();
}, {deep: true})

onMounted( () => {
  if (props.transaction) {
    submitted.value = false;
    formErrors.value = {};
    updatePropTransaction();
  }
} )

</script>
