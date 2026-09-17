import { describe, expect, it } from 'vitest';
import { composeWordRow, type WordGlyph } from './word';

/** A flat horizontal bar glyph: the simplest possible word-row building block. */
function bar(left: number, right: number, y = 200): WordGlyph {
  return {
    left,
    right,
    strokes: [
      [
        { x: left, y },
        { x: right, y },
      ],
    ],
  };
}

const BOX = { bottom: 400, left: 0, right: 400, top: 0 } as const;

describe('composeWordRow', () => {
  it('keeps glyph order and natural gaps between neighbours', () => {
    const row = composeWordRow([bar(0, 100), bar(0, 50)], BOX, 20);
    expect(row.scale).toBe(1);
    expect(row.strokes.length).toBe(2);
    expect(row.strokes[0]).toEqual([
      { x: 115, y: 200 },
      { x: 215, y: 200 },
    ]);
    expect(row.strokes[1]).toEqual([
      { x: 235, y: 200 },
      { x: 285, y: 200 },
    ]);
  });

  it('centres the composed row inside the box', () => {
    const row = composeWordRow([bar(0, 100)], BOX, 20);
    expect(row.strokes[0]?.[0]?.x).toBe(150);
    expect(row.strokes[0]?.[1]?.x).toBe(250);
  });

  it('scales the row down to fit the box width exactly', () => {
    const row = composeWordRow([bar(0, 100), bar(0, 100)], { ...BOX, right: 150 }, 0);
    expect(row.scale).toBeCloseTo(0.75, 10);
    expect(row.strokes[0]).toEqual([
      { x: 0, y: 200 },
      { x: 75, y: 200 },
    ]);
    expect(row.strokes[1]).toEqual([
      { x: 75, y: 200 },
      { x: 150, y: 200 },
    ]);
  });

  it('never grows past the scale cap', () => {
    const row = composeWordRow([bar(0, 100)], BOX, 20, 0.5);
    expect(row.scale).toBe(0.5);
    expect(row.strokes[0]?.[0]?.x).toBe(175);
    expect(row.strokes[0]?.[1]?.x).toBe(225);
  });

  it('maps glyph height around the box centre line', () => {
    const glyph: WordGlyph = {
      left: 0,
      right: 100,
      strokes: [
        [
          { x: 0, y: 0 },
          { x: 100, y: 400 },
        ],
      ],
    };
    const row = composeWordRow([glyph], BOX, 0, 0.5);
    expect(row.strokes[0]).toEqual([
      { x: 175, y: 100 },
      { x: 225, y: 300 },
    ]);
  });

  it('composes an empty glyph list to an empty row', () => {
    const row = composeWordRow([], BOX, 20);
    expect(row.strokes).toEqual([]);
    expect(row.scale).toBe(1);
  });
});
