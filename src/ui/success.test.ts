import { describe, expect, it } from 'vitest';

import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { hitSuccessButton, type SuccessButton, successLayout } from './success';

const LAYOUT = successLayout(FIELD_WIDTH, FIELD_HEIGHT);

function buttonAt(index: number): SuccessButton {
  const button = LAYOUT.buttons[index];
  if (!button) {
    throw new Error(`missing button ${index}`);
  }
  return button;
}

describe('successLayout', () => {
  it('places three buttons in replay/next/home order', () => {
    expect(LAYOUT.buttons).toHaveLength(3);
    expect(LAYOUT.buttons.map((button) => button.action)).toEqual(['replay', 'next', 'home']);
  });

  it('sizes every target to at least 90px diameter', () => {
    for (const button of LAYOUT.buttons) {
      expect(button.radius * 2).toBeGreaterThanOrEqual(90);
    }
  });

  it('keeps every button fully inside the field', () => {
    for (const button of LAYOUT.buttons) {
      expect(button.x - button.radius).toBeGreaterThanOrEqual(0);
      expect(button.x + button.radius).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(button.y - button.radius).toBeGreaterThanOrEqual(0);
      expect(button.y + button.radius).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it('aligns the row and spaces buttons without overlap', () => {
    const first = buttonAt(0);
    const second = buttonAt(1);
    const third = buttonAt(2);
    expect(first.y).toBe(second.y);
    expect(second.y).toBe(third.y);
    expect(second.x - first.x).toBeGreaterThanOrEqual(first.radius + second.radius + 24);
    expect(third.x - second.x).toBeGreaterThanOrEqual(second.radius + third.radius + 24);
  });
});

describe('hitSuccessButton', () => {
  it('hits each button at its center', () => {
    expect(hitSuccessButton(LAYOUT, { x: buttonAt(0).x, y: buttonAt(0).y })).toBe('replay');
    expect(hitSuccessButton(LAYOUT, { x: buttonAt(1).x, y: buttonAt(1).y })).toBe('next');
    expect(hitSuccessButton(LAYOUT, { x: buttonAt(2).x, y: buttonAt(2).y })).toBe('home');
  });

  it('includes the exact edge and rejects just outside', () => {
    const button = buttonAt(1);
    expect(hitSuccessButton(LAYOUT, { x: button.x + button.radius, y: button.y })).toBe('next');
    expect(hitSuccessButton(LAYOUT, { x: button.x + button.radius + 5, y: button.y })).toBeNull();
  });

  it('returns null between and away from buttons', () => {
    const first = buttonAt(0);
    const second = buttonAt(1);
    expect(hitSuccessButton(LAYOUT, { x: (first.x + second.x) / 2, y: first.y })).toBeNull();
    expect(hitSuccessButton(LAYOUT, { x: first.x, y: first.y + 200 })).toBeNull();
  });
});

describe('successLayout (landscape)', () => {
  const LANDSCAPE = successLayout(860, 430);

  it('keeps the bottom row inside the wide field', () => {
    for (const button of LANDSCAPE.buttons) {
      expect(button.x - button.radius).toBeGreaterThanOrEqual(0);
      expect(button.x + button.radius).toBeLessThanOrEqual(860);
      expect(button.y - button.radius).toBeGreaterThanOrEqual(0);
      expect(button.y + button.radius).toBeLessThanOrEqual(430);
    }
  });

  it('stays centered with toddler-sized targets', () => {
    const [replay, next, home] = LANDSCAPE.buttons;
    if (!replay || !next || !home) {
      throw new Error('missing landscape buttons');
    }
    expect(next.x).toBe(430);
    expect(next.y).toBe(310);
    expect(replay.y).toBe(next.y);
    expect(replay.radius * 2).toBeGreaterThanOrEqual(90);
  });
});
