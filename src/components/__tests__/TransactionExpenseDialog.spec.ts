// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import TransactionExpenseDialog from "@/components/TransactionExpenseDialog.vue";
import { formatLocalDate } from "@/helpers/date";

const mocks = vi.hoisted(() => ({
  saveTransaction: vi.fn(),
  emitMessage: vi.fn(),
  getValue: vi.fn(),
}));

const ACCOUNTS = {
  food: { id: "food", name: "Food", currency: "USD", type: "Expense" },
  cash: { id: "cash", name: "Cash", currency: "USD", type: "Cash" },
  euro: { id: "euro", name: "Euro", currency: "EUR", type: "Cash" },
  etf: { id: "etf", name: "ETF", currency: "USD", type: "ETF" },
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
    getValue: mocks.getValue,
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

const selectStub = defineComponent({
  props: {
    modelValue: { type: null, default: null },
    options: { type: Array, default: () => [] },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("input", {
        value: props.modelValue ?? "",
        "data-options": (props.options as { id?: string }[])
          .map((option) => option.id ?? option)
          .join(","),
        onInput: (event: Event) =>
          emit("update:modelValue", (event.target as HTMLInputElement).value),
      });
  },
});

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
    mocks.saveTransaction.mockResolvedValue(undefined);
    mocks.getValue.mockReturnValue(1);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
    vi.restoreAllMocks();
  });

  function mountDialog() {
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
    app.component("Select", selectStub);
    app.component(
      "InputNumber",
      fieldStub((value) => Number(value)),
    );
    app.component("Button", buttonStub);
    app.mount(root);
    dialog.value!.show();
  }

  async function fillValid(overrides: Record<string, string> = {}) {
    const fields = {
      "expense-description": "Lunch",
      "expense-account": "food",
      "asset-account": "cash",
      "expense-value": "12",
      ...overrides,
    };
    for (const [id, value] of Object.entries(fields)) {
      if (value !== "") {
        setField(root, id, value);
      }
    }
    await flush();
  }

  async function save() {
    saveButton(root)!.click();
    await flush();
  }

  function visibleErrors() {
    return [...root.querySelectorAll(".p-error")].map((el) =>
      el.textContent!.trim(),
    );
  }

  it("keeps the form open and logs the error when the local queue write fails (RT-009, RT-044)", async () => {
    const saveError = new Error("IndexedDB unavailable");
    mocks.saveTransaction.mockRejectedValue(saveError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    mountDialog();
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

  it("queues a balanced expense with a fresh id, then closes and resets (RT-038)", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    mountDialog();
    await flush();

    await fillValid();
    await save();

    expect(mocks.saveTransaction).toHaveBeenCalledTimes(1);
    const saved = mocks.saveTransaction.mock.calls[0][0];
    expect(saved).toEqual({
      id: 1700000000000,
      date: formatLocalDate(new Date()),
      description: "Lunch",
      values: [
        { accountId: "food", value: 12, accountValue: 12 },
        { accountId: "cash", value: -12, accountValue: -12 },
      ],
    });
    expect(saved.values[0].value + saved.values[1].value).toBe(0);
    expect(saved).not.toHaveProperty("tags");
    expect(
      root.querySelector<HTMLInputElement>("#expense-description")!.value,
    ).toBe("");
    expect(mocks.emitMessage).not.toHaveBeenCalled();
  });

  it("blocks a future date (RT-038)", async () => {
    mountDialog();
    await flush();

    await fillValid({ "expense-date": "2999-01-01" });
    await save();

    expect(visibleErrors()).toEqual(["Can not add future transaction"]);
    expect(mocks.saveTransaction).not.toHaveBeenCalled();
  });

  it.each(["0", "-5"])(
    "blocks a non-positive value %s (RT-038)",
    async (value) => {
      mountDialog();
      await flush();

      await fillValid({ "expense-value": value });
      await save();

      expect(visibleErrors()).toEqual(["Value should be positive"]);
      expect(mocks.saveTransaction).not.toHaveBeenCalled();
    },
  );

  it("blocks the same account on both sides (RT-038)", async () => {
    mountDialog();
    await flush();

    await fillValid({ "asset-account": "food" });
    await save();

    expect(visibleErrors()).toEqual([
      "Expense and payment account should be different accounts",
    ]);
    expect(mocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("blocks accounts in different currencies without an exchange rate (RT-038)", async () => {
    mocks.getValue.mockReturnValue(0);
    mountDialog();
    await flush();

    await fillValid({ "asset-account": "euro" });
    await save();

    expect(visibleErrors()).toEqual([
      "No exchange rate available for these accounts",
    ]);
    expect(mocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("blocks an empty description (RT-042)", async () => {
    mountDialog();
    await flush();

    await fillValid({ "expense-description": "" });
    await save();

    expect(visibleErrors()).toEqual(["Description is required"]);
    expect(mocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("saves a description of 1 to 4 characters (RT-042)", async () => {
    mountDialog();
    await flush();

    await fillValid({ "expense-description": "Tea" });
    await save();

    expect(visibleErrors()).toEqual([]);
    expect(mocks.saveTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.saveTransaction.mock.calls[0][0].description).toBe("Tea");
  });

  it("offers no tags or units and only payment-type accounts for payment (RT-043)", async () => {
    mountDialog();
    await flush();

    expect(root.querySelector('[id*="tag" i], [id*="unit" i]')).toBeNull();
    expect(root.textContent).not.toMatch(/tags|units/i);
    expect(
      root.querySelector("#asset-account")!.getAttribute("data-options"),
    ).toBe("cash,euro");
  });
});
