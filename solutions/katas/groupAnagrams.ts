// O(n · k log k) — canonical key = sorted characters. Map preserves insertion order.
export const groupAnagrams = (words: readonly string[]): string[][] => {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const key = [...word].sort().join('');
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return [...groups.values()];
};
