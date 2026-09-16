// Runtime-composed name level: the composed level must preserve the shipped
// letter glyphs' stroke order and counts, stay inside the name box, center in
// the field, end its goal at the last traced point, and thin visuals for long
// names without dropping below the toddler-visible floors.
import { describe, expect, it } from 'vitest';
import type { PathStyle } from '../render/renderPath';
import { LETTER_LEVELS } from './letters';
import { validateLevel } from './level';
import { buildNameLevel, NAME_BOX, nameGlyphScale, namePackFor, namePathStyle } from './name';

function letterById(char: string) {
  const level = LETTER_LEVELS.find((entry) => entry.id === `abc-${char.toLowerCase()}`);
  if (level === undefined) {
    throw new Error(`missing letter glyph for ${char}`);
  }
  return level;
}

describe('buildNameLevel', () => {
  it('composes the letters in order with their glyph stroke counts', () => {
    const level = buildNameLevel('AVA');
    expect(level.id).toBe('name-1');
    expect(level.stroke).toBe('line');
    const expected = [letterById('A'), letterById('V'), letterById('A')].flatMap((glyph) =>
      glyph.strokes.map((stroke) => stroke.length),
    );
    expect(level.strokes.map((stroke) => stroke.length)).toEqual(expected);
  });

  it('keeps every point inside the name box and the field margins', () => {
    for (const name of ['AVA', 'JO', 'MOM', 'ABCDEFG', 'zzz']) {
      const level = buildNameLevel(name);
      for (const stroke of level.strokes) {
        for (const point of stroke) {
          expect(point.x, name).toBeGreaterThanOrEqual(NAME_BOX.left);
          expect(point.x, name).toBeLessThanOrEqual(NAME_BOX.right);
          expect(point.y, name).toBeGreaterThanOrEqual(NAME_BOX.top);
          expect(point.y, name).toBeLessThanOrEqual(NAME_BOX.bottom);
        }
      }
      expect(validateLevel(level), name).toEqual([]);
    }
  });

  it('composes every shipped letter inside the name box', () => {
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const level = buildNameLevel(`A${letter}`);
      for (const stroke of level.strokes) {
        for (const point of stroke) {
          expect(point.x, letter).toBeGreaterThanOrEqual(NAME_BOX.left);
          expect(point.x, letter).toBeLessThanOrEqual(NAME_BOX.right);
          expect(point.y, letter).toBeGreaterThanOrEqual(NAME_BOX.top);
          expect(point.y, letter).toBeLessThanOrEqual(NAME_BOX.bottom);
        }
      }
      expect(validateLevel(level), letter).toEqual([]);
    }
  });

  it('centers the composed name horizontally', () => {
    for (const name of ['AVA', 'JO', 'BEN', 'ABCDEFG']) {
      const level = buildNameLevel(name);
      const xs = level.strokes.flat().map((point) => point.x);
      const center = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(Math.abs(center - 215), name).toBeLessThan(4);
    }
  });

  it('ends at the final control point of the last glyph stroke as the goal', () => {
    const level = buildNameLevel('AVA');
    expect(level.goal).toEqual(level.strokes.at(-1)?.at(-1));
    expect(level.goalArt).toBe('/art/goal/abc-a.png');
    expect(buildNameLevel('JO').goalArt).toBe('/art/goal/abc-o.png');
  });

  it('scales long names down while keeping glyphs visible', () => {
    expect(nameGlyphScale('JO')).toBe(1);
    expect(nameGlyphScale('ABCDEFG')).toBeLessThan(0.5);
    const long = buildNameLevel('ABCDEFG');
    const ys = long.strokes.flat().map((point) => point.y);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(height).toBeLessThan(380);
    expect(height).toBeGreaterThan(90);
  });

  it('rejects characters outside the shipped glyph set', () => {
    expect(() => buildNameLevel('A1')).toThrow('no letter glyph');
  });
});

describe('namePathStyle', () => {
  const base: PathStyle = {
    dotColor: '#6fa8d4',
    dotRadius: 7,
    dotSpacing: 46,
    outlineColor: '#2e4a63',
    outlineWidth: 6,
    paintColor: '#f6b45a',
    ribbonColor: '#cfe3f2',
    ribbonWidth: 64,
    tipColor: '#e8c15a',
    tipRadius: 16,
  };

  it('is the base style at full scale', () => {
    expect(namePathStyle(1, base)).toEqual(base);
  });

  it('thins proportionally and never below the toddler-visible floors', () => {
    const thin = namePathStyle(0.3, base);
    expect(thin.ribbonWidth).toBe(22);
    expect(thin.outlineWidth).toBe(3);
    expect(thin.dotRadius).toBe(5);
    expect(thin.dotSpacing).toBe(30);
    expect(thin.tipRadius).toBe(10);
    expect(thin.paintColor).toBe(base.paintColor);
  });
});

describe('namePackFor', () => {
  it('is null without a valid name', () => {
    expect(namePackFor(undefined)).toBeNull();
    expect(namePackFor('')).toBeNull();
    expect(namePackFor('A')).toBeNull();
  });

  it('builds the single-level mini-pack from the sanitized name', () => {
    const pack = namePackFor('aira');
    expect(pack?.id).toBe('name');
    expect(pack?.badgeId).toBe('name-badge');
    expect(pack?.menuFill).toBe('#f6b45a');
    expect(pack?.bonuses).toEqual([]);
    expect(pack?.bonusUnlocks).toEqual([]);
    expect(pack?.levels).toHaveLength(1);
    expect(pack?.levels[0]?.id).toBe('name-1');
    expect(pack?.levels[0]?.goalArt).toBe('/art/goal/abc-a.png');
  });
});
