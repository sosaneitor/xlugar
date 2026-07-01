import { useEffect, useState } from 'react';

/**
 * Aggregate "N models live right now" counter for the hero.
 *
 * Fetches the same-origin proxy once on mount and reads its `count` field
 * (/api/rooms returns `{ rooms, count }`). Deliberately does NOT reuse the
 * useRooms polling hook — the hero only needs a single headline number, not a
 * 60s-polling list. Fails silently: if the fetch errors, the component renders
 * nothing so the hero never shows a broken/error state above the fold.
 */
export default function LiveCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/rooms', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { count?: number }) => {
        if (typeof data.count === 'number') setCount(data.count);
      })
      .catch(() => {
        /* degrade silently — no counter shown */
      });
    return () => controller.abort();
  }, []);

  // Reserve height with a fixed line so hydration doesn't shift the hero.
  return (
    <p
      className="mt-6 flex items-center gap-2 text-sm text-fg-muted"
      aria-live="polite"
      style={{ minHeight: '1.25rem' }}
    >
      {count !== null && (
        <>
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-fg">{count.toLocaleString()}</strong> models live right now
          </span>
        </>
      )}
    </p>
  );
}
