import { describe, expect, it } from 'vitest';

import {
  burstTimeMs,
  DEFAULT_HOP_CONFIG,
  HOP_LIFT,
  hopPlacement,
  hopTimeline,
  RING_RADIUS,
} from './hops';

describe('hop timeline', () => {
  it('lays out one hop per count across the whole journey', () => {
    const timeline = hopTimeline(3);
    expect(timeline.hops).toHaveLength(3);
    expect(timeline.ring).toBe(false);
    const [first] = timeline.hops;
    const last = timeline.hops[2];
    if (!first || !last) {
      throw new Error('missing hops');
    }
    expect(first.from).toBe(0);
    expect(last.to).toBe(1);
    timeline.hops.forEach((hop, index) => {
      expect(hop.index).toBe(index);
      expect(hop.from).toBeCloseTo(index / 3, 12);
      expect(hop.to).toBeCloseTo((index + 1) / 3, 12);
      expect(hop.startMs).toBeCloseTo(index * timeline.hopMs, 12);
      expect(hop.endMs).toBeCloseTo((index + 1) * timeline.hopMs, 12);
      if (index > 0) {
        const previous = timeline.hops[index - 1];
        if (!previous) {
          throw new Error('missing previous hop');
        }
        expect(hop.from).toBeCloseTo(previous.to, 12);
      }
    });
    expect(timeline.totalMs).toBeCloseTo(3 * timeline.hopMs, 12);
  });

  it('keeps every hop inside the pacing caps as the count grows', () => {
    for (let count = 1; count <= 9; count += 1) {
      const timeline = hopTimeline(count);
      expect(timeline.hopMs).toBeGreaterThanOrEqual(DEFAULT_HOP_CONFIG.minHopMs);
      expect(timeline.hopMs).toBeLessThanOrEqual(DEFAULT_HOP_CONFIG.maxHopMs);
      expect(timeline.totalMs).toBeLessThanOrEqual(1700);
    }
  });

  it('gives low counts the slowest hops and speeds up as counts rise', () => {
    expect(hopTimeline(1).hopMs).toBe(DEFAULT_HOP_CONFIG.maxHopMs);
    expect(hopTimeline(2).hopMs).toBe(DEFAULT_HOP_CONFIG.maxHopMs);
    expect(hopTimeline(9).hopMs).toBeLessThan(hopTimeline(3).hopMs);
  });

  it('places the burst at the apex of the hop that covers the halfway point', () => {
    const three = hopTimeline(3);
    expect(burstTimeMs(three)).toBeCloseTo(1.5 * three.hopMs, 12);
    const one = hopTimeline(1);
    expect(burstTimeMs(one)).toBeCloseTo(0.5 * one.hopMs, 12);
    const nine = hopTimeline(9);
    expect(burstTimeMs(nine)).toBeCloseTo(4.5 * nine.hopMs, 12);
  });

  it('gives 0 a single ring move instead of counted hops', () => {
    const timeline = hopTimeline(0);
    expect(timeline.ring).toBe(true);
    expect(timeline.hops).toHaveLength(1);
    const [step] = timeline.hops;
    if (!step) {
      throw new Error('missing ring hop');
    }
    expect(step.from).toBe(0);
    expect(step.to).toBe(1);
    expect(timeline.hopMs).toBe(DEFAULT_HOP_CONFIG.ringMs);
    expect(timeline.totalMs).toBe(DEFAULT_HOP_CONFIG.ringMs);
    expect(burstTimeMs(timeline)).toBeCloseTo(DEFAULT_HOP_CONFIG.ringMs / 2, 12);
  });

  it('treats negative counts as the ring move too', () => {
    expect(hopTimeline(-2)).toEqual(hopTimeline(0));
  });

  it('honours a custom pacing config', () => {
    const config = { budgetMs: 1000, maxHopMs: 300, minHopMs: 120, ringMs: 800 };
    expect(hopTimeline(10, config).hopMs).toBe(config.minHopMs);
    const two = hopTimeline(2, config);
    expect(two.hopMs).toBe(config.maxHopMs);
    expect(two.totalMs).toBe(600);
  });
});

describe('hop placement', () => {
  it('puts the guide on the path with a lift at each hop apex', () => {
    const plan = hopTimeline(3);
    const start = hopPlacement(plan, 0);
    expect(start.progress).toBeCloseTo(0, 9);
    expect(start.dy).toBeCloseTo(0, 9);
    const apex = hopPlacement(plan, plan.hopMs / 2);
    expect(apex.progress).toBeCloseTo(1 / 6, 9);
    expect(apex.dy).toBeCloseTo(-HOP_LIFT, 9);
    const landing = hopPlacement(plan, plan.hopMs);
    expect(landing.progress).toBeCloseTo(1 / 3, 9);
    expect(landing.dy).toBeCloseTo(0, 9);
    const done = hopPlacement(plan, plan.totalMs * 2);
    expect(done.progress).toBeCloseTo(1, 9);
    expect(done.dy).toBeCloseTo(0, 9);
  });

  it('loops one circle in place for the 0 ring move', () => {
    const plan = hopTimeline(0);
    const quarter = hopPlacement(plan, plan.totalMs / 4);
    expect(quarter.dx).toBeCloseTo(RING_RADIUS, 9);
    expect(quarter.dy).toBeCloseTo(-RING_RADIUS, 9);
    const half = hopPlacement(plan, plan.totalMs / 2);
    expect(half.dx).toBeCloseTo(0, 6);
    expect(half.dy).toBeCloseTo(-2 * RING_RADIUS, 9);
    expect(half.progress).toBeCloseTo(0.5, 9);
    const done = hopPlacement(plan, plan.totalMs);
    expect(done.dx).toBeCloseTo(0, 6);
    expect(done.dy).toBeCloseTo(0, 9);
    expect(done.progress).toBeCloseTo(1, 9);
  });
});
