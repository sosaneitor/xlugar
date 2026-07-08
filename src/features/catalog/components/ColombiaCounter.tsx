import { useEffect, useState } from 'react';

/**
 * "N Colombian models live now" counter (Feature D) — social proof + fresh,
 * SEO-friendly dynamic content. Polls the same-origin proxy every 60s for the
 * Colombia/LatAm female pool and shows its count. Fails silently (renders an
 * empty reserved line) so it never breaks the section above the fold.
 *
 * No flag emoji on purpose: regional-indicator glyphs render as raw letters
 * ("CO") on Windows/Chrome — a pulsing brand dot reads correctly everywhere.
 */
export default function ColombiaCounter({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController;

    const load = () => {
      controller = new AbortController();
      fetch('/api/rooms?country=CO&region=southamerica&gender=f', { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((data: { count?: number }) => {
          if (!cancelled && typeof data.count === 'number') setCount(data.count);
        })
        .catch(() => {
          /* degrade silently */
        });
    };

    load();
    const id = window.setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return (
    <p
      className="flex items-center gap-2 text-sm text-fg-muted"
      aria-live="polite"
      style={{ minHeight: '1.25rem' }}
    >
      {count !== null && (
        <>
          <span className="h-2 w-2 rounded-full bg-primary-500 motion-safe:animate-pulse" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-fg">{count.toLocaleString()}</strong> Colombian models live now
          </span>
        </>
      )}
    </p>
  );
}
