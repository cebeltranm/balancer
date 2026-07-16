// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import HomeView from "@/views/HomeView.vue";
import { AccountType, type BalanceEntry } from "@/types";

const storeMocks = vi.hoisted(() => ({
  authenticated: false,
  accounts: {} as Record<
    string,
    {
      id: string;
      name: string;
      type: string;
      currency: string;
    }
  >,
  balance: {} as Record<number, Record<string, Record<number, BalanceEntry>>>,
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
    accounts: storeMocks.accounts,
  }),
}));

vi.mock("@/stores/balance", () => ({
  useBalanceStore: () => ({
    balance: storeMocks.balance,
  }),
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    status: {
      authenticated: storeMocks.authenticated,
    },
  }),
}));

vi.mock("@/components/AccountValueCard.vue", () => ({
  default: defineComponent({
    props: {
      name: {
        type: String,
        required: true,
      },
      value: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        required: true,
      },
    },
    setup(props) {
      return () =>
        h("article", `${props.name}: ${props.value} ${props.currency}`);
    },
  }),
}));

function entry(value: number): BalanceEntry {
  return {
    value,
    expenses: 0,
    in: 0,
    out: 0,
    in_local: 0,
    out_local: 0,
    units: 0,
  };
}

async function mountHome(root: HTMLElement) {
  const app = createApp(HomeView);
  app.mount(root);
  await nextTick();
  return app;
}

describe("HomeView dashboard empty state", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    storeMocks.authenticated = false;
    storeMocks.accounts = {};
    storeMocks.balance = {};
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("shows the read-only empty state when no current balance cards are available", async () => {
    app = await mountHome(root);

    expect(root.textContent).toContain("No current balance data available");
  });

  it("shows current balance cards and hides the empty state when card data is available", async () => {
    storeMocks.accounts = {
      groceries: {
        id: "groceries",
        name: "Groceries",
        type: AccountType.Expense,
        currency: "usd",
      },
    };
    storeMocks.balance = {
      2026: {
        groceries: {
          5: entry(125),
        },
      },
    };

    app = await mountHome(root);

    expect(root.textContent).toContain("Expenses: 125 usd");
    expect(root.textContent).not.toContain("No current balance data available");
  });
});
