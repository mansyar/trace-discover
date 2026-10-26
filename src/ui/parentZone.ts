// Parent-zone screen layout math (pure; text labels render in shell
// wiring — parent copy is the one place text is allowed). Big circular
// targets are grouped into labeled section cards (Sound, Skin & Name,
// Play, Data, Help) plus a big Done; a display-only row of legacy
// trophies sits between the cards and Done.
import type { Point } from '../engine/types';
import { FIELD_HEIGHT, FIELD_WIDTH, LANDSCAPE_FIELD_HEIGHT, LANDSCAPE_FIELD_WIDTH } from '../field';

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
  /** "Grown-ups" heading. */
  readonly title: Point;
  /** "Trophies" caption; it sits under the slot row on portrait, above on wide. */
  readonly trophyLabel: Point;
}

const SMALL_RADIUS = 46; // 92px: above the 90px toddler target minimum
const BIG_RADIUS = 56;
const TROPHY_RADIUS = 26;
const TROPHY_SPACING = 120;
/** Phone portrait: the caption sits this far below the slot row's centers. */
const TROPHY_LABEL_DROP = 52;
const CARD_MARGIN = 40;
const CARD_GAP = 10;
const MINI_CARD_WIDTH = 110;
const CARD_LABEL_ROW = 34; // label strip above the controls
const ROW_CARD_HEIGHT = 138; // label + one 92px control row + padding
const LABELED_CARD_HEIGHT = 164; // adds room for the label under each control
const TITLE_Y = 70;
/** Done's center keeps the phone's 34-unit gap under its 56-unit radius. */
const DONE_BOTTOM_GAP = 90;
/** Phone portrait stack above the trophy row (sound card top only). */
const STACK_TOP = 96;
/** Extra height a tablet-portrait field has over the phone reference. */
const PORTRAIT_SURPLUS = 420;

function button(action: ParentZoneAction, x: number, y: number, radius: number): ZoneButton {
  return { action, radius, x, y };
}

/** Wide field: two control rows with the trophies between install and done. */
function wideZone(fieldWidth: number, fieldHeight: number): ParentZoneLayout {
  const centerX = fieldWidth / 2;
  // Phone landscape is the authored ribbon; a taller/wider tablet field scales
  // the same ribbon's vertical rhythm and spreads it sideways. Both factors are
  // exactly 1 on the phone reference, so its output is byte-identical.
  const vertical = fieldHeight / LANDSCAPE_FIELD_HEIGHT;
  const spread = Math.min(1.4, Math.max(1, fieldWidth / LANDSCAPE_FIELD_WIDTH));
  const rowGap = 160 * vertical;
  const groupHeight = rowGap + BIG_RADIUS * 2;
  const firstRow = (fieldHeight - groupHeight) / 2 + 15 + BIG_RADIUS;
  const secondRow = firstRow + rowGap;
  const at = (offset: number): number => centerX + offset * spread;
  return {
    volumeDown: button('volume-down', at(-260), firstRow, SMALL_RADIUS),
    mute: button('mute', at(-140), firstRow, SMALL_RADIUS),
    volumeUp: button('volume-up', at(-20), firstRow, SMALL_RADIUS),
    name: button('name', at(130), firstRow, SMALL_RADIUS),
    easier: button('easier', at(250), firstRow, SMALL_RADIUS),
    skin: button('skin', at(370), firstRow, SMALL_RADIUS),
    reset: button('reset', at(-260), secondRow, SMALL_RADIUS),
    install: button('install', at(-140), secondRow, SMALL_RADIUS),
    done: button('done', at(370), secondRow, BIG_RADIUS),
    // The wide ribbon keeps no section cards (approved landscape look).
    cards: [],
    title: { x: centerX, y: firstRow - 80 },
    trophies: [
      { radius: TROPHY_RADIUS, x: at(10), y: secondRow },
      { radius: TROPHY_RADIUS, x: at(80), y: secondRow },
      { radius: TROPHY_RADIUS, x: at(150), y: secondRow },
    ],
    trophyLabel: { x: at(80), y: secondRow - 40 },
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
 *
 * A tablet-portrait field is taller than the phone reference and often wider,
 * so the same stack is stretched: cards grow (up to 1.4×) and the gaps absorb
 * the rest, while every control keeps its authored 92/112-unit target and its
 * slot in the card's top band. Each factor is zero on the phone reference, so
 * portrait and landscape phone output is unchanged.
 */
export function parentZoneLayout(fieldWidth: number, fieldHeight: number): ParentZoneLayout {
  if (fieldWidth > fieldHeight) {
    return wideZone(fieldWidth, fieldHeight);
  }
  const centerX = fieldWidth / 2;
  const fullWidth = fieldWidth - CARD_MARGIN * 2;
  const grow = Math.max(0, (fieldHeight - FIELD_HEIGHT) / PORTRAIT_SURPLUS);
  const cardScale = 1 + 0.4 * grow;
  const gap = CARD_GAP + 50 * grow;
  const soundHeight = ROW_CARD_HEIGHT * cardScale;
  const labeledHeight = LABELED_CARD_HEIGHT * cardScale;
  const soundY = STACK_TOP;
  const skinNameY = soundY + soundHeight + gap;
  const miniY = skinNameY + labeledHeight + gap;
  const miniWidth = MINI_CARD_WIDTH * cardScale;
  const miniGap = (fullWidth - miniWidth * 3) / 2;
  const miniX = (index: number): number => CARD_MARGIN + index * (miniWidth + miniGap);
  const miniCenter = (index: number): number => miniX(index) + miniWidth / 2;
  // Controls sit in the card's top band, as authored; the taller card's extra
  // room falls under the control's label.
  const controlY = (top: number): number => top + (CARD_LABEL_ROW + SMALL_RADIUS) * cardScale;
  const rowSpread = (offset: number): number => centerX + offset * cardScale;
  const trophyY = miniY + labeledHeight + 38 + 42 * grow;
  return {
    volumeDown: button('volume-down', rowSpread(-120), controlY(soundY), SMALL_RADIUS),
    volumeUp: button('volume-up', rowSpread(120), controlY(soundY), SMALL_RADIUS),
    mute: button('mute', centerX, controlY(soundY), SMALL_RADIUS),
    easier: button('easier', miniCenter(0), controlY(miniY), SMALL_RADIUS),
    reset: button('reset', miniCenter(1), controlY(miniY), SMALL_RADIUS),
    install: button('install', miniCenter(2), controlY(miniY), SMALL_RADIUS),
    name: button('name', rowSpread(-110), controlY(skinNameY), SMALL_RADIUS),
    skin: button('skin', rowSpread(110), controlY(skinNameY), SMALL_RADIUS),
    done: button('done', centerX, fieldHeight - DONE_BOTTOM_GAP, BIG_RADIUS),
    cards: [
      card('sound', 'Sound', CARD_MARGIN, soundY, fullWidth, soundHeight, false),
      card('skinName', 'Skin & Name', CARD_MARGIN, skinNameY, fullWidth, labeledHeight, false),
      card('play', 'Play', miniX(0), miniY, miniWidth, labeledHeight, true),
      card('data', 'Data', miniX(1), miniY, miniWidth, labeledHeight, true),
      card('help', 'Help', miniX(2), miniY, miniWidth, labeledHeight, true),
    ],
    title: { x: centerX, y: TITLE_Y },
    trophies: [
      { radius: TROPHY_RADIUS, x: centerX - TROPHY_SPACING, y: trophyY },
      { radius: TROPHY_RADIUS, x: centerX, y: trophyY },
      { radius: TROPHY_RADIUS, x: centerX + TROPHY_SPACING, y: trophyY },
    ],
    trophyLabel: { x: centerX, y: trophyY + TROPHY_LABEL_DROP },
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
  /** Copy/inset scale: 1 on both phone references, up to 1.25 on a tablet. */
  readonly scale: number;
}

const OVERLAY_PANEL_MARGIN = 30;
const OVERLAY_PANEL_TOP = 260;
const OVERLAY_PANEL_HEIGHT = 340;
const OVERLAY_FIELD_INSET = 30;
const OVERLAY_FIELD_TOP = 60;
const OVERLAY_FIELD_HEIGHT = 100;
const OVERLAY_BUTTON_INSET = 78; // leaves room for the label under each button
const OVERLAY_SIDE_OFFSET = 130;
/** Tablet parents' copy never grows past this share of a phone's. */
const MAX_PARENT_SCALE = 1.25;

/**
 * Parent copy scale for a field: the short axis measured against the portrait
 * phone reference. Both phone references come out at exactly 1 (so their
 * pixels are unchanged) and every tablet space grows to the 1.25 cap.
 */
export function parentSurfaceScale(fieldWidth: number, fieldHeight: number): number {
  const shortAxis = Math.min(fieldWidth, fieldHeight);
  return Math.min(MAX_PARENT_SCALE, Math.max(1, shortAxis / FIELD_WIDTH));
}

/**
 * Modal panel for the parent-set name: a title strip, the field frame the
 * shell positions the DOM input over, and Save / Clear / Cancel targets.
 * Save and Cancel keep their spots whether or not Clear is shown.
 *
 * `keyboardInset` is the height of the on-screen keyboard in field units; when
 * it is open the panel lifts so the input and its buttons stay above it.
 */
export function nameOverlayLayout(
  fieldWidth: number,
  fieldHeight: number,
  hasName: boolean,
  keyboardInset = 0,
): NameOverlayLayout {
  const centerX = fieldWidth / 2;
  const scale = parentSurfaceScale(fieldWidth, fieldHeight);
  const panelHeight = OVERLAY_PANEL_HEIGHT * scale;
  const panelWidth = fieldWidth - OVERLAY_PANEL_MARGIN * 2 * scale;
  const panelX = (fieldWidth - panelWidth) / 2;
  const freeTop = Math.min(OVERLAY_PANEL_TOP * scale, fieldHeight - panelHeight);
  const panelY = Math.max(0, Math.min(freeTop, fieldHeight - panelHeight - keyboardInset));
  const panel = { height: panelHeight, width: panelWidth, x: panelX, y: panelY };
  const field = {
    height: OVERLAY_FIELD_HEIGHT * scale,
    width: panel.width - OVERLAY_FIELD_INSET * 2 * scale,
    x: panel.x + OVERLAY_FIELD_INSET * scale,
    y: panel.y + OVERLAY_FIELD_TOP * scale,
  };
  const rowY = panel.y + panel.height - OVERLAY_BUTTON_INSET * scale;
  return {
    panel,
    field,
    scale,
    save: {
      action: 'save',
      radius: SMALL_RADIUS,
      x: centerX + OVERLAY_SIDE_OFFSET * scale,
      y: rowY,
    },
    cancel: {
      action: 'cancel',
      radius: SMALL_RADIUS,
      x: centerX - OVERLAY_SIDE_OFFSET * scale,
      y: rowY,
    },
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
