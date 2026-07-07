# prep-pair-prog

Node.js pair-programming interview prep kit. TypeScript + pnpm + Vitest.

## Quick start

```bash
pnpm install
pnpm test          # runs against YOUR code in src/ — everything fails until you implement it
pnpm test:watch    # TDD mode (what you'll use in the interview)
```

## How to practice

1. Pick an exercise in `src/` — each file has the problem statement in its header comment.
2. Run `pnpm test:watch` (or scope it: `pnpm test:katas`, `pnpm test:api`, `pnpm test:async`).
3. Implement until green. **Think out loud** — that's the pair-programming part.
4. Stuck or done? Compare with `solutions/` (same structure, fully implemented).

`pnpm test:solutions` runs the same test suites against `solutions/` — all green, proving the harness works.

To reset an exercise, just restore the stub from git: `git checkout src/<file>`.

## Exercises

| Area | File | Difficulty |
|---|---|---|
| Kata | `src/katas/fizzbuzz.ts` | Warm-up |
| Kata | `src/katas/twoSum.ts` | Easy |
| Kata | `src/katas/balancedBrackets.ts` | Easy/Medium |
| Kata | `src/katas/groupAnagrams.ts` | Medium |
| Kata | `src/katas/lruCache.ts` | Medium (very common) |
| API | `src/api/app.ts` — Todos REST API (Express 5, repo injected) | The classic pairing task |
| Async | `src/async/promiseUtils.ts` — withTimeout, retry, mapLimit | Node bread-and-butter |
| Async | `src/async/streams.ts` — Transform stream, countLines | Node-specific |

`pnpm dev` starts the API at http://localhost:3000 for manual testing (`pnpm dev:solutions` for the reference version).

## Interview tips

- Clarify requirements before typing — restate the problem, ask about edge cases.
- Start with the dumb solution, get it green, then discuss complexity and optimize.
- Narrate trade-offs: "Map here gives O(1) lookup at O(n) space."
- Write a test first when you can — interviewers love it.
- If stuck > 2 min, say what you're thinking; silence is the only failure mode.

See `NOTES.md` for a Node.js theory cheat-sheet (event loop, streams, etc.).
