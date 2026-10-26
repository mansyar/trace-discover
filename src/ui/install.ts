// Install-guide detection kept pure for testing: the shell passes the UA and
// display-mode values, and this module picks the copy variant.
import { type OverlayRect, parentSurfaceScale } from './parentZone';

export type InstallVariant = 'android' | 'generic' | 'installed' | 'ios';

export interface InstallSignals {
  /** `navigator.maxTouchPoints` — needed because iPadOS masquerades as macOS. */
  readonly maxTouchPoints: number;
  /** `display-mode: standalone` match, or iOS `navigator.standalone`. */
  readonly standalone: boolean;
  readonly userAgent: string;
}

const IOS_PATTERN = /iPhone|iPad|iPod/;
const MAC_PATTERN = /Macintosh/;

export function installVariant(signals: InstallSignals): InstallVariant {
  if (signals.standalone) {
    return 'installed';
  }
  if (IOS_PATTERN.test(signals.userAgent)) {
    return 'ios';
  }
  if (MAC_PATTERN.test(signals.userAgent) && signals.maxTouchPoints > 1) {
    return 'ios';
  }
  if (signals.userAgent.includes('Android')) {
    return 'android';
  }
  return 'generic';
}

export interface InstallPanelLayout {
  readonly panel: OverlayRect;
  readonly lineHeight: number;
  readonly fontSize: number;
  /** Baseline of the first line. */
  readonly startY: number;
}

const PANEL_MARGIN = 40;
const PORTRAIT_PANEL_TOP = 120;
const PORTRAIT_PANEL_HEIGHT = 620;
const PORTRAIT_TOP_PAD = 70;
const PORTRAIT_LINE_HEIGHT = 52;
const PORTRAIT_FONT = 26;
const WIDE_PANEL_TOP = 40;
const WIDE_TOP_PAD = 40;
const WIDE_LINE_HEIGHT = 36;
const WIDE_FONT = 22;

/**
 * White install card plus where its copy lands. The card is centered on the
 * short axis (which reproduces both phone references exactly) and scaled for
 * tablet spaces; the copy keeps the authored top pad, so the longest variant
 * still ends inside the card.
 */
export function installPanelLayout(fieldWidth: number, fieldHeight: number): InstallPanelLayout {
  const wide = fieldWidth > fieldHeight;
  const scale = parentSurfaceScale(fieldWidth, fieldHeight);
  const margin = PANEL_MARGIN * scale;
  const width = fieldWidth - margin * 2;
  const height = wide
    ? fieldHeight - WIDE_PANEL_TOP * 2 * scale
    : Math.min(PORTRAIT_PANEL_HEIGHT * scale, fieldHeight - PORTRAIT_PANEL_TOP * scale);
  const panelY = (fieldHeight - height) / 2;
  return {
    fontSize: Math.round((wide ? WIDE_FONT : PORTRAIT_FONT) * scale),
    lineHeight: Math.round((wide ? WIDE_LINE_HEIGHT : PORTRAIT_LINE_HEIGHT) * scale),
    panel: { height, width, x: margin, y: panelY },
    startY: panelY + (wide ? WIDE_TOP_PAD : PORTRAIT_TOP_PAD) * scale,
  };
}
