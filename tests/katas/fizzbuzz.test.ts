import { describe, expect, it } from 'vitest';
import { fizzBuzz } from '@src/katas/fizzbuzz';

describe('fizzBuzz', () => {
  it('returns numbers as strings when not divisible by 3 or 5', () => {
    expect(fizzBuzz(2)).toEqual(['1', '2']);
  });

  it('replaces multiples of 3 with Fizz', () => {
    expect(fizzBuzz(3)[2]).toBe('Fizz');
  });

  it('replaces multiples of 5 with Buzz', () => {
    expect(fizzBuzz(5)[4]).toBe('Buzz');
  });

  it('replaces multiples of 15 with FizzBuzz', () => {
    expect(fizzBuzz(15)[14]).toBe('FizzBuzz');
  });

  it('handles the classic 1..15 sequence', () => {
    expect(fizzBuzz(15)).toEqual([
      '1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz',
      '11', 'Fizz', '13', '14', 'FizzBuzz',
    ]);
  });

  it('returns an empty array for n = 0', () => {
    expect(fizzBuzz(0)).toEqual([]);
  });
});
