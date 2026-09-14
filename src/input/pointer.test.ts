import { describe, expect, it, vi } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { fitRect } from '../shell/layout';
import { attachTraceInput, isPrimaryPointer, mapPointerToField } from './pointer';

/** Reference viewport: 390 x 844 CSS px -> field rect { x: 0, y: 32, w: 390, h: 780 }. */
const field = fitRect(390, 844, FIELD_WIDTH, FIELD_HEIGHT);

function fakeCanvas(): {
  canvas: HTMLElement;
  listeners: Map<string, (event: PointerEvent) => void>;
} {
  const listeners = new Map<string, (event: PointerEvent) => void>();
  const canvas = {
    addEventListener: (type: string, listener: (event: PointerEvent) => void) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
  };
  return { canvas: canvas as unknown as HTMLElement, listeners };
}

function pointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return { isPrimary: true, clientX: 195, clientY: 422, ...overrides } as PointerEvent;
}

describe('mapPointerToField', () => {
  it('maps viewport points into design-space field coordinates', () => {
    expect(mapPointerToField(195, 422, field)).toEqual({ x: 215, y: 430 });
    expect(mapPointerToField(0, 32, field)).toEqual({ x: 0, y: 0 });
    expect(mapPointerToField(390, 812, field)).toEqual({ x: 430, y: 860 });
    expect(mapPointerToField(39, 110, field)).toEqual({ x: 43, y: 86 });
  });

  it('returns null outside the play field (letterbox bands)', () => {
    expect(mapPointerToField(195, 31, field)).toBeNull();
    expect(mapPointerToField(-1, 422, field)).toBeNull();
    expect(mapPointerToField(391, 422, field)).toBeNull();
    expect(mapPointerToField(195, 813, field)).toBeNull();
  });
});

describe('isPrimaryPointer', () => {
  it('accepts only the primary touch point', () => {
    expect(isPrimaryPointer({ isPrimary: true })).toBe(true);
    expect(isPrimaryPointer({ isPrimary: false })).toBe(false);
  });
});

describe('attachTraceInput', () => {
  it('routes primary pointer events to handlers with field coordinates', () => {
    const { canvas, listeners } = fakeCanvas();
    const onDown = vi.fn();
    const onMove = vi.fn();
    const onUp = vi.fn();
    attachTraceInput(canvas, field, { onDown, onMove, onUp });
    listeners.get('pointerdown')?.(pointerEvent());
    listeners.get('pointermove')?.(pointerEvent({ clientX: 39, clientY: 110 }));
    listeners.get('pointerup')?.(pointerEvent());
    expect(onDown).toHaveBeenCalledWith({ x: 215, y: 430 });
    expect(onMove).toHaveBeenCalledWith({ x: 43, y: 86 });
    expect(onUp).toHaveBeenCalledTimes(1);
  });

  it('ignores secondary touches (palm and stray fingers)', () => {
    const { canvas, listeners } = fakeCanvas();
    const onDown = vi.fn();
    const onMove = vi.fn();
    const onUp = vi.fn();
    attachTraceInput(canvas, field, { onDown, onMove, onUp });
    listeners.get('pointerdown')?.(pointerEvent({ isPrimary: false }));
    listeners.get('pointermove')?.(pointerEvent({ isPrimary: false }));
    listeners.get('pointerup')?.(pointerEvent({ isPrimary: false }));
    expect(onDown).toHaveBeenCalledTimes(0);
    expect(onMove).toHaveBeenCalledTimes(0);
    expect(onUp).toHaveBeenCalledTimes(0);
  });

  it('ignores touches outside the play field', () => {
    const { canvas, listeners } = fakeCanvas();
    const onDown = vi.fn();
    attachTraceInput(canvas, field, { onDown, onMove: vi.fn(), onUp: vi.fn() });
    listeners.get('pointerdown')?.(pointerEvent({ clientY: 0 }));
    expect(onDown).toHaveBeenCalledTimes(0);
  });

  it('detaches every listener on cleanup', () => {
    const { canvas, listeners } = fakeCanvas();
    const detach = attachTraceInput(canvas, field, {
      onDown: vi.fn(),
      onMove: vi.fn(),
      onUp: vi.fn(),
    });
    expect(listeners.size).toBe(4);
    detach();
    expect(listeners.size).toBe(0);
  });
});
