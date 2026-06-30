import { useCallback, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import type { Model } from '@data/model.schema';

interface Props {
  models: Model[];
}

const SWIPE_THRESHOLD = 110; // px or velocity-assisted
const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function SwipeDeck({ models }: Props) {
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const remaining = models.slice(index);
  const done = index >= models.length;

  const advance = useCallback(
    (dir: 'like' | 'nope', model: Model) => {
      if (dir === 'like') setLiked((l) => [...l, model.id]);
      setIndex((i) => i + 1);
    },
    []
  );

  const reset = () => {
    setIndex(0);
    setLiked([]);
  };

  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm select-none">
        {done ? (
          <EmptyState likedCount={liked.length} onReset={reset} />
        ) : (
          <AnimatePresence>
            {remaining
              .slice(0, 3)
              .reverse()
              .map((model, i, arr) => {
                const depth = arr.length - 1 - i; // 0 = top card
                return (
                  <Card
                    key={model.id}
                    model={model}
                    depth={depth}
                    isTop={depth === 0}
                    onResolve={(dir) => advance(dir, model)}
                  />
                );
              })}
          </AnimatePresence>
        )}
      </div>

      {!done && (
        <div className="mt-6 flex items-center justify-center gap-5">
          <ActionButton
            label="Pasar"
            tone="nope"
            onClick={() => advance('nope', remaining[0])}
          >
            ✕
          </ActionButton>
          <p className="min-w-16 text-center text-sm text-fg-subtle" aria-live="polite">
            {index + 1} / {models.length}
          </p>
          <ActionButton
            label="Me gusta"
            tone="like"
            onClick={() => advance('like', remaining[0])}
          >
            ♥
          </ActionButton>
        </div>
      )}
    </div>
  );
}

function Card({
  model,
  depth,
  isTop,
  onResolve,
}: {
  model: Model;
  depth: number;
  isTop: boolean;
  onResolve: (dir: 'like' | 'nope') => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);
  const [exitX, setExitX] = useState(0);
  const draggingRef = useRef(false);

  const onDragStart = () => {
    draggingRef.current = true;
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    draggingRef.current = false;
    const power = info.offset.x + info.velocity.x * 0.2;
    if (power > SWIPE_THRESHOLD) {
      setExitX(600);
      onResolve('like');
    } else if (power < -SWIPE_THRESHOLD) {
      setExitX(-600);
      onResolve('nope');
    }
  };

  // Stacked offset/scale for cards behind the top one.
  const stackScale = 1 - depth * 0.05;
  const stackY = depth * 14;

  return (
    <motion.div
      className="absolute inset-0 will-change-transform"
      style={{ x, rotate, zIndex: 10 - depth }}
      drag={isTop && !prefersReduced ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.6}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      initial={{ scale: stackScale, y: stackY + 24, opacity: 0 }}
      animate={{ scale: stackScale, y: stackY, opacity: 1 }}
      exit={{ x: exitX, opacity: 0, transition: { duration: 0.32 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <article className="relative h-full w-full overflow-hidden rounded-[--radius-xl] border border-border bg-surface shadow-[var(--shadow-card)]">
        <img
          src={model.cover.src}
          alt={model.cover.alt}
          width={model.cover.width}
          height={model.cover.height}
          draggable={false}
          loading={depth === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg to-transparent" />

        {/* Feedback overlays — solid color stamps, not glass */}
        <motion.span
          style={{ opacity: likeOpacity }}
          className="absolute right-4 top-4 rotate-12 rounded-md bg-like px-3 py-1 text-sm font-bold uppercase tracking-widest text-bg"
        >
          Like
        </motion.span>
        <motion.span
          style={{ opacity: nopeOpacity }}
          className="absolute left-4 top-4 -rotate-12 rounded-md bg-nope px-3 py-1 text-sm font-bold uppercase tracking-widest text-on-crimson"
        >
          Nope
        </motion.span>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="mb-2 flex gap-2">
            {model.premium && (
              <span className="rounded-full bg-gold-500 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-on-gold">
                VIP
              </span>
            )}
            {model.tags.slice(0, 1).map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-fg-muted"
              >
                {t}
              </span>
            ))}
          </div>
          <h3 className="font-display text-2xl text-fg">
            {model.name}
            <span className="font-sans text-lg font-normal text-fg-muted">, {model.age}</span>
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            {model.city} · {model.tagline}
          </p>
        </div>
      </article>
    </motion.div>
  );
}

function ActionButton({
  children,
  label,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  tone: 'like' | 'nope';
  onClick: () => void;
}) {
  const toneCls =
    tone === 'like'
      ? 'border-like text-like hover:bg-like hover:text-bg'
      : 'border-nope text-nope hover:bg-nope hover:text-on-crimson';
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-14 w-14 place-items-center rounded-full border-2 bg-surface text-2xl
        transition-[transform,background-color,color] duration-150 hover:-translate-y-1 active:scale-90
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400
        motion-reduce:transform-none ${toneCls}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ likedCount, onReset }: { likedCount: number; onReset: () => void }) {
  return (
    <div className="grid h-full w-full place-items-center rounded-[--radius-xl] border border-dashed border-border-strong bg-surface p-8 text-center">
      <div>
        <p className="font-display text-2xl text-fg">Has visto todas</p>
        <p className="mt-2 text-sm text-fg-muted">
          {likedCount > 0
            ? `Diste like a ${likedCount} ${likedCount === 1 ? 'modelo' : 'modelos'}.`
            : 'Vuelve a empezar cuando quieras.'}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-[--radius-md] bg-crimson-500 px-5 py-2.5 text-sm font-medium text-on-crimson transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}
