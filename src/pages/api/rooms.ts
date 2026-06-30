import type { APIRoute } from 'astro';
import { fetchRooms } from '@features/catalog/services/chaturbate';
import type { Region } from '@features/catalog/services/chaturbate';
import type { Gender } from '@features/catalog/types/room';

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
  const genderParam = url.searchParams.get('gender');
  const gender = genderParam && VALID_GENDERS.includes(genderParam as Gender)
    ? (genderParam as Gender)
    : undefined;
  const regionParam = url.searchParams.get('region');
  const region = regionParam && VALID_REGIONS.includes(regionParam as Region)
    ? (regionParam as Region)
    : undefined;
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 90) : 90;

  let clientIp = 'request_ip';
  try {
    clientIp = resolveClientIp(request, clientAddress);
  } catch {
    // clientAddress can throw in some adapters; fall back silently.
  }

  try {
    const rooms = await fetchRooms({ tag, gender, region, limit, clientIp });
    return new Response(JSON.stringify({ rooms, count: rooms.length }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // Allow a short CDN cache; snapshots refresh ~60s upstream anyway.
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
