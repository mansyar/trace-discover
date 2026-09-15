import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '../save/store';
import { type AppState, applyAppEvent, startApp } from './app';

function setup(): AppState {
  return startApp(createDefaultSave());
}

function preIds(count = 12): readonly string[] {
  return Array.from({ length: count }, (_, index) => `pre-${index + 1}`);
}

function numIds(count = 10): readonly string[] {
  return Array.from({ length: count }, (_, index) => `num-${index}`);
}

function completeAll(app: AppState, packId: string, ids: readonly string[]): AppState {
  let next = app;
  for (const levelId of ids) {
    next = applyAppEvent(next, { type: 'level-complete', packId, levelId });
  }
  return next;
}

describe('app navigation', () => {
  it('flows splash -> menu -> pack -> level -> success, saving the sticker', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    expect(app.screen.name).toBe('menu');
    app = applyAppEvent(app, { type: 'open-pack', packId: 'pre' });
    expect(app.screen).toEqual({ name: 'pack', packId: 'pre' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'pre', levelId: 'pre-1' });
    expect(app.screen).toEqual({ name: 'level', packId: 'pre', levelId: 'pre-1' });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'pre', levelId: 'pre-1' });
    expect(app.screen).toEqual({ name: 'success', packId: 'pre', levelId: 'pre-1' });
    expect(app.save.completedLevels).toEqual(['pre-1']);
    expect(app.save.badges).toEqual([]);
  });

  it('routes success actions to replay, next, and home', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'open-pack', packId: 'pre' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'pre', levelId: 'pre-2' });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'pre', levelId: 'pre-2' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'replay',
      packId: 'pre',
      levelId: 'pre-2',
    });
    expect(app.screen).toEqual({ name: 'level', packId: 'pre', levelId: 'pre-2' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'pre',
      levelId: 'pre-2',
    });
    expect(app.screen).toEqual({ name: 'level', packId: 'pre', levelId: 'pre-3' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'home',
      packId: 'pre',
      levelId: 'pre-3',
    });
    expect(app.screen).toEqual({ name: 'pack', packId: 'pre' });
  });

  it('awards the pre-writing badge on the twelfth level and celebrates on next', () => {
    let app = completeAll(setup(), 'pre', preIds(11));
    expect(app.save.badges).toEqual([]);
    expect(app.pendingBadge).toBeNull();
    app = applyAppEvent(app, { type: 'level-complete', packId: 'pre', levelId: 'pre-12' });
    expect(app.save.badges).toEqual(['pre-badge']);
    expect(app.pendingBadge).toBe('pre-badge');
    expect(app.screen).toEqual({ name: 'success', packId: 'pre', levelId: 'pre-12' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'pre',
      levelId: 'pre-12',
    });
    expect(app.pendingBadge).toBeNull();
    expect(app.screen).toEqual({ name: 'badge', packId: 'pre' });
  });

  it('keeps a circle locked until its unlock threshold', () => {
    let app = completeAll(setup(), 'pre', preIds(3));
    const before = app;
    app = applyAppEvent(app, { type: 'open-level', packId: 'pre', levelId: 'pre-bonus-1' });
    expect(app).toBe(before);
    app = applyAppEvent(app, { type: 'level-complete', packId: 'pre', levelId: 'pre-4' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'pre', levelId: 'pre-bonus-1' });
    expect(app.screen).toEqual({ name: 'level', packId: 'pre', levelId: 'pre-bonus-1' });
  });

  it('opens the first unlocked circle from the badge seal', () => {
    let app = completeAll(setup(), 'pre', preIds());
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'pre',
      levelId: 'pre-12',
    });
    expect(app.screen).toEqual({ name: 'badge', packId: 'pre' });
    app = applyAppEvent(app, { type: 'badge-tap', packId: 'pre' });
    expect(app.screen).toEqual({ name: 'level', packId: 'pre', levelId: 'pre-bonus-1' });
  });

  it('falls back to the pack screen from the seal when no circle is unlocked', () => {
    expect(applyAppEvent(setup(), { type: 'badge-tap', packId: 'pre' }).screen).toEqual({
      name: 'pack',
      packId: 'pre',
    });
  });

  it('ignores unknown packs and levels', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    const before = app;
    app = applyAppEvent(app, { type: 'open-pack', packId: 'space' });
    expect(app).toBe(before);
    app = applyAppEvent(app, { type: 'open-level', packId: 'pre', levelId: 'pre-99' });
    expect(app).toBe(before);
    app = applyAppEvent(app, { type: 'level-complete', packId: 'ghost', levelId: 'pre-1' });
    expect(app).toBe(before);
    app = applyAppEvent(app, { type: 'badge-tap', packId: 'ghost' });
    expect(app).toBe(before);
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'ghost',
      levelId: 'pre-1',
    });
    expect(app.screen).toEqual({ name: 'menu' });
    app = applyAppEvent(app, { type: 'open-pack', packId: 'pre' });
    app = applyAppEvent(app, { type: 'pack-back' });
    expect(app.screen).toEqual({ name: 'menu' });
  });

  it('opens and closes the parent zone, applying settings with a guarded reset', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'parent-open' });
    expect(app.screen.name).toBe('parent');
    app = applyAppEvent(app, { type: 'parent-action', action: 'volume-down' });
    expect(app.save.settings.volume).toBe(0.9);
    app = applyAppEvent(app, { type: 'parent-action', action: 'volume-up' });
    expect(app.save.settings.volume).toBe(1);
    app = applyAppEvent(app, { type: 'parent-action', action: 'mute' });
    expect(app.save.settings.muted).toBe(true);
    app = applyAppEvent(app, { type: 'parent-action', action: 'easier' });
    expect(app.save.settings.easierTracing).toBe(true);
    // Reset needs a confirm tap before it wipes progress.
    app = applyAppEvent(app, { type: 'level-complete', packId: 'pre', levelId: 'pre-1' });
    app = applyAppEvent(app, { type: 'parent-open' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual(['pre-1']);
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual([]);
    app = applyAppEvent(app, { type: 'parent-action', action: 'install' });
    expect(app.screen).toEqual({ name: 'parent', confirmReset: false, showInstall: true });
    app = applyAppEvent(app, { type: 'parent-action', action: 'done' });
    expect(app.screen).toEqual({ name: 'menu' });
  });
});

describe('numbers pack navigation', () => {
  it('flows menu -> pack -> numeral -> success, saving the numeral sticker', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'open-pack', packId: 'numbers' });
    expect(app.screen).toEqual({ name: 'pack', packId: 'numbers' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'numbers', levelId: 'num-3' });
    expect(app.screen).toEqual({ name: 'level', packId: 'numbers', levelId: 'num-3' });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'numbers', levelId: 'num-3' });
    expect(app.screen).toEqual({ name: 'success', packId: 'numbers', levelId: 'num-3' });
    expect(app.save.completedLevels).toEqual(['num-3']);
    expect(app.save.badges).toEqual([]);
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'home',
      packId: 'numbers',
      levelId: 'num-3',
    });
    expect(app.screen).toEqual({ name: 'pack', packId: 'numbers' });
  });

  it('routes numeral success actions to replay, next (wrapping) and home', () => {
    let app = applyAppEvent(setup(), { type: 'open-pack', packId: 'numbers' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'numbers', levelId: 'num-0' });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'numbers', levelId: 'num-0' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'replay',
      packId: 'numbers',
      levelId: 'num-0',
    });
    expect(app.screen).toEqual({ name: 'level', packId: 'numbers', levelId: 'num-0' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'numbers',
      levelId: 'num-0',
    });
    expect(app.screen).toEqual({ name: 'level', packId: 'numbers', levelId: 'num-1' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'numbers', levelId: 'num-9' });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'numbers', levelId: 'num-9' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'numbers',
      levelId: 'num-9',
    });
    expect(app.screen).toEqual({ name: 'level', packId: 'numbers', levelId: 'num-0' });
  });

  it('returns from the pack and ignores unknown numerals', () => {
    let app = applyAppEvent(setup(), { type: 'open-pack', packId: 'numbers' });
    const before = app;
    app = applyAppEvent(app, { type: 'open-level', packId: 'numbers', levelId: 'num-42' });
    expect(app).toBe(before);
    app = applyAppEvent(app, { type: 'pack-back' });
    expect(app.screen).toEqual({ name: 'menu' });
  });

  it('records pack progress in the unified completed list', () => {
    const app = applyAppEvent(setup(), {
      type: 'level-complete',
      packId: 'numbers',
      levelId: 'num-1',
    });
    expect(app.save.completedLevels).toEqual(['num-1']);
    expect(app.save.badges).toEqual([]);
  });

  it('resets pack progress only after the parent confirm tap', () => {
    let app = applyAppEvent(setup(), {
      type: 'level-complete',
      packId: 'numbers',
      levelId: 'num-1',
    });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'numbers', levelId: 'num-2' });
    app = applyAppEvent(app, { type: 'parent-open' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual(['num-1', 'num-2']);
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual([]);
    expect(app.save.badges).toEqual([]);
  });
});

describe('pack badge', () => {
  it('awards the numbers badge on the tenth numeral and routes next to the celebration', () => {
    let app = completeAll(setup(), 'numbers', numIds(9));
    expect(app.save.completedLevels).toHaveLength(9);
    expect(app.save.badges).toEqual([]);
    expect(app.pendingBadge).toBeNull();
    app = applyAppEvent(app, { type: 'level-complete', packId: 'numbers', levelId: 'num-9' });
    expect(app.save.badges).toEqual(['numbers-badge']);
    expect(app.pendingBadge).toBe('numbers-badge');
    expect(app.screen).toEqual({ name: 'success', packId: 'numbers', levelId: 'num-9' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'numbers',
      levelId: 'num-9',
    });
    expect(app.pendingBadge).toBeNull();
    expect(app.screen).toEqual({ name: 'badge', packId: 'numbers' });
  });

  it('keeps the badge pending on home and opens the pack from the seal', () => {
    let app = completeAll(setup(), 'numbers', numIds());
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'home',
      packId: 'numbers',
      levelId: 'num-9',
    });
    expect(app.screen).toEqual({ name: 'pack', packId: 'numbers' });
    expect(app.pendingBadge).toBe('numbers-badge');
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'numbers',
      levelId: 'num-9',
    });
    expect(app.screen).toEqual({ name: 'badge', packId: 'numbers' });
    app = applyAppEvent(app, { type: 'badge-tap', packId: 'numbers' });
    expect(app.screen).toEqual({ name: 'pack', packId: 'numbers' });
    app = applyAppEvent(app, { type: 'badge-exit' });
    expect(app.screen).toEqual({ name: 'menu' });
  });
});

describe('skin cycling', () => {
  it('cycles the persisted skin on each skin-cycle event and wraps', () => {
    const app = startApp(createDefaultSave());
    expect(app.save.settings.skin).toBe('dino');

    const first = applyAppEvent(app, { type: 'skin-cycle' });
    expect(first.save.settings.skin).toBe('star');

    const second = applyAppEvent(first, { type: 'skin-cycle' });
    expect(second.save.settings.skin).toBe('construction');

    const third = applyAppEvent(second, { type: 'skin-cycle' });
    expect(third.save.settings.skin).toBe('animal');

    const fourth = applyAppEvent(third, { type: 'skin-cycle' });
    expect(fourth.save.settings.skin).toBe('dino');
  });

  it('leaves the current screen untouched', () => {
    const app = applyAppEvent(startApp(createDefaultSave()), { type: 'splash-tap' });
    const cycled = applyAppEvent(app, { type: 'skin-cycle' });
    expect(cycled.screen).toEqual({ name: 'menu' });
  });
});
