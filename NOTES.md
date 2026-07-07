# Node.js theory cheat-sheet

Quick revision for the "explain X" questions that come with pairing interviews.

## Event loop

Order per tick: timers → pending callbacks → poll (I/O) → check (`setImmediate`) → close callbacks.
**Microtasks** (`process.nextTick`, then Promise callbacks) drain between every phase and after every callback.

Classic quiz — output order:

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
// → sync, nextTick, promise, then timeout/immediate
//   (timeout vs immediate order is nondeterministic at top level,
//    but inside an I/O callback, immediate always wins)
```

Key line for interviews: *Node is single-threaded for JS, but I/O is offloaded to the OS/libuv thread pool — that's why one process handles thousands of concurrent connections, and why CPU-bound work blocks everything (use worker_threads).*

## Promises & async

- `Promise.all` — fail-fast; `allSettled` — never rejects; `race` — first settle wins; `any` — first fulfillment.
- `async` function always returns a Promise; a thrown error becomes a rejection.
- Unhandled rejections crash modern Node (`--unhandled-rejections=throw` is default behavior since v15).
- Concurrency limiting (mapLimit) exists because unbounded `Promise.all` over 10k items = 10k open sockets.

## Streams

- Four types: Readable, Writable, Duplex, Transform.
- **Backpressure**: `write()` returns false → stop and wait for `'drain'`. `pipe`/`pipeline` handle this for you.
- Prefer `stream/promises` `pipeline()` over `.pipe()` — it propagates errors and cleans up.
- Why streams: process a 10GB file with constant memory instead of `readFile` into RAM.

## Express (v5)

- Middleware = `(req, res, next)`; order matters; error middleware has 4 args `(err, req, res, next)`.
- v5 auto-forwards rejected async handlers to error middleware (no more try/catch wrappers).
- Layering: route → validation → service/business logic → repository. Inject dependencies for testability.

## What interviewers probe in Node pairing

1. Do you handle errors (rejected promises, invalid input) without prompting?
2. Do you know `Map`/`Set` and use them for O(1) lookups?
3. Do you test edge cases (empty input, not-found, duplicates)?
4. Can you explain WHY Node fits (or doesn't fit) a workload?
