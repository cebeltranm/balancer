<template>
  <Toolbar>
    <template #start>
      <Button
        icon="pi pi-bars"
        variant="outlined"
        rounded
        aria-label="Menu"
        @click.stop="onMenuToggle"
      />
    </template>

    <template #end>
      <Button
        :icon="currencyIcon"
        variant="outlined"
        rounded
        aria-label="Currencies"
        @click="menuCurrencies?.toggle"
      >
        <span v-if="currencyIconText">{{ currencyIconText }}</span>
      </Button>
      <Menu
        id="currencies_menu"
        ref="menuCurrencies"
        :model="currencies"
        :popup="true"
      />
      <div class="pl-2" />
      <Button
        icon="pi pi-plus"
        variant="outlined"
        rounded
        aria-label="Add transaction"
        @click="onAddTransaction"
      />
      <div class="pl-2" />
      <Button
        :icon="syncIcon"
        :class="syncButtonClass"
        variant="outlined"
        rounded
        raised
        aria-label="Add transaction"
        @click="() => storage.sync()"
      >
      </Button>
    </template>
  </Toolbar>
  <TransactionTypeDialog ref="transactionDialog" />
</template>

<script lang="ts" setup>
import { ref, computed, inject, type Ref } from "vue";
import TransactionTypeDialog from "@/components/TransactionTypeDialog.vue";
import { Currency } from "@/types";
import { CURRENCY_ICONS } from "@/helpers/options";
import { useStorageStore } from "@/stores/storage";

const storage = useStorageStore();

const emit = defineEmits(["menu-toggle", "topbar-menu-toggle"]);
const transactionDialog = ref<InstanceType<
  typeof TransactionTypeDialog
> | null>(null);

const CURRENCY = inject<Ref<Currency>>("CURRENCY", ref(Currency.COP));

const currencyIcon = computed(() => {
  const iconMap = CURRENCY_ICONS[CURRENCY.value];
  if (!iconMap) {
    return "pi";
  }
  const iconClass = Object.keys(iconMap).find((key) => key !== "pi");
  return iconClass ? `pi ${iconClass}` : "pi";
});
const currencyIconText = computed(() =>
  CURRENCY_ICONS[CURRENCY.value] ? "" : CURRENCY.value,
);

const menuCurrencies = ref();
const currencies = computed(() =>
  Object.values(Currency).map((c) => ({
    label: c.toUpperCase(),
    icon: currencyToIcon(c),
    command: () => {
      CURRENCY.value = c;
    },
  })),
);

const isPendingToSync = computed(
  () =>
    storage.pendingToSync.transactions > 0 || storage.pendingToSync.files > 0,
);
const syncIcon = computed(() =>
  storage.status.inSync ? "pi pi-spinner pi-spin" : "pi pi-circle-fill",
);
const syncButtonClass = computed(() => ({
  "text-green-500": !isPendingToSync.value,
  "text-red-500": isPendingToSync.value,
}));

function currencyToIcon(currency: Currency) {
  const iconMap = CURRENCY_ICONS[currency];
  if (!iconMap) {
    return undefined;
  }
  const iconClass = Object.keys(iconMap).find((key) => key !== "pi");
  return iconClass ? `pi ${iconClass}` : undefined;
}

function onMenuToggle(event: any) {
  emit("menu-toggle", event);
}

function onAddTransaction() {
  transactionDialog.value?.show();
}
</script>
