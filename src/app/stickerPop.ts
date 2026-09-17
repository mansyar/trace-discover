// Sticker pop timing (pure): the shell starts a pop when an earned sticker is
// tapped on the board; this module maps elapsed time to the render frame. The
// sticker springs up to ~400 field units (over a 96-unit cell) with a squash-
// and-stretch wobble, bursts sparkles early, hovers, then settles back to rest
// within POP_DURATION_MS. A rapid re-tap simply restarts the clock.

export const POP_DURATION_MS = 1200;
/** Peak scale over a 96-unit cell: ~400 field units. */
export const POP_PEAK_SCALE = 4.2;

export interface StickerPopFrame {
  readonly done: boolean;
  readonly rise: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly sparkle: number;
}

const GROWTH_END = 0.3;
const HOLD_END = 0.78;
const RISE_UNITS = 48;
const WOBBLE_AMPLITUDE = 0.08;

export function stickerPopFrame(elapsedMs: number): StickerPopFrame {
  const clamped = Math.max(0, Math.min(elapsedMs, POP_DURATION_MS));
  const t = clamped / POP_DURATION_MS;
  const scale = scaleAt(t);
  const wobble = WOBBLE_AMPLITUDE * Math.sin(t * Math.PI * 4) * (1 - t);
  return {
    done: elapsedMs >= POP_DURATION_MS,
    rise: RISE_UNITS * liftAt(t),
    scaleX: scale * (1 - wobble),
    scaleY: scale * (1 + wobble),
    sparkle: t < 0.5 ? Math.sin((t / 0.5) * Math.PI) : 0,
  };
}

function scaleAt(t: number): number {
  return 1 + (POP_PEAK_SCALE - 1) * growthAt(t);
}

function growthAt(t: number): number {
  if (t < GROWTH_END) {
    return easeOutBack(t / GROWTH_END);
  }
  if (t < HOLD_END) {
    const u = (t - GROWTH_END) / (HOLD_END - GROWTH_END);
    return 1 + Math.sin(u * Math.PI * 2) * 0.02;
  }
  return 1 - easeInOutCubic((t - HOLD_END) / (1 - HOLD_END));
}

function liftAt(t: number): number {
  if (t < GROWTH_END) {
    return easeOutBack(t / GROWTH_END);
  }
  if (t < HOLD_END) {
    return 1;
  }
  return 1 - easeInOutCubic((t - HOLD_END) / (1 - HOLD_END));
}

function easeOutBack(u: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = u - 1;
  return 1 + c3 * p ** 3 + c1 * p ** 2;
}

function easeInOutCubic(u: number): number {
  return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
}
