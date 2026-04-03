<template>
  <Dialog
    v-model:visible="visible"
    :style="{ width: 'min(32rem, 96vw)' }"
    header="New transfer"
    :modal="true"
  >
    <div class="grid">
      <div class="col-12 md:col-5">
        <label class="block mb-2 font-medium" for="transfer-date">Date</label>
        <DatePicker
          id="transfer-date"
          v-model="state.date"
          class="w-full"
          dateFormat="yy-mm-dd"
          showIcon
          fluid
        />
        <small class="p-error" v-if="formErrors.date">
          {{ formErrors.date }}
        </small>
      </div>

      <div class="col-12">
        <label class="block mb-2 font-medium" for="transfer-from">From</label>
        <Select
          id="transfer-from"
          v-model="state.fromAccountId"
          :options="transferAccountOptions"
          optionLabel="name"
          optionValue="id"
          class="w-full"
          filter
          placeholder="Select source account"
        />
        <small class="p-error" v-if="formErrors.fromAccountId">
          {{ formErrors.fromAccountId }}
        </small>
      </div>

      <div class="col-12">
        <label class="block mb-2 font-medium" for="transfer-to">To</label>
        <Select
          id="transfer-to"
          v-model="state.toAccountId"
          :options="transferAccountOptions"
          optionLabel="name"
          optionValue="id"
          class="w-full"
          filter
          placeholder="Select destination account"
        />
        <small class="p-error" v-if="formErrors.toAccountId">
          {{ formErrors.toAccountId }}
        </small>
      </div>

      <div :class="valueFieldClass">
        <label class="block mb-2 font-medium" for="transfer-value">
          Value
        </label>
        <InputNumber
          id="transfer-value"
          v-model="state.value"
          mode="currency"
          :currency="fromCurrency"
          currencyDisplay="code"
          locale="en-US"
          class="w-full"
          :maxFractionDigits="2"
          placeholder="Enter value"
        />
        <small class="p-error" v-if="formErrors.value">
          {{ formErrors.value }}
        </small>
      </div>

      <div v-if="showTargetValueField" :class="valueFieldClass">
        <label class="block mb-2 font-medium" for="transfer-target-value">
          {{ toCurrency.toUpperCase() }} value
        </label>
        <InputNumber
          id="transfer-target-value"
          v-model="state.targetValue"
          mode="currency"
          :currency="toCurrency"
          currencyDisplay="code"
          locale="en-US"
          class="w-full"
          :maxFractionDigits="2"
          placeholder="Enter converted value"
        />
        <small class="p-error" v-if="formErrors.targetValue">
          {{ formErrors.targetValue }}
        </small>
        <small class="p-error" v-if="formErrors.exchangeRate">
          {{ formErrors.exchangeRate }}
        </small>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-row-reverse">
        <Button label="Save" @click="handleSubmit" />
        <Button label="Cancel" class="p-button-text" @click="close" />
      </div>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from "vue";
import { z } from "zod";
import type { Transaction } from "@/types";
import { formatLocalDate, isFutureLocalDate } from "@/helpers/date";
import { useAccountsStore } from "@/stores/accounts";
import { useTransactionsStore } from "@/stores/transactions";
import { useValuesStore } from "@/stores/values";
import {
  PAYMENT_ACCOUNT_TYPES,
  buildAccountOptions,
  flattenFieldErrors,
} from "@/helpers/transactionForms";

interface FormState {
  date: Date;
  fromAccountId: string;
  toAccountId: string;
  value: number | null;
  targetValue: number | null;
}

const accountsStore = useAccountsStore();
const transactionsStore = useTransactionsStore();
const valuesStore = useValuesStore();

const visible = ref(false);
const formErrors = ref<Record<string, string>>({});
const targetValueTouched = ref(false);
const state = reactive<FormState>({
  date: new Date(),
  fromAccountId: "",
  toAccountId: "",
  value: null,
  targetValue: null,
});

const transferAccountOptions = computed(() =>
  buildAccountOptions(accountsStore, state.date, {
    allowedTypes: PAYMENT_ACCOUNT_TYPES,
  }),
);

const fromAccount = computed(() =>
  state.fromAccountId ? accountsStore.accounts[state.fromAccountId] : null,
);
const toAccount = computed(() =>
  state.toAccountId ? accountsStore.accounts[state.toAccountId] : null,
);
const fromCurrency = computed(() => fromAccount.value?.currency || "COP");
const toCurrency = computed(() => toAccount.value?.currency || "COP");
const showTargetValueField = computed(
  () =>
    !!fromAccount.value &&
    !!toAccount.value &&
    fromAccount.value.currency !== toAccount.value.currency,
);
const currentExchangeRate = computed(() => {
  if (!showTargetValueField.value) {
    return 1;
  }
  return valuesStore.getValue(state.date, fromCurrency.value, toCurrency.value);
});
const valueFieldClass = computed(() =>
  showTargetValueField.value ? "col-12 md:col-6" : "col-12",
);

const schema = z
  .object({
    date: z.date().refine((date) => !isFutureLocalDate(date), {
      message: "Can not add future transaction",
    }),
    fromAccountId: z.string().min(1, "From account is required"),
    toAccountId: z.string().min(1, "To account is required"),
    value: z.number().positive("Value should be positive"),
    targetValue: z.number().nullable().optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "From and to accounts should be different",
    path: ["toAccountId"],
  })
  .superRefine((data, ctx) => {
    const from = accountsStore.accounts[data.fromAccountId];
    const to = accountsStore.accounts[data.toAccountId];

    if (!from || !to || !data.value) {
      return;
    }

    if (from.currency !== to.currency) {
      if (!data.targetValue || data.targetValue <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Second currency value is required",
          path: ["targetValue"],
        });
      }

      const rate = valuesStore.getValue(data.date, from.currency, to.currency);
      if (rate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No exchange rate available for these accounts",
          path: ["exchangeRate"],
        });
      }
    }
  });

function resetState() {
  state.date = new Date();
  state.fromAccountId = "";
  state.toAccountId = "";
  state.value = null;
  state.targetValue = null;
  targetValueTouched.value = false;
  formErrors.value = {};
}

function show() {
  resetState();
  visible.value = true;
}

function close() {
  visible.value = false;
  formErrors.value = {};
}

function validate() {
  const result = schema.safeParse(state);
  if (result.success) {
    formErrors.value = {};
    return true;
  }

  formErrors.value = flattenFieldErrors(result.error);
  return false;
}

async function handleSubmit() {
  if (!validate() || !fromAccount.value || !toAccount.value || !state.value) {
    return;
  }

  const targetValue = showTargetValueField.value
    ? (state.targetValue ?? 0)
    : state.value;

  const transaction: Transaction = {
    id: Date.now(),
    date: formatLocalDate(state.date),
    description: `Transfer ${fromAccount.value.name} -> ${toAccount.value.name}`,
    values: [
      {
        accountId: fromAccount.value.id,
        value: -state.value,
        accountValue: -state.value,
      },
      {
        accountId: toAccount.value.id,
        value: state.value,
        accountValue: targetValue,
      },
    ],
  };

  await transactionsStore.saveTransaction(transaction);
  close();
  resetState();
}

watch(
  () => ({
    date: state.date,
    fromAccountId: state.fromAccountId,
    toAccountId: state.toAccountId,
    value: state.value,
  }),
  () => {
    if (!showTargetValueField.value) {
      state.targetValue = state.value;
      targetValueTouched.value = false;
      return;
    }

    if (!targetValueTouched.value) {
      state.targetValue =
        state.value && currentExchangeRate.value > 0
          ? state.value * currentExchangeRate.value
          : null;
    }
  },
  { deep: true },
);

watch(
  () => state.targetValue,
  (value) => {
    if (!showTargetValueField.value) {
      return;
    }

    if (
      value !== null &&
      state.value !== null &&
      currentExchangeRate.value > 0 &&
      Math.abs(value - state.value * currentExchangeRate.value) > 0.0000001
    ) {
      targetValueTouched.value = true;
    }
  },
);

watch(
  () => ({ ...state }),
  () => {
    if (Object.keys(formErrors.value).length > 0) {
      validate();
    }
  },
  { deep: true },
);

defineExpose({
  show,
  close,
});
</script>
