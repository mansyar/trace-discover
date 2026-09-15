// Production boot: wires the single canvas + mascot canvas to the app state
// machine, the level session runtime, volume-aware audio, and the Rive
// character. Primary pointers drive tracing via attachTraceInput (palm
// rejection included); a separate raw listener tracks the two-finger
// parent-gate hold, which needs the non-primary pointers tracing ignores.
import './style.css';

import { type AppState, applyAppEvent, startApp } from './app/app';
import { loadArtImage } from './app/art';
import {
  BADGE_HOME,
  BADGE_SEAL,
  beginField,
  drawBadge,
  drawLevel,
  drawMenu,
  drawPack,
  drawParent,
  drawSplash,
  drawSuccess,
  drawTheme,
  endField,
  type LevelArt,
  NO_LEVEL_ART,
} from './app/render';
import { createSession, type LevelSession } from './app/session';
import { withVolume } from './audio/meter';
import { createTonePlayer } from './audio/player';
import type { TonePlayer } from './audio/synth';
import { createUnlockGate } from './audio/synth';
import { canvasLiteFactory } from './character/adapter';
import { type Character, loadCharacter } from './character/character';
import { type HopTimeline, hopTimeline } from './character/hops';
import type { Point } from './engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH } from './field';
import { attachTraceInput, mapPointerToField, type TraceHandlers } from './input/pointer';
import { loadSave, saveSave } from './save/store';
import { require2dContext, requireCanvas } from './shell/boot';
import { computeBackingSize, fitRect, type Rect } from './shell/layout';
import { allThemeIds, themeEntry } from './themes/catalog';
import { type LevelDef, levelToPath } from './themes/level';
import { NUMBERS_PACK, NUMERAL_LEVELS } from './themes/numbers';
import { packLevelIds } from './themes/pack';
import { isBonusOpen } from './themes/progress';
import { hitMenuCard, inParentGate, menuLayout, splashLayout } from './ui/menu';
import { hitPackCard, hitPackHome, packLayout, packStickers } from './ui/pack';
import { PARENT_GATE_START, type ParentGateState, stepParentGate } from './ui/parent';
import { hitParentZone, parentZoneLayout } from './ui/parentZone';
import { hitSuccessButton, successLayout } from './ui/success';
import { hitThemeCard, hitThemeHome, themeLayout, themeStickers } from './ui/theme';

const CHARACTER_SCALE = 0.62;
const CHARACTER_OFFSET_Y = 0.38;

const trailCanvas = requireCanvas(document);
const trailContext = require2dContext(trailCanvas);
const charCanvas = requireCharCanvas(document);

function requireCharCanvas(doc: Document): HTMLCanvasElement {
  const canvas = doc.querySelector<HTMLCanvasElement>('#char');
  if (!canvas) {
    throw new Error('Character canvas element is missing from the document.');
  }
  return canvas;
}

const THEME_IDS = allThemeIds();
const NUMERIC_IDS = packLevelIds(NUMBERS_PACK);
const MENU = menuLayout(FIELD_WIDTH, FIELD_HEIGHT, [...THEME_IDS, NUMBERS_PACK.id]);
const MENU_FILLS = [
  ...THEME_IDS.map((id) => themeEntry(id)?.menuFill ?? '#ffffff'),
  NUMBERS_PACK.menuFill,
];
const PACK = packLayout(FIELD_WIDTH, FIELD_HEIGHT, NUMERIC_IDS);
const NUMERAL_MINI = new Map(
  NUMERAL_LEVELS.map((level) => [level.id, levelToPath(level)] as const),
);
const SUCCESS = successLayout(FIELD_WIDTH, FIELD_HEIGHT);
const SPLASH = splashLayout(FIELD_WIDTH, FIELD_HEIGHT);
const PARENT = parentZoneLayout(FIELD_WIDTH, FIELD_HEIGHT);

let app: AppState = startApp(loadSave(localStorage));
let session: LevelSession | null = null;
let character: Character | null = null;
let field: Rect = fitRect(1, 1, FIELD_WIDTH, FIELD_HEIGHT);
let gateState: ParentGateState = PARENT_GATE_START;
const gatePointers = new Set<number>();
let detachInput = (): void => {};
let lastTime = performance.now();

const miniCache = new Map<string, ReadonlyMap<string, readonly Point[]>>();
function miniPaths(themeId: string): ReadonlyMap<string, readonly Point[]> {
  const cached = miniCache.get(themeId);
  if (cached) {
    return cached;
  }
  const entry = themeEntry(themeId);
  const paths = new Map<string, readonly Point[]>();
  for (const level of entry?.mainLevels ?? []) {
    const [path] = levelToPath(level);
    if (path) {
      paths.set(level.id, path);
    }
  }
  miniCache.set(themeId, paths);
  return paths;
}

// Audio starts lazily on first touch (iOS requirement); volume and mute
// read the live save so parent-zone changes apply instantly.
const unlockGate = createUnlockGate();
let audioContext: AudioContext | null = null;
let meteredPlayer: TonePlayer | null = null;

function ensureAudio(): TonePlayer | null {
  if (typeof AudioContext === 'undefined') {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioContext();
    meteredPlayer = withVolume(createTonePlayer(audioContext), () => app.save.settings);
  }
  if (!unlockGate.unlocked) {
    unlockGate.unlock();
    void audioContext.resume().catch(() => {});
  }
  return meteredPlayer;
}

function pop(): void {
  meteredPlayer?.play({ delay: 0, duration: 0.15, frequency: 660, gain: 0.22, type: 'sine' });
}

function commit(next: AppState): void {
  app = next;
  saveSave(localStorage, app.save);
}

/** Level-art cache: loaded files by bundle URL, with one in-flight load each. */
const artCache = new Map<string, HTMLImageElement>();
const artPending = new Set<string>();

function preloadArt(url: string): void {
  if (artCache.has(url) || artPending.has(url)) {
    return;
  }
  artPending.add(url);
  void loadArtImage(url).then((image) => {
    artPending.delete(url);
    if (image) {
      artCache.set(url, image);
    }
  });
}

/** Art refs for the active session's level; null once the session hands off. */
let levelArtUrls: { backdrop: string; goal: string; sticker?: string } | null = null;

function packBadgeArt(): HTMLImageElement | null {
  const url = '/art/pack/badge.png';
  preloadArt(url);
  return artCache.get(url) ?? null;
}

function currentLevelArt(): LevelArt {
  if (!levelArtUrls) {
    return NO_LEVEL_ART;
  }
  return {
    backdrop: artCache.get(levelArtUrls.backdrop) ?? null,
    goal: artCache.get(levelArtUrls.goal) ?? null,
    sticker: levelArtUrls.sticker ? (artCache.get(levelArtUrls.sticker) ?? null) : null,
  };
}

function hideCharacter(): void {
  character?.dispose();
  character = null;
  charCanvas.style.display = 'none';
}

function enterLevel(themeId: string, levelId: string): void {
  const entry = themeEntry(themeId);
  const level =
    entry?.mainLevels.find((candidate) => candidate.id === levelId) ??
    (entry?.bonus.id === levelId ? entry.bonus : undefined);
  if (!entry || !level) {
    return;
  }
  const mainIds = entry.mainLevels.map((candidate) => candidate.id);
  if (entry.bonus.id === levelId && !isBonusOpen(app.save, themeId, mainIds)) {
    return;
  }
  const player = ensureAudio();
  if (!player) {
    return;
  }
  commit(applyAppEvent(app, { type: 'open-level', themeId, levelId }));
  if (app.screen.name !== 'level') {
    return;
  }
  const seed = 7 + mainIds.indexOf(levelId) * 13;
  startRun(
    level,
    { backdrop: entry.theme.backdrop, goal: level.goalArt },
    entry.theme.character,
    seed,
    themeId,
    levelId,
    player,
  );
}

/** Shared level boot: art preload, mascot swap, and the tracing session. */
function startRun(
  level: LevelDef,
  art: { backdrop: string; goal: string; sticker?: string },
  characterName: string,
  seed: number,
  themeId: string,
  levelId: string,
  player: TonePlayer,
  hopPlan?: HopTimeline,
): void {
  levelArtUrls = art;
  if (art.backdrop) {
    preloadArt(art.backdrop);
  }
  preloadArt(art.goal);
  if (art.sticker) {
    preloadArt(art.sticker);
  }
  hideCharacter();
  charCanvas.style.display = 'block';
  character = loadCharacter({
    canvas: charCanvas,
    riveFactory: canvasLiteFactory,
    src: `/rive/${characterName}.riv`,
    stateMachine: 'State Machine 1',
  });
  session = createSession(level, {
    character: {
      fire: (trigger) => character?.fire(trigger) ?? false,
    },
    hopPlan,
    onEvent: (event) => {
      if (event.type === 'level-done' && session) {
        commit(applyAppEvent(app, { type: 'level-complete', themeId, levelId }));
      }
    },
    player,
    seed,
    settings: () => ({ easierTracing: app.save.settings.easierTracing }),
  });
}

/** Numerals run the shared level flow with the star guide and counted hops. */
function enterNumeral(numeralId: string): void {
  const level = NUMERAL_LEVELS.find((candidate) => candidate.id === numeralId);
  if (!level) {
    return;
  }
  const player = ensureAudio();
  if (!player) {
    return;
  }
  commit(applyAppEvent(app, { type: 'open-level', themeId: NUMBERS_PACK.id, levelId: numeralId }));
  if (app.screen.name !== 'level') {
    return;
  }
  const count = Number.parseInt(numeralId.slice('num-'.length), 10);
  const hopPlan = Number.isNaN(count) ? undefined : hopTimeline(count);
  const seed = 7 + NUMERIC_IDS.indexOf(numeralId) * 13;
  startRun(
    level,
    { backdrop: '', goal: level.goalArt, sticker: `/art/sticker/${numeralId}.png` },
    'star',
    seed,
    NUMBERS_PACK.id,
    numeralId,
    player,
    hopPlan,
  );
}

function enterScreenLevel(themeId: string, levelId: string): void {
  if (themeId === NUMBERS_PACK.id) {
    enterNumeral(levelId);
  } else {
    enterLevel(themeId, levelId);
  }
}

const handlers: TraceHandlers = {
  onDown: (point) => {
    ensureAudio();
    const screen = app.screen;
    if (screen.name === 'splash') {
      commit(applyAppEvent(app, { type: 'splash-tap' }));
      pop();
    } else if (screen.name === 'menu') {
      const cardId = hitMenuCard(MENU, point);
      if (cardId === NUMBERS_PACK.id) {
        commit(applyAppEvent(app, { type: 'open-pack' }));
        pop();
      } else if (cardId) {
        commit(applyAppEvent(app, { type: 'open-theme', themeId: cardId }));
        pop();
      }
    } else if (screen.name === 'pack') {
      const numeralId = hitPackCard(PACK, point);
      if (numeralId) {
        enterNumeral(numeralId);
        return;
      }
      if (hitPackHome(PACK, point)) {
        commit(applyAppEvent(app, { type: 'pack-back' }));
        pop();
      }
    } else if (screen.name === 'theme') {
      const entry = themeEntry(screen.themeId);
      const layout = themeLayout(
        FIELD_WIDTH,
        FIELD_HEIGHT,
        entry?.mainLevels.map((level) => level.id) ?? [],
      );
      const levelId = hitThemeCard(layout, point);
      if (levelId) {
        enterLevel(screen.themeId, levelId);
        return;
      }
      if (hitThemeHome(layout, point)) {
        commit(applyAppEvent(app, { type: 'theme-back' }));
        pop();
        return;
      }
      if (entry) {
        const distance = Math.hypot(point.x - layout.badge.x, point.y - layout.badge.y);
        const mainIds = entry.mainLevels.map((level) => level.id);
        if (distance <= layout.badge.radius + 8 && isBonusOpen(app.save, screen.themeId, mainIds)) {
          enterLevel(screen.themeId, entry.bonus.id);
        }
      }
    } else if (screen.name === 'level' || screen.name === 'success') {
      if (!session) {
        return;
      }
      if (session.success) {
        const action = hitSuccessButton(SUCCESS, point);
        if (action) {
          const { themeId, levelId } = screen;
          commit(applyAppEvent(app, { type: 'success-action', action, themeId, levelId }));
          pop();
          const next = app.screen;
          if (next.name === 'level') {
            enterScreenLevel(next.themeId, next.levelId);
          } else if (next.name !== 'success') {
            hideCharacter();
            session = null;
            levelArtUrls = null;
          }
        }
        return;
      }
      session.pointerDown(point);
    } else if (screen.name === 'badge') {
      const homeDistance = Math.hypot(point.x - BADGE_HOME.x, point.y - BADGE_HOME.y);
      if (homeDistance <= BADGE_HOME.radius) {
        commit(applyAppEvent(app, { type: 'badge-exit' }));
        pop();
        return;
      }
      if (screen.themeId === NUMBERS_PACK.id) {
        commit(applyAppEvent(app, { type: 'badge-tap', themeId: screen.themeId }));
        pop();
        return;
      }
      const entry = themeEntry(screen.themeId);
      if (entry) {
        enterLevel(screen.themeId, entry.bonus.id);
      }
    } else if (screen.name === 'parent') {
      const action = hitParentZone(PARENT, point);
      if (action) {
        commit(applyAppEvent(app, { type: 'parent-action', action }));
        if (action !== 'done') {
          pop();
        }
      }
    }
  },
  onMove: (point) => {
    if (
      (app.screen.name === 'level' || app.screen.name === 'success') &&
      session &&
      !session.success
    ) {
      session.pointerMove(point);
    }
  },
  onUp: () => {
    if (app.screen.name === 'level' || app.screen.name === 'success') {
      session?.pointerUp();
    }
  },
};

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const size = computeBackingSize(window.innerWidth, window.innerHeight, dpr);
  trailCanvas.width = size.width;
  trailCanvas.height = size.height;
  field = fitRect(window.innerWidth, window.innerHeight, FIELD_WIDTH, FIELD_HEIGHT);
  detachInput();
  detachInput = attachTraceInput(trailCanvas, field, handlers);
}

// Two-finger hold in the menu corner opens the parent zone. Tracing ignores
// non-primary pointers, so this raw listener tracks them separately.
trailCanvas.addEventListener('pointerdown', (event) => {
  const point = mapPointerToField(event.clientX, event.clientY, field);
  if (point && app.screen.name === 'menu' && inParentGate(MENU, point)) {
    gatePointers.add(event.pointerId);
  }
});
const releaseGatePointer = (event: PointerEvent): void => {
  gatePointers.delete(event.pointerId);
};
trailCanvas.addEventListener('pointerup', releaseGatePointer);
trailCanvas.addEventListener('pointercancel', releaseGatePointer);

function frame(now: number): void {
  const dtMs = Math.min(now - lastTime, 50);
  lastTime = now;
  if (app.screen.name === 'menu') {
    const step = stepParentGate(gateState, gatePointers.size >= 2, dtMs);
    gateState = step.state;
    if (step.opened) {
      gatePointers.clear();
      commit(applyAppEvent(app, { type: 'parent-open' }));
    }
  } else if (gateState !== PARENT_GATE_START) {
    gateState = PARENT_GATE_START;
  }
  if ((app.screen.name === 'level' || app.screen.name === 'success') && session) {
    session.update(dtMs);
  }
  render(now);
  requestAnimationFrame(frame);
}

function render(now: number): void {
  const dpr = window.innerWidth > 0 ? trailCanvas.width / window.innerWidth : 1;
  beginField(trailContext, trailCanvas.width, trailCanvas.height, field, dpr);
  const screen = app.screen;
  if (screen.name === 'splash') {
    drawSplash(trailContext, now, SPLASH);
  } else if (screen.name === 'menu') {
    const cardUrl = '/art/pack/card.png';
    preloadArt(cardUrl);
    drawMenu(trailContext, MENU, MENU_FILLS, {
      image: artCache.get(cardUrl) ?? null,
      cleared: NUMERIC_IDS.filter((id) => app.save.completedLevels.includes(id)).length,
      total: NUMERIC_IDS.length,
      badge: app.save.badges.includes(NUMBERS_PACK.badgeId),
    });
  } else if (screen.name === 'theme') {
    const entry = themeEntry(screen.themeId);
    const mainIds = entry?.mainLevels.map((level) => level.id) ?? [];
    const levels = entry ? [...entry.mainLevels, entry.bonus] : [];
    for (const level of levels) {
      preloadArt(level.goalArt);
    }
    const goalImages = new Map<string, HTMLImageElement>();
    for (const level of levels) {
      const image = artCache.get(level.goalArt);
      if (image) {
        goalImages.set(level.id, image);
      }
    }
    drawTheme(
      trailContext,
      now,
      themeLayout(FIELD_WIDTH, FIELD_HEIGHT, mainIds),
      themeStickers(app.save, mainIds),
      (app.save.badges ?? []).includes(screen.themeId),
      app.pendingBadge === screen.themeId,
      miniPaths(screen.themeId),
      goalImages,
    );
  } else if (screen.name === 'pack') {
    const stickerImages = new Map<string, HTMLImageElement>();
    for (const numeral of NUMERAL_LEVELS) {
      const url = `/art/sticker/${numeral.id}.png`;
      preloadArt(url);
      const image = artCache.get(url);
      if (image) {
        stickerImages.set(numeral.id, image);
      }
    }
    drawPack(
      trailContext,
      now,
      PACK,
      packStickers(app.save, NUMERIC_IDS),
      app.save.badges.includes(NUMBERS_PACK.badgeId),
      app.pendingBadge === NUMBERS_PACK.id,
      NUMERAL_MINI,
      stickerImages,
      packBadgeArt(),
    );
  } else if (screen.name === 'level' && session) {
    const snap = session.snapshot();
    drawLevel(trailContext, now, snap, currentLevelArt());
    if (session.success) {
      drawSuccess(trailContext, SUCCESS);
    }
  } else if (screen.name === 'success' && session) {
    // Level completed but the session already handed off (e.g. after a
    // settings round-trip): keep the frozen tableau behind the buttons.
    drawLevel(trailContext, now, session.snapshot(), currentLevelArt());
    drawSuccess(trailContext, SUCCESS);
  } else if (screen.name === 'badge') {
    drawBadge(trailContext, now, screen.themeId === NUMBERS_PACK.id ? packBadgeArt() : null);
  } else if (screen.name === 'parent') {
    drawParent(trailContext, PARENT, app.save.settings, screen.confirmReset, screen.showInstall);
  }
  endField(trailContext);
  if ((screen.name === 'level' || screen.name === 'success') && session) {
    const charSize = field.width * CHARACTER_SCALE;
    if (charCanvas.style.width !== `${charSize}px`) {
      charCanvas.style.width = `${charSize}px`;
      charCanvas.style.height = `${charSize}px`;
      character?.resize();
    }
    const charPos = session.snapshot().charPos;
    const cssX = field.x + (charPos.x / FIELD_WIDTH) * field.width;
    const cssY =
      field.y + (charPos.y / FIELD_HEIGHT) * field.height + charSize * CHARACTER_OFFSET_Y;
    charCanvas.style.transform = `translate(${cssX - charSize / 2}px, ${cssY - charSize / 2}px)`;
  } else if (charCanvas.style.display !== 'none') {
    charCanvas.style.display = 'none';
  }
}

declare global {
  interface Window {
    __app?: {
      readonly field: () => Rect;
      readonly path: () => readonly Point[];
      readonly screen: () => AppState['screen'];
      readonly strokes: () => readonly (readonly Point[])[];
      readonly success: () => boolean;
      readonly targets: () => readonly {
        readonly id: string;
        readonly x: number;
        readonly y: number;
      }[];
    };
  }
}

interface AppTarget {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

function screenTargets(): AppTarget[] {
  const screen = app.screen;
  if (screen.name === 'splash') {
    return [{ id: 'splash', x: SPLASH.centerX, y: SPLASH.centerY }];
  }
  if (screen.name === 'menu') {
    const cards = MENU.cards.map((card) => ({
      id: card.themeId === NUMBERS_PACK.id ? 'pack' : `theme:${card.themeId}`,
      x: card.x + card.width / 2,
      y: card.y + card.height / 2,
    }));
    const gate = MENU.parentGate;
    return [...cards, { id: 'gate', x: gate.x + gate.width / 2, y: gate.y + gate.height / 2 }];
  }
  if (screen.name === 'pack') {
    return [
      ...PACK.cards.map((card) => ({
        id: `numeral:${card.numeralId}`,
        x: card.x + card.width / 2,
        y: card.y + card.height / 2,
      })),
      { id: 'pack:home', x: PACK.home.x, y: PACK.home.y },
    ];
  }
  if (screen.name === 'theme') {
    const entry = themeEntry(screen.themeId);
    const layout = themeLayout(
      FIELD_WIDTH,
      FIELD_HEIGHT,
      entry?.mainLevels.map((level) => level.id) ?? [],
    );
    return [
      ...layout.cards.map((card) => ({
        id: `level:${card.levelId}`,
        x: card.x + card.width / 2,
        y: card.y + card.height / 2,
      })),
      { id: `bonus:${screen.themeId}`, x: layout.badge.x, y: layout.badge.y },
      { id: 'theme:home', x: layout.home.x, y: layout.home.y },
    ];
  }
  if (screen.name === 'success') {
    return SUCCESS.buttons.map((button) => ({
      id: `success:${button.action}`,
      x: button.x,
      y: button.y,
    }));
  }
  if (screen.name === 'badge') {
    return [
      { id: `bonus:${screen.themeId}`, x: BADGE_SEAL.x, y: BADGE_SEAL.y },
      { id: 'badge:home', x: BADGE_HOME.x, y: BADGE_HOME.y },
    ];
  }
  if (screen.name === 'parent') {
    const buttons = [
      PARENT.volumeDown,
      PARENT.volumeUp,
      PARENT.mute,
      PARENT.easier,
      PARENT.reset,
      PARENT.install,
      PARENT.done,
    ];
    return buttons.map((button) => ({ id: `parent:${button.action}`, x: button.x, y: button.y }));
  }
  return [];
}

window.__app = {
  field: () => ({ ...field }),
  path: () => (session ? (session.snapshot().multi.strokes[0]?.points ?? []) : []),
  screen: () => app.screen,
  strokes: () => (session ? session.snapshot().multi.strokes.map((stroke) => stroke.points) : []),
  success: () => session?.success ?? false,
  targets: () => screenTargets(),
};

window.addEventListener('resize', resize);
hideCharacter();
resize();
requestAnimationFrame(frame);
