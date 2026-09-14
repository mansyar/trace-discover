import { describe, expect, it } from 'vitest';
import {
  dismissBadge,
  dismissSplash,
  dismissSuccess,
  finishLevel,
  goHome,
  openLevel,
  openTheme,
  type Screen,
  startApp,
} from './router';

const THEME = 'dino';
const LEVEL = 'dino-1';

function everyScreen(): Screen[] {
  return [
    startApp(),
    dismissSplash(),
    openTheme(THEME),
    openLevel(THEME, LEVEL),
    finishLevel(THEME, LEVEL),
    dismissSuccess(THEME, LEVEL, true),
  ];
}

describe('startApp', () => {
  it('boots to the splash screen', () => {
    expect(startApp()).toEqual({ name: 'splash' });
  });
});

describe('dismissSplash', () => {
  it('moves from splash to the menu', () => {
    expect(dismissSplash()).toEqual({ name: 'menu' });
  });
});

describe('openTheme', () => {
  it('opens the theme screen for the chosen theme', () => {
    expect(openTheme(THEME)).toEqual({ name: 'theme', themeId: THEME });
  });
});

describe('openLevel', () => {
  it('opens the level screen carrying theme and level ids', () => {
    expect(openLevel(THEME, LEVEL)).toEqual({ name: 'level', levelId: LEVEL, themeId: THEME });
  });
});

describe('finishLevel', () => {
  it('moves from the level to the success screen', () => {
    expect(finishLevel(THEME, LEVEL)).toEqual({ name: 'success', levelId: LEVEL, themeId: THEME });
  });
});

describe('dismissSuccess', () => {
  it('returns to the theme screen when no badge was earned', () => {
    expect(dismissSuccess(THEME, LEVEL, false)).toEqual({ name: 'theme', themeId: THEME });
  });

  it('moves to the badge celebration when a badge was earned', () => {
    expect(dismissSuccess(THEME, LEVEL, true)).toEqual({ name: 'badge', themeId: THEME });
  });
});

describe('dismissBadge', () => {
  it('returns to the theme screen after the badge celebration', () => {
    expect(dismissBadge(THEME)).toEqual({ name: 'theme', themeId: THEME });
  });
});

describe('goHome', () => {
  it('reaches the menu from every screen', () => {
    for (const screen of everyScreen()) {
      expect(goHome(screen)).toEqual({ name: 'menu' });
    }
  });

  it('stays on the menu when already home', () => {
    expect(goHome({ name: 'menu' })).toEqual({ name: 'menu' });
  });
});
