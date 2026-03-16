<template>
  <div class="accounts-view">
    <Toolbar class="mb-3">
      <template #start>
        <Select
          v-model="selectedGroupFilter"
          :options="groupFilterOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full md:w-18rem"
          aria-label="Account group filter"
        />
      </template>
      <template #end>
        <SelectButton
          v-model="selectedVisibility"
          :options="visibilityOptions"
          optionLabel="label"
          optionValue="value"
          aria-label="Account visibility"
        />
        <Button
          label="New account"
          icon="pi pi-plus"
          class="ml-2"
          @click="openCreateDialog"
        />
      </template>
    </Toolbar>

    <DataTable
      :value="filteredRows"
      responsiveLayout="scroll"
      showGridlines
      class="p-datatable-sm"
      sortMode="single"
    >
      <Column field="name" header="Name" sortable>
        <template #body="{ data }">
          <div class="font-medium">{{ data.name }}</div>
          <div class="text-sm text-color-secondary">{{ data.id }}</div>
        </template>
      </Column>
      <Column field="type" header="Type" sortable />
      <Column field="currency" header="Currency" sortable />
      <Column field="entity" header="Entity" sortable>
        <template #body="{ data }">
          {{ data.entity || "-" }}
        </template>
      </Column>
      <Column field="categoryLabel" header="Category" sortable>
        <template #body="{ data }">
          {{ data.categoryLabel || "-" }}
        </template>
      </Column>
      <Column header="Actions" style="width: 12rem">
        <template #body="{ data }">
          <div class="flex gap-2 justify-content-end">
            <Button
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              outlined
              @click="openEditDialog(data)"
            />
            <Button
              v-if="isAccountActive(data)"
              icon="pi pi-eye-slash"
              size="small"
              severity="warn"
              outlined
              @click="hideAccount(data, $event)"
            />
            <Button
              v-else-if="data.hideSince"
              icon="pi pi-eye"
              size="small"
              severity="success"
              outlined
              @click="unhideAccount(data, $event)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="editingId ? 'Edit account' : 'Add account'"
      :style="{ width: 'min(56rem, 96vw)' }"
    >
      <div class="grid">
        <div class="col-12 md:col-6">
          <label class="block mb-2 font-medium" for="account-id">Id</label>
          <InputText
            id="account-id"
            v-model.trim="form.id"
            class="w-full"
            :disabled="!!editingId"
          />
          <small class="p-error" v-if="validationErrors.id">
            {{ validationErrors.id }}
          </small>
        </div>

        <div class="col-12 md:col-6">
          <label class="block mb-2 font-medium" for="account-group"
            >Group</label
          >
          <Select
            id="account-group"
            v-model="form.groupType"
            :options="groupOptions"
            class="w-full"
            :disabled="!!editingId"
            @update:modelValue="onChangeGroupType"
          />
        </div>

        <div class="col-12 md:col-6">
          <label class="block mb-2 font-medium" for="account-type">Type</label>
          <Select
            id="account-type"
            v-model="form.type"
            :options="availableTypeOptions"
            class="w-full"
            :disabled="!!editingId"
          />
          <small class="p-error" v-if="validationErrors.type">
            {{ validationErrors.type }}
          </small>
        </div>

        <div class="col-12 md:col-6">
          <label class="block mb-2 font-medium" for="account-currency">
            Currency
          </label>
          <Select
            id="account-currency"
            v-model="form.currency"
            :options="currencyOptions"
            class="w-full"
            :disabled="!!editingId"
          />
          <small class="p-error" v-if="validationErrors.currency">
            {{ validationErrors.currency }}
          </small>
        </div>

        <div class="col-12 md:col-6">
          <label class="block mb-2 font-medium" for="account-name">Name</label>
          <InputText
            id="account-name"
            v-model.trim="form.name"
            class="w-full"
          />
          <small class="p-error" v-if="validationErrors.name">
            {{ validationErrors.name }}
          </small>
        </div>

        <div class="col-12 md:col-6" v-if="!showCategoryField">
          <label class="block mb-2 font-medium" for="account-entity">
            Entity
          </label>
          <InputText
            id="account-entity"
            v-model.trim="form.entity"
            class="w-full"
          />
          <small class="p-error" v-if="validationErrors.entity">
            {{ validationErrors.entity }}
          </small>
        </div>

        <div class="col-12" v-if="showCategoryField">
          <label class="block mb-2 font-medium" for="account-category">
            Category path
          </label>
          <AutoComplete
            id="account-category"
            v-model="form.categoryInput"
            :suggestions="categorySuggestions"
            class="w-full"
            placeholder="Insurance, Health"
            dropdown
            :forceSelection="false"
            @complete="searchCategories"
          />
          <small class="p-error" v-if="validationErrors.category">
            {{ validationErrors.category }}
          </small>
          <div class="text-sm text-color-secondary mt-1">
            Use commas to define nested categories.
          </div>
        </div>

        <div class="col-12 md:col-6">
          <label class="block mb-2 font-medium" for="account-active-from">
            Active from
          </label>
          <DatePicker
            id="account-active-from"
            v-model="form.activeFrom"
            class="w-full"
            dateFormat="yy-mm-dd"
            showIcon
            fluid
          />
          <small class="p-error" v-if="validationErrors.activeFrom">
            {{ validationErrors.activeFrom }}
          </small>
        </div>

        <div class="col-12 md:col-6">
          <label class="block mb-2 font-medium" for="account-hide-since">
            Hide since
          </label>
          <DatePicker
            id="account-hide-since"
            v-model="form.hideSince"
            class="w-full"
            dateFormat="yy-mm-dd"
            showIcon
            fluid
          />
          <small class="p-error" v-if="validationErrors.hideSince">
            {{ validationErrors.hideSince }}
          </small>
        </div>

        <template v-if="showInvestmentFields">
          <div class="col-12 md:col-4">
            <label class="block mb-2 font-medium" for="account-risk">Risk</label>
            <Select
              id="account-risk"
              v-model="form.risk"
              :options="riskOptions"
              class="w-full"
            />
            <small class="p-error" v-if="validationErrors.risk">
              {{ validationErrors.risk }}
            </small>
          </div>

          <div class="col-12 md:col-4">
            <label class="block mb-2 font-medium" for="account-symbol">
              Symbol
            </label>
            <InputText
              id="account-symbol"
              v-model.trim="form.symbol"
              class="w-full"
            />
          </div>

          <div class="col-12 md:col-8">
            <label class="block mb-2 font-medium" for="account-logo"
              >Logo</label
            >
            <InputText
              id="account-logo"
              v-model.trim="form.logo"
              class="w-full"
            />
          </div>

          <div class="col-12">
            <label class="block mb-2 font-medium">Class allocation</label>
            <DataTable
              :value="classAllocationRows"
              responsiveLayout="scroll"
              showGridlines
              class="p-datatable-sm"
            >
              <Column field="assetClass" header="Asset class" />
              <Column
                v-for="region in regions"
                :key="region"
                :field="region"
                :header="region"
              >
                <template #body="{ data }">
                  <InputNumber
                    v-model="data.weights[region]"
                    mode="decimal"
                    suffix="%"
                    :min="0"
                    :max="100"
                    :minFractionDigits="0"
                    :maxFractionDigits="2"
                    class="w-full"
                  />
                </template>
              </Column>
            </DataTable>
            <div class="text-sm text-color-secondary mt-2">
              Total allocation: {{ classAllocationTotal.toFixed(2) }}%
            </div>
            <small class="p-error" v-if="validationErrors.classAllocation">
              {{ validationErrors.classAllocation }}
            </small>
          </div>
        </template>
      </div>

      <Message severity="error" :closable="false" v-if="saveError" class="mt-2">
        {{ saveError }}
      </Message>

      <template #footer>
        <div class="flex justify-content-between gap-2 flex-wrap">
          <Button
            v-if="editingId"
            label="Delete account"
            icon="pi pi-trash"
            severity="danger"
            outlined
            @click="confirmDeleteAccount"
          />
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            @click="closeDialog"
          />
          <Button
            label="Save account"
            icon="pi pi-save"
            :disabled="!canSave"
            :loading="saving"
            @click="saveAccount"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { useAccountsStore, ACCOUNT_GROUP_TYPES } from "@/stores/accounts";
import {
  ASSET_CLASS_OPTIONS,
  GEOGRAPHIC_EXPOSURE_OPTIONS,
  AccountGroupType,
  AccountType,
  Currency,
  type Account,
} from "@/types";

type AccountRow = Account & {
  groupType: AccountGroupType | null;
  categoryLabel: string;
  activeFromLabel: string;
  hideSinceLabel: string;
  statusLabel: string;
};

type AccountForm = {
  id: string;
  groupType: AccountGroupType;
  type: AccountType | null;
  name: string;
  currency: string;
  categoryInput: string;
  entity: string;
  activeFrom: Date | null;
  hideSince: Date | null;
  risk: number | null;
  symbol: string;
  logo: string;
};

type ClassAllocationRow = {
  assetClass: string;
  weights: Record<string, number>;
};

const accountsStore = useAccountsStore();
const toast = useToast();
const confirm = useConfirm();

const dialogVisible = ref(false);
const saving = ref(false);
const saveError = ref("");
const editingId = ref<string | null>(null);
const selectedVisibility = ref<"active" | "inactive">("active");
const selectedGroupFilter = ref<AccountGroupType>(AccountGroupType.Assets);
const categorySuggestions = ref<string[]>([]);

const groupOptions = Object.values(AccountGroupType);
const currencyOptions = Object.values(Currency);
const riskOptions = [1, 2, 3, 4, 5];
const assetClasses = ASSET_CLASS_OPTIONS;
const regions = GEOGRAPHIC_EXPOSURE_OPTIONS;
const visibilityOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];
const groupFilterOptions = groupOptions.map((groupType) => ({
  label: groupType,
  value: groupType,
}));

const createEmptyForm = (): AccountForm => ({
  id: "",
  groupType: AccountGroupType.Assets,
  type: ACCOUNT_GROUP_TYPES[AccountGroupType.Assets][0],
  name: "",
  currency: Currency.COP,
  categoryInput: "",
  entity: "",
  activeFrom: null,
  hideSince: null,
  risk: null,
  symbol: "",
  logo: "",
});

const form = reactive<AccountForm>(createEmptyForm());
const classAllocationRows = ref<ClassAllocationRow[]>(createDefaultClassRows());

const availableTypeOptions = computed(
  () => ACCOUNT_GROUP_TYPES[form.groupType] || [],
);
const showCategoryField = computed(
  () => form.groupType === AccountGroupType.Expenses,
);
const showInvestmentFields = computed(
  () => form.groupType === AccountGroupType.Investments,
);

const accountRows = computed<AccountRow[]>(() =>
  Object.values(accountsStore.accounts)
    .map((account) => {
      const groupType = accountsStore.getAccountGroupType(account.id);
      return {
        ...account,
        groupType,
        categoryLabel: account.category?.join(" / ") || "",
        activeFromLabel: formatDate(account.activeFrom),
        hideSinceLabel: formatDate(account.hideSince),
        statusLabel: getStatusLabel(account),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name)),
);

const filteredRows = computed(() =>
  accountRows.value.filter((account) => {
    const matchesVisibility =
      selectedVisibility.value === "active"
        ? isAccountActive(account)
        : !isAccountActive(account);
    const matchesGroup = account.groupType === selectedGroupFilter.value;
    return matchesVisibility && matchesGroup;
  }),
);
const existingExpenseCategoryPaths = computed(() =>
  Object.values(accountsStore.accounts)
    .filter((account) => account.type === AccountType.Expense)
    .map((account) => account.category?.join(", ") || "")
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => left.localeCompare(right)),
);
const classAllocationTotal = computed(() =>
  classAllocationRows.value.reduce(
    (sum, row) =>
      sum +
      regions.reduce(
        (rowSum, region) => rowSum + (Number(row.weights[region]) || 0),
        0,
      ),
    0,
  ),
);

const validationErrors = computed(() => {
  const errors: Record<string, string> = {};
  if (!form.id.trim()) {
    errors.id = "Id is required.";
  } else if (!/^[a-z0-9_]+$/i.test(form.id.trim())) {
    errors.id = "Use letters, numbers, and underscores only.";
  } else if (
    !editingId.value &&
    Object.prototype.hasOwnProperty.call(accountsStore.accounts, form.id.trim())
  ) {
    errors.id = "Id already exists.";
  }

  if (!form.type) {
    errors.type = "Type is required.";
  }
  if (!form.name.trim()) {
    errors.name = "Name is required.";
  }
  if (!form.currency) {
    errors.currency = "Currency is required.";
  }
  if (!form.activeFrom) {
    errors.activeFrom = "Active from is required.";
  }
  if (showCategoryField.value && !parseCategories(form.categoryInput).length) {
    errors.category = "Expenses require at least one category.";
  }
  if (showInvestmentFields.value && !form.entity.trim()) {
    errors.entity = "Investments require an entity.";
  }
  if (
    showInvestmentFields.value &&
    (form.risk === null || form.risk < 1 || form.risk > 5)
  ) {
    errors.risk = "Risk must be a number between 1 and 5.";
  }
  if (
    showInvestmentFields.value &&
    Math.abs(classAllocationTotal.value - 100) > 0.001
  ) {
    errors.classAllocation = "Class allocation must sum 100%.";
  }
  if (form.activeFrom && form.hideSince && form.hideSince < form.activeFrom) {
    errors.hideSince = "Hide date must be after active from.";
  }

  return errors;
});

const canSave = computed(
  () => !saving.value && Object.keys(validationErrors.value).length === 0,
);

function formatDate(value?: Date) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function isAccountActive(account: Account) {
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const activeFrom = account.activeFrom
    ? new Date(
        account.activeFrom.getFullYear(),
        account.activeFrom.getMonth(),
        1,
      )
    : null;
  const hideSince = account.hideSince
    ? new Date(account.hideSince.getFullYear(), account.hideSince.getMonth(), 1)
    : null;

  return (
    (!activeFrom || activeFrom <= currentMonth) &&
    (!hideSince || hideSince > currentMonth)
  );
}

function getStatusLabel(account: Account) {
  if (account.hideSince && !isAccountActive(account)) {
    return "Hidden";
  }
  if (account.activeFrom && !isAccountActive(account)) {
    return "Scheduled";
  }
  return "Active";
}

function parseCategories(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function searchCategories(event: { query: string }) {
  const query = event.query.trim().toLowerCase();
  categorySuggestions.value = existingExpenseCategoryPaths.value.filter(
    (path) => !query || path.toLowerCase().includes(query),
  );
}

function createDefaultClassRows(): ClassAllocationRow[] {
  return assetClasses.map((assetClass) => ({
    assetClass,
    weights: regions.reduce(
      (weights, region) => ({
        ...weights,
        [region]: 0,
      }),
      {} as Record<string, number>,
    ),
  }));
}

function buildClassAllocation(
  source?: Record<string, Record<string, number>>,
): ClassAllocationRow[] {
  const rows = createDefaultClassRows();
  rows.forEach((row) => {
    regions.forEach((region) => {
      row.weights[region] = Number(source?.[row.assetClass]?.[region] || 0) * 100;
    });
  });
  return rows;
}

function serializeClassAllocation() {
  const allocation = classAllocationRows.value.reduce(
    (grouped, row) => {
      const nonZeroWeights = regions.reduce(
        (weights, region) => {
          const value = Number(row.weights[region] || 0);
          if (value > 0) {
            weights[region] = value / 100;
          }
          return weights;
        },
        {} as Record<string, number>,
      );
      if (Object.keys(nonZeroWeights).length > 0) {
        grouped[row.assetClass] = nonZeroWeights;
      }
      return grouped;
    },
    {} as Record<string, Record<string, number>>,
  );

  return Object.keys(allocation).length > 0 ? allocation : undefined;
}

function resetForm() {
  Object.assign(form, createEmptyForm());
  classAllocationRows.value = createDefaultClassRows();
  categorySuggestions.value = existingExpenseCategoryPaths.value;
  saveError.value = "";
}

function onChangeGroupType(groupType: AccountGroupType) {
  const allowedTypes = ACCOUNT_GROUP_TYPES[groupType] || [];
  if (!allowedTypes.includes(form.type as AccountType)) {
    form.type = allowedTypes[0] || null;
  }
  if (groupType !== AccountGroupType.Expenses) {
    form.categoryInput = "";
    categorySuggestions.value = [];
  } else {
    categorySuggestions.value = existingExpenseCategoryPaths.value;
  }
  if (groupType !== AccountGroupType.Investments) {
    form.risk = null;
    form.symbol = "";
    form.logo = "";
    classAllocationRows.value = createDefaultClassRows();
  }
}

function openCreateDialog() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(account: Account) {
  editingId.value = account.id;
  Object.assign(form, {
    id: account.id,
    groupType:
      accountsStore.getAccountGroupType(account.id) || AccountGroupType.Assets,
    type: account.type,
    name: account.name,
    currency: account.currency,
    categoryInput: account.category?.join(", ") || "",
    entity: account.entity || "",
    activeFrom: account.activeFrom ? new Date(account.activeFrom) : null,
    hideSince: account.hideSince ? new Date(account.hideSince) : null,
    risk: typeof account.risk === "number" ? account.risk : null,
    symbol: account.symbol || "",
    logo: account.logo || "",
  });
  classAllocationRows.value = buildClassAllocation(account.class);
  saveError.value = "";
  dialogVisible.value = true;
}

function closeDialog() {
  dialogVisible.value = false;
  resetForm();
  editingId.value = null;
}

function confirmDeleteAccount() {
  if (!editingId.value) {
    return;
  }

  const account = accountsStore.accounts[editingId.value];
  if (!account) {
    return;
  }

  confirm.require({
    target: document.body,
    message: `Delete ${account.name}? This can generate errors if transactions, balances, budgets, or other saved data still reference this account.`,
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: async () => {
      const deleted = await accountsStore.deleteAccount(account.id);
      if (!deleted) {
        saveError.value = "The account could not be deleted.";
        return;
      }

      toast.add({
        severity: "warn",
        summary: "Account deleted",
        detail: `${account.name} was removed.`,
        life: 2500,
      });
      closeDialog();
    },
  });
}

function normalizeDate(value: Date | null) {
  return value
    ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
    : undefined;
}

async function saveAccount() {
  if (!canSave.value) {
    return;
  }

  saving.value = true;
  saveError.value = "";

  const nextAccount: Account = {
    id: form.id.trim(),
    name: form.name.trim(),
    type: form.type as AccountType,
    currency: form.currency,
    category: showCategoryField.value
      ? parseCategories(form.categoryInput)
      : undefined,
    entity: form.entity.trim() || undefined,
    activeFrom: normalizeDate(form.activeFrom),
    hideSince: normalizeDate(form.hideSince),
    risk: showInvestmentFields.value ? form.risk || undefined : undefined,
    symbol: showInvestmentFields.value
      ? form.symbol.trim() || undefined
      : undefined,
    logo: showInvestmentFields.value
      ? form.logo.trim() || undefined
      : undefined,
    class: showInvestmentFields.value ? serializeClassAllocation() : undefined,
  };

  try {
    const saved = await accountsStore.saveAccount(nextAccount);
    if (!saved) {
      saveError.value = "The account could not be saved.";
      return;
    }

    toast.add({
      severity: "success",
      summary: "Account saved",
      detail: `${nextAccount.name} was updated.`,
      life: 2500,
    });
    closeDialog();
  } finally {
    saving.value = false;
  }
}

function hideAccount(account: Account, event: Event) {
  confirm.require({
    target: (event.currentTarget as HTMLElement) || document.body,
    message: `Hide ${account.name}?`,
    icon: "pi pi-eye-slash",
    accept: async () => {
      const saved = await accountsStore.saveAccount({
        ...account,
        hideSince: new Date(),
      });
      if (saved) {
        toast.add({
          severity: "warn",
          summary: "Account hidden",
          detail: `${account.name} is now hidden.`,
          life: 2500,
        });
      }
    },
  });
}

function unhideAccount(account: Account, event: Event) {
  confirm.require({
    target: (event.currentTarget as HTMLElement) || document.body,
    message: `Restore ${account.name}?`,
    icon: "pi pi-eye",
    accept: async () => {
      const saved = await accountsStore.removeAccountHideSince(account.id);
      if (saved) {
        toast.add({
          severity: "success",
          summary: "Account restored",
          detail: `${account.name} is active again.`,
          life: 2500,
        });
      }
    },
  });
}

onMounted(async () => {
  await accountsStore.loadAccounts(false);
  categorySuggestions.value = existingExpenseCategoryPaths.value;
});
</script>

<style scoped>
.accounts-view {
  padding-bottom: 2rem;
}

.accounts-view :deep(.p-dialog-content) {
  padding-top: 0.5rem;
}
</style>
