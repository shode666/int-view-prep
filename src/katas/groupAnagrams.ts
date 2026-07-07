/**
 * KATA 3 — Medium: Group Anagrams
 *
 * Group words that are anagrams of each other.
 * Order of groups and order within groups follows first appearance in input.
 *
 * e.g. ["eat","tea","tan","ate","nat","bat"]
 *   → [["eat","tea","ate"],["tan","nat"],["bat"]]
 */
export const groupAnagrams = (words: readonly string[]): string[][] => {
  const wordgroup = new Map<string,string[]>();
  for( const word of words){
    const keyword = word.split('').sort().join('');
    if(!wordgroup.has(keyword)){
      wordgroup.set(keyword, []);
    }
    wordgroup.get(keyword)?.push(word)
  }
  return [...wordgroup.values()];
};
