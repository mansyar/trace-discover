import { describe, expect, it } from 'vitest';

import { createDefaultSave } from '../save/store';
import { type AppState, applyAppEvent, startApp } from './app';

function setup(): AppState {
  return startApp(createDefaultSave());
}

describe('app navigation', () => {
  it('flows splash -> menu -> theme -> level -> success, saving the sticker', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    expect(app.screen.name).toBe('menu');
    app = applyAppEvent(app, { type: 'open-theme', themeId: 'dino' });
    expect(app.screen).toEqual({ name: 'theme', themeId: 'dino' });
    app = applyAppEvent(app, { type: 'open-level', themeId: 'dino', levelId: 'dino-1' });
    expect(app.screen).toEqual({ name: 'level', themeId: 'dino', levelId: 'dino-1' });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'dino', levelId: 'dino-1' });
    expect(app.screen).toEqual({ name: 'success', themeId: 'dino', levelId: 'dino-1' });
    expect(app.save.completedLevels).toEqual(['dino-1']);
    expect(app.save.badges).toEqual([]);
  });

  it('routes success actions to replay, next, and home', () => {
    let app = setup();
    app = applyAppEvent(app, { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'open-theme', themeId: 'dino' });
    app = applyAppEvent(app, { type: 'open-level', themeId: 'dino', levelId: 'dino-2' });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'dino', levelId: 'dino-2' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'replay',
      themeId: 'dino',
      levelId: 'dino-2',
    });
    expect(app.screen).toEqual({ name: 'level', themeId: 'dino', levelId: 'dino-2' });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'dino', levelId: 'dino-2' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      themeId: 'dino',
      levelId: 'dino-2',
    });
    expect(app.screen).toEqual({ name: 'level', themeId: 'dino', levelId: 'dino-3' });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'dino', levelId: 'dino-3' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'home',
      themeId: 'dino',
      levelId: 'dino-3',
    });
    expect(app.screen).toEqual({ name: 'menu' });
  });

  it('celebrates the badge after the fourth level and opens the bonus from it', () => {
    let app = setup();
    for (const levelId of ['dino-1', 'dino-2', 'dino-3']) {
      app = applyAppEvent(app, { type: 'level-complete', themeId: 'dino', levelId });
    }
    expect(app.save.badges).toEqual([]);
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'dino', levelId: 'dino-4' });
    expect(app.save.badges).toEqual(['dino']);
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      themeId: 'dino',
      levelId: 'dino-4',
    });
    expect(app.screen).toEqual({ name: 'badge', themeId: 'dino' });
    app = applyAppEvent(app, { type: 'badge-tap', themeId: 'dino' });
    expect(app.screen).toEqual({ name: 'level', themeId: 'dino', levelId: 'dino-bonus' });
  });

  it('keeps the bonus locked until its theme is complete', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'open-theme', themeId: 'dino' });
    const before = app;
    app = applyAppEvent(app, { type: 'open-level', themeId: 'dino', levelId: 'dino-bonus' });
    expect(app).toBe(before);
  });

  it('ignores unknown themes and levels', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    const before = app;
    app = applyAppEvent(app, { type: 'open-theme', themeId: 'space' });
    expect(app).toBe(before);
    app = applyAppEvent(app, { type: 'open-theme', themeId: 'dino' });
    app = applyAppEvent(app, { type: 'open-level', themeId: 'dino', levelId: 'dino-9' });
    expect(app.screen).toEqual({ name: 'theme', themeId: 'dino' });
    app = applyAppEvent(app, { type: 'theme-back' });
    expect(app.screen).toEqual({ name: 'menu' });
  });

  it('opens and closes the parent zone, applying settings with a guarded reset', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'parent-open' });
    expect(app.screen.name).toBe('parent');
    app = applyAppEvent(app, { type: 'parent-action', action: 'volume-down' });
    expect(app.save.settings.volume).toBe(0.9);
    app = applyAppEvent(app, { type: 'parent-action', action: 'mute' });
    expect(app.save.settings.muted).toBe(true);
    app = applyAppEvent(app, { type: 'parent-action', action: 'easier' });
    expect(app.save.settings.easierTracing).toBe(true);
    // Reset needs a confirm tap before it wipes progress.
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'dino', levelId: 'dino-1' });
    app = applyAppEvent(app, { type: 'parent-open' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual(['dino-1']);
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual([]);
    app = applyAppEvent(app, { type: 'parent-action', action: 'install' });
    expect(app.screen).toEqual({ name: 'parent', confirmReset: false, showInstall: true });
    app = applyAppEvent(app, { type: 'parent-action', action: 'done' });
    expect(app.screen).toEqual({ name: 'menu' });
  });
});
