export function split(text: string, size: number): string[] {
  const pieces = text
    .split(/\n{2,}/)
    .flatMap((piece) =>
      piece.length <= size
        ? [piece]
        : (piece.match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) ?? []),
    );
  const chunks: string[] = [];

  let current = "";
  pieces.forEach((piece) => {
    if (current && current.length + piece.length + 2 > size) {
      chunks.push(current);
      current = "";
    }

    current = current ? `${current}\n\n${piece}` : piece;
  });

  if (current) chunks.push(current);

  return chunks;
}
