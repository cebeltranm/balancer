<template>
  <div
    :class="{
      'layout-wrapper': true,
      'layout-static': true,
      'layout-static-sidebar-inactive': staticMenuInactive,
      'layout-mobile-sidebar-active': mobileMenuActive,
      'p-input-filled': $primevue.config.inputVariant === 'filled',
      'p-ripple-disabled': $primevue.config.ripple === false,
    }"
    @click="onWrapperClick"
  >
    <AppTopbar @menu-toggle="onMenuToggle" />
    <div id="menu" class="layout-sidebar" @click="onSidebarClick">
      <Card>
        <template #content>
          <AppMenu :items="menu" :root="true" class="layout-menu" />
        </template>
        <template #footer>
          <div class="font-bold justify-content-right bg-primary-reverse">
            <p class="text-xs text-right m-0">Balancer@{{ version }}</p>
          </div>
        </template>
      </Card>
    </div>

    <div class="layout-main-container">
      <div class="layout-main">
        <router-view />
      </div>
    </div>
    <ConfirmPopup></ConfirmPopup>
    <Toast />
    <Toast group="pwa-update" position="bottom-center">
      <template #message="slotProps">
        <div
          class="flex align-items-center justify-content-between gap-3 w-full"
        >
          <div class="text-sm">{{ slotProps.message.detail }}</div>
          <Button label="Update now" size="small" @click="onUpdateNow" />
        </div>
      </template>
    </Toast>
    <Auth ref="authDialog"></Auth>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, provide, watch } from "vue";
import { useRouter } from "vue-router";
import { initPWA } from "@/helpers/pwa";
import { isDesktop } from "./helpers/browser";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { EVENTS, CHECK_AUTHENTICATE } from "@/helpers/events";
import packageJson from "../package.json";
import { useStorageStore } from "@/stores/storage";
import AppTopbar from "./layout/AppTopbar.vue";
import AppMenu from "./layout/AppMenu.vue";
import Auth from "@/components/Auth.vue";
import { Currency } from "./types";

const storageStore = useStorageStore();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const authDialog = ref<InstanceType<typeof Auth> | null>(null);

const CURRENCY = ref(Currency.COP);
provide("CURRENCY", CURRENCY);

const { needRefresh, updateServiceWorker } = initPWA();
const updateToastShown = ref(false);

const menu = [
  {
    label: "Home",
    items: [
      { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/" },
      { label: "Expenses", icon: "pi pi-fw pi-shopping-cart", to: "/expenses" },
      { label: "Assets", icon: "pi pi-fw pi-credit-card", to: "/assets" },
      { label: "Portfolio", icon: "pi pi-fw pi-chart-pie", to: "/investments" },
      {
        label: "Transactions",
        icon: "pi pi-fw pi-arrow-right-arrow-left",
        to: "/transactions",
      },
      { label: "Balance", icon: "pi pi-fw pi-chart-line", to: "/balance" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Values", icon: "pi pi-fw pi-dollar", to: "/settings/values" },
      { label: "Budget", icon: "pi pi-fw pi-wallet", to: "/settings/budget" },
      { label: "Accounts", icon: "pi pi-fw pi-book", to: "/settings/accounts" },
      {
        label: "Settings",
        icon: "pi pi-fw pi-sliders-h",
        to: "/settings/general",
      },
      {
        label: "Logout",
        icon: "pi pi-fw pi-sign-out",
        command: (event: any) => logoutUser(event.originalEvent),
      },
    ],
  },
];

const mobileMenuActive = ref(false);
const staticMenuInactive = ref(false);
const version = computed(() => packageJson.version);

EVENTS.on("message", (msg: any) => {
  toast.add({
    severity: msg.severity || "info",
    summary: msg.summary || "",
    detail: msg.message || "",
    life: 3000,
  });
});

watch(needRefresh, (value) => {
  if (value && !updateToastShown.value) {
    updateToastShown.value = true;
    toast.add({
      group: "pwa-update",
      severity: "info",
      summary: "Update available",
      detail: "A new version is available.",
      life: 0,
      closable: false,
    });
  }
});

function onUpdateNow() {
  toast.removeGroup("pwa-update");
  updateToastShown.value = false;
  updateServiceWorker(true);
}

function logoutUser(event?: Event) {
  confirm.require({
    target: (event?.currentTarget as HTMLElement) || document.body,
    message: "Disconnect the current store session?",
    icon: "pi pi-exclamation-triangle",
    accept: async () => {
      await storageStore.logout();
      await router.push("/");
      EVENTS.emit(CHECK_AUTHENTICATE);
      toast.add({
        severity: "info",
        summary: "Logged out",
        detail: "Store session cleared.",
        life: 2500,
      });
    },
  });
}

EVENTS.on(CHECK_AUTHENTICATE, (_msg: any) => {
  if (!storageStore.status.authenticated) {
    authDialog.value?.show();
  }
});

function onMenuToggle() {
  if (isDesktop()) {
    staticMenuInactive.value = !staticMenuInactive.value;
  } else {
    mobileMenuActive.value = !mobileMenuActive.value;
  }
}

function onWrapperClick() {
  mobileMenuActive.value = false;
}

function onSidebarClick() {}

onMounted(() => {
  storageStore.updatePendingToSync();
  // setTimeout(async () => {
  //   balanceStore.recalculateBalance(2020, 1, true );
  // }, 2000)
});
</script>

<style lang="scss">
@use "./assets/styles/index.scss";

.footer {
  position: fixed;
  bottom: 0;
  height: 30px;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
}

#menu {
  .p-card {
    height: 100%;
    .p-card-body {
      height: 100%;
      .p-card-content {
        height: 100%;
      }
    }
  }
}
</style>
