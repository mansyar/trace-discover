import { describe, expect, it } from 'vitest';
import { menuCardArtUrl, packBadgeArtUrl } from './packArt';

describe('pack art urls', () => {
  it('derives card art from the pack id, letters included', () => {
    expect(menuCardArtUrl('abc')).toBe('/art/pack/card-abc.png');
    expect(menuCardArtUrl('pre')).toBe('/art/pack/card-pre.png');
  });

  it('derives badge art from the pack id, letters included', () => {
    expect(packBadgeArtUrl('abc')).toBe('/art/pack/abc-badge.png');
    expect(packBadgeArtUrl('pre')).toBe('/art/pack/pre-badge.png');
  });

  it('uses the short numerals filenames matching num-* level ids', () => {
    expect(menuCardArtUrl('numbers')).toBe('/art/pack/card-num.png');
    expect(packBadgeArtUrl('numbers')).toBe('/art/pack/num-badge.png');
  });
});
