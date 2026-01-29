import { Storage } from './storage';

export interface FileInfo {
  id: number;
  title: string;
  fileExst: string;
  fileType: number;
  webUrl: string;
  updated: string;
  hash?: string;
}

export interface FolderInfo {
  id: number;
}

export interface ProfileInfo {
  displayName: string;
  email: string;
  avatar?: string;
}

export interface RecentFilesResponse {
  files: FileInfo[];
  total: number;
}

export class DocspaceAPI {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    refreshToken?: () => Promise<boolean>,
  ): Promise<Response> {
    let response = await fetch(url, options);

    if ((response.status === 401 || response.status === 403) && refreshToken) {
      const refreshed = await refreshToken();

      if (refreshed) {
        const { docspace_authentication } = await this.storage.get(['docspace_authentication']);
        const newToken = docspace_authentication?.accessToken;

        if (newToken) {
          response = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
        }
      }
    }

    return response;
  }

  async getMyDocumentsFolder(
    accessToken: string,
    tenant: string,
    refreshToken?: () => Promise<boolean>,
  ): Promise<FolderInfo> {
    const response = await this.fetchWithRetry(
      `${tenant}/api/2.0/files/@my`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
      refreshToken,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch documents folder: ${response.status}`);
    }

    const data = await response.json();
    const pathParts = data.response?.pathParts;

    if (!pathParts?.length) {
      throw new Error('No pathParts in response');
    }

    return { id: pathParts[0].id };
  }

  async getRecentFiles(
    accessToken: string,
    tenant: string,
    count: number,
    startIndex: number,
    refreshToken?: () => Promise<boolean>,
  ): Promise<RecentFilesResponse> {
    const url = new URL(`${tenant}/api/2.0/files/recent`);
    url.searchParams.set('count', count.toString());
    url.searchParams.set('startIndex', startIndex.toString());

    const response = await this.fetchWithRetry(
      url.toString(),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
      refreshToken,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch recent files: ${response.status}`);
    }

    const data = await response.json();
    return {
      files: data.response?.files || [],
      total: data.response?.total || 0,
    };
  }

  async getFileInfo(
    accessToken: string,
    tenant: string,
    fileId: number,
    refreshToken?: () => Promise<boolean>,
  ): Promise<FileInfo> {
    const response = await this.fetchWithRetry(
      `${tenant}/api/2.0/files/file/${fileId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
      refreshToken,
    );

    if (!response.ok) {
      throw new Error(`Failed to get file info: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  async getDownloadUrl(
    accessToken: string,
    tenant: string,
    fileId: number,
    refreshToken?: () => Promise<boolean>,
  ): Promise<string> {
    const response = await this.fetchWithRetry(
      `${tenant}/api/2.0/files/file/${fileId}/presigneduri`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
      refreshToken,
    );

    if (!response.ok) {
      throw new Error(`Failed to get download link: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  async deleteFile(
    accessToken: string,
    tenant: string,
    fileId: number,
    refreshToken?: () => Promise<boolean>,
  ): Promise<void> {
    const response = await this.fetchWithRetry(
      `${tenant}/api/2.0/files/file/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          deleteAfter: false,
          immediately: false,
        }),
      },
      refreshToken,
    );

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.status}`);
    }
  }

  async createFile(
    accessToken: string,
    tenant: string,
    folderId: number,
    title: string,
    refreshToken?: () => Promise<boolean>,
  ): Promise<FileInfo> {
    const response = await this.fetchWithRetry(
      `${tenant}/api/2.0/files/${folderId}/file`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ title }),
      },
      refreshToken,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create file: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async uploadFile(
    accessToken: string,
    tenant: string,
    file: Blob,
    fileName: string,
    refreshToken?: () => Promise<boolean>,
  ): Promise<FileInfo> {
    const formData = new FormData();
    formData.append('file', file, fileName);

    const response = await this.fetchWithRetry(
      `${tenant}/api/2.0/files/@my/upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      },
      refreshToken,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async getProfile(
    accessToken: string,
    tenant: string,
    refreshToken?: () => Promise<boolean>,
  ): Promise<ProfileInfo> {
    const response = await this.fetchWithRetry(
      `${tenant}/api/2.0/people/@self`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
      refreshToken,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }
}
