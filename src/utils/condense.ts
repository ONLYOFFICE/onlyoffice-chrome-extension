import { split } from './chunker';

export type Ask = (system: string, user: string) => Promise<string>;

export interface CondenseOptions {
  title: string;
  instructions: string;
  chunkLength: number;
  maxRounds: number;
  parallel: number;
  ask: Ask;
}

async function mapLimit<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let failed = false;

  const worker = async (): Promise<void> => {
    if (failed || next >= items.length) return;
    const index = next;
    next += 1;
    try {
      results[index] = await task(items[index], index);
    } catch (error) {
      failed = true;
      throw error;
    }
    await worker();
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function condense(text: string, options: CondenseOptions): Promise<string> {
  const {
    title, instructions, chunkLength, maxRounds, parallel, ask,
  } = options;

  const system = `You are reading one part of a longer text. ${instructions} Respond with Markdown only. `
    + 'Keep every image line ![...](...) exactly as written, at the point of the notes that covers the text around it. '
    + 'Do not add facts that are not in the text. Write in the same language as the text.';

  let content = text;
  for (let round = 0; round < maxRounds && content.length > chunkLength; round += 1) {
    const chunks = split(content, chunkLength);
    // eslint-disable-next-line no-await-in-loop
    const notes = await mapLimit(chunks, parallel, async (chunk, index) => (
      await ask(system, `Part ${index + 1} of ${chunks.length} of "${title}":\n\n${chunk}`)
    ).trim());

    content = notes.join('\n\n---\n\n');
  }

  return content.slice(0, chunkLength);
}
