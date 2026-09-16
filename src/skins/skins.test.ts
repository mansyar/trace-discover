import { describe, expect, it } from 'vitest';

import { nextSkinId, SKINS, skinById } from './skins';

describe('skins registry', () => {
  it('defines the five skins in cycle order', () => {
    expect(SKINS.map((skin) => skin.id)).toEqual([
      'dino',
      'star',
      'construction',
      'animal',
      'teddy',
    ]);
  });

  it('gives every skin the full presentation contract', () => {
    for (const skin of SKINS) {
      expect(skin.id).not.toBe('');
      expect(skin.character).not.toBe('');
      expect(skin.backdrop).toMatch(/^\/art\/bg\/.+\.webp$/);
      expect(skin.accent).toMatch(/^#[0-9a-f]{6}$/);
      expect(skin.face).toMatch(/^\/art\/face\/.+\.webp$/);
      expect(['marimba', 'bell', 'woodblock', 'kalimba', 'musicbox']).toContain(skin.instrument);
    }
  });

  it('keeps skin ids unique', () => {
    const ids = SKINS.map((skin) => skin.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps each skin to its character asset', () => {
    expect(skinById('dino')?.character).toBe('dino');
    expect(skinById('star')?.character).toBe('star');
    expect(skinById('construction')?.character).toBe('excavator');
    expect(skinById('animal')?.character).toBe('lion');
    expect(skinById('teddy')?.character).toBe('teddy');
  });

  it('maps each skin to its instrument', () => {
    expect(skinById('dino')?.instrument).toBe('marimba');
    expect(skinById('star')?.instrument).toBe('bell');
    expect(skinById('construction')?.instrument).toBe('woodblock');
    expect(skinById('animal')?.instrument).toBe('kalimba');
    expect(skinById('teddy')?.instrument).toBe('musicbox');
  });

  it('points every skin at its backdrop (star included; art lands later)', () => {
    expect(skinById('star')?.backdrop).toBe('/art/bg/star.webp');
    expect(skinById('animal')?.backdrop).toBe('/art/bg/animals.webp');
    expect(skinById('teddy')?.backdrop).toBe('/art/bg/teddy.webp');
  });

  it('registers teddy with its cozy-bedroom presentation', () => {
    const teddy = skinById('teddy');
    expect(teddy?.character).toBe('teddy');
    expect(teddy?.backdrop).toBe('/art/bg/teddy.webp');
    expect(teddy?.face).toBe('/art/face/teddy.webp');
    expect(teddy?.accent).toBe('#e07a5f');
  });

  it('looks a skin up by id', () => {
    expect(skinById('star')?.accent).toBe('#f3c969');
    expect(skinById('nope')).toBeUndefined();
  });
});

describe('nextSkinId', () => {
  it('cycles dino -> star -> construction -> animal -> teddy -> dino', () => {
    expect(nextSkinId('dino')).toBe('star');
    expect(nextSkinId('star')).toBe('construction');
    expect(nextSkinId('construction')).toBe('animal');
    expect(nextSkinId('animal')).toBe('teddy');
    expect(nextSkinId('teddy')).toBe('dino');
  });

  it('falls back to the first skin for an unknown id', () => {
    expect(nextSkinId('unicorn')).toBe('dino');
  });
});
