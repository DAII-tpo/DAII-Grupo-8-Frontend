import { describe, expect, it } from 'vitest';

import { isComplete, suggestPriority } from './triage';

describe('suggestPriority', () => {
  it.each([
    [{ canMove: true, bleeding: false, vehicleInvolved: true }, 'P1'],
    [{ canMove: true, bleeding: true, vehicleInvolved: false }, 'P1'],
    [{ canMove: false, bleeding: false, vehicleInvolved: false }, 'P2'],
    [{ canMove: true, bleeding: false, vehicleInvolved: false }, 'P3'],
    [{}, 'P1'],
    [{ canMove: true, bleeding: false }, 'P1'],
  ])('para %o sugiere %s', (answers, expected) => {
    expect(suggestPriority(answers)).toBe(expected);
  });

  it('el cuestionario está completo solo con las tres respuestas', () => {
    expect(isComplete({ canMove: true, bleeding: false })).toBe(false);
    expect(isComplete({ canMove: true, bleeding: false, vehicleInvolved: false })).toBe(true);
  });
});
