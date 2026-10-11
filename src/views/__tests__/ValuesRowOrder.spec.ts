// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import Values from "@/views/Values.vue";
import { AccountGroupType, AccountType, Currency } from "@/types";

type Fixture = {
  id: string;
  name: string;
  entity?: string;
  type: AccountType;
  currency: Currency;
};

const state = vi.hoisted(() => ({
  accounts: [] as Fixture[],
  setValuesForMonth: vi.fn(),
}));

vi.mock("@/components/PeriodSelector.vue", () => ({
  default: defineComponent({
    emits: ["update:period"],
    setup() {
      return () => h("div");
    },
  }),
}));

vi.mock("@/helpers/options", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/helpers/options")>();
  return {
    ...actual,
    getCurrentPeriod: vi.fn(() => ({ year: 2026, month: 5, quarter: 2 })),
  };
});

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    activeAccounts: () => state.accounts,
    getAccountGroupType: (id: string) => {
      const type = state.accounts.find((a) => a.id === id)?.type;
      if (type === AccountType.Property) return AccountGroupType.FixedAssets;
      if (type === AccountType.BankAccount) return AccountGroupType.Assets;
      return AccountGroupType.Investments;
    },
  }),
}));

vi.mock("@/stores/config", () => ({
  useConfigStore: () => ({ config: {} }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    executeInSync: async (promise: Promise<unknown>) => promise,
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({ recalculateBalance: vi.fn() }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    values: {},
    getValue: vi.fn(() => 1),
    loadValuesForYear: vi.fn(),
    setValuesForMonth: state.setValuesForMonth,
  }),
}));

const table: { value: any[]; onEdit?: (event: unknown) => void } = {
  value: [],
};

const dataTableStub = defineComponent({
  inheritAttrs: false,
  props: { value: { type: Array, default: () => [] } },
  setup(props, { attrs, slots }) {
    return () => {
      table.value = props.value as any[];
      table.onEdit = attrs.onCellEditComplete as any;
      return h("div", [
        ...(props.value as any[]).map((row) =>
          h("div", { class: "row", "data-id": row.id }),
        ),
        slots.default?.(),
      ]);
    };
  },
});

const columnStub = defineComponent({
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => h("div", slots.filter?.({ filterModel: { value: null } }));
  },
});

const multiSelectStub = defineComponent({
  inheritAttrs: false,
  props: { options: { type: Array, default: () => [] } },
  setup(props) {
    return () =>
      h("div", {
        class: "filter-options",
        "data-options": JSON.stringify(props.options),
      });
  },
});

const buttonStub = defineComponent({
  props: {
    icon: { type: String, default: "" },
    label: { type: String, default: "" },
  },
  setup(props, { attrs }) {
    return () => h("button", attrs, props.label || props.icon);
  },
});

const toolbarStub = defineComponent({
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => h("div", [slots.start?.(), slots.end?.()]);
  },
});

const emptyStub = defineComponent({
  inheritAttrs: false,
  setup() {
    return () => h("div");
  },
});

function account(
  id: string,
  name: string,
  entity?: string,
  type: AccountType = AccountType.Stock,
): Fixture {
  return { id, name, entity, type, currency: Currency.USD };
}

function bank(id: string, currency: Currency): Fixture {
  return {
    id,
    name: id,
    type: AccountType.BankAccount,
    currency,
  };
}

describe("Values row order (RT-040)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  async function mountWith(accounts: Fixture[]) {
    state.accounts = accounts;
    app = createApp(Values);
    app.config.errorHandler = vi.fn();
    app.component("Toolbar", toolbarStub);
    app.component("Button", buttonStub);
    app.component("DataTable", dataTableStub);
    app.component("Column", columnStub);
    app.component("MultiSelect", multiSelectStub);
    app.component("InputNumber", emptyStub);
    app.directive("tooltip", {});
    app.mount(root);
    await nextTick();
  }

  function rowIds() {
    return Array.from(root.querySelectorAll(".row")).map((el) =>
      el.getAttribute("data-id"),
    );
  }

  function filterOptions(index: number): unknown[] {
    const el = root.querySelectorAll(".filter-options")[index];
    return JSON.parse(el.getAttribute("data-options") || "[]");
  }

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    state.setValuesForMonth.mockReset();
    table.value = [];
    table.onEdit = undefined;
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
    root.remove();
  });

  it("lists Currency rows first, ordered by currency code, then investments", async () => {
    await mountWith([
      bank("mxn_bank", Currency.MXN),
      account("stock_a", "Alpha", "Bank"),
      bank("cop_bank", Currency.COP),
    ]);

    expect(rowIds()).toEqual([
      `${Currency.COP}_usd`,
      `${Currency.MXN}_usd`,
      "stock_a",
    ]);
  });

  it("orders investment rows by entity, then name, ignoring case", async () => {
    await mountWith([
      account("z1", "Stock Z", "Zeta Bank"),
      account("a1", "Beta Fund", "alpha bank"),
      account("a2", "alpha Fund", "alpha bank"),
    ]);

    expect(rowIds()).toEqual(["a2", "a1", "z1"]);
  });

  it("treats entities or names that differ only by case or accents as equal and uses id", async () => {
    await mountWith([
      account("b", "Fondo", "Álamo"),
      account("a", "Fondo", "alamo"),
    ]);

    expect(rowIds()).toEqual(["a", "b"]);
  });

  it("orders digit runs numerically", async () => {
    await mountWith([
      account("f10", "Fund 10", "Bank"),
      account("f2", "Fund 2", "Bank"),
    ]);

    expect(rowIds()).toEqual(["f2", "f10"]);
  });

  it("places rows with a missing or blank entity after all rows with an entity, ordered by name", async () => {
    await mountWith([
      account("zed", "Zed"),
      account("abe", "Abe", "   "),
      account("zeta", "Zulu", "Zeta"),
    ]);

    expect(rowIds()).toEqual(["zeta", "abe", "zed"]);
  });

  it("breaks ties on entity and name by id", async () => {
    await mountWith([
      account("y", "Same", "Bank"),
      account("x", "Same", "Bank"),
    ]);

    expect(rowIds()).toEqual(["x", "y"]);
  });

  it("does not reorder rows when a value is edited", async () => {
    await mountWith([
      account("z1", "Stock Z", "Zeta Bank"),
      account("a1", "Stock A", "Alpha Bank"),
    ]);
    const before = rowIds();

    const row = table.value.find((r) => r.id === "a1");
    table.onEdit?.({ data: row, newData: { value: 999 } });
    await nextTick();

    expect(row.value).toBe(999);
    expect(rowIds()).toEqual(before);
    expect(before).toEqual(["a1", "z1"]);
  });

  it("saves the same ids and values regardless of display order", async () => {
    await mountWith([
      account("z1", "Stock Z", "Zeta Bank"),
      account("a1", "Stock A", "Alpha Bank"),
    ]);
    const row = table.value.find((r) => r.id === "a1");
    table.onEdit?.({ data: row, newData: { value: 999 } });
    await nextTick();

    const save = Array.from(root.querySelectorAll("button")).find(
      (b) => b.textContent === "Save",
    );
    save?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await nextTick();
    await Promise.resolve();

    expect(state.setValuesForMonth).toHaveBeenCalledWith(2026, 5, {
      z1: { [Currency.USD]: 1 },
      a1: { [Currency.USD]: 999 },
    });
  });

  it("builds the Entity and Type filter options from the ordered rows", async () => {
    await mountWith([
      account("z1", "Stock Z", "Zeta Bank", AccountType.Stock),
      account("a1", "Coin A", "alpha bank", AccountType.Crypto),
    ]);

    // Currency rows have no entity; ignore that empty option.
    expect(filterOptions(0).filter(Boolean)).toEqual([
      "alpha bank",
      "Zeta Bank",
    ]);
    expect(filterOptions(1).filter(Boolean)).toEqual([
      AccountType.Crypto,
      AccountType.Stock,
    ]);
  });
});
