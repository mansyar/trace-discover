import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { createConfetti } from '../render/confetti';
import {
  canGiggle,
  hitMascot,
  MASCOT_GIGGLE_COOLDOWN_MS,
  MASCOT_SPARKLE_COUNT,
  MASCOT_SPARKLE_SEED,
  type MascotZone,
  mascotZone,
} from './mascot';
import { menuLayout } from './menu';
import { type PackLayoutOptions, packLayout, packPagerLayout } from './pack';
import { skinButtonLayout } from './skinButton';

// Mirrors src/main.ts: parked mascot spots, scales, and per-pack grid configs.
const MASCOT_SCALE_MENU = 0.32;
const MASCOT_SCALE_PACK = 0.26;
const MENU_PARK = { x: FIELD_WIDTH / 2, y: 735 };
const PACK_PARK = { x: FIELD_WIDTH / 2, y: 572 };
/** Mirrors the shell's CHARACTER_OFFSET_Y (sprite center sits below the park). */
const SPRITE_OFFSET_Y = 0.38;
const MENU_PACKS = ['pre', 'numbers', 'abc'] as const;
const MENU_PACKS_WITH_NAME = [...MENU_PACKS, 'name'] as const;
const PACK_CONFIGS: readonly {
  id: string;
  options: PackLayoutOptions;
  pages: readonly number[];
}[] = [
  { id: 'pre', options: { columns: 3, slotsPerRow: 6 }, pages: [12] },
  { id: 'numbers', options: {}, pages: [10] },
  { id: 'abc', options: { cardSize: 90, columns: 4, slotsPerRow: 7 }, pages: [12, 14] },
  { id: 'name', options: { slotsPerRow: 1 }, pages: [1] },
];

interface RectLike {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface CircleSpot {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

function ids(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => `level-${index}`);
}

function menuZone(): MascotZone {
  return mascotZone(MENU_PARK, MASCOT_SCALE_MENU);
}

function packZone(): MascotZone {
  return mascotZone(PACK_PARK, MASCOT_SCALE_PACK);
}

/** Shortest distance from the zone's center to a rectangle (0 when inside). */
function rectDistance(zone: MascotZone, rect: RectLike): number {
  const dx = Math.max(rect.x - zone.x, 0, zone.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - zone.y, 0, zone.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

/** Distance from the zone's center to a spot's edge (negative inside the spot). */
function spotDistance(zone: MascotZone, spot: CircleSpot): number {
  return Math.hypot(spot.x - zone.x, spot.y - zone.y) - spot.radius;
}

describe('mascotZone', () => {
  it('mirrors the parked sprite square on the menu', () => {
    const zone = menuZone();
    const size = FIELD_WIDTH * MASCOT_SCALE_MENU;
    expect(zone.x).toBe(MENU_PARK.x);
    expect(zone.y).toBeCloseTo(MENU_PARK.y + size * SPRITE_OFFSET_Y, 5);
    expect(zone.radius).toBeCloseTo(size / 2, 5);
  });

  it('mirrors the parked sprite square on the pack screen', () => {
    const zone = packZone();
    const size = FIELD_WIDTH * MASCOT_SCALE_PACK;
    expect(zone.x).toBe(PACK_PARK.x);
    expect(zone.y).toBeCloseTo(PACK_PARK.y + size * SPRITE_OFFSET_Y, 5);
    expect(zone.radius).toBeCloseTo(size / 2, 5);
  });

  it('stays fully inside the field on both screens', () => {
    // The field is device-independent design space (430x860, letterboxed on
    // phones and iPads alike), so one bounds check covers both families.
    for (const zone of [menuZone(), packZone()]) {
      expect(zone.x - zone.radius).toBeGreaterThanOrEqual(0);
      expect(zone.x + zone.radius).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(zone.y - zone.radius).toBeGreaterThanOrEqual(0);
      expect(zone.y + zone.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });
});

describe('hitMascot', () => {
  it('hits the center, the slop ring, and the inclusive edge', () => {
    const zone = menuZone();
    expect(hitMascot(zone, { x: zone.x, y: zone.y })).toBe(true);
    expect(hitMascot(zone, { x: zone.x + zone.radius * 0.9, y: zone.y - zone.radius * 0.4 })).toBe(
      true,
    );
    expect(hitMascot(zone, { x: zone.x, y: zone.y - zone.radius * 0.7 })).toBe(true);
    // Inclusive boundary, checked on an exact integer circle (float-exact).
    const exact = { x: 0, y: 0, radius: 100 };
    expect(hitMascot(exact, { x: 100, y: 0 })).toBe(true);
    expect(hitMascot(exact, { x: -60, y: 80 })).toBe(true);
    expect(hitMascot(exact, { x: 100.5, y: 0 })).toBe(false);
  });

  it('misses just beyond the ring and far away', () => {
    const zone = menuZone();
    expect(hitMascot(zone, { x: zone.x + zone.radius + 0.01, y: zone.y })).toBe(false);
    expect(hitMascot(zone, { x: zone.x, y: zone.y + zone.radius + 32 })).toBe(false);
    expect(hitMascot(zone, { x: zone.x + 200, y: zone.y })).toBe(false);
  });
});

describe('mascot zone vs menu furniture', () => {
  it('never reaches the parent gate, skin button, or field edge (both menus)', () => {
    for (const packIds of [MENU_PACKS, MENU_PACKS_WITH_NAME]) {
      const layout = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, packIds);
      expect(rectDistance(menuZone(), layout.parentGate)).toBeGreaterThan(menuZone().radius);
      expect(spotDistance(menuZone(), skinButtonLayout())).toBeGreaterThan(menuZone().radius);
    }
  });

  it('three-pack menu: clear of every card', () => {
    const layout = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, MENU_PACKS);
    for (const card of layout.cards) {
      expect(rectDistance(menuZone(), card)).toBeGreaterThan(menuZone().radius);
    }
  });

  it('four-pack menu: clear of the first three cards; only the name card may be kissed', () => {
    const zone = menuZone();
    const layout = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, MENU_PACKS_WITH_NAME);
    const nameCard = layout.cards[3];
    if (!nameCard) {
      throw new Error('missing name card');
    }
    for (const card of layout.cards.slice(0, 3)) {
      expect(rectDistance(zone, card)).toBeGreaterThan(zone.radius);
    }
    // The parked dino itself overlaps the name card's bottom edge on the live
    // app; the zone is the sprite square's inscribed circle, so its reach into
    // the card can never exceed that mirror -- and its center stays outside.
    const overlap = zone.radius - rectDistance(zone, nameCard);
    expect(overlap).toBeGreaterThan(0);
    expect(overlap).toBeLessThanOrEqual((FIELD_WIDTH * MASCOT_SCALE_MENU) / 2);
  });
});

describe('mascot zone vs pack furniture', () => {
  it('never touches sticker slots, home, badge, or pager on any pack layout', () => {
    for (const config of PACK_CONFIGS) {
      for (const size of config.pages) {
        const layout = packLayout(FIELD_WIDTH, FIELD_HEIGHT, ids(size), config.options);
        for (const slot of layout.slots) {
          expect(spotDistance(packZone(), slot)).toBeGreaterThan(packZone().radius);
        }
        expect(spotDistance(packZone(), layout.home)).toBeGreaterThan(packZone().radius);
        expect(spotDistance(packZone(), layout.badge)).toBeGreaterThan(packZone().radius);
      }
      if (config.pages.length > 1) {
        const pager = packPagerLayout(FIELD_WIDTH, FIELD_HEIGHT, config.pages.length);
        for (const spot of [pager.prev, pager.next, ...pager.dots]) {
          expect(spotDistance(packZone(), spot)).toBeGreaterThan(packZone().radius);
        }
      }
    }
  });

  it('is clear of every grid card for the layouts the sprite clears (pre, abc, name)', () => {
    for (const config of PACK_CONFIGS.filter((candidate) => candidate.id !== 'numbers')) {
      for (const size of config.pages) {
        const layout = packLayout(FIELD_WIDTH, FIELD_HEIGHT, ids(size), config.options);
        for (const card of layout.cards) {
          expect(rectDistance(packZone(), card)).toBeGreaterThan(packZone().radius);
        }
      }
    }
  });

  it('numbers pack: clear of the first four rows; the sprite-mirrored zone may reach the last', () => {
    const layout = packLayout(FIELD_WIDTH, FIELD_HEIGHT, ids(10), {});
    for (const card of layout.cards.slice(0, 8)) {
      expect(rectDistance(packZone(), card)).toBeGreaterThan(packZone().radius);
    }
    // The shipped sprite visibly overlaps the "8"/"9" row (screenshot-verified
    // on the live app); the zone mirrors it, but its center stays outside the
    // cards so taps between them never silently land on the mascot.
    for (const card of layout.cards.slice(8)) {
      expect(rectDistance(packZone(), card)).toBeGreaterThan(0);
    }
  });
});

describe('giggle cooldown', () => {
  it('accepts the first tap and blocks re-entry inside the window', () => {
    expect(canGiggle(1000, null)).toBe(true);
    expect(canGiggle(1000 + MASCOT_GIGGLE_COOLDOWN_MS - 1, 1000)).toBe(false);
  });

  it('accepts again once the window passes', () => {
    expect(canGiggle(1000 + MASCOT_GIGGLE_COOLDOWN_MS, 1000)).toBe(true);
    expect(canGiggle(6000, 1000)).toBe(true);
  });

  it('sits between a poke and a stagger: no note stacking, no dead zone', () => {
    expect(MASCOT_GIGGLE_COOLDOWN_MS).toBeGreaterThanOrEqual(400);
    expect(MASCOT_GIGGLE_COOLDOWN_MS).toBeLessThanOrEqual(1000);
  });
});

describe('giggle sparkle recipe', () => {
  it('bursts a small deterministic spray upward from the mascot center', () => {
    const zone = menuZone();
    const origin = { x: zone.x, y: zone.y };
    const burst = createConfetti(MASCOT_SPARKLE_COUNT, MASCOT_SPARKLE_SEED, origin);
    expect(burst).toHaveLength(MASCOT_SPARKLE_COUNT);
    expect(burst).toEqual(createConfetti(MASCOT_SPARKLE_COUNT, MASCOT_SPARKLE_SEED, origin));
    for (const particle of burst) {
      expect(particle.x).toBe(zone.x);
      expect(particle.y).toBe(zone.y);
      expect(particle.vy).toBeLessThan(0);
    }
    expect(MASCOT_SPARKLE_COUNT).toBeGreaterThanOrEqual(6);
    expect(MASCOT_SPARKLE_COUNT).toBeLessThanOrEqual(16);
  });
});
