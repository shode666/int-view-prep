const PAIRS: Readonly<Record<string, string>> = { ')': '(', ']': '[', '}': '{' };
const OPENERS = new Set(Object.values(PAIRS));

export const isBalanced = (input: string): boolean => {
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
