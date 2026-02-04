declare const browser: any;
declare const chrome: any;

interface BrowserRuntime {
  sendMessage: (message: any, callback?: (response: any) => void) => void;
  onMessage: {
    addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void | boolean) => void;
    removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void | boolean) => void;
  };
  lastError?: { message: string };
}

interface BrowserAPI {
  storage: {
    local: {
      get: (keys: string[], callback: (result: any) => void) => void;
      set: (items: any, callback?: () => void) => void;
      remove: (keys: string[], callback?: () => void) => void;
    };
  };
  runtime: BrowserRuntime;
  identity: {
    getRedirectURL: () => string;
    launchWebAuthFlow: (details: { url: string; interactive: boolean }, callback: (redirectUrl?: string) => void) => void;
  };
  tabs: {
    query: (queryInfo: any, callback: (tabs: any[]) => void) => void;
    create: (createProperties: any, callback?: (tab: any) => void) => void;
  };
  scripting: {
    executeScript: (details: any, callback: (results: any[]) => void) => void;
  };
  downloads: {
    download: (options: any, callback?: (downloadId: number) => void) => void;
  };
  declarativeNetRequest?: {
    updateDynamicRules: (options: any, callback?: () => void) => void;
    RuleActionType: any;
    HeaderOperation: any;
    ResourceType: any;
  };
  i18n?: {
    getUILanguage: () => string;
  };
}

const getBrowserAPI = (): BrowserAPI => {
  if (typeof browser !== 'undefined' && (browser as any).runtime) {
    return browser as unknown as BrowserAPI;
  }

  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome as unknown as BrowserAPI;
  }

  throw new Error('Browser extension API not available');
};

const browserAPI = getBrowserAPI();

export const storage = {
  local: {
    get: <T extends Record<string, any>>(keys: (keyof T)[]): Promise<Partial<T>> => {
      return new Promise((resolve) => {
        browserAPI.storage.local.get(keys as string[], (result) => {
          resolve(result as Partial<T>);
        });
      });
    },
    set: <T extends Record<string, any>>(items: T): Promise<void> => {
      return new Promise((resolve) => {
        browserAPI.storage.local.set(items, () => {
          resolve();
        });
      });
    },
    remove: (keys: string[]): Promise<void> => {
      return new Promise((resolve) => {
        browserAPI.storage.local.remove(keys, () => {
          resolve();
        });
      });
    },
  },
};

export const runtime = {
  sendMessage: <T = any>(message: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      try {
        browserAPI.runtime.sendMessage(message, (response) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(response as T);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },
  onMessage: browserAPI.runtime.onMessage,
  lastError: browserAPI.runtime.lastError,
};

export const identity = {
  getRedirectURL: (): string => {
    return browserAPI.identity.getRedirectURL();
  },
  launchWebAuthFlow: (
    details: { url: string; interactive: boolean },
    callback: (redirectUrl?: string) => void,
  ): void => {
    browserAPI.identity.launchWebAuthFlow(details, callback);
  },
};

export const tabs = {
  query: (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
    return new Promise((resolve) => {
      browserAPI.tabs.query(queryInfo, (tabs) => {
        resolve(tabs);
      });
    });
  },
  create: (createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> => {
    return new Promise((resolve) => {
      browserAPI.tabs.create(createProperties, (tab) => {
        resolve(tab);
      });
    });
  },
};

export const scripting = {
  executeScript: (details: any): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      browserAPI.scripting.executeScript(details, (results: any[]) => {
        if (browserAPI.runtime.lastError) {
          reject(new Error(browserAPI.runtime.lastError.message));
        } else {
          resolve(results || []);
        }
      });
    });
  },
};

export const downloads = {
  download: (
    options: chrome.downloads.DownloadOptions,
    callback?: (downloadId: number) => void,
  ): void => {
    browserAPI.downloads.download(options, callback);
  },
};

const rawDnr = browserAPI.declarativeNetRequest;

export const declarativeNetRequest = rawDnr
  ? {
    updateDynamicRules: (options: {
      removeRuleIds?: number[];
      addRules?: chrome.declarativeNetRequest.Rule[];
    }): Promise<void> => {
      return new Promise((resolve, reject) => {
        rawDnr.updateDynamicRules(options, () => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },
    RuleActionType: rawDnr.RuleActionType,
    HeaderOperation: rawDnr.HeaderOperation,
    ResourceType: rawDnr.ResourceType,
  }
  : {
    updateDynamicRules: async () => {},
    RuleActionType: {} as any,
    HeaderOperation: {} as any,
    ResourceType: {} as any,
  };

export const i18n = {
  getUILanguage: (): string => {
    if (browserAPI.i18n?.getUILanguage) {
      return browserAPI.i18n.getUILanguage();
    }
    return navigator.language || 'en';
  },
};
