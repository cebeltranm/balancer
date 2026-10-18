// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import TransactionTypeDialog from "@/components/TransactionTypeDialog.vue";

const mocks = vi.hoisted(() => ({
  showExpense: vi.fn(),
  showTransfer: vi.fn(),
  showGeneric: vi.fn(),
}));

vi.mock("@/components/TransactionExpenseDialog.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent({
      setup(_, { expose }) {
        expose({ show: mocks.showExpense });
        return () => h("div", { "data-form": "expense" });
      },
    }),
  };
});

vi.mock("@/components/TransactionTransferDialog.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent({
      setup(_, { expose }) {
        expose({ show: mocks.showTransfer });
        return () => h("div", { "data-form": "transfer" });
      },
    }),
  };
});

vi.mock("@/components/TransactionEditDialog.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent({
      setup(_, { expose }) {
        expose({ show: mocks.showGeneric });
        return () => h("div", { "data-form": "general" });
      },
    }),
  };
});

// Renders its content only while `visible` is true, like the real Dialog.
const dialogStub = defineComponent({
  props: { visible: { type: Boolean, default: false } },
  setup(props, { slots }) {
    return () => (props.visible ? h("div", [slots.default?.()]) : null);
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
}

function button(root: HTMLElement, label: string) {
  return [...root.querySelectorAll("button")].find(
    (el) => el.textContent === label,
  );
}

describe("TransactionTypeDialog", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp>;
  let picker: ReturnType<
    typeof ref<InstanceType<typeof TransactionTypeDialog>>
  >;

  beforeEach(async () => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.clearAllMocks();

    picker = ref();
    app = createApp({
      render: () => h(TransactionTypeDialog, { ref: picker }),
    });
    app.component("Dialog", dialogStub);
    app.component("Button", buttonStub);
    app.mount(root);
  });

  afterEach(() => {
    app.unmount();
    root.remove();
  });

  it("shows the three options only after show() is called (RT-038)", async () => {
    expect(button(root, "Expenses")).toBeUndefined();

    picker.value!.show();
    await flush();

    expect(button(root, "Expenses")).toBeDefined();
    expect(button(root, "Transfer")).toBeDefined();
    expect(button(root, "General")).toBeDefined();
  });

  it.each([
    ["Expenses", "showExpense"],
    ["Transfer", "showTransfer"],
    ["General", "showGeneric"],
  ] as const)(
    "%s closes the picker and opens the matching form (RT-038)",
    async (label, showMock) => {
      picker.value!.show();
      await flush();

      button(root, label)!.click();
      await flush();

      expect(mocks[showMock]).toHaveBeenCalledTimes(1);
      for (const other of Object.keys(mocks) as (keyof typeof mocks)[]) {
        if (other !== showMock) {
          expect(mocks[other]).not.toHaveBeenCalled();
        }
      }
      expect(button(root, label)).toBeUndefined();
    },
  );
});
