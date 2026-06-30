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
  adapter: netlify(),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Allow build-time optimization (AVIF/WebP) of the mock placeholder images.
    // Swap these patterns for the real media host when the API is wired in.
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
