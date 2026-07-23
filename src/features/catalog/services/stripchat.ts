import type { Gender, Room } from '../types/room';
import type { StripchatModel, StripchatModelsResponse } from '../types/stripchat';
import type { FetchRoomsOptions, SortMode } from './chaturbate';

/**
 * Stripchat / Stripcash source for the hybrid grid. Uses the "Links & Creatives"
 * API (the simple one, keyed only by `userId`). Mirrors the Chaturbate service
 * so `/api/rooms` can merge both and the UI/ranking stay source-agnostic.
 *
 * Compliance note: the simple API already geo-filters (geobans) by the visitor
 * country and returns public streams by default, so we don't filter geobans by
 * hand. Pass the real visitor IP through so the geo-filter is accurate.
 *
 * See docs/stripchat-api.md.
 */

// --- Config from env (PUBLIC_* are inlined at build). ---
/** Feature flag. When off, the proxy skips Stripchat entirely. */
export const STRIPCHAT_ENABLED =
  (import.meta.env.PUBLIC_STRIPCHAT_ENABLED ?? '').trim() === '1';

/** Affiliate userId (required by the API). Empty disables the source. */
export const STRIPCHAT_USER_ID = (import.meta.env.PUBLIC_STRIPCHAT_USER_ID ?? '').trim();

/** API base host from your affiliate panel. No trailing slash. */
const STRIPCHAT_API_BASE = (
  import.meta.env.PUBLIC_STRIPCHAT_API_BASE ?? 'https://go.whitetrafsa.com'
)
  .trim()
  .replace(/\/+$/, '');

/** True when the source is enabled AND has the userId it needs to run. */
export const stripchatConfigured = STRIPCHAT_ENABLED && STRIPCHAT_USER_ID.length > 0;

/**
 * Our internal gender (`f/m/c/t`) → Stripchat niche `tag` param.
 * Stripchat filters gender via the niche tag, not a gender field.
 */
const GENDER_TO_TAG: Record<Gender, string> = {
  f: 'girls',
  m: 'men',
  c: 'couples',
  t: 'trans',
};

/** Stripchat `broadcastGender`/`gender` string → our internal `f/m/c/t`. */
function mapGender(model: StripchatModel): Gender {
  const raw = (model.broadcastGender || model.gender || '').toLowerCase();
  if (raw.includes('trans') || raw === 't') return 't';
  if (raw.includes('couple') || raw.includes('group') || raw === 'malefemale' || raw === 'c') {
    return 'c';
  }
  if (raw.includes('male') && !raw.includes('female')) return 'm';
  if (raw === 'm' || raw === 'men') return 'm';
  // female / girls / anything else → default to female (largest catalog).
  return 'f';
}

/** Strip a niche prefix from a tag: "girls/latin" → "latin"; passthrough else. */
function cleanTag(tag: string): string {
  const idx = tag.lastIndexOf('/');
  return (idx >= 0 ? tag.slice(idx + 1) : tag).trim();
}

/**
 * Build an affiliate outbound link for a model when the API doesn't ship a
 * ready-made `clickUrl`. The `api/models` (Links & Creatives) endpoint often
 * omits it, which left `chat_room_url_revshare` empty. We deep-link through the
 * SAME affiliate tracking host as the default link (`STRIPCHAT_API_BASE`, e.g.
 * `go.whitetrafsa.com`) with our `userId`, so the link carries attribution and
 * pays commission. Returns '' if the host/userId aren't configured.
 */
function buildStripchatClickUrl(username: string): string {
  if (!STRIPCHAT_API_BASE || !STRIPCHAT_USER_ID || !username) return '';
  const url = new URL(`${STRIPCHAT_API_BASE}/${encodeURIComponent(username)}`);
  url.searchParams.set('userId', STRIPCHAT_USER_ID);
  return url.href;
}

/**
 * Normalize a raw Stripchat model into the shared `Room` shape, or null when
 * unusable (no username, or not a public/showable stream).
 */
export function normalizeStripchatModel(raw: unknown): Room | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as StripchatModel;
  if (typeof m.username !== 'string' || !m.username) return null;

  const image =
    (typeof m.snapshotUrl === 'string' && m.snapshotUrl) ||
    (typeof m.previewUrlThumbSmall === 'string' && m.previewUrlThumbSmall) ||
    '';
  const imageLarge =
    (typeof m.popularSnapshotUrl === 'string' && m.popularSnapshotUrl) || image;

  const tags = Array.isArray(m.tags)
    ? m.tags
        .filter((t): t is string => typeof t === 'string')
        .map(cleanTag)
        .filter(Boolean)
    : [];

  const languages = Array.isArray(m.languages)
    ? m.languages.filter((l): l is string => typeof l === 'string').join(', ')
    : '';

  // Map Stripchat status → the CB-style `current_show`. Only 'public' is shown.
  const current_show: Room['current_show'] =
    m.status === 'public'
      ? 'public'
      : m.status === 'groupShow'
        ? 'group'
        : m.status === 'private' || m.status === 'p2p'
          ? 'private'
          : 'hidden';

  return {
    source: 'stripchat',
    username: m.username,
    display_name: m.username, // Stripchat has no separate display name.
    current_show,
    num_users: typeof m.viewersCount === 'number' ? m.viewersCount : 0,
    num_followers: typeof m.favoritedCount === 'number' ? m.favoritedCount : 0,
    gender: mapGender(m),
    location: '',
    country: typeof m.modelsCountry === 'string' ? m.modelsCountry.toUpperCase() : '',
    age: undefined,
    is_new: m.isNew === true,
    is_hd: m.broadcastHD === true,
    tags,
    image_url: image,
    image_url_360x270: imageLarge,
    room_subject: typeof m.goalMessage === 'string' ? m.goalMessage : '',
    spoken_languages: languages,
    // Stripchat doesn't expose uptime; "new" ordering comes from the isNew param.
    seconds_online: 0,
    // Outbound-link fallback (used when the white label isn't configured).
    // `api/models` frequently omits `clickUrl`, so build a tracked affiliate
    // link from the host + userId when it's missing — never leave this empty.
    chat_room_url_revshare:
      (typeof m.clickUrl === 'string' && m.clickUrl) || buildStripchatClickUrl(m.username),
    slug: m.username,
  };
}

/**
 * Fetch online models from the Stripchat "Links & Creatives" API and normalize
 * to `Room[]`. Filters to public streams. Ranking/merging happens in the proxy
 * (rankRooms) so both sources interleave coherently.
 *
 * Accepts the same options shape as `fetchRooms` (Chaturbate) so the proxy can
 * fan out to both with one option object. Returns `[]` when not configured.
 * Throws on a non-OK response so the proxy can log + degrade gracefully.
 */
export async function fetchStripchatRooms(
  options: FetchRoomsOptions = {},
): Promise<Room[]> {
  if (!stripchatConfigured) return [];

  const {
    limit = 300,
    tag,
    gender,
    country,
    language,
    sort = 'viewers' as SortMode,
    signal,
  } = options;

  const url = new URL(`${STRIPCHAT_API_BASE}/api/models`);
  url.searchParams.set('userId', STRIPCHAT_USER_ID);
  url.searchParams.set('limit', String(Math.min(limit, 1000)));
  // Enforce filters strictly so gender/country/language actually narrow the pool.
  url.searchParams.set('strict', '1');

  // Gender → niche tag param. An explicit `tag` option wins over the gender map.
  if (tag) url.searchParams.set('tag', tag);
  else if (gender) url.searchParams.set('tag', GENDER_TO_TAG[gender]);

  if (country) url.searchParams.set('modelsCountry', country.toLowerCase());
  if (language) url.searchParams.set('modelsLanguage', language.toLowerCase());
  if (sort === 'new') url.searchParams.set('isNew', '1');

  const res = await fetch(url.href, {
    signal,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; xLugarBot/1.0; +https://xlugar.com)',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Stripchat API responded ${res.status} for ${url.href}` +
        (body ? ` — ${body.slice(0, 200)}` : ''),
    );
  }

  const data = (await res.json()) as StripchatModelsResponse | StripchatModel[];
  const rawList = Array.isArray(data) ? data : (data?.models ?? []);

  return rawList
    .map(normalizeStripchatModel)
    .filter((r): r is Room => r !== null)
    .filter((r) => r.current_show === 'public');
}
