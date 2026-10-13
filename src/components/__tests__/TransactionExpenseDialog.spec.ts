// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import TransactionExpenseDialog from "@/components/TransactionExpenseDialog.vue";

const mocks = vi.hoisted(() => ({
  saveTransaction: vi.fn(),
  emitMessage: vi.fn(),
}));

const ACCOUNTS = {
  food: { id: "food", name: "Food", currency: "USD", type: "Expense" },
  cash: { id: "cash", name: "Cash", currency: "USD", type: "Cash" },
};

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    accounts: ACCOUNTS,
    activeAccounts: () => Object.values(ACCOUNTS),
    getAccountFullName: (id: string) => id,
  }),
}));

vi.mock("@/stores/transactions", () => ({
  useTransactionsStore: () => ({
    saveTransaction: mocks.saveTransaction,
    transactions: {},
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    balance: {},
    loadBalanceForYear: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/stores/budget", () => ({
  useBudgetStore: () => ({
    budget: {},
    loadBudgetForYear: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    getValue: () => 1,
  }),
}));

vi.mock("@/helpers/events", () => ({
  EVENTS: {
    emit: mocks.emitMessage,
  },
}));

const dialogStub = defineComponent({
  setup(_, { slots }) {
    return () => h("div", [slots.default?.(), slots.footer?.()]);
  },
});

function fieldStub(parse: (value: string) => unknown) {
  return defineComponent({
    props: { modelValue: { type: null, default: null } },
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      return () =>
        h("input", {
          value: props.modelValue ?? "",
          onInput: (event: Event) =>
            emit(
              "update:modelValue",
              parse((event.target as HTMLInputElement).value),
            ),
        });
    },
  });
}

const buttonStub = defineComponent({
  props: { label: { type: String, default: "" } },
  setup(props) {
    return () => h("button", { type: "button" }, props.label);
  },
});

async function flush() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

function setField(root: HTMLElement, id: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event("input"));
}

function saveButton(root: HTMLElement) {
  return [...root.querySelectorAll("button")].find(
    (button) => button.textContent === "Save",
  );
}

describe("TransactionExpenseDialog", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
    vi.restoreAllMocks();
  });

  it("keeps the form open and logs the error when the local queue write fails (RT-009, RT-044)", async () => {
    const saveError = new Error("IndexedDB unavailable");
    mocks.saveTransaction.mockRejectedValue(saveError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const dialog = ref<InstanceType<typeof TransactionExpenseDialog>>();
    app = createApp({
      render: () => h(TransactionExpenseDialog, { ref: dialog }),
    });
    app.component("Dialog", dialogStub);
    app.component(
      "DatePicker",
      fieldStub((value) => new Date(value)),
    );
    app.component(
      "AutoComplete",
      fieldStub((value) => value),
    );
    app.component(
      "Select",
      fieldStub((value) => value),
    );
    app.component(
      "InputNumber",
      fieldStub((value) => Number(value)),
    );
    app.component("Button", buttonStub);
    app.mount(root);
    dialog.value!.show();
    await flush();

    setField(root, "expense-description", "Lunch");
    setField(root, "expense-account", "food");
    setField(root, "asset-account", "cash");
    setField(root, "expense-value", "12");
    await flush();

    saveButton(root)!.click();
    await flush();

    expect(mocks.saveTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.emitMessage).toHaveBeenCalledWith("message", {
      severity: "error",
      summary: "Transaction not saved",
      message: "The transaction could not be saved locally. Please try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to save transaction locally",
      saveError,
    );
    expect(
      root.querySelector<HTMLInputElement>("#expense-description")!.value,
    ).toBe("Lunch");
    expect(saveButton(root)).toBeDefined();
  });
});
