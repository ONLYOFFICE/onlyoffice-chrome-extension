import { split } from './chunker';

export interface Part {
  index: number;
  total: number;
}

export type Ask = (
  system: string,
  user: string,
  part?: Part,
) => Promise<string>;

export interface CondenseOptions {
  title: string;
  instructions: string;
  chunkLength: number;
  maxRounds: number;
  parallel: number;
  ask: Ask;
  onProgress: (finished: number, total: number) => Promise<void>;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let failed = false;

  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = await task(items[index], index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

export interface PartsOptions {
  chunkLength: number;
  parallel: number;
  // Called with 0 when the parts start, then after each one; the caller words it for the UI
  onProgress: (finished: number, total: number) => Promise<void>;
}

// Splits text into parts and runs `task` on them, a few at a time, keeping results in order
export async function mapParts(
  text: string,
  options: PartsOptions,
  task: (chunk: string, part: Part) => Promise<string>,
): Promise<string[]> {
  const { chunkLength, parallel, onProgress } = options;
  const chunks = split(text, chunkLength);
  let finished = 0;

  await onProgress(0, chunks.length);
  return mapLimit(chunks, parallel, async (chunk, index) => {
    const result = await task(chunk, { index, total: chunks.length });
    finished += 1;
    await onProgress(finished, chunks.length);
    return result;
  });
}

export async function condense(
  text: string,
  options: CondenseOptions,
): Promise<string> {
  const {
    title,
    instructions,
    chunkLength,
    maxRounds,
    parallel,
    ask,
    onProgress,
  } = options;

  let content = text;
  for (
    let round = 0;
    round < maxRounds && content.length > chunkLength;
    round += 1
  ) {
    // eslint-disable-next-line no-await-in-loop
    const notes = await mapParts(content, { chunkLength, parallel, onProgress }, async (chunk, part) => {
      const note = await ask(
        `You are reading one part of a longer text. ${instructions} Respond with Markdown only. `
          + 'Keep every image line ![...](...) exactly as written, at the point of the notes that covers the text around it. '
          + 'Do not add facts that are not in the text. Write in the same language as the text.',
        `Part ${part.index + 1} of ${part.total} of "${title}":\n\n${chunk}`,
        part,
      );
      return note.trim();
    });

    content = notes.join('\n\n---\n\n');
  }

  return content.slice(0, chunkLength);
}
