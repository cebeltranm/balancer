// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import TransactionEditDialog from "@/components/TransactionEditDialog.vue";

const storeMocks = vi.hoisted(() => ({
  deleteTransaction: vi.fn(),
  saveTransaction: vi.fn(),
}));

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    accounts: {
      cash: { id: "cash", currency: "USD", type: "Cash" },
      bank: { id: "bank", currency: "USD", type: "BankAccount" },
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

    root.querySelector("form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await nextTick();

    expect(storeMocks.deleteTransaction).toHaveBeenCalledWith(
      originalTransaction,
    );
    expect(storeMocks.saveTransaction).toHaveBeenCalledWith({
      ...originalTransaction,
      id: 123456789,
    });
  });
});
