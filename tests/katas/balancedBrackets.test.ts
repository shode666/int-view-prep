import { describe, expect, it } from 'vitest';
import { isBalanced } from '@src/katas/balancedBrackets';

describe('isBalanced', () => {
  it.each([
    ['()', true],
    ['()[]{}', true],
    ['([{}])', true],
    ['a(b[c]{d})', true],
    ['no brackets at all', true],
    ['', true],
    ['(]', false],
    ['([)]', false],
    ['(', false],
    [')', false],
    ['(()', false],
  ])('%s → %s', (input, expected) => {
    expect(isBalanced(input)).toBe(expected);
  });
});
