import { describe, expect, it } from 'vitest';

// CI negative-control (track `cicd-pipeline_20260915`): intentionally failing.
// Lives only on the throwaway PR branch `qa/ci-negative-control`; removed before close.
describe('CI negative control', () => {
  it('fails on purpose to prove the test gate goes red', () => {
    expect(1 + 1).toBe(3);
  });
});
