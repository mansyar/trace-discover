// Pure screen transitions for the app loop:
// splash -> menu -> theme -> level -> success -> (badge) -> theme.
// Home (menu) is reachable from every screen; no timers, no dead ends.
export type Screen =
  | { readonly name: 'splash' }
  | { readonly name: 'menu' }
  | { readonly name: 'theme'; readonly themeId: string }
  | { readonly name: 'level'; readonly levelId: string; readonly themeId: string }
  | { readonly name: 'success'; readonly levelId: string; readonly themeId: string }
  | { readonly name: 'badge'; readonly themeId: string };

export function startApp(): Screen {
  return { name: 'splash' };
}

export function dismissSplash(): Screen {
  return { name: 'menu' };
}

export function openTheme(themeId: string): Screen {
  return { name: 'theme', themeId };
}

export function openLevel(themeId: string, levelId: string): Screen {
  return { name: 'level', levelId, themeId };
}

export function finishLevel(themeId: string, levelId: string): Screen {
  return { name: 'success', levelId, themeId };
}

export function dismissSuccess(themeId: string, _levelId: string, earnedBadge: boolean): Screen {
  if (earnedBadge) {
    return { name: 'badge', themeId };
  }
  return { name: 'theme', themeId };
}

export function dismissBadge(themeId: string): Screen {
  return { name: 'theme', themeId };
}

export function goHome(_from: Screen): Screen {
  return { name: 'menu' };
}
