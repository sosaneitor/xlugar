/** Schema.org JSON-LD builders. Keep output minimal and valid. */
import { SITE, absoluteUrl, withTrailingSlash } from './site';

/** Absolute URL for a page path, normalized to the trailing-slash form served. */
function pageUrl(path: string): string {
  return absoluteUrl(withTrailingSlash(path));
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    inLanguage: SITE.lang,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: pageUrl(it.path),
    })),
  };
}

/**
 * ItemList of internal pages (e.g. category listings). `url` on each ListItem
 * points to the page; Google uses this to understand curated collections.
 */
export function itemListSchema(items: { name: string; path: string }[], name?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(name ? { name } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: pageUrl(it.path),
    })),
  };
}

/** CollectionPage schema for a listing page (catalog / category). */
export function collectionPageSchema(input: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url: pageUrl(input.path),
    inLanguage: SITE.lang,
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
  };
}

interface ArticleInput {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}

/** Article schema for blog posts. */
export function articleSchema(a: ArticleInput) {
  const url = pageUrl(a.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    inLanguage: SITE.lang,
    url,
    mainEntityOfPage: url,
    datePublished: a.datePublished,
    dateModified: a.dateModified ?? a.datePublished,
    ...(a.image ? { image: absoluteUrl(a.image) } : {}),
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      url: SITE.url,
    },
  };
}
