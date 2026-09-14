// Pure completion-choreography timeline: glow -> hop -> celebrate -> confetti
// -> sticker -> done, with a single sparkle burst at half the hop.

export type CompletionStage = 'glow' | 'hop' | 'celebrate' | 'confetti' | 'sticker' | 'done';

export type CompletionEvent =
  | 'hopStart'
  | 'burst'
  | 'land'
  | 'celebrateStart'
  | 'confettiStart'
  | 'stickerStart'
  | 'done';

export interface CompletionConfig {
  /** Fraction of the hop at which the sparkle burst fires. */
  readonly burstAt: number;
  readonly celebrateMs: number;
  readonly confettiMs: number;
  readonly glowMs: number;
  readonly hopMaxMs: number;
  readonly hopMinMs: number;
  /** Character travel speed along the path, px/s. */
  readonly hopSpeed: number;
  readonly stickerMs: number;
}

export const DEFAULT_COMPLETION_CONFIG: CompletionConfig = {
  burstAt: 0.5,
  celebrateMs: 2000,
  confettiMs: 1200,
  glowMs: 500,
  hopMaxMs: 3000,
  hopMinMs: 800,
  hopSpeed: 420,
  stickerMs: 700,
};

export interface CompletionState {
  readonly burstFired: boolean;
  readonly elapsedMs: number;
  readonly stage: CompletionStage;
}

export const COMPLETION_START: CompletionState = {
  burstFired: false,
  elapsedMs: 0,
  stage: 'glow',
};

/** Hop duration scales with path length, clamped to feel snappy but readable. */
export function hopDurationMs(config: CompletionConfig, totalLength: number): number {
  const estimate = (totalLength / config.hopSpeed) * 1000;
  return Math.min(config.hopMaxMs, Math.max(config.hopMinMs, estimate));
}

/** 0..1 progress of the character along the traced path. */
export function travelProgress(
  state: CompletionState,
  config: CompletionConfig,
  totalLength: number,
): number {
  if (state.stage === 'glow') {
    return 0;
  }
  if (state.stage === 'hop') {
    return Math.min(1, state.elapsedMs / hopDurationMs(config, totalLength));
  }
  return 1;
}

function stageDurationMs(
  config: CompletionConfig,
  stage: CompletionStage,
  totalLength: number,
): number {
  switch (stage) {
    case 'glow':
      return config.glowMs;
    case 'hop':
      return hopDurationMs(config, totalLength);
    case 'celebrate':
      return config.celebrateMs;
    case 'confetti':
      return config.confettiMs;
    case 'sticker':
      return config.stickerMs;
    case 'done':
      return Number.POSITIVE_INFINITY;
  }
}

function nextStage(stage: CompletionStage): CompletionStage {
  switch (stage) {
    case 'glow':
      return 'hop';
    case 'hop':
      return 'celebrate';
    case 'celebrate':
      return 'confetti';
    case 'confetti':
      return 'sticker';
    case 'sticker':
      return 'done';
    case 'done':
      return 'done';
  }
}

/** Advances the timeline; large `dtMs` may cross several stages in one call. */
export function stepCompletion(
  config: CompletionConfig,
  state: CompletionState,
  dtMs: number,
  totalLength: number,
): { readonly events: readonly CompletionEvent[]; readonly state: CompletionState } {
  const events: CompletionEvent[] = [];
  if (state.stage === 'done') {
    return { events, state };
  }
  let stage: CompletionStage = state.stage;
  let burstFired = state.burstFired;
  let elapsed = state.elapsedMs + dtMs;

  while (stage !== 'done') {
    const duration = stageDurationMs(config, stage, totalLength);
    if (stage === 'hop' && !burstFired && elapsed >= duration * config.burstAt) {
      events.push('burst');
      burstFired = true;
    }
    if (elapsed < duration) {
      break;
    }
    elapsed -= duration;
    switch (stage) {
      case 'glow':
        events.push('hopStart');
        break;
      case 'hop':
        events.push('land', 'celebrateStart');
        break;
      case 'celebrate':
        events.push('confettiStart');
        break;
      case 'confetti':
        events.push('stickerStart');
        break;
      case 'sticker':
        events.push('done');
        break;
      default:
        break;
    }
    stage = nextStage(stage);
  }

  return { events, state: { burstFired, elapsedMs: elapsed, stage } };
}
