import { describe, expect, it } from 'vitest';
import {
  type CharacterAttemptHooks,
  type CharacterPresentation,
  createCharacterPresenter,
} from './presenter';

/** Captures each attempt's hooks so a test can end the attempt however it likes. */
function attempts() {
  const opened: CharacterAttemptHooks[] = [];
  const changes: CharacterPresentation[] = [];
  const failures: unknown[] = [];
  return {
    opened,
    changes,
    failures,
    presenter: createCharacterPresenter({
      attempt: (hooks) => {
        opened.push(hooks);
      },
      onChange: (presentation) => {
        changes.push(presentation);
      },
      onFailure: (error) => {
        failures.push(error);
      },
    }),
  };
}

describe('createCharacterPresenter', () => {
  it('presents the drawn stand-in until the character loads', () => {
    const fixture = attempts();
    expect(fixture.presenter.presentation()).toBe('standin');

    fixture.presenter.start();
    expect(fixture.presenter.presentation()).toBe('standin');
    expect(fixture.changes).toEqual([]);

    fixture.opened[0]?.onReady();
    expect(fixture.presenter.presentation()).toBe('real');
    expect(fixture.changes).toEqual(['real']);
  });

  it('reports a failed load and leaves the stand-in on screen', () => {
    const fixture = attempts();
    const error = new Error('rive failed to load');

    fixture.presenter.start();
    fixture.opened[0]?.onError(error);

    expect(fixture.presenter.presentation()).toBe('standin');
    expect(fixture.failures).toEqual([error]);
    expect(fixture.changes).toEqual([]);
  });

  it('replaces the stand-in when a retry succeeds', () => {
    const fixture = attempts();

    fixture.presenter.start();
    fixture.opened[0]?.onError(new Error('offline'));
    fixture.presenter.retry();

    expect(fixture.opened).toHaveLength(2);
    fixture.opened[1]?.onReady();
    expect(fixture.presenter.presentation()).toBe('real');
    expect(fixture.changes).toEqual(['real']);
  });

  it('ignores a retry while an attempt is still in flight', () => {
    const fixture = attempts();

    fixture.presenter.start();
    fixture.presenter.retry();
    expect(fixture.opened).toHaveLength(1);

    fixture.opened[0]?.onError(new Error('offline'));
    fixture.presenter.retry();
    expect(fixture.opened).toHaveLength(2);
  });

  it('falls back to the stand-in when a loaded character later fails', () => {
    const fixture = attempts();
    const error = new Error('reload failed');

    fixture.presenter.start();
    fixture.opened[0]?.onReady();
    fixture.presenter.retry();
    fixture.opened[1]?.onError(error);

    expect(fixture.presenter.presentation()).toBe('standin');
    expect(fixture.changes).toEqual(['real', 'standin']);
    expect(fixture.failures).toEqual([error]);
  });

  it('never reports the same presentation twice', () => {
    const fixture = attempts();

    fixture.presenter.start();
    fixture.opened[0]?.onError(new Error('offline'));
    fixture.presenter.retry();
    fixture.opened[1]?.onError(new Error('still offline'));

    expect(fixture.failures).toHaveLength(2);
    expect(fixture.changes).toEqual([]);
    expect(fixture.presenter.presentation()).toBe('standin');

    fixture.presenter.retry();
    fixture.opened[2]?.onReady();
    fixture.presenter.retry();
    fixture.opened[3]?.onReady();

    expect(fixture.changes).toEqual(['real']);
  });
});
