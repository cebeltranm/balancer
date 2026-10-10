// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import Budget from "@/views/Budget.vue";
import { AccountGroupType, AccountType } from "@/types";

const mocks = vi.hoisted(() => ({
  loadBudgetForYear: vi.fn(),
  setBudgetForYear: vi.fn(),
  emit: vi.fn(),
  cellEditComplete: undefined as undefined | ((event: any) => void),
  rows: [] as any[],
}));

// Every month is filled: Budget.vue coerces empty (null) months to 0 on any
// inline edit, which would otherwise mark the row pending by itself.
const FULL_YEAR_RENT = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, 100]),
);

vi.mock("@/stores/budget", () => ({
  useBudgetStore: () => ({
    budget: {},
    comments: {},
    loadBudgetForYear: mocks.loadBudgetForYear,
    setBudgetForYear: mocks.setBudgetForYear,
  }),
}));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    accountsGroupByCategories: (groups: string[]) =>
      groups.includes(AccountGroupType.Expenses)
        ? {
            [AccountGroupType.Expenses]: {
              Home: {
                type: AccountType.Category,
                children: {
                  rent: {
                    id: "rent",
                    name: "Rent",
                    type: AccountType.Expense,
                    currency: "usd",
                  },
                },
              },
            },
          }
        : {},
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    joinValues: (_date: Date, _currency: string, totals: any[]) =>
      totals.reduce((sum, t) => sum + t.value, 0),
  }),
}));

vi.mock("@/helpers/events", () => ({
  EVENTS: { emit: mocks.emit },
  FORM_WITH_PENDING_EVENTS: "form-with-pending-canges",
}));

vi.mock("@/components/PeriodSelector.vue", () => ({
  default: { render: () => null },
}));

vi.mock("@/components/CommentsDialog.vue", () => ({
  default: { render: () => null },
}));

const FORM_WITH_PENDING_EVENTS = "form-with-pending-canges";

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

function emptyStub() {
  return defineComponent({
    inheritAttrs: false,
    setup() {
      return () => h("div");
    },
  });
}

const buttonStub = defineComponent({
  props: {
    label: { type: String, default: "" },
  },
  setup(props, { attrs }) {
    return () => h("button", attrs, props.label);
  },
});

// Renders one row per value and exposes the cell-edit-complete handler so
// tests can drive inline edits the way PrimeVue's DataTable reports them.
const dataTableStub = defineComponent({
  inheritAttrs: false,
  props: {
    value: { type: Array, default: () => [] },
    rowClass: { type: Function, default: undefined },
  },
  setup(props, { attrs }) {
    return () => {
      mocks.cellEditComplete = attrs.onCellEditComplete as any;
      mocks.rows = props.value as any[];
      return h(
        "table",
        (props.value as any[]).map((row) =>
          h("tr", { class: props.rowClass?.(row) }, row.name),
        ),
      );
    };
  },
});

async function flush() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

async function mountBudget(root: HTMLElement) {
  const app = createApp(Budget);
  app.provide("CURRENCY", { value: "usd" });
  app.directive("ripple", {});
  app.component("Toolbar", passthroughStub());
  app.component("Button", buttonStub);
  app.component("DataTable", dataTableStub);
  app.component("Column", emptyStub());
  app.component("ContextMenu", emptyStub());
  app.component("Badge", emptyStub());
  app.component("InputNumber", emptyStub());
  app.mount(root);
  await flush();
  return app;
}

function saveButton(root: HTMLElement) {
  return Array.from(root.querySelectorAll("button")).find(
    (button) => button.textContent === "Save",
  ) as HTMLButtonElement;
}

function editRent(month: number, value: number) {
  const row = mocks.rows.find((r) => r.id === "rent");
  mocks.cellEditComplete?.({ data: row, newData: { ...row, [month]: value } });
}

describe("Budget view (RT-009)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    mocks.cellEditComplete = undefined;
    mocks.rows = [];
    mocks.loadBudgetForYear.mockResolvedValue({ rent: FULL_YEAR_RENT });
    mocks.setBudgetForYear.mockResolvedValue(undefined);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("shows expense rows under their category with Save disabled until an edit", async () => {
    app = await mountBudget(root);

    expect(root.textContent).toContain("Home");
    expect(root.textContent).toContain("Rent");
    expect(saveButton(root).disabled).toBe(true);
  });

  it("marks an edited row pending, blocks navigation, and saves the yearly budget", async () => {
    app = await mountBudget(root);

    editRent(2, 150);
    await flush();

    expect(saveButton(root).disabled).toBe(false);
    expect(mocks.emit).toHaveBeenLastCalledWith(FORM_WITH_PENDING_EVENTS, true);
    const rentRow = Array.from(root.querySelectorAll("tr")).find(
      (tr) => tr.textContent === "Rent",
    );
    expect(rentRow?.className).toContain("bg-red-900");

    saveButton(root).click();
    await flush();

    expect(mocks.setBudgetForYear).toHaveBeenCalledTimes(1);
    const [year, values, comments] = mocks.setBudgetForYear.mock.calls[0];
    expect(typeof year).toBe("number");
    expect(values).toEqual({
      rent: { ...FULL_YEAR_RENT, 2: 150 },
    });
    expect(comments).toEqual({});
  });

  it("ignores negative inline values", async () => {
    app = await mountBudget(root);

    editRent(2, -5);
    await flush();

    expect(saveButton(root).disabled).toBe(true);
    expect(mocks.emit).not.toHaveBeenCalledWith(FORM_WITH_PENDING_EVENTS, true);
  });

  it("shows an error and keeps edits pending when the local queue write fails", async () => {
    mocks.setBudgetForYear.mockRejectedValue(
      new Error("IndexedDB unavailable"),
    );
    app = await mountBudget(root);

    editRent(2, 150);
    await flush();
    saveButton(root).click();
    await flush();

    expect(mocks.emit).toHaveBeenCalledWith("message", {
      severity: "error",
      summary: "Budget not saved",
      message: "The budget could not be saved locally. Please try again.",
    });
    const pendingEvents = mocks.emit.mock.calls.filter(
      ([name]) => name === FORM_WITH_PENDING_EVENTS,
    );
    expect(pendingEvents.at(-1)).toEqual([FORM_WITH_PENDING_EVENTS, true]);
    expect(saveButton(root).disabled).toBe(false);
  });
});
