// O(n) time, O(n) space — single pass with a value→index map.
export const twoSum = (nums: readonly number[], target: number): [number, number] | null => {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const current = nums[i];
    if (current === undefined) continue;
    const complementIndex = seen.get(target - current);
    if (complementIndex !== undefined) return [complementIndex, i];
    seen.set(current, i);
  }
  return null;
};
