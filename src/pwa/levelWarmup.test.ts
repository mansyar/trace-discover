import { describe, expect, it, vi } from 'vitest';
import type { ContentWarmupResult } from './contentCache';
import { createLevelWarmup, type LevelWarmupSummary } from './levelWarmup';

/** A level's own assets: backdrop, goal, sticker, and its character. */
const LEVEL_URLS = [
  '/art/backdrop/pre-1.webp',
  '/art/goal/pre-1.webp',
  '/art/sticker/pre-1.webp',
  '/rive/dino.riv',
];

function harness() {
  const settled: { levelId: string; summary: LevelWarmupSummary }[] = [];
  const pending: {
    reject: (error: Error) => void;
    resolve: (result: ContentWarmupResult) => void;
  }[] = [];
  const warm = vi.fn(
    () =>
      new Promise<ContentWarmupResult>((resolve, reject) => {
        pending.push({ reject, resolve });
      }),
  );
  const warmup = createLevelWarmup({
    warm,
    onSettled: (levelId, summary) => {
      settled.push({ levelId, summary });
    },
  });
  return { pending, settled, warm, warmup };
}

const COMPLETE: ContentWarmupResult = { cached: LEVEL_URLS, complete: true, failed: [] };
const PARTIAL: ContentWarmupResult = {
  cached: ['/art/goal/pre-1.webp'],
  complete: false,
  failed: ['/rive/dino.riv'],
};

describe('createLevelWarmup', () => {
  it('warms the level assets it is handed, exactly once', () => {
    const fixture = harness();
    expect(fixture.warmup.state('pre-1')).toBe('idle');

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);

    expect(fixture.warm).toHaveBeenCalledTimes(1);
    expect(fixture.warm).toHaveBeenCalledWith(LEVEL_URLS);
    expect(fixture.warmup.state('pre-1')).toBe('warming');
  });

  it('does not restart a level that is still warming', () => {
    const fixture = harness();

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);
    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);

    expect(fixture.warm).toHaveBeenCalledTimes(1);
    expect(fixture.warmup.state('pre-1')).toBe('warming');
  });

  it('reports the split when a level settles, and never repeats it', () => {
    const fixture = harness();

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);
    fixture.pending[0]?.resolve(COMPLETE);

    expect(fixture.warmup.state('pre-1')).toBe('warmed');
    expect(fixture.settled).toEqual([
      { levelId: 'pre-1', summary: { cached: LEVEL_URLS, failed: [] } },
    ]);

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);
    expect(fixture.warm).toHaveBeenCalledTimes(1);
    expect(fixture.settled).toHaveLength(1);
  });

  it('keeps stand-ins for the assets that failed and re-warms on the next entry', () => {
    const fixture = harness();

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);
    fixture.pending[0]?.resolve(PARTIAL);

    expect(fixture.warmup.state('pre-1')).toBe('failed');
    expect(fixture.settled).toEqual([
      {
        levelId: 'pre-1',
        summary: {
          cached: ['/art/backdrop/pre-1.webp', '/art/goal/pre-1.webp', '/art/sticker/pre-1.webp'],
          failed: ['/rive/dino.riv'],
        },
      },
    ]);

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);
    expect(fixture.warm).toHaveBeenCalledTimes(2);
    expect(fixture.warmup.state('pre-1')).toBe('warming');
  });

  it('tracks levels separately', () => {
    const fixture = harness();

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);
    fixture.pending[0]?.resolve(COMPLETE);
    fixture.warmup.warmLevel('pre-2', ['/art/goal/pre-2.webp']);

    expect(fixture.warmup.state('pre-1')).toBe('warmed');
    expect(fixture.warmup.state('pre-2')).toBe('warming');
    expect(fixture.warmup.state('pre-3')).toBe('idle');
    expect(fixture.warm).toHaveBeenCalledTimes(2);
  });

  it('releases a level whose warm-up throws, and lets the next entry retry', () => {
    const fixture = harness();

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);
    fixture.pending[0]?.reject(new Error('warm-up exploded'));

    expect(fixture.warmup.state('pre-1')).toBe('failed');
    expect(fixture.settled).toEqual([
      { levelId: 'pre-1', summary: { cached: [], failed: LEVEL_URLS } },
    ]);

    fixture.warmup.warmLevel('pre-1', LEVEL_URLS);
    expect(fixture.warm).toHaveBeenCalledTimes(2);
    expect(fixture.warmup.state('pre-1')).toBe('warming');
  });
});
