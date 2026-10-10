// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Comment,
  createApp,
  defineComponent,
  Fragment,
  h,
  nextTick,
  reactive,
  type VNode,
} from "vue";
import Transactions from "@/views/Transactions.vue";
import format from "@/format";
import { getCurrentPeriod } from "@/helpers/options";

const { year, month } = getCurrentPeriod();

const mocks = vi.hoisted(() => ({
  transactions: {} as Record<number, Record<number, any[]>>,
  deleteTransaction: vi.fn(),
  loadTransactionsForMonth: vi.fn(),
  emit: vi.fn(),
  confirmRequire: vi.fn(),
  dialogShow: vi.fn(),
  queryAccounts: ["cash"] as string[],
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: { accounts: mocks.queryAccounts } }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: mocks.confirmRequire }),
}));

vi.mock("@/helpers/events", () => ({
  EVENTS: { emit: mocks.emit },
}));

vi.mock("@/stores/transactions", () => ({
  useTransactionsStore: () => ({
    get transactions() {
      return mocks.transactions;
    },
    deleteTransaction: mocks.deleteTransaction,
    loadTransactionsForMonth: mocks.loadTransactionsForMonth,
  }),
}));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    accounts: {
      cash: { id: "cash", currency: "usd", type: "Cash" },
      food: { id: "food", currency: "usd", type: "Expense" },
    },
    getAccountFullName: (id: string) => `Name:${id}`,
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    balance: {},
    loadBalanceForYear: vi.fn(),
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    joinValues: (_date: Date, _currency: string, totals: any[]) =>
      totals.reduce((sum, t) => sum + t.value, 0),
  }),
}));

vi.mock("@/components/AccountsSelector.vue", () => ({
  default: { render: () => null },
}));

vi.mock("@/components/PeriodSelector.vue", () => ({
  default: { render: () => null },
}));

vi.mock("@/components/TransactionEditDialog.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent({
      props: { transaction: { type: Object, default: undefined } },
      setup(props, { expose }) {
        expose({ show: mocks.dialogShow });
        return () =>
          h(
            "div",
            { class: "edit-dialog" },
            props.transaction?.description ?? "",
          );
      },
    }),
  };
});

function flattenVNodes(nodes: VNode[]): VNode[] {
  return nodes.flatMap((node) =>
    node.type === Fragment && Array.isArray(node.children)
      ? flattenVNodes(node.children as VNode[])
      : [node],
  );
}

const dataTableStub = defineComponent({
  inheritAttrs: false,
  props: {
    value: { type: Array, default: () => [] },
    rowClass: { type: Function, default: undefined },
  },
  setup(props, { slots }) {
    return () => {
      const columns = flattenVNodes(slots.default?.() || []).filter(
        (column) => column.type !== Comment,
      );
      return h(
        "table",
        h(
          "tbody",
          (props.value as Record<string, any>[]).map((row) =>
            h(
              "tr",
              { class: props.rowClass?.(row) },
              columns.map((column) => {
                const body = (column.children as Record<string, unknown> | null)
                  ?.body as ((scope: unknown) => VNode[]) | undefined;
                const field = column.props?.field;
                return h(
                  "td",
                  body
                    ? body({ data: row })
                    : field
                      ? String(row[field] ?? "")
                      : "",
                );
              }),
            ),
          ),
        ),
      );
    };
  },
});

const passthroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { slots }) {
    return () =>
      h(
        "div",
        Object.values(slots).flatMap((slot) => slot?.() || []),
      );
  },
});

const buttonStub = defineComponent({
  props: { icon: { type: String, default: "" } },
  setup(props, { attrs }) {
    return () => h("button", { ...attrs, "data-icon": props.icon });
  },
});

const emptyStub = defineComponent({
  inheritAttrs: false,
  setup() {
    return () => h("span");
  },
});

async function flush() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

async function mountTransactions(root: HTMLElement) {
  const app = createApp(Transactions);
  app.config.globalProperties.$format = format;
  app.provide("CURRENCY", { value: "usd" });
  app.component("Toolbar", passthroughStub);
  app.component("DataTable", dataTableStub);
  app.component("Column", emptyStub);
  app.component("Button", buttonStub);
  app.component("Chip", emptyStub);
  app.mount(root);
  await flush();
  return app;
}

function rows(root: HTMLElement) {
  return Array.from(root.querySelectorAll("tbody tr")) as HTMLElement[];
}

describe("Transactions view", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  const groceries = {
    id: 1,
    date: `${year}-${String(month).padStart(2, "0")}-01`,
    description: "Groceries",
    values: [
      { accountId: "food", value: 10, accountValue: 10 },
      { accountId: "cash", value: -10, accountValue: -10 },
    ],
  };
  const pendingTaxi = {
    id: 2,
    date: `${year}-${String(month).padStart(2, "0")}-02`,
    description: "Taxi ride",
    to_sync: true,
    values: [
      { accountId: "food", value: 5, accountValue: 5 },
      { accountId: "cash", value: -5, accountValue: -5 },
    ],
  };
  const deletedRefund = {
    id: 3,
    date: `${year}-${String(month).padStart(2, "0")}-03`,
    description: "Deleted refund",
    deleted: true,
    values: [
      { accountId: "food", value: -7, accountValue: -7 },
      { accountId: "cash", value: 7, accountValue: 7 },
    ],
  };

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    mocks.queryAccounts = ["cash"];
    // Pinia store state is reactive; mirror that so view updates show up.
    mocks.transactions = reactive({
      [year]: {
        [month]: [
          structuredClone(groceries),
          structuredClone(pendingTaxi),
          structuredClone(deletedRefund),
        ],
      },
    });
    mocks.deleteTransaction.mockResolvedValue(undefined);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("lists the selected account's rows for the month and hides deleted transactions", async () => {
    app = await mountTransactions(root);

    const listed = rows(root);
    expect(listed).toHaveLength(2);
    expect(root.textContent).toContain("Groceries");
    expect(root.textContent).toContain("Taxi ride");
    expect(root.textContent).not.toContain("Deleted refund");
    // Values come from the selected cash account, not the food leg.
    expect(root.textContent).toContain("-$10.00");
    expect(root.textContent).toContain("-$5.00");
    expect(root.textContent).not.toContain("$7.00");
  });

  it("marks transactions pending sync", async () => {
    app = await mountTransactions(root);

    const taxiRow = rows(root).find((tr) =>
      tr.textContent?.includes("Taxi ride"),
    );
    const groceriesRow = rows(root).find((tr) =>
      tr.textContent?.includes("Groceries"),
    );
    expect(taxiRow?.className).toContain("bg-red-900");
    expect(groceriesRow?.className).not.toContain("bg-red-900");
  });

  it("opens the edit dialog with the selected transaction", async () => {
    app = await mountTransactions(root);

    const groceriesRow = rows(root).find((tr) =>
      tr.textContent?.includes("Groceries"),
    );
    (
      groceriesRow?.querySelector('[data-icon="pi pi-pencil"]') as HTMLElement
    ).click();
    await flush();

    expect(mocks.dialogShow).toHaveBeenCalledTimes(1);
    expect(root.querySelector(".edit-dialog")?.textContent).toBe("Groceries");
  });

  it("deletes a transaction only after confirmation", async () => {
    app = await mountTransactions(root);

    const groceriesRow = rows(root).find((tr) =>
      tr.textContent?.includes("Groceries"),
    );
    (
      groceriesRow?.querySelector('[data-icon="pi pi-times"]') as HTMLElement
    ).click();
    await flush();

    expect(mocks.confirmRequire).toHaveBeenCalledTimes(1);
    expect(mocks.deleteTransaction).not.toHaveBeenCalled();

    await mocks.confirmRequire.mock.calls[0][0].accept();
    await flush();

    expect(mocks.deleteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, description: "Groceries" }),
    );
    expect(mocks.emit).toHaveBeenCalledWith("message", {
      message: "Transaction deleted",
    });
    expect(root.textContent).not.toContain("Groceries");
  });
});
