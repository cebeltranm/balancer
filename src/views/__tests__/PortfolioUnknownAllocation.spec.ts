// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import format from "@/format";
import { AccountGroupType, AccountType } from "@/types";
import Portfolio from "@/views/portafolio/index.vue";

// RT-017 decision: legacy investment accounts saved with a missing/empty
// `class` allocation must not be silently dropped from ByAssetClass/ByRegion
// analytics; they must be grouped under an "Unknown" bucket, and the UI must
// show a visible warning naming the affected accounts (specs/features/investments.md).

const entries = Array.from({ length: 5 }, () => ({
  value: 0,
  in: 0,
  in_local: 0,
  out: 0,
  out_local: 0,
  expenses: 0,
  units: 0,
}));

vi.mock("@/components/PeriodSelector.vue", () => ({
  default: defineComponent({
    emits: ["update:period"],
    setup() {
      return () => h("div");
    },
  }),
}));

vi.mock("@/components/AccountsSelector.vue", () => ({
  default: defineComponent({
    emits: ["update:accounts"],
    setup() {
      return () => h("div");
    },
  }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    status: {
      authenticated: true,
    },
  }),
}));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    accountsGroupByCategories: () => ({}),
    activeAccounts: () => [
      {
        id: "allocated",
        name: "Allocated Fund",
        type: AccountType.ETF,
        currency: "usd",
        class: { Equities: { US: 1 } },
      },
      {
        id: "legacy_no_allocation",
        name: "Legacy Fund",
        type: AccountType.ETF,
        currency: "usd",
        // No `class` allocation: this is the legacy/missing-allocation case.
      },
    ],
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    loadBalanceForYear: vi.fn(),
    getBalanceGroupedByPeriods: () => ({
      allocated: entries.map((entry) => ({ ...entry, value: 100 })),
      legacy_no_allocation: entries.map((entry) => ({ ...entry, value: 50 })),
    }),
  }),
}));

vi.mock("@/stores/config", () => ({
  useConfigStore: () => ({
    invCompositionByAssetClass: {},
    invCompositionByRegion: {},
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    getValue: () => 1,
    hasValue: () => true,
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

const emptyStub = defineComponent({
  setup() {
    return () => h("div");
  },
});

// SelectButton drives `displayType` via v-model; emitting during setup moves
// the view straight to the "pie" display, which is the only display type
// that groups investments ByAssetClass/ByRegion using each account's `class`.
const selectButtonToPieStub = defineComponent({
  props: ["modelValue"],
  emits: ["update:modelValue"],
  setup(_, { emit }) {
    emit("update:modelValue", "pie");
    return () => h("div");
  },
});

const treeTableStub = defineComponent({
  props: {
    value: {
      type: Array,
      default: () => [],
    },
  },
  setup(props: any) {
    return () => h("pre", JSON.stringify(props.value));
  },
});

describe("Portfolio ByAssetClass grouping for legacy missing allocation (RT-017)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("groups a legacy account with no class allocation under Unknown instead of dropping it, and does not drop its value from the total", async () => {
    app = createApp(Portfolio);
    app.provide("CURRENCY", ref("usd"));
    app.config.globalProperties.$format = format;
    app.component("Toolbar", passthroughStub());
    app.component("Select", emptyStub);
    app.component("SelectButton", selectButtonToPieStub);
    app.component("GChart", emptyStub);
    app.component("TreeTable", treeTableStub);
    app.component("Column", passthroughStub());
    app.component("Avatar", emptyStub);
    app.directive("tooltip", {});

    app.mount(root);
    await nextTick();
    await nextTick();
    await nextTick();

    // The legacy account's full value (50) must still be represented
    // somewhere in the ByAssetClass grouping under an "Unknown" bucket,
    // instead of being excluded entirely because it has no `class`.
    expect(root.textContent).toContain('"name":"Unknown"');
    expect(root.textContent).toContain('"value":50');
    // The allocated account's own asset class must still be grouped normally.
    expect(root.textContent).toContain('"name":"Equities"');
  });

  it("shows a visible warning naming accounts with missing/incomplete allocation", async () => {
    app = createApp(Portfolio);
    app.provide("CURRENCY", ref("usd"));
    app.config.globalProperties.$format = format;
    app.component("Toolbar", passthroughStub());
    app.component("Select", emptyStub);
    app.component("SelectButton", selectButtonToPieStub);
    app.component("GChart", emptyStub);
    app.component("TreeTable", treeTableStub);
    app.component("Column", passthroughStub());
    app.component("Avatar", emptyStub);
    app.directive("tooltip", {});

    app.mount(root);
    await nextTick();
    await nextTick();
    await nextTick();

    expect(root.textContent).toContain("legacy_no_allocation");
    expect(root.textContent?.toLowerCase()).toMatch(
      /unknown|unallocated|missing allocation/,
    );
  });
});
