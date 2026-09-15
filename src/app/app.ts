// Production app state machine (pure): splash -> menu -> pack -> level ->
// success, with badge celebration, circle unlocks, and the parent zone. The
// shell renders the current screen and feeds tap/runtime events back in;
// every transition and save update here is unit-tested.
import { packById } from '../packs/catalog';
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
  type SaveData,
  updateSettings,
} from '../save/store';
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
  | { readonly name: 'parent'; readonly confirmReset: boolean; readonly showInstall: boolean };

export interface AppState {
  /** Badge earned but not yet celebrated (success "next" routes to it). */
  readonly pendingBadge: string | null;
  readonly save: SaveData;
  readonly screen: AppScreen;
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
  | { readonly type: 'parent-open' }
  | { readonly type: 'parent-action'; readonly action: ParentZoneAction };

export function startApp(save: SaveData): AppState {
  return { pendingBadge: null, save, screen: { name: 'splash' } };
}

/** Main levels are always open; circles unlock at their pack thresholds. */
function openLevel(state: AppState, packId: string, levelId: string): AppState {
  const pack = packById(packId);
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
  const pack = packById(packId);
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
  const pack = packById(packId);
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
  const pack = packById(packId);
  if (!pack) {
    return state;
  }
  const bonusId = firstUnlockedBonusId(state.save, pack);
  if (!bonusId) {
    return { ...state, screen: { name: 'pack', packId } };
  }
  return { ...state, screen: { name: 'level', packId, levelId: bonusId } };
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
          volume: changeVolume(state.save.settings.volume, -0.1),
        }),
      };
    case 'volume-up':
      return {
        ...state,
        save: updateSettings(state.save, {
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
    case 'reset':
      if (!parent.confirmReset) {
        return { ...state, screen: { ...parent, confirmReset: true } };
      }
      return {
        ...state,
        pendingBadge: null,
        save: createDefaultSave(),
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
      return packById(event.packId)
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
    case 'parent-open':
      return { ...state, screen: { name: 'parent', confirmReset: false, showInstall: false } };
    case 'parent-action':
      return parentAction(state, event.action);
  }
}
