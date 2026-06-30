/**
 * Centralized site identity, sourced from env (PUBLIC_* so it is available
 * at build time for SEO). Nothing is hardcoded in components.
 */
export const SITE = {
  url: (import.meta.env.PUBLIC_SITE_URL ?? 'https://xlugar.com').replace(/\/$/, ''),
  name: import.meta.env.PUBLIC_SITE_NAME ?? 'xLugar',
  locale: import.meta.env.PUBLIC_SITE_LOCALE ?? 'en_US',
  lang: (import.meta.env.PUBLIC_SITE_LOCALE ?? 'en_US').split('_')[0] || 'en',
  twitter: import.meta.env.PUBLIC_TWITTER_HANDLE ?? '@xlugar',
  defaultDescription:
    'xLugar — discover live cam models streaming right now. Browse a real-time catalog and curated categories, updated every minute. 18+ only.',
  defaultOgImage: '/og/default.jpg',
} as const;

/** Build an absolute URL from a path or relative URL against the site origin. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE.url}${path.startsWith('/') ? '' : '/'}${path}`;
}
