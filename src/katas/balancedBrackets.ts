/**
 * KATA 5 — Easy/Medium: Balanced Brackets
 *
 * Return true if every bracket ()[]{} in the string is correctly
 * opened and closed in order. Non-bracket characters are ignored.
 *
 * e.g. "a(b[c]{d})" → true,  "([)]" → false,  "(" → false
 */
export const isBalanced = (input: string): boolean => {
  const PAIRS: Readonly<Record<string, string>> = { ')': '(', ']': '[', '}': '{' };
  const OPENERS = new Set(Object.values(PAIRS));
  const stack: string[] = [];
  for (const char of input) {
    if (OPENERS.has(char)) {
      stack.push(char);
    } else if (char in PAIRS) {
      if (stack.pop() !== PAIRS[char]) return false;
    }
  }

  return stack.length === 0;
};
