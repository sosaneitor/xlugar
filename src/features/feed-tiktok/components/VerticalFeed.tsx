import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Model, Media } from '@data/model.schema';

interface Slide {
  media: Media;
  model: Pick<Model, 'name' | 'slug' | 'city' | 'tagline' | 'premium'>;
}

interface Props {
  models: Model[];
}

export default function VerticalFeed({ models }: Props) {
  const slides: Slide[] = models.flatMap((m) =>
    m.feed.map((media) => ({
      media,
      model: { name: m.name, slug: m.slug, city: m.city, tagline: m.tagline, premium: m.premium },
    }))
  );

  return (
    <div
      className="relative mx-auto h-[78vh] max-h-[760px] w-full max-w-[380px] overflow-y-auto
                 snap-y snap-mandatory rounded-[--radius-xl] border border-border bg-black
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Feed vertical de modelos"
    >
      {slides.map((slide, i) => (
        <FeedSlide key={`${slide.model.slug}-${i}`} slide={slide} eager={i === 0} />
      ))}
    </div>
  );
}

function FeedSlide({ slide, eager }: { slide: Slide; eager: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [liked, setLiked] = useState(false);
  const isVideo = slide.media.type === 'video';

  // Autoplay/pause based on viewport visibility within the scroller.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio > 0.6;
        setActive(visible);
        const v = videoRef.current;
        if (!v) return;
        if (visible) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative h-full w-full snap-start snap-always">
      {isVideo ? (
        <video
          ref={videoRef}
          src={slide.media.src}
          poster={slide.media.poster}
          width={slide.media.width}
          height={slide.media.height}
          muted
          loop
          playsInline
          preload={eager ? 'metadata' : 'none'}
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={slide.media.src}
          alt={slide.media.alt}
          width={slide.media.width}
          height={slide.media.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}

      {/* solid bottom scrim for text legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <a href={`/modelos/${slide.model.slug}`} className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-display text-lg text-fg">{slide.model.name}</span>
            {slide.model.premium && (
              <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-on-gold">
                VIP
              </span>
            )}
          </div>
          <p className="truncate text-sm text-fg-muted">
            {slide.model.city} · {slide.model.tagline}
          </p>
        </a>

        <div className="flex flex-col items-center gap-4">
          <FeedAction
            label={liked ? 'Quitar me gusta' : 'Me gusta'}
            active={liked}
            onClick={() => setLiked((v) => !v)}
          >
            ♥
          </FeedAction>
          <FeedAction label="Compartir">↗</FeedAction>
        </div>
      </div>

      {/* Active-slide pulse indicator (transform/opacity only) */}
      <motion.span
        aria-hidden="true"
        className="absolute left-4 top-4 h-2 w-2 rounded-full bg-crimson-500"
        animate={active ? { scale: [1, 1.6, 1], opacity: [1, 0.4, 1] } : { scale: 1, opacity: 0.4 }}
        transition={{ duration: 1.6, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
      />
    </section>
  );
}

function FeedAction({
  children,
  label,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={onClick ? active : undefined}
      onClick={onClick}
      whileTap={{ scale: 0.8 }}
      className={`grid h-12 w-12 place-items-center rounded-full border border-border-strong bg-surface text-xl
        transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400
        ${active ? 'text-crimson-500' : 'text-fg'}`}
    >
      {children}
    </motion.button>
  );
}
