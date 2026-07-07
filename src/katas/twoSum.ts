/**
 * KATA 2 — Easy: Two Sum
 *
 * Given an array of numbers and a target, return the indices [i, j] (i < j)
 * of the two numbers that add up to target, or null if no pair exists.
 *
 * Follow-up the interviewer will ask: can you do it in O(n)?
 */
export const twoSum = (nums: readonly number[], target: number): [number, number] | null => {
  const remember = new Map<number, number>();
  for( let i = 0 ; i < nums.length; i++){
    const num = nums[i]
    if( num === undefined) continue;
    const complement = target - num;
    const j = remember.get(complement);
    if(j !== undefined) return [j,i]
    remember.set(num,i)
  }
  return null;

};