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

export interface FetchRoomsOptions {
  /** Max rooms to request from the API. */
  limit?: number;
  /** Restrict to a single tag (case-insensitive). */
  tag?: string;
  gender?: Gender;
  /** Optional geo region filter (server-side, documented param). */
  region?: Region;
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
  const lang = filters.language?.toLowerCase();
  return rooms.filter((room) => {
    if (tag && !room.tags.some((t) => t.toLowerCase() === tag)) return false;
    if (filters.gender && room.gender !== filters.gender) return false;
    if (lang && !room.spoken_languages.toLowerCase().includes(lang)) return false;
    if (filters.minViewers && room.num_users < filters.minViewers) return false;
    return true;
  });
}

/**
 * Fetch online rooms from the Chaturbate affiliates API.
 *  - Filters to `current_show === "public"`.
 *  - Sorts by `num_users` descending.
 *  - Optionally narrows by tag/gender server-side.
 *
 * Throws on a non-OK response so callers (the proxy / build) can surface it.
 */
export async function fetchRooms(
  options: FetchRoomsOptions = {},
): Promise<ChaturbateRoom[]> {
  const { limit = 90, tag, gender, region, clientIp = 'request_ip', signal } = options;

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
  if (region) url.searchParams.set('region', region);

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

  const filtered = applyFilters(rooms, { tag, gender });
  return filtered.sort((a, b) => b.num_users - a.num_users);
}
