/**
 * Stripchat white-label outbound links, analogous to whiteLabel.ts (Chaturbate).
 *
 * The white label (e.g. cams.xlugar.com) is the retention destination that still
 * pays out under your Stripcash affiliate account. Clicks on Stripchat cards go
 * there; if it isn't configured we fall back to the `clickUrl` the API returns
 * (which already carries your affiliation), so links never break.
 *
 * Env:
 *   PUBLIC_STRIPCHAT_WHITELABEL_URL — full WL base (no trailing slash needed).
 *   PUBLIC_STRIPCHAT_USER_ID        — affiliate userId, forwarded for attribution.
 *
 * NOTE: confirm the exact deep-link format in your Stripcash white-label panel
 * (path `/{username}` vs. query param, and whether `userId` is embedded in the
 * domain or passed as a query param) and adjust below if needed.
 */

const SC_WL = (import.meta.env.PUBLIC_STRIPCHAT_WHITELABEL_URL ?? '').trim();
const SC_USER = (import.meta.env.PUBLIC_STRIPCHAT_USER_ID ?? '').trim();

/** True when a Stripchat white-label base URL is configured. */
export const hasStripchatWL = SC_WL.length > 0;

/** Base guaranteed to end with a single trailing slash (for relative resolution). */
const SC_WL_BASE = SC_WL.endsWith('/') ? SC_WL : `${SC_WL}/`;

/**
 * Deep-link to a model's room on the white label, else the affiliate `clickUrl`.
 * Pass the API `clickUrl` as the fallback so a missing WL never breaks the link.
 *
 * @example
 *   buildStripchatRoomLink('alice', model.clickUrl)
 *   // -> https://cams.xlugar.com/alice/?userId=123456
 */
export function buildStripchatRoomLink(username: string, clickUrl: string): string {
  if (!hasStripchatWL) return clickUrl;
  const url = new URL(`${encodeURIComponent(username)}/`, SC_WL_BASE);
  // Forward userId for attribution even if the WL already carries affiliation.
  if (SC_USER && !url.searchParams.has('userId')) {
    url.searchParams.set('userId', SC_USER);
  }
  return url.href;
}
