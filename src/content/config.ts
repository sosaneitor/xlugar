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
    /** Hide from the index and routes when true. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
