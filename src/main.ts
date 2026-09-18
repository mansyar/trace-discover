// Production boot: wires the single canvas + mascot canvas to the app state
// machine, the level session runtime, volume-aware audio, and the Rive
// character. Primary pointers drive tracing via attachTraceInput (palm
// rejection included); a separate raw listener tracks the parent-gate hold
// (one finger, started in the menu corner).
import './style.css';

import {
  type AppState,
  applyAppEvent,
  packLevelIds,
  shouldPulseStickerShelf,
  shouldShowParentHint,
  startApp,
} from './app/app';
import { loadArtImage } from './app/art';
import { menuCardArtUrl, packBadgeArtUrl } from './app/packArt';
import {
  beginField,
  drawBadge,
  drawLevel,
  drawMenu,
  drawNameOverlay,
  drawPack,
  drawParent,
  drawParticles,
  drawSkinButton,
  drawSplash,
  drawStickerBoard,
  drawStickerPop,
  drawSuccess,
  endField,
  GOLD,
  type LevelArt,
  NO_LEVEL_ART,
  type PackMenuArt,
  type ParentPress,
} from './app/render';
import { hopPlanFor } from './app/runPlan';
import { createSession, type LevelSession } from './app/session';
import { levelPresentation, shouldDeferSkinSwap } from './app/skinSwap';
import { stickerPopFrame } from './app/stickerPop';
import { withVolume } from './audio/meter';
import { createTonePlayer } from './audio/player';
import type { TonePlayer } from './audio/synth';
import {
  createUnlockGate,
  giggleNoteSpec,
  playStickerNote,
  playVolumePreview,
  presetForInstrument,
} from './audio/synth';
import { canvasLiteFactory } from './character/adapter';
import { type Character, loadCharacter } from './character/character';
import {
  createEntrance,
  type EntranceState,
  type EntranceTimeline,
  entrancePos,
  entranceStart,
  settleEntrance,
  stepEntrance,
} from './character/entrance';
import type { HopTimeline } from './character/hops';
import type { Point } from './engine/types';
import { fieldSizeFor, type Orientation, orientationFor } from './field';
import { attachTraceInput, mapPointerToField, type TraceHandlers } from './input/pointer';
import { appPacks } from './packs/catalog';
import { bonusRunLevel } from './packs/letters';
import { type LevelDef, levelToPath } from './packs/level';
import { NAME_PACK_ID } from './packs/name';
import type { PackEntry } from './packs/pack';
import { firstUnlockedBonusId } from './packs/progress';
import { levelForOrientation, pathGeometryLength } from './packs/wide';
import { type ConfettiParticle, createConfetti, stepConfetti } from './render/confetti';
import { acquireSaveStorage, requestPersistence } from './save/storage';
import { loadSave, MAX_NAME_LENGTH, saveSave } from './save/store';
import { require2dContext, requireCanvas } from './shell/boot';
import { computeBackingSize, fitRect, type Rect } from './shell/layout';
import { SKINS, type SkinDef, skinById } from './skins/skins';
import { badgeLayout } from './ui/badge';
import { type InstallVariant, installVariant } from './ui/install';
import {
  canGiggle,
  hitMascot,
  MASCOT_SPARKLE_COUNT,
  MASCOT_SPARKLE_SEED,
  mascotZone,
} from './ui/mascot';
import {
  hitMenuCard,
  hitMenuPager,
  inParentGate,
  menuLayout,
  menuPageCount,
  menuParkPosition,
  splashLayout,
} from './ui/menu';
import {
  hitPackCard,
  hitPackHome,
  hitPackPager,
  initialPackPage,
  type PackLayout,
  type PackLayoutOptions,
  type PackPager,
  packLayout,
  packPagerLayout,
  packParkPosition,
  packStickers,
  paginate,
} from './ui/pack';
import { holdProgress, PARENT_GATE_START, type ParentGateState, stepParentGate } from './ui/parent';
import {
  hitNameOverlay,
  hitParentZone,
  type NameOverlayLayout,
  nameOverlayLayout,
  parentZoneLayout,
} from './ui/parentZone';
import { canCycleSkin, hitSkinButton, skinButtonLayout } from './ui/skinButton';
import { hitBoardHome, hitShelfBand, hitStickerCell, stickerBoardLayout } from './ui/stickerBoard';
import { hitSuccessButton, successLayout } from './ui/success';

const CHARACTER_SCALE = 0.62;
/** Wide-field mascot parks: tracing keeps the dino low and centred; success parks it beside the buttons. */
const TRACE_PARK_WIDE: Point = { x: 430, y: 310 };
const SUCCESS_PARK_WIDE: Point = { x: 805, y: 250 };
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

// Pack views: the static packs plus the runtime name mini-pack while a name
// is saved. Rebuilt whenever the saved name changes or the field resizes.
interface PackGridConfig extends PackLayoutOptions {
  readonly landscape?: PackLayoutOptions;
  readonly pages?: readonly number[];
}
const PACK_GRID: Readonly<Record<string, PackGridConfig>> = {
  abc: {
    cardSize: 90,
    columns: 4,
    landscape: { cardSize: 90, columns: 7, slotsPerRow: 14 },
    pages: [12, 14],
    slotsPerRow: 7,
  },
  name: { slotsPerRow: 1 }, // one shelf slot, centered under the solo card
  numbers: { landscape: { cardSize: 90, columns: 5, slotsPerRow: 10 } },
  pre: { columns: 3, landscape: { cardSize: 90, columns: 6, slotsPerRow: 12 }, slotsPerRow: 6 },
  shapes: { landscape: { cardSize: 90, columns: 5, slotsPerRow: 10 } },
};

let PACKS: readonly PackEntry[] = [];
let space = fieldSizeFor('portrait');
let orientation: Orientation = 'portrait';
let MENU = menuLayout(space.width, space.height, []);
let MENU_FILLS: readonly string[] = [];
/** Current menu page (zero-based) when the pack count paginates; 0 otherwise. */
let menuPage = 0;
let PACK_PAGE_IDS = new Map<string, readonly (readonly string[])[]>();
let PACK_LAYOUTS = new Map<string, readonly PackLayout[]>();
let PACK_PAGERS = new Map<string, PackPager | null>();
let PACK_MINIS = new Map<string, ReadonlyMap<string, readonly (readonly Point[])[]>>();

function rebuildViews(): void {
  space = fieldSizeFor(orientation);
  PACKS = appPacks(app.save, orientation);
  const paginated = menuPageCount(PACKS.length) > 1;
  menuPage = Math.min(Math.max(menuPage, 0), menuPageCount(PACKS.length) - 1);
  MENU = menuLayout(
    space.width,
    space.height,
    PACKS.map((pack) => pack.id),
    menuPage,
  );
  MENU_FILLS = MENU.cards.map(
    (card) => PACKS.find((pack) => pack.id === card.packId)?.menuFill ?? '#ffffff',
  );
  PACK_PAGE_IDS = new Map(
    PACKS.map((pack) => {
      const levelIds = pack.levels.map((level) => level.id);
      const sizes = PACK_GRID[pack.id]?.pages ?? [levelIds.length];
      return [pack.id, paginate(levelIds, sizes)] as const;
    }),
  );
  PACK_LAYOUTS = new Map(
    PACKS.map(
      (pack) =>
        [
          pack.id,
          (PACK_PAGE_IDS.get(pack.id) ?? []).map((levelIds) => {
            const grid = PACK_GRID[pack.id];
            const options = orientation === 'landscape' && grid?.landscape ? grid.landscape : grid;
            return packLayout(space.width, space.height, levelIds, options);
          }),
        ] as const,
    ),
  );
  PACK_PAGERS = new Map(
    PACKS.map((pack) => {
      const pageCount = PACK_LAYOUTS.get(pack.id)?.length ?? 0;
      return [
        pack.id,
        pageCount > 1 ? packPagerLayout(space.width, space.height, pageCount) : null,
      ] as const;
    }),
  );
  PACK_MINIS = new Map(
    PACKS.map(
      (pack) =>
        [
          pack.id,
          new Map(pack.levels.map((level) => [level.id, levelToPath(level)] as const)),
        ] as const,
    ),
  );
  SUCCESS = successLayout(space.width, space.height);
  SPLASH = splashLayout(space.width, space.height);
  PARENT = parentZoneLayout(space.width, space.height);
  BADGE = badgeLayout(space.width, space.height);
  MENU_PARK = menuParkPosition(space.width, space.height, paginated);
  PACK_PARK = packParkPosition(space.width, space.height);
}
let SUCCESS = successLayout(space.width, space.height);
let SPLASH = splashLayout(space.width, space.height);
let PARENT = parentZoneLayout(space.width, space.height);
let BADGE = badgeLayout(space.width, space.height);
const SKIN_BUTTON = skinButtonLayout();
/** Child screens that show the tap-to-cycle skin switch. */
const SKIN_BUTTON_SCREENS: ReadonlySet<string> = new Set([
  'menu',
  'pack',
  'level',
  'success',
  'badge',
]);
/** Idle mascot parking + scale on menu/pack (pack parks beside the grid in landscape). */
const MASCOT_SCALE_MENU = 0.32;
const MASCOT_SCALE_PACK = 0.26;
let MENU_PARK: Point = menuParkPosition(space.width, space.height);
let PACK_PARK: Point = packParkPosition(space.width, space.height);
/** How long a giggle sparkle burst lives before frame() clears it. */
const GIGGLE_SPARKLES_MS = 1200;
/** Gate burst particles live ~0.7s after the parent gate opens. */
const GATE_BURST_MS = 700;

// Storage is acquired once; denied or unavailable storage falls back to
// memory so the app still boots and plays (progress just is not persisted).
const saveStorage = acquireSaveStorage();
requestPersistence();
let app: AppState = startApp(loadSave(saveStorage));
rebuildViews();
let session: LevelSession | null = null;
let character: Character | null = null;
let field: Rect = fitRect(1, 1, space.width, space.height);
let gateState: ParentGateState = PARENT_GATE_START;
const gatePointers = new Set<number>();
let detachInput = (): void => {};
let lastTime = performance.now();
let lastSkinTap: number | null = null;
let skinPoofAt: number | null = null;
let currentRun: {
  level: LevelDef;
  runLevel: LevelDef;
  packId: string;
  levelId: string;
} | null = null;
let pendingSkinSwap = false;
let idleCharFor: string | null = null;
// Board pop bookkeeping: a fresh sticker moment (new object identity from the
// state machine) restarts the pop clock that the rAF spring reads.
let lastMoment: AppState['stickerMoment'] = null;
let momentStartedAt = 0;
let lastGiggle: number | null = null;
let mascotSparkles: ConfettiParticle[] = [];
let mascotSparklesUntil = 0;
let entrance: { timeline: EntranceTimeline; state: EntranceState } | null = null;
let gateBurst: readonly ConfettiParticle[] = [];
let gateBurstAgeMs = 0;
let parentPress: ParentPress | null = null;

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

/** Parents hear the level they just set, in the active skin's voice. */
function previewVolumeNote(): void {
  const player = ensureAudio();
  if (!player) {
    return;
  }
  playVolumePreview(player, presetForInstrument(activeSkin().instrument));
}

/** Install-guide variant; display-mode can only change across relaunches. */
const INSTALL_VARIANT: InstallVariant = installVariant({
  maxTouchPoints: navigator.maxTouchPoints,
  standalone:
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari-only property, absent from lib.dom.
    (navigator as { standalone?: boolean }).standalone === true,
  userAgent: navigator.userAgent,
});

/** Lazily-created DOM field for the parent-set name (child screens never see it). */
let nameInput: HTMLInputElement | null = null;

function currentNameOverlay(): NameOverlayLayout {
  return nameOverlayLayout(space.width, space.height, app.save.name !== undefined);
}

function ensureNameInput(): HTMLInputElement {
  if (nameInput) {
    return nameInput;
  }
  const input = document.createElement('input');
  input.className = 'name-input';
  input.type = 'text';
  input.autocomplete = 'off';
  input.autocapitalize = 'characters';
  input.spellcheck = false;
  input.maxLength = MAX_NAME_LENGTH;
  input.enterKeyHint = 'done';
  input.setAttribute('aria-label', "Child's name");
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      commit(applyAppEvent(app, { type: 'name-set', name: input.value }));
    }
  });
  document.body.appendChild(input);
  nameInput = input;
  return input;
}

function positionNameInput(): void {
  if (!nameInput?.classList.contains('is-open')) {
    return;
  }
  const overlay = currentNameOverlay();
  const scale = field.width / space.width;
  nameInput.style.left = `${field.x + overlay.field.x * scale}px`;
  nameInput.style.top = `${field.y + overlay.field.y * scale}px`;
  nameInput.style.width = `${overlay.field.width * scale}px`;
  nameInput.style.height = `${overlay.field.height * scale}px`;
  nameInput.style.fontSize = `${Math.round(overlay.field.height * scale * 0.55)}px`;
}

/** Shows / hides the DOM field with the overlay screen state. */
function syncNameInput(): void {
  const screen = app.screen;
  const open = screen.name === 'parent' && screen.showName;
  if (!open) {
    if (nameInput) {
      nameInput.classList.remove('is-open');
      nameInput.blur();
    }
    return;
  }
  const input = ensureNameInput();
  if (!input.classList.contains('is-open')) {
    input.value = app.save.name ?? '';
    input.classList.add('is-open');
    input.focus({ preventScroll: true });
  }
  positionNameInput();
}

/** Pack screen page state; landing page resets every time a pack opens. */
let packPage = 0;

function packPageIndex(packId: string): number {
  const pageCount = PACK_LAYOUTS.get(packId)?.length ?? 0;
  return Math.min(Math.max(packPage, 0), Math.max(0, pageCount - 1));
}

function packLandingPage(packId: string): number {
  const pages = PACK_PAGE_IDS.get(packId) ?? [];
  return initialPackPage(
    pages.flat(),
    app.save.completedLevels,
    pages.map((page) => page.length),
  );
}

/** Board view for a pack: ordered ids + the pure single-screen layout. */
function boardView(packId: string) {
  const pack = PACKS.find((candidate) => candidate.id === packId);
  if (!pack) {
    return null;
  }
  const ids = packLevelIds(pack);
  return { ids, layout: stickerBoardLayout(space.width, space.height, ids) };
}

function commit(next: AppState): void {
  const previous = app.screen;
  const nameChanged = next.save.name !== app.save.name;
  app = next;
  if (nameChanged) {
    rebuildViews();
  }
  const screen = app.screen;
  if (screen.name === 'pack' && (previous.name !== 'pack' || previous.packId !== screen.packId)) {
    packPage = packLandingPage(screen.packId);
  }
  if (screen.name === 'menu' && previous.name !== 'menu' && menuPage !== 0) {
    menuPage = 0;
    rebuildViews();
  }
  saveSave(saveStorage, app.save);
  syncNameInput();
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

// Face icons for the skin button; missing files (pre-Phase-4) fall back to a drawn face.
for (const skin of SKINS) {
  preloadArt(skin.face);
}

/** Art refs for the active session's level; null once the session hands off. */
let levelArtUrls: { backdrop: string; goal: string; sticker?: string } | null = null;

function packBadgeArt(packId: string): HTMLImageElement | null {
  const url = packBadgeArtUrl(packId);
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
  idleCharFor = null;
  charCanvas.style.display = 'none';
}

/** The persisted skin; falls back to the first registry entry. */
function activeSkin(): SkinDef {
  const skin = skinById(app.save.settings.skin);
  if (skin) {
    return skin;
  }
  const fallback = SKINS[0];
  if (!fallback) {
    throw new Error('The skin registry is empty.');
  }
  return fallback;
}

/** Loads (or reuses) the character sprite for a skin; reused across menu <-> pack. */
function ensureCharacter(name: string, forceReload = false): void {
  if (!forceReload && character && idleCharFor === name) {
    charCanvas.style.display = 'block';
    return;
  }
  hideCharacter();
  charCanvas.style.display = 'block';
  character = loadCharacter({
    canvas: charCanvas,
    riveFactory: canvasLiteFactory,
    src: `/rive/${name}.riv`,
    stateMachine: 'State Machine 1',
  });
  idleCharFor = name;
}

/** Places the mascot canvas: field-space park point + character scale. */
function positionCharacter(park: Point, scale: number): void {
  // Relative to the short edge so mascots keep their portrait size in the wide field.
  const charSize = Math.min(field.width, field.height) * scale;
  if (charCanvas.style.width !== `${charSize}px`) {
    charCanvas.style.width = `${charSize}px`;
    charCanvas.style.height = `${charSize}px`;
    character?.resize();
  }
  const cssX = field.x + (park.x / space.width) * field.width;
  const cssY = field.y + (park.y / space.height) * field.height + charSize * CHARACTER_OFFSET_Y;
  charCanvas.style.transform = `translate(${cssX - charSize / 2}px, ${cssY - charSize / 2}px)`;
}

/** Re-resolves the running level against the active skin after a swap. */
function reloadLevelSkin(): void {
  if (!session || !currentRun) {
    return;
  }
  const presentation = levelPresentation(activeSkin(), currentRun.level);
  levelArtUrls = presentation;
  preloadArt(presentation.backdrop);
  preloadArt(presentation.goal);
  preloadArt(presentation.sticker);
  ensureCharacter(presentation.character, true);
}

/** Menu + pack screens show the active skin's character idling ("parked"). */
function syncIdleMascot(): void {
  const screen = app.screen;
  if (screen.name === 'menu' || screen.name === 'pack') {
    ensureCharacter(activeSkin().character);
    return;
  }
  if (screen.name === 'splash' || screen.name === 'badge' || screen.name === 'parent') {
    if (character) {
      hideCharacter();
    }
  }
}

/** Opens any level (main or circle) of a pack under the active skin. */
function enterPackLevel(packId: string, levelId: string): void {
  const pack = PACKS.find((candidate) => candidate.id === packId);
  const level = pack
    ? [...pack.levels, ...pack.bonuses].find((candidate) => candidate.id === levelId)
    : undefined;
  if (!pack || !level) {
    return;
  }
  const player = ensureAudio();
  if (!player) {
    return;
  }
  commit(applyAppEvent(app, { type: 'open-level', packId, levelId }));
  if (app.screen.name !== 'level') {
    return;
  }
  const skin = activeSkin();
  const index = pack.levels.findIndex((candidate) => candidate.id === levelId);
  const seed = 7 + (index >= 0 ? index : pack.levels.length) * 13;
  const presentation = levelPresentation(skin, level);
  startRun(
    level,
    presentation,
    presentation.character,
    seed,
    packId,
    levelId,
    player,
    hopPlanFor(packId, levelId, level.strokes.length),
  );
}

/** Shared level boot: art preload, mascot swap, and the tracing session. */
function startRun(
  level: LevelDef,
  art: { backdrop: string; goal: string; sticker?: string },
  characterName: string,
  seed: number,
  packId: string,
  levelId: string,
  player: TonePlayer,
  hopPlan?: HopTimeline,
): void {
  const runLevel = bonusRunLevel(level, orientation) ?? levelForOrientation(level, orientation);
  levelArtUrls = art;
  currentRun = {
    level,
    runLevel,
    packId,
    levelId,
  };
  if (art.backdrop) {
    preloadArt(art.backdrop);
  }
  preloadArt(art.goal);
  if (art.sticker) {
    preloadArt(art.sticker);
  }
  ensureCharacter(characterName, true);
  session = createSession(runLevel, {
    character: {
      fire: (trigger) => character?.fire(trigger) ?? false,
    },
    hopPlan,
    instrument: () => presetForInstrument(activeSkin().instrument),
    onEvent: (event) => {
      if (event.type === 'level-done' && session) {
        commit(applyAppEvent(app, { type: 'level-complete', packId, levelId }));
      }
    },
    parks:
      orientation === 'landscape'
        ? { success: SUCCESS_PARK_WIDE, trace: TRACE_PARK_WIDE }
        : undefined,
    player,
    seed,
    settings: () => ({ easierTracing: app.save.settings.easierTracing }),
  });
  entrance = { timeline: createEntrance(session.snapshot().charPos), state: entranceStart() };
}

/** Tap reaction: the parked mascot giggles (one note + a sparkle burst) on
 *  menu/pack. The character trigger is fire-and-forget; a cast without the
 *  giggle input simply stays idle while the note and sparkles still play. */
function tryGiggle(point: Point, nowMs: number, park: Point, scale: number): void {
  const zone = mascotZone(park, scale);
  if (!hitMascot(zone, point) || !canGiggle(nowMs, lastGiggle)) {
    return;
  }
  lastGiggle = nowMs;
  character?.fire('giggle');
  meteredPlayer?.play(giggleNoteSpec(presetForInstrument(activeSkin().instrument)));
  mascotSparkles = createConfetti(MASCOT_SPARKLE_COUNT, MASCOT_SPARKLE_SEED, {
    x: zone.x,
    y: zone.y,
  });
  mascotSparklesUntil = nowMs + GIGGLE_SPARKLES_MS;
}

const handlers: TraceHandlers = {
  onDown: (point) => {
    ensureAudio();
    const tapNow = performance.now();
    if (SKIN_BUTTON_SCREENS.has(app.screen.name) && hitSkinButton(SKIN_BUTTON, point)) {
      if (canCycleSkin(tapNow, lastSkinTap)) {
        lastSkinTap = tapNow;
        skinPoofAt = tapNow;
        commit(applyAppEvent(app, { type: 'skin-cycle' }));
        pop();
        const cycling = app.screen;
        if ((cycling.name === 'level' || cycling.name === 'success') && session) {
          if (
            shouldDeferSkinSwap({
              completionStarted: session.snapshot().completionStarted,
              success: session.success,
            })
          ) {
            pendingSkinSwap = true;
          } else {
            reloadLevelSkin();
          }
        }
      }
      return;
    }
    const screen = app.screen;
    if (screen.name === 'splash') {
      commit(applyAppEvent(app, { type: 'splash-tap' }));
      pop();
    } else if (screen.name === 'menu') {
      const pagerTap = MENU.pager ? hitMenuPager(MENU.pager, point, menuPage) : null;
      if (pagerTap) {
        menuPage = pagerTap === 'next' ? menuPage + 1 : menuPage - 1;
        rebuildViews();
        pop();
        return;
      }
      const packId = hitMenuCard(MENU, point);
      if (packId) {
        commit(applyAppEvent(app, { type: 'open-pack', packId }));
        pop();
      } else {
        tryGiggle(point, tapNow, MENU_PARK, MASCOT_SCALE_MENU);
      }
    } else if (screen.name === 'pack') {
      const page = packPageIndex(screen.packId);
      const layout = PACK_LAYOUTS.get(screen.packId)?.[page];
      if (!layout) {
        return;
      }
      const pager = PACK_PAGERS.get(screen.packId) ?? null;
      const pagerTap = pager ? hitPackPager(pager, point, page) : null;
      if (pagerTap) {
        packPage = pagerTap === 'next' ? page + 1 : page - 1;
        pop();
        return;
      }
      const levelId = hitPackCard(layout, point);
      if (levelId) {
        enterPackLevel(screen.packId, levelId);
        return;
      }
      if (hitPackHome(layout, point)) {
        commit(applyAppEvent(app, { type: 'pack-back' }));
        pop();
        return;
      }
      const pack = PACKS.find((candidate) => candidate.id === screen.packId);
      const badgeDistance = Math.hypot(point.x - layout.badge.x, point.y - layout.badge.y);
      if (
        pack &&
        firstUnlockedBonusId(app.save, pack) !== null &&
        badgeDistance <= layout.badge.radius + 8
      ) {
        commit(applyAppEvent(app, { type: 'badge-tap', packId: screen.packId }));
        const badgeNext = app.screen;
        if (badgeNext.name === 'level') {
          enterPackLevel(badgeNext.packId, badgeNext.levelId);
        } else {
          pop();
        }
      } else {
        tryGiggle(point, tapNow, PACK_PARK, MASCOT_SCALE_PACK);
      }
      if (pack && hitShelfBand(layout, pager, point)) {
        const boardIds = packLevelIds(pack);
        if (packStickers(app.save, boardIds).some(Boolean)) {
          commit(applyAppEvent(app, { type: 'sticker-open', packId: screen.packId }));
          pop();
        }
      }
    } else if (screen.name === 'level' || screen.name === 'success') {
      if (!session) {
        return;
      }
      if (session.success) {
        const action = hitSuccessButton(SUCCESS, point);
        if (action) {
          const { packId, levelId } = screen;
          commit(applyAppEvent(app, { type: 'success-action', action, packId, levelId }));
          pop();
          const next = app.screen;
          if (next.name === 'level') {
            enterPackLevel(next.packId, next.levelId);
          } else if (next.name !== 'success') {
            hideCharacter();
            session = null;
            levelArtUrls = null;
            currentRun = null;
            pendingSkinSwap = false;
            entrance = null;
          }
        }
        return;
      }
      if (entrance && !entrance.state.settled) {
        entrance.state = settleEntrance(entrance.timeline, entrance.state);
      }
      session.pointerDown(point);
    } else if (screen.name === 'badge') {
      const homeDistance = Math.hypot(point.x - BADGE.home.x, point.y - BADGE.home.y);
      if (homeDistance <= BADGE.home.radius) {
        commit(applyAppEvent(app, { type: 'badge-exit' }));
        pop();
        return;
      }
      commit(applyAppEvent(app, { type: 'badge-tap', packId: screen.packId }));
      const next = app.screen;
      if (next.name === 'level') {
        enterPackLevel(next.packId, next.levelId);
      } else {
        pop();
      }
    } else if (screen.name === 'sticker-board') {
      const view = boardView(screen.packId);
      if (!view) {
        return;
      }
      if (hitBoardHome(view.layout, point)) {
        commit(applyAppEvent(app, { type: 'sticker-close' }));
        pop();
        return;
      }
      const stickerId = hitStickerCell(view.layout, point);
      if (stickerId && app.save.completedLevels.includes(stickerId)) {
        commit(applyAppEvent(app, { type: 'sticker-tap', levelId: stickerId }));
        const player = ensureAudio();
        if (player) {
          const ladderIndex = view.ids.indexOf(stickerId);
          playStickerNote(player, ladderIndex, presetForInstrument(activeSkin().instrument));
        }
      }
    } else if (screen.name === 'parent') {
      if (screen.showName) {
        const overlayAction = hitNameOverlay(currentNameOverlay(), point);
        if (overlayAction === 'save') {
          commit(applyAppEvent(app, { type: 'name-set', name: nameInput?.value ?? '' }));
          pop();
        } else if (overlayAction === 'clear') {
          if (nameInput) {
            nameInput.value = '';
          }
          commit(applyAppEvent(app, { type: 'name-clear' }));
          pop();
        } else if (overlayAction === 'cancel') {
          commit(applyAppEvent(app, { type: 'name-close' }));
          pop();
        }
        return;
      }
      const action = hitParentZone(PARENT, point);
      if (action) {
        parentPress = { action, atMs: performance.now() };
        commit(applyAppEvent(app, { type: 'parent-action', action }));
        if (action === 'volume-down' || action === 'volume-up') {
          previewVolumeNote();
        } else if (action !== 'done') {
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

/** Re-lays the running level into the new design space, keeping progress. */
function reflowRun(): void {
  if (!session || !currentRun) {
    return;
  }
  const snapshot = session.snapshot();
  if (session.success || snapshot.completionStarted) {
    return;
  }
  const run = currentRun;
  const pack = PACKS.find((candidate) => candidate.id === run.packId);
  const authored = pack
    ? [...pack.levels, ...pack.bonuses].find((level) => level.id === run.levelId)
    : undefined;
  if (!authored) {
    return;
  }
  const runLevel =
    bonusRunLevel(authored, orientation) ?? levelForOrientation(authored, orientation);
  const span = pathGeometryLength(run.runLevel);
  if (span > 0) {
    session.reflow(runLevel, pathGeometryLength(runLevel) / span);
  }
  currentRun = {
    level: authored,
    runLevel,
    packId: run.packId,
    levelId: run.levelId,
  };
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const size = computeBackingSize(window.innerWidth, window.innerHeight, dpr);
  trailCanvas.width = size.width;
  trailCanvas.height = size.height;
  const next = orientationFor(window.innerWidth, window.innerHeight);
  if (next !== orientation) {
    orientation = next;
    rebuildViews();
    reflowRun();
  }
  field = fitRect(window.innerWidth, window.innerHeight, space.width, space.height);
  detachInput();
  detachInput = attachTraceInput(trailCanvas, field, space, handlers);
  positionNameInput();
}

// One-finger hold in the menu corner opens the parent zone. This raw
// listener tracks pointers that started inside the gate zone.
trailCanvas.addEventListener('pointerdown', (event) => {
  const point = mapPointerToField(event.clientX, event.clientY, field, space);
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
    const step = stepParentGate(gateState, gatePointers.size >= 1, dtMs);
    gateState = step.state;
    if (step.opened) {
      gatePointers.clear();
      const gate = MENU.parentGate;
      gateBurst = stepConfetti(
        createConfetti(14, 41, { x: gate.x + gate.width / 2, y: gate.y + gate.height / 2 }),
        0.12,
      );
      gateBurstAgeMs = 0;
      commit(applyAppEvent(app, { type: 'parent-open' }));
    }
  } else if (gateState !== PARENT_GATE_START) {
    gateState = PARENT_GATE_START;
  }
  if (gateBurst.length > 0) {
    gateBurstAgeMs += dtMs;
    gateBurst = stepConfetti(gateBurst, dtMs / 1000);
    if (gateBurstAgeMs > GATE_BURST_MS) {
      gateBurst = [];
    }
  }
  if ((app.screen.name === 'level' || app.screen.name === 'success') && session) {
    session.update(dtMs);
  }
  if (pendingSkinSwap) {
    if (!session) {
      pendingSkinSwap = false;
    } else {
      const snap = session.snapshot();
      if (
        !shouldDeferSkinSwap({
          completionStarted: snap.completionStarted,
          success: session.success,
        })
      ) {
        pendingSkinSwap = false;
        reloadLevelSkin();
      }
    }
  }
  const moment = app.stickerMoment;
  if (moment && moment !== lastMoment) {
    lastMoment = moment;
    momentStartedAt = now;
  }
  if (entrance && !entrance.state.settled) {
    entrance.state = stepEntrance(entrance.timeline, entrance.state, dtMs);
  }
  if (mascotSparkles.length > 0) {
    if (now >= mascotSparklesUntil) {
      mascotSparkles = [];
    } else {
      mascotSparkles = stepConfetti(mascotSparkles, dtMs / 1000);
    }
  }
  syncIdleMascot();
  render(now);
  requestAnimationFrame(frame);
}

function render(now: number): void {
  const dpr = window.innerWidth > 0 ? trailCanvas.width / window.innerWidth : 1;
  beginField(trailContext, trailCanvas.width, trailCanvas.height, field, space, dpr);
  const screen = app.screen;
  if (screen.name === 'splash') {
    drawSplash(trailContext, now, SPLASH);
  } else if (screen.name === 'menu') {
    const packArts = new Map<string, PackMenuArt>();
    for (const pack of PACKS) {
      const cardUrl = pack.id === NAME_PACK_ID ? null : menuCardArtUrl(pack.id);
      if (cardUrl) {
        preloadArt(cardUrl);
      }
      packArts.set(pack.id, {
        image: cardUrl ? (artCache.get(cardUrl) ?? null) : null,
        cleared: pack.levels.filter((level) => app.save.completedLevels.includes(level.id)).length,
        total: pack.levels.length,
        badge: app.save.badges.includes(pack.badgeId),
      });
    }
    drawMenu(
      trailContext,
      now,
      MENU,
      MENU_FILLS,
      packArts,
      activeSkin().accent,
      app.save.name,
      holdProgress(gateState),
      shouldShowParentHint(app.save),
      MENU.pager ? { page: menuPage, spots: MENU.pager } : null,
    );
  } else if (screen.name === 'pack') {
    const pack = PACKS.find((candidate) => candidate.id === screen.packId);
    const page = packPageIndex(screen.packId);
    const layout = PACK_LAYOUTS.get(screen.packId)?.[page];
    if (pack && layout) {
      const levelIds = layout.cards.map((card) => card.levelId);
      const stickerImages = new Map<string, HTMLImageElement>();
      for (const levelId of levelIds) {
        const url = `/art/sticker/${levelId}.webp`;
        preloadArt(url);
        const image = artCache.get(url);
        if (image) {
          stickerImages.set(levelId, image);
        }
      }
      const pager = PACK_PAGERS.get(screen.packId) ?? null;
      if (shouldPulseStickerShelf(app.save, screen.packId)) {
        const firstSlot = layout.slots[0];
        if (firstSlot) {
          const bandTop = firstSlot.y - firstSlot.radius - 24;
          trailContext.save();
          trailContext.globalAlpha = 0.1 + 0.05 * Math.sin(now / 350);
          trailContext.fillStyle = GOLD;
          trailContext.beginPath();
          trailContext.roundRect(24, bandTop, space.width - 48, space.height - bandTop - 24, 24);
          trailContext.fill();
          trailContext.restore();
        }
      }
      drawPack(
        trailContext,
        now,
        layout,
        packStickers(app.save, levelIds),
        app.save.badges.includes(pack.badgeId),
        app.pendingBadge === pack.badgeId,
        PACK_MINIS.get(pack.id) ?? new Map(),
        stickerImages,
        packBadgeArt(pack.id),
        activeSkin().accent,
        pager ? { page, spots: pager } : null,
      );
    }
  } else if (screen.name === 'sticker-board') {
    const view = boardView(screen.packId);
    if (view) {
      const stickerImages = new Map<string, HTMLImageElement>();
      for (const levelId of view.ids) {
        const url = `/art/sticker/${levelId}.webp`;
        preloadArt(url);
        const image = artCache.get(url);
        if (image) {
          stickerImages.set(levelId, image);
        }
      }
      const skin = activeSkin();
      preloadArt(skin.backdrop);
      drawStickerBoard(
        trailContext,
        view.layout,
        packStickers(app.save, view.ids),
        stickerImages,
        artCache.get(skin.backdrop) ?? null,
        skin.accent,
        space,
      );
      const moment = app.stickerMoment;
      if (moment) {
        const cell = view.layout.cells.find((entry) => entry.levelId === moment.levelId);
        const popFrame = stickerPopFrame(now - momentStartedAt);
        if (cell && !popFrame.done) {
          drawStickerPop(
            trailContext,
            cell,
            stickerImages.get(moment.levelId) ?? null,
            popFrame,
            skin.accent,
          );
        }
      }
    }
  } else if (screen.name === 'level' && session) {
    const snap = session.snapshot();
    drawLevel(trailContext, now, snap, currentLevelArt(), activeSkin(), space);
    if (session.success) {
      drawSuccess(trailContext, SUCCESS, space);
    }
  } else if (screen.name === 'success' && session) {
    // Level completed but the session already handed off (e.g. after a
    // settings round-trip): keep the frozen tableau behind the buttons.
    drawLevel(trailContext, now, session.snapshot(), currentLevelArt(), activeSkin(), space);
    drawSuccess(trailContext, SUCCESS, space);
  } else if (screen.name === 'badge') {
    drawBadge(trailContext, now, BADGE, packBadgeArt(screen.packId));
  } else if (screen.name === 'parent') {
    drawParent(
      trailContext,
      now,
      PARENT,
      app.save.settings,
      screen.confirmReset,
      screen.showInstall,
      activeSkin(),
      artCache.get(activeSkin().face) ?? null,
      app.save.trophies,
      parentPress,
      INSTALL_VARIANT,
      space,
    );
    if (screen.showName) {
      drawNameOverlay(trailContext, currentNameOverlay(), space);
    }
  }
  if (screen.name === 'menu' || screen.name === 'pack') {
    drawMascotSparkles(trailContext);
  }
  if (SKIN_BUTTON_SCREENS.has(screen.name)) {
    const skin = activeSkin();
    drawSkinButton(
      trailContext,
      now,
      SKIN_BUTTON,
      skin,
      artCache.get(skin.face) ?? null,
      skinPoofAt,
    );
  }
  if (gateBurst.length > 0) {
    drawParticles(trailContext, gateBurst);
  }
  endField(trailContext);
  if ((screen.name === 'level' || screen.name === 'success') && session) {
    const charPos =
      entrance && !entrance.state.settled
        ? entrancePos(entrance.timeline, entrance.state)
        : session.snapshot().charPos;
    // The wide field is short: keep the mascot at its portrait share of the height.
    const characterScale = orientation === 'landscape' ? CHARACTER_SCALE / 2 : CHARACTER_SCALE;
    positionCharacter(charPos, characterScale);
  } else if (screen.name === 'menu') {
    positionCharacter(MENU_PARK, MASCOT_SCALE_MENU);
  } else if (screen.name === 'pack') {
    positionCharacter(PACK_PARK, MASCOT_SCALE_PACK);
  } else if (charCanvas.style.display !== 'none') {
    charCanvas.style.display = 'none';
  }
}

/** Draws the giggle sparkles in field space (mirrors the level confetti). */
function drawMascotSparkles(context: CanvasRenderingContext2D): void {
  for (const particle of mascotSparkles) {
    context.save();
    context.translate(particle.x, particle.y);
    context.rotate(particle.x * 0.05 + particle.y * 0.02);
    context.fillStyle = particle.color;
    context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    context.restore();
  }
}

declare global {
  interface Window {
    __app?: {
      readonly field: () => Rect;
      readonly orientation: () => Orientation;
      readonly moment: () => AppState['stickerMoment'];
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
  const skinTarget: AppTarget = { id: 'skin:cycle', x: SKIN_BUTTON.x, y: SKIN_BUTTON.y };
  const screen = app.screen;
  if (screen.name === 'splash') {
    return [{ id: 'splash', x: SPLASH.centerX, y: SPLASH.centerY }];
  }
  if (screen.name === 'menu') {
    const cards = MENU.cards.map((card) => ({
      id: `pack:${card.packId}`,
      x: card.x + card.width / 2,
      y: card.y + card.height / 2,
    }));
    const gate = MENU.parentGate;
    return [
      ...cards,
      { id: 'gate', x: gate.x + gate.width / 2, y: gate.y + gate.height / 2 },
      skinTarget,
    ];
  }
  if (screen.name === 'pack') {
    const page = packPageIndex(screen.packId);
    const layout = PACK_LAYOUTS.get(screen.packId)?.[page];
    if (!layout) {
      return [];
    }
    const pager = PACK_PAGERS.get(screen.packId) ?? null;
    const pagerTargets: AppTarget[] = [];
    if (pager) {
      if (page > 0) {
        pagerTargets.push({ id: 'pager:prev', x: pager.prev.x, y: pager.prev.y });
      }
      if (page < pager.dots.length - 1) {
        pagerTargets.push({ id: 'pager:next', x: pager.next.x, y: pager.next.y });
      }
    }
    return [
      ...layout.cards.map((card) => ({
        id: `level:${card.levelId}`,
        x: card.x + card.width / 2,
        y: card.y + card.height / 2,
      })),
      ...pagerTargets,
      { id: 'pack:badge', x: layout.badge.x, y: layout.badge.y },
      { id: 'pack:home', x: layout.home.x, y: layout.home.y },
      { id: 'pack:shelf', x: space.width / 2, y: space.height - 120 },
      skinTarget,
    ];
  }
  if (screen.name === 'sticker-board') {
    const view = boardView(screen.packId);
    if (!view) {
      return [];
    }
    return [
      { id: 'board:home', x: view.layout.home.x, y: view.layout.home.y },
      ...view.layout.cells.map((cell) => ({
        id: `sticker:${cell.levelId}`,
        x: cell.x,
        y: cell.y,
      })),
    ];
  }
  if (screen.name === 'level') {
    return [skinTarget];
  }
  if (screen.name === 'success') {
    return [
      ...SUCCESS.buttons.map((button) => ({
        id: `success:${button.action}`,
        x: button.x,
        y: button.y,
      })),
      skinTarget,
    ];
  }
  if (screen.name === 'badge') {
    return [
      { id: 'badge:seal', x: BADGE.seal.x, y: BADGE.seal.y },
      { id: 'badge:home', x: BADGE.home.x, y: BADGE.home.y },
      skinTarget,
    ];
  }
  if (screen.name === 'parent') {
    if (screen.showName) {
      const overlay = currentNameOverlay();
      const targets = [
        { id: 'name:save', x: overlay.save.x, y: overlay.save.y },
        { id: 'name:cancel', x: overlay.cancel.x, y: overlay.cancel.y },
      ];
      if (overlay.clear) {
        targets.push({ id: 'name:clear', x: overlay.clear.x, y: overlay.clear.y });
      }
      return targets;
    }
    const buttons = [
      PARENT.volumeDown,
      PARENT.volumeUp,
      PARENT.mute,
      PARENT.easier,
      PARENT.skin,
      PARENT.name,
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
  orientation: () => orientation,
  moment: () => app.stickerMoment,
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
