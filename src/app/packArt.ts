// Pack art URLs: numerals use the short card-num / num-badge names that match
// their num-* level ids; every other pack follows card-<packId>.webp /
// <packId>-badge.webp.
import { NUMBERS_PACK } from '../packs/numbers';

/** Menu card art for a pack (numbers uses the short card-num.webp). */
export function menuCardArtUrl(packId: string): string {
  return packId === NUMBERS_PACK.id ? '/art/pack/card-num.webp' : `/art/pack/card-${packId}.webp`;
}

/** Pack badge art for a pack (numbers uses the short num-badge.webp). */
export function packBadgeArtUrl(packId: string): string {
  return packId === NUMBERS_PACK.id ? '/art/pack/num-badge.webp' : `/art/pack/${packId}-badge.webp`;
}
