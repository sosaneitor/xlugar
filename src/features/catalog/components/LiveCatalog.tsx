import { useEffect, useMemo, useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { DEFAULT_REGION } from '../services/chaturbate';
import type { Region, SortMode } from '../services/chaturbate';
import { buildRoomLink } from '@features/affiliate/utils/whiteLabel';
import { countryName } from '../utils/country';
import type { ChaturbateRoom, Gender } from '../types/room';

interface LiveCatalogProps {
  /** Lock to a category tag (category pages). */
  initialTag?: string;
  /** Lock to an ISO alpha-2 country (e.g. "CO") — for nationality categories. */
  initialCountry?: string;
  /** Seed the language filter (e.g. "Spanish"). */
  initialLanguage?: string;
  /** Seed the active gender tab (e.g. "c" for couples). */
  initialGender?: Gender | '';
  /** Seed the active region tab. Defaults to the env default. */
  initialRegion?: Region | 'all';
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
// Server-side region tabs (each change re-fetches a fresh pool from CB).
const REGION_TABS: { value: Region | 'all'; label: string }[] = [
  { value: 'southamerica', label: 'LatAm' },
  { value: 'northamerica', label: 'N. America' },
  { value: 'europe_russia', label: 'Europe' },
  { value: 'asia', label: 'Asia' },
  { value: 'all', label: 'Global' },
];
const SORTS: { value: SortMode; label: string }[] = [
  { value: 'viewers', label: 'Most viewers' },
  { value: 'new', label: 'Newest live' },
];
const VIEWER_FLOORS = [0, 50, 100, 500, 1000];

const selectClass =
  'rounded-(--radius-md) border border-border-strong bg-surface px-3 py-2 text-sm text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-premium-400';

const tabBase =
  'rounded-(--radius-pill) border px-3.5 py-1.5 text-sm transition-colors duration-(--dur-fast) ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-premium-400';
const tabActive = 'border-premium-500 bg-premium-500/10 text-premium-200';
const tabIdle = 'border-border-strong bg-surface text-fg-muted hover:border-premium-500 hover:text-premium-300';

// Only surface follower counts once they read as a real popularity signal.
const FOLLOWERS_BADGE_FLOOR = 10_000;

/** Compact number: 12300 -> "12.3k", 1_200_000 -> "1.2M". */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Seconds online -> "live 2h" / "live 45m"; empty when unknown/too short. */
function formatUptime(seconds: number): string {
  if (!seconds || seconds < 60) return '';
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `live ${hours}h`;
  return `live ${Math.floor(seconds / 60)}m`;
}

/** First spoken language from the comma-separated list, e.g. "English". */
function primaryLanguage(spoken: string): string {
  return spoken.split(',')[0]?.trim() ?? '';
}

export function RoomCard({
  room,
  cacheBust,
  priority = false,
}: {
  room: ChaturbateRoom;
  cacheBust: number;
  /** Above-the-fold card: eager-load with high fetch priority for LCP. */
  priority?: boolean;
}) {
  const src = room.image_url_360x270 || room.image_url;
  const img = src ? `${src}${src.includes('?') ? '&' : '?'}t=${cacheBust}` : '';
  const tags = room.tags.slice(0, 3);
  // Prefer the model's own free-text location; else the resolved country name.
  // (No emoji flag here — regional-indicator glyphs render as raw letters, e.g.
  // "CO", on Windows/Chrome. The country name carries the location instead.)
  const place = room.location || countryName(room.country);
  const title = room.display_name || room.username;
  const subject = room.room_subject?.trim();
  // Secondary metadata row — fields the feed already delivers but weren't shown.
  const uptime = formatUptime(room.seconds_online);
  const language = primaryLanguage(room.spoken_languages);
  const followers =
    room.num_followers >= FOLLOWERS_BADGE_FLOOR ? formatCompact(room.num_followers) : '';
  const meta = [uptime, language, followers && `${followers} followers`].filter(Boolean);
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
              alt={`${title} live cam preview`}
              width={360}
              height={270}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
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
          {/* Solid-dark scrim (no glass): tall + strong enough that up to four
              text lines stay legible over bright thumbnails on small cards. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4/5 bg-gradient-to-t from-bg via-bg/85 to-transparent" />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {/* LIVE — on-brand hot-pink pill (was off-system green). */}
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) bg-primary-500 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-on-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-on-primary motion-safe:animate-pulse" aria-hidden="true" />
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
        {/* Text pinned to the bottom; badges pinned to the top — they never collide. */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <h3 className="truncate text-base font-semibold text-fg sm:text-lg">
            {title}
            {room.age ? (
              <span className="font-sans text-sm font-normal text-fg-muted">, {room.age}</span>
            ) : null}
          </h3>
          {subject && (
            <p className="mt-0.5 truncate text-xs text-fg-muted sm:text-sm" title={subject}>
              {subject}
            </p>
          )}
          {(place || tags.length > 0) && (
            <p className="mt-0.5 truncate text-xs text-fg-muted">
              {place && <span>{place}</span>}
              {place && tags.length > 0 && <span> · </span>}
              {tags.map((t) => `#${t}`).join(' ')}
            </p>
          )}
          {meta.length > 0 && (
            <p className="mt-1 truncate text-[0.6875rem] text-fg-subtle">{meta.join(' · ')}</p>
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

export default function LiveCatalog({
  initialTag,
  initialCountry,
  initialLanguage,
  initialGender,
  initialRegion,
  pageSize = 24,
  adEvery = 12,
}: LiveCatalogProps) {
  // Server-side controls (each change re-fetches a fresh pool from Chaturbate).
  const [region, setRegion] = useState<Region | 'all'>(
    initialRegion ?? DEFAULT_REGION ?? 'all',
  );
  const [gender, setGender] = useState<Gender | ''>(initialGender ?? '');
  const [sort, setSort] = useState<SortMode>('viewers');
  // Client-side filters (applied over the already-loaded pool, no re-fetch).
  const [language, setLanguage] = useState(initialLanguage ?? '');
  const [minViewers, setMinViewers] = useState(0);
  const [hdOnly, setHdOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { rooms, status, lastUpdated, refresh } = useRooms({
    tag: initialTag,
    country: initialCountry,
    region,
    gender: gender || undefined,
    sort,
  });

  // Re-run client-side filters whenever the data or a control changes.
  const filtered = useMemo(() => {
    const lang = language.toLowerCase();
    return rooms.filter((r) => {
      if (lang && !r.spoken_languages.toLowerCase().includes(lang)) return false;
      if (minViewers && r.num_users < minViewers) return false;
      if (hdOnly && !r.is_hd) return false;
      if (newOnly && !r.is_new) return false;
      return true;
    });
  }, [rooms, language, minViewers, hdOnly, newOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 whenever any control changes the result set under us.
  function change<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  // --- Mobile filter drawer ---
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Defaults to compare against so seeded (category/landing) filters don't read
  // as "active" until the user actually changes them.
  const defaultRegion = initialRegion ?? DEFAULT_REGION ?? 'all';
  const defaultGender: Gender | '' = initialGender ?? '';
  const defaultLanguage = initialLanguage ?? '';

  const regionLabel = REGION_TABS.find((r) => r.value === region)?.label ?? region;
  const genderLabel = GENDERS.find((g) => g.value === gender)?.label ?? '';

  // Active-filter chips shown above the collapsed drawer on mobile.
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (region !== defaultRegion)
    chips.push({ key: 'region', label: regionLabel, clear: () => change(setRegion)(defaultRegion) });
  if (gender !== defaultGender)
    chips.push({ key: 'gender', label: genderLabel, clear: () => change(setGender)(defaultGender) });
  if (sort !== 'viewers')
    chips.push({ key: 'sort', label: 'Newest live', clear: () => change(setSort)('viewers') });
  if (language !== defaultLanguage && language)
    chips.push({ key: 'language', label: language, clear: () => change(setLanguage)(defaultLanguage) });
  if (minViewers > 0)
    chips.push({ key: 'viewers', label: `${minViewers}+ viewers`, clear: () => change(setMinViewers)(0) });
  if (hdOnly) chips.push({ key: 'hd', label: 'HD only', clear: () => change(setHdOnly)(false) });
  if (newOnly) chips.push({ key: 'new', label: 'New only', clear: () => change(setNewOnly)(false) });

  function clearAll() {
    change(setRegion)(defaultRegion);
    setGender(defaultGender);
    setSort('viewers');
    setLanguage(defaultLanguage);
    setMinViewers(0);
    setHdOnly(false);
    setNewOnly(false);
    setPage(1);
  }

  // Lock body scroll + close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  return (
    <div>
      {/* Mobile: collapsed summary bar — result count + Filters (drawer trigger)
          + refresh — so the first card is visible without scrolling past controls. */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-border-strong bg-surface px-4 py-2 text-sm text-fg
                     transition-colors duration-(--dur-fast) hover:border-premium-500 hover:text-premium-300"
        >
          Filters{chips.length > 0 ? ` (${chips.length})` : ''}
        </button>
        {status === 'ready' && (
          <span className="text-sm text-fg-muted">{filtered.length.toLocaleString()} live</span>
        )}
        <button
          type="button"
          onClick={refresh}
          className="ml-auto rounded-(--radius-md) border border-border-strong bg-surface px-3 py-2 text-sm text-fg
                     transition-colors duration-(--dur-fast) hover:border-premium-500 hover:text-premium-300"
        >
          Refresh
        </button>
      </div>

      {/* Mobile: active-filter chips summary (each removable). */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="inline-flex items-center gap-1 rounded-(--radius-pill) border border-premium-500 bg-premium-500/10 px-3 py-1 text-xs text-premium-200"
            >
              {c.label}
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="rounded-(--radius-pill) px-3 py-1 text-xs text-fg-subtle underline hover:text-premium-300"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Mobile drawer backdrop — solid dark scrim (no blur / glass). */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-bg/80 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Controls: a bottom-sheet drawer on mobile, static inline on desktop.
          transform/opacity only; solid --c-surface background. */}
      <div
        role="group"
        aria-label="Filters and sorting"
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-(--radius-xl) border-t border-border-strong
                    bg-surface p-5 pb-8 shadow-[var(--shadow-card)] transition-transform duration-(--dur-mid) ease-(--ease-out-soft)
                    lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:transition-none
                    ${drawerOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
      >
        {/* Drawer header (mobile only). */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <h2 className="text-lg text-fg">Filters</h2>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-(--radius-pill) bg-primary-500 px-4 py-1.5 text-sm font-semibold text-on-primary"
          >
            Done
          </button>
        </div>

      {/* Server-side tabs: region + gender (re-fetch the pool from CB). */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Region">
          {REGION_TABS.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={region === r.value}
              onClick={() => change(setRegion)(r.value)}
              className={`${tabBase} ${region === r.value ? tabActive : tabIdle}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Showing">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              type="button"
              aria-pressed={gender === g.value}
              onClick={() => change(setGender)(g.value)}
              className={`${tabBase} ${gender === g.value ? tabActive : tabIdle}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client-side filters + sort. */}
      <div className="mt-4 flex flex-wrap items-end gap-3" role="group" aria-label="Filter and sort">
        <label className="flex flex-col gap-1 text-xs text-fg-subtle">
          Sort by
          <select
            className={selectClass}
            value={sort}
            onChange={(e) => change(setSort)(e.target.value as SortMode)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-subtle">
          Language
          <select
            className={selectClass}
            value={language}
            onChange={(e) => change(setLanguage)(e.target.value)}
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
          Min viewers
          <select
            className={selectClass}
            value={minViewers}
            onChange={(e) => change(setMinViewers)(Number(e.target.value))}
          >
            {VIEWER_FLOORS.map((v) => (
              <option key={v} value={v}>
                {v === 0 ? 'Any' : `${v}+`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={hdOnly}
            onChange={(e) => change(setHdOnly)(e.target.checked)}
            className="accent-premium-500"
          />
          HD only
        </label>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={newOnly}
            onChange={(e) => change(setNewOnly)(e.target.checked)}
            className="accent-premium-500"
          />
          New only
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
      </div>

      {/* States */}
      {status === 'loading' && (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
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
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {pageItems.map((room, i) => {
              const cards = [
                <RoomCard
                  key={room.username}
                  room={room}
                  cacheBust={lastUpdated}
                  priority={safePage === 1 && i < 4}
                />,
              ];
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
