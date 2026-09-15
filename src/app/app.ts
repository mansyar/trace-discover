// Production app state machine (pure): splash -> menu -> theme -> level ->
// success, with badge celebration, bonus unlock, and the parent zone. The
// shell renders the current screen and feeds tap/runtime events back in;
// every transition and save update here is unit-tested.

import {
  awardBadge,
  completeLevel,
  completeNumeral,
  createDefaultSave,
  type SaveData,
  updateSettings,
} from '../save/store';
import { nextLevelId, themeEntry } from '../themes/catalog';
import { NUMBERS_PACK } from '../themes/numbers';
import { nextPackLevelId, packLevelIds } from '../themes/pack';
import { isBonusOpen, shouldAwardBadge } from '../themes/progress';
import { changeVolume } from '../ui/parent';
import type { ParentZoneAction } from '../ui/parentZone';
import type { SuccessAction } from '../ui/success';

export type AppScreen =
  | { readonly name: 'splash' }
  | { readonly name: 'menu' }
  | { readonly name: 'theme'; readonly themeId: string }
  | { readonly name: 'level'; readonly themeId: string; readonly levelId: string }
  | { readonly name: 'success'; readonly themeId: string; readonly levelId: string }
  | { readonly name: 'badge'; readonly themeId: string }
  | { readonly name: 'pack' }
  | { readonly name: 'parent'; readonly confirmReset: boolean; readonly showInstall: boolean };

export interface AppState {
  /** Badge earned but not yet celebrated (success "next" routes to it). */
  readonly pendingBadge: string | null;
  readonly save: SaveData;
  readonly screen: AppScreen;
}

export type AppEvent =
  | { readonly type: 'splash-tap' }
  | { readonly type: 'open-theme'; readonly themeId: string }
  | { readonly type: 'theme-back' }
  | { readonly type: 'open-pack' }
  | { readonly type: 'pack-back' }
  | { readonly type: 'open-level'; readonly themeId: string; readonly levelId: string }
  | { readonly type: 'level-complete'; readonly themeId: string; readonly levelId: string }
  | {
      readonly type: 'success-action';
      readonly action: SuccessAction;
      readonly themeId: string;
      readonly levelId: string;
    }
  | { readonly type: 'badge-tap'; readonly themeId: string }
  | { readonly type: 'badge-exit' }
  | { readonly type: 'parent-open' }
  | { readonly type: 'parent-action'; readonly action: ParentZoneAction };

export function startApp(save: SaveData): AppState {
  return { pendingBadge: null, save, screen: { name: 'splash' } };
}

const PACK_ID = NUMBERS_PACK.id;

function mainIds(themeId: string): readonly string[] {
  return themeEntry(themeId)?.mainLevels.map((level) => level.id) ?? [];
}

function openLevel(state: AppState, themeId: string, levelId: string): AppState {
  if (themeId === PACK_ID) {
    return packLevelIds(NUMBERS_PACK).includes(levelId)
      ? { ...state, screen: { name: 'level', themeId, levelId } }
      : state;
  }
  const entry = themeEntry(themeId);
  if (!entry) {
    return state;
  }
  const known =
    entry.mainLevels.some((level) => level.id === levelId) || entry.bonus.id === levelId;
  if (!known) {
    return state;
  }
  if (entry.bonus.id === levelId && !isBonusOpen(state.save, themeId, mainIds(themeId))) {
    return state;
  }
  return { ...state, screen: { name: 'level', themeId, levelId } };
}

function completeLevelRun(state: AppState, themeId: string, levelId: string): AppState {
  if (themeId === PACK_ID) {
    return {
      ...state,
      save: completeNumeral(state.save, levelId),
      screen: { name: 'success', themeId, levelId },
    };
  }
  const completed = completeLevel(state.save, levelId);
  if (!shouldAwardBadge(completed, themeId, mainIds(themeId))) {
    return {
      ...state,
      save: completed,
      screen: { name: 'success', themeId, levelId },
    };
  }
  return {
    ...state,
    pendingBadge: themeId,
    save: awardBadge(completed, themeId),
    screen: { name: 'success', themeId, levelId },
  };
}

function successAction(
  state: AppState,
  action: SuccessAction,
  themeId: string,
  levelId: string,
): AppState {
  if (themeId === PACK_ID) {
    if (action === 'home') {
      return { ...state, screen: { name: 'pack' } };
    }
    if (action === 'replay') {
      return { ...state, screen: { name: 'level', themeId, levelId } };
    }
    return {
      ...state,
      screen: { name: 'level', themeId, levelId: nextPackLevelId(NUMBERS_PACK, levelId) },
    };
  }
  if (action === 'home') {
    return { ...state, screen: { name: 'menu' } };
  }
  if (action === 'replay') {
    return { ...state, screen: { name: 'level', themeId, levelId } };
  }
  if (state.pendingBadge === themeId) {
    return { ...state, pendingBadge: null, screen: { name: 'badge', themeId } };
  }
  const entry = themeEntry(themeId);
  if (!entry) {
    return { ...state, screen: { name: 'menu' } };
  }
  const bonusOpen = isBonusOpen(state.save, themeId, mainIds(themeId));
  return {
    ...state,
    screen: { name: 'level', themeId, levelId: nextLevelId(entry, levelId, bonusOpen) },
  };
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
    case 'open-theme':
      return themeEntry(event.themeId)
        ? { ...state, screen: { name: 'theme', themeId: event.themeId } }
        : state;
    case 'theme-back':
      return { ...state, screen: { name: 'menu' } };
    case 'open-pack':
      return { ...state, screen: { name: 'pack' } };
    case 'pack-back':
      return { ...state, screen: { name: 'menu' } };
    case 'open-level':
      return openLevel(state, event.themeId, event.levelId);
    case 'level-complete':
      return completeLevelRun(state, event.themeId, event.levelId);
    case 'success-action':
      return successAction(state, event.action, event.themeId, event.levelId);
    case 'badge-tap': {
      const entry = themeEntry(event.themeId);
      return entry
        ? { ...state, screen: { name: 'level', themeId: event.themeId, levelId: entry.bonus.id } }
        : state;
    }
    case 'badge-exit':
      return { ...state, screen: { name: 'menu' } };
    case 'parent-open':
      return { ...state, screen: { name: 'parent', confirmReset: false, showInstall: false } };
    case 'parent-action':
      return parentAction(state, event.action);
  }
}
