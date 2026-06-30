/**
 * Centralized site identity, sourced from env (PUBLIC_* so it is available
 * at build time for SEO). Nothing is hardcoded in components.
 */
export const SITE = {
  url: (import.meta.env.PUBLIC_SITE_URL ?? 'https://xlugar.com').replace(/\/$/, ''),
  name: import.meta.env.PUBLIC_SITE_NAME ?? 'xLugar',
  locale: import.meta.env.PUBLIC_SITE_LOCALE ?? 'es_ES',
  lang: (import.meta.env.PUBLIC_SITE_LOCALE ?? 'es_ES').split('_')[0] || 'es',
  twitter: import.meta.env.PUBLIC_TWITTER_HANDLE ?? '@xlugar',
  defaultDescription:
    'xLugar — catálogo de modelos con descubrimiento interactivo, feed vertical y álbum coleccionable. Experiencia premium, dark-luxe.',
  defaultOgImage: '/og/default.jpg',
} as const;

/** Build an absolute URL from a path or relative URL against the site origin. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE.url}${path.startsWith('/') ? '' : '/'}${path}`;
}
