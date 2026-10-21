// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  Fragment,
  h,
  nextTick,
  ref,
  type VNode,
} from "vue";
import format from "@/format";
import { AccountGroupType, AccountType } from "@/types";
import Expenses from "@/views/Expenses.vue";

const mocks = vi.hoisted(() => ({
  show: vi.fn(),
  dialogReadOnly: undefined as unknown,
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
    props: { readOnly: { type: Boolean, default: false } },
    setup(props, { expose }) {
      expose({ show: mocks.show });
      return () => {
        mocks.dialogReadOnly = props.readOnly;
        return h("div");
      };
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

const comment = (m: string, d: number) => ({ m, d });
const manyComments = Array.from({ length: 10 }, (_, i) => comment(`c${i}`, i));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    expensesByCategories: {},
    accountsGroupByCategories: () => ({
      [AccountGroupType.Expenses]: {
        food: {
          id: "food",
          name: "Food",
          type: AccountType.Expense,
          currency: "usd",
        },
        rent: {
          id: "rent",
          name: "Rent",
          type: AccountType.Expense,
          currency: "usd",
        },
      },
    }),
  }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({ status: { authenticated: false } }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    loadBalanceForYear: vi.fn(),
    getBalanceGroupedByPeriods: () => ({
      food: entries.map((entry) => ({ ...entry, value: 100 })),
      rent: entries.map((entry) => ({ ...entry, value: 50 })),
    }),
  }),
}));

// food has a budget only for the current (0) and third (2) periods; rent has
// no budget at all. Comments: food has one in period 1, rent has one in
// period 1 and ten in period 2.
vi.mock("@/stores/budget", () => ({
  useBudgetStore: () => ({
    getBudgetGrupedByPeriod: () => ({
      budget: {
        food: [200, 0, 300, 0, 0],
        rent: [0, 0, 0, 0, 0],
      },
      comments: {
        food: [[], [comment("food note", 1)], [], [], []],
        rent: [[], [comment("rent note", 2)], manyComments, [], []],
      },
    }),
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
  inheritAttrs: false,
  setup() {
    return () => h("div");
  },
});

function flattenVNodes(nodes: VNode[]): VNode[] {
  return nodes.flatMap((node) =>
    node.type === Fragment && Array.isArray(node.children)
      ? flattenVNodes(node.children as VNode[])
      : [node],
  );
}

// Renders each node's body slot once per period column, tagging the output
// with the node key and period index.
const treeTableStub = defineComponent({
  props: { value: { type: Array, default: () => [] } },
  setup(props: any, { slots }) {
    const renderNode = (node: any): any[] => {
      const columns = flattenVNodes(slots.default?.() || []).filter(
        (column: any) => column.children?.body,
      );
      return [
        ...columns.map((column: any, index) =>
          h(
            "div",
            { "data-node": node.key, "data-index": index },
            column.children.body({ node }),
          ),
        ),
        ...(node.children || []).flatMap(renderNode),
      ];
    };
    return () => h("div", props.value.flatMap(renderNode));
  },
});

const progressBarStub = defineComponent({
  inheritAttrs: false,
  props: { value: { type: Number, default: 0 } },
  setup(props, { attrs }) {
    return () => h("div", { "data-progress": props.value, class: attrs.class });
  },
});

const badgeStub = defineComponent({
  inheritAttrs: false,
  props: { value: { type: [Number, String], default: "" } },
  setup(props, { attrs }) {
    return () => h("button", { "data-badge": props.value, ...attrs });
  },
});

describe("Expenses budget progress and comments", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(async () => {
    root = document.createElement("div");
    document.body.appendChild(root);
    mocks.show.mockReset();
    mocks.dialogReadOnly = undefined;

    app = createApp(Expenses);
    app.provide("CURRENCY", ref("usd"));
    app.config.globalProperties.$format = format;
    app.directive("tooltip", {});
    app.component("Toolbar", passthroughStub());
    app.component("Select", emptyStub);
    app.component("SelectButton", emptyStub);
    app.component("TreeTable", treeTableStub);
    app.component("Column", passthroughStub());
    app.component("ProgressBar", progressBarStub);
    app.component("Badge", badgeStub);
    app.component("GChart", emptyStub);
    app.component("Chart", emptyStub);
    app.mount(root);
    await nextTick();
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  function cell(node: string, index: number) {
    const el = root.querySelector(
      `[data-node="${node}"][data-index="${index}"]`,
    );
    expect(el).toBeTruthy();
    return el as HTMLElement;
  }

  function progressIndexes(node: string) {
    return [0, 1, 2, 3, 4].filter((index) =>
      cell(node, index).querySelector("[data-progress]"),
    );
  }

  it("renders a budget progress bar only for the periods that have a budget", () => {
    expect(progressIndexes("food")).toEqual([0, 2]);
    expect(progressIndexes("rent")).toEqual([]);
  });

  it("shows spent as a truncated percentage of the budget, and the category sums its children's budgets", () => {
    expect(
      cell("food", 0)
        .querySelector("[data-progress]")
        ?.getAttribute("data-progress"),
    ).toBe("50");
    expect(
      cell("food", 2)
        .querySelector("[data-progress]")
        ?.getAttribute("data-progress"),
    ).toBe("33");
    // Category: spent 150 of a 200 budget in period 0; none elsewhere but 2.
    expect(
      cell(AccountGroupType.Expenses, 0)
        .querySelector("[data-progress]")
        ?.getAttribute("data-progress"),
    ).toBe("75");
  });

  it("renders a comment badge only for periods that have comments", () => {
    const badgeIndexes = (node: string) =>
      [0, 1, 2, 3, 4].filter((i) =>
        cell(node, i).querySelector("[data-badge]"),
      );
    expect(badgeIndexes("food")).toEqual([1]);
    expect(badgeIndexes("rent")).toEqual([1, 2]);
  });

  it("caps the badge count at +9", () => {
    expect(
      cell("rent", 1).querySelector("[data-badge]")?.getAttribute("data-badge"),
    ).toBe("1");
    expect(
      cell("rent", 2).querySelector("[data-badge]")?.getAttribute("data-badge"),
    ).toBe("+9");
  });

  it("opens the read-only comments dialog with the row's comments when the badge is clicked", () => {
    expect(mocks.dialogReadOnly).toBe(true);

    (cell("food", 1).querySelector("[data-badge]") as HTMLElement).click();

    expect(mocks.show).toHaveBeenCalledTimes(1);
    expect(mocks.show).toHaveBeenCalledWith(
      [comment("food note", 1)],
      expect.any(Event),
    );
  });

  it("shows the concatenated children's comments on the category badge", () => {
    const badge = cell(AccountGroupType.Expenses, 1).querySelector(
      "[data-badge]",
    ) as HTMLElement;
    expect(badge.getAttribute("data-badge")).toBe("2");

    badge.click();

    expect(mocks.show).toHaveBeenCalledWith(
      [comment("food note", 1), comment("rent note", 2)],
      expect.any(Event),
    );
  });
});
