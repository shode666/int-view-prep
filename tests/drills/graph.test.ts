import { describe, expect, it } from 'vitest';

import {
  canFinish,
  cloneGraph,
  floodFill,
  maxAreaOfIsland,
  numIslands,
  orangesRotting,
} from '@src/drills/graph';

describe('DRILL 89 — numIslands', () => {
  it('counts separated islands', () => {
    expect(
      numIslands([
        ['1', '1', '0'],
        ['0', '1', '0'],
        ['0', '0', '1'],
      ]),
    ).toBe(2);
  });

  it('merges land connected 4-directionally into one island', () => {
    expect(
      numIslands([
        ['1', '1', '1'],
        ['0', '1', '0'],
        ['1', '1', '1'],
      ]),
    ).toBe(1);
  });

  it('does not connect diagonally', () => {
    expect(
      numIslands([
        ['1', '0'],
        ['0', '1'],
      ]),
    ).toBe(2);
  });

  it('returns 0 for all water', () => {
    expect(
      numIslands([
        ['0', '0'],
        ['0', '0'],
      ]),
    ).toBe(0);
  });

  it('handles an empty grid', () => {
    expect(numIslands([])).toBe(0);
  });
});

describe('DRILL 90 — floodFill', () => {
  it('fills the connected region of the seed color', () => {
    expect(
      floodFill(
        [
          [1, 1, 1],
          [1, 1, 0],
          [1, 0, 1],
        ],
        1,
        1,
        2,
      ),
    ).toEqual([
      [2, 2, 2],
      [2, 2, 0],
      [2, 0, 1],
    ]);
  });

  it('is a no-op when new color equals the original (no infinite loop)', () => {
    expect(
      floodFill(
        [
          [0, 0, 0],
          [0, 1, 1],
        ],
        1,
        1,
        1,
      ),
    ).toEqual([
      [0, 0, 0],
      [0, 1, 1],
    ]);
  });

  it('fills a single-pixel image', () => {
    expect(floodFill([[0]], 0, 0, 5)).toEqual([[5]]);
  });

  it('does not cross into a different color', () => {
    expect(
      floodFill(
        [
          [1, 2],
          [2, 1],
        ],
        0,
        0,
        9,
      ),
    ).toEqual([
      [9, 2],
      [2, 1],
    ]);
  });
});

describe('DRILL 91 — maxAreaOfIsland', () => {
  it('returns the size of the largest island', () => {
    expect(
      maxAreaOfIsland([
        [1, 1, 0, 0],
        [1, 0, 0, 1],
        [0, 0, 1, 1],
      ]),
    ).toBe(3);
  });

  it('returns 0 when there is no land', () => {
    expect(
      maxAreaOfIsland([
        [0, 0],
        [0, 0],
      ]),
    ).toBe(0);
  });

  it('counts a single land cell as area 1', () => {
    expect(maxAreaOfIsland([[1]])).toBe(1);
  });

  it('handles the whole grid being one island', () => {
    expect(
      maxAreaOfIsland([
        [1, 1],
        [1, 1],
      ]),
    ).toBe(4);
  });
});

describe('DRILL 92 — orangesRotting', () => {
  it('returns the minutes until all oranges rot', () => {
    expect(
      orangesRotting([
        [2, 1, 1],
        [1, 1, 0],
        [0, 1, 1],
      ]),
    ).toBe(4);
  });

  it('returns -1 when a fresh orange is unreachable', () => {
    expect(
      orangesRotting([
        [2, 1, 1],
        [0, 1, 1],
        [1, 0, 1],
      ]),
    ).toBe(-1);
  });

  it('returns 0 when there are no fresh oranges', () => {
    expect(
      orangesRotting([
        [0, 2],
        [2, 0],
      ]),
    ).toBe(0);
  });

  it('returns 0 for an empty-of-oranges grid', () => {
    expect(orangesRotting([[0]])).toBe(0);
  });
});

describe('DRILL 93 — canFinish', () => {
  it('returns true for an acyclic prerequisite chain', () => {
    expect(canFinish(2, [[1, 0]])).toBe(true);
  });

  it('returns false when there is a cycle', () => {
    expect(
      canFinish(2, [
        [1, 0],
        [0, 1],
      ]),
    ).toBe(false);
  });

  it('returns true when there are no prerequisites', () => {
    expect(canFinish(3, [])).toBe(true);
  });

  it('detects a longer cycle among many courses', () => {
    expect(
      canFinish(4, [
        [1, 0],
        [2, 1],
        [3, 2],
        [1, 3],
      ]),
    ).toBe(false);
  });
});

describe('DRILL 94 — cloneGraph', () => {
  it('produces an equal copy', () => {
    expect(cloneGraph({ 1: [2, 3], 2: [1], 3: [1] })).toEqual({
      1: [2, 3],
      2: [1],
      3: [1],
    });
  });

  it('returns a new object, not the same reference', () => {
    const original = { 1: [2], 2: [1] };
    const clone = cloneGraph(original);
    expect(clone).not.toBe(original);
    expect(clone[1]).not.toBe(original[1]);
  });

  it('mutating the clone does not affect the original', () => {
    const original = { 1: [2], 2: [1] };
    const clone = cloneGraph(original);
    clone[1]?.push(99);
    expect(original[1]).toEqual([2]);
  });

  it('clones an empty graph', () => {
    expect(cloneGraph({})).toEqual({});
  });
});
