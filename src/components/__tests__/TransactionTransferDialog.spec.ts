// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import TransactionTransferDialog from "@/components/TransactionTransferDialog.vue";
import { formatLocalDate } from "@/helpers/date";

const mocks = vi.hoisted(() => ({
  saveTransaction: vi.fn(),
  emitMessage: vi.fn(),
  getValue: vi.fn(),
}));

const ACCOUNTS = {
  cash: { id: "cash", name: "Cash", currency: "USD", type: "Cash" },
  bank: { id: "bank", name: "Bank", currency: "USD", type: "BankAccount" },
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

describe("TransactionTransferDialog", () => {
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
    const dialog = ref<InstanceType<typeof TransactionTransferDialog>>();
    app = createApp({
      render: () => h(TransactionTransferDialog, { ref: dialog }),
    });
    app.component("Dialog", dialogStub);
    app.component(
      "DatePicker",
      fieldStub((value) => new Date(value)),
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
      "transfer-from": "cash",
      "transfer-to": "bank",
      "transfer-value": "12",
      ...overrides,
    };
    for (const [id, value] of Object.entries(fields)) {
      setField(root, id, value);
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

    setField(root, "transfer-from", "cash");
    setField(root, "transfer-to", "bank");
    setField(root, "transfer-value", "12");
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
    expect(root.querySelector<HTMLInputElement>("#transfer-from")!.value).toBe(
      "cash",
    );
    expect(saveButton(root)).toBeDefined();
  });

  it("queues a balanced transfer with a fresh id and generated description, then closes and resets (RT-038)", async () => {
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
      description: "Transfer Cash -> Bank",
      values: [
        { accountId: "cash", value: -12, accountValue: -12 },
        { accountId: "bank", value: 12, accountValue: 12 },
      ],
    });
    expect(saved.values[0].value + saved.values[1].value).toBe(0);
    expect(saved).not.toHaveProperty("tags");
    expect(root.querySelector<HTMLInputElement>("#transfer-from")!.value).toBe(
      "",
    );
    expect(mocks.emitMessage).not.toHaveBeenCalled();
  });

  it("blocks a future date (RT-038)", async () => {
    mountDialog();
    await flush();

    await fillValid({ "transfer-date": "2999-01-01" });
    await save();

    expect(visibleErrors()).toEqual(["Can not add future transaction"]);
    expect(mocks.saveTransaction).not.toHaveBeenCalled();
  });

  it.each(["0", "-5"])(
    "blocks a non-positive value %s (RT-038)",
    async (value) => {
      mountDialog();
      await flush();

      await fillValid({ "transfer-value": value });
      await save();

      expect(visibleErrors()).toEqual(["Value should be positive"]);
      expect(mocks.saveTransaction).not.toHaveBeenCalled();
    },
  );

  it("blocks the same source and destination account (RT-038)", async () => {
    mountDialog();
    await flush();

    await fillValid({ "transfer-to": "cash" });
    await save();

    expect(visibleErrors()).toEqual([
      "From and to accounts should be different",
    ]);
    expect(mocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("blocks accounts in different currencies without an exchange rate (RT-038)", async () => {
    mocks.getValue.mockReturnValue(0);
    mountDialog();
    await flush();

    await fillValid({ "transfer-to": "euro" });
    setField(root, "transfer-target-value", "10");
    await flush();
    await save();

    expect(visibleErrors()).toEqual([
      "No exchange rate available for these accounts",
    ]);
    expect(mocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("blocks a cross-currency transfer without a positive target value (RT-038)", async () => {
    mocks.getValue.mockReturnValue(0.5);
    mountDialog();
    await flush();

    await fillValid({ "transfer-to": "euro" });
    setField(root, "transfer-target-value", "0");
    await flush();
    await save();

    expect(visibleErrors()).toEqual(["Second currency value is required"]);
    expect(mocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("offers no tags or units and only payment-type accounts (RT-043)", async () => {
    mountDialog();
    await flush();

    expect(root.querySelector('[id*="tag" i], [id*="unit" i]')).toBeNull();
    expect(root.textContent).not.toMatch(/tags|units/i);
    for (const id of ["transfer-from", "transfer-to"]) {
      expect(root.querySelector(`#${id}`)!.getAttribute("data-options")).toBe(
        "cash,bank,euro",
      );
    }
  });
});
