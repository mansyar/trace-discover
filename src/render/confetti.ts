import type { Point } from '../engine/types';

export interface ConfettiParticle {
  readonly color: string;
  readonly size: number;
  readonly vx: number;
  readonly vy: number;
  readonly x: number;
  readonly y: number;
}

export const CONFETTI_COLORS = ['#f6b45a', '#e86a92', '#6ec6b9', '#6fa8d4', '#e8c15a'] as const;

export const GRAVITY = 900; // px/s^2

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic burst from `origin` (same seed replays identically for QA). */
export function createConfetti(count: number, seed: number, origin: Point): ConfettiParticle[] {
  const random = mulberry32(seed);
  const particles: ConfettiParticle[] = [];
  for (let index = 0; index < count; index += 1) {
    const direction = index % 2 === 0 ? 1 : -1;
    const size = 4 + random() * 5;
    const color = CONFETTI_COLORS[Math.floor(random() * CONFETTI_COLORS.length)] ?? '#f6b45a';
    particles.push({
      color,
      size,
      vx: direction * (60 + random() * 240),
      vy: -140 - random() * 260,
      x: origin.x,
      y: origin.y,
    });
  }
  return particles;
}

/** One gravity step; positions advance by the pre-step velocities. */
export function stepConfetti(
  particles: readonly ConfettiParticle[],
  dtSeconds: number,
): ConfettiParticle[] {
  return particles.map((particle) => ({
    ...particle,
    vy: particle.vy + GRAVITY * dtSeconds,
    x: particle.x + particle.vx * dtSeconds,
    y: particle.y + particle.vy * dtSeconds,
  }));
}
