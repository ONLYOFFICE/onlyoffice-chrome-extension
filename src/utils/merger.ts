import { split } from './chunker';

export type Ask = (
  system: string,
  user: string,
  label: string,
) => Promise<string>;

export interface CondenseOptions {
  title: string;
  instructions: string;
  chunkLength: number;
  maxRounds: number;
  parallel: number;
  ask: Ask;
  onStage: (message: string) => Promise<void>;
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
    onStage,
  } = options;

  let content = text;
  for (
    let round = 0;
    round < maxRounds && content.length > chunkLength;
    round += 1
  ) {
    const chunks = split(content, chunkLength);
    let finished = 0;

    await onStage(`Reading part 1 of ${chunks.length}...`);
    // eslint-disable-next-line no-await-in-loop
    const notes = await mapLimit(chunks, parallel, async (chunk, index) => {
      const label = `Part ${index + 1} of ${chunks.length}`;
      const note = await ask(
        `You are reading one part of a longer text. ${instructions} Respond with Markdown only. `
          + 'Do not add facts that are not in the text. Write in the same language as the text.',
        `${label} of "${title}":\n\n${chunk}`,
        label,
      ).catch((error: Error) => {
        throw new Error(`${label.toLowerCase()}: ${error.message}`);
      });

      finished += 1;
      await onStage(`Read ${finished} of ${chunks.length} parts...`);

      return note.trim();
    });

    content = notes.join('\n\n---\n\n');
  }

  return content.slice(0, chunkLength);
}
