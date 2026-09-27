// A splash tap can arrive before boot has decided whether the app may advance.
// The gate owns that decision, so the tap cannot open it — but the tap must not
// be thrown away either. The splash is drawn as a tappable screen for the first
// frames of a cold boot, and a tap that silently does nothing reads as a broken
// app to the person tapping it. This hold remembers that a tap happened — once,
// however many times it was tapped — and hands it back the moment the gate opens.

export interface SplashTapHold {
  /** Remembers a splash tap taken while the gate was closed. */
  hold: () => void;
  /** Reports whether a tap is waiting to be replayed, clearing it. */
  take: () => boolean;
}

/** Creates an empty hold; taps collapse into a single replay. */
export function createSplashTapHold(): SplashTapHold {
  let held = false;
  return {
    hold: () => {
      held = true;
    },
    take: () => {
      const waiting = held;
      held = false;
      return waiting;
    },
  };
}
