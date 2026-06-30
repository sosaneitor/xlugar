import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Model } from '@data/model.schema';

interface Props {
  models: Model[];
}

const STORAGE_KEY = 'xlugar:album:v1';

const rarityRing: Record<Model['rarity'], string> = {
  common: 'border-border-strong',
  rare: 'border-primary-600',
  legendary: 'border-premium-500',
};
const rarityLabel: Record<Model['rarity'], string> = {
  common: 'Común',
  rare: 'Rara',
  legendary: 'Legendaria',
};

export default function AlbumGrid({ models }: Props) {
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  // Hydrate collected set from localStorage (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCollected(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: Set<string>) => {
    setCollected(new Set(next));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const collect = (id: string) => {
    const next = new Set(collected);
    next.add(id);
    persist(next);
  };

  const toggleFlip = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const collectAll = () => persist(new Set(models.map((m) => m.id)));
  const resetAlbum = () => persist(new Set());

  const total = models.length;
  const have = models.filter((m) => collected.has(m.id)).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-fg-muted">
          Colección{' '}
          <span className="font-display text-lg text-premium-400">
            {have}/{total}
          </span>
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={collectAll}
            className="rounded-[--radius-md] bg-primary-500 px-4 py-2 text-sm font-medium text-on-primary transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            Completar álbum
          </button>
          <button
            type="button"
            onClick={resetAlbum}
            className="rounded-[--radius-md] border border-border-strong bg-surface px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {models.map((model) => (
          <li key={model.id}>
            <Sticker
              model={model}
              owned={collected.has(model.id)}
              flipped={flipped.has(model.id)}
              onCollect={() => collect(model.id)}
              onFlip={() => toggleFlip(model.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sticker({
  model,
  owned,
  flipped,
  onCollect,
  onFlip,
}: {
  model: Model;
  owned: boolean;
  flipped: boolean;
  onCollect: () => void;
  onFlip: () => void;
}) {
  if (!owned) {
    return (
      <button
        type="button"
        onClick={onCollect}
        aria-label={`Desbloquear figurita de ${model.name}`}
        className={`relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-[--radius-lg]
          border-2 border-dashed ${rarityRing[model.rarity]} bg-surface text-center
          transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-premium-400
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-premium-400 motion-reduce:transform-none`}
      >
        <div className="px-3">
          <span className="block text-3xl text-fg-subtle">＋</span>
          <span className="mt-2 block text-xs font-medium uppercase tracking-widest text-fg-subtle">
            {rarityLabel[model.rarity]}
          </span>
          <span className="mt-1 block text-[0.6875rem] text-fg-subtle">Toca para pegar</span>
        </div>
      </button>
    );
  }

  return (
    <div className="[perspective:1000px]">
      <motion.button
        type="button"
        onClick={onFlip}
        aria-label={`${model.name} — girar figurita`}
        aria-pressed={flipped}
        // "Paste/unlock" entrance: stamp-in with a slight overshoot.
        initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="relative block aspect-[3/4] w-full rounded-[--radius-lg] [transform-style:preserve-3d]
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-premium-400"
      >
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* FRONT */}
          <div
            className={`absolute inset-0 overflow-hidden rounded-[--radius-lg] border-2 ${rarityRing[model.rarity]}
              bg-surface [backface-visibility:hidden] ${model.premium ? 'foil' : ''}`}
          >
            <img
              src={model.cover.src}
              alt={model.cover.alt}
              width={model.cover.width}
              height={model.cover.height}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            {model.premium && <span className="foil-sheen" aria-hidden="true" />}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="mb-1 flex gap-1.5">
                {model.premium && (
                  <span className="rounded-full bg-premium-500 px-2 py-0.5 text-[0.5625rem] font-semibold tracking-wide text-on-premium">
                    VIP
                  </span>
                )}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.5625rem] font-medium tracking-wide text-fg-muted">
                  {rarityLabel[model.rarity]}
                </span>
              </div>
              <p className="font-display text-base leading-tight text-fg">{model.name}</p>
              <p className="text-[0.6875rem] text-fg-muted">{model.city}</p>
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[--radius-lg]
              border-2 border-border-strong bg-bg-elev p-4 text-left [backface-visibility:hidden]
              [transform:rotateY(180deg)]"
          >
            <div>
              <p className="font-display text-lg text-premium-400">{model.name}, {model.age}</p>
              <p className="mt-1 text-xs text-fg-muted">{model.tagline}</p>
            </div>
            <dl className="space-y-1 text-[0.6875rem] text-fg-subtle">
              <div className="flex justify-between"><dt>Ciudad</dt><dd className="text-fg-muted">{model.city}</dd></div>
              <div className="flex justify-between"><dt>Rareza</dt><dd className="text-fg-muted">{rarityLabel[model.rarity]}</dd></div>
            </dl>
            <a
              href={`/modelos/${model.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-block rounded-[--radius-sm] bg-primary-500 px-3 py-1.5 text-center text-xs font-medium text-on-primary"
            >
              Ver perfil
            </a>
          </div>
        </motion.div>
      </motion.button>
    </div>
  );
}
