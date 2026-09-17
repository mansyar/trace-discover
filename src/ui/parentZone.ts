// Parent-zone screen layout math (pure; text labels render in shell
// wiring — parent copy is the one place text is allowed). Big circular
// targets are grouped into labeled section cards (Sound, Skin & Name,
// Play, Data, Help) plus a big Done; a display-only row of legacy
// trophies sits between the cards and Done.
import type { Point } from '../engine/types';

export type ParentZoneAction =
  | 'volume-down'
  | 'volume-up'
  | 'mute'
  | 'easier'
  | 'skin'
  | 'name'
  | 'reset'
  | 'install'
  | 'done';

export interface ZoneButton {
  readonly action: ParentZoneAction;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

/** Display-only legacy trophy spot (never hit-tested). */
export interface TrophySlot {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export type ZoneCardId = 'sound' | 'skinName' | 'play' | 'data' | 'help';

/** Rounded panel that groups related controls under a section label. */
export interface ZoneCard {
  readonly id: ZoneCardId;
  readonly label: string;
  readonly rect: OverlayRect;
  /** Mini cards stack three across; labels center instead of aligning left. */
  readonly mini: boolean;
}

export interface ParentZoneLayout {
  readonly volumeDown: ZoneButton;
  readonly volumeUp: ZoneButton;
  readonly mute: ZoneButton;
  readonly easier: ZoneButton;
  readonly skin: ZoneButton;
  readonly name: ZoneButton;
  readonly reset: ZoneButton;
  readonly install: ZoneButton;
  readonly done: ZoneButton;
  readonly cards: readonly ZoneCard[];
  readonly trophies: readonly TrophySlot[];
}

const SMALL_RADIUS = 46; // 92px: above the 90px toddler target minimum
const BIG_RADIUS = 56;
const TROPHY_RADIUS = 26;
const TROPHY_Y = 620;
const TROPHY_SPACING = 120;
const CARD_MARGIN = 40;
const CARD_GAP = 10;
const MINI_CARD_WIDTH = 110;
const CARD_LABEL_ROW = 34; // label strip above the controls
const ROW_CARD_HEIGHT = 138; // label + one 92px control row + padding
const LABELED_CARD_HEIGHT = 164; // adds room for the label under each control

function button(action: ParentZoneAction, x: number, y: number, radius: number): ZoneButton {
  return { action, radius, x, y };
}

/** Wide field: two control rows with the trophies between install and done. */
function wideZone(fieldWidth: number): ParentZoneLayout {
  const centerX = fieldWidth / 2;
  return {
    volumeDown: button('volume-down', centerX - 260, 150, SMALL_RADIUS),
    mute: button('mute', centerX - 140, 150, SMALL_RADIUS),
    volumeUp: button('volume-up', centerX - 20, 150, SMALL_RADIUS),
    name: button('name', centerX + 130, 150, SMALL_RADIUS),
    easier: button('easier', centerX + 250, 150, SMALL_RADIUS),
    skin: button('skin', centerX + 370, 150, SMALL_RADIUS),
    reset: button('reset', centerX - 260, 310, SMALL_RADIUS),
    install: button('install', centerX - 140, 310, SMALL_RADIUS),
    done: button('done', centerX + 370, 310, BIG_RADIUS),
    // The wide ribbon keeps no section cards (approved landscape look).
    cards: [],
    trophies: [
      { radius: TROPHY_RADIUS, x: centerX + 10, y: 310 },
      { radius: TROPHY_RADIUS, x: centerX + 80, y: 310 },
      { radius: TROPHY_RADIUS, x: centerX + 150, y: 310 },
    ],
  };
}

function card(
  id: ZoneCardId,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  mini: boolean,
): ZoneCard {
  return { id, label, mini, rect: { height, width, x, y } };
}

/**
 * Nine big targets grouped into labeled section cards plus the display-only
 * trophy row: Sound (quieter · mute · louder), Skin & Name (name · skin),
 * then a Play / Data / Help row, and a big Done at the bottom.
 */
export function parentZoneLayout(fieldWidth: number, fieldHeight: number): ParentZoneLayout {
  if (fieldWidth > fieldHeight) {
    return wideZone(fieldWidth);
  }
  const centerX = fieldWidth / 2;
  const fullWidth = fieldWidth - CARD_MARGIN * 2;
  const soundY = 96;
  const skinNameY = soundY + ROW_CARD_HEIGHT + CARD_GAP; // 244
  const miniY = skinNameY + LABELED_CARD_HEIGHT + CARD_GAP; // 418
  const miniGap = (fullWidth - MINI_CARD_WIDTH * 3) / 2; // 10
  const miniX = (index: number): number => CARD_MARGIN + index * (MINI_CARD_WIDTH + miniGap);
  const controlY = (top: number): number => top + CARD_LABEL_ROW + SMALL_RADIUS; // circle center
  return {
    volumeDown: button('volume-down', centerX - 120, controlY(soundY), SMALL_RADIUS),
    volumeUp: button('volume-up', centerX + 120, controlY(soundY), SMALL_RADIUS),
    mute: button('mute', centerX, controlY(soundY), SMALL_RADIUS),
    easier: button('easier', centerX - 120, controlY(miniY), SMALL_RADIUS),
    reset: button('reset', centerX, controlY(miniY), SMALL_RADIUS),
    install: button('install', centerX + 120, controlY(miniY), SMALL_RADIUS),
    name: button('name', centerX - 110, controlY(skinNameY), SMALL_RADIUS),
    skin: button('skin', centerX + 110, controlY(skinNameY), SMALL_RADIUS),
    done: button('done', centerX, Math.min(770, fieldHeight - 90), BIG_RADIUS),
    cards: [
      card('sound', 'Sound', CARD_MARGIN, soundY, fullWidth, ROW_CARD_HEIGHT, false),
      card(
        'skinName',
        'Skin & Name',
        CARD_MARGIN,
        skinNameY,
        fullWidth,
        LABELED_CARD_HEIGHT,
        false,
      ),
      card('play', 'Play', miniX(0), miniY, MINI_CARD_WIDTH, LABELED_CARD_HEIGHT, true),
      card('data', 'Data', miniX(1), miniY, MINI_CARD_WIDTH, LABELED_CARD_HEIGHT, true),
      card('help', 'Help', miniX(2), miniY, MINI_CARD_WIDTH, LABELED_CARD_HEIGHT, true),
    ],
    trophies: [
      { radius: TROPHY_RADIUS, x: centerX - TROPHY_SPACING, y: TROPHY_Y },
      { radius: TROPHY_RADIUS, x: centerX, y: TROPHY_Y },
      { radius: TROPHY_RADIUS, x: centerX + TROPHY_SPACING, y: TROPHY_Y },
    ],
  };
}

/** Nearest button whose target contains the point, else null. */
export function hitParentZone(layout: ParentZoneLayout, point: Point): ParentZoneAction | null {
  let best: ZoneButton | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const buttons: readonly ZoneButton[] = [
    layout.volumeDown,
    layout.volumeUp,
    layout.mute,
    layout.easier,
    layout.skin,
    layout.name,
    layout.reset,
    layout.install,
    layout.done,
  ];
  for (const candidate of buttons) {
    const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
    if (distance <= candidate.radius && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best?.action ?? null;
}

export type NameOverlayAction = 'save' | 'clear' | 'cancel';

export interface NameOverlayButton {
  readonly action: NameOverlayAction;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface OverlayRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface NameOverlayLayout {
  readonly panel: OverlayRect;
  readonly field: OverlayRect;
  readonly save: NameOverlayButton;
  readonly cancel: NameOverlayButton;
  readonly clear: NameOverlayButton | null;
}

const OVERLAY_PANEL_MARGIN = 30;
const OVERLAY_PANEL_TOP = 260;
const OVERLAY_PANEL_HEIGHT = 340;
const OVERLAY_FIELD_INSET = 30;
const OVERLAY_FIELD_TOP = 60;
const OVERLAY_FIELD_HEIGHT = 100;
const OVERLAY_BUTTON_INSET = 78; // leaves room for the label under each button
const OVERLAY_SIDE_OFFSET = 130;

/**
 * Modal panel for the parent-set name: a title strip, the field frame the
 * shell positions the DOM input over, and Save / Clear / Cancel targets.
 * Save and Cancel keep their spots whether or not Clear is shown.
 */
export function nameOverlayLayout(
  fieldWidth: number,
  fieldHeight: number,
  hasName: boolean,
): NameOverlayLayout {
  const centerX = fieldWidth / 2;
  const panel = {
    height: OVERLAY_PANEL_HEIGHT,
    width: fieldWidth - OVERLAY_PANEL_MARGIN * 2,
    x: OVERLAY_PANEL_MARGIN,
    y: Math.min(OVERLAY_PANEL_TOP, fieldHeight - OVERLAY_PANEL_HEIGHT),
  };
  const field = {
    height: OVERLAY_FIELD_HEIGHT,
    width: panel.width - OVERLAY_FIELD_INSET * 2,
    x: panel.x + OVERLAY_FIELD_INSET,
    y: panel.y + OVERLAY_FIELD_TOP,
  };
  const rowY = panel.y + panel.height - OVERLAY_BUTTON_INSET;
  return {
    panel,
    field,
    save: { action: 'save', radius: SMALL_RADIUS, x: centerX + OVERLAY_SIDE_OFFSET, y: rowY },
    cancel: { action: 'cancel', radius: SMALL_RADIUS, x: centerX - OVERLAY_SIDE_OFFSET, y: rowY },
    clear: hasName ? { action: 'clear', radius: SMALL_RADIUS, x: centerX, y: rowY } : null,
  };
}

/** Nearest overlay button whose target contains the point, else null. */
export function hitNameOverlay(layout: NameOverlayLayout, point: Point): NameOverlayAction | null {
  let best: NameOverlayButton | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const buttons: readonly NameOverlayButton[] = [
    layout.save,
    layout.cancel,
    ...(layout.clear ? [layout.clear] : []),
  ];
  for (const candidate of buttons) {
    const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
    if (distance <= candidate.radius && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best?.action ?? null;
}
