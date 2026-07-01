import { useRooms } from '../hooks/useRooms';
import { RoomCard } from './LiveCatalog';
import type { Region, SortMode } from '../services/chaturbate';
import type { Gender } from '../types/room';

interface FeaturedRoomsProps {
  /** Server-side region for the pool. Defaults to the env default. */
  region?: Region | 'all';
  gender?: Gender;
  /** Lock to a single tag. */
  tag?: string;
  /** Require an ISO alpha-2 country code (e.g. "CO"). */
  country?: string;
  /** Substring match against spoken_languages (e.g. "spanish"). */
  language?: string;
  sort?: SortMode;
  /** How many cards to show. */
  count?: number;
}

/**
 * Compact, self-updating row of top rooms for the home page — reuses the same
 * ranking (Colombia/LatAm first) and card as the full catalog. Renders nothing
 * until data is ready, so it never shows an empty or broken block.
 */
export default function FeaturedRooms({
  region,
  gender,
  tag,
  country,
  language,
  sort = 'viewers',
  count = 8,
}: FeaturedRoomsProps) {
  const { rooms, status, lastUpdated } = useRooms({
    region,
    gender,
    tag,
    country,
    language,
    sort,
    limit: 120,
  });

  if (status === 'loading') {
    return (
      <ul
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: count }).map((_, i) => (
          <li
            key={i}
            className="aspect-[4/3] animate-pulse rounded-(--radius-lg) border border-border bg-surface"
          />
        ))}
      </ul>
    );
  }

  const items = rooms.slice(0, count);
  if (items.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((room) => (
        <RoomCard key={room.username} room={room} cacheBust={lastUpdated} />
      ))}
    </ul>
  );
}
