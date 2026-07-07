import { Transform, type Readable } from 'node:stream';

/**
 * STREAMS DRILL 1 — createUpperCaseTransform
 * Return a Transform stream that upper-cases every text chunk passing through.
 */
export const createUpperCaseTransform = (): Transform =>
  new Transform({
    transform(chunk: Buffer | string, _encoding, callback) {
      callback(null, chunk.toString().toUpperCase());
    },
  });

/**
 * STREAMS DRILL 2 — countLines
 * Consume a readable text stream and resolve with the number of lines.
 * A line is terminated by '\n'; a trailing chunk without '\n' still counts
 * as one line. An empty stream has 0 lines.
 * Careful: a '\n' can be split across chunk boundaries — chunks are arbitrary.
 */
export const countLines = async (stream: Readable): Promise<number> => {
  let lines = 0;
  let sawAnyData = false;
  let lastCharWasNewline = true;

  for await (const chunk of stream) {
    const text: string = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    if (text.length === 0) continue;
    sawAnyData = true;
    for (const char of text) {
      if (char === '\n') lines++;
    }
    lastCharWasNewline = text.endsWith('\n');
  }

  if (sawAnyData && !lastCharWasNewline) lines++;
  return lines;
};
