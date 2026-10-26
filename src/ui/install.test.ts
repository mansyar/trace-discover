import { describe, expect, it } from 'vitest';

import { type InstallSignals, installPanelLayout, installVariant } from './install';

function signals(partial: Partial<InstallSignals>): InstallSignals {
  return { maxTouchPoints: 0, standalone: false, userAgent: '', ...partial };
}

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15';
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15';
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';
const WINDOWS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

describe('installVariant', () => {
  it('reports installed whenever the app runs standalone', () => {
    expect(installVariant(signals({ standalone: true, userAgent: ANDROID_UA }))).toBe('installed');
    expect(installVariant(signals({ standalone: true, userAgent: MAC_UA }))).toBe('installed');
  });

  it('detects iPhone and iPad Safari', () => {
    expect(installVariant(signals({ userAgent: IPHONE_UA }))).toBe('ios');
    expect(installVariant(signals({ userAgent: IPAD_UA }))).toBe('ios');
  });

  it('treats a touch-enabled Macintosh UA as iPadOS', () => {
    expect(installVariant(signals({ userAgent: MAC_UA, maxTouchPoints: 5 }))).toBe('ios');
    expect(installVariant(signals({ userAgent: MAC_UA }))).toBe('generic');
  });

  it('detects Android', () => {
    expect(installVariant(signals({ userAgent: ANDROID_UA }))).toBe('android');
  });

  it('falls back to generic for desktop and unknown agents', () => {
    expect(installVariant(signals({ userAgent: WINDOWS_UA }))).toBe('generic');
    expect(installVariant(signals({}))).toBe('generic');
  });
});

describe('installPanelLayout', () => {
  /** The generic variant is the longest copy block (nine lines). */
  const LINES = 9;

  it('keeps the authored phone panels byte-identical', () => {
    expect(installPanelLayout(430, 860)).toEqual({
      fontSize: 26,
      lineHeight: 52,
      panel: { height: 620, width: 350, x: 40, y: 120 },
      startY: 190,
    });
    expect(installPanelLayout(860, 430)).toEqual({
      fontSize: 22,
      lineHeight: 36,
      panel: { height: 350, width: 780, x: 40, y: 40 },
      startY: 80,
    });
  });

  it('centers the panel and keeps every line inside it at tablet spaces', () => {
    const spaces = [
      { height: 1280, width: 960 },
      { height: 960, width: 1280 },
      { height: 1280, width: 800 },
      { height: 800, width: 1280 },
    ];
    for (const space of spaces) {
      const layout = installPanelLayout(space.width, space.height);
      const { panel } = layout;
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.y).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.width).toBeLessThanOrEqual(space.width);
      expect(panel.y + panel.height).toBeLessThanOrEqual(space.height);
      // Vertically centered: the free space splits evenly above and below.
      expect(Math.abs(panel.y - (space.height - panel.height) / 2)).toBeLessThan(1);
      expect(layout.startY).toBeGreaterThan(panel.y);
      expect(layout.startY + (LINES - 1) * layout.lineHeight).toBeLessThan(panel.y + panel.height);
      expect(layout.fontSize).toBeGreaterThan(22);
    }
  });

  it('keeps the shortest copy inside the same panel', () => {
    for (const size of [
      { height: 860, lines: 6, width: 430 },
      { height: 1280, lines: 6, width: 960 },
      { height: 960, lines: 6, width: 1280 },
    ]) {
      const layout = installPanelLayout(size.width, size.height);
      expect(layout.startY + (size.lines - 1) * layout.lineHeight).toBeLessThan(
        layout.panel.y + layout.panel.height,
      );
    }
  });
});
