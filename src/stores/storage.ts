import { defineStore } from "pinia";
import { ref } from "vue";
import bounced from "lodash-es/debounce";
import * as syncHelpers from "../helpers/sync";
import * as idb from "../helpers/idb";

let currentSyncPromise: Promise<any> | null = null;

export const useStorageStore = defineStore("storage", () => {
  const pendingToSync = ref({ transactions: 0, files: 0 });
  const status = ref({
    inSync: false,
    offline: false,
    loggedIn: false,
    authenticated: false,
  });

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

  return { status, pendingToSync, sync, updatePendingToSync, executeInSync };
});
