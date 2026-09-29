// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  Fragment,
  h,
  nextTick,
  type VNode,
} from "vue";
import Accounts from "@/views/Accounts.vue";
import {
  AccountGroupType,
  AccountType,
  Currency,
  GEOGRAPHIC_EXPOSURE_OPTIONS,
} from "@/types";

const accountsStoreMocks = vi.hoisted(() => ({
  saveAccount: vi.fn(async () => true),
}));

vi.mock("@/stores/accounts", () => ({
  ACCOUNT_GROUP_TYPES: {
    Assets: ["BankAccount"],
    Investments: ["ETF"],
  },
  useAccountsStore: () => ({
    accounts: {
      global_etf: {
        id: "global_etf",
        name: "Global ETF",
        type: AccountType.ETF,
        currency: Currency.USD,
        entity: "Broker",
        activeFrom: new Date(2020, 0, 1),
        risk: 3,
        class: { Equities: { Global: 0.6, US: 0.4 } },
      },
    },
    loadAccounts: vi.fn(async () => undefined),
    getAccountGroupType: () => AccountGroupType.Investments,
    saveAccount: accountsStoreMocks.saveAccount,
  }),
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: vi.fn() }),
}));

function flattenVNodes(nodes: VNode[]): VNode[] {
  return nodes.flatMap((node) =>
    node.type === Fragment && Array.isArray(node.children)
      ? flattenVNodes(node.children as VNode[])
      : [node],
  );
}

const dataTableStub = defineComponent({
  props: {
    value: {
      type: Array,
      default: () => [],
    },
  },
  setup(props, { slots }) {
    return () => {
      const columns = flattenVNodes(slots.default?.() || []);
      return h("table", [
        h(
          "thead",
          h(
            "tr",
            columns.map((column) => h("th", column.props?.header || "")),
          ),
        ),
        h(
          "tbody",
          (props.value as Record<string, unknown>[]).map((row) =>
            h(
              "tr",
              columns.map((column) => {
                const body = (column.children as Record<string, unknown> | null)
                  ?.body as ((scope: unknown) => VNode[]) | undefined;
                return h(
                  "td",
                  body
                    ? body({ data: row })
                    : String(row[column.props?.field] ?? ""),
                );
              }),
            ),
          ),
        ),
      ]);
    };
  },
});

const dialogStub = defineComponent({
  props: {
    visible: Boolean,
  },
  setup(props, { slots }) {
    return () =>
      props.visible
        ? h("div", { class: "dialog" }, [slots.default?.(), slots.footer?.()])
        : null;
  },
});

const toolbarStub = defineComponent({
  setup(_, { slots }) {
    return () => h("div", [slots.start?.(), slots.end?.()]);
  },
});

const buttonStub = defineComponent({
  props: {
    icon: { type: String, default: "" },
    label: { type: String, default: "" },
    disabled: Boolean,
  },
  setup(props, { attrs }) {
    return () =>
      h(
        "button",
        { ...attrs, disabled: props.disabled },
        props.label || props.icon,
      );
  },
});

const inputNumberStub = defineComponent({
  props: {
    modelValue: { type: Number, default: null },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("input", {
        class: "input-number",
        value: props.modelValue ?? "",
        onInput: (event: Event) =>
          emit(
            "update:modelValue",
            Number((event.target as HTMLInputElement).value),
          ),
      });
  },
});

const selectStub = defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: null },
    options: { type: Array, default: () => [] },
    optionValue: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { attrs, emit }) {
    return () =>
      h(
        "select",
        {
          "aria-label": attrs["aria-label"],
          value: props.modelValue,
          onChange: (event: Event) =>
            emit(
              "update:modelValue",
              (event.target as HTMLSelectElement).value,
            ),
        },
        (props.options as Record<string, string>[]).map((option) => {
          const value = props.optionValue
            ? option[props.optionValue]
            : String(option);
          return h("option", { value }, value);
        }),
      );
  },
});

const emptyStub = defineComponent({
  inheritAttrs: false,
  setup() {
    return () => h("div");
  },
});

async function flush() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

async function mountAccounts(root: HTMLElement) {
  const app = createApp(Accounts);
  app.config.errorHandler = vi.fn();
  app.config.warnHandler = () => undefined;
  app.component("Toolbar", toolbarStub);
  app.component("Button", buttonStub);
  app.component("DataTable", dataTableStub);
  app.component("Column", emptyStub);
  app.component("Dialog", dialogStub);
  app.component("InputNumber", inputNumberStub);
  app.component("Select", selectStub);
  ["SelectButton", "InputText", "DatePicker", "AutoComplete"].forEach((name) =>
    app.component(name, emptyStub),
  );
  app.component("Message", emptyStub);

  app.mount(root);
  await flush();
  return app;
}

function findButton(root: HTMLElement, text: string) {
  return Array.from(root.querySelectorAll("button")).find(
    (button) => button.textContent === text,
  );
}

describe("Accounts class allocation", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    accountsStoreMocks.saveAccount.mockClear();
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("includes Global as a geographic exposure option", () => {
    expect(GEOGRAPHIC_EXPOSURE_OPTIONS).toContain("Global");
  });

  it("shows a Global column and keeps Global weights when saving", async () => {
    app = await mountAccounts(root);

    const groupFilter = root.querySelector(
      'select[aria-label="Account group filter"]',
    ) as HTMLSelectElement;
    groupFilter.value = AccountGroupType.Investments;
    groupFilter.dispatchEvent(new Event("change"));
    await flush();

    findButton(root, "pi pi-pencil")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await flush();

    const dialog = root.querySelector(".dialog") as HTMLElement;
    expect(dialog).toBeTruthy();
    const headers = Array.from(dialog.querySelectorAll("th")).map(
      (th) => th.textContent,
    );
    expect(headers).toContain("Global");

    const globalIndex = headers.indexOf("Global");
    const equitiesRow = Array.from(dialog.querySelectorAll("tbody tr")).find(
      (row) => row.querySelector("td")?.textContent === "Equities",
    );
    const globalInput = equitiesRow
      ?.querySelectorAll("td")
      [globalIndex]?.querySelector("input") as HTMLInputElement;
    expect(globalInput.value).toBe("60");

    const saveButton = findButton(dialog, "Save account");
    expect(saveButton?.disabled).toBe(false);
    saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(accountsStoreMocks.saveAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "global_etf",
        class: { Equities: { Global: 0.6, US: 0.4 } },
      }),
    );
  });
});
