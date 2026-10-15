import { Storage } from "@utils/storage";
import { DocspaceAPI } from "@utils/http";
import { extractArticle } from "@utils/article";
import { Ask, condense } from "@utils/merger";
import { RetryOptions, retryOperation } from "@utils/retry";
import { getValidAuthentication } from "@utils/token";

declare const browser: typeof chrome | undefined;
const ext: typeof chrome = typeof browser !== "undefined" ? browser : chrome;

const MAX_SOURCE_LENGTH = 1_000_000;
const CHUNK_LENGTH = 24000;
const MAX_CONDENSE_ROUNDS = 3;

const PARALLEL_REQUESTS = 3;
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
  "Include relevant images from the provided list as ![alt](url) next to the related content, using the URLs exactly as given.",
  "Do not invent image URLs. Do not use tables or HTML. Do not wrap the answer in a code block.",
  "Write in the same language as the source text.",
].join(" ");

const MODES = {
  summary: {
    menu: "Summarize section",
    context: "selection",
    prompt: [
      "You summarize text selected on a web page.",
      'Respond with Markdown only: a single "# " title describing the topic, a short overview paragraph,',
      'then a "## Key points" section with "- " bullets. Keep it concise and do not add facts that are not in the text.',
      IMAGE_RULES,
    ].join(" "),
    notes:
      "Condense it into concise notes: the main ideas, key facts, names, numbers and dates.",
    request: "Summarize this text selected on a web page.",
    reading: "Reading the selection...",
    done: "Summary saved to DocSpace",
    failed: "Summary failed",
  },
  document: {
    menu: "Summarize page",
    context: "page",
    prompt: [
      "You turn web page content, given as Markdown extracted with Mozilla Readability, into a well-structured document.",
      "Keep the full substance of the article; restructure and clean it up rather than shortening it.",
      'Respond with Markdown only: a single "# " title, "## " and "### " section headings, paragraphs,',
      '"- " bullet lists and "1. " numbered lists, **bold** and *italic* where useful.',
      IMAGE_RULES,
    ].join(" "),
    notes: [
      "Condense it into detailed notes that keep its section structure, arguments, facts, figures, names and examples,",
      "so a full document can be rebuilt from them.",
    ].join(" "),
    request: "Create a document based on this web page.",
    reading: "Reading the page...",
    done: "Page saved to DocSpace",
    failed: "Saving the page failed",
  },
} as const;

type AIMode = keyof typeof MODES;
type ToastState = "progress" | "done" | "error";

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

const model = {
  cache: null as { tenant: string; model: string; expires: number } | null,

  async getDefault(accessToken: string, tenant: string): Promise<string> {
    if (model.cache?.tenant === tenant && model.cache.expires > Date.now())
      return model.cache.model;

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
      article.excerpt &&
        `Excerpt: ${article.excerpt.replace(/\s+/g, " ").trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

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
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLInputElement
          ) {
            const { selectionStart: start, selectionEnd: end, value } = field;
            if (start !== null && end !== null && start !== end)
              return value.slice(start, end).trim();
          }

          return "";
        };

        Array.from(document.images)
          .filter((img) => selection?.containsNode(img, true))
          .forEach((img) => {
            const src = img.currentSrc || img.src;
            if (
              images.length >= maxImages ||
              !/^https?:/i.test(src) ||
              images.some((image) => image.src === src)
            )
              return;
            if (
              (img.naturalWidth || img.width) < minSize ||
              (img.naturalHeight || img.height) < minSize
            )
              return;
            images.push({ src, alt: (img.alt || img.title || "").trim() });
          });

        return {
          title: window.top === window ? document.title : "",
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

    if (!page) throw new Error("No selected text found");

    const topFrame: PageContent | undefined = results.find(
      (result) => result.frameId === 0,
    )?.result;

    const title = page.title || topFrame?.title || "";

    return { ...page, title };
  },

  async read(
    info: chrome.contextMenus.OnClickData,
    tab: chrome.tabs.Tab,
    target: Target,
    mode: AIMode,
  ): Promise<PageContent> {
    const page =
      mode === "document"
        ? await reader.article(target.tabId)
        : await reader.selection(target.tabId, target.frameId).catch(
            (): PageContent => ({
              title: tab.title || "",
              url: info.pageUrl || tab.url || "",
              text: info.selectionText || "",
              images: [],
            }),
          );

    if (!page.text) throw new Error("No selected text found");

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
  ): Ask {
    return (system, user, label) =>
      retryOperation(
        () =>
          api.chatCompletion(accessToken, tenant, modelId, [
            { role: "system", content: system },
            { role: "user", content: user },
          ]),
        {
          ...RETRY_OPTIONS,
          shouldRetry: ai.isRetryable,
          onRetry: (_error, attempt) =>
            onStage(
              `${label} failed, retrying (${attempt} of ${MAX_RETRIES})...`,
            ),
        },
      );
  },

  async generate(
    page: PageContent,
    mode: AIMode,
    ask: Ask,
    onStage: OnStage,
  ): Promise<string> {
    const escape = (src: string) =>
      src.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
    const images = page.images.length
      ? `\n\nImages:\n${page.images.map((image) => `- ![${image.alt.replace(/[[\]]/g, "")}](${escape(image.src)})`).join("\n")}`
      : "";

    const truncated = page.text.length > MAX_SOURCE_LENGTH;
    const source = page.text.slice(0, MAX_SOURCE_LENGTH);
    const content = await condense(source, {
      title: page.title,
      instructions: MODES[mode].notes,
      chunkLength: CHUNK_LENGTH,
      maxRounds: MAX_CONDENSE_ROUNDS,
      parallel: PARALLEL_REQUESTS,
      ask,
      onStage,
    });
    const notes = [
      content !== source &&
        "The content below is notes condensed from consecutive parts of a longer text.",
      truncated &&
        "The source was too long, so only its beginning was processed; mention that briefly.",
    ]
      .filter(Boolean)
      .join(" ");

    await onStage("Asking AI...");

    const answer = await ask(
      MODES[mode].prompt,
      `${MODES[mode].request}${notes ? ` ${notes}` : ""}\n\nTitle: ${page.title}\nURL: ${page.url}` +
        `${page.details ? `\n${page.details}` : ""}\n\nContent:\n${content}${images}`,
      "AI request",
    );

    return (
      answer.trim().match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/)?.[1] ??
      answer
    );
  },
};

const docspace = {
  fileName(markdown: string, fallback: string): string {
    const title = markdown.match(/^#\s+(.+)$/m)?.[1] || fallback;
    const clean = title
      .replace(/[*_`#]/g, "")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return `${clean.slice(0, 100) || "AI document"}.md`;
  },

  async save(
    markdown: string,
    fallbackTitle: string,
    accessToken: string,
    tenant: string,
  ) {
    const name = docspace.fileName(markdown, fallbackTitle);
    const file = await api.uploadFile(
      accessToken,
      tenant,
      new Blob([markdown], { type: "text/markdown" }),
      name,
    );
    if (file?.webUrl) ext.tabs.create({ url: file.webUrl, active: true });
  },
};

const indicator = {
  async badge(tabId: number, text: string, title: string, color = "#5299E0") {
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
          let host = document.getElementById("docspace-ai-toast");

          if (!host) {
            host = document.createElement("div");
            host.id = "docspace-ai-toast";
            host.style.cssText =
              "position:fixed;right:16px;bottom:16px;z-index:2147483647;";
            host.attachShadow({ mode: "open" }).innerHTML = `
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

          const toast = host.shadowRoot.querySelector<HTMLElement>(".toast");
          toast.dataset.state = toastState;
          toast.querySelector(".text").textContent = text;

          clearTimeout(win.docspaceToastTimer);

          toast.classList.remove("exiting");
          if (toastState !== "progress") {
            win.docspaceToastTimer = window.setTimeout(
              () => {
                toast.classList.add("exiting");
                win.docspaceToastTimer = window.setTimeout(
                  () => host.remove(),
                  300,
                );
              },
              toastState === "error" ? 8000 : 3000,
            );
          }
        },
        args: [message, state],
      })
      .catch(() => {});
  },

  async progress(target: Target, message: string) {
    await Promise.all([
      indicator.badge(target.tabId, "...", message),
      indicator.toast(target, message, "progress"),
    ]);
  },

  async done(target: Target, message: string) {
    await indicator.badge(target.tabId, "", "ONLYOFFICE DocSpace");
    await indicator.toast(target, message, "done");
  },

  async fail(target: Target, message: string) {
    await indicator.badge(target.tabId, "", message);
    await indicator.toast(target, message, "error");
  },
};

const menu = {
  register() {
    ext.runtime.onInstalled.addListener(() => {
      ext.contextMenus.removeAll(() => {
        Object.entries(MODES).forEach(([id, mode]) => {
          ext.contextMenus.create({
            id,
            title: mode.menu,
            contexts: [mode.context],
          });
        });
      });
    });

    ext.contextMenus.onClicked.addListener((info, tab) => {
      if (tab?.id !== undefined && info.menuItemId in MODES)
        menu.run(info, tab, tab.id, info.menuItemId as AIMode);
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
      frameId: mode === "summary" ? (info.frameId ?? 0) : 0,
    };

    const { reading, done, failed } = MODES[mode];
    const onStage: OnStage = (message) => indicator.progress(target, message);

    try {
      const auth = await getValidAuthentication(storage);
      if (!auth?.accessToken || !auth.tenant) {
        await indicator.fail(
          target,
          "Sign in to ONLYOFFICE DocSpace to use AI",
        );
        return;
      }

      await onStage(reading);
      const page = await reader.read(info, tab, target, mode);

      const modelId = await model.getDefault(auth.accessToken, auth.tenant);
      const ask = ai.client(auth.accessToken, auth.tenant, modelId, onStage);
      const markdown = await ai.generate(page, mode, ask, onStage);

      await onStage("Saving to DocSpace...");

      await docspace.save(
        markdown,
        mode === "summary" ? `Summary - ${page.title}` : page.title,
        auth.accessToken,
        auth.tenant,
      );
      await indicator.done(target, done);
    } catch (error) {
      await indicator.fail(target, `${failed}: ${(error as Error).message}`);
    }
  },
};

export function registerContextMenuOptions() {
  menu.register();
}
