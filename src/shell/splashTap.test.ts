import { describe, expect, it } from 'vitest';
import { createSplashTapHold } from './splashTap';

describe('createSplashTapHold', () => {
  it('has nothing to replay before any tap', () => {
    const hold = createSplashTapHold();
    expect(hold.take()).toBe(false);
    expect(hold.take()).toBe(false);
  });

  it('reports a tap taken while the gate was closed', () => {
    const hold = createSplashTapHold();
    hold.hold();
    expect(hold.take()).toBe(true);
  });

  it('reports a held tap exactly once', () => {
    const hold = createSplashTapHold();
    hold.hold();
    expect(hold.take()).toBe(true);
    expect(hold.take()).toBe(false);
  });

  it('collapses repeated taps into a single replay', () => {
    const hold = createSplashTapHold();
    hold.hold();
    hold.hold();
    hold.hold();
    expect(hold.take()).toBe(true);
    expect(hold.take()).toBe(false);
  });

  it('holds again after a replay', () => {
    const hold = createSplashTapHold();
    hold.hold();
    expect(hold.take()).toBe(true);
    hold.hold();
    expect(hold.take()).toBe(true);
    expect(hold.take()).toBe(false);
  });
});
