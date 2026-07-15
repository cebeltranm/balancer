// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import format from "@/format";
import { AccountGroupType, AccountType } from "@/types";
import Expenses from "@/views/Expenses.vue";

const rateMocks = vi.hoisted(() => ({
  hasValue: vi.fn(() => false),
}));

vi.mock("@/components/PeriodSelector.vue", () => ({
  default: defineComponent({
    emits: ["update:period"],
    setup() {
      return () => h("div");
    },
  }),
}));

vi.mock("@/components/CommentsDialog.vue", () => ({
  default: defineComponent({
    setup() {
      return () => h("div");
    },
  }),
}));

const entries = Array.from({ length: 5 }, () => ({
  value: 0,
  in: 0,
  in_local: 0,
  out: 0,
  out_local: 0,
  expenses: 0,
  units: 0,
}));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    expensesByCategories: {
      Expenses: {},
    },
    accountsGroupByCategories: () => ({
      [AccountGroupType.Expenses]: {
        usd_food: {
          id: "usd_food",
          name: "USD Food",
          type: AccountType.Expense,
          currency: "usd",
        },
        eur_food: {
          id: "eur_food",
          name: "Euro Food",
          type: AccountType.Expense,
          currency: "eur",
        },
      },
    }),
  }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    status: {
      authenticated: true,
    },
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    loadBalanceForYear: vi.fn(),
    getBalanceGroupedByPeriods: () => ({
      usd_food: entries.map((entry) => ({ ...entry, value: 100 })),
      eur_food: entries.map((entry) => ({ ...entry, value: 50 })),
    }),
  }),
}));

vi.mock("@/stores/budget", () => ({
  useBudgetStore: () => ({
    getBudgetGrupedByPeriod: () => ({
      budget: {
        usd_food: [0, 0, 0, 0, 0],
        eur_food: [0, 0, 0, 0, 0],
      },
      comments: {
        usd_food: [[], [], [], [], []],
        eur_food: [[], [], [], [], []],
      },
    }),
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    getValue: () => 0,
    hasValue: rateMocks.hasValue,
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

const treeTableStub = defineComponent({
  props: {
    value: {
      type: Array,
      default: () => [],
    },
  },
  setup(props: any, { slots }) {
    const renderNode = (node: any): any[] => {
      const columns = slots.default?.() || [];
      return [
        ...columns.flatMap(
          (column: any) => column.children?.body?.({ node }) || [],
        ),
        ...(node.children || []).flatMap(renderNode),
      ];
    };
    return () =>
      h("div", [
        h("pre", JSON.stringify(props.value)),
        ...props.value.flatMap(renderNode),
      ]);
  },
});

const emptyStub = defineComponent({
  setup() {
    return () => h("div");
  },
});

describe("Expenses missing exchange rates", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    rateMocks.hasValue.mockReturnValue(false);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("shows a partial total with a visible missing-rate indicator listing affected accounts", async () => {
    app = createApp(Expenses);
    app.provide("CURRENCY", ref("usd"));
    app.config.globalProperties.$format = format;
    app.component("Toolbar", passthroughStub());
    app.component("Select", emptyStub);
    app.component("SelectButton", emptyStub);
    app.component("TreeTable", treeTableStub);
    app.component("Column", passthroughStub());
    app.component("ProgressBar", passthroughStub());
    app.component("Badge", emptyStub);
    app.component("GChart", emptyStub);
    app.component("Chart", emptyStub);

    app.mount(root);
    await nextTick();

    expect(root.textContent).toContain('"values":[100');
    expect(root.textContent).toContain("Missing rate");
    expect(root.textContent).toContain("eur");
    expect(root.textContent).toContain("eur_food");
  });

  it("does not show a missing-rate indicator for an explicit zero rate", async () => {
    rateMocks.hasValue.mockReturnValue(true);
    app = createApp(Expenses);
    app.provide("CURRENCY", ref("usd"));
    app.config.globalProperties.$format = format;
    app.component("Toolbar", passthroughStub());
    app.component("Select", emptyStub);
    app.component("SelectButton", emptyStub);
    app.component("TreeTable", treeTableStub);
    app.component("Column", passthroughStub());
    app.component("ProgressBar", passthroughStub());
    app.component("Badge", emptyStub);
    app.component("GChart", emptyStub);
    app.component("Chart", emptyStub);

    app.mount(root);
    await nextTick();

    expect(root.textContent).toContain('"values":[100');
    expect(root.textContent).not.toContain("Missing rate");
  });
});
