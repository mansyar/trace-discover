// What the character canvas presents. The real Rive character is the goal, but
// the canvas must never be an empty hole where the mascot belongs: the drawn
// stand-in is the default presentation and stays until a load reports ready.
// Implementation lands with the phase's Green step.

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
  void options;
  throw new Error('createCharacterPresenter: not implemented');
}
