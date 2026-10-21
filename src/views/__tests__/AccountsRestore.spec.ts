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
import { AccountGroupType, AccountType, Currency } from "@/types";

const mocks = vi.hoisted(() => ({
  removeAccountHideSince: vi.fn(async (_id: string) => true),
  confirmRequire: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock("@/stores/accounts", () => ({
  ACCOUNT_GROUP_TYPES: {
    Assets: ["BankAccount"],
  },
  useAccountsStore: () => ({
    accounts: {
      old_bank: {
        id: "old_bank",
        name: "Old Bank",
        type: AccountType.BankAccount,
        currency: Currency.USD,
        entity: "Bank",
        activeFrom: new Date(2020, 0, 1),
        hideSince: new Date(2021, 0, 1),
      },
    },
    loadAccounts: vi.fn(async () => undefined),
    getAccountGroupType: () => AccountGroupType.Assets,
    removeAccountHideSince: mocks.removeAccountHideSince,
  }),
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: mocks.toastAdd }),
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: mocks.confirmRequire }),
}));

function flattenVNodes(nodes: VNode[]): VNode[] {
  return nodes.flatMap((node) =>
    node.type === Fragment && Array.isArray(node.children)
      ? flattenVNodes(node.children as VNode[])
      : [node],
  );
}

const dataTableStub = defineComponent({
  props: { value: { type: Array, default: () => [] } },
  setup(props, { slots }) {
    return () => {
      const columns = flattenVNodes(slots.default?.() || []);
      return h(
        "table",
        h(
          "tbody",
          (props.value as Record<string, unknown>[]).map((row) =>
            h(
              "tr",
              columns.map((column) => {
                const body = (column.children as Record<string, unknown> | null)
                  ?.body as ((scope: unknown) => VNode[]) | undefined;
                return h("td", body ? body({ data: row }) : "");
              }),
            ),
          ),
        ),
      );
    };
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
  },
  setup(props, { attrs }) {
    return () => h("button", { ...attrs }, props.label || props.icon);
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

function select(root: HTMLElement, label: string, value: string) {
  const element = root.querySelector(
    `select[aria-label="${label}"]`,
  ) as HTMLSelectElement;
  element.value = value;
  element.dispatchEvent(new Event("change"));
}

describe("Accounts restore hidden account", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    mocks.removeAccountHideSince.mockClear();
    mocks.confirmRequire.mockClear();
    mocks.toastAdd.mockClear();
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  async function openRestoreConfirmation() {
    app = createApp(Accounts);
    app.config.errorHandler = vi.fn();
    app.config.warnHandler = () => undefined;
    app.component("Toolbar", toolbarStub);
    app.component("Button", buttonStub);
    app.component("DataTable", dataTableStub);
    app.component("Column", emptyStub);
    app.component("Select", selectStub);
    app.component("SelectButton", selectStub);
    for (const name of ["Dialog", "InputNumber", "InputText", "Message"]) {
      app.component(name, emptyStub);
    }
    app.component("DatePicker", emptyStub);
    app.component("AutoComplete", emptyStub);
    app.mount(root);
    await flush();

    select(root, "Account group filter", AccountGroupType.Assets);
    select(root, "Account visibility", "inactive");
    await flush();

    const restore = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === "pi pi-eye",
    );
    expect(restore).toBeTruthy();
    restore?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
  }

  it("asks for confirmation and does not restore until it is accepted", async () => {
    await openRestoreConfirmation();

    expect(mocks.confirmRequire).toHaveBeenCalledTimes(1);
    expect(mocks.confirmRequire.mock.calls[0][0].message).toContain(
      "Restore Old Bank?",
    );
    expect(mocks.removeAccountHideSince).not.toHaveBeenCalled();
  });

  it("calls removeAccountHideSince() and shows a success toast once accepted", async () => {
    await openRestoreConfirmation();

    await mocks.confirmRequire.mock.calls[0][0].accept();

    expect(mocks.removeAccountHideSince).toHaveBeenCalledWith("old_bank");
    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success" }),
    );
  });

  it("shows an error toast when restoring fails to save", async () => {
    mocks.removeAccountHideSince.mockResolvedValueOnce(false);
    await openRestoreConfirmation();

    await mocks.confirmRequire.mock.calls[0][0].accept();

    expect(mocks.toastAdd).toHaveBeenCalledTimes(1);
    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "error" }),
    );
  });
});
