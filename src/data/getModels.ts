import { modelSchema, type Model } from './model.schema';
import { MOCK_MODELS } from './models.mock';

/**
 * Data adapter. Today it serves validated mock data. When the real API exists,
 * set PUBLIC_API_BASE_URL and implement the fetch branch — components and pages
 * stay untouched because they only depend on the validated Model contract.
 */
const API_BASE = import.meta.env.PUBLIC_API_BASE_URL?.replace(/\/$/, '');

function validate(raw: unknown[]): Model[] {
  return raw.map((m) => modelSchema.parse(m));
}

let cache: Model[] | null = null;

export async function getModels(): Promise<Model[]> {
  if (cache) return cache;

  if (API_BASE) {
    // Real source (future): const res = await fetch(`${API_BASE}/models`);
    // cache = validate(await res.json()); return cache;
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error(`getModels: API ${res.status}`);
    cache = validate(await res.json());
    return cache;
  }

  cache = validate(MOCK_MODELS);
  return cache;
}

export async function getModelBySlug(slug: string): Promise<Model | undefined> {
  const all = await getModels();
  return all.find((m) => m.slug === slug);
}

export async function getModelSlugs(): Promise<string[]> {
  const all = await getModels();
  return all.map((m) => m.slug);
}
