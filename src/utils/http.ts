import { LocalizedError } from '@i18n/errors';

import { AI_IDLE_TIMEOUT } from '@config';

import { Storage } from './storage';
import { retryFetch } from './retry';
import { HttpError } from './http-error';

export { HttpError } from './http-error';

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

export interface AIAgent {
  id: number;
  title: string;
}

export interface FolderEntry {
  id: number;
  title: string;
  type?: number | string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RecentFilesResponse {
  files: FileInfo[];
  total: number;
}

// DocSpace wraps most payloads in `{ response }`; the AI endpoints sometimes do not
const unwrap = (data: any) => data?.response ?? data;

// Collects the `choices[0].delta.content` pieces of an OpenAI-style server-sent event stream
async function readEventStream(body: ReadableStream<Uint8Array>, onData: () => void): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  const consume = (line: string) => {
    const payload = line.trim().match(/^data:\s*(.*)$/)?.[1];
    if (!payload || payload === '[DONE]') return;

    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      return;
    }

    if (data?.error) throw new Error(`AI request failed: ${data.error.message || JSON.stringify(data.error)}`);
    content += data?.choices?.[0]?.delta?.content ?? '';
  };

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;

    onData();
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(consume);
  }

  consume(buffer + decoder.decode());
  return content;
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
    const fetchOptions: RequestInit = {
      ...options,
      referrerPolicy: 'no-referrer',
    };

    let response = await retryFetch(
      () => fetch(url, fetchOptions),
      {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 3000,
      },
    );

    if ((response.status === 401 || response.status === 403) && refreshToken) {
      const refreshed = await refreshToken();

      if (refreshed) {
        const { docspace_authentication } = await this.storage.get(['docspace_authentication']);
        const newToken = docspace_authentication?.accessToken;

        if (newToken) {
          response = await retryFetch(
            () => fetch(url, {
              ...fetchOptions,
              headers: {
                ...fetchOptions.headers,
                Authorization: `Bearer ${newToken}`,
              },
            }),
            {
              maxRetries: 2,
              initialDelay: 500,
              maxDelay: 3000,
            },
          );
        }
      }
    }

    return response;
  }

  // Calls an endpoint without the popup's refresh-and-retry flow; failures throw HttpError
  private async authorized(accessToken: string, url: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      ...init,
      referrerPolicy: 'no-referrer',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...init.headers },
    });

    if (!response.ok) throw await HttpError.from(response);
    return response;
  }

  private async authorizedJSON<T = any>(accessToken: string, url: string, init?: RequestInit): Promise<T> {
    return unwrap(await (await this.authorized(accessToken, url, init)).json());
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
    folderId: number | '@my' = '@my',
  ): Promise<FileInfo> {
    const formData = new FormData();
    formData.append('file', file, fileName);

    const response = await this.fetchWithRetry(
      `${tenant}/api/2.0/files/${folderId}/upload`,
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

  async chatCompletion(accessToken: string, tenant: string, model: string, messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    // The request is aborted only when no data arrives for AI_IDLE_TIMEOUT, so long streams are fine
    const touch = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => controller.abort(), AI_IDLE_TIMEOUT);
    };

    try {
      touch();
      const response = await this.authorized(accessToken, `${tenant}/api/2.0/ai/gateway/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: controller.signal,
      });
      touch();

      const content = response.headers.get('Content-Type')?.includes('text/event-stream') && response.body
        ? await readEventStream(response.body, touch)
        : unwrap(await response.json())?.choices?.[0]?.message?.content ?? '';

      if (!content.trim()) throw new LocalizedError('error.empty_ai_response');
      return content;
    } catch (error) {
      if (controller.signal.aborted) throw new LocalizedError('error.ai_timeout');
      throw error;
    } finally {
      clearTimeout(idleTimer);
    }
  }

  async getChatAgents(accessToken: string, tenant: string): Promise<AIAgent[]> {
    const data = await this.authorizedJSON(accessToken, `${tenant}/api/2.0/files/rooms?searchArea=AiAgents&count=100`);
    return (data?.folders || []).map(({ id, title }: AIAgent) => ({ id, title }));
  }

  async getDefaultChatProfileId(accessToken: string, tenant: string): Promise<string> {
    const data = await this.authorizedJSON(accessToken, `${tenant}/api/2.0/ai/assignments/get-all-assignments`);
    const profileId = data?.Default;
    if (typeof profileId !== 'string' || !profileId) throw new LocalizedError('error.no_default_model');
    return profileId;
  }

  async getProfileModel(accessToken: string, tenant: string, profileId: string): Promise<string> {
    const profile = await this.authorizedJSON(
      accessToken,
      `${tenant}/api/2.0/ai/profiles/get-by-id?id=${encodeURIComponent(profileId)}`,
    );
    const model = profile?.modelId ?? profile?.model?.id ?? profile?.model;
    if (typeof model !== 'string' || !model) throw new LocalizedError('error.profile_without_model');
    return model;
  }

  async createAgent(
    accessToken: string,
    tenant: string,
    title: string,
    profileId: string,
    prompt: string,
  ): Promise<AIAgent> {
    const agent = await this.authorizedJSON(accessToken, `${tenant}/api/2.0/ai/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, profileId, prompt }),
    });
    return { id: agent.id, title: agent.title };
  }

  async deleteAgent(accessToken: string, tenant: string, agentId: number): Promise<void> {
    await this.authorized(accessToken, `${tenant}/api/2.0/ai/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  }

  async getSubfolders(accessToken: string, tenant: string, folderId: number): Promise<FolderEntry[]> {
    const data = await this.authorizedJSON(accessToken, `${tenant}/api/2.0/files/${folderId}`);
    return (data?.folders || []).map(({ id, title, type }: FolderEntry) => ({ id, title, type }));
  }
}
