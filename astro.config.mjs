// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

// Site URL is configurable via env so nothing is hardcoded.
// Falls back to the production domain for build-time absolute URLs (canonical, OG, sitemap).
const SITE = process.env.PUBLIC_SITE_URL ?? 'https://xlugar.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  // NOTE: do NOT set `trailingSlash: 'always'` — it makes the on-demand API route
  // only match `/api/rooms/`, breaking the client `fetch('/api/rooms')` (catalog +
  // live counter). Canonical consistency is handled in Seo.astro/schema instead,
  // and the default 'ignore' serves both slash forms.
  // Pages are emitted as directories (/models/latina/index.html) and served with
  // a trailing slash; make that the canonical, enforced form to avoid dup signals.
  trailingSlash: 'always',
  adapter: netlify(),
  integrations: [
    react(),
    sitemap({
      // The on-demand proxy route is not a page — keep it out of the sitemap.
      filter: (page) => !page.includes('/api/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  // Room thumbnails are external, self-refreshing JPEG snapshots — we render
  // them with plain <img>, not the Image optimizer, so no remotePatterns needed.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
