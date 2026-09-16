import { describe, expect, it } from 'vitest';

import type { LevelDef } from '../packs/level';
import { SKINS } from '../skins/skins';
import { levelPresentation, shouldDeferSkinSwap } from './skinSwap';

const level: LevelDef = {
  goal: { x: 370, y: 430 },
  goalArt: '/art/goal/pre-1.png',
  id: 'pre-1',
  stroke: 'line',
  strokes: [
    [
      { x: 60, y: 430 },
      { x: 370, y: 430 },
    ],
  ],
};

function skin(id: string) {
  const found = SKINS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`missing skin ${id}`);
  }
  return found;
}

describe('shouldDeferSkinSwap', () => {
  it('applies immediately when no session is running', () => {
    expect(shouldDeferSkinSwap(null)).toBe(false);
  });

  it('applies mid-trace while the child is still tracing', () => {
    expect(shouldDeferSkinSwap({ completionStarted: false, success: false })).toBe(false);
  });

  it('defers while the completion sequence plays', () => {
    expect(shouldDeferSkinSwap({ completionStarted: true, success: false })).toBe(true);
  });

  it('applies again once the sequence has ended', () => {
    expect(shouldDeferSkinSwap({ completionStarted: true, success: true })).toBe(false);
    expect(shouldDeferSkinSwap({ completionStarted: false, success: true })).toBe(false);
  });
});

describe('levelPresentation', () => {
  it('takes backdrop and character from the skin', () => {
    const dino = levelPresentation(skin('dino'), level);
    const animal = levelPresentation(skin('animal'), level);
    expect(dino.backdrop).toBe('/art/bg/dino.jpg');
    expect(dino.character).toBe('dino');
    expect(animal.backdrop).toBe('/art/bg/animals.jpg');
    expect(animal.character).toBe('lion');
  });

  it('keeps goal art and sticker content-owned across skins', () => {
    const dino = levelPresentation(skin('dino'), level);
    const star = levelPresentation(skin('star'), level);
    expect(dino.goal).toBe('/art/goal/pre-1.png');
    expect(dino.sticker).toBe('/art/sticker/pre-1.png');
    expect(star.goal).toBe(dino.goal);
    expect(star.sticker).toBe(dino.sticker);
  });
});
