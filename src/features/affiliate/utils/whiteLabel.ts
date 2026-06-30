import type { Track } from '../types';
import { CAMPAIGN } from './affiliate';

/**
 * White Label = the retention destination. Chaturbate's White Label lets us
 * route users to a co-branded experience that still pays out under our
 * affiliate account. The base URL is account-specific and comes from env.
 *
 * PUBLIC_WHITELABEL_URL expected value:
 *   The full White Label base URL provisioned in your Chaturbate affiliate
 *   account (Affiliate > White Labels). It typically looks like:
 *     https://your-brand.chaturbate.com/
 *   or a custom domain pointed at the White Label. If the WL base already
 *   carries its own affiliate identifier, this util still forwards campaign +
 *   UTM params so attribution and analytics stay intact end-to-end.
 *
 * Centralized here so no page rebuilds White Label links by hand.
 */

const WHITELABEL_BASE = (import.meta.env.PUBLIC_WHITELABEL_URL ?? '').trim();

export interface WhiteLabelOptions {
  /** Traffic-source label, forwarded as `track` for affiliate attribution. */
  track?: Track;
  /** Extra UTM (or arbitrary) params to preserve when routing to the WL. */
  utm?: Record<string, string>;
}

/** True when a White Label base URL is configured. */
export const hasWhiteLabel = WHITELABEL_BASE.length > 0;

/**
 * Build a White Label URL with affiliate + UTM params preserved.
 * Falls back to '#' only if PUBLIC_WHITELABEL_URL is unset (so the build never
 * breaks); callers should gate visible CTAs on `hasWhiteLabel`.
 *
 * @example
 *   buildWhiteLabelLink({ track: 'home' })
 *   buildWhiteLabelLink({ track: 'catalog', utm: { utm_source: 'models' } })
 */
export function buildWhiteLabelLink(opts: WhiteLabelOptions = {}): string {
  if (!hasWhiteLabel) return '#';
  const url = new URL(WHITELABEL_BASE);
  if (CAMPAIGN && !url.searchParams.has('campaign')) {
    url.searchParams.set('campaign', CAMPAIGN);
  }
  if (opts.track) url.searchParams.set('track', opts.track);
  for (const [k, v] of Object.entries(opts.utm ?? {})) {
    url.searchParams.set(k, v);
  }
  return url.href;
}
