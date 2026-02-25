import { storage as browserStorage } from '@utils/browser';

export class Storage {
  async get<T extends Record<string, any>>(keys: (keyof T)[]): Promise<Partial<T>> {
    return browserStorage.local.get(keys);
  }

  async set<T extends Record<string, any>>(items: T): Promise<void> {
    return browserStorage.local.set(items);
  }

  async remove(keys: string[]): Promise<void> {
    return browserStorage.local.remove(keys);
  }
}
