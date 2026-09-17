import { describe, expect, it } from 'vitest';
import { POP_DURATION_MS, POP_PEAK_SCALE, stickerPopFrame } from './stickerPop';

describe('stickerPopFrame', () => {
  it('starts at rest', () => {
    const frame = stickerPopFrame(0);
    expect(frame.scaleX).toBeCloseTo(1, 5);
    expect(frame.scaleY).toBeCloseTo(1, 5);
    expect(frame.rise).toBeCloseTo(0, 5);
    expect(frame.sparkle).toBeCloseTo(0, 5);
    expect(frame.done).toBe(false);
  });

  it('grows quickly through the pop', () => {
    const early = stickerPopFrame(100);
    const mid = stickerPopFrame(300);
    expect(early.scaleY).toBeGreaterThan(1.5);
    expect(mid.scaleY).toBeGreaterThan(early.scaleY);
    expect(mid.scaleY).toBeGreaterThan(3.5);
  });

  it('springs past the peak with a squash-and-stretch wobble', () => {
    let peak = 0;
    let maxStretch = 0;
    for (let elapsed = 0; elapsed <= 500; elapsed += 25) {
      const frame = stickerPopFrame(elapsed);
      peak = Math.max(peak, frame.scaleY, frame.scaleX);
      const ratio = frame.scaleY / frame.scaleX;
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
      maxStretch = Math.max(maxStretch, Math.abs(ratio - 1));
    }
    // ~400 field units over a 96-unit cell.
    expect(peak).toBeGreaterThanOrEqual(POP_PEAK_SCALE);
    expect(peak).toBeLessThan(5.5);
    expect(maxStretch).toBeGreaterThanOrEqual(0.04);
  });

  it('bursts sparkles early and fades them', () => {
    expect(stickerPopFrame(150).sparkle).toBeGreaterThanOrEqual(0.6);
    expect(stickerPopFrame(300).sparkle).toBeCloseTo(1, 1);
    expect(stickerPopFrame(900).sparkle).toBe(0);
  });

  it('settles back toward the cell before the duration ends', () => {
    const late = stickerPopFrame(POP_DURATION_MS - 50);
    expect(late.scaleY).toBeLessThan(1.3);
    expect(late.scaleY).toBeGreaterThan(0.7);
    expect(late.done).toBe(false);
  });

  it('reports done and returns to rest at the duration', () => {
    const done = stickerPopFrame(POP_DURATION_MS);
    expect(done.done).toBe(true);
    expect(done.scaleX).toBeCloseTo(1, 5);
    expect(done.scaleY).toBeCloseTo(1, 5);
    expect(done.rise).toBeCloseTo(0, 5);
    expect(done.sparkle).toBe(0);
  });

  it('is deterministic', () => {
    expect(stickerPopFrame(321)).toEqual(stickerPopFrame(321));
  });
});
