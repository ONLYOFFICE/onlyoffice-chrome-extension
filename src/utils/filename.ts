const MAX_NAME_LENGTH = 100;

export function markdownFileName(title: string, fallback: string): string {
  const name = title
    .replace(/[\\/:*?"<>|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);

  return `${name || fallback}.md`;
}
