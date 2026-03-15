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
  getStorage: vi.fn(() => ({
    getInfo: storageMocks.getInfoMock,
    doAuth: storageMocks.doAuthMock,
    logout: storageMocks.logoutMock,
  })),
  setSelectedStorageProvider: storageMocks.setSelectedStorageProviderMock,
}));

import * as idb from "@/helpers/idb";
import { useStorageStore } from "@/stores/storage";

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

    expect(store.pendingToSync).toEqual({ transactions: 2, files: 1 });
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
});
