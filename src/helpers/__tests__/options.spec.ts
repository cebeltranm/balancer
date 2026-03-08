import { beforeEach, describe, expect, it, vi } from "vitest";
import { Period } from "@/types";

vi.mock("vue-intl", () => ({
  useIntl: () => ({
    formatDate: (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}`,
  }),
}));

import {
  getCurrentPeriod,
  getOptionPerPeriod,
  getPeriodDate,
  increasePeriod,
  periodLabel,
  rowPendingSyncClass,
} from "@/helpers/options";

describe("options helper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-15T12:00:00.000Z"));
  });

  it("returns current period and pending class", () => {
    expect(getCurrentPeriod()).toEqual({ year: 2025, month: 2, quarter: 1 });
    expect(rowPendingSyncClass({ to_sync: true })).toBe("bg-red-900");
    expect(rowPendingSyncClass({ to_sync: false })).toBeNull();
  });

  it("increases month/quarter/year periods", () => {
    expect(
      increasePeriod(Period.Month, { year: 2025, month: 1, quarter: 1 }, -1),
    ).toEqual({
      year: 2024,
      month: 12,
      quarter: 4,
    });

    expect(
      increasePeriod(Period.Quarter, { year: 2025, month: 3, quarter: 1 }, 1),
    ).toEqual({
      year: 2025,
      quarter: 2,
      month: 6,
    });

    expect(
      increasePeriod(Period.Year, { year: 2024, month: 12, quarter: 4 }, 1),
    ).toEqual({
      year: 2025,
      quarter: 1,
      month: 2,
    });
  });

  it("builds labels, options, and period dates", () => {
    expect(
      periodLabel(Period.Quarter, { year: 2025, month: 6, quarter: 2 }),
    ).toBe("2025 / Q2");

    const monthOptions = getOptionPerPeriod("Month");
    expect(monthOptions).toHaveLength(14);
    expect(monthOptions[0].name).toBe("2025-2");

    const yearOptions = getOptionPerPeriod("Year");
    expect(yearOptions[0].name).toBe(2025);

    const pastMonthDate = getPeriodDate(Period.Month, {
      year: 2024,
      month: 12,
      quarter: 4,
    });
    expect(pastMonthDate.getDate()).toBe(2);

    const currentMonthDate = getPeriodDate(Period.Month, {
      year: 2025,
      month: 2,
      quarter: 1,
    });
    expect(currentMonthDate.getDate()).toBe(15);
  });
});
