import { describe, expect, it } from "vitest";
import {
  accountsGrupedByAttribute,
  mapInvestmentsBySubCategory,
} from "@/helpers/investments";

describe("investments helper", () => {
  it("maps nested investments with expected values", () => {
    const mapped = mapInvestmentsBySubCategory(
      {
        Equities: {
          US: {
            a1: { id: "a1", name: "SPY", type: "ETF" },
          },
        },
      },
      {
        Equities: {
          value: 60,
          US: {
            value: 60,
            ETF: { value: 60 },
          },
        },
      },
    );

    expect(mapped[0].name).toBe("Equities");
    expect(mapped[0].expected).toBe(60);
    expect(mapped[0].children[0].children[0].expected).toBe(60);
  });

  it("treats missing expected entries as zero (RT-019)", () => {
    const mapped = mapInvestmentsBySubCategory(
      {
        Equities: {
          US: { a1: { id: "a1", name: "SPY", type: "ETF" } },
          Global: { a2: { id: "a2", name: "VT", type: "ETF" } },
        },
        Cash: {
          US: { a3: { id: "a3", name: "MMF", type: "MutualFund" } },
        },
      },
      {
        Equities: { value: 1, US: { value: 1, ETF: { value: 1 } } },
      },
    );

    const [equities, cash] = mapped;
    expect(equities.expected).toBe(1);
    expect(equities.children[1].name).toBe("Global");
    expect(equities.children[1].expected).toBe(0);
    expect(cash.expected).toBe(0);
    expect(cash.children[0].expected).toBe(0);
  });

  it("groups accounts by selected attribute", () => {
    const grouped = accountsGrupedByAttribute(
      [
        {
          id: "a",
          name: "A",
          currency: "usd",
          type: "Cash",
          category: [],
          entity: "BrokerA",
        } as any,
        {
          id: "b",
          name: "B",
          currency: "usd",
          type: "Cash",
          category: [],
        } as any,
      ],
      "entity",
      "Unknown",
    );

    expect(Object.keys(grouped)).toEqual(["BrokerA", "Unknown"]);
    expect(grouped.BrokerA.a.name).toBe("A");
    expect(grouped.Unknown.b.name).toBe("B");
  });
});
