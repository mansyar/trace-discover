// The pack catalog: the menu-ordered registry of content packs. Pre-writing
// ships first, numbers second, letters third, shapes fourth; the
// runtime-composed name mini-pack appends while a name is saved.
import type { Orientation } from '../field';
import type { SaveData } from '../save/store';
import { LETTERS_PACK } from './letters';
import { namePackFor } from './name';
import { NUMBERS_PACK } from './numbers';
import type { PackEntry } from './pack';
import { PRE_PACK } from './pre';
import { SHAPES_PACK } from './shapes';

const PACKS: readonly PackEntry[] = [PRE_PACK, NUMBERS_PACK, LETTERS_PACK, SHAPES_PACK];

/** All packs in menu order. */
export function allPacks(): readonly PackEntry[] {
  return PACKS;
}

/** Static packs plus the runtime-composed name mini-pack while a name is saved. */
export function appPacks(
  save: SaveData,
  orientation: Orientation = 'portrait',
): readonly PackEntry[] {
  const namePack = namePackFor(save.name, orientation);
  if (!namePack) {
    return PACKS;
  }
  return [...PACKS, namePack];
}

export function packById(id: string): PackEntry | undefined {
  return PACKS.find((pack) => pack.id === id);
}
