import { describe, expect, it } from 'vitest';
import { menuCardArtUrl, packBadgeArtUrl } from './packArt';

describe('pack art urls', () => {
  it('derives card art from the pack id, letters included', () => {
    expect(menuCardArtUrl('abc')).toBe('/art/pack/card-abc.webp');
    expect(menuCardArtUrl('pre')).toBe('/art/pack/card-pre.webp');
  });

  it('derives badge art from the pack id, letters included', () => {
    expect(packBadgeArtUrl('abc')).toBe('/art/pack/abc-badge.webp');
    expect(packBadgeArtUrl('pre')).toBe('/art/pack/pre-badge.webp');
  });

  it('uses the short numerals filenames matching num-* level ids', () => {
    expect(menuCardArtUrl('numbers')).toBe('/art/pack/card-num.webp');
    expect(packBadgeArtUrl('numbers')).toBe('/art/pack/num-badge.webp');
  });
});
