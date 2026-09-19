/**
 * Standard Social Media Size Presets for YogFrame Campaigns
 */

export const PRESET_CATEGORIES = ['Instagram', 'Facebook', 'WhatsApp', 'Custom'];

export const SIZE_PRESETS = [
  // --- INSTAGRAM ---
  {
    category: 'Instagram',
    id: 'ig-portrait',
    name: 'Instagram Portrait',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    aspectDecimal: 1080 / 1350,
    badge: '4:5',
    description: 'Feed portrait post (Standard recommended)',
  },
  {
    category: 'Instagram',
    id: 'ig-square',
    name: 'Instagram Post — Square',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    aspectDecimal: 1,
    badge: '1:1',
    description: 'Square feed post',
  },
  {
    category: 'Instagram',
    id: 'ig-story',
    name: 'Instagram Story / Reel',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    aspectDecimal: 1080 / 1920,
    badge: '9:16',
    description: 'Full-screen mobile story & reels',
  },
  {
    category: 'Instagram',
    id: 'ig-landscape',
    name: 'Instagram Landscape',
    width: 1080,
    height: 566,
    aspectRatio: '1.91:1',
    aspectDecimal: 1080 / 566,
    badge: '1.91:1',
    description: 'Horizontal feed post',
  },

  // --- FACEBOOK ---
  {
    category: 'Facebook',
    id: 'fb-landscape',
    name: 'Facebook Post — Landscape',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    aspectDecimal: 1200 / 630,
    badge: '1.91:1',
    description: 'Standard link & post feed share',
  },
  {
    category: 'Facebook',
    id: 'fb-square',
    name: 'Facebook Post — Square',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    aspectDecimal: 1,
    badge: '1:1',
    description: 'Square feed post',
  },
  {
    category: 'Facebook',
    id: 'fb-portrait',
    name: 'Facebook Portrait',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    aspectDecimal: 1080 / 1350,
    badge: '4:5',
    description: 'Vertical feed post',
  },
  {
    category: 'Facebook',
    id: 'fb-story',
    name: 'Facebook Story',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    aspectDecimal: 1080 / 1920,
    badge: '9:16',
    description: 'Full-screen vertical story',
  },

  // --- WHATSAPP ---
  {
    category: 'WhatsApp',
    id: 'wa-status',
    name: 'WhatsApp Status',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    aspectDecimal: 1080 / 1920,
    badge: '9:16',
    description: 'Full-screen WhatsApp status update',
  },
  {
    category: 'WhatsApp',
    id: 'wa-square',
    name: 'WhatsApp Square',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    aspectDecimal: 1,
    badge: '1:1',
    description: 'Square profile & chat share',
  },

  // --- CUSTOM ---
  {
    category: 'Custom',
    id: 'custom',
    name: 'Custom Dimensions',
    width: 1080,
    height: 1350,
    aspectRatio: 'Custom',
    aspectDecimal: 1080 / 1350,
    badge: 'Custom',
    description: 'Enter your custom pixel dimensions',
  },
];

export const DEFAULT_PRESET = SIZE_PRESETS[0]; // Instagram Portrait 1080x1350

/**
 * Finds a matching preset given width and height, or returns the Custom preset
 */
export function findMatchingPreset(width, height) {
  const w = Number(width) || 1080;
  const h = Number(height) || 1350;

  const match = SIZE_PRESETS.find(
    (p) => p.category !== 'Custom' && p.width === w && p.height === h
  );

  if (match) return match;

  return {
    ...SIZE_PRESETS.find((p) => p.id === 'custom'),
    width: w,
    height: h,
    aspectRatio: `${w}:${h}`,
    aspectDecimal: w / h,
  };
}
