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
  handlers: {} as Record<string, (...args: any[]) => void>,
  accountsSelectorEmit: undefined as
    | ((event: string, ...args: any[]) => void)
    | undefined,
  periodSelectorEmit: undefined as
    | ((event: string, ...args: any[]) => void)
    | undefined,
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: { accounts: mocks.queryAccounts } }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: mocks.confirmRequire }),
}));

vi.mock("@/helpers/events", () => ({
  EVENTS: {
    emit: mocks.emit,
    on: (event: string, handler: (...args: any[]) => void) => {
      mocks.handlers[event] = handler;
    },
    off: (event: string, handler: (...args: any[]) => void) => {
      if (mocks.handlers[event] === handler) {
        delete mocks.handlers[event];
      }
    },
  },
  TRANSACTION_SAVED: "transaction-saved",
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
  default: {
    emits: ["update:accounts"],
    setup(_: unknown, { emit }: { emit: (...args: any[]) => void }) {
      mocks.accountsSelectorEmit = emit;
      return () => null;
    },
  },
}));

vi.mock("@/components/PeriodSelector.vue", () => ({
  default: {
    emits: ["update:period"],
    setup(_: unknown, { emit }: { emit: (...args: any[]) => void }) {
      mocks.periodSelectorEmit = emit;
      return () => null;
    },
  },
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
    selection: { type: Array, default: () => [] },
    dataKey: { type: String, default: undefined },
  },
  emits: ["update:selection"],
  setup(props, { slots, emit }) {
    const keyOf = (row: Record<string, any>) =>
      props.dataKey ? row[props.dataKey] : row;
    const isSelected = (row: Record<string, any>) =>
      (props.selection as Record<string, any>[]).some(
        (selected) => keyOf(selected) === keyOf(row),
      );
    const toggle = (row: Record<string, any>) =>
      emit(
        "update:selection",
        isSelected(row)
          ? (props.selection as Record<string, any>[]).filter(
              (selected) => keyOf(selected) !== keyOf(row),
            )
          : [...(props.selection as Record<string, any>[]), row],
      );
    return () => {
      const columns = flattenVNodes(slots.default?.() || []).filter(
        (column) => column.type !== Comment,
      );
      return h(
        "table",
        { "data-selected": String(props.selection.length) },
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
                if (column.props?.selectionMode) {
                  return h(
                    "td",
                    h("input", {
                      type: "checkbox",
                      checked: isSelected(row),
                      onClick: () => toggle(row),
                    }),
                  );
                }
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

function rowWith(root: HTMLElement, text: string) {
  return rows(root).find((tr) => tr.textContent?.includes(text));
}

function checkbox(row: HTMLElement | undefined) {
  return row?.querySelector('input[type="checkbox"]') as HTMLInputElement;
}

function selectedCount(root: HTMLElement) {
  return Number(root.querySelector("table")?.getAttribute("data-selected"));
}

async function selectRow(root: HTMLElement, text: string) {
  checkbox(rowWith(root, text)).click();
  await flush();
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
    mocks.handlers = {};
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

  it("marks transactions pending sync with an icon instead of a red row (RT-053)", async () => {
    app = await mountTransactions(root);

    const taxiRow = rowWith(root, "Taxi ride");
    const groceriesRow = rowWith(root, "Groceries");
    expect(taxiRow?.querySelector('[title="Pending sync"]')).not.toBeNull();
    expect(groceriesRow?.querySelector('[title="Pending sync"]')).toBeNull();
    expect(taxiRow?.className ?? "").not.toContain("bg-red-900");
    expect(groceriesRow?.className ?? "").not.toContain("bg-red-900");
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

  describe("reconciliation selection", () => {
    it("highlights only the checked row in green (RT-052)", async () => {
      app = await mountTransactions(root);

      await selectRow(root, "Groceries");
      expect(rowWith(root, "Groceries")?.className).toContain("bg-green-900");
      expect(rowWith(root, "Taxi ride")?.className ?? "").not.toContain(
        "bg-green-900",
      );

      await selectRow(root, "Groceries");
      expect(rowWith(root, "Groceries")?.className ?? "").not.toContain(
        "bg-green-900",
      );
    });

    it("starts with no row selected, including pending rows (RT-055)", async () => {
      app = await mountTransactions(root);

      expect(selectedCount(root)).toBe(0);
      expect(checkbox(rowWith(root, "Taxi ride")).checked).toBe(false);
      expect(rowWith(root, "Taxi ride")?.className ?? "").not.toContain(
        "bg-green-900",
      );
    });

    it("selects a newly saved transaction and keeps the earlier selection (RT-054)", async () => {
      app = await mountTransactions(root);
      await selectRow(root, "Groceries");

      const coffee = {
        id: 20,
        date: `${year}-${String(month).padStart(2, "0")}-04`,
        description: "Coffee",
        to_sync: true,
        values: [
          { accountId: "food", value: 3, accountValue: 3 },
          { accountId: "cash", value: -3, accountValue: -3 },
        ],
      };
      // saveTransaction() reloads the month, then emits TRANSACTION_SAVED.
      mocks.transactions[year][month] = [
        ...mocks.transactions[year][month].map((t) => ({ ...t })),
        coffee,
      ];
      await flush();
      mocks.handlers["transaction-saved"]?.(coffee);
      await flush();

      expect(checkbox(rowWith(root, "Groceries")).checked).toBe(true);
      expect(rowWith(root, "Groceries")?.className).toContain("bg-green-900");
      expect(checkbox(rowWith(root, "Coffee")).checked).toBe(true);
      expect(rowWith(root, "Coffee")?.className).toContain("bg-green-900");
      expect(checkbox(rowWith(root, "Taxi ride")).checked).toBe(false);
      expect(selectedCount(root)).toBe(2);
    });

    it("selects the replacement of an edited transaction (RT-054)", async () => {
      app = await mountTransactions(root);
      await selectRow(root, "Groceries");

      const edited = {
        ...structuredClone(groceries),
        id: 21,
        description: "Groceries edited",
        to_sync: true,
      };
      // Edit = delete original id + save replacement with a new id (RT-008).
      mocks.transactions[year][month] = [edited, structuredClone(pendingTaxi)];
      await flush();
      mocks.handlers["transaction-saved"]?.(edited);
      await flush();

      expect(checkbox(rowWith(root, "Groceries edited")).checked).toBe(true);
      expect(selectedCount(root)).toBe(1);
    });

    it("ignores a saved transaction that does not match the filters (RT-054)", async () => {
      app = await mountTransactions(root);
      await selectRow(root, "Groceries");

      mocks.handlers["transaction-saved"]?.({
        id: 22,
        date: `${year}-${String(month).padStart(2, "0")}-05`,
        description: "Other month",
        values: [],
      });
      await flush();

      expect(checkbox(rowWith(root, "Groceries")).checked).toBe(true);
      expect(selectedCount(root)).toBe(1);
    });

    it("clears the selection when the accounts change (RT-055)", async () => {
      app = await mountTransactions(root);
      await selectRow(root, "Groceries");

      mocks.accountsSelectorEmit?.("update:accounts", ["cash", "food"]);
      await flush();

      expect(rows(root).length).toBeGreaterThan(2);
      expect(selectedCount(root)).toBe(0);
      expect(
        rows(root).filter((tr) => tr.className.includes("bg-green-900")),
      ).toHaveLength(0);
    });

    it("clears the selection when the period changes (RT-055)", async () => {
      app = await mountTransactions(root);
      await selectRow(root, "Groceries");

      const other =
        month === 1
          ? { year: year - 1, month: 12 }
          : { year, month: month - 1 };
      mocks.periodSelectorEmit?.("update:period", {
        type: 0,
        value: { ...other, quarter: 1 },
      });
      await flush();
      mocks.periodSelectorEmit?.("update:period", {
        type: 0,
        value: { year, month, quarter: 1 },
      });
      await flush();

      expect(rows(root)).toHaveLength(2);
      expect(selectedCount(root)).toBe(0);
      expect(checkbox(rowWith(root, "Groceries")).checked).toBe(false);
    });

    it("drops a deleted transaction from the selection (RT-055)", async () => {
      app = await mountTransactions(root);
      await selectRow(root, "Groceries");
      await selectRow(root, "Taxi ride");

      (
        rowWith(root, "Groceries")?.querySelector(
          '[data-icon="pi pi-times"]',
        ) as HTMLElement
      ).click();
      await flush();
      await mocks.confirmRequire.mock.calls[0][0].accept();
      await flush();

      expect(root.textContent).not.toContain("Groceries");
      expect(selectedCount(root)).toBe(1);
      expect(checkbox(rowWith(root, "Taxi ride")).checked).toBe(true);
    });
  });
});
