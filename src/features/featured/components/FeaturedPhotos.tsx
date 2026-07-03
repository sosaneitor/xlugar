import { useRooms } from '@features/catalog/hooks/useRooms';
import { buildRoomLink } from '@features/affiliate/utils/whiteLabel';
import { countryName } from '@features/catalog/utils/country';

/** Compact number: 12300 -> "12.3k". */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/**
 * Homepage "Featured Models" horizontal-scroll row (Feature E) — the most-watched
 * models RIGHT NOW. Pure API data via the shared useRooms hook (polls /api/rooms
 * every 60s), so photos and viewer counts stay live with no scraping, cron, or
 * extra env config. Uses the API's own 360x270 snapshot, cropped to a portrait
 * card for the featured look. Renders nothing until data is ready.
 */
export default function FeaturedPhotos({ count = 12 }: { count?: number }) {
  const { rooms, status, lastUpdated } = useRooms({
    sort: 'viewers',
    region: 'all',
    gender: 'f',
    limit: 90,
  });

  if (status === 'loading') {
    return (
      <ul className="flex gap-4 overflow-x-auto pb-2" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <li
            key={i}
            className="aspect-[3/4] w-40 shrink-0 animate-pulse rounded-(--radius-lg) border border-border bg-surface sm:w-48"
          />
        ))}
      </ul>
    );
  }

  const items = rooms.slice(0, count);
  if (items.length === 0) return null;

  return (
    <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
      {items.map((room, i) => {
        const href = buildRoomLink(room.username, room.chat_room_url_revshare, 'home');
        const title = room.display_name || room.username;
        const place = room.location || countryName(room.country);
        const src = room.image_url_360x270 || room.image_url;
        const img = src ? `${src}${src.includes('?') ? '&' : '?'}t=${lastUpdated}` : '';
        const priority = i < 4;
        return (
          <li key={room.username} className="w-40 shrink-0 snap-start sm:w-48">
            <a
              href={href}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="group relative block overflow-hidden rounded-(--radius-lg) border border-border bg-surface
                         transition-[transform,box-shadow] duration-(--dur-mid) ease-(--ease-out-soft)
                         hover:-translate-y-1 hover:shadow-[var(--shadow-card)] motion-reduce:transform-none"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                {img && (
                  <img
                    src={img}
                    alt={`${title} — featured live cam model`}
                    width={192}
                    height={256}
                    loading={priority ? 'eager' : 'lazy'}
                    fetchPriority={priority ? 'high' : 'auto'}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden';
                    }}
                    className="h-full w-full object-cover transition-transform duration-(--dur-slow) ease-(--ease-out-soft)
                               group-hover:scale-[1.05] motion-reduce:transform-none"
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-bg via-bg/85 to-transparent" />
                <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-(--radius-pill) bg-primary-500 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-on-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-on-primary motion-safe:animate-pulse" aria-hidden="true" />
                  {formatCompact(room.num_users)}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="truncate text-base font-semibold text-fg">{title}</h3>
                {place && <p className="truncate text-xs text-fg-muted">{place}</p>}
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
