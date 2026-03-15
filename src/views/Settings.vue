<template>
  <div class="settings-view">
    <div class="grid">
      <div class="col-12 xl:col-6">
        <Card>
          <template #title>Storage</template>
          <template #content>
            <div class="flex flex-column gap-4">
              <div class="field">
                <span class="block mb-2 font-medium">Current provider</span>
                <span class="text-color-secondary">
                  {{ storageStore.storeInfo?.type || "Not selected" }}
                </span>
              </div>

              <Message
                :severity="storageMessageSeverity"
                :closable="false"
                v-if="storageSummary"
              >
                {{ storageSummary }}
              </Message>

              <div class="flex flex-wrap gap-2">
                <Button
                  label="Retry login"
                  icon="pi pi-refresh"
                  @click="retryLogin"
                  :disabled="!canLogin"
                />
                <Button
                  label="Clear device credentials"
                  icon="pi pi-key"
                  severity="secondary"
                  outlined
                  @click="clearLocalCredentials"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <div class="col-12 xl:col-6">
        <Card>
          <template #title>Stock API</template>
          <template #content>
            <div class="flex flex-column gap-4">
              <div class="field">
                <label class="block mb-2 font-medium" for="stock-api-type">
                  Provider type
                </label>
                <Select
                  id="stock-api-type"
                  v-model="configForm.stock_api.type"
                  :options="stockApiTypes"
                  class="w-full"
                />
              </div>
              <div class="field">
                <label class="block mb-2 font-medium" for="stock-api-host">
                  Host
                </label>
                <InputText
                  id="stock-api-host"
                  v-model.trim="configForm.stock_api.host"
                  class="w-full"
                />
              </div>
              <div class="field">
                <label class="block mb-2 font-medium" for="stock-api-key">
                  API key
                </label>
                <InputText
                  id="stock-api-key"
                  v-model.trim="configForm.stock_api.key"
                  class="w-full"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <div class="col-12">
        <Card>
          <template #title>Investment Composition</template>
          <template #content>
            <div class="flex flex-column gap-3">
              <p class="m-0 text-color-secondary">
                Edit the target portfolio composition. Weights are percentages
                and must sum to 100%.
              </p>
              <div
                class="flex justify-content-between align-items-center gap-2"
              >
                <div class="composition-tabs">
                  <Button
                    v-for="assetClass in assetClasses"
                    :key="assetClass"
                    :label="`${assetClass} (${formatPercentage(assetClassTotals[assetClass] || 0)})`"
                    :severity="
                      activeAssetClass === assetClass ? 'contrast' : 'secondary'
                    "
                    :outlined="activeAssetClass !== assetClass"
                    size="small"
                    @click="activeAssetClass = assetClass"
                  />
                </div>
                <span class="text-sm text-color-secondary">
                  Total allocation:
                  {{ formatPercentage(totalCompositionValue) }}
                </span>
              </div>
              <DataTable
                :value="activeCompositionRows"
                responsiveLayout="scroll"
                showGridlines
                class="p-datatable-sm"
              >
                <Column field="region" header="Region">
                  <template #body="{ data }">
                    {{ data.region }}
                  </template>
                </Column>
                <Column
                  v-for="instrumentType in activeInstrumentTypes"
                  :key="instrumentType"
                  :field="instrumentType"
                  :header="instrumentType"
                >
                  <template #body="{ data }">
                    <InputNumber
                      v-model="data.weights[instrumentType]"
                      mode="decimal"
                      :min="0"
                      :maxFractionDigits="4"
                      suffix="%"
                      class="w-full"
                    />
                  </template>
                </Column>
                <Column header="Region total">
                  <template #body="{ data }">
                    {{ formatPercentage(getRegionTotal(data)) }}
                  </template>
                </Column>
              </DataTable>
              <Message
                severity="error"
                :closable="false"
                v-if="invCompositionError"
              >
                {{ invCompositionError }}
              </Message>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-content-end">
              <Button
                label="Save settings"
                icon="pi pi-save"
                @click="saveSettings"
                :loading="saving"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfigStore } from "@/stores/config";
import { useStorageStore } from "@/stores/storage";
import { GeographicExposure, StockApiType } from "@/types";

const configStore = useConfigStore();
const storageStore = useStorageStore();
const toast = useToast();
const defaultAssetClasses = [
  "Equities",
  "FixedIncome",
  "Cash",
  "RealEstate",
  "Alternative",
];
const defaultInstrumentTypes = ["ETF", "MutualFund"];

interface CompositionMatrixRow {
  region: string;
  weights: Record<string, number>;
}

const saving = ref(false);
const invCompositionError = ref("");
const compositionMatrix = ref<Record<string, CompositionMatrixRow[]>>({});
const compositionTypes = ref<Record<string, string[]>>({});
const activeAssetClass = ref<string>("Equities");

const configForm = ref({
  stock_api: {
    type: StockApiType.RapidApi,
    host: "",
    key: "",
  },
});

const stockApiTypes = Object.values(StockApiType);
const canLogin = computed(() => !!storageStore.storeInfo?.type);
const storageSummary = computed(() => {
  const info = storageStore.storeInfo;
  if (!info) {
    return "Store status has not been loaded yet.";
  }
  if (!info.loggedIn) {
    return `${info.type} is not logged in.`;
  }
  if (info.offline) {
    return `${info.type} is logged in but currently offline.`;
  }
  if (info.type === "HttpServer") {
    return `Connected to ${info.url}.`;
  }
  return `${info.type} is connected and ready to sync.`;
});
const storageMessageSeverity = computed(() => {
  if (!storageStore.status.loggedIn || storageStore.status.offline) {
    return "warn";
  }
  return "success";
});
const assetClasses = computed(() => Object.keys(compositionMatrix.value));
const assetClassTotals = computed(() =>
  assetClasses.value.reduce(
    (totals, assetClass) => {
      totals[assetClass] = (compositionMatrix.value[assetClass] || []).reduce(
        (sum, row) =>
          sum +
          Object.values(row.weights).reduce(
            (rowSum, value) => rowSum + (typeof value === "number" ? value : 0),
            0,
          ),
        0,
      );
      return totals;
    },
    {} as Record<string, number>,
  ),
);
const totalCompositionValue = computed(() =>
  Object.values(assetClassTotals.value).reduce((sum, value) => sum + value, 0),
);
const activeInstrumentTypes = computed(
  () => compositionTypes.value[activeAssetClass.value] || [],
);
const activeCompositionRows = computed(
  () => compositionMatrix.value[activeAssetClass.value] || [],
);

onMounted(async () => {
  await Promise.all([
    configStore.loadConfig(false),
    storageStore.refreshStoreInfo(),
  ]);
  hydrateForm();
});

function hydrateForm() {
  const config = configStore.config || {};
  configForm.value = {
    stock_api: {
      type: config.stock_api?.type || StockApiType.RapidApi,
      host: config.stock_api?.host || "",
      key: config.stock_api?.key || "",
    },
  };
  const { matrix, types } = normalizeComposition(config.inv_composition || {});
  compositionMatrix.value = matrix;
  compositionTypes.value = types;
  if (!compositionMatrix.value[activeAssetClass.value]) {
    activeAssetClass.value = Object.keys(compositionMatrix.value)[0];
  }
  invCompositionError.value = "";
}

function normalizeComposition(composition: Record<string, any>) {
  const assetClassList = [
    ...new Set([...defaultAssetClasses, ...Object.keys(composition)]),
  ];
  const regionList = [
    ...new Set([...Object.values(GeographicExposure), "Global"]),
  ];

  const types = assetClassList.reduce(
    (acc, assetClass) => {
      const assetConfig = composition[assetClass] || {};
      const assetTypes = new Set<string>();
      defaultInstrumentTypes.forEach((type) => assetTypes.add(type));
      Object.keys(assetConfig).forEach((region) => {
        Object.keys(assetConfig[region] || {}).forEach((type) =>
          assetTypes.add(type),
        );
      });
      acc[assetClass] = [...assetTypes];
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const matrix = assetClassList.reduce(
    (acc, assetClass) => {
      const assetConfig = composition[assetClass] || {};
      acc[assetClass] = regionList.map((region) => {
        const regionValues = assetConfig[region] || {};
        const weights = types[assetClass].reduce(
          (typeAcc, instrumentType) => {
            typeAcc[instrumentType] =
              typeof regionValues[instrumentType] === "number"
                ? regionValues[instrumentType] * 100
                : 0;
            return typeAcc;
          },
          {} as Record<string, number>,
        );
        return {
          region,
          weights,
        };
      });
      return acc;
    },
    {} as Record<string, CompositionMatrixRow[]>,
  );

  return { matrix, types };
}

function buildCompositionFromMatrix() {
  return assetClasses.value.reduce(
    (composition, assetClass) => {
      composition[assetClass] = {};
      (compositionMatrix.value[assetClass] || []).forEach((row) => {
        const regionValues = Object.entries(row.weights).reduce(
          (regionAcc, [instrumentType, value]) => {
            regionAcc[instrumentType] = value / 100;
            return regionAcc;
          },
          {} as Record<string, number>,
        );
        composition[assetClass][row.region] = regionValues;
      });
      return composition;
    },
    {} as Record<string, Record<string, Record<string, number>>>,
  );
}

function getRegionTotal(row: CompositionMatrixRow) {
  return Object.values(row.weights).reduce((sum, value) => sum + value, 0);
}

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

async function retryLogin() {
  if (!canLogin.value) {
    return;
  }
  const completed = await storageStore.login();
  if (completed) {
    toast.add({
      severity: "success",
      summary: "Store ready",
      detail: "Login completed.",
      life: 2500,
    });
    window.location.reload();
  }
}

function clearLocalCredentials() {
  storageStore.resetLocalCredentials();
  toast.add({
    severity: "info",
    summary: "Credentials cleared",
    detail: "Local biometric/device credentials were removed.",
    life: 2500,
  });
}

async function saveSettings() {
  const hasInvalidWeight = Object.values(compositionMatrix.value).some((rows) =>
    rows.some((row) =>
      Object.values(row.weights).some(
        (value) =>
          typeof value !== "number" || Number.isNaN(value) || value < 0,
      ),
    ),
  );
  if (hasInvalidWeight) {
    invCompositionError.value =
      "Every weight must be a valid percentage greater than or equal to 0.";
    return;
  }
  if (Math.abs(totalCompositionValue.value - 100) > 0.001) {
    invCompositionError.value = "The total allocation must add up to 100%.";
    return;
  }
  const parsedComposition = buildCompositionFromMatrix();
  invCompositionError.value = "";

  saving.value = true;
  try {
    const saved = await configStore.saveConfig({
      ...configStore.config,
      stock_api: { ...configForm.value.stock_api },
      inv_composition: parsedComposition,
    });

    if (!saved) {
      toast.add({
        severity: "error",
        summary: "Save failed",
        detail: "Settings could not be stored.",
        life: 3000,
      });
      return;
    }

    hydrateForm();
    toast.add({
      severity: "success",
      summary: "Settings saved",
      detail: "config.json was updated.",
      life: 2500,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.settings-view {
  padding-bottom: 2rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.composition-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
