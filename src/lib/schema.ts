/** Schema.org JSON-LD builders. Keep output minimal and valid. */
import { SITE, absoluteUrl } from './site';

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
      item: absoluteUrl(it.path),
    })),
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
  const url = absoluteUrl(a.path);
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
