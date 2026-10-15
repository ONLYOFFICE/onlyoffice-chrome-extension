import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { Readability } from '@mozilla/readability';

import { scripting } from '@utils/browser';

const MAX_IMAGES = 30;
const MIN_IMAGE_SIZE = 100;

export interface Article {
  title: string;
  url: string;
  byline: string;
  siteName: string;
  excerpt: string;
  publishedTime: string;
  lang: string;
  markdown: string;
  images: { src: string; alt: string }[];
}

interface PageSource {
  html: string;
  url: string;
  baseURI: string;
}

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
turndown.use(gfm);
turndown.remove(['script', 'style', 'noscript', 'template']);

const tablePrototype = Object.getPrototypeOf(parseHTML('<table></table>').document.querySelector('table'));
if (!('rows' in tablePrototype)) {
  Object.defineProperty(tablePrototype, 'rows', {
    get(this: HTMLTableElement) {
      return Array.from(this.querySelectorAll('tr')).filter((row) => row.closest('table') === this);
    },
  });
}

const parseDocument = (html: string) => parseHTML(html).document as unknown as Document;

function fallbackContent(html: string): HTMLElement {
  const document = parseDocument(html);
  const source = document.querySelector<HTMLElement>('main, article') ?? document.body;
  const noise = 'script, style, noscript, template, iframe, svg, canvas, form, button, input, select, textarea, dialog, '
    + `[hidden], [aria-hidden="true"]${source === document.body ? ', header, footer, nav, aside' : ''}`;
  source.querySelectorAll(noise).forEach((element) => element.remove());
  return source;
}

export function parseArticle({ html, url, baseURI }: PageSource): Article {
  const document = parseDocument(html);
  const parsed = new Readability<HTMLElement>(document, { serializer: (element) => element as HTMLElement }).parse();
  const root = parsed?.content?.textContent?.trim() ? parsed.content : fallbackContent(html);
  const resolve = (value: string) => {
    try {
      return new URL(value, baseURI);
    } catch {
      return null;
    }
  };

  const images: Article['images'] = [];
  root.querySelectorAll('img').forEach((img) => {
    const src = resolve(img.getAttribute('src') || '');
    const tiny = ['width', 'height'].some((size) => Number(img.getAttribute(size)) > 0
      && Number(img.getAttribute(size)) < MIN_IMAGE_SIZE);
    img.removeAttribute('srcset');

    if (!src || !/^https?:$/.test(src.protocol) || tiny) {
      img.remove();
      return;
    }

    img.setAttribute('src', src.href);
    if (images.length < MAX_IMAGES && !images.some((image) => image.src === src.href)) {
      images.push({ src: src.href, alt: (img.getAttribute('alt') || img.getAttribute('title') || '').trim() });
    }
  });

  root.querySelectorAll('a[href]').forEach((link) => {
    const href = resolve(link.getAttribute('href') || '');
    if (href && /^(https?|mailto):$/.test(href.protocol)) link.setAttribute('href', href.href);
    else link.removeAttribute('href');
  });

  const markdown = turndown.turndown(root).replace(/\n{3,}/g, '\n\n').trim();
  if (!markdown) throw new Error('No readable content found on this page');

  return {
    title: parsed?.title || document.title,
    url,
    byline: parsed?.byline || '',
    siteName: parsed?.siteName || '',
    excerpt: parsed?.excerpt || '',
    publishedTime: parsed?.publishedTime || '',
    lang: parsed?.lang || '',
    markdown,
    images,
  };
}

export async function extractArticle(tabId: number): Promise<Article> {
  const [injection] = await scripting.executeScript({
    target: { tabId },
    func: (): PageSource => ({
      html: document.documentElement.outerHTML,
      url: window.location.href,
      baseURI: document.baseURI,
    }),
  }).catch(() => {
    throw new Error('This page can\'t be read');
  });

  const source: PageSource | undefined = injection?.result;
  if (!source?.html) throw new Error('No readable content found on this page');

  return parseArticle(source);
}
