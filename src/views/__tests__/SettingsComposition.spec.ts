// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import Settings from "@/views/Settings.vue";

const mocks = vi.hoisted(() => ({
  saveConfig: vi.fn(),
  config: {} as any,
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock("@/stores/config", () => ({
  useConfigStore: () => ({
    get config() {
      return mocks.config;
    },
    loadConfig: vi.fn().mockResolvedValue(undefined),
    saveConfig: mocks.saveConfig,
  }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    storeInfo: { type: "HttpServer", loggedIn: true, offline: false },
    status: {},
    login: vi.fn(),
    refreshStoreInfo: vi.fn().mockResolvedValue(undefined),
    resetLocalCredentials: vi.fn(),
  }),
}));

const passthrough = (tag: string) =>
  defineComponent({
    setup(_props, { slots }) {
      return () =>
        h(tag, [
          slots.title?.(),
          slots.content?.(),
          slots.default?.(),
          slots.footer?.(),
        ]);
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

async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

describe("Settings composition save (RT-019)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  async function mountAndSave(config: any) {
    mocks.config = config;
    app = createApp(Settings);
    for (const name of [
      "Card",
      "Message",
      "Tabs",
      "TabPanel",
      "Column",
      "DataTable",
      "InputNumber",
      "InputText",
      "Select",
    ]) {
      app.component(name, passthrough("div"));
    }
    app.component("Button", ButtonStub);
    app.mount(root);
    await flush();
    const save = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === "Save settings",
    ) as HTMLButtonElement;
    expect(save).toBeTruthy();
    save.click();
    await flush();
  }

  function savedComposition() {
    expect(mocks.saveConfig).toHaveBeenCalledTimes(1);
    return mocks.saveConfig.mock.calls[0][0].inv_composition;
  }

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    mocks.saveConfig.mockResolvedValue(true);
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
    root.remove();
  });

  it("omits zero-valued cells, empty regions, and all-zero asset classes on save", async () => {
    await mountAndSave({
      stock_api: {},
      inv_composition: {
        Equities: { US: { ETF: 0.6, MutualFund: 0 }, Europe: { ETF: 0.4 } },
      },
    });

    expect(savedComposition()).toEqual({
      Equities: { US: { ETF: 0.6 }, Europe: { ETF: 0.4 } },
    });
  });

  it("compacts a config that stored explicit zeros once the user saves", async () => {
    await mountAndSave({
      stock_api: {},
      inv_composition: {
        Equities: { US: { ETF: 1, MutualFund: 0 }, Global: { ETF: 0 } },
        Cash: { US: { ETF: 0, MutualFund: 0 } },
      },
    });

    expect(savedComposition()).toEqual({ Equities: { US: { ETF: 1 } } });
  });

  it("round-trips a sparse config unchanged, reading missing cells as zero", async () => {
    const sparse = {
      Equities: { US: { ETF: 0.55 } },
      Cash: { Europe: { MutualFund: 0.45 } },
    };
    await mountAndSave({ stock_api: {}, inv_composition: sparse });

    expect(savedComposition()).toEqual(sparse);
  });

  it("keeps decimal scaling and preserves other config fields", async () => {
    await mountAndSave({
      stock_api: { type: "rapidapi" },
      other_field: "kept",
      inv_composition: { Equities: { US: { ETF: 0.25, MutualFund: 0.75 } } },
    });

    const saved = mocks.saveConfig.mock.calls[0][0];
    expect(saved.other_field).toBe("kept");
    expect(saved.inv_composition).toEqual({
      Equities: { US: { ETF: 0.25, MutualFund: 0.75 } },
    });
  });
});
