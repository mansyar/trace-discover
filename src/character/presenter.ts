// What the character canvas presents. The real Rive character is the goal, but
// the canvas must never be an empty hole where the mascot belongs: the drawn
// stand-in is the default presentation and stays until a load reports ready.

/** The two things the character canvas can show. */
export type CharacterPresentation = 'real' | 'standin';

/** How one load attempt ends; the presenter listens once per attempt. */
export interface CharacterAttemptHooks {
  readonly onError: (error: unknown) => void;
  readonly onReady: () => void;
}

export interface CharacterPresenterOptions {
  /** Starts one load attempt and reports its outcome through the hooks. */
  readonly attempt: (hooks: CharacterAttemptHooks) => void;
  /** Called on every presentation change, never twice with the same value. */
  readonly onChange: (presentation: CharacterPresentation) => void;
  /** Dev-QA surface for a failed attempt; never shown to the child. */
  readonly onFailure?: (error: unknown) => void;
}

export interface CharacterPresenter {
  /** What is on the character canvas right now. */
  presentation: () => CharacterPresentation;
  /** Another attempt after a failure; ignored while one is already in flight. */
  retry: () => void;
  /** The first attempt. */
  start: () => void;
}

export function createCharacterPresenter(options: CharacterPresenterOptions): CharacterPresenter {
  let presentation: CharacterPresentation = 'standin';
  let inFlight = false;

  const present = (next: CharacterPresentation): void => {
    if (next === presentation) {
      return;
    }
    presentation = next;
    options.onChange(next);
  };

  const attempt = (): void => {
    // A retry while an attempt is still in flight would let one slow load run
    // twice, so it is dropped rather than queued: the next explicit retry picks
    // it up.
    if (inFlight) {
      return;
    }
    inFlight = true;
    options.attempt({
      onError: (error) => {
        inFlight = false;
        options.onFailure?.(error);
        // A failure is a fallback, never a blank: whatever was presented before
        // gives way to the drawn stand-in.
        present('standin');
      },
      onReady: () => {
        inFlight = false;
        present('real');
      },
    });
  };

  return {
    presentation: () => presentation,
    retry: attempt,
    start: attempt,
  };
}
