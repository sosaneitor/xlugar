import { OGImageRoute } from 'astro-og-canvas';
import { CATEGORIES } from '@features/catalog/data/categories';
import { SITE } from '@lib/site';

/**
 * Build-time Open Graph images, one per category. Each page key maps to
 * `/og/<key>.png` (e.g. `models/latina` -> `/og/models/latina.png`), which the
 * category page references via BaseLayout's `image` prop. On-brand dark noir
 * background with the xLugar wordmark; no runtime cost (prerendered PNGs).
 */
const pages = Object.fromEntries(
  CATEGORIES.map((c) => [`models/${c.slug}`, { title: c.h1, description: `${SITE.name} — live now, 18+` }]),
);

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page: { title: string; description: string }) => ({
    title: page.title,
    description: page.description,
    // Brand tokens (see src/styles/tokens.css): noir base -> warm surface.
    bgGradient: [
      [23, 9, 15],
      [39, 24, 42],
    ],
    border: { color: [255, 20, 102], width: 12, side: 'inline-start' },
    padding: 70,
    font: {
      title: { color: [248, 238, 241], size: 68, weight: 'ExtraBold', lineHeight: 1.1 },
      description: { color: [187, 166, 172], size: 32 },
    },
  }),
});
