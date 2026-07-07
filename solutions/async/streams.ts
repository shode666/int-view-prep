import { Transform, type Readable } from 'node:stream';

export const createUpperCaseTransform = (): Transform =>
  new Transform({
    transform(chunk: Buffer | string, _encoding, callback) {
      callback(null, chunk.toString().toUpperCase());
    },
  });

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
