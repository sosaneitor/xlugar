import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChaturbateRoom } from '../types/room';

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
  /** Poll interval in ms. Defaults to 60s per spec. */
  intervalMs?: number;
}

/**
 * Polls the same-origin serverless proxy (/api/rooms) every `intervalMs`.
 * The proxy already filters current_show=public and sorts by num_users desc.
 * Cancels the interval and any in-flight request on unmount.
 */
export function useRooms({ tag, intervalMs = 60_000 }: UseRoomsOptions = {}): UseRoomsResult {
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
        const qs = tag ? `?tag=${encodeURIComponent(tag)}` : '';
        const res = await fetch(`/api/rooms${qs}`, { signal: controller.signal });
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
    [tag],
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
