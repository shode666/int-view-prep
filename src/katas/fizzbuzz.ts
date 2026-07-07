/**
 * KATA 1 — Warm-up: FizzBuzz
 *
 * Return an array of strings for numbers 1..n:
 * - multiples of 3 → "Fizz"
 * - multiples of 5 → "Buzz"
 * - multiples of both → "FizzBuzz"
 * - otherwise → the number as a string
 */
export const fizzBuzz = (n: number): string[] => {
  const result: string[] = [];
  for (let i = 1; i <= n; i++) {
    let value = '';
    if (i % 3 === 0) value += 'Fizz';
    if (i % 5 === 0) value += 'Buzz';
    if (value === '') value = i.toString();
    result.push(value);
  }
  return result;
};
