// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import Auth from "@/components/Auth.vue";
import { StorageAuthError } from "@/helpers/storageAuthError";
import { PersistedFileError } from "@/helpers/persistedFileErrors";
import * as files from "@/helpers/files";
import * as idb from "@/helpers/idb";
import { useStorageStore } from "@/stores/storage";

// RT-020: shared auth error state with retry, reset local credentials, and
// provider-login restart actions. See specs/features/authentication.md.

const mocks = vi.hoisted(() => ({
  getInfo: vi.fn(),
  doAuth: vi.fn(),
  logout: vi.fn(),
  credentialsGet: vi.fn(),
  credentialsCreate: vi.fn(),
  dataStoreStub: () => ({
    loadAccounts: vi.fn(),
    loadConfig: vi.fn(),
    loadValuesForYear: vi.fn(),
    ensureCurrentMonthValues: vi.fn(),
    loadBalanceForYear: vi.fn(),
    ensureCurrentMonthBalance: vi.fn(),
    loadBudgetForYear: vi.fn(),
    loadTransactionsForMonth: vi.fn(),
  }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("lodash-es/debounce", () => ({ default: (fn: any) => fn }));
vi.mock("@/helpers/sync", () => ({
  syncTransactions: vi.fn(),
  syncFiles: vi.fn(),
  getAllFilesInCache: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/helpers/idb", () => ({
  countTransactions: vi.fn().mockResolvedValue(0),
  countFilesToSync: vi.fn().mockResolvedValue(0),
  clearDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn().mockResolvedValue({}),
  writeJsonFile: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/helpers/storage", () => ({
  getAvailableStorageProviders: vi.fn(() => []),
  isLocalDevHost: vi.fn(() => window.location.host === "localhost:3000"),
  getSelectedStorageProvider: vi.fn(() => "dropbox"),
  setSelectedStorageProvider: vi.fn(),
  getStorage: vi.fn(() => ({
    getInfo: mocks.getInfo,
    doAuth: mocks.doAuth,
    logout: mocks.logout,
    listFiles: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("@/stores/accounts", () => ({ useAccountsStore: mocks.dataStoreStub }));
vi.mock("@/stores/config", () => ({ useConfigStore: mocks.dataStoreStub }));
vi.mock("@/stores/values", () => ({ useValuesStore: mocks.dataStoreStub }));
vi.mock("@/stores/balance", () => ({ useBalanceStore: mocks.dataStoreStub }));
vi.mock("@/stores/budget", () => ({ useBudgetStore: mocks.dataStoreStub }));
vi.mock("@/stores/transactions", () => ({
  useTransactionsStore: mocks.dataStoreStub,
}));

// Shape the spec defines for the store; typed locally so the suite compiles
// before the implementation exists.
interface AuthErrorStatus {
  kind: "webauthn" | "provider-login" | "token-refresh";
  provider?: string;
  message: string;
}
const authError = (store: ReturnType<typeof useStorageStore>) =>
  (store.status as unknown as { authError?: AuthErrorStatus | null })
    .authError ?? null;

const passthrough = (tag: string) =>
  defineComponent({
    setup(_props, { slots }) {
      return () => h(tag, [slots.header?.(), slots.default?.()]);
    },
  });
const ButtonStub = defineComponent({
  props: { label: String, disabled: Boolean },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "button",
        { disabled: props.disabled, onClick: attrs.onClick as () => void },
        slots.default ? slots.default() : props.label,
      );
  },
});

async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

const ACTIONS = {
  retry: /^retry/i,
  reset: /reset local credentials/i,
  restart: /restart provider login/i,
};

describe("Auth dialog failure handling (RT-020)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;
  let handlerErrors: unknown[];
  let storage: Map<string, string>;

  function buttons() {
    return Array.from(root.querySelectorAll("button"));
  }
  function findButton(label: RegExp) {
    return buttons().find((b) => label.test(b.textContent || ""));
  }
  async function click(label: RegExp) {
    const button = findButton(label);
    expect(button, `button ${label}`).toBeTruthy();
    button!.click();
    await flush();
  }

  async function mountAuth(options: {
    type?: string;
    loggedIn: boolean;
    credentials: boolean;
  }) {
    mocks.getInfo.mockResolvedValue({
      type: options.type ?? "Dropbox",
      loggedIn: options.loggedIn,
      offline: true,
    });
    if (options.credentials) {
      storage.set(
        "crlocal",
        JSON.stringify({ id: btoa("cred"), challenge: btoa("challenge") }),
      );
    }
    const pinia = createPinia();
    setActivePinia(pinia);
    app = createApp(Auth);
    app.use(pinia);
    app.config.errorHandler = (err) => {
      handlerErrors.push(err);
    };
    app.component("Dialog", passthrough("div"));
    app.component("Select", passthrough("div"));
    app.component("Divider", passthrough("hr"));
    app.component("Message", passthrough("div"));
    app.component("InlineMessage", passthrough("div"));
    app.component("Button", ButtonStub);
    app.mount(root);
    await flush();
    return useStorageStore();
  }

  function expectRecoveryActions() {
    expect(findButton(ACTIONS.retry), "Retry action").toBeTruthy();
    expect(
      findButton(ACTIONS.reset),
      "Reset local credentials action",
    ).toBeTruthy();
    expect(
      findButton(ACTIONS.restart),
      "Restart provider login action",
    ).toBeTruthy();
  }

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    handlerErrors = [];
    storage = new Map();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn(
        (key: string, value: string) => void storage.set(key, value),
      ),
      removeItem: vi.fn((key: string) => void storage.delete(key)),
    });
    Object.defineProperty(window, "localStorage", {
      value: globalThis.localStorage,
      configurable: true,
    });
    // src/test/setup.ts replaces window with a minimal mock lacking atob.
    Object.defineProperty(window, "atob", {
      value: globalThis.atob,
      configurable: true,
    });
    vi.stubGlobal("navigator", {
      credentials: {
        get: mocks.credentialsGet,
        create: mocks.credentialsCreate,
      },
    });
    mocks.doAuth.mockResolvedValue(true);
    mocks.logout.mockResolvedValue(true);
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
    root.remove();
    vi.unstubAllGlobals();
  });

  it("authenticates and clears any error when WebAuthn succeeds", async () => {
    mocks.credentialsGet.mockResolvedValue({ id: "ok" });
    const store = await mountAuth({ loggedIn: true, credentials: true });

    await click(/authenticate with credentials/i);

    expect(store.status.authenticated).toBe(true);
    expect(authError(store)).toBeNull();
  });

  it("shows a webauthn auth error with recovery actions when authentication is rejected", async () => {
    mocks.credentialsGet.mockRejectedValue(
      new DOMException("denied", "NotAllowedError"),
    );
    const store = await mountAuth({ loggedIn: true, credentials: true });

    await click(/authenticate with credentials/i);

    expect(handlerErrors).toEqual([]);
    expect(store.status.authenticated).toBe(false);
    expect(authError(store)?.kind).toBe("webauthn");
    expect(root.textContent).toContain(authError(store)!.message);
    expect(root.textContent).not.toContain("NotAllowedError");
    expectRecoveryActions();
  });

  it("shows a webauthn auth error when authentication resolves without a credential", async () => {
    mocks.credentialsGet.mockResolvedValue(null);
    const store = await mountAuth({ loggedIn: true, credentials: true });

    await click(/authenticate with credentials/i);

    expect(store.status.authenticated).toBe(false);
    expect(authError(store)?.kind).toBe("webauthn");
    expectRecoveryActions();
  });

  it("shows a webauthn auth error and stores nothing when registration is rejected", async () => {
    mocks.credentialsCreate.mockRejectedValue(
      new DOMException("exists", "InvalidStateError"),
    );
    const store = await mountAuth({ loggedIn: true, credentials: false });

    await click(/register credentials/i);

    expect(handlerErrors).toEqual([]);
    expect(storage.has("crlocal")).toBe(false);
    expect(authError(store)?.kind).toBe("webauthn");
    expectRecoveryActions();
  });

  it("shows the provider-specific message when provider login throws StorageAuthError", async () => {
    const message =
      "Could not reach the local server at http://localhost:8181/.";
    mocks.doAuth.mockRejectedValue(new StorageAuthError("HttpServer", message));
    const store = await mountAuth({
      type: "HttpServer",
      loggedIn: false,
      credentials: false,
    });

    await click(/login to store/i);

    expect(handlerErrors).toEqual([]);
    expect(store.status.loggedIn).toBe(false);
    expect(authError(store)).toMatchObject({
      kind: "provider-login",
      provider: "HttpServer",
      message,
    });
    expect(root.textContent).toContain(message);
    expectRecoveryActions();
  });

  it("shows a provider-login auth error when a non-redirecting provider login returns false", async () => {
    mocks.doAuth.mockResolvedValue(false);
    const store = await mountAuth({
      type: "HttpServer",
      loggedIn: false,
      credentials: false,
    });

    await click(/login to store/i);

    expect(store.status.loggedIn).toBe(false);
    expect(authError(store)?.kind).toBe("provider-login");
    expectRecoveryActions();
  });

  it("Retry repeats the failed authentication and clears the error on success", async () => {
    mocks.credentialsGet
      .mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"))
      .mockResolvedValueOnce({ id: "ok" });
    const store = await mountAuth({ loggedIn: true, credentials: true });
    await click(/authenticate with credentials/i);

    await click(ACTIONS.retry);

    expect(mocks.credentialsGet).toHaveBeenCalledTimes(2);
    expect(store.status.authenticated).toBe(true);
    expect(authError(store)).toBeNull();
  });

  it("Reset local credentials removes crlocal, keeps provider login, and offers registration", async () => {
    mocks.credentialsGet.mockRejectedValue(
      new DOMException("denied", "NotAllowedError"),
    );
    const store = await mountAuth({ loggedIn: true, credentials: true });
    await click(/authenticate with credentials/i);

    await click(ACTIONS.reset);

    expect(storage.has("crlocal")).toBe(false);
    expect(store.status.authenticated).toBe(false);
    expect(store.status.loggedIn).toBe(true);
    expect(authError(store)).toBeNull();
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(findButton(/register credentials/i)).toBeTruthy();
  });

  it("Restart provider login clears provider tokens only and starts login again", async () => {
    mocks.credentialsGet.mockRejectedValue(
      new DOMException("denied", "NotAllowedError"),
    );
    const store = await mountAuth({ loggedIn: true, credentials: true });
    await click(/authenticate with credentials/i);

    await click(ACTIONS.restart);

    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.doAuth).toHaveBeenCalledTimes(1);
    expect(mocks.logout.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.doAuth.mock.invocationCallOrder[0],
    );
    expect(idb.clearDatabase).not.toHaveBeenCalled();
    expect(authError(store)).toBeNull();
  });

  // RT-021: WebAuthn is mandatory for Dropbox-backed sensitive routes; the
  // HTTP server bypass is development-only. See specs/features/authentication.md.
  describe("WebAuthn requirement (RT-021)", () => {
    const originalHost = window.location.host;

    afterEach(() => {
      window.location.host = originalHost;
    });

    it("keeps Dropbox unauthenticated until WebAuthn succeeds", async () => {
      let resolveGet!: (value: unknown) => void;
      mocks.credentialsGet.mockReturnValue(
        new Promise((resolve) => (resolveGet = resolve)),
      );
      const store = await mountAuth({
        type: "Dropbox",
        loggedIn: true,
        credentials: true,
      });

      expect(store.status.loggedIn).toBe(true);
      expect(store.status.authenticated).toBe(false);

      await click(/authenticate with credentials/i);
      expect(mocks.credentialsGet).toHaveBeenCalledTimes(1);
      expect(store.status.authenticated).toBe(false);

      resolveGet({ id: "ok" });
      await flush();

      expect(store.status.authenticated).toBe(true);
    });

    it("requires registration for Dropbox without local credentials and offers no skip", async () => {
      const store = await mountAuth({
        type: "Dropbox",
        loggedIn: true,
        credentials: false,
      });

      expect(store.status.authenticated).toBe(false);
      expect(mocks.credentialsGet).not.toHaveBeenCalled();
      expect(mocks.credentialsCreate).not.toHaveBeenCalled();
      expect(findButton(/register credentials/i)).toBeTruthy();
      expect(findButton(/skip|continue without|opt out/i)).toBeUndefined();
    });

    it("authenticates the HTTP server provider on the dev host without WebAuthn", async () => {
      window.location.host = "localhost:3000";
      const store = await mountAuth({
        type: "HttpServer",
        loggedIn: true,
        credentials: false,
      });

      expect(store.status.authenticated).toBe(true);
      expect(mocks.credentialsGet).not.toHaveBeenCalled();
      expect(mocks.credentialsCreate).not.toHaveBeenCalled();
    });

    it("does not bypass WebAuthn for the HTTP server provider outside the dev host", async () => {
      window.location.host = "example.com";
      const store = await mountAuth({
        type: "HttpServer",
        loggedIn: true,
        credentials: false,
      });

      expect(store.status.authenticated).toBe(false);
      expect(findButton(/register credentials/i)).toBeTruthy();
    });
  });

  // RT-023: first-run checklist (storage login, seed accounts, register local
  // credential). See specs/features/authentication.md.
  describe("First-run seeding (RT-023)", () => {
    const seed = {
      cash_1: { type: "Cash", name: "Wallet", currency: "usd" },
    };
    let fetchMock: ReturnType<typeof vi.fn>;

    async function loginToStore() {
      const store = await mountAuth({
        type: "Dropbox",
        loggedIn: false,
        credentials: false,
      });
      // mountAuth installs its own getInfo mock; restore the login sequence.
      mocks.getInfo
        .mockReset()
        .mockResolvedValueOnce({
          type: "Dropbox",
          loggedIn: false,
          offline: true,
        })
        .mockResolvedValue({ type: "Dropbox", loggedIn: true, offline: true });
      await click(/login to store/i);
      return store;
    }

    beforeEach(() => {
      fetchMock = vi.fn().mockResolvedValue({ json: async () => seed });
      vi.stubGlobal("fetch", fetchMock);
      vi.mocked(files.writeJsonFile).mockClear();
    });

    it("seeds a missing accounts.json from public/accounts.json once after storage login", async () => {
      vi.mocked(files.readJsonFile).mockResolvedValue(false);

      const store = await loginToStore();

      expect(store.status.loggedIn).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith("./accounts.json");
      const seedWrites = vi
        .mocked(files.writeJsonFile)
        .mock.calls.filter(([name]) => name === "accounts.json");
      expect(seedWrites).toEqual([["accounts.json", seed]]);
    });

    it("does not overwrite an existing valid accounts.json", async () => {
      vi.mocked(files.readJsonFile).mockResolvedValue({
        mine: { type: "Cash", name: "Mine", currency: "cop" },
      });

      await loginToStore();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(files.writeJsonFile).not.toHaveBeenCalledWith(
        "accounts.json",
        expect.anything(),
      );
    });

    it("does not seed over an invalid accounts.json", async () => {
      vi.mocked(files.readJsonFile).mockRejectedValue(
        new PersistedFileError(
          "invalid_file",
          "accounts.json",
          "accounts.json contains invalid JSON.",
        ),
      );

      await loginToStore();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(files.writeJsonFile).not.toHaveBeenCalledWith(
        "accounts.json",
        expect.anything(),
      );
    });

    it("offers Register Credentials after storage login when no local credential exists", async () => {
      vi.mocked(files.readJsonFile).mockResolvedValue({});

      await loginToStore();

      expect(findButton(/register credentials/i)).toBeTruthy();
      expect(findButton(/skip|continue without|opt out/i)).toBeUndefined();
    });
  });
});
