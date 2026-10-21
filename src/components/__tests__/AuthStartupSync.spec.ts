// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { createPinia, setActivePinia } from "pinia";
import Auth from "@/components/Auth.vue";
import { useBalanceStore } from "@/stores/balance";
import { useStorageStore } from "@/stores/storage";
import { useTransactionsStore } from "@/stores/transactions";
import {
  cachedFile,
  idbFake,
  remote,
  resetFakeBackend,
  seedCache,
  seedRemote,
} from "@/test/fakeBackend";

// IMP-28 (RECOMMENDED integration, specs/testing-strategy.md, Storage Sync):
// Auth startup refresh with stale cached files → reload → sync → balance
// recalculation → stores reloaded. Real Auth.vue, stores, files/sync helpers,
// and balance calculation; only IndexedDB, the remote provider, and the
// router are replaced.
//
// syncCachedFiles() fires its reloads with forEach(async …), so the outer
// promise does not cover them. The test waits on observable results instead.

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("lodash-es/debounce", () => ({ default: (fn: any) => fn }));
vi.mock(
  "@/helpers/idb",
  async () => (await import("@/test/fakeBackend")).idbFake,
);
vi.mock(
  "@/helpers/storage",
  async () => (await import("@/test/fakeBackend")).storageModuleFake,
);

const STALE = 1000;
const REMOTE_NEWER = 2000;

const entry = (value: number) => ({
  value,
  expenses: 0,
  in: 0,
  out: 0,
  in_local: 0,
  out_local: 0,
  units: 0,
});

const spend = (id: number, amount: number) => ({
  id,
  date: "2026-05-10",
  description: `Spend ${id}`,
  values: [
    { accountId: "cash", value: -amount, accountValue: -amount },
    { accountId: "food", value: amount, accountValue: amount },
  ],
});

const passthrough = (tag: string) =>
  defineComponent({
    setup(_props, { slots }) {
      return () => h(tag, [slots.header?.(), slots.default?.()]);
    },
  });

describe("Auth startup refresh → sync → balance recalculation (IMP-28)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 4, 20, 12));
    const local = new Map([
      ["crlocal", JSON.stringify({ id: btoa("c"), challenge: btoa("c") })],
    ]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => void local.set(key, value),
      removeItem: (key: string) => void local.delete(key),
    });
    Object.defineProperty(window, "localStorage", {
      value: globalThis.localStorage,
      configurable: true,
    });
    Object.defineProperty(window, "atob", {
      value: globalThis.atob,
      configurable: true,
    });

    setActivePinia(createPinia());
    resetFakeBackend();
    seedRemote("accounts.json", {
      cash: { type: "Cash", name: "Wallet", currency: "usd" },
      food: { type: "Expense", name: "Food", currency: "usd" },
    });
    seedRemote("config.json", { stock_api: {}, inv_composition: {} });
    seedRemote("values_2026.json", { 5: {} });
    // Another device added spend 1 and uploaded balances that include it.
    seedRemote("transactions_2026_5.json", [spend(1, 50)], REMOTE_NEWER);
    seedRemote(
      "balance_2026.json",
      {
        cash: { 4: entry(1000), 5: entry(950) },
        food: { 5: entry(50) },
      },
      REMOTE_NEWER,
    );
    // This device still has the older cached copies.
    seedCache("transactions_2026_5.json", [], STALE);
    seedCache(
      "balance_2026.json",
      { cash: { 4: entry(1000), 5: entry(1000) }, food: { 5: entry(0) } },
      STALE,
    );
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
    root.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reloads stale cached files, then syncs the queue and recalculates balances", async () => {
    // Spend 2 was queued locally while offline.
    await idbFake.saveTransaction(spend(2, 20));

    const pinia = createPinia();
    setActivePinia(pinia);
    app = createApp(Auth);
    app.use(pinia);
    app.component("Dialog", passthrough("div"));
    app.component("Select", passthrough("div"));
    app.component("Divider", passthrough("hr"));
    app.component("Message", passthrough("div"));
    app.component("Button", passthrough("button"));
    app.mount(root);

    const transactionsStore = useTransactionsStore();
    const balanceStore = useBalanceStore();
    const storageStore = useStorageStore();

    // Startup loads the stale cache first: only the queued spend is visible.
    await vi.waitFor(() => {
      expect(
        transactionsStore.transactions[2026]?.[5]?.map((t) => t.id),
      ).toEqual([2]);
      expect(balanceStore.balance[2026]?.cash?.[5]?.value).toBe(1000);
    });

    // The startup refresh then reloads the files the remote has newer copies of.
    await vi.waitFor(
      () => {
        expect(
          transactionsStore.transactions[2026][5].map((t) => t.id).sort(),
        ).toEqual([1, 2]);
        expect(balanceStore.balance[2026].cash[5].value).toBe(950);
      },
      { timeout: 3000 },
    );
    expect(cachedFile("transactions_2026_5.json")?.date_cached).toBeGreaterThan(
      REMOTE_NEWER,
    );
    expect(remote.writes).toEqual([]);

    // App.vue then checks the queue on startup, which starts the sync.
    await storageStore.updatePendingToSync();
    await vi.waitFor(() => {
      expect(remote.files.get("balance_2026.json")?.cash?.[5]?.value).toBe(930);
      expect(storageStore.status.inSync).toBe(false);
    });

    // Sync merged the queued spend into the reloaded remote month.
    expect(
      remote.files
        .get("transactions_2026_5.json")
        .map((t: any) => t.id)
        .sort(),
    ).toEqual([1, 2]);
    expect(await idbFake.countTransactions()).toBe(0);

    // Balances are recalculated from the merged month and carried from April.
    const uploaded = remote.files.get("balance_2026.json");
    expect(uploaded.cash[4].value).toBe(1000);
    expect(uploaded.cash[5].value).toBe(930);
    expect(uploaded.food[5].value).toBe(70);
    expect(balanceStore.balance[2026].cash[5].value).toBe(930);
    expect(balanceStore.balance[2026].food[5].value).toBe(70);
    expect(storageStore.pendingToSync).toEqual({ transactions: 0, files: 0 });
    expect(storageStore.status.syncFailed).toBe(false);
  });
});
