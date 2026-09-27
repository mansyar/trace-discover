// On-demand level warming: entering a level fetches that level's own assets so
// a level opened mid-warm-up fills itself in, and a level whose assets failed
// tries again the next time it is opened. Warming is a side channel — it never
// touches a running level's progress, and the content cache already skips
// assets it holds, so a repeat entry can never duplicate work.
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
  const states = new Map<string, LevelWarmupState>();

  /** The settle report: what this level can draw for real, and what it cannot. */
  const summaryOf = (urls: readonly string[], failed: readonly string[]): LevelWarmupSummary => {
    const lost = new Set(failed);
    return { cached: [...new Set(urls)].filter((url) => !lost.has(url)), failed: [...lost] };
  };

  const settle = (levelId: string, summary: LevelWarmupSummary): void => {
    states.set(levelId, summary.failed.length === 0 ? 'warmed' : 'failed');
    options.onSettled?.(levelId, summary);
  };

  return {
    state: (levelId) => states.get(levelId) ?? 'idle',
    warmLevel: (levelId, urls) => {
      const current = states.get(levelId) ?? 'idle';
      if (current === 'warming' || current === 'warmed') {
        return;
      }
      states.set(levelId, 'warming');
      void options.warm(urls).then(
        (result) => {
          settle(levelId, summaryOf(urls, result.failed));
        },
        () => {
          // A rejected warm-up names nothing per asset, so the whole inventory
          // stays a stand-in — but the level settles, so the next entry retries
          // instead of waiting on it forever.
          settle(levelId, { cached: [], failed: [...new Set(urls)] });
        },
      );
    },
  };
}
