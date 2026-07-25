import { describe, expect, it } from "vitest";
import format from "@/format";
import { Currency } from "@/types";

describe("format helper", () => {
  it("formats Mexican pesos with the MXN currency code", () => {
    const formatted = format.currency(1234.56, Currency.MXN);

    expect(formatted).toContain("MX$");
    expect(formatted).toContain("1,234.56");
  });
});
