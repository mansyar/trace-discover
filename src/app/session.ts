// Production level session: the trace -> chime -> hop -> celebrate ->
// confetti -> sticker -> done loop, extracted from the device-verified dev
// harness into a testable module. Owns the engine state; the shell renders
// snapshots and forwards pointer input. Sound and character go through
// injected deps so tests run headless with fakes.
import { playCheckpointChime, playCompletion, type TonePlayer } from '../audio/synth';
import {
  ASSIST_START,
  type AssistState,
  DEFAULT_ASSIST_CONFIG,
  stepAssists,
  toleranceScale,
} from '../engine/assists';
import {
  CHECKPOINT_START,
  type CheckpointState,
  type Checkpoints,
  createCheckpoints,
  evaluateCheckpoints,
} from '../engine/checkpoints';
import {
  COMPLETION_START,
  type CompletionState,
  DEFAULT_COMPLETION_CONFIG,
  stepCompletion,
  travelProgress,
} from '../engine/completion';
import { pointAtLength } from '../engine/path';
import {
  advanceTrail,
  beginStroke,
  createTrail,
  endStroke,
  TRAIL_START,
  type Trail,
  type TrailState,
  tipPosition,
} from '../engine/trail';
import type { Point } from '../engine/types';
import { FIELD_WIDTH } from '../field';
import { type ConfettiParticle, createConfetti, stepConfetti } from '../render/confetti';
import { type LevelDef, levelToPath } from '../themes/level';

export const CHECKPOINT_COUNT = 6;
const TOLERANCE_FRACTION = 0.12;
const MAX_ADVANCE_SPEED = 600;
const CONFETTI_COUNT = 26;

/** Mascot waiting spot while tracing (bottom-center, clear of the path). */
export const TRACE_PARK: Point = { x: 215, y: 650 };
/** Mascot resting spot once the level succeeds (clear of success buttons). */
export const SUCCESS_PARK: Point = { x: 215, y: 410 };

export type SessionEvent = { readonly type: 'assist-widened' } | { readonly type: 'level-done' };

export interface SessionSettings {
  readonly easierTracing: boolean;
}

export interface SessionCharacter {
  fire(trigger: string): boolean;
}

export interface SessionDeps {
  readonly character: SessionCharacter;
  readonly onEvent: (event: SessionEvent) => void;
  readonly player: TonePlayer;
  /** Deterministic confetti seed (varies per level for QA replay). */
  readonly seed: number;
  readonly settings: () => SessionSettings;
}

export interface SessionSnapshot {
  readonly assistState: AssistState;
  readonly charPos: Point;
  readonly checkpoints: Checkpoints;
  readonly checkState: CheckpointState;
  readonly completion: CompletionState;
  readonly completionStarted: boolean;
  readonly confetti: readonly ConfettiParticle[];
  readonly frontier: number;
  readonly hintVisible: boolean;
  /** Arc position the nudge dot should hint toward, or null when idle is short. */
  readonly nudgeAt: number | null;
  readonly tip: Point;
  readonly trail: Trail;
  readonly trailState: TrailState;
}

export interface LevelSession {
  readonly success: boolean;
  pointerDown(point: Point): void;
  pointerMove(point: Point): void;
  pointerUp(): void;
  snapshot(): SessionSnapshot;
  update(dtMs: number): void;
}

export function createSession(level: LevelDef, deps: SessionDeps): LevelSession {
  const points = levelToPath(level);
  const baseTolerance = FIELD_WIDTH * TOLERANCE_FRACTION;
  let trail = createTrail(points, { tolerance: baseTolerance, maxAdvanceSpeed: MAX_ADVANCE_SPEED });
  let trailState: TrailState = TRAIL_START;
  let assistState: AssistState = ASSIST_START;
  let checkState: CheckpointState = CHECKPOINT_START;
  const checkpoints = createCheckpoints(trail, CHECKPOINT_COUNT);
  let completion: CompletionState = COMPLETION_START;
  let completionStarted = false;
  let confetti: ConfettiParticle[] = [];
  let charPos: Point = { ...TRACE_PARK };
  let pointer: Point | null = null;
  let success = false;
  let widenReported = false;
  let toleranceScaleNow = 1;

  const ensureTolerance = (): void => {
    const scale = toleranceScale(DEFAULT_ASSIST_CONFIG, assistState, deps.settings().easierTracing);
    if (scale !== toleranceScaleNow) {
      toleranceScaleNow = scale;
      trail = createTrail(points, {
        tolerance: baseTolerance * scale,
        maxAdvanceSpeed: MAX_ADVANCE_SPEED,
      });
    }
  };

  const glideToPark = (dtMs: number): void => {
    const blend = 1 - Math.exp((-dtMs / 1000) * 5);
    charPos = {
      x: charPos.x + (SUCCESS_PARK.x - charPos.x) * blend,
      y: charPos.y + (SUCCESS_PARK.y - charPos.y) * blend,
    };
  };

  const update: LevelSession['update'] = (dtMs) => {
    confetti = stepConfetti(confetti, dtMs / 1000);
    if (success) {
      glideToPark(dtMs);
      return;
    }
    if (trailState.tracing && pointer) {
      ensureTolerance();
      const next = advanceTrail(trail, trailState, pointer.x, pointer.y, dtMs / 1000);
      const advanced = next.frontier > trailState.frontier;
      trailState = next;
      const step = stepAssists(
        DEFAULT_ASSIST_CONFIG,
        assistState,
        { advanced, touching: true, frontier: trailState.frontier, total: trail.total },
        dtMs,
      );
      assistState = step.state;
      const result = evaluateCheckpoints(checkpoints, checkState, trailState.frontier);
      checkState = result.state;
      for (const event of result.events) {
        if (event.type === 'checkpoint') {
          playCheckpointChime(deps.player, event.index);
        } else {
          completionStarted = true;
          completion = COMPLETION_START;
        }
      }
    } else {
      const step = stepAssists(
        DEFAULT_ASSIST_CONFIG,
        assistState,
        { advanced: false, touching: false, frontier: trailState.frontier, total: trail.total },
        dtMs,
      );
      assistState = step.state;
    }
    if (!widenReported && assistState.nudgesTotal >= DEFAULT_ASSIST_CONFIG.nudgesPerWiden) {
      widenReported = true;
      deps.onEvent({ type: 'assist-widened' });
    }
    if (completionStarted) {
      const step = stepCompletion(DEFAULT_COMPLETION_CONFIG, completion, dtMs, trail.total);
      completion = step.state;
      for (const event of step.events) {
        if (event === 'burst') {
          const progress = travelProgress(completion, DEFAULT_COMPLETION_CONFIG, trail.total);
          confetti = createConfetti(
            CONFETTI_COUNT,
            deps.seed,
            pointAtLength(trail.points, trail.cumulative, trail.total * progress),
          );
        } else if (event === 'celebrateStart') {
          deps.character.fire('celebrate');
          playCompletion(deps.player);
        } else if (event === 'done') {
          success = true;
          deps.onEvent({ type: 'level-done' });
        }
      }
      if (success) {
        glideToPark(dtMs);
      } else {
        const progress = travelProgress(completion, DEFAULT_COMPLETION_CONFIG, trail.total);
        charPos = pointAtLength(trail.points, trail.cumulative, trail.total * progress);
      }
    }
  };

  return {
    get success() {
      return success;
    },
    pointerDown: (point) => {
      if (success || completionStarted) {
        return;
      }
      pointer = point;
      trailState = beginStroke(trailState);
    },
    pointerMove: (point) => {
      pointer = point;
    },
    pointerUp: () => {
      pointer = null;
      trailState = endStroke(trailState);
    },
    snapshot: () => {
      const idleMs = assistState.idleMs;
      return {
        assistState,
        charPos: { ...charPos },
        checkpoints,
        checkState,
        completion,
        completionStarted,
        confetti,
        frontier: trailState.frontier,
        hintVisible: !trailState.tracing && idleMs >= DEFAULT_ASSIST_CONFIG.hintAfterMs,
        nudgeAt:
          idleMs >= DEFAULT_ASSIST_CONFIG.nudgeAfterMs
            ? Math.min(trailState.frontier + DEFAULT_ASSIST_CONFIG.lookaheadPx, trail.total)
            : null,
        tip: tipPosition(trail, trailState),
        trail,
        trailState,
      };
    },
    update,
  };
}
