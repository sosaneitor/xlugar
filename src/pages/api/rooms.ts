import type { APIRoute } from 'astro';
import { fetchRooms, rankRooms } from '@features/catalog/services/chaturbate';
import type { Region, SortMode } from '@features/catalog/services/chaturbate';
import {
  fetchStripchatRooms,
  stripchatConfigured,
} from '@features/catalog/services/stripchat';
import type { Gender, Room } from '@features/catalog/types/room';

// On-demand serverless route (Netlify function). Opts this single endpoint out
// of static prerendering so the live grid can poll it every 60s without CORS
// issues and without coupling `npm run build` to the upstream API.
export const prerender = false;

const VALID_GENDERS: Gender[] = ['f', 'm', 'c', 't'];
const VALID_REGIONS: Region[] = [
  'northamerica',
  'southamerica',
  'europe_russia',
  'asia',
  'africa',
  'other',
];

/**
 * Optional share of Stripchat cards in the merged grid (0..1). Blank = no quota
 * (pure ranking merge by tier + viewers). e.g. 0.4 = interleave ~40% Stripchat.
 */
const STRIPCHAT_MIX_RATIO = (() => {
  const n = Number(import.meta.env.PUBLIC_STRIPCHAT_MIX_RATIO);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : null;
})();

/**
 * Map a CB region tab to a Stripchat `modelsLanguage` hint. Stripchat's simple
 * API has no region param, so we approximate the biggest audiences by language
 * and leave the rest as a global pool (ranked afterwards). LatAm → Spanish.
 */
const REGION_TO_SC_LANG: Partial<Record<Region, string>> = {
  southamerica: 'es',
  northamerica: 'en',
};

/**
 * Interleave two already-ranked lists so Stripchat holds ~`ratio` of the output,
 * preserving each source's internal order. Used only when MIX_RATIO is set.
 */
function interleaveByRatio(cb: Room[], sc: Room[], ratio: number): Room[] {
  const out: Room[] = [];
  let i = 0;
  let j = 0;
  let scDebt = 0; // accumulates fractional SC quota per emitted card.
  while (i < cb.length || j < sc.length) {
    scDebt += ratio;
    if (j < sc.length && (scDebt >= 1 || i >= cb.length)) {
      out.push(sc[j++]);
      scDebt -= 1;
    } else if (i < cb.length) {
      out.push(cb[i++]);
    } else if (j < sc.length) {
      out.push(sc[j++]);
    }
  }
  return out;
}

/** True for loopback/private/empty IPs we shouldn't send to the geo API. */
function isUsablePublicIp(ip: string | undefined): ip is string {
  if (!ip) return false;
  if (ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.')) return false;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  return true;
}

/** Resolve the end-user IP from proxy headers, else let CB infer it. */
function resolveClientIp(request: Request, clientAddress: string | undefined): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const nf = request.headers.get('x-nf-client-connection-ip')?.trim();
  const candidate = [nf, fwd, clientAddress].find(isUsablePublicIp);
  // 'request_ip' tells Chaturbate to use the IP of the requester (our function).
  return candidate ?? 'request_ip';
}

export const GET: APIRoute = async ({ url, request, clientAddress }) => {
  const tag = url.searchParams.get('tag') ?? undefined;
  const country = url.searchParams.get('country') ?? undefined;
  const language = url.searchParams.get('language') ?? undefined;
  const genderParam = url.searchParams.get('gender');
  const gender = genderParam && VALID_GENDERS.includes(genderParam as Gender)
    ? (genderParam as Gender)
    : undefined;
  // region: a valid code narrows the pool; 'all'/'global' forces a GLOBAL pool
  // (null overrides the env default); anything else → undefined → env default.
  const regionParam = url.searchParams.get('region');
  const region: Region | null | undefined =
    regionParam === 'all' || regionParam === 'global'
      ? null
      : regionParam && VALID_REGIONS.includes(regionParam as Region)
        ? (regionParam as Region)
        : undefined;
  const sortParam = url.searchParams.get('sort');
  const sort: SortMode = sortParam === 'new' ? 'new' : 'viewers';
  const limitParam = Number(url.searchParams.get('limit'));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : undefined;

  let clientIp = 'request_ip';
  try {
    clientIp = resolveClientIp(request, clientAddress);
  } catch {
    // clientAddress can throw in some adapters; fall back silently.
  }

  // Stripchat has no region param; approximate the region tab via language.
  const scLanguage =
    language ?? (region && region !== null ? REGION_TO_SC_LANG[region] : undefined);

  try {
    // Fan out to both sources. allSettled → one platform failing still serves
    // the other (graceful degradation). Stripchat is skipped unless configured.
    const [cbResult, scResult] = await Promise.allSettled([
      fetchRooms({ tag, gender, country, language, region, sort, limit, clientIp }),
      stripchatConfigured
        ? fetchStripchatRooms({ tag, gender, country, language: scLanguage, sort, limit, signal: undefined })
        : Promise.resolve<Room[]>([]),
    ]);

    if (cbResult.status === 'rejected') {
      console.error('[api/rooms] Chaturbate fetch failed:', cbResult.reason);
    }
    if (scResult.status === 'rejected') {
      console.error('[api/rooms] Stripchat fetch failed:', scResult.reason);
    }
    // Both down → surface the upstream error (same behavior as before).
    if (cbResult.status === 'rejected' && scResult.status === 'rejected') {
      throw cbResult.reason;
    }

    const cbRooms = cbResult.status === 'fulfilled' ? cbResult.value : [];
    const scRooms = scResult.status === 'fulfilled' ? scResult.value : [];

    // With a mix ratio, interleave each source's own ranked order; otherwise
    // pool everything and let rankRooms produce one coherent ranking.
    const rooms =
      STRIPCHAT_MIX_RATIO && scRooms.length > 0
        ? interleaveByRatio(rankRooms(cbRooms, { sort }), rankRooms(scRooms, { sort }), STRIPCHAT_MIX_RATIO)
        : rankRooms([...cbRooms, ...scRooms], { sort });

    return new Response(JSON.stringify({ rooms, count: rooms.length }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // Allow a short CDN cache; snapshots refresh ~30-60s upstream anyway.
        'cache-control': 'public, max-age=30, s-maxage=30',
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // Surface the real cause in the server log (dev terminal / Netlify function log).
    console.error('[api/rooms] fetch failed:', detail);
    return new Response(
      JSON.stringify({ rooms: [], error: 'upstream_unavailable', detail }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
};
