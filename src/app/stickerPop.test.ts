import { describe, expect, it } from 'vitest';
import {
  POP_ART_SCALE,
  POP_DURATION_MS,
  POP_FIELD_MARGIN,
  POP_PEAK_SCALE,
  stickerPopFrame,
  stickerPopPlacement,
} from './stickerPop';

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

describe('stickerPopPlacement', () => {
  const FIELD = { height: 860, width: 430 };
  const cell = { radius: 48, x: 215, y: 430 };

  it('leaves a centered pop in place, lifted by the frame rise', () => {
    const frame = stickerPopFrame(500);
    const placement = stickerPopPlacement(cell, frame, FIELD.width, FIELD.height);
    expect(placement.x).toBeCloseTo(cell.x, 5);
    expect(placement.y).toBeCloseTo(cell.y - frame.rise, 5);
  });

  it('slides an edge-cell pop inward so the art stays on-field', () => {
    const edge = { radius: 48, x: 50, y: 255 };
    const placement = stickerPopPlacement(edge, stickerPopFrame(320), FIELD.width, FIELD.height);
    const half = (edge.radius * POP_ART_SCALE * Math.max(placement.scaleX, placement.scaleY)) / 2;
    expect(placement.x).toBeGreaterThanOrEqual(half - 1e-9);
    expect(placement.x + half).toBeLessThanOrEqual(FIELD.width + 1e-9);
    expect(placement.y).toBeGreaterThanOrEqual(half - 1e-9);
    expect(placement.y + half).toBeLessThanOrEqual(FIELD.height + 1e-9);
  });

  it('caps the peak size to the field while staying a big bloom', () => {
    let maxSize = 0;
    for (let elapsed = 0; elapsed <= POP_DURATION_MS; elapsed += 20) {
      const frame = stickerPopFrame(elapsed);
      const placement = stickerPopPlacement(cell, frame, FIELD.width, FIELD.height);
      maxSize = Math.max(
        maxSize,
        cell.radius * POP_ART_SCALE * Math.max(placement.scaleX, placement.scaleY),
      );
    }
    expect(maxSize).toBeLessThanOrEqual(FIELD.width - POP_FIELD_MARGIN * 2 + 1e-9);
    expect(maxSize).toBeGreaterThan(380);
  });

  it('passes frames through untouched while they fit', () => {
    const frame = stickerPopFrame(60);
    const placement = stickerPopPlacement(cell, frame, FIELD.width, FIELD.height);
    expect(placement.scaleX).toBeCloseTo(frame.scaleX, 10);
    expect(placement.scaleY).toBeCloseTo(frame.scaleY, 10);
  });
});
