/**
 * Helpers for the ISO alpha-2 `country` code the onlinerooms API returns
 * (e.g. "CO", "BR", ""). See docs/chaturbate-api.md.
 */

/** Human-readable names for the codes we surface most; extend as needed. */
const COUNTRY_NAMES: Record<string, string> = {
  CO: 'Colombia',
  VE: 'Venezuela',
  AR: 'Argentina',
  BR: 'Brazil',
  MX: 'Mexico',
  PE: 'Peru',
  CL: 'Chile',
  EC: 'Ecuador',
  US: 'United States',
  ES: 'Spain',
  RU: 'Russia',
  UA: 'Ukraine',
};

const ISO_ALPHA2 = /^[A-Za-z]{2}$/;

/** ISO alpha-2 → regional-indicator flag emoji ("CO" -> "🇨🇴"). Empty if invalid. */
export function countryToFlag(country: string): string {
  const code = country?.trim().toUpperCase();
  if (!code || !ISO_ALPHA2.test(code)) return '';
  const A = 0x1f1e6; // regional indicator "A"
  return String.fromCodePoint(
    A + (code.charCodeAt(0) - 65),
    A + (code.charCodeAt(1) - 65),
  );
}

/** Friendly country name, falling back to the raw code. */
export function countryName(country: string): string {
  const code = country?.trim().toUpperCase();
  if (!code) return '';
  return COUNTRY_NAMES[code] ?? code;
}

/** "🇨🇴 Colombia" — flag + name, or just the code, or empty. */
export function countryLabel(country: string): string {
  const flag = countryToFlag(country);
  const name = countryName(country);
  return [flag, name].filter(Boolean).join(' ');
}
