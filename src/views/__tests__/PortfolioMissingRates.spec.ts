// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, Fragment, h, ref, type VNode } from "vue";
import format from "@/format";
import { Period } from "@/types";
import TableView from "@/views/portafolio/table.vue";
import BarView from "@/views/portafolio/bar.vue";

// RT-011: investment summaries show a partial total plus a visible
// missing-rate indicator naming the currency and account whose rate is
// missing (specs/features/investments.md). The metadata comes from
// `useTotalByCategory()`; these tests render the table and bar children with
// it.

const missingRate = {
  accountId: "eur_fund",
  accountName: "Euro Fund",
  asset: "eur",
  currency: "usd",
};

const entry = {
  value: 100,
  in: 0,
  in_local: 0,
  out: 0,
  out_local: 0,
  expenses: 0,
  units: 0,
  gp: 0,
};

function node(key: string, name: string, missingRates?: unknown[]) {
  return {
    key,
    data: {
      name,
      currency: "usd",
      isCategory: false,
      values: [{ ...entry }, { ...entry }],
      missingRates,
    },
  };
}

function flattenVNodes(nodes: VNode[]): VNode[] {
  return nodes.flatMap((vnode) =>
    vnode.type === Fragment && Array.isArray(vnode.children)
      ? flattenVNodes(vnode.children as VNode[])
      : [vnode],
  );
}

// Renders every column's body slot per node and each footer slot once.
const treeTableStub = defineComponent({
  props: { value: { type: Array, default: () => [] } },
  setup(props: any, { slots }) {
    return () => {
      const columns = flattenVNodes(slots.default?.() || []);
      return h("div", [
        ...props.value.flatMap((n: any) =>
          columns.map((column: any) =>
            h(
              "div",
              { "data-node": n.key },
              column.children?.body?.({ node: n }),
            ),
          ),
        ),
        ...columns.map((column: any) =>
          h("div", { "data-footer": true }, column.children?.footer?.()),
        ),
      ]);
    };
  },
});

const emptyStub = defineComponent({
  inheritAttrs: false,
  setup() {
    return () => h("div");
  },
});

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

function mount(root: HTMLElement, component: any, props: Record<string, any>) {
  const app = createApp(component, props);
  app.provide("CURRENCY", ref("usd"));
  app.config.globalProperties.$format = format;
  app.directive("tooltip", {});
  app.component("TreeTable", treeTableStub);
  app.component("Column", passthroughStub());
  app.component("Avatar", emptyStub);
  app.component("Chart", emptyStub);
  app.mount(root);
  return app;
}

const LABEL = "Missing rate: eur->usd (eur_fund)";

describe("Portfolio table missing-rate indicators (RT-011)", () => {
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

  it("shows the indicator on an account row whose rate is missing and not on other rows", () => {
    app = mount(root, TableView, {
      accountsGrouped: [
        node("eur_fund", "Euro Fund", [missingRate]),
        node("usd_fund", "USD Fund"),
      ],
      total: [{ ...entry }],
    });

    // One div per column is rendered for each node.
    const rowText = (key: string) =>
      Array.from(root.querySelectorAll(`[data-node="${key}"]`))
        .map((el) => el.textContent)
        .join(" ");
    expect(rowText("eur_fund")).toContain(LABEL);
    expect(rowText("usd_fund")).not.toContain("Missing rate");
  });

  it("shows the indicator on the footer total when the total is partial", () => {
    app = mount(root, TableView, {
      accountsGrouped: [node("usd_fund", "USD Fund")],
      total: [{ ...entry, missingRates: [missingRate] }],
    });

    const footer = Array.from(root.querySelectorAll("[data-footer]")).map(
      (el) => el.textContent,
    );
    expect(footer.some((text) => text?.includes(LABEL))).toBe(true);
  });

  it("shows no indicator when nothing is missing", () => {
    app = mount(root, TableView, {
      accountsGrouped: [node("usd_fund", "USD Fund", [])],
      total: [{ ...entry, missingRates: [] }],
    });

    expect(root.textContent).not.toContain("Missing rate");
  });
});

describe("Portfolio bar missing-rate indicators (RT-011)", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;
  const period = {
    type: Period.Month,
    value: { year: 2026, month: 5, quarter: 2 },
  };

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("shows the indicator naming the currency and account when the total is partial", () => {
    app = mount(root, BarView, {
      total: [{ ...entry, missingRates: [missingRate] }, { ...entry }],
      period,
    });

    expect(root.textContent).toContain(LABEL);
  });

  it("shows no indicator when nothing is missing", () => {
    app = mount(root, BarView, { total: [{ ...entry }, { ...entry }], period });

    expect(root.textContent).not.toContain("Missing rate");
  });
});
