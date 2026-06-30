/** Schema.org JSON-LD builders. Keep output minimal and valid. */
import { SITE, absoluteUrl } from './site';

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    inLanguage: SITE.lang,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/buscar?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
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

interface ProfileInput {
  name: string;
  slug: string;
  description: string;
  image: string;
  city?: string;
}

/** ProfilePage with an embedded Person, plus a primary ImageObject. */
export function profileSchema(p: ProfileInput) {
  const url = absoluteUrl(`/modelos/${p.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    inLanguage: SITE.lang,
    mainEntity: {
      '@type': 'Person',
      name: p.name,
      description: p.description,
      url,
      image: {
        '@type': 'ImageObject',
        url: absoluteUrl(p.image),
        contentUrl: absoluteUrl(p.image),
        caption: p.name,
      },
      ...(p.city ? { homeLocation: { '@type': 'Place', name: p.city } } : {}),
    },
  };
}
