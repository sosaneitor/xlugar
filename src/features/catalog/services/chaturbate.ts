import type {
  ChaturbateRoom,
  Gender,
  OnlineRoomsResponse,
  RoomFilters,
} from '../types/room';
import { CAMPAIGN } from '@features/affiliate/utils/affiliate';

const ONLINE_ROOMS_ENDPOINT =
  'https://chaturbate.com/api/public/affiliates/onlinerooms/';

const VALID_GENDERS: Gender[] = ['f', 'm', 'c', 't'];

/** Documented geo regions accepted by the onlinerooms endpoint. */
export type Region =
  | 'northamerica'
  | 'southamerica'
  | 'europe_russia'
  | 'asia'
  | 'africa'
  | 'other';

const REGIONS: Region[] = [
  'northamerica',
  'southamerica',
  'europe_russia',
  'asia',
  'africa',
  'other',
];

/** How to order the returned pool. */
export type SortMode = 'viewers' | 'new';

// --- Catalog tuning from env (see docs/chaturbate-api.md). ---
/** Default region for the whole grid; undefined = global. */
export const DEFAULT_REGION: Region | undefined = (() => {
  const raw = (import.meta.env.PUBLIC_DEFAULT_REGION ?? '').trim() as Region;
  return REGIONS.includes(raw) ? raw : undefined;
})();

/** ISO alpha-2 code ranked first in the grid (e.g. "CO"). */
export const PRIORITY_COUNTRY = (import.meta.env.PUBLIC_PRIORITY_COUNTRY ?? '')
  .trim()
  .toUpperCase();

/** Pool size to request from CB. Verified safe well above 90. */
export const DEFAULT_LIMIT = (() => {
  const n = Number(import.meta.env.PUBLIC_ROOMS_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 300;
})();

/** Tags that signal Colombian/LatAm rooms, used as a ranking tiebreaker. */
const LATAM_TAGS = new Set(['colombian', 'colombiana', 'latina', 'latino', 'latin']);

export interface FetchRoomsOptions {
  /** Max rooms to request from the API. Defaults to DEFAULT_LIMIT. */
  limit?: number;
  /** Restrict to a single tag (case-insensitive). */
  tag?: string;
  gender?: Gender;
  /** Restrict to an ISO alpha-2 country code (e.g. "CO"). */
  country?: string;
  /** Substring match against spoken_languages (e.g. "spanish"). */
  language?: string;
  /**
   * Optional geo region filter (server-side, documented param). When omitted
   * the env DEFAULT_REGION is applied; pass `null` to force a global pool.
   */
  region?: Region | null;
  /** Ordering of the returned list. Defaults to 'viewers'. */
  sort?: SortMode;
  /**
   * End-user IP for geo-targeting/compliance. The API REQUIRES this param.
   * Pass the real visitor IP, or the literal 'request_ip' to let Chaturbate
   * resolve it from the requesting server. Defaults to 'request_ip'.
   */
  clientIp?: string;
  /** Abort signal for request timeouts. */
  signal?: AbortSignal;
}

/** Narrow an unknown API item into a ChaturbateRoom, or null if unusable. */
function normalizeRoom(raw: unknown): ChaturbateRoom | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.username !== 'string' || !r.username) return null;
  // chat_room_url_revshare is required for a compliant outbound link.
  if (typeof r.chat_room_url_revshare !== 'string' || !r.chat_room_url_revshare) {
    return null;
  }
  const gender = VALID_GENDERS.includes(r.gender as Gender)
    ? (r.gender as Gender)
    : 'f';
  return {
    username: r.username,
    display_name:
      typeof r.display_name === 'string' && r.display_name ? r.display_name : undefined,
    slug: typeof r.slug === 'string' && r.slug ? r.slug : undefined,
    current_show: (r.current_show as ChaturbateRoom['current_show']) ?? 'public',
    num_users: typeof r.num_users === 'number' ? r.num_users : 0,
    num_followers: typeof r.num_followers === 'number' ? r.num_followers : 0,
    gender,
    location: typeof r.location === 'string' ? r.location : '',
    country: typeof r.country === 'string' ? r.country : '',
    age: typeof r.age === 'number' ? r.age : undefined,
    birthday: typeof r.birthday === 'string' ? r.birthday : undefined,
    is_new: r.is_new === true,
    is_hd: r.is_hd === true,
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    image_url: typeof r.image_url === 'string' ? r.image_url : '',
    image_url_360x270:
      typeof r.image_url_360x270 === 'string' ? r.image_url_360x270 : undefined,
    room_subject: typeof r.room_subject === 'string' ? r.room_subject : '',
    spoken_languages:
      typeof r.spoken_languages === 'string' ? r.spoken_languages : '',
    seconds_online: typeof r.seconds_online === 'number' ? r.seconds_online : 0,
    chat_room_url_revshare: r.chat_room_url_revshare,
    chat_room_url:
      typeof r.chat_room_url === 'string' ? r.chat_room_url : undefined,
  };
}

/** Apply tag/gender/language/viewer filters to a room list. */
export function applyFilters(
  rooms: ChaturbateRoom[],
  filters: RoomFilters,
): ChaturbateRoom[] {
  const tag = filters.tag?.toLowerCase();
  const country = filters.country?.toUpperCase();
  const lang = filters.language?.toLowerCase();
  return rooms.filter((room) => {
    if (tag && !room.tags.some((t) => t.toLowerCase() === tag)) return false;
    if (country && room.country?.toUpperCase() !== country) return false;
    if (filters.gender && room.gender !== filters.gender) return false;
    if (lang && !room.spoken_languages.toLowerCase().includes(lang)) return false;
    if (filters.minViewers && room.num_users < filters.minViewers) return false;
    return true;
  });
}

/** A room counts as LatAm-relevant via its tags. */
function hasLatamTag(room: ChaturbateRoom): boolean {
  return room.tags.some((t) => LATAM_TAGS.has(t.toLowerCase()));
}

/**
 * Rank rooms so the priority audience floats to the top:
 *   1. Rooms in PRIORITY_COUNTRY (e.g. Colombia).
 *   2. Rooms that speak Spanish or carry a LatAm tag.
 *   3. Everything else.
 * Within each tier, order by `sort` (viewers desc, or newest online first).
 */
export function rankRooms(
  rooms: ChaturbateRoom[],
  { priorityCountry = PRIORITY_COUNTRY, sort = 'viewers' as SortMode } = {},
): ChaturbateRoom[] {
  const tier = (r: ChaturbateRoom): number => {
    if (priorityCountry && r.country?.toUpperCase() === priorityCountry) return 0;
    if (r.spoken_languages.toLowerCase().includes('spanish') || hasLatamTag(r)) return 1;
    return 2;
  };
  const within = (a: ChaturbateRoom, b: ChaturbateRoom): number =>
    sort === 'new'
      ? a.seconds_online - b.seconds_online // freshest (least time online) first
      : b.num_users - a.num_users;
  return [...rooms].sort((a, b) => tier(a) - tier(b) || within(a, b));
}

/**
 * Fetch online rooms from the Chaturbate affiliates API.
 *  - Filters to `current_show === "public"`.
 *  - Sends `region`/`gender` server-side (bigger, more relevant pool).
 *  - Ranks Colombia/LatAm first, then by `sort` (viewers | new).
 *
 * Throws on a non-OK response so callers (the proxy / build) can surface it.
 */
export async function fetchRooms(
  options: FetchRoomsOptions = {},
): Promise<ChaturbateRoom[]> {
  const {
    limit = DEFAULT_LIMIT,
    tag,
    gender,
    country,
    language,
    region,
    sort = 'viewers',
    clientIp = 'request_ip',
    signal,
  } = options;
  // `undefined` → fall back to env default; `null` → explicit global pool.
  const effectiveRegion = region === undefined ? DEFAULT_REGION : region;

  // Without a campaign (wm) the API rejects the request — fail loud and clear.
  if (!CAMPAIGN) {
    throw new Error(
      'PUBLIC_CHATURBATE_CAMPAIGN is not set — the wm param would be empty. ' +
        'Add it to .env (local) and to Netlify env vars.',
    );
  }

  const url = new URL(ONLINE_ROOMS_ENDPOINT);
  url.searchParams.set('wm', CAMPAIGN);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  // REQUIRED by the API. 'request_ip' tells CB to use the requester's IP;
  // the proxy overrides this with the real visitor IP when available.
  url.searchParams.set('client_ip', clientIp);
  if (effectiveRegion) url.searchParams.set('region', effectiveRegion);
  // Server-side gender filter — a fuller pool than filtering a global top-N.
  if (gender) url.searchParams.set('gender', gender);

  const res = await fetch(url.href, {
    signal,
    headers: {
      Accept: 'application/json',
      // Some edges reject the default runtime UA; send a real browser-ish one.
      'User-Agent':
        'Mozilla/5.0 (compatible; xLugarBot/1.0; +https://xlugar.com)',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Chaturbate API responded ${res.status} for ${url.href}` +
        (body ? ` — ${body.slice(0, 200)}` : ''),
    );
  }

  const data = (await res.json()) as OnlineRoomsResponse | ChaturbateRoom[];
  const rawList = Array.isArray(data) ? data : (data?.results ?? []);

  const rooms = rawList
    .map(normalizeRoom)
    .filter((r): r is ChaturbateRoom => r !== null)
    .filter((r) => r.current_show === 'public');

  // `gender` is also kept here as a fallback in case the API ignores the param.
  // `tag`/`country`/`language` are not API params, so they filter here.
  const filtered = applyFilters(rooms, { tag, gender, country, language });
  return rankRooms(filtered, { sort });
}
