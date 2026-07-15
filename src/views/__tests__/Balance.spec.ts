// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import Balance from "@/views/Balance.vue";

const storeMocks = vi.hoisted(() => ({
  authenticated: true,
  loadBalanceForYear: vi.fn(),
  getBalanceGroupedByPeriods: vi.fn(),
  forceRecalculateBalance: vi.fn(),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    status: {
      authenticated: storeMocks.authenticated,
    },
  }),
}));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    accounts: {
      cash_wallet: {
        id: "cash_wallet",
        name: "Wallet",
        type: "Cash",
        currency: "usd",
      },
    },
    getAccountGroupType: () => "Assets",
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    loadBalanceForYear: storeMocks.loadBalanceForYear,
    getBalanceGroupedByPeriods: storeMocks.getBalanceGroupedByPeriods,
    forceRecalculateBalance: storeMocks.forceRecalculateBalance,
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    getValue: () => 1,
  }),
}));

function passthroughStub(tag = "div") {
  return defineComponent({
    inheritAttrs: false,
    setup(_, { slots }) {
      return () =>
        h(
          tag,
          Object.values(slots).flatMap((slot) => slot?.() || []),
        );
    },
  });
}

function emptyStub(tag = "div") {
  return defineComponent({
    inheritAttrs: false,
    setup() {
      return () => h(tag);
    },
  });
}

const periodSelectorStub = defineComponent({
  emits: ["update:period"],
  setup() {
    return () => h("div");
  },
});

const buttonStub = defineComponent({
  props: {
    label: {
      type: String,
      default: "",
    },
  },
  setup(props, { attrs }) {
    return () => h("button", attrs, props.label);
  },
});

describe("Balance view", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    storeMocks.authenticated = true;
    storeMocks.loadBalanceForYear.mockResolvedValue({});
    storeMocks.getBalanceGroupedByPeriods.mockReturnValue({});
    storeMocks.forceRecalculateBalance.mockResolvedValue({ warnings: [] });
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("shows an authenticated force-recalculate action", async () => {
    app = createApp(Balance);
    app.provide("CURRENCY", "usd");
    app.component("PeriodSelector", periodSelectorStub);
    app.component("Toolbar", passthroughStub());
    app.component("Select", emptyStub());
    app.component("SelectButton", emptyStub());
    app.component("DataTable", emptyStub());
    app.component("Column", emptyStub());
    app.component("Button", buttonStub);
    app.component("Message", passthroughStub());

    app.mount(root);
    await nextTick();
    await Promise.resolve();

    const forceAction = Array.from(root.querySelectorAll("button")).find(
      (button) => /recalculate/i.test(button.textContent || ""),
    );

    expect(forceAction).toBeTruthy();
  });

  it("hides the force-recalculate action when unauthenticated", async () => {
    storeMocks.authenticated = false;
    app = createApp(Balance);
    app.provide("CURRENCY", "usd");
    app.component("PeriodSelector", periodSelectorStub);
    app.component("Toolbar", passthroughStub());
    app.component("Select", emptyStub());
    app.component("SelectButton", emptyStub());
    app.component("DataTable", emptyStub());
    app.component("Column", emptyStub());
    app.component("Button", buttonStub);
    app.component("Message", passthroughStub());

    app.mount(root);
    await nextTick();
    await Promise.resolve();

    const forceAction = Array.from(root.querySelectorAll("button")).find(
      (button) => /recalculate/i.test(button.textContent || ""),
    );

    expect(forceAction).toBeUndefined();
  });

  it("shows missing source warnings returned by force recalculation", async () => {
    storeMocks.forceRecalculateBalance.mockResolvedValue({
      warnings: [
        {
          message:
            "transactions_2026_5.json is missing. Recalculated balances may be incomplete.",
        },
      ],
    });
    app = createApp(Balance);
    app.provide("CURRENCY", "usd");
    app.component("PeriodSelector", periodSelectorStub);
    app.component("Toolbar", passthroughStub());
    app.component("Select", emptyStub());
    app.component("SelectButton", emptyStub());
    app.component("DataTable", emptyStub());
    app.component("Column", emptyStub());
    app.component("Button", buttonStub);
    app.component("Message", passthroughStub());

    app.mount(root);
    await nextTick();
    await Promise.resolve();

    const forceAction = Array.from(root.querySelectorAll("button")).find(
      (button) => /recalculate/i.test(button.textContent || ""),
    );
    forceAction?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await nextTick();
    await Promise.resolve();
    await nextTick();

    expect(root.textContent).toContain(
      "Recalculated balances may be incomplete.",
    );
    expect(root.textContent).toContain("transactions_2026_5.json is missing");
  });
});
