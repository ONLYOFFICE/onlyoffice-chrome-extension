import { Storage } from './storage';

export class Client {
  authenticated = false;

  accessToken: string | null = null;

  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async check(): Promise<boolean> {
    const { docspace_authentication } = await this.storage.get(['docspace_authentication']);

    if (docspace_authentication?.accessToken) {
      const age = Date.now() - (docspace_authentication.timestamp || 0);
      const expiry = (docspace_authentication.expiresIn || 3600) * 1000;

      if (age < expiry) {
        this.authenticated = true;
        this.accessToken = docspace_authentication.accessToken;
        return true;
      }
    }

    return false;
  }

  clear(): void {
    this.authenticated = false;
    this.accessToken = null;
  }
}
