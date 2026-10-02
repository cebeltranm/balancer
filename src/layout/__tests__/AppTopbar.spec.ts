// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";
import AppTopbar from "@/layout/AppTopbar.vue";
import { Currency } from "@/types";

vi.mock("@/components/TransactionTypeDialog.vue", () => ({
  default: defineComponent({
    setup() {
      return () => h("div");
    },
  }),
}));

const storageState = vi.hoisted(() => ({
  status: {
    inSync: false,
    syncFailed: false,
    loggedIn: false,
    offline: false,
  },
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    pendingToSync: {
      transactions: 0,
      files: 0,
    },
    status: storageState.status,
    sync: vi.fn(),
  }),
}));

const toolbarStub = defineComponent({
  setup(_, { slots }) {
    return () => h("div", [slots.start?.(), slots.end?.()]);
  },
});

const buttonStub = defineComponent({
  inheritAttrs: false,
  props: {
    icon: {
      type: String,
      default: "",
    },
  },
  setup(props, { attrs, slots }) {
    return () => h("button", attrs, [props.icon, slots.default?.()]);
  },
});

const menuStub = defineComponent({
  props: {
    model: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    return () =>
      h(
        "ul",
        (props.model as { label: string }[]).map((item) => h("li", item.label)),
      );
  },
});

describe("AppTopbar currencies", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("offers MXN and displays its uppercase currency code", () => {
    root = document.createElement("div");
    document.body.appendChild(root);
    app = createApp(AppTopbar);
    app.provide("CURRENCY", ref(Currency.MXN));
    app.component("Toolbar", toolbarStub);
    app.component("Button", buttonStub);
    app.component("Menu", menuStub);

    app.mount(root);

    expect(root.textContent).toContain("MXN");
    expect(
      Array.from(root.querySelectorAll("li")).map((item) => item.textContent),
    ).toContain("MXN");
  });

  it("shows an offline indicator only when logged in and offline", () => {
    const mountTopbar = () => {
      root = document.createElement("div");
      document.body.appendChild(root);
      app = createApp(AppTopbar);
      app.provide("CURRENCY", ref(Currency.USD));
      app.component("Toolbar", toolbarStub);
      app.component("Button", buttonStub);
      app.component("Menu", menuStub);
      app.mount(root);
    };

    storageState.status.loggedIn = true;
    storageState.status.offline = true;
    mountTopbar();
    expect(root.querySelector('[data-testid="offline-indicator"]')).not.toBe(
      null,
    );
    app?.unmount();
    root.remove();

    storageState.status.offline = false;
    mountTopbar();
    expect(root.querySelector('[data-testid="offline-indicator"]')).toBe(null);
  });
});
