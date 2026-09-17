import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '../save/store';
import { type AppState, applyAppEvent, shouldPulseStickerShelf, startApp } from './app';

function setup(): AppState {
  return startApp(createDefaultSave());
}

function preIds(count = 12): readonly string[] {
  return Array.from({ length: count }, (_, index) => `pre-${index + 1}`);
}

function numIds(count = 10): readonly string[] {
  return Array.from({ length: count }, (_, index) => `num-${index}`);
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

function abcIds(count = 26): readonly string[] {
  return Array.from({ length: count }, (_, index) => `abc-${ALPHABET.charAt(index)}`);
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
    expect(app.screen).toEqual({
      name: 'parent',
      confirmReset: false,
      showInstall: true,
      showName: false,
    });
    app = applyAppEvent(app, { type: 'parent-action', action: 'done' });
    expect(app.screen).toEqual({ name: 'menu' });
  });

  it('cycles the skin from the parent setter and reset clears trophies', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'parent-open' });
    expect(app.save.settings.skin).toBe('dino');
    app = applyAppEvent(app, { type: 'parent-action', action: 'skin' });
    expect(app.save.settings.skin).toBe('star');
    app = applyAppEvent(app, { type: 'parent-action', action: 'skin' });
    expect(app.save.settings.skin).toBe('construction');
    const seeded = {
      ...createDefaultSave(),
      badges: ['pre-badge'],
      completedLevels: ['pre-1'],
      trophies: ['dino'],
    };
    let resetting = startApp(seeded);
    resetting = applyAppEvent(resetting, { type: 'splash-tap' });
    resetting = applyAppEvent(resetting, { type: 'parent-open' });
    resetting = applyAppEvent(resetting, { type: 'parent-action', action: 'reset' });
    resetting = applyAppEvent(resetting, { type: 'parent-action', action: 'reset' });
    expect(resetting.save.badges).toEqual([]);
    expect(resetting.save.completedLevels).toEqual([]);
    expect(resetting.save.trophies).toEqual([]);
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

describe('letters pack navigation', () => {
  it('flows menu -> pack -> letter -> success for a third pack', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'open-pack', packId: 'abc' });
    expect(app.screen).toEqual({ name: 'pack', packId: 'abc' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'abc', levelId: 'abc-k' });
    expect(app.screen).toEqual({ name: 'level', packId: 'abc', levelId: 'abc-k' });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'abc', levelId: 'abc-k' });
    expect(app.screen).toEqual({ name: 'success', packId: 'abc', levelId: 'abc-k' });
    expect(app.save.completedLevels).toEqual(['abc-k']);
    expect(app.save.badges).toEqual([]);
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'abc',
      levelId: 'abc-k',
    });
    expect(app.screen).toEqual({ name: 'level', packId: 'abc', levelId: 'abc-l' });
  });

  it('keeps a sequence bonus locked until its unlock threshold', () => {
    let app = completeAll(setup(), 'abc', abcIds(8));
    const before = app;
    app = applyAppEvent(app, { type: 'open-level', packId: 'abc', levelId: 'abc-bonus-1' });
    expect(app).toBe(before);
    app = applyAppEvent(app, { type: 'level-complete', packId: 'abc', levelId: 'abc-i' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'abc', levelId: 'abc-bonus-1' });
    expect(app.screen).toEqual({ name: 'level', packId: 'abc', levelId: 'abc-bonus-1' });
  });

  it('awards the letters badge on the twenty-sixth letter and opens the seal flow', () => {
    let app = completeAll(setup(), 'abc', abcIds(25));
    expect(app.save.badges).toEqual([]);
    expect(app.pendingBadge).toBeNull();
    app = applyAppEvent(app, { type: 'level-complete', packId: 'abc', levelId: 'abc-z' });
    expect(app.save.badges).toEqual(['abc-badge']);
    expect(app.pendingBadge).toBe('abc-badge');
    expect(app.screen).toEqual({ name: 'success', packId: 'abc', levelId: 'abc-z' });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'abc',
      levelId: 'abc-z',
    });
    expect(app.pendingBadge).toBeNull();
    expect(app.screen).toEqual({ name: 'badge', packId: 'abc' });
    app = applyAppEvent(app, { type: 'badge-tap', packId: 'abc' });
    expect(app.screen).toEqual({ name: 'level', packId: 'abc', levelId: 'abc-bonus-1' });
  });

  it('replays a letter and returns home from an abc success', () => {
    let app = applyAppEvent(setup(), { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'open-pack', packId: 'abc' });
    app = applyAppEvent(app, { type: 'open-level', packId: 'abc', levelId: 'abc-k' });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'abc', levelId: 'abc-k' });
    const done = app;
    app = applyAppEvent(done, {
      type: 'success-action',
      action: 'replay',
      packId: 'abc',
      levelId: 'abc-k',
    });
    expect(app.screen).toEqual({ name: 'level', packId: 'abc', levelId: 'abc-k' });
    app = applyAppEvent(done, {
      type: 'success-action',
      action: 'home',
      packId: 'abc',
      levelId: 'abc-k',
    });
    expect(app.screen).toEqual({ name: 'pack', packId: 'abc' });
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
    expect(fourth.save.settings.skin).toBe('teddy');

    const fifth = applyAppEvent(fourth, { type: 'skin-cycle' });
    expect(fifth.save.settings.skin).toBe('dino');
  });

  it('leaves the current screen untouched', () => {
    const app = applyAppEvent(startApp(createDefaultSave()), { type: 'splash-tap' });
    const cycled = applyAppEvent(app, { type: 'skin-cycle' });
    expect(cycled.screen).toEqual({ name: 'menu' });
  });
});

describe('name preservation', () => {
  it('keeps the parent-set name across a progress reset', () => {
    const seeded = {
      ...createDefaultSave(),
      completedLevels: ['pre-1'],
      name: 'AVA',
    };
    let app = startApp(seeded);
    app = applyAppEvent(app, { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'parent-open' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual([]);
    expect(app.save.name).toBe('AVA');
  });
});

describe('sticker intro preservation', () => {
  it('keeps the sticker intro flag across a progress reset', () => {
    const seeded = {
      ...createDefaultSave(),
      completedLevels: ['pre-1'],
      stickerIntroSeen: true,
    };
    let app = startApp(seeded);
    app = applyAppEvent(app, { type: 'splash-tap' });
    app = applyAppEvent(app, { type: 'parent-open' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect(app.save.completedLevels).toEqual([]);
    expect(app.save.stickerIntroSeen).toBe(true);
  });

  it('does not fabricate the flag when resetting a save that never saw the intro', () => {
    let app = startApp(createDefaultSave());
    app = applyAppEvent(app, { type: 'parent-open' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    app = applyAppEvent(app, { type: 'parent-action', action: 'reset' });
    expect('stickerIntroSeen' in app.save).toBe(false);
  });
});

describe('name pack navigation', () => {
  const named = { ...createDefaultSave(), name: 'AVA' };

  it('opens the composed name pack only when a name is saved', () => {
    const before = setup();
    expect(applyAppEvent(before, { type: 'open-pack', packId: 'name' })).toBe(before);
    const app = applyAppEvent(startApp(named), { type: 'open-pack', packId: 'name' });
    expect(app.screen).toEqual({ name: 'pack', packId: 'name' });
  });

  it('traces the single level to its sticker and badge celebration', () => {
    let app = startApp(named);
    app = applyAppEvent(app, { type: 'open-level', packId: 'name', levelId: 'name-1' });
    expect(app.screen).toEqual({ name: 'level', packId: 'name', levelId: 'name-1' });
    app = applyAppEvent(app, { type: 'level-complete', packId: 'name', levelId: 'name-1' });
    expect(app.screen).toEqual({ name: 'success', packId: 'name', levelId: 'name-1' });
    expect(app.save.completedLevels).toEqual(['name-1']);
    expect(app.save.badges).toEqual(['name-badge']);
    expect(app.pendingBadge).toBe('name-badge');
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'name',
      levelId: 'name-1',
    });
    expect(app.screen).toEqual({ name: 'badge', packId: 'name' });
    expect(app.pendingBadge).toBeNull();
    app = applyAppEvent(app, { type: 'badge-tap', packId: 'name' });
    expect(app.screen).toEqual({ name: 'pack', packId: 'name' });
  });

  it('wraps next back onto the same level once the badge is earned', () => {
    let app = startApp({ ...named, badges: ['name-badge'], completedLevels: ['name-1'] });
    app = applyAppEvent(app, {
      type: 'success-action',
      action: 'next',
      packId: 'name',
      levelId: 'name-1',
    });
    expect(app.screen).toEqual({ name: 'level', packId: 'name', levelId: 'name-1' });
  });
});

describe('name editing', () => {
  function openOverlay(save = createDefaultSave()): AppState {
    let app = startApp(save);
    app = applyAppEvent(app, { type: 'parent-open' });
    return applyAppEvent(app, { type: 'parent-action', action: 'name' });
  }

  it('opens the overlay from the parent zone', () => {
    const app = openOverlay();
    expect(app.screen).toMatchObject({ name: 'parent', showName: true });
  });

  it('saves a sanitized, clamped name and closes the overlay', () => {
    let app = openOverlay();
    app = applyAppEvent(app, { type: 'name-set', name: 'a i r a' });
    expect(app.save.name).toBe('AIRA');
    expect(app.screen).toMatchObject({ name: 'parent', showName: false });

    app = openOverlay();
    app = applyAppEvent(app, { type: 'name-set', name: 'abcdefgh' });
    expect(app.save.name).toBe('ABCDEFG');
  });

  it('rejects names shorter than two letters and stays open', () => {
    let app = openOverlay();
    const kept = app;
    app = applyAppEvent(app, { type: 'name-set', name: 'a' });
    expect(app).toBe(kept);
    app = applyAppEvent(app, { type: 'name-set', name: '1 2' });
    expect(app).toBe(kept);
    expect(app.save.name).toBeUndefined();
    expect(app.screen).toMatchObject({ showName: true });
  });

  it('clears the name but keeps the overlay open', () => {
    let app = openOverlay({ ...createDefaultSave(), name: 'AVA' });
    app = applyAppEvent(app, { type: 'name-clear' });
    expect(app.save.name).toBeUndefined();
    expect(app.screen).toMatchObject({ name: 'parent', showName: true });
  });

  it('cancels the overlay without touching the name', () => {
    let app = openOverlay({ ...createDefaultSave(), name: 'AVA' });
    app = applyAppEvent(app, { type: 'name-close' });
    expect(app.save.name).toBe('AVA');
    expect(app.screen).toMatchObject({ name: 'parent', showName: false });
  });

  it('ignores name events outside the parent overlay', () => {
    const app = startApp(createDefaultSave());
    expect(applyAppEvent(app, { type: 'name-set', name: 'AVA' })).toBe(app);
    expect(applyAppEvent(app, { type: 'name-clear' })).toBe(app);
    expect(applyAppEvent(app, { type: 'name-close' })).toBe(app);
  });
});

describe('sticker board navigation', () => {
  function stockedApp(): AppState {
    return startApp({ ...createDefaultSave(), completedLevels: ['pre-1'] });
  }

  it('opens the board from the shelf when the pack has a sticker, setting the intro flag', () => {
    const app = applyAppEvent(stockedApp(), { type: 'sticker-open', packId: 'pre' });
    expect(app.screen).toEqual({ name: 'sticker-board', packId: 'pre' });
    expect(app.save.stickerIntroSeen).toBe(true);
  });

  it('opens the solo board for the name pack', () => {
    const named = { ...createDefaultSave(), completedLevels: ['name-1'], name: 'AVA' };
    const app = applyAppEvent(startApp(named), { type: 'sticker-open', packId: 'name' });
    expect(app.screen).toEqual({ name: 'sticker-board', packId: 'name' });
  });

  it('ignores unknown packs and packs with no stickers yet', () => {
    const empty = startApp(createDefaultSave());
    expect(applyAppEvent(empty, { type: 'sticker-open', packId: 'pre' })).toBe(empty);
    expect(applyAppEvent(empty, { type: 'sticker-open', packId: 'space' })).toBe(empty);
    expect(empty.save.stickerIntroSeen).toBeUndefined();
  });

  it('sets the intro flag once and closes back to the pack', () => {
    let app = applyAppEvent(stockedApp(), { type: 'sticker-open', packId: 'pre' });
    const opened = app;
    app = applyAppEvent(app, { type: 'sticker-close' });
    expect(app.screen).toEqual({ name: 'pack', packId: 'pre' });
    app = applyAppEvent(app, { type: 'sticker-open', packId: 'pre' });
    expect(app.save).toBe(opened.save);
  });

  it('ignores sticker-close outside the board', () => {
    const menu = applyAppEvent(startApp(createDefaultSave()), { type: 'splash-tap' });
    expect(applyAppEvent(menu, { type: 'sticker-close' })).toBe(menu);
  });

  it('taps an earned sticker to start a pop moment and ignores ghosts', () => {
    let app = startApp({ ...createDefaultSave(), completedLevels: ['num-1', 'pre-1'] });
    app = applyAppEvent(app, { type: 'sticker-open', packId: 'pre' });
    const opened = app;
    app = applyAppEvent(app, { type: 'sticker-tap', levelId: 'pre-2' });
    expect(app).toBe(opened);
    app = applyAppEvent(app, { type: 'sticker-tap', levelId: 'num-1' });
    expect(app).toBe(opened);
    app = applyAppEvent(app, { type: 'sticker-tap', levelId: 'pre-1' });
    expect(app.stickerMoment).toEqual({ levelId: 'pre-1', nonce: 1 });
    app = applyAppEvent(app, { type: 'sticker-tap', levelId: 'pre-1' });
    expect(app.stickerMoment).toEqual({ levelId: 'pre-1', nonce: 2 });
  });

  it('ignores sticker taps outside the board', () => {
    const menu = applyAppEvent(startApp(createDefaultSave()), { type: 'splash-tap' });
    expect(applyAppEvent(menu, { type: 'sticker-tap', levelId: 'pre-1' })).toBe(menu);
  });

  it('clears the pop moment when leaving the board', () => {
    let app = applyAppEvent(stockedApp(), { type: 'sticker-open', packId: 'pre' });
    app = applyAppEvent(app, { type: 'sticker-tap', levelId: 'pre-1' });
    expect(app.stickerMoment).not.toBeNull();
    app = applyAppEvent(app, { type: 'sticker-close' });
    expect(app.stickerMoment).toBeNull();
  });
});

describe('shouldPulseStickerShelf', () => {
  it('pulses only while the intro is unseen and the pack holds a sticker', () => {
    expect(shouldPulseStickerShelf(createDefaultSave(), 'pre')).toBe(false);
    const stocked = { ...createDefaultSave(), completedLevels: ['num-1'] };
    expect(shouldPulseStickerShelf(stocked, 'numbers')).toBe(true);
    expect(shouldPulseStickerShelf(stocked, 'pre')).toBe(false);
    expect(shouldPulseStickerShelf({ ...stocked, stickerIntroSeen: true }, 'numbers')).toBe(false);
    expect(shouldPulseStickerShelf(stocked, 'space')).toBe(false);
  });
});
