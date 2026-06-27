import Decimal from "decimal.js";

/**
 * Money — the only sanctioned way to represent currency in RAJASK.
 *
 * Architectural law #1: money is NEVER a float. We wrap Decimal.js so that no
 * application code can accidentally do `0.1 + 0.2` arithmetic on a `number`.
 * In Postgres the corresponding column is always `NUMERIC`.
 *
 * A Money value is immutable; every operation returns a new instance.
 */

// Configure Decimal globally for financial precision.
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN });

export type CurrencyCode = string; // ISO 4217, e.g. "INR", "USD", "AED"

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Currency mismatch: cannot combine ${a} and ${b}`);
    this.name = "CurrencyMismatchError";
  }
}

export class Money {
  private readonly amount: Decimal;
  public readonly currency: CurrencyCode;

  private constructor(amount: Decimal, currency: CurrencyCode) {
    this.amount = amount;
    this.currency = currency.toUpperCase();
  }

  /** Construct from a decimal string (preferred), number, or Decimal. */
  static of(value: string | number | Decimal, currency: CurrencyCode): Money {
    return new Money(new Decimal(value), currency);
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(new Decimal(0), currency);
  }

  /** Parse a value coming out of Postgres NUMERIC (always a string). */
  static fromDb(value: string | null, currency: CurrencyCode): Money {
    return new Money(new Decimal(value ?? "0"), currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  /** Multiply by a unitless scalar (e.g. quantity, tax rate). */
  multiply(scalar: string | number | Decimal): Money {
    return new Money(this.amount.times(new Decimal(scalar)), this.currency);
  }

  divide(scalar: string | number | Decimal): Money {
    return new Money(this.amount.div(new Decimal(scalar)), this.currency);
  }

  abs(): Money {
    return new Money(this.amount.abs(), this.currency);
  }

  negated(): Money {
    return new Money(this.amount.neg(), this.currency);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  isNegative(): boolean {
    return this.amount.isNegative();
  }

  isPositive(): boolean {
    return this.amount.greaterThan(0);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.greaterThan(other.amount);
  }

  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.greaterThanOrEqualTo(other.amount);
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.lessThan(other.amount);
  }

  lessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.lessThanOrEqualTo(other.amount);
  }

  /** Raw decimal string for persistence to a NUMERIC column. Never lossy. */
  toDb(): string {
    return this.amount.toFixed();
  }

  /** Human formatting via Intl. Falls back gracefully for unknown currencies. */
  format(locale = "en-IN"): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: this.currency,
      }).format(this.amount.toNumber());
    } catch {
      return `${this.currency} ${this.amount.toFixed(2)}`;
    }
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed()}`;
  }

  /** Snapshot for audit before/after payloads. */
  toJSON(): { amount: string; currency: CurrencyCode } {
    return { amount: this.toDb(), currency: this.currency };
  }
}
