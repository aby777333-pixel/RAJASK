import { describe, it, expect } from "vitest";
import { Money, CurrencyMismatchError } from "./money";

describe("Money", () => {
  it("does exact decimal arithmetic (no float drift)", () => {
    const a = Money.of("0.1", "INR");
    const b = Money.of("0.2", "INR");
    expect(a.add(b).toDb()).toBe("0.3");
  });

  it("round-trips through the DB representation losslessly", () => {
    const m = Money.of("123456789.123456789", "USD");
    const back = Money.fromDb(m.toDb(), "USD");
    expect(back.equals(m)).toBe(true);
  });

  it("refuses to combine mismatched currencies", () => {
    const inr = Money.of("100", "INR");
    const usd = Money.of("100", "USD");
    expect(() => inr.add(usd)).toThrow(CurrencyMismatchError);
  });

  it("compares against authority limits (SEAL DOA)", () => {
    const limit = Money.of("500000", "INR");
    const request = Money.of("500000.01", "INR");
    expect(request.greaterThan(limit)).toBe(true);
    expect(limit.greaterThanOrEqual(Money.of("500000", "INR"))).toBe(true);
  });

  it("multiplies by a unitless scalar", () => {
    const price = Money.of("99.99", "INR");
    expect(price.multiply(3).toDb()).toBe("299.97");
  });

  it("normalises currency case", () => {
    expect(Money.of("1", "inr").currency).toBe("INR");
  });
});
