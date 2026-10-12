// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import format from "@/format";
import { AccountType } from "@/types";
import Portfolio from "@/views/portafolio/index.vue";

// RT-041: the Investments table lists entity/category groups first, then
// accounts, each by name (specs/features/investments.md, specs/architecture.md
// List Ordering). The pie display keeps its current order.

const entry = {
  value: 10,
  in: 0,
  in_local: 0,
  out: 0,
  out_local: 0,
  expenses: 0,
  units: 0,
};

function account(id: string, name: string, entity?: string) {
  return { id, name, entity, type: AccountType.ETF, currency: "usd" };
}

function category(name: string, children: Record<string, any>) {
  return { name, type: AccountType.Category, children };
}

// Deliberately unsorted (accounts.json order).
function buildTree() {
  return {
    Investments: {
      "Zeta Bank": category("Zeta Bank", {
        z2: account("z2", "Fund 10", "Zeta Bank"),
        z1: account("z1", "alpha", "Zeta Bank"),
        z3: account("z3", "Fund 2", "Zeta Bank"),
        z4: account("z4", "Zeta", "Zeta Bank"),
        e1: account("e1", "", "Zeta Bank"),
        a1: account("a1", "Álamo", "Zeta Bank"),
        a0: account("a0", "alamo", "Zeta Bank"),
      }),
      loose2: account("loose2", "Beta"),
      Misc: category("Misc", {
        m1: account("m1", "A"),
        sub: category("Sub", {
          s2: account("s2", "B"),
          s1: account("s1", "A"),
        }),
      }),
      loose1: account("loose1", "alpha loose"),
      "alpha bank": category("alpha bank", {
        b1: account("b1", "Only", "alpha bank"),
      }),
    },
  };
}

function allAccountIds(tree: any): string[] {
  const ids: string[] = [];
  const walk = (children: Record<string, any>) =>
    Object.keys(children).forEach((key) => {
      const child = children[key];
      if (child.type === AccountType.Category) walk(child.children);
      else ids.push(child.id);
    });
  walk(tree.Investments);
  return ids;
}

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
  useStorageStore: () => ({ status: { authenticated: true } }),
}));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    accountsGroupByCategories: () => buildTree(),
    activeAccounts: () => [],
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    loadBalanceForYear: vi.fn(),
    getBalanceGroupedByPeriods: () =>
      new Proxy({}, { get: () => [{ ...entry }, { ...entry }] }),
  }),
}));

vi.mock("@/stores/config", () => ({
  useConfigStore: () => ({
    invCompositionByAssetClass: {},
    invCompositionByRegion: {},
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({ getValue: () => 1, hasValue: () => true }),
}));

// Replace the table child so the test reads the exact props the view passes.
vi.mock("@/views/portafolio/table.vue", () => ({
  default: defineComponent({
    props: ["accountsGrouped", "total"],
    setup(props: any) {
      return () =>
        h(
          "pre",
          { id: "table-props" },
          JSON.stringify({
            grouped: props.accountsGrouped,
            total: props.total,
          }),
        );
    },
  }),
}));

function passthroughStub() {
  return defineComponent({
    inheritAttrs: false,
    setup(_, { slots }) {
      return () =>
        h(
          "div",
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

const treeTableStub = defineComponent({
  props: { value: { type: Array, default: () => [] } },
  setup(props: any) {
    return () => h("pre", { id: "tree-value" }, JSON.stringify(props.value));
  },
});

function selectButtonStub(displayType: string) {
  return defineComponent({
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(_, { emit }) {
      if (displayType !== "table") emit("update:modelValue", displayType);
      return () => h("div");
    },
  });
}

const selectByCategoryStub = defineComponent({
  props: ["modelValue"],
  emits: ["update:modelValue"],
  setup(_, { emit }) {
    emit("update:modelValue", "ByCategory");
    return () => h("div");
  },
});

const names = (nodes: any[]) => nodes.map((n) => n.data.name);
const keys = (nodes: any[]) => nodes.map((n) => n.key);

describe("Portfolio table account order (RT-041)", () => {
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

  async function mountView(displayType: string) {
    app = createApp(Portfolio);
    app.provide("CURRENCY", ref("usd"));
    app.config.globalProperties.$format = format;
    app.component("Toolbar", passthroughStub());
    app.component("Select", selectByCategoryStub);
    app.component("SelectButton", selectButtonStub(displayType));
    app.component("GChart", emptyStub);
    app.component("TreeTable", treeTableStub);
    app.component("Column", passthroughStub());
    app.component("Avatar", emptyStub);
    app.directive("tooltip", {});
    app.mount(root);
    for (let i = 0; i < 5; i++) await nextTick();
  }

  function tableProps() {
    return JSON.parse(root.querySelector("#table-props")!.textContent!);
  }

  it("lists entity and category groups first, then accounts, each sorted by name", async () => {
    await mountView("table");
    const { grouped } = tableProps();
    expect(names(grouped)).toEqual([
      "alpha bank",
      "Misc",
      "Zeta Bank",
      "alpha loose",
      "Beta",
    ]);
  });

  it("sorts accounts inside an entity with case, accent, numeric collation, id tie-break and empty names last", async () => {
    await mountView("table");
    const zeta = tableProps().grouped.find((g: any) => g.key === "Zeta Bank");
    expect(keys(zeta.children)).toEqual([
      "a0",
      "a1",
      "z1",
      "z3",
      "z2",
      "z4",
      "e1",
    ]);
  });

  it("sorts nested categories before accounts at every level", async () => {
    await mountView("table");
    const misc = tableProps().grouped.find((g: any) => g.key === "Misc");
    expect(keys(misc.children)).toEqual(["Sub", "m1"]);
    expect(keys(misc.children[0].children)).toEqual(["s1", "s2"]);
  });

  it("keeps the total equal to the sum of every account value", async () => {
    await mountView("table");
    const accountCount = allAccountIds(buildTree()).length;
    expect(tableProps().total[0].value).toBe(accountCount * entry.value);
  });

  it("does not sort the pie display (ByCategory keeps accounts.json order)", async () => {
    await mountView("pie");
    const value = JSON.parse(root.querySelector("#tree-value")!.textContent!);
    expect(names(value)).toEqual([
      "Zeta Bank",
      "Beta",
      "Misc",
      "alpha loose",
      "alpha bank",
    ]);
    const zeta = value.find((g: any) => g.key === "Zeta Bank");
    expect(keys(zeta.children)).toEqual([
      "z2",
      "z1",
      "z3",
      "z4",
      "e1",
      "a1",
      "a0",
    ]);
  });
});
