/**
 * Centralized Monetary Arithmetic & Precision Utilities
 * Avoids IEEE 754 floating-point drift by performing calculations in minor units (paise/cents)
 * and providing precision-safe helpers.
 */

/**
 * Converts a decimal monetary amount (e.g. 19.99) to integer minor units (1999 paise).
 */
export function toMinorUnits(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Converts integer minor units (e.g. 1999 paise) back to decimal units (19.99).
 */
export function fromMinorUnits(minorUnits: number): number {
  if (isNaN(minorUnits) || !isFinite(minorUnits)) return 0;
  return minorUnits / 100;
}

/**
 * Quantizes and rounds any currency amount to strictly 2 decimal places.
 */
export function roundCurrency(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

/**
 * Adds two monetary amounts with minor-unit integer precision.
 */
export function addMoney(a: number, b: number): number {
  return fromMinorUnits(toMinorUnits(a) + toMinorUnits(b));
}

/**
 * Subtracts b from a with minor-unit integer precision.
 */
export function subtractMoney(a: number, b: number): number {
  return fromMinorUnits(toMinorUnits(a) - toMinorUnits(b));
}

/**
 * Compares two monetary amounts with minor-unit precision.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compareMoney(a: number, b: number): -1 | 0 | 1 {
  const diff = toMinorUnits(a) - toMinorUnits(b);
  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return 0;
}

