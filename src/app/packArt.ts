// Pack art URLs: numerals keep their v1 filenames as the one legacy
// exception; every other pack follows card-<packId>.png / <packId>-badge.png.
import { NUMBERS_PACK } from '../packs/numbers';

/** Menu card art for a pack (numbers keeps the v1 card.png). */
export function menuCardArtUrl(packId: string): string {
  return packId === NUMBERS_PACK.id ? '/art/pack/card.png' : `/art/pack/card-${packId}.png`;
}

/** Pack badge art for a pack (numbers keeps the v1 badge.png). */
export function packBadgeArtUrl(packId: string): string {
  return packId === NUMBERS_PACK.id ? '/art/pack/badge.png' : `/art/pack/${packId}-badge.png`;
}
