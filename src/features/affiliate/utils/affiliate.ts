import type { Tour, Track } from '../types';

/**
 * Central affiliate-link builder for the Chaturbate Revshare 20% program.
 *
 * RULES (do not break — broken links = zero commission):
 *  - The campaign (web master tag) is NEVER hardcoded. It comes from
 *    PUBLIC_CHATURBATE_CAMPAIGN (e.g. "R1cGT").
 *  - Only Revshare links of the form `/in/?...` are produced here. We never
 *    emit broadcaster links (`room=...`), which do not pay for external traffic.
 *  - For individual models coming from the API, do NOT use this — use the
 *    `chat_room_url_revshare` field the API already returns.
 */

/** Tour IDs for campaign R1cGT. Each maps a named destination to its CB id. */
const TOUR_IDS: Record<Tour, string> = {
  home: 'grq0',
  females: 'IsSO',
  couples: '0G9g',
  trans: 'khMd',
  males: 'R2Xc',
  latinas: 'SAcr',
  top: 'hr8m',
  top_female: 'uhEc',
  register: '3Mc9',
};

const CB_AFFILIATE_BASE = 'https://chaturbate.com/in/';

/** The campaign read from env at build/runtime; empty string if unset. */
export const CAMPAIGN = (import.meta.env.PUBLIC_CHATURBATE_CAMPAIGN ?? '').trim();

/**
 * Build a Revshare affiliate URL.
 *
 * @example
 *   buildAffiliateLink('home', 'home')
 *   // -> https://chaturbate.com/in/?tour=grq0&campaign=R1cGT&track=home
 *
 *   buildAffiliateLink('latinas', 'catalog')
 *   // -> https://chaturbate.com/in/?tour=SAcr&campaign=R1cGT&track=catalog
 *
 *   buildAffiliateLink('register', 'blog')
 *   // -> https://chaturbate.com/in/?tour=3Mc9&campaign=R1cGT&track=blog
 */
export function buildAffiliateLink(tour: Tour, track: Track): string {
  const url = new URL(CB_AFFILIATE_BASE);
  url.searchParams.set('tour', TOUR_IDS[tour]);
  if (CAMPAIGN) url.searchParams.set('campaign', CAMPAIGN);
  url.searchParams.set('track', track);
  return url.href;
}

export { TOUR_IDS };
