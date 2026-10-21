// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import Values from "@/views/Values.vue";
import { EVENTS } from "@/helpers/events";
import { AccountGroupType, AccountType, Currency } from "@/types";

const valueStoreMocks = vi.hoisted(() => ({
  getValue: vi.fn(() => 1),
  loadValuesForYear: vi.fn(),
  setValuesForMonth: vi.fn(),
  recalculateBalance: vi.fn(),
  cellEditComplete: undefined as undefined | ((event: any) => void),
  rows: [] as any[],
}));

vi.mock("@/components/PeriodSelector.vue", () => ({
  default: defineComponent({
    emits: ["update:period"],
    setup() {
      return () => h("div");
    },
  }),
}));

vi.mock("@/helpers/options", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/helpers/options")>();

  return {
    ...actual,
    getCurrentPeriod: vi.fn(() => ({ year: 2026, month: 5, quarter: 2 })),
  };
});

vi.mock("@/stores/accounts", () => ({
  useAccountsStore: () => ({
    activeAccounts: () => [
      {
        id: "checking",
        name: "Checking",
        type: AccountType.BankAccount,
        currency: Currency.COP,
      },
      {
        id: "mxn_checking",
        name: "MXN Checking",
        type: AccountType.BankAccount,
        currency: Currency.MXN,
      },
      {
        id: "btc_wallet",
        name: "BTC",
        type: AccountType.Crypto,
        currency: Currency.USD,
        symbol: "BTC",
      },
    ],
    getAccountGroupType: (id: string) =>
      id === "btc_wallet"
        ? AccountGroupType.Investments
        : AccountGroupType.Assets,
  }),
}));

vi.mock("@/stores/config", () => ({
  useConfigStore: () => ({
    config: {},
  }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    executeInSync: async (promise: Promise<unknown>) => promise,
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    recalculateBalance: valueStoreMocks.recalculateBalance,
  }),
}));

vi.mock("@/stores/values", () => ({
  useValuesStore: () => ({
    values: {},
    getValue: valueStoreMocks.getValue,
    loadValuesForYear: valueStoreMocks.loadValuesForYear,
    setValuesForMonth: valueStoreMocks.setValuesForMonth,
  }),
}));

function toolbarStub() {
  return defineComponent({
    inheritAttrs: false,
    setup(_, { slots }) {
      return () => h("div", [slots.start?.(), slots.end?.()]);
    },
  });
}

const buttonStub = defineComponent({
  props: {
    icon: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
  },
  setup(props, { attrs }) {
    return () => h("button", attrs, props.label || props.icon);
  },
});

const emptyStub = defineComponent({
  inheritAttrs: false,
  setup() {
    return () => h("div");
  },
});

// Renders one row per value and exposes the cell-edit-complete handler so
// tests can drive inline edits the way PrimeVue's DataTable reports them.
const dataTableStub = defineComponent({
  inheritAttrs: false,
  props: {
    value: { type: Array, default: () => [] },
    rowClass: { type: Function, default: undefined },
  },
  setup(props, { attrs }) {
    return () => {
      valueStoreMocks.cellEditComplete = attrs.onCellEditComplete as any;
      valueStoreMocks.rows = props.value as any[];
      return h(
        "table",
        (props.value as any[]).map((row) =>
          h(
            "tr",
            { "data-id": row.id, class: props.rowClass?.(row) },
            row.name,
          ),
        ),
      );
    };
  },
});

function response(status: number, data: unknown = {}) {
  return {
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

async function mountValues(root: HTMLElement, dataTable = emptyStub) {
  const app = createApp(Values);
  app.config.errorHandler = vi.fn();
  app.component("Toolbar", toolbarStub());
  app.component("Button", buttonStub);
  app.component("DataTable", dataTable);
  app.component("Column", emptyStub);
  app.component("MultiSelect", emptyStub);
  app.component("InputNumber", emptyStub);
  app.directive("tooltip", {});

  app.mount(root);
  await nextTick();
  return app;
}

async function clickSync(root: HTMLElement) {
  const syncButton = Array.from(root.querySelectorAll("button")).find(
    (button) => button.textContent === "pi pi-sync",
  );
  expect(syncButton).toBeTruthy();

  syncButton?.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function clickSave(root: HTMLElement) {
  const saveButton = Array.from(root.querySelectorAll("button")).find(
    (button) => button.textContent === "Save",
  );
  expect(saveButton).toBeTruthy();

  saveButton?.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await nextTick();
  await Promise.resolve();
}

function expectOneGenericExternalValueError(emit: ReturnType<typeof vi.spyOn>) {
  const valueSyncErrors = emit.mock.calls.filter(
    ([eventName, payload]) =>
      eventName === "message" &&
      typeof payload === "object" &&
      payload !== null &&
      "severity" in payload &&
      payload.severity === "error" &&
      "message" in payload &&
      /value sync failed/i.test(String(payload.message)),
  );

  expect(valueSyncErrors).toHaveLength(1);
  expect(valueSyncErrors[0][1]).toEqual(
    expect.objectContaining({
      severity: "error",
      summary: "Value sync failed",
      message: expect.stringMatching(
        /some prices or exchange rates may be stale/i,
      ),
    }),
  );
  expect(String(valueSyncErrors[0][1].message)).not.toMatch(
    /currency|crypto|stock|provider|row|usd|btc|cop/i,
  );
}

describe("Values external sync", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;
  let emit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    emit = vi.spyOn(EVENTS, "emit");
    valueStoreMocks.getValue.mockReturnValue(1);
    valueStoreMocks.loadValuesForYear.mockReset();
    valueStoreMocks.setValuesForMonth.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows one generic error when an external provider returns a non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValue(response(503));
    app = await mountValues(root);

    await clickSync(root);

    expect(fetch).toHaveBeenCalledTimes(2);
    expectOneGenericExternalValueError(emit);
  });

  it("shows one generic error when an external provider request rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    app = await mountValues(root);

    await clickSync(root);

    expect(fetch).toHaveBeenCalledTimes(2);
    expectOneGenericExternalValueError(emit);
  });

  it("shows one generic error when a provider payload is malformed", async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, {}));
    app = await mountValues(root);

    await clickSync(root);

    expect(fetch).toHaveBeenCalledTimes(2);
    expectOneGenericExternalValueError(emit);
  });

  it("shows only one generic error when multiple providers fail in one sync attempt", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(502));
    app = await mountValues(root);

    await clickSync(root);

    expect(fetch).toHaveBeenCalledTimes(2);
    expectOneGenericExternalValueError(emit);
  });

  it("does not show a warning when rendered values come from prior-month fallback", async () => {
    valueStoreMocks.getValue.mockReturnValue(3900);
    app = await mountValues(root);

    const warningMessages = emit.mock.calls.filter(
      ([eventName, payload]) =>
        eventName === "message" &&
        typeof payload === "object" &&
        payload !== null &&
        "severity" in payload &&
        payload.severity === "warn",
    );

    expect(valueStoreMocks.getValue).toHaveBeenCalled();
    expect(warningMessages).toHaveLength(0);
  });

  it("synchronizes and saves the MXN exchange rate for an active MXN account", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        response(200, {
          usd: {
            cop: 4100,
            mxn: 17.5,
          },
        }),
      )
      .mockResolvedValueOnce(
        response(200, {
          btc: {
            usd: 65000,
          },
        }),
      );
    app = await mountValues(root);

    await clickSync(root);
    await clickSave(root);

    expect(valueStoreMocks.setValuesForMonth).toHaveBeenCalledWith(
      2026,
      5,
      expect.objectContaining({
        usd: expect.objectContaining({
          mxn: 17.5,
        }),
      }),
    );
    expect(
      emit.mock.calls.filter(
        ([eventName, payload]) =>
          eventName === "message" &&
          typeof payload === "object" &&
          payload !== null &&
          "severity" in payload &&
          payload.severity === "error",
      ),
    ).toHaveLength(0);
  });
});

describe("Values manual editing and save", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    valueStoreMocks.getValue.mockReturnValue(1);
    valueStoreMocks.loadValuesForYear.mockReset();
    valueStoreMocks.setValuesForMonth.mockReset();
    valueStoreMocks.recalculateBalance.mockReset();
    valueStoreMocks.cellEditComplete = undefined;
    valueStoreMocks.rows = [];
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function saveButton() {
    return Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === "Save",
    ) as HTMLButtonElement;
  }

  function rowOf(id: string) {
    return root.querySelector(`tr[data-id="${id}"]`);
  }

  function editRow(id: string, value: unknown) {
    const row = valueStoreMocks.rows.find((r) => r.id === id);
    expect(row).toBeTruthy();
    valueStoreMocks.cellEditComplete?.({
      data: row,
      newData: { ...row, value },
    });
  }

  it("marks the row pending and enables Save after a non-negative edit", async () => {
    app = await mountValues(root, dataTableStub);
    expect(saveButton().disabled).toBe(true);
    expect(rowOf("btc_wallet")?.className ?? "").not.toContain("bg-red-900");

    editRow("btc_wallet", 70000);
    await nextTick();

    expect(saveButton().disabled).toBe(false);
    expect(rowOf("btc_wallet")?.className).toContain("bg-red-900");
    expect(rowOf("mxn_checking_usd")?.className ?? "").not.toContain(
      "bg-red-900",
    );
  });

  it("ignores negative and unchanged values", async () => {
    app = await mountValues(root, dataTableStub);

    editRow("btc_wallet", -1);
    await nextTick();
    expect(saveButton().disabled).toBe(true);
    expect(rowOf("btc_wallet")?.className ?? "").not.toContain("bg-red-900");

    // getValue returns 1 for every row, so 1 is the unchanged value.
    editRow("btc_wallet", 1);
    await nextTick();
    expect(saveButton().disabled).toBe(true);
    expect(rowOf("btc_wallet")?.className ?? "").not.toContain("bg-red-900");
  });

  it("saves the edited value and triggers a forced balance recalculation for the period", async () => {
    app = await mountValues(root, dataTableStub);
    editRow("btc_wallet", 70000);
    await nextTick();

    await clickSave(root);

    expect(valueStoreMocks.setValuesForMonth).toHaveBeenCalledWith(
      2026,
      5,
      expect.objectContaining({ btc_wallet: { usd: 70000 } }),
    );
    expect(valueStoreMocks.recalculateBalance).toHaveBeenCalledTimes(1);
    expect(valueStoreMocks.recalculateBalance).toHaveBeenCalledWith(
      2026,
      5,
      true,
    );
  });
});
