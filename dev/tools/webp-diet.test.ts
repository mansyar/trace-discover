// Red-phase contract for the foreground WebP diet. The optimizer may change
// bytes, but it must preserve asset paths and the project's quality policy.
import { describe, expect, it } from 'vitest';
import {
  candidateOutputPath,
  qualityForArtPath,
  summarizeSavings,
  type DietRow,
} from './webp-diet.mjs';

describe('webp diet', () => {
  it('uses the approved quality floor for each art class', () => {
    expect(qualityForArtPath('goal/pre-1.webp')).toBe(0.75);
    expect(qualityForArtPath('sticker/num-0.webp')).toBe(0.75);
    expect(qualityForArtPath('pack/card-patterns.webp')).toBe(0.75);
    expect(qualityForArtPath('bg/dino.webp')).toBe(0.8);
    expect(qualityForArtPath('face/dino.webp')).toBe(0.85);
    expect(qualityForArtPath('rive/dino.riv')).toBeUndefined();
  });

  it('keeps candidate paths identical to shipped asset paths', () => {
    expect(candidateOutputPath('goal/pre-1.webp')).toBe('goal/pre-1.webp');
    expect(candidateOutputPath('sticker/name-1.webp')).toBe('sticker/name-1.webp');
    expect(candidateOutputPath('pack/abc-badge.webp')).toBe('pack/abc-badge.webp');
  });

  it('summarizes deterministic byte savings', () => {
    const rows: DietRow[] = [
      { afterBytes: 80, beforeBytes: 100, path: 'goal/a.webp' },
      { afterBytes: 45, beforeBytes: 60, path: 'sticker/b.webp' },
    ];

    expect(summarizeSavings(rows)).toEqual({
      afterBytes: 125,
      beforeBytes: 160,
      fileCount: 2,
      savedBytes: 35,
    });
  });
});
