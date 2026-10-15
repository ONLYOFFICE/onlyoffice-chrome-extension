import { Storage } from '@utils/storage';
import { DocspaceAPI } from '@utils/http';
import { extractArticle } from '@utils/article';
import { Ask, condense } from '@utils/merger';
import { RetryOptions, retryOperation } from '@utils/retry';
import { getValidAuthentication } from '@utils/token';

import {
  LOCALES, Locale, Translate, detectLocale, getTranslation,
} from '@i18n/translations';
import { LocalizedError, errorMessage } from '@i18n/errors';

import { KEEP_ALIVE_INTERVAL, LOCALE_KEY } from '@config';

declare const browser: typeof chrome | undefined;
const ext: typeof chrome = typeof browser !== 'undefined' ? browser : chrome;

const MAX_SOURCE_LENGTH = 1_000_000;
const CHUNK_LENGTH = 24000;
const MAX_CONDENSE_ROUNDS = 3;

const PARALLEL_REQUESTS = 4;
const MAX_RETRIES = 2;
const RETRY_OPTIONS: RetryOptions = {
  maxRetries: MAX_RETRIES,
  initialDelay: 2000,
  backoffMultiplier: 3,
  maxDelay: 6000,
};

const MAX_PAGE_IMAGES = 30;
const MIN_IMAGE_SIZE = 100;

const MODEL_CACHE_TTL = 5 * 60 * 1000;

const IMAGE_RULES = [
  'Keep the images that appear in the content as ![alt](url) at the same place relative to the text around them.',
  'If an image list is provided, add those images next to the related content.',
  'Use image URLs exactly as given and do not invent any. Do not use tables or HTML. Do not wrap the answer in a code block.',
  'Write in the same language as the source text.',
].join(' ');

const MODES = {
  summary: {
    menu: 'ai.summarize_section',
    context: 'selection',
    prompt: [
      'You summarize text selected on a web page.',
      'Respond with Markdown only: a single "# " title describing the topic, a short overview paragraph,',
      'then a "## Key points" section with "- " bullets. Keep it concise and do not add facts that are not in the text.',
      IMAGE_RULES,
    ].join(' '),
    notes:
      'Condense it into concise notes: the main ideas, key facts, names, numbers and dates.',
    request: 'Summarize this text selected on a web page.',
    reading: 'ai.reading_selection',
    done: 'ai.summary_saved',
    failed: 'ai.summary_failed',
  },
  document: {
    menu: 'ai.summarize_page',
    context: 'page',
    prompt: [
      'You summarize a web page given as Markdown extracted with Mozilla Readability.',
      'Respond with Markdown only: a single "# " title, a short overview paragraph, then "## " sections for the main topics',
      'with concise paragraphs or "- " bullets that keep the key facts, figures, names and conclusions.',
      'Aim for about a tenth to a fifth of the original length; keep only the most relevant images.',
      'Do not add facts that are not in the text.',
      IMAGE_RULES,
    ].join(' '),
    notes: 'Condense it into concise notes: the main ideas, key facts, figures, names and conclusions, in order.',
    request: 'Summarize this web page.',
    reading: 'ai.reading_page',
    done: 'ai.summary_saved',
    failed: 'ai.summary_failed',
  },
} as const;

type AIMode = keyof typeof MODES;
type ToastState = 'progress' | 'done' | 'error';

interface PageContent {
  title: string;
  url: string;
  text: string;
  images: { src: string; alt: string }[];
  details?: string;
}

interface Target {
  tabId: number;
  frameId: number;
}

type OnStage = (message: string) => Promise<void>;

const storage = new Storage();
const api = new DocspaceAPI(storage);

const translator = {
  async locale(): Promise<Locale> {
    const { [LOCALE_KEY]: saved } = await storage
      .get<Record<string, Locale>>([LOCALE_KEY])
      .catch(() => ({} as Partial<Record<string, Locale>>));
    return saved && LOCALES.includes(saved) ? saved : detectLocale();
  },

  async get(): Promise<Translate> {
    const locale = await translator.locale();
    return (key, params) => getTranslation(locale, key, params);
  },
};

const model = {
  cache: null as { tenant: string; model: string; expires: number } | null,

  async getDefault(accessToken: string, tenant: string): Promise<string> {
    if (model.cache?.tenant === tenant && model.cache.expires > Date.now()) return model.cache.model;

    const profileId = await api.getDefaultChatProfileId(accessToken, tenant);
    const id = await api.getProfileModel(accessToken, tenant, profileId);

    model.cache = { tenant, model: id, expires: Date.now() + MODEL_CACHE_TTL };

    return id;
  },
};

const reader = {
  async article(tabId: number): Promise<PageContent> {
    const article = await extractArticle(tabId);
    const details = [
      article.siteName && `Site: ${article.siteName}`,
      article.byline && `Author: ${article.byline}`,
      article.publishedTime && `Published: ${article.publishedTime}`,
      article.excerpt
        && `Excerpt: ${article.excerpt.replace(/\s+/g, ' ').trim()}`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      title: article.title,
      url: article.url,
      text: article.markdown,
      images: article.images,
      details,
    };
  },

  async selection(tabId: number, frameId: number): Promise<PageContent> {
    const results = await ext.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      func: (maxImages: number, minSize: number): PageContent => {
        const selection = window.getSelection();
        const images: { src: string; alt: string }[] = [];

        const selectedText = (): string => {
          const text = selection?.toString().trim();
          if (text) return text;

          const field = document.activeElement;
          if (
            field instanceof HTMLTextAreaElement
            || field instanceof HTMLInputElement
          ) {
            const { selectionStart: start, selectionEnd: end, value } = field;
            if (start !== null && end !== null && start !== end) return value.slice(start, end).trim();
          }

          return '';
        };

        Array.from(document.images)
          .filter((img) => selection?.containsNode(img, true))
          .forEach((img) => {
            const src = img.currentSrc || img.src;
            if (
              images.length >= maxImages
              || !/^https?:/i.test(src)
              || images.some((image) => image.src === src)
            ) return;
            if (
              (img.naturalWidth || img.width) < minSize
              || (img.naturalHeight || img.height) < minSize
            ) return;
            images.push({ src, alt: (img.alt || img.title || '').trim() });
          });

        return {
          title: window.top === window ? document.title : '',
          url: window.location.href,
          text: selectedText(),
          images,
        };
      },
      args: [MAX_PAGE_IMAGES, MIN_IMAGE_SIZE],
    });

    const pages = results
      .map((result): PageContent | undefined => result.result)
      .filter((page): page is PageContent => Boolean(page?.text));
    const page: PageContent | undefined = pages.sort(
      (a, b) => b.text.length - a.text.length,
    )[0];

    if (!page) throw new LocalizedError('error.no_selected_text');

    const topFrame: PageContent | undefined = results.find(
      (result) => result.frameId === 0,
    )?.result;

    const title = page.title || topFrame?.title || '';

    return { ...page, title };
  },

  async read(
    info: chrome.contextMenus.OnClickData,
    tab: chrome.tabs.Tab,
    target: Target,
    mode: AIMode,
  ): Promise<PageContent> {
    const page = mode === 'document'
      ? await reader.article(target.tabId)
      : await reader.selection(target.tabId, target.frameId).catch(
        (): PageContent => ({
          title: tab.title || '',
          url: info.pageUrl || tab.url || '',
          text: info.selectionText || '',
          images: [],
        }),
      );

    if (!page.text) throw new LocalizedError('error.no_selected_text');

    return page;
  },
};

const ai = {
  isRetryable(error: unknown): boolean {
    const status = Number((error as Error)?.message?.match(/^(\d{3}):/)?.[1]);
    return !status || status === 408 || status === 429 || status >= 500;
  },

  client(
    accessToken: string,
    tenant: string,
    modelId: string,
    onStage: OnStage,
    t: Translate,
  ): Ask {
    return (system, user) => retryOperation(
      () => api.chatCompletion(accessToken, tenant, modelId, [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]),
      {
        ...RETRY_OPTIONS,
        shouldRetry: ai.isRetryable,
        onRetry: (_error, attempt) => onStage(
          t('ai.retrying', { attempt: String(attempt), total: String(MAX_RETRIES) }),
        ),
      },
    );
  },

  unwrap(answer: string): string {
    return answer.trim().match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/)?.[1] ?? answer;
  },

  async generate(
    page: PageContent,
    mode: AIMode,
    ask: Ask,
    onStage: OnStage,
    t: Translate,
  ): Promise<string> {
    const escape = (src: string) => src.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');

    const truncated = page.text.length > MAX_SOURCE_LENGTH;
    const source = page.text.slice(0, MAX_SOURCE_LENGTH);
    const header = `Title: ${page.title}\nURL: ${page.url}${page.details ? `\n${page.details}` : ''}`;

    const content = await condense(source, {
      title: page.title,
      instructions: MODES[mode].notes,
      chunkLength: CHUNK_LENGTH,
      maxRounds: MAX_CONDENSE_ROUNDS,
      parallel: PARALLEL_REQUESTS,
      ask,
      onProgress: (finished) => (finished === 0 ? onStage(t('ai.asking')) : Promise.resolve()),
    });
    const notes = [
      content !== source
        && 'The content below is notes condensed from consecutive parts of a longer text.',
      truncated
        && 'The source was too long, so only its beginning was processed; mention that briefly.',
    ]
      .filter(Boolean)
      .join(' ');

    // Images already in the content keep their place; only the rest (e.g. from a plain-text selection) are listed
    const unplaced = page.images.filter((image) => !content.includes(image.src));
    const images = unplaced.length
      ? `\n\nImages:\n${unplaced.map((image) => `- ![${image.alt.replace(/[[\]]/g, '')}](${escape(image.src)})`).join('\n')}`
      : '';

    await onStage(t('ai.asking'));

    const answer = await ask(
      MODES[mode].prompt,
      `${MODES[mode].request}${notes ? ` ${notes}` : ''}\n\n${header}\n\nContent:\n${content}${images}`,
    );

    return ai.unwrap(answer);
  },
};

const docspace = {
  fileName(markdown: string, fallback: string, untitled: string): string {
    const title = markdown.match(/^#\s+(.+)$/m)?.[1] || fallback;
    const clean = title
      .replace(/[*_`#]/g, '')
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return `${clean.slice(0, 100) || untitled}.md`;
  },

  async save(
    markdown: string,
    fallbackTitle: string,
    untitled: string,
    accessToken: string,
    tenant: string,
  ) {
    const name = docspace.fileName(markdown, fallbackTitle, untitled);
    const file = await api.uploadFile(
      accessToken,
      tenant,
      new Blob([markdown], { type: 'text/markdown' }),
      name,
    );
    if (file?.webUrl) ext.tabs.create({ url: file.webUrl, active: true });
  },
};

const indicator = {
  async badge(tabId: number, text: string, title: string, color = '#5299E0') {
    await ext.action.setBadgeBackgroundColor({ tabId, color });
    await ext.action.setBadgeText({ tabId, text });
    await ext.action.setTitle({ tabId, title });
  },

  async toast({ tabId, frameId }: Target, message: string, state: ToastState) {
    await ext.scripting
      .executeScript({
        target: { tabId, frameIds: [frameId] },
        func: (text: string, toastState: ToastState) => {
          const win = window as typeof window & { docspaceToastTimer?: number };
          let host = document.getElementById('docspace-ai-toast');

          if (!host) {
            host = document.createElement('div');
            host.id = 'docspace-ai-toast';
            host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';
            host.attachShadow({ mode: 'open' }).innerHTML = `
            <style>
              .toast { display: flex; align-items: center; gap: 10px; max-width: 320px; padding: 12px 16px;
                border-radius: 8px; background: #333; color: #fff; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
                font: 13px/1.4 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
              .toast[data-state="error"] { color: #721C24; background: #F8D7DA;
                box-shadow: inset 0 0 0 1px #F5C6CB, 0 4px 16px rgba(0, 0, 0, 0.25); }
              .toast[data-state="error"] .icon { display: none; }
              .icon { flex-shrink: 0; width: 16px; height: 16px; font-weight: 700; }
              .toast[data-state="progress"] .icon { box-sizing: border-box; border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: #5299E0;
                animation: spin 0.8s linear infinite; }
              .toast[data-state="done"] .icon::before { content: '\\2713'; color: #6BCB77; }
              @keyframes spin { to { transform: rotate(360deg); } }
              .toast { animation: slide-in 0.3s ease-out; }
              .toast.exiting { animation: slide-out 0.3s ease-out forwards; }
              @keyframes slide-in { from { opacity: 0; transform: translateY(150px); }
                to { opacity: 1; transform: translateY(0); } }
              @keyframes slide-out { from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(100%); } }
              @media (prefers-reduced-motion: reduce) { .toast, .toast.exiting { animation: none; } }
              @media (prefers-color-scheme: dark) { .toast:not([data-state="error"]) { background: #474747; } }
            </style>
            <div class="toast" role="status" aria-live="polite">
              <span class="icon"></span><span class="text"></span>
            </div>`;
            document.documentElement.appendChild(host);
          }

          const toast = host.shadowRoot?.querySelector<HTMLElement>('.toast');
          const label = toast?.querySelector('.text');
          if (!toast || !label) return;

          toast.dataset.state = toastState;
          label.textContent = text;

          clearTimeout(win.docspaceToastTimer);

          toast.classList.remove('exiting');
          if (toastState !== 'progress') {
            win.docspaceToastTimer = window.setTimeout(
              () => {
                toast.classList.add('exiting');
                win.docspaceToastTimer = window.setTimeout(
                  () => host.remove(),
                  300,
                );
              },
              toastState === 'error' ? 8000 : 3000,
            );
          }
        },
        args: [message, state],
      })
      .catch(() => {});
  },

  async progress(target: Target, message: string) {
    await Promise.all([
      indicator.badge(target.tabId, '...', message),
      indicator.toast(target, message, 'progress'),
    ]);
  },

  async done(target: Target, message: string) {
    await indicator.badge(target.tabId, '', 'ONLYOFFICE');
    await indicator.toast(target, message, 'done');
  },

  async fail(target: Target, message: string) {
    await indicator.badge(target.tabId, '', message);
    await indicator.toast(target, message, 'error');
  },
};

const menu = {
  async create() {
    const t = await translator.get();
    ext.contextMenus.removeAll(() => {
      Object.entries(MODES).forEach(([id, mode]) => {
        ext.contextMenus.create({
          id,
          title: t(mode.menu),
          contexts: [mode.context],
        });
      });
    });
  },

  async retitle() {
    const t = await translator.get();
    Object.entries(MODES).forEach(([id, mode]) => {
      ext.contextMenus.update(id, { title: t(mode.menu) });
    });
  },

  register() {
    ext.runtime.onInstalled.addListener(() => {
      menu.create();
    });

    ext.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && LOCALE_KEY in changes) menu.retitle();
    });

    ext.contextMenus.onClicked.addListener((info, tab) => {
      if (tab?.id !== undefined && info.menuItemId in MODES) menu.run(info, tab, tab.id, info.menuItemId as AIMode);
    });
  },

  async run(
    info: chrome.contextMenus.OnClickData,
    tab: chrome.tabs.Tab,
    tabId: number,
    mode: AIMode,
  ) {
    const target: Target = {
      tabId,
      frameId: mode === 'summary' ? (info.frameId ?? 0) : 0,
    };

    const { reading, done, failed } = MODES[mode];
    const t = await translator.get();
    const onStage: OnStage = (message) => indicator.progress(target, message);

    const keepAlive = setInterval(() => {
      ext.runtime.getPlatformInfo().catch(() => {});
    }, KEEP_ALIVE_INTERVAL);

    try {
      const auth = await getValidAuthentication(storage);
      if (!auth?.accessToken || !auth.tenant) {
        await indicator.fail(target, t('ai.sign_in'));
        return;
      }

      await onStage(t(reading));
      const page = await reader.read(info, tab, target, mode);

      const modelId = await model.getDefault(auth.accessToken, auth.tenant);
      const ask = ai.client(auth.accessToken, auth.tenant, modelId, onStage, t);
      const markdown = await ai.generate(page, mode, ask, onStage, t);

      await onStage(t('ai.saving'));

      await docspace.save(
        markdown,
        t('ai.summary_file', { title: page.title }),
        t('ai.untitled_document'),
        auth.accessToken,
        auth.tenant,
      );
      await indicator.done(target, t(done));
    } catch (error) {
      await indicator.fail(target, t(failed, { message: errorMessage(error, t) }));
    } finally {
      clearInterval(keepAlive);
    }
  },
};

export function registerContextMenuOptions() {
  menu.register();
}
