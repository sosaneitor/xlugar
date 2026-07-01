import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChaturbateRoom, Gender } from '../types/room';
import type { Region, SortMode } from '../services/chaturbate';

export type RoomsStatus = 'loading' | 'ready' | 'empty' | 'error';

interface UseRoomsResult {
  rooms: ChaturbateRoom[];
  status: RoomsStatus;
  /** Timestamp (ms) of the last successful fetch — used to cache-bust thumbnails. */
  lastUpdated: number;
  refresh: () => void;
}

interface UseRoomsOptions {
  /** Lock the grid to a single API tag (category pages). */
  tag?: string;
  /** Server-side geo region. 'all' forces a global pool; omit for env default. */
  region?: Region | 'all';
  /** Server-side gender filter. */
  gender?: Gender;
  /** Require an ISO alpha-2 country code (e.g. "CO"). */
  country?: string;
  /** Substring match against spoken_languages (e.g. "spanish"). */
  language?: string;
  /** Ordering of the pool. */
  sort?: SortMode;
  /** Max rooms to request from the proxy. */
  limit?: number;
  /** Poll interval in ms. Defaults to 60s per spec. */
  intervalMs?: number;
}

/**
 * Polls the same-origin serverless proxy (/api/rooms) every `intervalMs`.
 * The proxy already filters current_show=public and sorts by num_users desc.
 * Cancels the interval and any in-flight request on unmount.
 */
export function useRooms({
  tag,
  region,
  gender,
  country,
  language,
  sort,
  limit,
  intervalMs = 60_000,
}: UseRoomsOptions = {}): UseRoomsResult {
  const [rooms, setRooms] = useState<ChaturbateRoom[]>([]);
  const [status, setStatus] = useState<RoomsStatus>('loading');
  const [lastUpdated, setLastUpdated] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (isInitial: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (isInitial) setStatus('loading');
      try {
        const params = new URLSearchParams();
        if (tag) params.set('tag', tag);
        if (region) params.set('region', region);
        if (gender) params.set('gender', gender);
        if (country) params.set('country', country);
        if (language) params.set('language', language);
        if (sort) params.set('sort', sort);
        if (limit) params.set('limit', String(limit));
        const qs = params.toString();
        const res = await fetch(`/api/rooms${qs ? `?${qs}` : ''}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`proxy ${res.status}`);
        const data = (await res.json()) as { rooms?: ChaturbateRoom[] };
        const next = Array.isArray(data.rooms) ? data.rooms : [];
        setRooms(next);
        setLastUpdated(Date.now());
        setStatus(next.length === 0 ? 'empty' : 'ready');
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        // Keep stale rooms visible on a refresh failure; only hard-fail initial load.
        setStatus((prev) => (prev === 'loading' ? 'error' : prev));
      }
    },
    [tag, region, gender, country, language, sort, limit],
  );

  useEffect(() => {
    load(true);
    const id = window.setInterval(() => load(false), intervalMs);
    return () => {
      window.clearInterval(id);
      abortRef.current?.abort();
    };
  }, [load, intervalMs]);

  const refresh = useCallback(() => load(false), [load]);

  return { rooms, status, lastUpdated, refresh };
}
