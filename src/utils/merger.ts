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
    const chunks = split(content, chunkLength);
    let finished = 0;

    await onProgress(0, chunks.length);
    // eslint-disable-next-line no-await-in-loop
    const notes = await mapLimit(chunks, parallel, async (chunk, index) => {
      const note = await ask(
        `You are reading one part of a longer text. ${instructions} Respond with Markdown only. `
          + 'Do not add facts that are not in the text. Write in the same language as the text.',
        `Part ${index + 1} of ${chunks.length} of "${title}":\n\n${chunk}`,
        { index, total: chunks.length },
      );

      finished += 1;
      await onProgress(finished, chunks.length);

      return note.trim();
    });

    content = notes.join('\n\n---\n\n');
  }

  return content.slice(0, chunkLength);
}
