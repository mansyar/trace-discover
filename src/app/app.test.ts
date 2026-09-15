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

describe('pack navigation', () => {
  it('flows menu -> pack -> numeral -> success, saving the numeral sticker', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'open-pack' });
    expect(app.screen).toEqual({ name: 'pack' });
    app = applyAppEvent(app, { type: 'open-level', themeId: 'numbers', levelId: 'num-3' });
    expect(app.screen).toEqual({ name: 'level', themeId: 'numbers', levelId: 'num-3' });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'numbers', levelId: 'num-3' });
    expect(app.screen).toEqual({ name: 'success', themeId: 'numbers', levelId: 'num-3' });
    expect(app.save.completedLevels).toEqual(['num-3']);
    expect(app.save.badges).toEqual([]);
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'home',
      themeId: 'numbers',
      levelId: 'num-3',
    });
    expect(app.screen).toEqual({ name: 'pack' });
  });

  it('routes numeral success actions to replay, next (wrapping) and home', () => {
    let app = applyAppEvent(setup(), { type: 'open-pack' });
    app = applyAppEvent(app, { type: 'open-level', themeId: 'numbers', levelId: 'num-0' });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'numbers', levelId: 'num-0' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'replay',
      themeId: 'numbers',
      levelId: 'num-0',
    });
    expect(app.screen).toEqual({ name: 'level', themeId: 'numbers', levelId: 'num-0' });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'numbers', levelId: 'num-0' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      themeId: 'numbers',
      levelId: 'num-0',
    });
    expect(app.screen).toEqual({ name: 'level', themeId: 'numbers', levelId: 'num-1' });
    app = applyAppEvent(app, { type: 'open-level', themeId: 'numbers', levelId: 'num-9' });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'numbers', levelId: 'num-9' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      themeId: 'numbers',
      levelId: 'num-9',
    });
    expect(app.screen).toEqual({ name: 'level', themeId: 'numbers', levelId: 'num-0' });
  });

  it('returns from the pack and ignores unknown numerals', () => {
    let app = applyAppEvent(setup(), { type: 'open-pack' });
    const before = app;
    app = applyAppEvent(app, { type: 'open-level', themeId: 'numbers', levelId: 'num-42' });
    expect(app).toBe(before);
    app = applyAppEvent(app, { type: 'pack-back' });
    expect(app.screen).toEqual({ name: 'menu' });
  });

  it('records pack progress in the unified completed list', () => {
    const app = applyAppEvent(setup(), {
      type: 'level-complete',
      themeId: 'numbers',
      levelId: 'num-1',
    });
    expect(app.save.completedLevels).toEqual(['num-1']);
    expect(app.save.badges).toEqual([]);
  });

  it('resets pack progress only after the parent confirm tap', () => {
    let app = applyAppEvent(setup(), {
      type: 'level-complete',
      themeId: 'numbers',
      levelId: 'num-1',
    });
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'numbers', levelId: 'num-2' });
    app = applyAppEvent(app, { type: 'parent-open' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual(['num-1', 'num-2']);
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual([]);
    expect(app.save.badges).toEqual([]);
  });
});

describe('pack badge', () => {
  it('awards the pack badge on the tenth numeral and routes next to the celebration', () => {
    let app = setup();
    for (const levelId of [
      'num-0',
      'num-1',
      'num-2',
      'num-3',
      'num-4',
      'num-5',
      'num-6',
      'num-7',
      'num-8',
    ]) {
      app = applyAppEvent(app, { type: 'level-complete', themeId: 'numbers', levelId });
    }
    expect(app.save.completedLevels).toHaveLength(9);
    expect(app.save.badges).toEqual([]);
    expect(app.pendingBadge).toBeNull();
    app = applyAppEvent(app, { type: 'level-complete', themeId: 'numbers', levelId: 'num-9' });
    expect(app.save.badges).toEqual(['numbers-badge']);
    expect(app.pendingBadge).toBe('numbers');
    expect(app.screen).toEqual({ name: 'success', themeId: 'numbers', levelId: 'num-9' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      themeId: 'numbers',
      levelId: 'num-9',
    });
    expect(app.pendingBadge).toBeNull();
    expect(app.screen).toEqual({ name: 'badge', themeId: 'numbers' });
  });

  it('keeps the badge pending on home and opens the collection from the seal', () => {
    let app = setup();
    for (const levelId of [
      'num-0',
      'num-1',
      'num-2',
      'num-3',
      'num-4',
      'num-5',
      'num-6',
      'num-7',
      'num-8',
      'num-9',
    ]) {
      app = applyAppEvent(app, { type: 'level-complete', themeId: 'numbers', levelId });
    }
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'home',
      themeId: 'numbers',
      levelId: 'num-9',
    });
    expect(app.screen).toEqual({ name: 'pack' });
    expect(app.pendingBadge).toBe('numbers');
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      themeId: 'numbers',
      levelId: 'num-9',
    });
    expect(app.screen).toEqual({ name: 'badge', themeId: 'numbers' });
    app = applyAppEvent(app, { type: 'badge-tap', themeId: 'numbers' });
    expect(app.screen).toEqual({ name: 'pack' });
    app = applyAppEvent(app, { type: 'badge-exit' });
    expect(app.screen).toEqual({ name: 'menu' });
  });
});
