// Parent-zone screen layout math (pure; text labels render in shell
// wiring — parent copy is the one place text is allowed). Big circular
// targets: volume row, easier + name + skin setters, reset + install guide,
// done; a display-only row of legacy trophies sits between reset and done.
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
  readonly trophies: readonly TrophySlot[];
}

const SMALL_RADIUS = 46; // 92px: above the 90px toddler target minimum
const BIG_RADIUS = 56;
const TROPHY_RADIUS = 26;
const TROPHY_Y = 688;
const TROPHY_SPACING = 120;

function button(action: ParentZoneAction, x: number, y: number, radius: number): ZoneButton {
  return { action, radius, x, y };
}

/** Nine big targets in rows plus the display-only trophy row. */
export function parentZoneLayout(fieldWidth: number, fieldHeight: number): ParentZoneLayout {
  const centerX = fieldWidth / 2;
  return {
    volumeDown: button('volume-down', centerX - 130, 250, SMALL_RADIUS),
    volumeUp: button('volume-up', centerX + 130, 250, SMALL_RADIUS),
    mute: button('mute', centerX, 250, SMALL_RADIUS),
    easier: button('easier', centerX, 400, BIG_RADIUS),
    skin: button('skin', centerX + 130, 400, SMALL_RADIUS),
    name: button('name', centerX - 130, 400, SMALL_RADIUS),
    reset: button('reset', centerX - 110, 555, SMALL_RADIUS),
    install: button('install', centerX + 110, 555, SMALL_RADIUS),
    done: button('done', centerX, Math.min(770, fieldHeight - 90), BIG_RADIUS),
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
