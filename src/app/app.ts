// Production app state machine (pure): splash -> menu -> pack -> level ->
// success, with badge celebration, circle unlocks, and the parent zone. The
// shell renders the current screen and feeds tap/runtime events back in;
// every transition and save update here is unit-tested.
import { appPacks } from '../packs/catalog';
import type { PackEntry } from '../packs/pack';
import {
  bonusUnlocked,
  firstUnlockedBonusId,
  nextPackLevelId,
  shouldAwardPackBadge,
} from '../packs/progress';
import {
  awardBadge,
  completeLevel,
  createDefaultSave,
  hasSticker,
  markStickerIntroSeen,
  type SaveData,
  sanitizeName,
  setName,
  updateSettings,
} from '../save/store';
import { nextSkinId } from '../skins/skins';
import { changeVolume } from '../ui/parent';
import type { ParentZoneAction } from '../ui/parentZone';
import type { SuccessAction } from '../ui/success';

export type AppScreen =
  | { readonly name: 'splash' }
  | { readonly name: 'menu' }
  | { readonly name: 'pack'; readonly packId: string }
  | { readonly name: 'level'; readonly packId: string; readonly levelId: string }
  | { readonly name: 'success'; readonly packId: string; readonly levelId: string }
  | { readonly name: 'badge'; readonly packId: string }
  | {
      readonly name: 'parent';
      readonly confirmReset: boolean;
      readonly showInstall: boolean;
      readonly showName: boolean;
    }
  | { readonly name: 'sticker-board'; readonly packId: string };

export interface AppState {
  /** Badge earned but not yet celebrated (success "next" routes to it). */
  readonly pendingBadge: string | null;
  readonly save: SaveData;
  readonly screen: AppScreen;
  /** Earned sticker tapped on the board; the shell plays the pop + note.
   *  `nonce` bumps on every tap so a re-tap restarts the moment. */
  readonly stickerMoment: { readonly levelId: string; readonly nonce: number } | null;
}

export type AppEvent =
  | { readonly type: 'splash-tap' }
  | { readonly type: 'open-pack'; readonly packId: string }
  | { readonly type: 'pack-back' }
  | { readonly type: 'open-level'; readonly packId: string; readonly levelId: string }
  | { readonly type: 'level-complete'; readonly packId: string; readonly levelId: string }
  | {
      readonly type: 'success-action';
      readonly action: SuccessAction;
      readonly packId: string;
      readonly levelId: string;
    }
  | { readonly type: 'badge-tap'; readonly packId: string }
  | { readonly type: 'badge-exit' }
  | { readonly type: 'skin-cycle' }
  | { readonly type: 'parent-open' }
  | { readonly type: 'parent-action'; readonly action: ParentZoneAction }
  | { readonly type: 'name-set'; readonly name: string }
  | { readonly type: 'name-clear' }
  | { readonly type: 'name-close' }
  | { readonly type: 'sticker-open'; readonly packId: string }
  | { readonly type: 'sticker-close' }
  | { readonly type: 'sticker-tap'; readonly levelId: string };

export function startApp(save: SaveData): AppState {
  return { pendingBadge: null, save, screen: { name: 'splash' }, stickerMoment: null };
}

/** Static packs, plus the runtime-composed name pack while a name is saved. */
function packFor(state: AppState, packId: string): PackEntry | undefined {
  return appPacks(state.save).find((pack) => pack.id === packId);
}

/** Main levels are always open; circles unlock at their pack thresholds. */
function openLevel(state: AppState, packId: string, levelId: string): AppState {
  const pack = packFor(state, packId);
  if (!pack) {
    return state;
  }
  const bonusIndex = pack.bonuses.findIndex((level) => level.id === levelId);
  if (bonusIndex >= 0) {
    return bonusUnlocked(state.save, pack, bonusIndex)
      ? { ...state, screen: { name: 'level', packId, levelId } }
      : state;
  }
  if (!pack.levels.some((level) => level.id === levelId)) {
    return state;
  }
  return { ...state, screen: { name: 'level', packId, levelId } };
}

function completeLevelRun(state: AppState, packId: string, levelId: string): AppState {
  const pack = packFor(state, packId);
  if (!pack) {
    return state;
  }
  const completed = completeLevel(state.save, levelId);
  if (!shouldAwardPackBadge(completed, pack)) {
    return { ...state, save: completed, screen: { name: 'success', packId, levelId } };
  }
  return {
    ...state,
    pendingBadge: pack.badgeId,
    save: awardBadge(completed, pack.badgeId),
    screen: { name: 'success', packId, levelId },
  };
}

function successAction(
  state: AppState,
  action: SuccessAction,
  packId: string,
  levelId: string,
): AppState {
  const pack = packFor(state, packId);
  if (!pack) {
    return { ...state, screen: { name: 'menu' } };
  }
  if (action === 'home') {
    return { ...state, screen: { name: 'pack', packId } };
  }
  if (action === 'replay') {
    return { ...state, screen: { name: 'level', packId, levelId } };
  }
  if (state.pendingBadge === pack.badgeId) {
    return { ...state, pendingBadge: null, screen: { name: 'badge', packId } };
  }
  return {
    ...state,
    screen: { name: 'level', packId, levelId: nextPackLevelId(state.save, pack, levelId) },
  };
}

/** Badge seal: circles open the first unlocked bonus; other packs go back. */
function badgeTap(state: AppState, packId: string): AppState {
  const pack = packFor(state, packId);
  if (!pack) {
    return state;
  }
  const bonusId = firstUnlockedBonusId(state.save, pack);
  if (!bonusId) {
    return { ...state, screen: { name: 'pack', packId } };
  }
  return { ...state, screen: { name: 'level', packId, levelId: bonusId } };
}

/** Every level id in the pack: main levels first, then bonus circles. */
export function packLevelIds(pack: PackEntry): readonly string[] {
  return [...pack.levels, ...pack.bonuses].map((level) => level.id);
}

/** True when the pack already holds at least one earned sticker. */
function packHasStickers(save: SaveData, pack: PackEntry): boolean {
  return packLevelIds(pack).some((levelId) => hasSticker(save, levelId));
}

/** Shelf pulse (child-side discovery cue): the intro is unseen and this pack
 *  already has a sticker to show. */
export function shouldPulseStickerShelf(save: SaveData, packId: string): boolean {
  const pack = appPacks(save).find((entry) => entry.id === packId);
  if (!pack || save.stickerIntroSeen === true) {
    return false;
  }
  return packHasStickers(save, pack);
}

/** Shelf tap: opens the pack's board when it has something to show; the first
 *  successful open records the one-time intro flag. */
function openStickerBoard(state: AppState, packId: string): AppState {
  const pack = packFor(state, packId);
  if (!pack || !packHasStickers(state.save, pack)) {
    return state;
  }
  return {
    ...state,
    save: markStickerIntroSeen(state.save),
    screen: { name: 'sticker-board', packId },
  };
}

/** Earned sticker tap on the open board: starts (or restarts) the pop moment. */
function stickerTap(state: AppState, levelId: string): AppState {
  if (state.screen.name !== 'sticker-board') {
    return state;
  }
  const pack = packFor(state, state.screen.packId);
  if (!pack || !packLevelIds(pack).includes(levelId) || !hasSticker(state.save, levelId)) {
    return state;
  }
  const nonce = (state.stickerMoment?.nonce ?? 0) + 1;
  return { ...state, stickerMoment: { levelId, nonce } };
}

/**
 * Reset wipes progress but preserves the child's name, the parent hint flag,
 * and the sticker intro flag — the state that outlives progress.
 */
function resetSave(save: SaveData): SaveData {
  const fresh = setName(createDefaultSave(), save.name ?? '');
  const withHint = updateSettings(fresh, { parentHintSeen: save.settings.parentHintSeen });
  return save.stickerIntroSeen === true ? markStickerIntroSeen(withHint) : withHint;
}

function parentAction(state: AppState, action: ParentZoneAction): AppState {
  if (state.screen.name !== 'parent') {
    return state;
  }
  const parent = state.screen;
  switch (action) {
    case 'volume-down':
      return {
        ...state,
        save: updateSettings(state.save, {
          muted: false,
          volume: changeVolume(state.save.settings.volume, -0.1),
        }),
      };
    case 'volume-up':
      return {
        ...state,
        save: updateSettings(state.save, {
          muted: false,
          volume: changeVolume(state.save.settings.volume, 0.1),
        }),
      };
    case 'mute':
      return {
        ...state,
        save: updateSettings(state.save, { muted: !state.save.settings.muted }),
      };
    case 'easier':
      return {
        ...state,
        save: updateSettings(state.save, { easierTracing: !state.save.settings.easierTracing }),
      };
    case 'skin':
      return {
        ...state,
        save: updateSettings(state.save, { skin: nextSkinId(state.save.settings.skin) }),
      };
    case 'name':
      return { ...state, screen: { ...parent, showName: true } };
    case 'reset':
      if (!parent.confirmReset) {
        return { ...state, screen: { ...parent, confirmReset: true } };
      }
      return {
        ...state,
        pendingBadge: null,
        save: resetSave(state.save),
        screen: { ...parent, confirmReset: false },
      };
    case 'install':
      return { ...state, screen: { ...parent, showInstall: !parent.showInstall } };
    case 'done':
      return { ...state, screen: { name: 'menu' } };
  }
}

export function applyAppEvent(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'splash-tap':
      return state.screen.name === 'splash' ? { ...state, screen: { name: 'menu' } } : state;
    case 'open-pack':
      return packFor(state, event.packId)
        ? { ...state, screen: { name: 'pack', packId: event.packId } }
        : state;
    case 'pack-back':
      return { ...state, screen: { name: 'menu' } };
    case 'open-level':
      return openLevel(state, event.packId, event.levelId);
    case 'level-complete':
      return completeLevelRun(state, event.packId, event.levelId);
    case 'success-action':
      return successAction(state, event.action, event.packId, event.levelId);
    case 'badge-tap':
      return badgeTap(state, event.packId);
    case 'badge-exit':
      return { ...state, screen: { name: 'menu' } };
    case 'skin-cycle':
      return {
        ...state,
        save: updateSettings(state.save, { skin: nextSkinId(state.save.settings.skin) }),
      };
    case 'parent-open':
      return {
        ...state,
        save: updateSettings(state.save, { parentHintSeen: true }),
        screen: { name: 'parent', confirmReset: false, showInstall: false, showName: false },
      };
    case 'parent-action':
      return parentAction(state, event.action);
    case 'name-set': {
      if (state.screen.name !== 'parent' || !state.screen.showName) {
        return state;
      }
      const name = sanitizeName(event.name);
      if (name === '') {
        return state;
      }
      return {
        ...state,
        save: setName(state.save, name),
        screen: { ...state.screen, showName: false },
      };
    }
    case 'name-clear': {
      if (state.screen.name !== 'parent' || !state.screen.showName) {
        return state;
      }
      return { ...state, save: setName(state.save, '') };
    }
    case 'name-close': {
      if (state.screen.name !== 'parent' || !state.screen.showName) {
        return state;
      }
      return { ...state, screen: { ...state.screen, showName: false } };
    }
    case 'sticker-open':
      return openStickerBoard(state, event.packId);
    case 'sticker-close': {
      if (state.screen.name !== 'sticker-board') {
        return state;
      }
      return {
        ...state,
        screen: { name: 'pack', packId: state.screen.packId },
        stickerMoment: null,
      };
    }
    case 'sticker-tap':
      return stickerTap(state, event.levelId);
  }
}

/** One-time menu hint: shown until the gate has been opened successfully once. */
export function shouldShowParentHint(save: SaveData): boolean {
  return !save.settings.parentHintSeen;
}
