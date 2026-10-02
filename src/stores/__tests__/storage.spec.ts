import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.mock("lodash-es/debounce", () => ({
  default: (fn: any) => fn,
}));

vi.mock("@/helpers/sync", () => ({
  syncTransactions: vi.fn().mockResolvedValue(undefined),
  syncFiles: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/helpers/idb", () => ({
  countTransactions: vi.fn().mockResolvedValue(2),
  countFilesToSync: vi.fn().mockResolvedValue(1),
  clearDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  getInfoMock: vi.fn(),
  doAuthMock: vi.fn(),
  logoutMock: vi.fn(),
  setSelectedStorageProviderMock: vi.fn(),
}));

vi.mock("@/helpers/storage", () => ({
  getAvailableStorageProviders: vi.fn(() => [
    {
      id: "dropbox",
      label: "Dropbox",
      description: "Sync files with Dropbox.",
      available: true,
    },
  ]),
  getSelectedStorageProvider: vi.fn(() => "dropbox"),
  isLocalDevHost: vi.fn(() => true),
  getStorage: vi.fn(() => ({
    getInfo: storageMocks.getInfoMock,
    doAuth: storageMocks.doAuthMock,
    logout: storageMocks.logoutMock,
  })),
  setSelectedStorageProvider: storageMocks.setSelectedStorageProviderMock,
}));

import * as idb from "@/helpers/idb";
import * as syncHelpers from "@/helpers/sync";
import { EVENTS } from "@/helpers/events";
import { readJsonFile, writeJsonFile } from "@/helpers/files";
import { useStorageStore } from "@/stores/storage";

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("storage store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    storageMocks.getInfoMock.mockResolvedValue({
      type: "Dropbox",
      loggedIn: true,
      offline: false,
    });
    storageMocks.doAuthMock.mockResolvedValue(true);
    storageMocks.logoutMock.mockResolvedValue(true);
  });

  it("updates pending counters from idb", async () => {
    const store = useStorageStore();
    await store.updatePendingToSync();
    await flushPromises();

    expect(store.pendingToSync).toEqual({ transactions: 2, files: 1 });
  });

  it("does not start sync while offline and keeps changes queued (RT-024)", async () => {
    const store = useStorageStore();
    store.status.offline = true;

    store.sync();
    await store.updatePendingToSync();
    await flushPromises();

    expect(syncHelpers.syncTransactions).not.toHaveBeenCalled();
    expect(syncHelpers.syncFiles).not.toHaveBeenCalled();
    expect(store.pendingToSync).toEqual({ transactions: 2, files: 1 });
  });

  it("refreshes store info and syncs queued changes when the browser comes back online (RT-024)", async () => {
    const listeners: Record<string, () => void> = {};
    (window as any).addEventListener = vi.fn(
      (name: string, handler: () => void) => {
        listeners[name] = handler;
      },
    );
    storageMocks.getInfoMock.mockResolvedValue({
      type: "Dropbox",
      loggedIn: true,
      offline: true,
    });
    const store = useStorageStore();
    await store.refreshStoreInfo();
    expect(store.status.offline).toBe(true);

    storageMocks.getInfoMock.mockResolvedValue({
      type: "Dropbox",
      loggedIn: true,
      offline: false,
    });
    expect(listeners.online).toBeTypeOf("function");
    listeners.online();
    await flushPromises();

    expect(store.status.offline).toBe(false);
    expect(syncHelpers.syncFiles).toHaveBeenCalled();
  });

  it("serializes executeInSync calls", async () => {
    const store = useStorageStore();
    let resolveFirst: (() => void) | null = null;
    const firstInput = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    const first = store.executeInSync(firstInput.then(() => "a"));

    const second = store.executeInSync(Promise.resolve("b"));
    let secondResolved = false;
    second.then(() => {
      secondResolved = true;
    });

    await Promise.resolve();
    expect(secondResolved).toBe(false);

    resolveFirst?.();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe("a");
    expect(b).toBe("b");
    expect(secondResolved).toBe(true);
  });

  it("refreshes and exposes store info", async () => {
    const store = useStorageStore();

    const info = await store.refreshStoreInfo();

    expect(info).toEqual({
      type: "Dropbox",
      loggedIn: true,
      offline: false,
    });
    expect(store.status.loggedIn).toBe(true);
    expect(store.status.offline).toBe(false);
    expect(store.storeInfo).toEqual(info);
  });

  it("seeds a missing config file after successful storage initialization", async () => {
    vi.mocked(readJsonFile).mockResolvedValue(false);
    vi.mocked(writeJsonFile).mockResolvedValue(true);
    const store = useStorageStore();

    const authenticated = await store.login();

    expect(authenticated).toBe(true);
    expect(readJsonFile).toHaveBeenCalledWith("config.json", false);
    expect(writeJsonFile).toHaveBeenCalledWith("config.json", {
      stock_api: {},
      inv_composition: {},
    });
  });

  it("does not refresh store info or seed config when login returns false", async () => {
    storageMocks.doAuthMock.mockResolvedValue(false);
    const store = useStorageStore();

    const authenticated = await store.login();

    expect(authenticated).toBe(false);
    expect(storageMocks.getInfoMock).not.toHaveBeenCalled();
    expect(store.storeInfo).toBeNull();
    expect(readJsonFile).not.toHaveBeenCalled();
    expect(writeJsonFile).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing config file after successful storage initialization", async () => {
    const existingConfig = { stock_api: { key: "k" } };
    vi.mocked(readJsonFile).mockResolvedValue(existingConfig);
    const store = useStorageStore();

    const authenticated = await store.login();

    expect(authenticated).toBe(true);
    expect(readJsonFile).toHaveBeenCalledWith("config.json", false);
    expect(writeJsonFile).not.toHaveBeenCalled();
  });

  it("does not seed over an invalid config file after successful storage initialization", async () => {
    const error = new Error("config.json could not be loaded");
    vi.mocked(readJsonFile).mockRejectedValue(error);
    const store = useStorageStore();

    await expect(store.login()).rejects.toBe(error);

    expect(readJsonFile).toHaveBeenCalledWith("config.json", false);
    expect(writeJsonFile).not.toHaveBeenCalled();
  });

  it("changes provider and resets authentication", async () => {
    const store = useStorageStore();
    store.status.authenticated = true;

    await store.selectProvider("dropbox");

    expect(storageMocks.setSelectedStorageProviderMock).toHaveBeenCalledWith(
      "dropbox",
    );
    expect(store.status.authenticated).toBe(false);
  });

  it("logs out and clears authentication state", async () => {
    const store = useStorageStore();
    store.status.loggedIn = true;
    store.status.authenticated = true;
    store.pendingToSync = { transactions: 3, files: 2 };

    await store.logout();

    expect(storageMocks.logoutMock).toHaveBeenCalled();
    expect(idb.clearDatabase).toHaveBeenCalled();
    expect(store.status.loggedIn).toBe(false);
    expect(store.status.authenticated).toBe(false);
    expect(store.status.offline).toBe(true);
    expect(store.pendingToSync).toEqual({ transactions: 0, files: 0 });
  });

  it("sets persistent sync-failed status and keeps pending counters when sync upload fails", async () => {
    const emit = vi.spyOn(EVENTS, "emit");
    vi.mocked(syncHelpers.syncTransactions).mockResolvedValue(undefined);
    vi.mocked(syncHelpers.syncFiles).mockResolvedValue([
      {
        fileName: "values_2025.json",
        stored: false,
        error: "values_2025.json could not be uploaded",
      },
    ] as any);
    vi.mocked(idb.countTransactions).mockResolvedValue(0);
    vi.mocked(idb.countFilesToSync).mockResolvedValue(1);

    const store = useStorageStore();
    store.pendingToSync = { transactions: 0, files: 1 };
    store.sync();
    await flushPromises();

    expect(store.status.inSync).toBe(false);
    expect(store.pendingToSync).toEqual({ transactions: 0, files: 1 });
    expect((store.status as any).syncFailed).toBe(true);
    expect((store.status as any).lastSyncError).toContain("values_2025.json");
    expect(emit).toHaveBeenCalledWith("message", {
      severity: "error",
      summary: "Sync failed",
      message: expect.stringContaining("queued locally"),
      life: 0,
      closable: false,
    });
  });

  it("clears sync-failed status after retry succeeds", async () => {
    vi.mocked(syncHelpers.syncTransactions).mockResolvedValue(undefined);
    vi.mocked(syncHelpers.syncFiles)
      .mockResolvedValueOnce([
        {
          fileName: "budget_2025.json",
          stored: false,
          error: "budget_2025.json could not be uploaded",
        },
      ] as any)
      .mockResolvedValueOnce([{ fileName: "budget_2025.json", stored: true }]);
    vi.mocked(idb.countTransactions).mockResolvedValue(0);
    vi.mocked(idb.countFilesToSync)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const store = useStorageStore();
    store.pendingToSync = { transactions: 0, files: 1 };
    store.sync();
    await flushPromises();
    expect((store.status as any).syncFailed).toBe(true);

    store.sync();
    await flushPromises();

    expect(store.status.inSync).toBe(false);
    expect(store.pendingToSync).toEqual({ transactions: 0, files: 0 });
    expect((store.status as any).syncFailed).toBe(false);
    expect((store.status as any).lastSyncError).toBe("");
  });

  describe("auth error state and recovery (RT-020)", () => {
    // Shape the spec defines; typed locally so this compiles before the
    // implementation exists.
    type AuthErrorStatus = {
      kind: "webauthn" | "provider-login" | "token-refresh";
      provider?: string;
      message: string;
    };
    type AuthErrorApi = {
      setAuthError: (error: AuthErrorStatus) => void;
      clearAuthError: () => void;
      restartProviderLogin: () => Promise<unknown>;
    };
    const api = (store: ReturnType<typeof useStorageStore>) =>
      store as unknown as AuthErrorApi;
    const authError = (store: ReturnType<typeof useStorageStore>) =>
      (store.status as unknown as { authError?: AuthErrorStatus | null })
        .authError ?? null;
    const sample: AuthErrorStatus = {
      kind: "webauthn",
      message: "Device authentication was cancelled.",
    };
    let local: Map<string, string>;

    beforeEach(() => {
      local = new Map();
      vi.mocked(readJsonFile).mockResolvedValue({ stock_api: {} });
      (window as any).localStorage = {
        getItem: (key: string) => local.get(key) ?? null,
        setItem: (key: string, value: string) => void local.set(key, value),
        removeItem: (key: string) => void local.delete(key),
      };
    });

    it("starts with no auth error", () => {
      expect(authError(useStorageStore())).toBeNull();
    });

    it("stores and clears an auth error", () => {
      const store = useStorageStore();

      api(store).setAuthError(sample);
      expect(authError(store)).toEqual(sample);

      api(store).clearAuthError();
      expect(authError(store)).toBeNull();
    });

    it("resetLocalCredentials removes crlocal and deauthenticates", () => {
      const store = useStorageStore();
      local.set("crlocal", "{}");
      store.status.authenticated = true;

      store.resetLocalCredentials();

      expect(local.has("crlocal")).toBe(false);
      expect(store.status.authenticated).toBe(false);
    });

    it("resetLocalCredentials also clears the auth error", () => {
      const store = useStorageStore();
      local.set("crlocal", "{}");
      store.status.authenticated = true;
      api(store).setAuthError(sample);

      store.resetLocalCredentials();

      expect(local.has("crlocal")).toBe(false);
      expect(store.status.authenticated).toBe(false);
      expect(authError(store)).toBeNull();
    });

    it("clears the auth error on logout and provider change", async () => {
      const store = useStorageStore();

      api(store).setAuthError(sample);
      await store.logout();
      expect(authError(store)).toBeNull();

      api(store).setAuthError(sample);
      await store.selectProvider("dropbox");
      expect(authError(store)).toBeNull();
    });

    it("clears the auth error after a successful login", async () => {
      const store = useStorageStore();
      api(store).setAuthError({ ...sample, kind: "provider-login" });

      await store.login();

      expect(authError(store)).toBeNull();
    });

    it("restartProviderLogin clears provider tokens, keeps cached data, and logs in again", async () => {
      const store = useStorageStore();
      store.pendingToSync = { transactions: 3, files: 2 };
      api(store).setAuthError({ ...sample, kind: "token-refresh" });

      await api(store).restartProviderLogin();

      expect(storageMocks.logoutMock).toHaveBeenCalledTimes(1);
      expect(storageMocks.doAuthMock).toHaveBeenCalledTimes(1);
      expect(storageMocks.logoutMock.mock.invocationCallOrder[0]).toBeLessThan(
        storageMocks.doAuthMock.mock.invocationCallOrder[0],
      );
      expect(idb.clearDatabase).not.toHaveBeenCalled();
      expect(store.pendingToSync).toEqual({ transactions: 3, files: 2 });
      expect(authError(store)).toBeNull();
    });
  });
});
