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
}));

import { useStorageStore } from "@/stores/storage";

describe("storage store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
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
});
