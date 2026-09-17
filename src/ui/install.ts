// Install-guide detection kept pure for testing: the shell passes the UA and
// display-mode values, and this module picks the copy variant.
export type InstallVariant = 'android' | 'generic' | 'installed' | 'ios';

export interface InstallSignals {
  /** `navigator.maxTouchPoints` — needed because iPadOS masquerades as macOS. */
  readonly maxTouchPoints: number;
  /** `display-mode: standalone` match, or iOS `navigator.standalone`. */
  readonly standalone: boolean;
  readonly userAgent: string;
}

const IOS_PATTERN = /iPhone|iPad|iPod/;
const MAC_PATTERN = /Macintosh/;

export function installVariant(signals: InstallSignals): InstallVariant {
  if (signals.standalone) {
    return 'installed';
  }
  if (IOS_PATTERN.test(signals.userAgent)) {
    return 'ios';
  }
  if (MAC_PATTERN.test(signals.userAgent) && signals.maxTouchPoints > 1) {
    return 'ios';
  }
  if (signals.userAgent.includes('Android')) {
    return 'android';
  }
  return 'generic';
}
