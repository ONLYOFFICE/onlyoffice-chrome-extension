import { tabs } from '@utils/browser';
import { DocspaceAPI } from '@utils/http';
import { extractArticle } from '@utils/article';

import { KNOWLEDGE_FOLDER_TYPE } from '@config';

export async function saveKnowledge(
  api: DocspaceAPI,
  accessToken: string,
  tenant: string,
  agentId: number,
): Promise<string> {
  const [tab] = await tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active page to save');

  const article = await extractArticle(tab.id);

  const folders = await api.getSubfolders(accessToken, tenant, agentId);
  const knowledge = folders.find(
    (folder) => folder.type === KNOWLEDGE_FOLDER_TYPE || folder.type === 'Knowledge',
  ) ?? folders.find((folder) => folder.title === 'Knowledge');
  if (!knowledge) throw new Error('This agent has no Knowledge folder');

  const title = article.title || tab.title || article.url;
  const meta = [
    `Source: <${article.url}>`,
    article.siteName && `Site: ${article.siteName}`,
    article.byline && `Author: ${article.byline}`,
    article.publishedTime && `Published: ${article.publishedTime.slice(0, 10)}`,
    `Saved: ${new Date().toISOString().slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join('  \n');

  const excerpt = article.excerpt
    ? `\n\n> ${article.excerpt.replace(/\s+/g, ' ').trim()}`
    : '';

  const markdown = `# ${title}\n\n${meta}${excerpt}\n\n---\n\n${article.markdown}\n`;

  const name = `${
    title
      .replace(/[\\/:*?"<>|#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'Web page'
  }.md`;

  await api.uploadFile(
    accessToken,
    tenant,
    new Blob([markdown], { type: 'text/markdown' }),
    name,
    undefined,
    knowledge.id,
  );

  return name;
}
