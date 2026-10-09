// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import App from "@/App.vue";

const mocks = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  toastRemoveGroup: vi.fn(),
  updateServiceWorker: vi.fn(),
}));

// Shared pending-update flag; replaced with a fresh ref before each test.
let needRefresh = ref(false);

vi.mock("@/helpers/pwa", () => ({
  initPWA: () => ({
    needRefresh,
    offlineReady: ref(false),
    updateServiceWorker: mocks.updateServiceWorker,
  }),
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({
    add: mocks.toastAdd,
    removeGroup: mocks.toastRemoveGroup,
  }),
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: vi.fn() }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    status: { authenticated: true },
    updatePendingToSync: vi.fn(),
    logout: vi.fn(),
  }),
}));

const stub = (tag = "div") =>
  defineComponent({
    setup:
      (_p, { slots }) =>
      () =>
        h(tag, slots.default?.()),
  });

vi.mock("@/layout/AppTopbar.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return { default: defineComponent({ setup: () => () => h("div") }) };
});

vi.mock("@/layout/AppMenu.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return { default: defineComponent({ setup: () => () => h("div") }) };
});

vi.mock("@/components/Auth.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return { default: defineComponent({ setup: () => () => h("div") }) };
});

// Mimics PrimeVue's Toast: renders the custom message slot and a close
// control that emits `close`, like the real component does.
const ToastStub = defineComponent({
  props: { group: String },
  emits: ["close"],
  setup(props, { slots, emit }) {
    return () =>
      h("div", { "data-toast-group": props.group ?? "default" }, [
        props.group === "pwa-update"
          ? slots.message?.({
              message: { detail: "A new version is available." },
            })
          : null,
        h("button", {
          "data-testid": `close-${props.group ?? "default"}`,
          onClick: () => emit("close", { message: {} }),
        }),
      ]);
  },
});

const ButtonStub = defineComponent({
  props: { label: String },
  setup(props, { attrs }) {
    return () =>
      h("button", { onClick: attrs.onClick as () => void }, props.label);
  },
});

async function flush() {
  // Microtask-only so it also works under fake timers.
  await nextTick();
  await nextTick();
}

function updateToasts() {
  return mocks.toastAdd.mock.calls
    .map(([toast]) => toast)
    .filter((toast) => toast.group === "pwa-update");
}

describe("App PWA update prompt (RT-026)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  async function mountApp() {
    app = createApp(App);
    app.config.globalProperties.$primevue = { config: {} };
    for (const name of ["Card", "ConfirmPopup"]) app.component(name, stub());
    app.component("Toast", ToastStub);
    app.component("Button", ButtonStub);
    app.component("router-view", stub());
    app.mount(root);
    await flush();
  }

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    needRefresh = ref(false);
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
    root.remove();
  });

  it("shows no update toast when no update is pending", async () => {
    await mountApp();
    expect(updateToasts()).toHaveLength(0);
  });

  it("adds one persistent, closable update toast when an update is pending", async () => {
    await mountApp();
    needRefresh.value = true;
    await flush();

    expect(updateToasts()).toHaveLength(1);
    expect(updateToasts()[0]).toMatchObject({
      group: "pwa-update",
      life: 0,
      closable: true,
    });
  });

  it("does not add duplicate update toasts while one is shown", async () => {
    await mountApp();
    needRefresh.value = true;
    await flush();
    needRefresh.value = false;
    await flush();
    needRefresh.value = true;
    await flush();

    expect(updateToasts()).toHaveLength(1);
  });

  it("is non-blocking: renders no modal, mask, or dialog for the update prompt", async () => {
    await mountApp();
    needRefresh.value = true;
    await flush();

    expect(
      root.querySelector('[role="dialog"], .p-dialog, .p-dialog-mask'),
    ).toBeNull();
    expect(mocks.updateServiceWorker).not.toHaveBeenCalled();
  });

  it("closing the update toast does not apply the update", async () => {
    await mountApp();
    needRefresh.value = true;
    await flush();

    (
      root.querySelector(
        '[data-testid="close-pwa-update"]',
      ) as HTMLButtonElement
    ).click();
    await flush();

    expect(mocks.updateServiceWorker).not.toHaveBeenCalled();
    expect(needRefresh.value).toBe(true);
  });

  it("shows the prompt again after a close when the app reloads with the update still pending", async () => {
    await mountApp();
    needRefresh.value = true;
    await flush();
    (
      root.querySelector(
        '[data-testid="close-pwa-update"]',
      ) as HTMLButtonElement
    ).click();
    await flush();
    app?.unmount();

    // Next app load: a fresh registration reports the waiting worker again.
    mocks.toastAdd.mockClear();
    app = undefined;
    needRefresh = ref(false);
    await mountApp();
    needRefresh.value = true;
    await flush();

    expect(updateToasts()).toHaveLength(1);
  });

  it("re-adds the prompt in the same session after a close while the update is pending", async () => {
    await mountApp();
    needRefresh.value = true;
    await flush();
    (
      root.querySelector(
        '[data-testid="close-pwa-update"]',
      ) as HTMLButtonElement
    ).click();
    await flush();

    // The exact delay / trigger is an implementation choice (spec RT-026);
    // a later needRefresh change must at least be able to show the toast again.
    needRefresh.value = false;
    await flush();
    needRefresh.value = true;
    await flush();

    expect(updateToasts()).toHaveLength(2);
  });

  it("re-adds the prompt after the re-prompt delay while the update is still pending", async () => {
    vi.useFakeTimers();
    try {
      await mountApp();
      needRefresh.value = true;
      await nextTick();
      await nextTick();
      (
        root.querySelector(
          '[data-testid="close-pwa-update"]',
        ) as HTMLButtonElement
      ).click();
      await nextTick();
      await nextTick();
      expect(updateToasts()).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
      expect(updateToasts()).toHaveLength(2);
      expect(mocks.updateServiceWorker).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not re-add the prompt after the delay once no update is pending", async () => {
    vi.useFakeTimers();
    try {
      await mountApp();
      needRefresh.value = true;
      await nextTick();
      await nextTick();
      (
        root.querySelector(
          '[data-testid="close-pwa-update"]',
        ) as HTMLButtonElement
      ).click();
      needRefresh.value = false;
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
      expect(updateToasts()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("Update now removes the toast group and applies the update once", async () => {
    await mountApp();
    needRefresh.value = true;
    await flush();

    const button = Array.from(root.querySelectorAll("button")).find(
      (b) => b.textContent === "Update now",
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    await flush();

    expect(mocks.toastRemoveGroup).toHaveBeenCalledWith("pwa-update");
    expect(mocks.updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(mocks.updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
