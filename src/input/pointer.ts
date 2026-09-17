import type { Point } from '../engine/types';
import type { Rect } from '../shell/layout';

/** Maps a viewport pointer position into design coordinates, or `null` outside the field. */
export function mapPointerToField(
  clientX: number,
  clientY: number,
  field: Rect,
  design: { readonly width: number; readonly height: number },
): Point | null {
  if (
    clientX < field.x ||
    clientX > field.x + field.width ||
    clientY < field.y ||
    clientY > field.y + field.height
  ) {
    return null;
  }
  return {
    x: ((clientX - field.x) / field.width) * design.width,
    y: ((clientY - field.y) / field.height) * design.height,
  };
}

/** Only the primary touch drives tracing; extra fingers and palm rests are ignored. */
export function isPrimaryPointer(event: Pick<PointerEvent, 'isPrimary'>): boolean {
  return event.isPrimary;
}

/** Field-space handlers for one tracing session. */
export interface TraceHandlers {
  readonly onDown: (point: Point) => void;
  readonly onMove: (point: Point) => void;
  readonly onUp: () => void;
}

/** Wires pointer events on the canvas to field-space trace handlers; returns a detach function. */
export function attachTraceInput(
  target: HTMLElement,
  field: Rect,
  design: { readonly width: number; readonly height: number },
  handlers: TraceHandlers,
): () => void {
  const route = (event: PointerEvent, handler: (point: Point) => void): void => {
    if (!isPrimaryPointer(event)) {
      return;
    }
    const point = mapPointerToField(event.clientX, event.clientY, field, design);
    if (point) {
      handler(point);
    }
  };
  const handleDown = (event: PointerEvent): void => route(event, handlers.onDown);
  const handleMove = (event: PointerEvent): void => route(event, handlers.onMove);
  const handleUp = (event: PointerEvent): void => {
    if (isPrimaryPointer(event)) {
      handlers.onUp();
    }
  };
  target.addEventListener('pointerdown', handleDown);
  target.addEventListener('pointermove', handleMove);
  target.addEventListener('pointerup', handleUp);
  target.addEventListener('pointercancel', handleUp);
  return () => {
    target.removeEventListener('pointerdown', handleDown);
    target.removeEventListener('pointermove', handleMove);
    target.removeEventListener('pointerup', handleUp);
    target.removeEventListener('pointercancel', handleUp);
  };
}
