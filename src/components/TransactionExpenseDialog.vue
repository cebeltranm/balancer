<template>
  <Dialog
    v-model:visible="visible"
    :style="{ width: 'min(32rem, 96vw)' }"
    header="New expense"
    :modal="true"
  >
    <div class="grid">
      <div class="col-12 md:col-5">
        <label class="block mb-2 font-medium" for="expense-date">Date</label>
        <DatePicker
          id="expense-date"
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

      <div class="col-12 md:col-7">
        <label class="block mb-2 font-medium" for="expense-description">
          Description
        </label>
        <AutoComplete
          id="expense-description"
          v-model="state.description"
          :suggestions="suggestedTransactions"
          optionLabel="name"
          class="w-full"
          placeholder="Enter description"
          @complete="searchTransaction"
          @item-select="onSelectTransaction"
        />
        <small class="p-error" v-if="formErrors.description">
          {{ formErrors.description }}
        </small>
      </div>

      <div class="col-12">
        <label class="block mb-2 font-medium" for="expense-account">
          Expense
        </label>
        <Select
          id="expense-account"
          v-model="state.expenseAccountId"
          :options="expenseOptions"
          optionLabel="name"
          optionValue="id"
          class="w-full"
          filter
          placeholder="Select expense"
        />
        <small class="p-error" v-if="formErrors.expenseAccountId">
          {{ formErrors.expenseAccountId }}
        </small>
        <div
          v-if="expenseBudgetSummary"
          class="text-sm text-color-secondary mt-2"
        >
          {{ expenseBudgetSummary }}
        </div>
      </div>

      <div class="col-12">
        <label class="block mb-2 font-medium" for="asset-account">
          Payment account
        </label>
        <Select
          id="asset-account"
          v-model="state.assetAccountId"
          :options="assetOptions"
          optionLabel="name"
          optionValue="id"
          class="w-full"
          filter
          placeholder="Select payment account"
        />
        <small class="p-error" v-if="formErrors.assetAccountId">
          {{ formErrors.assetAccountId }}
        </small>
      </div>

      <div :class="valueFieldClass">
        <label class="block mb-2 font-medium" for="expense-value">Value</label>
        <div class="flex gap-2 align-items-start">
          <Select
            v-if="showCurrencySelector"
            v-model="state.valueCurrency"
            :options="valueCurrencyOptions"
            class="w-8rem"
          />
          <InputNumber
            id="expense-value"
            v-model="state.value"
            mode="currency"
            :currency="inputCurrency"
            currencyDisplay="code"
            locale="en-US"
            class="w-full"
            :maxFractionDigits="2"
            placeholder="Enter value"
          />
        </div>
        <small class="p-error" v-if="formErrors.value">
          {{ formErrors.value }}
        </small>
        <small class="p-error" v-if="formErrors.valueCurrency">
          {{ formErrors.valueCurrency }}
        </small>
        <small class="p-error" v-if="formErrors.exchangeRate">
          {{ formErrors.exchangeRate }}
        </small>
        <div
          v-if="showConvertedPreview"
          class="text-sm text-color-secondary mt-2"
        >
          Preview:
          {{ formatCurrencyPreview(convertedPreviewValue, previewCurrency) }}
        </div>
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
import { AccountGroupType, AccountType, type Transaction } from "@/types";
import { formatLocalDate, isFutureLocalDate } from "@/helpers/date";
import { useAccountsStore } from "@/stores/accounts";
import { useBalanceStore } from "@/stores/balance";
import { useBudgetStore } from "@/stores/budget";
import { useTransactionsStore } from "@/stores/transactions";
import { useValuesStore } from "@/stores/values";
import {
  PAYMENT_ACCOUNT_TYPES,
  buildAccountOptions,
  collectRecentTransactions,
  flattenFieldErrors,
  formatExpenseAccountName,
} from "@/helpers/transactionForms";

interface FormState {
  date: Date;
  description: string;
  expenseAccountId: string;
  assetAccountId: string;
  value: number | null;
  valueCurrency: string;
}

const accountsStore = useAccountsStore();
const balanceStore = useBalanceStore();
const budgetStore = useBudgetStore();
const transactionsStore = useTransactionsStore();
const valuesStore = useValuesStore();

const visible = ref(false);
const suggestedTransactions = ref<
  {
    id?: number;
    name: string;
    expenseAccountId: string;
    paymentAccountId: string;
    value: number;
  }[]
>([]);
const state = reactive<FormState>({
  date: new Date(),
  description: "",
  expenseAccountId: "",
  assetAccountId: "",
  value: null,
  valueCurrency: "",
});

const formErrors = ref<Record<string, string>>({});

const expenseOptions = computed(() =>
  buildAccountOptions(accountsStore, state.date, {
    groupTypes: [AccountGroupType.Expenses],
    nameFormatter: formatExpenseAccountName,
  }),
);

const assetOptions = computed(() =>
  buildAccountOptions(accountsStore, state.date, {
    groupTypes: [
      AccountGroupType.Assets,
      AccountGroupType.AccountsReceivable,
      AccountGroupType.Liabilities,
    ],
    allowedTypes: PAYMENT_ACCOUNT_TYPES,
  }),
);

const expenseAccount = computed(() =>
  state.expenseAccountId
    ? accountsStore.accounts[state.expenseAccountId]
    : null,
);
const assetAccount = computed(() =>
  state.assetAccountId ? accountsStore.accounts[state.assetAccountId] : null,
);
const expenseCurrency = computed(() => expenseAccount.value?.currency || "COP");
const paymentCurrency = computed(() => assetAccount.value?.currency || "COP");
const showCurrencySelector = computed(
  () =>
    !!expenseAccount.value &&
    !!assetAccount.value &&
    expenseAccount.value.currency !== assetAccount.value.currency,
);
const inputCurrency = computed(
  () => state.valueCurrency || expenseAccount.value?.currency || "COP",
);
const valueCurrencyOptions = computed(() => {
  if (!showCurrencySelector.value) {
    return [];
  }
  return [expenseCurrency.value, paymentCurrency.value];
});
const exchangeRate = computed(() => {
  if (!expenseAccount.value || !assetAccount.value) {
    return 0;
  }
  if (expenseAccount.value.currency === assetAccount.value.currency) {
    return 1;
  }
  return valuesStore.getValue(
    state.date,
    expenseAccount.value.currency,
    assetAccount.value.currency,
  );
});
const expenseEntryValue = computed(() => {
  if (!state.value || !expenseAccount.value || !assetAccount.value) {
    return null;
  }
  if (expenseCurrency.value === paymentCurrency.value) {
    return state.value;
  }
  if (inputCurrency.value === expenseCurrency.value) {
    return state.value;
  }
  return exchangeRate.value > 0 ? state.value / exchangeRate.value : null;
});
const paymentAccountValue = computed(() => {
  if (!state.value || !expenseAccount.value || !assetAccount.value) {
    return null;
  }
  if (expenseCurrency.value === paymentCurrency.value) {
    return state.value;
  }
  if (inputCurrency.value === paymentCurrency.value) {
    return state.value;
  }
  return exchangeRate.value > 0 ? state.value * exchangeRate.value : null;
});
const convertedPreviewValue = computed(() => {
  if (!showCurrencySelector.value || !state.value) {
    return null;
  }
  return inputCurrency.value === expenseCurrency.value
    ? paymentAccountValue.value
    : expenseEntryValue.value;
});
const previewCurrency = computed(() =>
  inputCurrency.value === expenseCurrency.value
    ? paymentCurrency.value
    : expenseCurrency.value,
);
const showConvertedPreview = computed(() => {
  return showCurrencySelector.value && convertedPreviewValue.value !== null;
});
const valueFieldClass = computed(() =>
  showCurrencySelector.value ? "col-12 md:col-8" : "col-12 md:col-12",
);
const currentYear = computed(() => state.date.getFullYear());
const currentMonth = computed(() => state.date.getMonth() + 1);
const expenseBudgetValue = computed(() => {
  if (!state.expenseAccountId) {
    return 0;
  }
  return (
    budgetStore.budget[currentYear.value]?.[state.expenseAccountId]?.[
      currentMonth.value
    ] || 0
  );
});
const expenseSpentValue = computed(() => {
  if (!state.expenseAccountId) {
    return 0;
  }
  return (
    balanceStore.balance[currentYear.value]?.[state.expenseAccountId]?.[
      currentMonth.value
    ]?.value || 0
  );
});
const expenseBudgetSummary = computed(() => {
  if (!expenseAccount.value || !expenseBudgetValue.value) {
    return "";
  }

  const remaining = expenseBudgetValue.value - expenseSpentValue.value;
  const usedPercentage = expenseBudgetValue.value
    ? expenseSpentValue.value / expenseBudgetValue.value
    : 0;

  return `Remaining budget: ${formatCurrencyPreview(remaining, expenseAccount.value.currency)} (${new Intl.NumberFormat(
    "en-US",
    {
      style: "percent",
      maximumFractionDigits: 1,
    },
  ).format(usedPercentage)} used this month)`;
});

function isSimpleExpenseTransaction(transaction: Transaction) {
  if (!transaction.values || transaction.values.length !== 2) {
    return false;
  }

  const expenseValue = transaction.values.find((value) => {
    const account = accountsStore.accounts[value.accountId];
    return account?.type === AccountType.Expense;
  });
  const paymentValue = transaction.values.find((value) => {
    const account = accountsStore.accounts[value.accountId];
    return account && PAYMENT_ACCOUNT_TYPES.includes(account.type);
  });

  return !!expenseValue && !!paymentValue;
}

function searchTransaction(event: { query: string }) {
  setTimeout(() => {
    suggestedTransactions.value = collectRecentTransactions(
      transactionsStore.transactions,
      event.query,
      (transaction) => {
        if (!isSimpleExpenseTransaction(transaction)) {
          return null;
        }

        const expenseValue = transaction.values.find((value) => {
          const account = accountsStore.accounts[value.accountId];
          return account?.type === AccountType.Expense;
        });
        const paymentValue = transaction.values.find((value) => {
          const account = accountsStore.accounts[value.accountId];
          return account && PAYMENT_ACCOUNT_TYPES.includes(account.type);
        });

        if (!expenseValue || !paymentValue) {
          return null;
        }

        return {
          id: transaction.id,
          name: transaction.description,
          expenseAccountId: expenseValue.accountId,
          paymentAccountId: paymentValue.accountId,
          value: Math.abs(expenseValue.value || 0),
        };
      },
    ) as {
      id?: number;
      name: string;
      expenseAccountId: string;
      paymentAccountId: string;
      value: number;
    }[];
  }, 50);
}

const schema = z
  .object({
    date: z.date().refine((date) => !isFutureLocalDate(date), {
      message: "Can not add future transaction",
    }),
    description: z.string().min(1, "Description is required"),
    expenseAccountId: z.string().min(1, "Expense is required"),
    assetAccountId: z.string().min(1, "Payment account is required"),
    value: z.number().positive("Value should be positive"),
    valueCurrency: z.string().optional(),
  })
  .refine((data) => data.expenseAccountId !== data.assetAccountId, {
    message: "Expense and payment account should be different accounts",
    path: ["assetAccountId"],
  })
  .superRefine((data, ctx) => {
    const expense = accountsStore.accounts[data.expenseAccountId];
    const asset = accountsStore.accounts[data.assetAccountId];
    if (!expense || !asset || !data.value) {
      return;
    }

    if (expense.currency !== asset.currency) {
      if (![expense.currency, asset.currency].includes(data.valueCurrency)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Currency is required",
          path: ["valueCurrency"],
        });
      }
      const rate = valuesStore.getValue(
        data.date,
        expense.currency,
        asset.currency,
      );
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
  state.description = "";
  state.expenseAccountId = "";
  state.assetAccountId = "";
  state.value = null;
  state.valueCurrency = "";
  formErrors.value = {};
}

function onSelectTransaction(event: {
  value: {
    name: string;
    expenseAccountId: string;
    paymentAccountId: string;
    value: number;
  };
}) {
  state.description = event.value.name;
  state.expenseAccountId = event.value.expenseAccountId;
  state.assetAccountId = event.value.paymentAccountId;
  state.value = event.value.value;
  state.valueCurrency =
    accountsStore.accounts[event.value.expenseAccountId]?.currency || "";
}

function show() {
  resetState();
  visible.value = true;
  void loadYearData(currentYear.value);
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

function formatCurrencyPreview(value: number | null, currency: string) {
  if (typeof value !== "number" || !currency) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

async function loadYearData(year: number) {
  await Promise.all([
    balanceStore.loadBalanceForYear(year, false),
    budgetStore.loadBudgetForYear(year, false),
  ]);
}

watch(
  [expenseCurrency, paymentCurrency, showCurrencySelector],
  () => {
    if (!showCurrencySelector.value) {
      state.valueCurrency = expenseCurrency.value;
      return;
    }

    if (
      ![expenseCurrency.value, paymentCurrency.value].includes(
        state.valueCurrency,
      )
    ) {
      state.valueCurrency = expenseCurrency.value;
    }
  },
  { immediate: true },
);

watch(
  () => state.date.getFullYear(),
  (year) => {
    void loadYearData(year);
  },
  { immediate: true },
);

async function handleSubmit() {
  if (
    !validate() ||
    !expenseAccount.value ||
    !assetAccount.value ||
    !state.value
  ) {
    return;
  }

  const transaction: Transaction = {
    id: Date.now(),
    date: formatLocalDate(state.date),
    description: state.description,
    values: [
      {
        accountId: expenseAccount.value.id,
        value: expenseEntryValue.value || 0,
        accountValue: expenseEntryValue.value || 0,
      },
      {
        accountId: assetAccount.value.id,
        value: -(expenseEntryValue.value || 0),
        accountValue: -(paymentAccountValue.value || 0),
      },
    ],
  };

  await transactionsStore.saveTransaction(transaction);
  close();
  resetState();
}

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
