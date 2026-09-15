import { describe, expect, it } from 'vitest';

import { SKINS, skinById } from './skins';

describe('skins registry', () => {
  it('defines the four skins in cycle order', () => {
    expect(SKINS.map((skin) => skin.id)).toEqual(['dino', 'star', 'construction', 'animal']);
  });

  it('gives every skin the full presentation contract', () => {
    for (const skin of SKINS) {
      expect(skin.id).not.toBe('');
      expect(skin.character).not.toBe('');
      expect(skin.backdrop).toMatch(/^\/art\/bg\/.+\.(jpg|png)$/);
      expect(skin.accent).toMatch(/^#[0-9a-f]{6}$/);
      expect(skin.face).toMatch(/^\/art\/face\/.+\.png$/);
      expect(['marimba', 'bell', 'woodblock', 'kalimba']).toContain(skin.instrument);
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
  });

  it('maps each skin to its instrument', () => {
    expect(skinById('dino')?.instrument).toBe('marimba');
    expect(skinById('star')?.instrument).toBe('bell');
    expect(skinById('construction')?.instrument).toBe('woodblock');
    expect(skinById('animal')?.instrument).toBe('kalimba');
  });

  it('points every skin at its backdrop (star included; art lands later)', () => {
    expect(skinById('star')?.backdrop).toBe('/art/bg/star.jpg');
    expect(skinById('animal')?.backdrop).toBe('/art/bg/animals.jpg');
  });

  it('looks a skin up by id', () => {
    expect(skinById('star')?.accent).toBe('#f3c969');
    expect(skinById('nope')).toBeUndefined();
  });
});
