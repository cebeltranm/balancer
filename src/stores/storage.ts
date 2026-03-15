import { defineStore } from "pinia";
import { computed, ref } from "vue";
import bounced from "lodash-es/debounce";
import * as syncHelpers from "../helpers/sync";
import * as idb from "../helpers/idb";
import {
  getAvailableStorageProviders,
  getSelectedStorageProvider,
  getStorage,
  setSelectedStorageProvider,
  type StorageProviderId,
} from "@/helpers/storage";

let currentSyncPromise: Promise<any> | null = null;

export const useStorageStore = defineStore("storage", () => {
  const storeInfo = ref<any>(null);
  const pendingToSync = ref({ transactions: 0, files: 0 });
  const status = ref({
    inSync: false,
    offline: false,
    loggedIn: false,
    authenticated: false,
  });
  const selectedProvider = ref<StorageProviderId>(getSelectedStorageProvider());
  const providerOptions = computed(() => getAvailableStorageProviders());

  const syncAll = bounced(async () => {
    try {
      status.value.inSync = true;
      const trans = await syncHelpers.syncTransactions();
      if (trans) {
        const { useTransactionsStore } = await import("./transactions");
        const transactionsStore = useTransactionsStore();
        await Promise.all(
          trans.map((t) => {
            return transactionsStore.loadTransactionsForMonth(
              t.year,
              t.month,
              false,
            );
          }),
        );

        const firstMonth = trans.reduce(
          (ant: any, t: any) =>
            ant.year < t.year || (ant.year === t.year && ant.month < t.month)
              ? ant
              : t,
          { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
        );
        const { useBalanceStore } = await import("./balance");
        const balanceStore = useBalanceStore();
        await balanceStore.recalculateBalance(
          firstMonth.year,
          firstMonth.month,
          true,
        );
      }
      await syncHelpers.syncFiles();
    } finally {
      status.value.inSync = false;
      await updatePendingToSync();
    }
  }, 1000);

  // Actions
  function sync() {
    if (!status.value.offline) {
      status.value.inSync = true;
      syncAll();
    }
  }
  async function updatePendingToSync() {
    const transactions = await idb.countTransactions();
    const files = await idb.countFilesToSync();

    if (
      (pendingToSync.value.transactions !== transactions && transactions) ||
      (pendingToSync.value.files !== files && files)
    ) {
      sync();
    }
    pendingToSync.value = {
      transactions,
      files,
    };
  }

  async function executeInSync(promise: Promise<any>) {
    try {
      if (currentSyncPromise) {
        await currentSyncPromise;
      }
    } catch {}
    const executeFunction = async () => {
      status.value.inSync = true;
      try {
        const r = await promise;
        return r;
      } finally {
        status.value.inSync = false;
        currentSyncPromise = null;
      }
    };
    currentSyncPromise = executeFunction();
    return currentSyncPromise;
  }

  async function refreshStoreInfo() {
    selectedProvider.value = getSelectedStorageProvider();
    const info = await getStorage().getInfo();
    storeInfo.value = info;
    status.value.loggedIn = info.loggedIn;
    status.value.offline = info.offline;
    if (!info.loggedIn) {
      status.value.authenticated = false;
    } else if (info.type === "HttpServer") {
      status.value.authenticated = true;
    }
    return info;
  }

  async function login(code?: string) {
    const authenticated = await getStorage().doAuth(code);
    if (authenticated) {
      await refreshStoreInfo();
    }
    return authenticated;
  }

  async function logout() {
    const storage = getStorage() as { logout?: () => Promise<boolean> };
    await storage.logout?.();
    await idb.clearDatabase();
    storeInfo.value = null;
    pendingToSync.value = { transactions: 0, files: 0 };
    status.value.loggedIn = false;
    status.value.offline = true;
    status.value.authenticated = false;
  }

  async function selectProvider(provider: StorageProviderId) {
    setSelectedStorageProvider(provider);
    selectedProvider.value = provider;
    status.value.authenticated = false;
    return refreshStoreInfo();
  }

  function resetLocalCredentials() {
    window.localStorage.removeItem("crlocal");
    status.value.authenticated = false;
  }

  return {
    storeInfo,
    status,
    pendingToSync,
    selectedProvider,
    providerOptions,
    sync,
    updatePendingToSync,
    executeInSync,
    refreshStoreInfo,
    login,
    logout,
    selectProvider,
    resetLocalCredentials,
  };
});
