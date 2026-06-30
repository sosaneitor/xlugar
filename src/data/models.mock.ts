import type { Model, Media } from './model.schema';

/**
 * MOCK dataset. Replace by wiring getModels() to the real API later.
 * Images are stable seeded placeholders; a couple of feed items use public
 * sample videos so the TikTok-style autoplay/pause logic is exercised.
 */

const portrait = (seed: string, w = 800, h = 1100): Media => ({
  type: 'image',
  src: `https://picsum.photos/seed/${seed}/${w}/${h}`,
  width: w,
  height: h,
  alt: '',
});

const vertical = (seed: string): Media => ({
  type: 'image',
  src: `https://picsum.photos/seed/${seed}/1080/1920`,
  width: 1080,
  height: 1920,
  alt: '',
});

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
];

const video = (i: number, posterSeed: string): Media => ({
  type: 'video',
  src: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
  poster: `https://picsum.photos/seed/${posterSeed}/1080/1920`,
  width: 1080,
  height: 1920,
  alt: '',
});

interface Seed {
  name: string;
  age: number;
  city: string;
  tagline: string;
  tags: string[];
  premium: boolean;
  rarity: Model['rarity'];
}

const SEEDS: Seed[] = [
  { name: 'Valentina', age: 24, city: 'Madrid', tagline: 'Noches de seda y vino tinto', tags: ['Sensual', 'VIP'], premium: true, rarity: 'legendary' },
  { name: 'Camila', age: 26, city: 'Barcelona', tagline: 'Elegancia que no pide permiso', tags: ['Editorial', 'Lujo'], premium: true, rarity: 'rare' },
  { name: 'Lucía', age: 22, city: 'Valencia', tagline: 'Luz dorada, mirada de fuego', tags: ['Fresca', 'Verano'], premium: false, rarity: 'common' },
  { name: 'Sofía', age: 28, city: 'Sevilla', tagline: 'Flamenco en la piel', tags: ['Intensa'], premium: false, rarity: 'rare' },
  { name: 'Martina', age: 25, city: 'Bilbao', tagline: 'Frío afuera, brasa adentro', tags: ['Misterio', 'VIP'], premium: true, rarity: 'legendary' },
  { name: 'Daniela', age: 23, city: 'Málaga', tagline: 'Sal, sol y curvas', tags: ['Playa'], premium: false, rarity: 'common' },
  { name: 'Isabella', age: 27, city: 'Madrid', tagline: 'Champagne y medianoche', tags: ['Glamour', 'Lujo'], premium: true, rarity: 'rare' },
  { name: 'Emma', age: 21, city: 'Zaragoza', tagline: 'Dulce con filo', tags: ['Joven', 'Fresca'], premium: false, rarity: 'common' },
  { name: 'Carla', age: 29, city: 'Barcelona', tagline: 'Arquitectura del deseo', tags: ['Sofisticada'], premium: false, rarity: 'rare' },
  { name: 'Paula', age: 24, city: 'Granada', tagline: 'Alhambra de noche', tags: ['Romántica'], premium: false, rarity: 'common' },
  { name: 'Noa', age: 26, city: 'San Sebastián', tagline: 'Ola alta, pulso bajo', tags: ['Surf', 'VIP'], premium: true, rarity: 'legendary' },
  { name: 'Alba', age: 23, city: 'Madrid', tagline: 'Amanece y no se va', tags: ['Natural'], premium: false, rarity: 'common' },
];

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const MOCK_MODELS: Model[] = SEEDS.map((s, i) => {
  const slug = slugify(s.name);
  const cover = { ...portrait(`${slug}-cover`), alt: `Retrato de ${s.name}` };
  return {
    id: String(i + 1),
    slug,
    name: s.name,
    age: s.age,
    city: s.city,
    tagline: s.tagline,
    bio: `${s.name}, ${s.age}, ${s.city}. ${s.tagline}. Una presencia que combina cercanía y misterio, pensada para una experiencia premium e inolvidable.`,
    tags: s.tags,
    premium: s.premium,
    rarity: s.rarity,
    cover,
    feed: [
      { ...video(i, `${slug}-v`), alt: `Vídeo de ${s.name}` },
      { ...vertical(`${slug}-f1`), alt: `${s.name} en escena` },
    ],
    gallery: [
      { ...portrait(`${slug}-g1`, 900, 1200), alt: `${s.name} galería 1` },
      { ...portrait(`${slug}-g2`, 900, 1200), alt: `${s.name} galería 2` },
      { ...portrait(`${slug}-g3`, 900, 1200), alt: `${s.name} galería 3` },
    ],
  };
});
