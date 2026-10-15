/**
 * Rare sighting variants. The same GIF alien, but it shows up with a different
 * glow / tint. Some only appear at certain hours, which gives people a reason
 * to look again at dawn or at 3 a.m. without changing how the game plays.
 */
export interface AlienVariant {
  id: string;
  name: string;
  /** Codex flavour text. Shown once discovered. */
  lore: string;
  /** Hint shown for undiscovered variants. */
  hint: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  /** CSS filter applied to the DOM alien (camera fallback). */
  filter?: string;
  /** Extra CSS class (animations). */
  className?: string;
  /** Multiplier colour for the WebXR billboard material (hex). */
  xrTint?: number;
  /** Accent used in UI badges. */
  accent: string;
  /** Relative weight; 0 when the time window isn't open. */
  weight: (hour: number) => number;
}

const inHours = (hour: number, from: number, to: number) =>
  from <= to ? hour >= from && hour < to : hour >= from || hour < to;

export const VARIANTS: AlienVariant[] = [
  {
    id: 'observer',
    name: 'The Observer',
    lore: 'The one who always comes back. It watches the way water watches a stone.',
    hint: 'Appears to anyone who looks.',
    rarity: 'common',
    accent: '#22d3ee',
    weight: () => 70
  },
  {
    id: 'verdant',
    name: 'Verdant Drifter',
    lore: 'Smells faintly of cut grass and ozone. It asked about your houseplants.',
    hint: 'A greener signal. Uncommon.',
    rarity: 'uncommon',
    filter: 'hue-rotate(75deg) saturate(1.25) drop-shadow(0 0 10px rgba(74, 222, 128, 0.55))',
    xrTint: 0xa7f3d0,
    accent: '#4ade80',
    weight: () => 14
  },
  {
    id: 'ember',
    name: 'Ember Walker',
    lore: 'Warm to look at, cold to stand near. Leaves no footprints, only a hum.',
    hint: 'Runs hot. Uncommon.',
    rarity: 'uncommon',
    filter: 'hue-rotate(-50deg) saturate(1.4) drop-shadow(0 0 12px rgba(251, 146, 60, 0.6))',
    xrTint: 0xfdba74,
    accent: '#fb923c',
    weight: () => 10
  },
  {
    id: 'dawn',
    name: 'Dawnwatcher',
    lore: 'Only stands where the first light falls. It thinks sunrise is a kind of applause.',
    hint: 'Seen only between 5 and 8 a.m.',
    rarity: 'rare',
    filter: 'sepia(0.35) saturate(1.3) brightness(1.08) drop-shadow(0 0 14px rgba(253, 224, 71, 0.6))',
    xrTint: 0xfde68a,
    accent: '#fde047',
    weight: h => (inHours(h, 5, 8) ? 30 : 0)
  },
  {
    id: 'lunar',
    name: 'Lunar Grey',
    lore: 'Pale as the moon it came from. It asked why you are awake.',
    hint: 'Seen only after midnight, before 4 a.m.',
    rarity: 'rare',
    filter: 'grayscale(0.85) brightness(1.15) contrast(1.05) drop-shadow(0 0 16px rgba(226, 232, 240, 0.7))',
    xrTint: 0xe2e8f0,
    accent: '#e2e8f0',
    weight: h => (inHours(h, 0, 4) ? 30 : 0)
  },
  {
    id: 'abyssal',
    name: 'Abyssal Echo',
    lore: 'It came from somewhere with no light at all and brought a little of that with it.',
    hint: 'A deep violet signal. Rare.',
    rarity: 'rare',
    filter: 'hue-rotate(200deg) saturate(1.6) brightness(0.85) drop-shadow(0 0 18px rgba(168, 85, 247, 0.75))',
    xrTint: 0xc4b5fd,
    accent: '#a855f7',
    weight: () => 4
  },
  {
    id: 'prismatic',
    name: 'Prismatic One',
    lore: 'Every colour at once, as if it could not decide what to be for you.',
    hint: '??? Almost never seen.',
    rarity: 'mythic',
    className: 'variant-prismatic',
    xrTint: 0xffffff,
    accent: '#f0abfc',
    weight: () => 1.5
  }
];

export const getVariant = (id?: string): AlienVariant =>
  VARIANTS.find(v => v.id === id) || VARIANTS[0];

/** Weighted roll for the variant that shows up now. */
export function rollVariant(date: Date = new Date(), rand: () => number = Math.random): AlienVariant {
  const hour = date.getHours();
  // Debug / test override: ?variant=lunar
  try {
    const forced = new URLSearchParams(window.location.search).get('variant');
    if (forced) return getVariant(forced);
  } catch {
    /* ignore */
  }
  const weights = VARIANTS.map(v => v.weight(hour));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < VARIANTS.length; i++) {
    r -= weights[i];
    if (r <= 0) return VARIANTS[i];
  }
  return VARIANTS[0];
}

export const RARITY_LABEL: Record<AlienVariant['rarity'], string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  mythic: 'Mythic'
};
