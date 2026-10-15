export function split(text: string, size: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .flatMap((piece) => (piece.length <= size
      ? [piece]
      : (piece.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) ?? [])));

  const sections: string[][] = [];
  paragraphs.forEach((paragraph) => {
    if (/^#{1,6}\s/.test(paragraph) || !sections.length) sections.push([paragraph]);
    else sections[sections.length - 1].push(paragraph);
  });

  const chunks: string[] = [];
  let current = '';
  const add = (piece: string) => {
    if (current && current.length + piece.length + 2 > size) {
      chunks.push(current);
      current = '';
    }

    current = current ? `${current}\n\n${piece}` : piece;
  };

  sections.forEach((section) => {
    const joined = section.join('\n\n');
    if (joined.length <= size) add(joined);
    else section.forEach(add);
  });

  if (current) chunks.push(current);

  return chunks;
}
