// The pack catalog: the menu-ordered registry of content packs. Pre-writing
// ships first, numbers second; future packs append here.
import { NUMBERS_PACK } from './numbers';
import type { PackEntry } from './pack';
import { PRE_PACK } from './pre';

const PACKS: readonly PackEntry[] = [PRE_PACK, NUMBERS_PACK];

/** All packs in menu order. */
export function allPacks(): readonly PackEntry[] {
  return PACKS;
}

export function packById(id: string): PackEntry | undefined {
  return PACKS.find((pack) => pack.id === id);
}
