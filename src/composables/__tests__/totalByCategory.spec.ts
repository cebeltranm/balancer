// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useTotalByCategory } from "@/composables/totalByCategory";
import { useValuesStore } from "@/stores/values";
import { AccountType, Period } from "@/types";

describe("useTotalByCategory missing exchange rates", () => {
  let app: ReturnType<typeof createApp> | undefined;
  let root: HTMLDivElement;

  beforeEach(() => {
    setActivePinia(createPinia());
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  afterEach(() => {
    app?.unmount();
    root.remove();
  });

  it("returns a partial converted total and affected account metadata when an investment rate is missing", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const valuesStore = useValuesStore();
    valuesStore.values = {
      2026: {
        5: {
          usd_brokerage: { usd: 1 },
        },
      },
    };

    const category = {
      type: AccountType.Category,
      name: "Investments",
      children: {
        usd_brokerage: {
          id: "usd_brokerage",
          name: "USD Brokerage",
          type: AccountType.Stock,
          currency: "usd",
        },
        eur_brokerage: {
          id: "eur_brokerage",
          name: "Euro Brokerage",
          type: AccountType.Stock,
          currency: "eur",
        },
      },
    };
    const balance = {
      usd_brokerage: [
        {
          value: 100,
          in: 0,
          in_local: 0,
          out: 0,
          out_local: 0,
          expenses: 0,
        },
      ],
      eur_brokerage: [
        {
          value: 50,
          in: 0,
          in_local: 0,
          out: 0,
          out_local: 0,
          expenses: 0,
        },
      ],
    };

    let result: any;
    const Probe = defineComponent({
      setup() {
        const totalByCategory = useTotalByCategory();
        result = totalByCategory(
          category,
          balance,
          {
            type: Period.Month,
            value: { year: 2026, month: 5, quarter: 2 },
          },
          "table",
        );
        return () => h("div");
      },
    });

    app = createApp(Probe);
    app.use(pinia);
    app.provide("CURRENCY", ref("usd"));
    app.mount(root);

    expect(result.data.values[0].value).toBe(100);
    expect(result.data.missingRates).toEqual([
      {
        accountId: "eur_brokerage",
        accountName: "Euro Brokerage",
        asset: "eur",
        currency: "usd",
      },
    ]);
  });

  it("does not report an explicit zero rate as missing", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const valuesStore = useValuesStore();
    valuesStore.values = {
      2026: {
        5: {
          eur: { usd: 0 },
        },
      },
    };

    const category = {
      type: AccountType.Category,
      name: "Investments",
      children: {
        eur_brokerage: {
          id: "eur_brokerage",
          name: "Euro Brokerage",
          type: AccountType.Stock,
          currency: "eur",
        },
      },
    };
    const balance = {
      eur_brokerage: [
        {
          value: 50,
          in: 0,
          in_local: 0,
          out: 0,
          out_local: 0,
          expenses: 0,
        },
      ],
    };

    let result: any;
    const Probe = defineComponent({
      setup() {
        const totalByCategory = useTotalByCategory();
        result = totalByCategory(
          category,
          balance,
          {
            type: Period.Month,
            value: { year: 2026, month: 5, quarter: 2 },
          },
          "table",
        );
        return () => h("div");
      },
    });

    app = createApp(Probe);
    app.use(pinia);
    app.provide("CURRENCY", ref("usd"));
    app.mount(root);

    expect(result.data.values[0].value).toBe(0);
    expect(result.data.missingRates).toBeUndefined();
  });
});
