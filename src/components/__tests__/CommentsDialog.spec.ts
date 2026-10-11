// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import CommentsDialog from "@/components/CommentsDialog.vue";

const dialogStub = defineComponent({
  setup(_, { slots }) {
    return () => h("div", [slots.default?.(), slots.footer?.()]);
  },
});

const popoverStub = defineComponent({
  setup(_, { slots, expose }) {
    expose({ toggle: () => undefined });
    return () => h("div", { class: "popover" }, slots.default?.());
  },
});

const textareaStub = defineComponent({
  props: ["modelValue"],
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("textarea", {
        value: props.modelValue,
        onInput: (event: Event) =>
          emit(
            "update:modelValue",
            (event.target as HTMLTextAreaElement).value,
          ),
      });
  },
});

const buttonStub = defineComponent({
  props: ["icon", "label"],
  setup(props) {
    return () =>
      h("button", { class: props.icon || "label-button" }, props.label);
  },
});

type Handle = { show: (c: any[], e?: any) => void; close: () => void };

describe("CommentsDialog", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;
  let handle: Handle;
  let onUpdate: Mock<(value: any[]) => void>;

  function mountDialog(readOnly = false) {
    onUpdate = vi.fn<(value: any[]) => void>();
    app = createApp({
      render: () =>
        h(CommentsDialog, {
          readOnly,
          ref: (instance: any) => {
            handle = instance;
          },
          "onUpdate:modelValue": onUpdate,
        }),
    });
    app.component("Dialog", dialogStub);
    app.component("Popover", popoverStub);
    app.component("Textarea", textareaStub);
    app.component("Button", buttonStub);
    app.mount(root);
  }

  async function open(comments: any[]) {
    handle.show(comments);
    await nextTick();
  }

  async function type(text: string) {
    const textarea = root.querySelector("textarea")!;
    textarea.value = text;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
  }

  async function click(element: Element | null | undefined) {
    (element as HTMLElement).click();
    await nextTick();
  }

  const rowText = (index: number) =>
    Array.from(root.querySelectorAll("li p"))[index];
  const eraser = (index: number) =>
    root.querySelectorAll("button.pi-eraser")[index];
  const save = () =>
    Array.from(root.querySelectorAll("button")).find(
      (b) => b.textContent === "Save",
    );
  const lastEmitted = () => onUpdate.mock.calls.at(-1)![0];

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
    vi.restoreAllMocks();
  });

  it("adds a comment as { m, d } with the creation time and no author", async () => {
    mountDialog();
    await open([]);

    await type("buy milk");
    await click(root.querySelector("button.pi-plus"));
    await click(save());

    expect(lastEmitted()).toEqual([{ m: "buy milk", d: 1700000000000 }]);
    expect(Object.keys(lastEmitted()[0]).sort()).toEqual(["d", "m"]);
  });

  it("keeps the creation time when a comment is edited", async () => {
    mountDialog();
    await open([{ m: "old", d: 1600000000000 }]);

    await click(rowText(0));
    await type("new text");
    await click(root.querySelector("button.pi-check"));
    await click(save());

    expect(lastEmitted()).toEqual([{ m: "new text", d: 1600000000000 }]);
  });

  it("deletes only the targeted comment", async () => {
    mountDialog();
    await open([
      { m: "a", d: 1 },
      { m: "b", d: 2 },
    ]);

    await click(eraser(0));
    await click(save());

    expect(lastEmitted()).toEqual([{ m: "b", d: 2 }]);
  });

  it("deletes a comment when its edited text is emptied", async () => {
    mountDialog();
    await open([
      { m: "a", d: 1 },
      { m: "b", d: 2 },
    ]);

    await click(rowText(0));
    await type("");
    await click(root.querySelector("button.pi-check"));
    await click(save());

    expect(lastEmitted()).toEqual([{ m: "b", d: 2 }]);
  });

  describe("comments that share d (legacy d: 0)", () => {
    const legacy = () => [
      { m: "first", d: 0 },
      { m: "second", d: 0 },
      { m: "third", d: 0 },
    ];

    it("deletes only the targeted comment", async () => {
      mountDialog();
      await open(legacy());

      await click(eraser(1));
      await click(save());

      expect(lastEmitted()).toEqual([
        { m: "first", d: 0 },
        { m: "third", d: 0 },
      ]);
    });

    it("edits only the targeted comment", async () => {
      mountDialog();
      await open(legacy());

      await click(rowText(1));
      await type("changed");
      await click(root.querySelector("button.pi-check"));
      await click(save());

      expect(lastEmitted()).toEqual([
        { m: "first", d: 0 },
        { m: "changed", d: 0 },
        { m: "third", d: 0 },
      ]);
    });
  });

  it("renders each comment message in read-only mode", async () => {
    mountDialog(true);
    await open([
      { m: "first", d: 1 },
      { m: "second", d: 2 },
    ]);

    const texts = Array.from(root.querySelectorAll(".popover li p")).map((p) =>
      p.textContent?.trim(),
    );
    expect(texts).toEqual(["first", "second"]);
  });
});
