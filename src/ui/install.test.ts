import { describe, expect, it } from 'vitest';
import { type InstallSignals, installVariant } from './install';

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
