import { describe, expect, it } from "vitest";
import { AccountType } from "@/types";
import {
  createEmptyBalanceEntry,
  normalizeAccount,
  normalizeConfig,
  normalizeTransaction,
  normalizeValueData,
  normalizeYearlyBalanceData,
} from "@/helpers/persistedShapes";

describe("persisted shape normalizers", () => {
  it("normalizes accounts by adding id and ignoring deprecated fields", () => {
    expect(
      normalizeAccount("cash_1", {
        name: "Wallet",
        type: AccountType.Cash,
        currency: "usd",
        activeFrom: "2025-01-01",
        legacyBalance: 100,
      } as any),
    ).toEqual({
      id: "cash_1",
      name: "Wallet",
      type: AccountType.Cash,
      currency: "usd",
      activeFrom: new Date("2025-01-01"),
    });
  });

  it("normalizes config by applying default data for missing structures", () => {
    expect(normalizeConfig({})).toEqual({
      stock_api: {},
      inv_composition: {},
    });
  });

  it("normalizes transactions by ignoring deprecated transaction fields", () => {
    expect(
      normalizeTransaction({
        id: 1,
        date: "2025-02-15",
        description: "A",
        values: [{ accountId: "cash", value: 10, legacyRate: 3900 }],
        legacyCategory: "old",
      }),
    ).toEqual({
      id: 1,
      date: "2025-02-15",
      description: "A",
      values: [{ accountId: "cash", value: 10 }],
    });
  });

  it("normalizes value data by keeping month keys and numeric rates only", () => {
    expect(
      normalizeValueData({
        1: {
          usd: { cop: 3900, legacySource: "old-api" },
          legacyAsset: { usd: "invalid" },
        },
        old_metadata: { provider: "legacy" },
      }),
    ).toEqual({
      1: {
        usd: { cop: 3900 },
      },
    });
  });

  it("normalizes balance data by defaulting entries and ignoring deprecated structures", () => {
    expect(
      normalizeYearlyBalanceData({
        cash_wallet: {
          1: {
            value: 125,
            legacyValue: 100,
          },
        },
        legacySummary: {
          value: 999,
        },
      }),
    ).toEqual({
      cash_wallet: {
        1: {
          ...createEmptyBalanceEntry(),
          value: 125,
        },
      },
    });
  });
});
