export class Storage {
  async get<T extends Record<string, any>>(keys: (keyof T)[]): Promise<Partial<T>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys as string[], (result) => {
        resolve(result as Partial<T>);
      });
    });
  }

  async set<T extends Record<string, any>>(items: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, () => {
        resolve();
      });
    });
  }

  async remove(keys: string[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => {
        resolve();
      });
    });
  }
}
