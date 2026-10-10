// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import TransactionEditDialog from "@/components/TransactionEditDialog.vue";

const storeMocks = vi.hoisted(() => ({
  deleteTransaction: vi.fn(),
  saveTransaction: vi.fn(),
  emitMessage: vi.fn(),
}));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    accounts: {
      cash: { id: "cash", currency: "USD", type: "Cash" },
      bank: { id: "bank", currency: "USD", type: "BankAccount" },
      food: { id: "food", currency: "USD", type: "Expense" },
    },
    getAccountFullName: (id: string) => id,
    isAccountInUnits: () => false,
  }),
}));

vi.mock("@/stores/transactions", () => ({
  useTransactionsStore: () => ({
    deleteTransaction: storeMocks.deleteTransaction,
    saveTransaction: storeMocks.saveTransaction,
    transactions: {},
    getLastTags: () => [],
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    getValue: () => 1,
  }),
}));

vi.mock("@/helpers/events", () => ({
  EVENTS: {
    emit: storeMocks.emitMessage,
  },
}));

function passthroughStub() {
  return defineComponent({
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    },
  });
}

const formStub = defineComponent({
  emits: ["submit"],
  setup(_, { emit, slots }) {
    return () =>
      h(
        "form",
        {
          onSubmit: (event: Event) => {
            event.preventDefault();
            emit("submit", event);
          },
        },
        slots.default?.(),
      );
  },
});

describe("TransactionEditDialog", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    storeMocks.deleteTransaction.mockResolvedValue(undefined);
    storeMocks.saveTransaction.mockResolvedValue(undefined);
    vi.spyOn(Date, "now").mockReturnValue(123456789);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
    vi.restoreAllMocks();
  });

  it("edits existing transactions by deleting the original id and saving a fresh id", async () => {
    const originalTransaction = {
      id: 42,
      date: "2025-02-20",
      description: "Original payment",
      tags: ["groceries"],
      values: [
        { accountId: "cash", value: 10, accountValue: 10 },
        { accountId: "bank", value: -10, accountValue: -10 },
      ],
    };

    app = createApp(TransactionEditDialog, {
      transaction: originalTransaction,
    });

    [
      "Dialog",
      "Fluid",
      "FloatLabel",
      "Message",
      "AutoComplete",
      "InputText",
      "DatePicker",
      "InputNumber",
      "Button",
      "InputGroup",
      "InputGroupAddon",
    ].forEach((name) => {
      app!.component(name, passthroughStub());
    });
    app.component("Form", formStub);

    app.mount(root);
    await nextTick();

    root
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();

    expect(storeMocks.deleteTransaction).toHaveBeenCalledWith(
      originalTransaction,
    );
    expect(storeMocks.saveTransaction).toHaveBeenCalledWith({
      ...originalTransaction,
      id: 123456789,
    });
  });

  it("keeps failed local queue writes from being presented as saved", async () => {
    storeMocks.saveTransaction.mockRejectedValue(
      new Error("IndexedDB unavailable"),
    );
    const onUpdateTransaction = vi.fn();
    const originalTransaction = {
      id: 42,
      date: "2025-02-20",
      description: "Original payment",
      tags: ["groceries"],
      values: [
        { accountId: "cash", value: 10, accountValue: 10 },
        { accountId: "bank", value: -10, accountValue: -10 },
      ],
    };

    app = createApp(TransactionEditDialog, {
      transaction: originalTransaction,
      "onUpdate:transaction": onUpdateTransaction,
    });

    [
      "Dialog",
      "Fluid",
      "FloatLabel",
      "Message",
      "AutoComplete",
      "InputText",
      "DatePicker",
      "InputNumber",
      "Button",
      "InputGroup",
      "InputGroupAddon",
    ].forEach((name) => {
      app!.component(name, passthroughStub());
    });
    app.component("Form", formStub);

    app.mount(root);
    await nextTick();

    root
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();
    await Promise.resolve();

    expect(storeMocks.emitMessage).toHaveBeenCalledWith("message", {
      severity: "error",
      summary: "Transaction not saved",
      message: "The transaction could not be saved locally. Please try again.",
    });
    expect(onUpdateTransaction).not.toHaveBeenCalled();
  });
});

const messageStub = defineComponent({
  setup(_, { slots }) {
    return () => h("p", { class: "error-message" }, slots.default?.());
  },
});

async function mountDialog(root: HTMLElement, transaction: unknown) {
  const app = createApp(TransactionEditDialog, { transaction });
  [
    "Dialog",
    "Fluid",
    "FloatLabel",
    "AutoComplete",
    "InputText",
    "DatePicker",
    "InputNumber",
    "Button",
    "InputGroup",
    "InputGroupAddon",
  ].forEach((name) => {
    app.component(name, passthroughStub());
  });
  app.component("Form", formStub);
  app.component("Message", messageStub);
  app.mount(root);
  await nextTick();
  return app;
}

async function submit(root: HTMLElement) {
  root
    .querySelector("form")!
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

function errorMessages(root: HTMLElement) {
  return Array.from(root.querySelectorAll(".error-message")).map(
    (el) => el.textContent,
  );
}

describe("TransactionEditDialog validation", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  const validTransaction = {
    id: 42,
    date: "2025-02-20",
    description: "Weekly groceries",
    tags: [],
    values: [
      { accountId: "food", value: 10, accountValue: 10 },
      { accountId: "cash", value: -10, accountValue: -10 },
    ],
  };

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();
    storeMocks.deleteTransaction.mockResolvedValue(undefined);
    storeMocks.saveTransaction.mockResolvedValue(undefined);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("saves a valid transaction without showing errors", async () => {
    app = await mountDialog(root, validTransaction);

    await submit(root);

    expect(errorMessages(root)).toEqual([]);
    expect(storeMocks.saveTransaction).toHaveBeenCalledTimes(1);
  });

  it("rejects a description shorter than 5 characters", async () => {
    app = await mountDialog(root, { ...validTransaction, description: "Rent" });

    await submit(root);

    expect(errorMessages(root)).toHaveLength(1);
    expect(storeMocks.deleteTransaction).not.toHaveBeenCalled();
    expect(storeMocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("rejects a future-dated transaction", async () => {
    app = await mountDialog(root, { ...validTransaction, date: "2999-01-01" });

    await submit(root);

    expect(errorMessages(root)).toEqual(["Can not add future transaction"]);
    expect(storeMocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("rejects a non-positive value on an expense account", async () => {
    app = await mountDialog(root, {
      ...validTransaction,
      values: [
        { accountId: "food", value: -10, accountValue: -10 },
        { accountId: "cash", value: 10, accountValue: 10 },
      ],
    });

    await submit(root);

    expect(errorMessages(root)).toEqual(["Should be positive for expenses"]);
    expect(storeMocks.saveTransaction).not.toHaveBeenCalled();
  });

  it("does not save values that do not sum to zero", async () => {
    app = await mountDialog(root, {
      ...validTransaction,
      values: [
        { accountId: "food", value: 10, accountValue: 10 },
        { accountId: "cash", value: -7, accountValue: -7 },
      ],
    });

    await submit(root);

    // The dialog appends a balancing row without an account; saving is
    // blocked until that remainder is assigned to an account.
    expect(errorMessages(root).length).toBeGreaterThan(0);
    expect(storeMocks.deleteTransaction).not.toHaveBeenCalled();
    expect(storeMocks.saveTransaction).not.toHaveBeenCalled();
  });
});
