/**
 * SEO category definitions. Each becomes a statically-generated page at
 * /models/[slug] whose unique h1/title/description/intro are the indexable
 * content; the live room grid for the category hydrates client-side.
 *
 * A category narrows the live grid by one or more of: `tag`, `country`,
 * `language`, `region`. IMPORTANT: models rarely self-apply nationality tags
 * (e.g. almost none tag "colombian"), so nationality categories filter by
 * `country` (ISO code) and/or `region` instead — see docs/chaturbate-api.md.
 * `slug` is the URL segment (kept English, Tier-1 friendly).
 * Copy is unique, real English — no lorem, no duplication across entries.
 */

import type { Region } from '../services/chaturbate';
import type { Gender } from '../types/room';

export interface Category {
  /** API tag to filter rooms by (case-insensitive). Omit for geo/lang categories. */
  tag?: string;
  /** ISO alpha-2 country code to require (e.g. "CO"). */
  country?: string;
  /** spoken_languages substring to require (e.g. "Spanish"). */
  language?: string;
  /** Server-side gender filter (e.g. "c" for couples). */
  gender?: Gender;
  /** Region pool to pull from. Defaults to the env default (southamerica). */
  region?: Region | 'all';
  /** URL segment under /models/. */
  slug: string;
  /** Short label for nav/chips. */
  label: string;
  /** Page <h1> (single, unique). */
  h1: string;
  /** <title> (unique; site name appended by Seo.astro). */
  title: string;
  /** <meta description> (unique). */
  description: string;
  /** Static intro paragraph rendered above the grid (unique copy). */
  intro: string;
  /** Surface on the home "featured categories" block. */
  featured?: boolean;
}

export const CATEGORIES: Category[] = [
  {
    tag: 'latina',
    region: 'southamerica',
    slug: 'latina',
    label: 'Latina',
    h1: 'Latina Cams — Live Latina Models Online Now',
    title: 'Live Latina Cams — Latina Models Streaming Now',
    description:
      'Watch live Latina cam models broadcasting right now. Browse hundreds of online Latina rooms, sorted by who is drawing the biggest audience this minute.',
    intro:
      'Latina performers bring some of the most energetic, expressive live cams anywhere, and this page tracks every Latina model who is online at this moment. The grid reorders itself around viewer counts, so the rooms heating up fastest float to the top. Snapshots refresh roughly every minute — refresh the list to see who just came online.',
    featured: true,
  },
  {
    // Models almost never self-tag "colombian" — filter by country instead.
    country: 'CO',
    region: 'southamerica',
    slug: 'colombian',
    label: 'Colombian',
    h1: 'Colombian Cams — Live Models from Colombia',
    title: 'Live Colombian Cams — Colombian Models Online',
    description:
      'Live Colombian cam models streaming now. Discover online rooms from Colombia ranked by current viewers, updated continuously throughout the day.',
    intro:
      'Colombia has become one of the most recognizable scenes in live cam streaming, and the models here are online right now. We pull the live roster of Colombian rooms and rank it by how many people are watching each one, so the busiest streams are always first. Use the filters to narrow by language or minimum audience size.',
    featured: true,
  },
  {
    // "spanish" is a language, not a common tag — filter by spoken_languages.
    // Value matches a LiveCatalog language option so the dropdown reflects it.
    language: 'Spanish',
    region: 'southamerica',
    slug: 'spanish',
    label: 'Spanish Speaking',
    h1: 'Spanish-Speaking Cams — Live Models Online',
    title: 'Spanish-Speaking Cams — Live Models Streaming Now',
    description:
      'Find live Spanish-speaking cam models online now. Browse current rooms tagged Spanish, ordered by live viewer counts and refreshed minute to minute.',
    intro:
      'If you want to chat in Spanish, this is the fastest way to find a model who is live and speaking your language. Every room shown here is broadcasting publicly at this moment and carries the Spanish tag. The list is sorted by active viewers and updates throughout the session, so popular rooms surface immediately while new broadcasters appear as they sign on.',
    featured: true,
  },
  {
    tag: 'asian',
    region: 'asia',
    slug: 'asian',
    label: 'Asian',
    h1: 'Asian Cams — Live Asian Models Online Now',
    title: 'Live Asian Cams — Asian Models Streaming Now',
    description:
      'Watch live Asian cam models online now. Explore current public rooms tagged Asian, ranked by viewers and refreshed continuously.',
    intro:
      'This page collects every Asian-tagged model who is live and broadcasting publicly right now. Because the roster shifts constantly, we rank it by current viewer count and refresh the snapshots so you are always looking at who is actually online. Filter by spoken language or set a minimum audience to skip straight to the busiest rooms.',
    featured: true,
  },
  {
    tag: 'ebony',
    slug: 'ebony',
    label: 'Ebony',
    h1: 'Ebony Cams — Live Ebony Models Online Now',
    title: 'Live Ebony Cams — Ebony Models Streaming Now',
    description:
      'Live ebony cam models streaming right now. Browse online public rooms tagged ebony, sorted by current viewers and updated throughout the day.',
    intro:
      'Ebony performers run some of the most-watched live rooms on the network, and this grid shows the ones online at this moment. The order follows live viewer counts, so the rooms gathering the biggest crowds lead the page. Snapshots refresh about once a minute — reload the list to catch models who just went live.',
    featured: true,
  },
  {
    tag: 'milf',
    slug: 'milf',
    label: 'MILF',
    h1: 'MILF Cams — Live Mature Models Online Now',
    title: 'Live MILF Cams — Mature Models Streaming Now',
    description:
      'Watch live MILF cam models online now. Discover current public rooms tagged MILF, ranked by live viewers and refreshed minute by minute.',
    intro:
      'Confident, experienced performers dominate this category, and every model here is live right now. We rank the MILF-tagged rooms by how many viewers each one has at the moment, so the most active streams stay at the top of the grid. New broadcasters join throughout the day, so the lineup is never the same twice.',
    featured: false,
  },
  {
    tag: '18',
    slug: 'teen-18',
    label: 'Teen 18+',
    h1: '18+ Teen Cams — Live Models Online Now',
    title: 'Live 18+ Teen Cams — Models Streaming Now',
    description:
      'Live 18+ cam models streaming now. Browse current public rooms tagged 18, all performers verified adults, ranked by viewers and updated continuously.',
    intro:
      'Every performer on this page is a verified adult, eighteen or older, and broadcasting live at this moment. The 18-tagged rooms are sorted by current audience so the busiest streams appear first, and the list refreshes as models sign on and off. Use the filters to narrow by language or minimum viewer count.',
    featured: false,
  },
  {
    tag: 'blonde',
    slug: 'blonde',
    label: 'Blonde',
    h1: 'Blonde Cams — Live Blonde Models Online Now',
    title: 'Live Blonde Cams — Blonde Models Streaming Now',
    description:
      'Watch live blonde cam models online now. Explore current public rooms tagged blonde, sorted by viewers and refreshed throughout the day.',
    intro:
      'This grid tracks every blonde-tagged model who is live and public right now. The order follows real-time viewer counts, so the rooms drawing the biggest crowds lead, while new broadcasters slot in as they come online. Snapshots update roughly every minute to keep the lineup current.',
    featured: false,
  },
  {
    tag: 'bigboobs',
    slug: 'big-boobs',
    label: 'Big Boobs',
    h1: 'Big Boobs Cams — Live Models Online Now',
    title: 'Live Big Boobs Cams — Models Streaming Now',
    description:
      'Live cam models tagged big boobs, streaming now. Browse current public rooms ranked by live viewers and refreshed minute to minute.',
    intro:
      'Models carrying the big-boobs tag fill this page, and every one of them is broadcasting publicly at this moment. We sort the grid by current viewer count so the most popular rooms are immediately visible, and the snapshots refresh continuously as the live roster changes.',
    featured: false,
  },
  {
    // Couples rarely use the "couple" tag reliably — filter by gender instead.
    gender: 'c',
    slug: 'couples',
    label: 'Couples',
    h1: 'Couples Cams — Live Couples Online Now',
    title: 'Live Couples Cams — Couples Streaming Now',
    description:
      'Watch live couples cam rooms online now. Discover current public broadcasts tagged couple, ranked by viewers and refreshed throughout the day.',
    intro:
      'Couples streams have a chemistry solo rooms can not match, and this page shows the ones live right now. We rank the couple-tagged rooms by active viewers so the busiest broadcasts lead the grid, and the lineup updates as new couples come online. Filter by spoken language or set a viewer floor to find your room faster.',
    featured: true,
  },
];

/** Look up a category by its URL slug. */
export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Categories surfaced on the home page. */
export const FEATURED_CATEGORIES = CATEGORIES.filter((c) => c.featured);
