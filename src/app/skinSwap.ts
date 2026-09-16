// Skin-driven presentation: backdrop + character resolve from the active
// skin; goal art + stickers stay content-owned. Mid-trace swaps apply at
// once, but a visible swap waits out a running completion sequence so the
// celebration (glow -> hop -> celebrate -> sticker) is never disturbed.
import type { LevelDef } from '../packs/level';
import type { SkinDef } from '../skins/skins';

export interface SkinSwapState {
  readonly completionStarted: boolean;
  readonly success: boolean;
}

export interface LevelPresentation {
  readonly backdrop: string;
  readonly character: string;
  readonly goal: string;
  readonly sticker: string;
}

/** Defer the visible swap only while the completion sequence is mid-flight. */
export function shouldDeferSkinSwap(state: SkinSwapState | null): boolean {
  if (!state) {
    return false;
  }
  return state.completionStarted && !state.success;
}

/** Backdrop + character are skin-owned; goal + sticker stay content-owned. */
export function levelPresentation(skin: SkinDef, level: LevelDef): LevelPresentation {
  return {
    backdrop: skin.backdrop,
    character: skin.character,
    goal: level.goalArt,
    sticker: `/art/sticker/${level.id}.webp`,
  };
}
