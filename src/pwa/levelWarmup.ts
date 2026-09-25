// On-demand level warming: entering a level fetches that level's own assets so
// a level opened mid-warm-up fills itself in, and a level whose assets failed
// tries again the next time it is opened. Warming is a side channel — it never
// touches a running level's progress, and the content cache already skips
// assets it holds, so a repeat entry can never duplicate work.
// Implementation lands with the phase's Green step.
import type { ContentWarmupResult } from './contentCache';

export type LevelWarmupState = 'idle' | 'warming' | 'warmed' | 'failed';

export interface LevelWarmupSummary {
  /** Assets this level can draw for real now. */
  readonly cached: readonly string[];
  /** Assets that exhausted their attempts and keep drawn stand-ins. */
  readonly failed: readonly string[];
}

export interface LevelWarmupOptions {
  /** Warms a level's assets; dedupe, retries, and concurrency live in the content cache. */
  readonly warm: (urls: readonly string[]) => Promise<ContentWarmupResult>;
  /** Called once per level when its warm-up settles. */
  readonly onSettled?: (levelId: string, summary: LevelWarmupSummary) => void;
}

export interface LevelWarmup {
  /** Current state of a level for the shell and for tests. */
  state: (levelId: string) => LevelWarmupState;
  /**
   * Warms a level's assets once. A repeat call while it is warming, or after it
   * succeeded, does nothing; a failed or unseen level is warmed again, which is
   * how a level heals when the network comes back.
   */
  warmLevel: (levelId: string, urls: readonly string[]) => void;
}

export function createLevelWarmup(options: LevelWarmupOptions): LevelWarmup {
  void options;
  throw new Error('createLevelWarmup: not implemented');
}
