import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { countLines, createUpperCaseTransform } from '@src/async/streams';

const collect = async (stream: NodeJS.ReadableStream): Promise<string> => {
  let out = '';
  for await (const chunk of stream) {
    out += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }
  return out;
};

describe('createUpperCaseTransform', () => {
  it('upper-cases chunks passing through', async () => {
    const source = Readable.from(['hello ', 'world']);
    const transform = createUpperCaseTransform();
    const resultPromise = collect(transform);
    await pipeline(source, transform);
    expect(await resultPromise).toBe('HELLO WORLD');
  });

  it('works with multi-chunk streams', async () => {
    const source = Readable.from(['a', 'b', 'c']);
    const transform = createUpperCaseTransform();
    const resultPromise = collect(transform);
    await pipeline(source, transform);
    expect(await resultPromise).toBe('ABC');
  });
});

describe('countLines', () => {
  it('counts newline-terminated lines', async () => {
    expect(await countLines(Readable.from(['one\ntwo\nthree\n']))).toBe(3);
  });

  it('counts a trailing line without a newline', async () => {
    expect(await countLines(Readable.from(['one\ntwo']))).toBe(2);
  });

  it('handles a newline split across chunks', async () => {
    expect(await countLines(Readable.from(['one', '\n', 'two', '\nthree']))).toBe(3);
  });

  it('returns 0 for an empty stream', async () => {
    expect(await countLines(Readable.from([]))).toBe(0);
  });

  it('handles a single line with no newline', async () => {
    expect(await countLines(Readable.from(['just one line']))).toBe(1);
  });
});
