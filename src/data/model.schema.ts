import { z } from 'astro/zod';

/**
 * Canonical Model shape. This is the contract the rest of the app codes against,
 * so swapping the mock source for a real API only touches the adapter
 * (src/data/getModels.ts), never the components.
 */
export const mediaSchema = z.object({
  type: z.enum(['image', 'video']),
  src: z.string().url(),
  poster: z.string().url().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string(),
});

export const modelSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  age: z.number().int().min(18).max(99),
  city: z.string(),
  tagline: z.string(),
  bio: z.string(),
  tags: z.array(z.string()).default([]),
  premium: z.boolean().default(false),
  /** Portrait used in cards / Tinder / album. */
  cover: mediaSchema,
  /** Vertical media for the TikTok-style feed. */
  feed: z.array(mediaSchema).default([]),
  /** Gallery for the profile page. */
  gallery: z.array(mediaSchema).default([]),
  rarity: z.enum(['common', 'rare', 'legendary']).default('common'),
});

export type Media = z.infer<typeof mediaSchema>;
export type Model = z.infer<typeof modelSchema>;
