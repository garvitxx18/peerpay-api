/**
 * Money utility functions for handling BigInt amounts in minor units
 */

/**
 * Convert minor units (BigInt) to rupees string with 2 decimal places
 * @param minor - Amount in minor units (e.g., 100 = 1.00 INR)
 * @returns Formatted string (e.g., "1.00")
 */
export const toRupees = (minor: bigint): string => {
  return (Number(minor) / 100).toFixed(2);
};

/**
 * Convert rupees (number or string) to minor units (BigInt)
 * @param n - Amount in rupees (e.g., 1.50)
 * @returns Amount in minor units (e.g., 150n)
 */
export const toMinor = (n: number | string): bigint => {
  return BigInt(Math.round(Number(n) * 100));
};

/**
 * Recursively convert BigInt fields to strings in an object for JSON serialization
 * @param obj - Object that may contain BigInt values
 * @returns Object with BigInt values converted to strings
 */
export function bigintToString<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
  );
}
