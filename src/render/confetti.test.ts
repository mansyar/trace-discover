import { describe, expect, it } from 'vitest';

import { CONFETTI_COLORS, createConfetti, GRAVITY, stepConfetti } from './confetti';

const ORIGIN = { x: 215, y: 430 };

describe('createConfetti', () => {
  it('is deterministic for a given seed', () => {
    expect(createConfetti(24, 7, ORIGIN)).toEqual(createConfetti(24, 7, ORIGIN));
  });

  it('differs across seeds', () => {
    expect(createConfetti(24, 7, ORIGIN)).not.toEqual(createConfetti(24, 8, ORIGIN));
  });

  it('bursts outward from the origin with palette colors', () => {
    const particles = createConfetti(24, 7, ORIGIN);
    expect(particles).toHaveLength(24);
    expect(particles.some((particle) => particle.vy < 0)).toBe(true);
    expect(particles.some((particle) => particle.vx > 0)).toBe(true);
    expect(particles.some((particle) => particle.vx < 0)).toBe(true);
    for (const particle of particles) {
      expect(CONFETTI_COLORS).toContain(particle.color);
      expect(particle.size).toBeGreaterThan(0);
      expect(particle.x).toBe(ORIGIN.x);
      expect(particle.y).toBe(ORIGIN.y);
    }
  });
});

describe('stepConfetti', () => {
  it('integrates velocity with gravity each step', () => {
    const particles = createConfetti(8, 3, ORIGIN);
    const step1 = stepConfetti(particles, 0.1);
    const step2 = stepConfetti(step1, 0.1);
    for (let index = 0; index < step1.length; index += 1) {
      const start = particles[index];
      const first = step1[index];
      const second = step2[index];
      if (!start || !first || !second) {
        throw new Error('missing particle');
      }
      expect(first.x - start.x).toBeCloseTo(start.vx * 0.1, 6);
      expect(first.y - start.y).toBeCloseTo(start.vy * 0.1, 6);
      expect(second.vy - first.vy).toBeCloseTo(GRAVITY * 0.1, 6);
    }
  });
});
