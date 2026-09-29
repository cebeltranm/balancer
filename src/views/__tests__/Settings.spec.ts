// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import Settings from "@/views/Settings.vue";

const mocks = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  login: vi.fn(),
  refreshStoreInfo: vi.fn(),
  storeInfo: null as any,
  status: {} as Record<string, unknown>,
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: mocks.toastAdd }),
}));

vi.mock("@/stores/config", () => ({
  useConfigStore: () => ({
    config: {},
    loadConfig: vi.fn().mockResolvedValue(undefined),
    saveConfig: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    storeInfo: mocks.storeInfo,
    status: mocks.status,
    login: mocks.login,
    refreshStoreInfo: mocks.refreshStoreInfo,
    resetLocalCredentials: vi.fn(),
  }),
}));

const passthrough = (tag: string) =>
  defineComponent({
    setup(_props, { slots }) {
      return () =>
        h(tag, [slots.title?.(), slots.content?.(), slots.default?.()]);
    },
  });

const ButtonStub = defineComponent({
  props: { label: String, disabled: Boolean },
  setup(props, { attrs }) {
    return () =>
      h(
        "button",
        { disabled: props.disabled, onClick: attrs.onClick as () => void },
        props.label,
      );
  },
});

const GENERIC_DETAIL = /try again later/i;

function errorToasts() {
  return mocks.toastAdd.mock.calls
    .map(([toast]) => toast)
    .filter((toast) => toast.severity === "error");
}

async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

describe("Settings retry login (RT-018)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;
  let reload: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  async function mountAndRetry() {
    app = createApp(Settings);
    for (const name of ["Card", "Message", "Tabs", "TabPanel"]) {
      app.component(name, passthrough("div"));
    }
    app.component("Button", ButtonStub);
    for (const name of [
      "Column",
      "DataTable",
      "InputNumber",
      "InputText",
      "Select",
    ]) {
      app.component(name, passthrough("div"));
    }
    app.mount(root);
    await flush();
    const retry = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === "Retry login",
    ) as HTMLButtonElement;
    expect(retry).toBeTruthy();
    retry.click();
    await flush();
  }

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    reload = vi.fn();
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, reload },
      configurable: true,
    });
    mocks.storeInfo = { type: "HttpServer", loggedIn: false, offline: false };
    mocks.status = { loggedIn: false, offline: false, authenticated: false };
    mocks.refreshStoreInfo.mockResolvedValue(mocks.storeInfo);
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
    root.remove();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true,
    });
  });

  it("shows a success toast and reloads when login succeeds", async () => {
    mocks.login.mockResolvedValue(true);

    await mountAndRetry();

    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success" }),
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("shows a generic retry-later error toast when a non-redirecting provider returns false", async () => {
    mocks.login.mockResolvedValue(false);

    await mountAndRetry();

    const toasts = errorToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].detail).toMatch(GENERIC_DETAIL);
    expect(reload).not.toHaveBeenCalled();
  });

  it("shows no error toast when Dropbox returns false because it is redirecting to sign-in", async () => {
    mocks.storeInfo = { type: "Dropbox", loggedIn: false, offline: false };
    mocks.login.mockResolvedValue(false);

    await mountAndRetry();

    expect(errorToasts()).toHaveLength(0);
    expect(reload).not.toHaveBeenCalled();
  });

  it("shows a generic retry-later error toast when login throws a plain error", async () => {
    mocks.login.mockRejectedValue(new Error("boom"));

    await mountAndRetry();

    const toasts = errorToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].detail).toMatch(GENERIC_DETAIL);
    expect(reload).not.toHaveBeenCalled();
  });

  it("shows the provider-specific message when the login error carries one", async () => {
    const message =
      "Check that the local server at http://localhost:8181/ is running.";
    // Provider error contract is not implemented yet; tests assume an error
    // named StorageAuthError whose message is safe to show to the user.
    mocks.login.mockRejectedValue(
      Object.assign(new Error(message), {
        name: "StorageAuthError",
        provider: "HttpServer",
      }),
    );

    await mountAndRetry();

    const toasts = errorToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].detail).toBe(message);
    expect(reload).not.toHaveBeenCalled();
  });

  it("leaves store info and status unchanged after a failed retry", async () => {
    mocks.login.mockResolvedValue(false);
    const infoBefore = structuredClone(mocks.storeInfo);
    const statusBefore = structuredClone(mocks.status);

    await mountAndRetry();

    expect(mocks.storeInfo).toEqual(infoBefore);
    expect(mocks.status).toEqual(statusBefore);
    // only the initial refresh on mount; no refresh triggered by the failure
    expect(mocks.refreshStoreInfo).toHaveBeenCalledTimes(1);
  });
});
