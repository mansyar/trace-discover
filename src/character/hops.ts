// Counted-hop sequencing: the guide hops from park to goal once per count,
// so numeral N lands with N hops (and, wired by the session, N notes).
// Pure timeline math — positions derive from journey progress.

export interface HopConfig {
  /** Total hop time the pacing tries to spend across the whole journey. */
  readonly budgetMs: number;
  /** Slowest single hop (low counts). */
  readonly maxHopMs: number;
  /** Fastest single hop (high counts). */
  readonly minHopMs: number;
  /** Duration of the special 0 ring move. */
  readonly ringMs: number;
}

export const DEFAULT_HOP_CONFIG: HopConfig = {
  budgetMs: 1600,
  maxHopMs: 420,
  minHopMs: 150,
  ringMs: 900,
};

export interface HopStep {
  readonly endMs: number;
  /** Journey progress at take-off (0 = park, 1 = goal). */
  readonly from: number;
  readonly index: number;
  readonly startMs: number;
  /** Journey progress at landing. */
  readonly to: number;
}

export interface HopTimeline {
  readonly hopMs: number;
  readonly hops: readonly HopStep[];
  /** True for the 0 treatment: one looping move instead of counted hops. */
  readonly ring: boolean;
  readonly totalMs: number;
}

/** Builds the hop timeline for a count; 0 (or less) gets the ring move. */
export function hopTimeline(count: number, config: HopConfig = DEFAULT_HOP_CONFIG): HopTimeline {
  if (count <= 0) {
    return {
      hopMs: config.ringMs,
      hops: [{ endMs: config.ringMs, from: 0, index: 0, startMs: 0, to: 1 }],
      ring: true,
      totalMs: config.ringMs,
    };
  }
  const hopMs = Math.min(Math.max(config.budgetMs / count, config.minHopMs), config.maxHopMs);
  const hops = Array.from({ length: count }, (_, index) => ({
    endMs: hopMs * (index + 1),
    from: index / count,
    index,
    startMs: hopMs * index,
    to: (index + 1) / count,
  }));
  return { hopMs, hops, ring: false, totalMs: hopMs * count };
}

/** Burst time: the apex of the hop covering the journey halfway point. */
export function burstTimeMs(timeline: HopTimeline): number {
  const halfway = timeline.hops.find((hop) => hop.to >= 0.5);
  return halfway ? halfway.startMs + timeline.hopMs / 2 : timeline.totalMs / 2;
}
