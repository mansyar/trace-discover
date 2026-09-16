// Pack art URLs: numerals use the short card-num / num-badge names that match
// their num-* level ids; every other pack follows card-<packId>.png /
// <packId>-badge.png.
import { NUMBERS_PACK } from '../packs/numbers';

/** Menu card art for a pack (numbers uses the short card-num.png). */
export function menuCardArtUrl(packId: string): string {
  return packId === NUMBERS_PACK.id ? '/art/pack/card-num.png' : `/art/pack/card-${packId}.png`;
}

/** Pack badge art for a pack (numbers uses the short num-badge.png). */
export function packBadgeArtUrl(packId: string): string {
  return packId === NUMBERS_PACK.id ? '/art/pack/num-badge.png' : `/art/pack/${packId}-badge.png`;
}
