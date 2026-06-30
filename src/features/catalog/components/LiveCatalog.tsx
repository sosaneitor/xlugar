import { useMemo, useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { buildRoomLink } from '@features/affiliate/utils/whiteLabel';
import type { ChaturbateRoom, Gender } from '../types/room';

interface LiveCatalogProps {
  /** Lock to a category tag (category pages). When set, the tag filter is hidden. */
  initialTag?: string;
  /** Cards per page. */
  pageSize?: number;
  /** Insert an ad placeholder every N cards. */
  adEvery?: number;
}

const LANGUAGES = ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian', 'Russian'];
const GENDERS: { value: Gender | ''; label: string }[] = [
  { value: '', label: 'Everyone' },
  { value: 'f', label: 'Women' },
  { value: 'm', label: 'Men' },
  { value: 'c', label: 'Couples' },
  { value: 't', label: 'Trans' },
];
const VIEWER_FLOORS = [0, 50, 100, 500, 1000];

const selectClass =
  'rounded-(--radius-md) border border-border-strong bg-surface px-3 py-2 text-sm text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-premium-400';

function RoomCard({ room, cacheBust }: { room: ChaturbateRoom; cacheBust: number }) {
  const src = room.image_url_360x270 || room.image_url;
  const img = src ? `${src}${src.includes('?') ? '&' : '?'}t=${cacheBust}` : '';
  const tags = room.tags.slice(0, 3);
  const place = room.location || room.country;
  // Route through the White Label room when configured; else the API revshare link.
  const href = buildRoomLink(room.username, room.chat_room_url_revshare, 'catalog');
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group relative block overflow-hidden rounded-(--radius-lg) border border-border bg-surface
                   transition-[transform,box-shadow] duration-(--dur-mid) ease-(--ease-out-soft)
                   hover:-translate-y-1 hover:shadow-[var(--shadow-card)] focus-visible:-translate-y-1
                   motion-reduce:transform-none"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {img && (
            <img
              src={img}
              alt={`${room.username} live cam preview`}
              width={360}
              height={270}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Snapshots expire/rotate — hide a broken image so the card
                // keeps its layout (gradient + info) instead of a torn icon.
                e.currentTarget.style.visibility = 'hidden';
              }}
              className="h-full w-full object-cover transition-transform duration-(--dur-slow) ease-(--ease-out-soft)
                         group-hover:scale-[1.05] motion-reduce:transform-none"
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-success bg-surface px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              {room.num_users.toLocaleString()} live
            </span>
            {room.is_hd && (
              <span className="rounded-(--radius-pill) bg-premium-500 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-on-premium">
                HD
              </span>
            )}
            {room.is_new && (
              <span className="rounded-(--radius-pill) bg-accent-500 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-on-primary">
                New
              </span>
            )}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-lg text-fg">
            {room.username}
            {room.age ? (
              <span className="font-sans text-base font-normal text-fg-muted">, {room.age}</span>
            ) : null}
          </h3>
          {(place || tags.length > 0) && (
            <p className="mt-0.5 truncate text-sm text-fg-muted">
              {place && <span>{place}</span>}
              {place && tags.length > 0 && <span> · </span>}
              {tags.map((t) => `#${t}`).join(' ')}
            </p>
          )}
        </div>
      </a>
    </li>
  );
}

function AdCard() {
  // Mirrors AdSlot.astro markup (Astro components can't render inside an island).
  return (
    <li
      className="flex min-h-[120px] items-center justify-center rounded-(--radius-lg) border border-dashed border-border-strong bg-surface text-fg-subtle"
      data-ad-slot="in-grid"
      aria-hidden="true"
    >
      <span className="text-[0.6875rem] uppercase tracking-[0.18em]">Advertisement</span>
    </li>
  );
}

export default function LiveCatalog({ initialTag, pageSize = 24, adEvery = 12 }: LiveCatalogProps) {
  const { rooms, status, lastUpdated, refresh } = useRooms({ tag: initialTag });
  const [language, setLanguage] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [minViewers, setMinViewers] = useState(0);
  const [page, setPage] = useState(1);

  // Re-run client-side filters whenever the data or a control changes.
  const filtered = useMemo(() => {
    const lang = language.toLowerCase();
    return rooms.filter((r) => {
      if (lang && !r.spoken_languages.toLowerCase().includes(lang)) return false;
      if (gender && r.gender !== gender) return false;
      if (minViewers && r.num_users < minViewers) return false;
      return true;
    });
  }, [rooms, language, gender, minViewers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 when filters change the result set out from under us.
  function onFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Filter live models">
        <label className="flex flex-col gap-1 text-xs text-fg-subtle">
          Language
          <select
            className={selectClass}
            value={language}
            onChange={(e) => onFilterChange(setLanguage)(e.target.value)}
          >
            <option value="">Any language</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-subtle">
          Showing
          <select
            className={selectClass}
            value={gender}
            onChange={(e) => onFilterChange(setGender)(e.target.value as Gender | '')}
          >
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-subtle">
          Min viewers
          <select
            className={selectClass}
            value={minViewers}
            onChange={(e) => onFilterChange(setMinViewers)(Number(e.target.value))}
          >
            {VIEWER_FLOORS.map((v) => (
              <option key={v} value={v}>
                {v === 0 ? 'Any' : `${v}+`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={refresh}
          className="ml-auto rounded-(--radius-md) border border-border-strong bg-surface px-4 py-2 text-sm text-fg
                     transition-colors duration-(--dur-fast) hover:border-premium-500 hover:text-premium-300"
        >
          Refresh
        </button>
      </div>

      {/* States */}
      {status === 'loading' && (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: pageSize > 12 ? 12 : pageSize }).map((_, i) => (
            <li
              key={i}
              className="aspect-[4/3] animate-pulse rounded-(--radius-lg) border border-border bg-surface"
            />
          ))}
        </ul>
      )}

      {status === 'error' && (
        <div className="mt-10 rounded-(--radius-lg) border border-border-strong bg-surface p-8 text-center">
          <p className="text-fg">We couldn't load live models right now.</p>
          <p className="mt-1 text-sm text-fg-muted">The service may be busy — try again in a moment.</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-5 rounded-(--radius-pill) bg-primary-500 px-6 py-2.5 text-sm font-semibold text-on-primary
                       transition-colors duration-(--dur-fast) hover:bg-primary-600"
          >
            Retry
          </button>
        </div>
      )}

      {(status === 'empty' || (status === 'ready' && filtered.length === 0)) && (
        <div className="mt-10 rounded-(--radius-lg) border border-border-strong bg-surface p-8 text-center">
          <p className="text-fg">No models match these filters right now.</p>
          <p className="mt-1 text-sm text-fg-muted">
            Live rooms change every minute — adjust the filters or refresh.
          </p>
        </div>
      )}

      {status === 'ready' && filtered.length > 0 && (
        <>
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {pageItems.map((room, i) => {
              const cards = [<RoomCard key={room.username} room={room} cacheBust={lastUpdated} />];
              // In-grid ad placeholder every `adEvery` cards.
              if (adEvery > 0 && (i + 1) % adEvery === 0 && i + 1 < pageItems.length) {
                cards.push(<AdCard key={`ad-${i}`} />);
              }
              return cards;
            })}
          </ul>

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Catalog pagination">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-(--radius-md) border border-border-strong bg-surface px-4 py-2 text-sm text-fg
                           transition-colors duration-(--dur-fast) hover:border-premium-500 hover:text-premium-300
                           disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-fg"
              >
                Previous
              </button>
              <span className="text-sm text-fg-muted">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-(--radius-md) border border-border-strong bg-surface px-4 py-2 text-sm text-fg
                           transition-colors duration-(--dur-fast) hover:border-premium-500 hover:text-premium-300
                           disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-fg"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
