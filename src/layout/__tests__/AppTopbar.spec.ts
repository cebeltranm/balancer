// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import AppTopbar from "@/layout/AppTopbar.vue";
import { useAccountsStore } from "@/stores/accounts";
import { AccountType, Currency, type Account } from "@/types";

vi.mock("@/components/TransactionTypeDialog.vue", () => ({
  default: defineComponent({
    setup() {
      return () => h("div");
    },
  }),
}));

const storageState = vi.hoisted(() => ({
  status: {
    inSync: false,
    syncFailed: false,
    loggedIn: false,
    offline: false,
  },
}));

vi.mock("@/stores/storage", () => ({
  useStorageStore: () => ({
    pendingToSync: {
      transactions: 0,
      files: 0,
    },
    status: storageState.status,
    sync: vi.fn(),
  }),
}));

const toolbarStub = defineComponent({
  setup(_, { slots }) {
    return () => h("div", [slots.start?.(), slots.end?.()]);
  },
});

const buttonStub = defineComponent({
  inheritAttrs: false,
  props: {
    icon: {
      type: String,
      default: "",
    },
  },
  setup(props, { attrs, slots }) {
    return () => h("button", attrs, [props.icon, slots.default?.()]);
  },
});

const menuStub = defineComponent({
  props: {
    model: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    return () =>
      h(
        "ul",
        (props.model as { label: string; command: () => void }[]).map((item) =>
          h("li", { onClick: item.command }, item.label),
        ),
      );
  },
});

function account(id: string, currency: string, extra: Partial<Account> = {}) {
  return {
    id,
    name: id,
    type: AccountType.BankAccount,
    currency,
    ...extra,
  } as Account;
}

function monthsFromNow(months: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return date;
}

describe("AppTopbar currencies", () => {
  let root: HTMLDivElement;
  let app: ReturnType<typeof createApp> | undefined;

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  function mountTopbar(
    accounts: Account[] = [],
    currency: Currency = Currency.USD,
  ) {
    root = document.createElement("div");
    document.body.appendChild(root);
    const CURRENCY = ref(currency);
    const pinia = createPinia();
    app = createApp(AppTopbar);
    app.use(pinia);
    app.provide("CURRENCY", CURRENCY);
    app.component("Toolbar", toolbarStub);
    app.component("Button", buttonStub);
    app.component("Menu", menuStub);
    useAccountsStore(pinia).accounts = Object.fromEntries(
      accounts.map((a) => [a.id, a]),
    );
    app.mount(root);
    return { CURRENCY, pinia };
  }

  const listed = () =>
    Array.from(root.querySelectorAll("li")).map((item) => item.textContent);
  const currencyButton = () =>
    root.querySelector('[aria-label="Currencies"]') as HTMLButtonElement;

  it("offers MXN and displays its uppercase currency code", () => {
    mountTopbar([account("mx", "mxn")], Currency.MXN);

    expect(root.textContent).toContain("MXN");
    expect(listed()).toContain("MXN");
  });

  it("lists only currencies of active accounts in enum order (RT-046)", () => {
    mountTopbar(
      [account("a", "usd"), account("b", "cop"), account("c", "usd")],
      Currency.COP,
    );

    expect(listed()).toEqual(["COP", "USD"]);
  });

  it("does not list a currency whose only account is hidden or not yet active (RT-046)", () => {
    mountTopbar(
      [
        account("cop", "cop"),
        account("hidden", "eur", { hideSince: monthsFromNow(-2) }),
        account("future", "mxn", { activeFrom: monthsFromNow(2) }),
        account("hides_later", "btc", { hideSince: monthsFromNow(2) }),
      ],
      Currency.COP,
    );

    expect(listed()).toEqual(["COP", "BTC"]);
  });

  it("lists currencies used only by income, expense or liability accounts (RT-046)", () => {
    mountTopbar(
      [
        account("cop", "cop"),
        account("inc", "usd", { type: AccountType.Income }),
        account("exp", "eur", { type: AccountType.Expense }),
        account("card", "mxn", { type: AccountType.CreditCard }),
      ],
      Currency.COP,
    );

    expect(listed()).toEqual(["COP", "USD", "EUR", "MXN"]);
  });

  it("ignores account currencies outside the Currency enum (RT-046)", () => {
    mountTopbar([account("a", "usd"), account("b", "gbp")], Currency.USD);

    expect(listed()).toEqual(["USD"]);
  });

  it("switches CURRENCY to the first available currency when it has no active account (RT-046)", () => {
    const { CURRENCY } = mountTopbar(
      [account("a", "eur"), account("b", "usd")],
      Currency.COP,
    );

    expect(CURRENCY.value).toBe(Currency.USD);
  });

  it("keeps CURRENCY when it has an active account (RT-046)", () => {
    const { CURRENCY } = mountTopbar(
      [account("a", "cop"), account("b", "usd")],
      Currency.USD,
    );

    expect(CURRENCY.value).toBe(Currency.USD);
  });

  it("switches CURRENCY when its last active account is hidden later (RT-046)", async () => {
    const { CURRENCY, pinia } = mountTopbar(
      [account("a", "cop"), account("b", "usd")],
      Currency.USD,
    );

    const accounts = useAccountsStore(pinia);
    accounts.accounts = {
      ...accounts.accounts,
      b: account("b", "usd", { hideSince: monthsFromNow(-1) }),
    };
    await nextTick();

    expect(CURRENCY.value).toBe(Currency.COP);
    expect(listed()).toEqual(["COP"]);
  });

  it("shows an empty menu, disables the button and keeps CURRENCY without active accounts (RT-046)", () => {
    const { CURRENCY } = mountTopbar([], Currency.EUR);

    expect(listed()).toEqual([]);
    expect(currencyButton().disabled).toBe(true);
    expect(CURRENCY.value).toBe(Currency.EUR);
  });

  it("enables the button and shows a one-item menu for a single currency (RT-046)", () => {
    mountTopbar([account("a", "usd")], Currency.USD);

    expect(listed()).toEqual(["USD"]);
    expect(currencyButton().disabled).toBe(false);
  });

  it("sets CURRENCY when a menu item is picked (RT-046)", async () => {
    const { CURRENCY } = mountTopbar(
      [account("a", "usd"), account("b", "eur")],
      Currency.USD,
    );

    (root.querySelectorAll("li")[1] as HTMLElement).click();
    await nextTick();

    expect(CURRENCY.value).toBe(Currency.EUR);
  });

  it("shows an offline indicator only when logged in and offline", () => {
    storageState.status.loggedIn = true;
    storageState.status.offline = true;
    mountTopbar([account("a", "usd")]);
    expect(root.querySelector('[data-testid="offline-indicator"]')).not.toBe(
      null,
    );
    app?.unmount();
    root.remove();

    storageState.status.offline = false;
    mountTopbar([account("a", "usd")]);
    expect(root.querySelector('[data-testid="offline-indicator"]')).toBe(null);
  });
});
