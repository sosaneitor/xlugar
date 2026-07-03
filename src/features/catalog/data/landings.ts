/**
 * Keyword-rich SEO landing pages. Each becomes a top-level statically-generated
 * route (e.g. /live-cam-girls/) whose unique h1/title/description/intro is the
 * indexable content; the live room grid hydrates client-side underneath.
 *
 * These are the PRIMARY canonical targets for their keyword. The older
 * /models/[slug] category pages canonical to the matching landing here (see the
 * `canonicalFor` slugs + Category.canonicalPath) so the two taxonomies coexist
 * without duplicate-content penalties — the "both + canonicals" strategy.
 *
 * A landing narrows the live grid by the same filters LiveCatalog accepts:
 * tag / country / language / gender / region. Nationality pages filter by
 * `country` (models rarely self-tag nationality — see docs/chaturbate-api.md).
 * Copy is unique, real English — no lorem, no duplication across entries.
 */

import type { Region } from '../services/chaturbate';
import type { Gender } from '../types/room';

export interface Landing {
  /** URL path segment under the site root, e.g. "live-cam-girls". */
  slug: string;
  /** Short label for nav/chips/breadcrumbs. */
  label: string;
  /** API tag to filter rooms by (case-insensitive). Omit for geo/lang/gender. */
  tag?: string;
  /** ISO alpha-2 country code to require (e.g. "CO"). */
  country?: string;
  /** spoken_languages substring to require (e.g. "Spanish"). */
  language?: string;
  /** Server-side gender filter. */
  gender?: Gender;
  /** Region pool to pull from. Defaults to the env default (southamerica). */
  region?: Region | 'all';
  /** Page <h1> (single, unique). */
  h1: string;
  /** <title> (unique; site name appended by Seo.astro). */
  title: string;
  /** <meta description> (unique, < 160 chars). */
  description: string;
  /** Static intro paragraph rendered above the grid (100–150 words, unique). */
  intro: string;
  /**
   * /models/[slug] slugs whose canonical should point at THIS landing (the two
   * pages target the same rooms; this landing is the primary).
   */
  canonicalFor?: string[];
}

export const LANDINGS: Landing[] = [
  {
    slug: 'live-cam-girls',
    label: 'Live Cam Girls',
    gender: 'f',
    region: 'all',
    h1: 'Live Cam Girls — Free Adult Webcams Online Now',
    title: 'Live Cam Girls | Free Adult Webcams',
    description:
      'Watch live cam girls on free adult webcams right now. A real-time catalog of online models, ranked by viewers and refreshed every minute. 18+.',
    intro:
      'This is the fastest way to find live cam girls who are online at this exact moment. We pull the current roster of public webcam rooms and rank it by how many people are watching each one, so the busiest free cams float straight to the top. Every model shown here is broadcasting live right now — nothing pre-recorded — and the snapshots refresh roughly every minute, so reloading surfaces whoever just came online. Use the filters to narrow by language, spoken accent, or minimum audience, or jump into any room to watch free with no account required.',
  },
  {
    slug: 'colombian-cam-girls',
    label: 'Colombian Cam Girls',
    country: 'CO',
    region: 'southamerica',
    gender: 'f',
    h1: 'Colombian Cam Girls — Live Models from Colombia',
    title: 'Colombian Cam Girls | Live Colombia Webcams',
    description:
      'Live Colombian cam girls streaming now. Discover online webcam models from Colombia, ranked by current viewers and updated continuously. 18+.',
    intro:
      'Colombia is one of the most recognizable scenes in live cam streaming, and the models on this page are online right now. We pull the live roster of Colombian rooms and rank it by how many people are watching each stream, so the busiest broadcasts always lead. Because the lineup shifts constantly, the list re-sorts itself around live viewer counts and the thumbnails refresh about once a minute. Use the filters to narrow by spoken language or a minimum audience size, then step into any room to watch free — no account needed to start.',
    canonicalFor: ['colombian'],
  },
  {
    slug: 'latina-cam-girls',
    label: 'Latina Cam Girls',
    tag: 'latina',
    region: 'southamerica',
    gender: 'f',
    h1: 'Latina Cam Girls — Live Latina Webcams Online Now',
    title: 'Latina Cam Girls | Live Latina Webcams',
    description:
      'Watch live Latina cam girls online now. Hundreds of Latina webcam models streaming, sorted by who is drawing the biggest audience this minute. 18+.',
    intro:
      'Latina performers bring some of the most energetic, expressive live cams anywhere, and this page tracks every Latina model who is online at this moment. The grid reorders itself around real-time viewer counts, so the rooms heating up fastest rise to the top while new broadcasters slot in as they sign on. Snapshots refresh roughly every minute — reload to catch whoever just went live. Filter by spoken language or set a viewer floor to skip straight to the busiest rooms, then open any stream to watch free with no signup required.',
    canonicalFor: ['latina'],
  },
  {
    slug: 'live-female-cams',
    label: 'Female Cams',
    gender: 'f',
    region: 'all',
    h1: 'Live Female Cams — Women Streaming Online Now',
    title: 'Live Female Cams | Women Webcams Online',
    description:
      'Live female cams streaming now. Browse women broadcasting on public webcams, ranked by live viewers and refreshed every minute. 18+ only.',
    intro:
      'Every room on this page is a woman broadcasting live on a public webcam right now. We rank the female cams by current viewer count so the most-watched streams appear first, and the roster updates continuously as models come online and sign off. The snapshots refresh about once a minute, so a quick reload always shows who just went live. Narrow the grid by spoken language, minimum audience, or HD-only, then open any room to watch free — no account is required to start watching.',
  },
  {
    slug: 'live-male-cams',
    label: 'Male Cams',
    gender: 'm',
    region: 'all',
    h1: 'Live Male Cams — Men Streaming Online Now',
    title: 'Live Male Cams | Men Webcams Online',
    description:
      'Live male cams online now. Watch men broadcasting on public webcams, ranked by current viewers and refreshed minute to minute. 18+ only.',
    intro:
      'This grid collects every male model who is live and broadcasting on a public webcam at this moment. The order follows real-time viewer counts, so the rooms drawing the biggest crowds lead the page while newcomers appear as they come online. Thumbnails refresh roughly every minute to keep the lineup current — reload to see who just started streaming. Filter by spoken language or a minimum audience size to find the right room fast, then step into any live male cam to watch free without creating an account.',
  },
  {
    slug: 'live-couple-cams',
    label: 'Couple Cams',
    gender: 'c',
    region: 'all',
    h1: 'Live Couple Cams — Couples Streaming Online Now',
    title: 'Live Couple Cams | Couples Webcams Online',
    description:
      'Live couple cams streaming now. Watch couples broadcasting on public webcams, ranked by viewers and refreshed every minute. 18+ only.',
    intro:
      'Couple streams have a chemistry solo rooms cannot match, and this page shows the ones live right now. We rank the couple cams by active viewers so the busiest broadcasts lead the grid, and the lineup updates continuously as new couples come online. Snapshots refresh about once a minute, so reloading surfaces whoever just started. Use the filters to narrow by spoken language or set a viewer floor to find your room faster, then open any live couple cam to watch free — no signup needed to begin.',
  },
  {
    slug: 'live-trans-cams',
    label: 'Trans Cams',
    gender: 't',
    region: 'all',
    h1: 'Live Trans Cams — Trans Models Streaming Now',
    title: 'Live Trans Cams | Trans Webcams Online',
    description:
      'Live trans cams online now. Watch trans models broadcasting on public webcams, ranked by current viewers and refreshed minute to minute. 18+.',
    intro:
      'Every performer on this page is a trans model broadcasting live on a public webcam right now. The grid ranks rooms by current viewer count, so the most-watched trans cams appear first while new broadcasters join throughout the day. The thumbnails refresh roughly every minute to keep the roster accurate — a quick reload shows who just came online. Filter by spoken language or a minimum audience to reach the busiest rooms quickly, then open any live trans cam to watch free with no account required.',
  },
];

/** Look up a landing by its URL slug. */
export function getLandingBySlug(slug: string): Landing | undefined {
  return LANDINGS.find((l) => l.slug === slug);
}

/** Map a /models/[slug] category slug to the landing that should own its canonical. */
export function canonicalLandingForCategory(categorySlug: string): Landing | undefined {
  return LANDINGS.find((l) => l.canonicalFor?.includes(categorySlug));
}

/**
 * Curated, evergreen cam tags used to statically generate /tags/[tag] pages and
 * the "Popular Categories" hub. Kept as a stable list (rather than a build-time
 * API call) so the build is deterministic and the URLs never churn. Each is a
 * real, high-traffic Chaturbate tag verified to return rooms.
 */
export const TAGS: string[] = [
  'latina',
  'teen',
  'milf',
  'asian',
  'ebony',
  'blonde',
  'bigboobs',
  'squirt',
  'anal',
  'lovense',
  'bbw',
  'redhead',
  'mature',
  'petite',
  'feet',
  'bigass',
  'hairy',
  'daddy',
  'lesbian',
  'new',
];

/** Human-friendly title-case label for a tag slug (e.g. "bigboobs" -> "Big Boobs"). */
const TAG_LABELS: Record<string, string> = {
  bigboobs: 'Big Boobs',
  bigass: 'Big Ass',
  bbw: 'BBW',
  milf: 'MILF',
  lovense: 'Lovense',
};

export function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1);
}
