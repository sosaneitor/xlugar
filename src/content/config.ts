import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** Path or absolute URL for the hero/OG image. */
    heroImage: z.string().optional(),
    /** Topic tags for clustering / future related-content surfacing. */
    tags: z.array(z.string()).optional(),
    /** Category slugs this post is most related to (drives internal links). */
    relatedCategories: z.array(z.string()).optional(),
    /** Hide from the index and routes when true. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
