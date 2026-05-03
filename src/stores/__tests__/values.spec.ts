import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useValuesStore } from "@/stores/values";
import { readJsonFile } from "@/helpers/files";
import * as idb from "@/helpers/idb";

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
}));

vi.mock("@/helpers/idb", () => ({
  saveJsonFile: vi.fn(),
}));

vi.mock("@/helpers/options", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/helpers/options")>();

  return {
    ...actual,
    getCurrentPeriod: vi.fn(() => ({ year: 2026, month: 5, quarter: 2 })),
  };
});

describe("values store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("resolves direct, inverse, and cross-currency values", () => {
    const store = useValuesStore();
    store.values = {
      2025: {
        2: {
          btc: { usd: 50000 },
          usd: { cop: 4000 },
          eur: { usd: 1.1 },
        },
      },
    };

    const date = new Date("2025-02-15T00:00:00.000Z");
    expect(store.getValue(date, "btc", "usd")).toBe(50000);
    expect(store.getValue(date, "cop", "usd")).toBeCloseTo(1 / 4000);
    expect(store.getValue(date, "eur", "cop")).toBeCloseTo(1.1 * 4000);
  });

  it("keeps explicit zero values instead of falling back to prior months", () => {
    const store = useValuesStore();
    store.values = {
      2025: {
        1: {
          fund_a: { usd: 15 },
        },
        2: {
          fund_a: { usd: 0 },
        },
      },
    };

    const date = new Date("2025-02-15T00:00:00.000Z");
    expect(store.getValue(date, "fund_a", "usd")).toBe(0);
  });

  it("loads values, saves month values, and joins values", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      1: {
        usd: { cop: 3900 },
      },
    });

    const store = useValuesStore();
    await store.loadValuesForYear(2025, true);
    await store.setValuesForMonth(2025, 2, {
      usd: { cop: 4000 },
    } as any);

    expect(idb.saveJsonFile).toHaveBeenCalledTimes(1);

    store.values = {
      2025: {
        2: {
          usd: { cop: 4000 },
        },
      },
    };

    const total = store.joinValues(
      new Date("2025-02-10T00:00:00.000Z"),
      "cop",
      [
        { value: 2, asset: "usd" },
        { value: 1000, asset: "cop" },
      ] as any,
    );

    expect(total).toBe(9000);
  });

  it("copies previous month values when the current month does not exist", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      if (fileName === "values_2026.json") {
        return {
          4: {
            usd: { cop: 4000 },
            btc: { usd: 60000 },
          },
        };
      }

      return false;
    });

    const store = useValuesStore();
    await store.ensureCurrentMonthValues(true);

    expect(store.values[2026][5]).toEqual({
      usd: { cop: 4000 },
      btc: { usd: 60000 },
    });
    expect(store.values[2026][5]).not.toBe(store.values[2026][4]);
    expect(idb.saveJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "values_2026.json",
        data: expect.objectContaining({
          5: {
            usd: { cop: 4000 },
            btc: { usd: 60000 },
          },
        }),
        to_sync: true,
      }),
    );
  });

  it("keeps current month values when they already exist", async () => {
    vi.mocked(readJsonFile).mockImplementation(async (fileName) => {
      if (fileName === "values_2026.json") {
        return {
          4: {
            usd: { cop: 4000 },
          },
          5: {
            usd: { cop: 4100 },
          },
        };
      }

      return false;
    });

    const store = useValuesStore();
    await store.ensureCurrentMonthValues(true);

    expect(store.values[2026][5]).toEqual({
      usd: { cop: 4100 },
    });
    expect(idb.saveJsonFile).not.toHaveBeenCalled();
  });
});
