import { describe, expect, it } from 'vitest';
import {
  validParentheses,
  MinStack,
  evalRPN,
  MyQueue,
  MyStack,
  removeAdjacentDuplicates,
  dailyTemperatures,
  nextGreaterElement,
  simplifyPath,
  asteroidCollision,
  decodeString,
  slidingWindowMaximum,
} from '@src/drills/stackQueue';

describe('DRILL 51 — validParentheses', () => {
  it('accepts matched brackets of every type', () => {
    expect(validParentheses('()[]{}')).toBe(true);
  });
  it('accepts nested brackets', () => {
    expect(validParentheses('([{}])')).toBe(true);
  });
  it('rejects a type mismatch', () => {
    expect(validParentheses('(]')).toBe(false);
  });
  it('rejects wrong nesting order', () => {
    expect(validParentheses('([)]')).toBe(false);
  });
  it('treats the empty string as valid', () => {
    expect(validParentheses('')).toBe(true);
  });
});

describe('DRILL 52 — MinStack', () => {
  it('tracks the minimum across push/pop', () => {
    const s = new MinStack();
    s.push(-2);
    s.push(0);
    s.push(-3);
    expect(s.getMin()).toBe(-3);
    s.pop();
    expect(s.top()).toBe(0);
    expect(s.getMin()).toBe(-2);
  });
  it('returns the min when it repeats', () => {
    const s = new MinStack();
    s.push(1);
    s.push(1);
    s.push(2);
    s.pop();
    expect(s.getMin()).toBe(1);
    s.pop();
    expect(s.getMin()).toBe(1);
  });
  it('reports top of a single element', () => {
    const s = new MinStack();
    s.push(5);
    expect(s.top()).toBe(5);
    expect(s.getMin()).toBe(5);
  });
});

describe('DRILL 53 — evalRPN', () => {
  it('evaluates 2 1 + 3 *', () => {
    expect(evalRPN(['2', '1', '+', '3', '*'])).toBe(9);
  });
  it('evaluates with truncating division', () => {
    expect(evalRPN(['4', '13', '5', '/', '+'])).toBe(6);
  });
  it('truncates negative division toward zero', () => {
    expect(evalRPN(['7', '-3', '/'])).toBe(-2);
  });
  it('returns a single number unchanged', () => {
    expect(evalRPN(['42'])).toBe(42);
  });
});

describe('DRILL 54 — MyQueue', () => {
  it('behaves as FIFO', () => {
    const q = new MyQueue();
    q.push(1);
    q.push(2);
    expect(q.peek()).toBe(1);
    expect(q.pop()).toBe(1);
    expect(q.pop()).toBe(2);
    expect(q.empty()).toBe(true);
  });
  it('reports empty on a fresh queue', () => {
    expect(new MyQueue().empty()).toBe(true);
  });
  it('interleaves push and pop correctly', () => {
    const q = new MyQueue();
    q.push(1);
    expect(q.pop()).toBe(1);
    q.push(2);
    q.push(3);
    expect(q.peek()).toBe(2);
    expect(q.pop()).toBe(2);
    expect(q.empty()).toBe(false);
  });
});

describe('DRILL 55 — MyStack', () => {
  it('behaves as LIFO', () => {
    const s = new MyStack();
    s.push(1);
    s.push(2);
    expect(s.top()).toBe(2);
    expect(s.pop()).toBe(2);
    expect(s.pop()).toBe(1);
    expect(s.empty()).toBe(true);
  });
  it('reports empty on a fresh stack', () => {
    expect(new MyStack().empty()).toBe(true);
  });
  it('handles repeated push/pop', () => {
    const s = new MyStack();
    s.push(1);
    s.push(2);
    s.push(3);
    expect(s.pop()).toBe(3);
    s.push(4);
    expect(s.top()).toBe(4);
    expect(s.pop()).toBe(4);
    expect(s.pop()).toBe(2);
  });
});

describe('DRILL 56 — removeAdjacentDuplicates', () => {
  it('removes a single adjacent pair chain', () => {
    expect(removeAdjacentDuplicates('abbaca')).toBe('ca');
  });
  it('collapses nested duplicates', () => {
    expect(removeAdjacentDuplicates('azxxzy')).toBe('ay');
  });
  it('returns empty when everything cancels', () => {
    expect(removeAdjacentDuplicates('aa')).toBe('');
  });
  it('leaves a duplicate-free string untouched', () => {
    expect(removeAdjacentDuplicates('abc')).toBe('abc');
  });
});

describe('DRILL 57 — dailyTemperatures', () => {
  it('computes waits for the classic example', () => {
    expect(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73])).toEqual([1, 1, 4, 2, 1, 1, 0, 0]);
  });
  it('returns zeros for a non-increasing sequence', () => {
    expect(dailyTemperatures([80, 70, 60])).toEqual([0, 0, 0]);
  });
  it('returns 1s for a strictly increasing sequence', () => {
    expect(dailyTemperatures([30, 40, 50])).toEqual([1, 1, 0]);
  });
  it('handles a single day', () => {
    expect(dailyTemperatures([50])).toEqual([0]);
  });
});

describe('DRILL 58 — nextGreaterElement', () => {
  it('maps each nums1 value to its next greater in nums2', () => {
    expect(nextGreaterElement([4, 1, 2], [1, 3, 4, 2])).toEqual([-1, 3, -1]);
  });
  it('handles the descending case', () => {
    expect(nextGreaterElement([2, 4], [1, 2, 3, 4])).toEqual([3, -1]);
  });
  it('returns -1 for the maximum element', () => {
    expect(nextGreaterElement([4], [4, 3, 2, 1])).toEqual([-1]);
  });
  it('handles a single ascending pair', () => {
    expect(nextGreaterElement([1], [1, 2])).toEqual([2]);
  });
});

describe('DRILL 59 — simplifyPath', () => {
  it('resolves . and .. segments', () => {
    expect(simplifyPath('/a/./b/../../c/')).toBe('/c');
  });
  it('cannot go above root', () => {
    expect(simplifyPath('/../')).toBe('/');
  });
  it('collapses repeated slashes', () => {
    expect(simplifyPath('/home//foo/')).toBe('/home/foo');
  });
  it('returns root for the root path', () => {
    expect(simplifyPath('/')).toBe('/');
  });
});

describe('DRILL 60 — asteroidCollision', () => {
  it('keeps right-movers that survive', () => {
    expect(asteroidCollision([5, 10, -5])).toEqual([5, 10]);
  });
  it('annihilates equal opposing asteroids', () => {
    expect(asteroidCollision([8, -8])).toEqual([]);
  });
  it('lets a large right-mover absorb smaller left-movers', () => {
    expect(asteroidCollision([10, 2, -5])).toEqual([10]);
  });
  it('leaves same-direction asteroids untouched', () => {
    expect(asteroidCollision([-2, -1, 1, 2])).toEqual([-2, -1, 1, 2]);
  });
});

describe('DRILL 61 — decodeString', () => {
  it('decodes a flat sequence', () => {
    expect(decodeString('3[a]2[bc]')).toBe('aaabcbc');
  });
  it('decodes nested encodings', () => {
    expect(decodeString('3[a2[c]]')).toBe('accaccacc');
  });
  it('decodes with trailing literal text', () => {
    expect(decodeString('2[abc]3[cd]ef')).toBe('abcabccdcdcdef');
  });
  it('handles multi-digit counts', () => {
    expect(decodeString('10[a]')).toBe('aaaaaaaaaa');
  });
});

describe('DRILL 62 — slidingWindowMaximum', () => {
  it('slides a window of size 3', () => {
    expect(slidingWindowMaximum([1, 3, -1, -3, 5, 3, 6, 7], 3)).toEqual([3, 3, 5, 5, 6, 7]);
  });
  it('returns the array itself for k=1', () => {
    expect(slidingWindowMaximum([1], 1)).toEqual([1]);
  });
  it('returns a single max when k equals the length', () => {
    expect(slidingWindowMaximum([4, 2, 12, 3], 4)).toEqual([12]);
  });
  it('tracks the max as the peak leaves the window', () => {
    expect(slidingWindowMaximum([9, 1, 1, 1], 2)).toEqual([9, 1, 1]);
  });
});
