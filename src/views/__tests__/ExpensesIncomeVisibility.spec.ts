// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import format from "@/format";
import { AccountGroupType, AccountType } from "@/types";
import Expenses from "@/views/Expenses.vue";

// RT-016: income is sensitive data and must be visible only after local
// device authentication (storageStore.status.authenticated), not merely
// because a data-loading path happens to require it. These tests mount
// the real Expenses.vue and assert on rendered output for both states.

const storageMocks = vi.hoisted(() => ({
  authenticated: false,
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
    accountsGroupByCategories: (groups: string[]) => {
      const result: Record<string, any> = {};
      if (groups.includes(AccountGroupType.Expenses)) {
        result[AccountGroupType.Expenses] = {
          usd_food: {
            id: "usd_food",
            name: "USD Food",
            type: AccountType.Expense,
            currency: "usd",
          },
        };
      }
      if (groups.includes(AccountGroupType.Incomes)) {
        result[AccountGroupType.Incomes] = {
          usd_salary: {
            id: "usd_salary",
            name: "USD Salary",
            type: AccountType.Income,
            currency: "usd",
          },
        };
      }
      return result;
    },
  }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    status: {
      authenticated: storageMocks.authenticated,
    },
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    loadBalanceForYear: vi.fn(),
    getBalanceGroupedByPeriods: () => ({
      usd_food: entries.map((entry) => ({ ...entry, value: 100 })),
      usd_salary: entries.map((entry) => ({ ...entry, value: 500 })),
    }),
  }),
}));

vi.mock("@/stores/budget", () => ({
  useBudgetStore: () => ({
    getBudgetGrupedByPeriod: () => ({
      budget: {
        usd_food: [0, 0, 0, 0, 0],
        usd_salary: [0, 0, 0, 0, 0],
      },
      comments: {
        usd_food: [[], [], [], [], []],
        usd_salary: [[], [], [], [], []],
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

function mountExpenses(root: HTMLDivElement) {
  const app = createApp(Expenses);
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
  return app;
}

describe("Expenses income visibility (RT-016)", () => {
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

  it("hides income when the user is not locally authenticated", async () => {
    storageMocks.authenticated = false;
    app = mountExpenses(root);
    await nextTick();

    expect(root.textContent).toContain("USD Food");
    expect(root.textContent).not.toContain("USD Salary");
    expect(root.textContent).not.toContain("Incomes");
  });

  it("shows income alongside expenses when the user is locally authenticated", async () => {
    storageMocks.authenticated = true;
    app = mountExpenses(root);
    await nextTick();

    expect(root.textContent).toContain("USD Food");
    expect(root.textContent).toContain("USD Salary");
    expect(root.textContent).toContain("Incomes");
  });
});
