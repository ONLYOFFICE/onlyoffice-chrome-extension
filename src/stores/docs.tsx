import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { signal, computed } from '@preact/signals';

import { Format } from '@utils/formats';
import { Storage } from '@utils/storage';
import { DocspaceAPI, FileInfo } from '@utils/http';

import formats from '@vendor/document-formats/onlyoffice-docs-formats.json';

const FORMAT_MAP = new Map<string, Format>();
(formats as Format[]).forEach((format) => {
  FORMAT_MAP.set(format.name.toLowerCase(), format);
});

function hasValidActions(ext: string): boolean {
  if (!ext) return false;
  const normalized = ext.toLowerCase().replace(/^\./, '');
  const format = FORMAT_MAP.get(normalized);
  return format ? format.actions.length > 0 : false;
}

export interface File {
  id: number;
  title: string;
  fileExst: string;
  fileType: number;
  webUrl: string;
  updated: string;
  hash?: string;
}

interface State {
  folderId: number | null;
  domain: string | null;
  perPage: number;
  loading: boolean;
  fetching: boolean;
  error: string | null;
  files: File[];
  hashMap: Record<string, number>;
  currentPage: number;
  total: number;
  hasMore: boolean;
}

export interface Store {
  state: ReturnType<typeof signal<State>>;
  isLoading: ReturnType<typeof computed<boolean>>;
  hasFolderId: ReturnType<typeof computed<boolean>>;
  fetchMyDocumentsFolder: (token: string, tenant: string, refresh?: () => Promise<boolean>) => Promise<void>;
  fetchRecentFiles: (token: string, tenant: string, page?: number, refresh?: () => Promise<boolean>) => Promise<void>;
  uploadFile: (token: string, tenant: string, file: Blob, name: string, hash: string) => Promise<File>;
  findFileByHash: (token: string, tenant: string, hash: string) => Promise<File | null>;
  createFile: (token: string, tenant: string, name: string, type: 'document' | 'spreadsheet' | 'presentation' | 'pdf', refresh?: () => Promise<boolean>) => Promise<File>;
  clear: () => Promise<void>;
}

function createStore(): Store {
  const storage = new Storage();
  const api = new DocspaceAPI(storage);

  const state = signal<State>({
    folderId: null,
    domain: null,
    perPage: 10,
    loading: false,
    fetching: false,
    error: null,
    files: [],
    hashMap: {},
    currentPage: 1,
    total: 0,
    hasMore: true,
  });

  storage.get(['fileHashMap']).then((result) => {
    if (result.fileHashMap) {
      state.value = { ...state.value, hashMap: result.fileHashMap };
    }
  });

  const isLoading = computed(() => state.value.loading);
  const hasFolderId = computed(() => state.value.folderId !== null);

  const fetchMyDocumentsFolder = async (
    token: string,
    tenant: string,
    refresh?: () => Promise<boolean>,
  ): Promise<void> => {
    try {
      state.value = { ...state.value, loading: true, error: null };

      if (!tenant) throw new Error('Tenant required');

      const folderInfo = await api.getMyDocumentsFolder(token, tenant, refresh);
      const folderId = folderInfo.id;

      state.value = {
        ...state.value,
        folderId,
        domain: tenant,
        loading: false,
        error: null,
      };

      await storage.set({
        documentsData: { folderId, domain: tenant },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Folder fetch error:', error);

      let errorMessage = 'Failed to fetch documents folder';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to DocSpace. Please check your internet connection.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      state.value = {
        ...state.value,
        loading: false,
        error: errorMessage,
      };
      throw new Error(errorMessage);
    }
  };

  const fetchRecentFiles = async (
    token: string,
    tenant: string,
    page = 1,
    refresh?: () => Promise<boolean>,
  ): Promise<void> => {
    try {
      state.value = { ...state.value, fetching: true };

      if (!tenant) throw new Error('Tenant required');

      const itemsPerPage = state.value.perPage;
      const startIndex = (page - 1) * itemsPerPage;

      const result = await api.getRecentFiles(token, tenant, itemsPerPage, startIndex, refresh);
      const rawFiles = result.files;
      const { total } = result;

      const newFiles: File[] = rawFiles
        .filter((f: FileInfo) => hasValidActions(f.fileExst))
        .map((f: FileInfo) => ({
          id: f.id,
          title: f.title,
          fileExst: f.fileExst,
          updated: f.updated,
          webUrl: f.webUrl,
          fileType: f.fileType,
        }));

      const files = page === 1
        ? newFiles
        : [...state.value.files, ...newFiles];

      state.value = {
        ...state.value,
        files,
        total,
        currentPage: page,
        fetching: false,
        hasMore: newFiles.length > 0,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Files fetch error:', error);

      let errorMessage = 'Failed to fetch recent files';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to DocSpace. Please check your internet connection.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      state.value = {
        ...state.value,
        fetching: false,
        error: errorMessage,
      };
    }
  };

  const uploadFile = async (
    token: string,
    tenant: string,
    file: Blob,
    name: string,
    hash: string,
  ): Promise<File> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 8192;
      let binary = '';

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }

      const base64 = btoa(binary);

      const response = await chrome.runtime.sendMessage({
        action: 'uploadFile',
        tenant,
        accessToken: token,
        fileData: base64,
        fileName: name,
        fileType: file.type || 'application/octet-stream',
      });

      if (!response.success) {
        throw new Error(response.error || 'Upload failed');
      }

      const uploaded = response.data;
      const result: File = {
        id: uploaded.id,
        title: uploaded.title,
        fileExst: uploaded.fileExst,
        updated: uploaded.updated,
        webUrl: uploaded.webUrl,
        fileType: uploaded.fileType,
        hash,
      };

      const newHashMap = { ...state.value.hashMap, [hash]: uploaded.id };
      state.value = { ...state.value, hashMap: newHashMap };
      await storage.set({ fileHashMap: newHashMap });

      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Upload error:', error);

      let errorMessage = 'Failed to upload file';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to DocSpace. Please check your internet connection and try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  const findFileByHash = async (
    token: string,
    tenant: string,
    hash: string,
  ): Promise<File | null> => {
    try {
      const fileId = state.value.hashMap[hash];
      if (!fileId) return null;

      const response = await chrome.runtime.sendMessage({
        action: 'getFileInfo',
        tenant,
        accessToken: token,
        fileId,
      });

      if (!response.success) {
        const newHashMap = { ...state.value.hashMap };
        delete newHashMap[hash];
        state.value = { ...state.value, hashMap: newHashMap };
        await storage.set({ fileHashMap: newHashMap });
        return null;
      }

      const file = response.data;
      return {
        id: file.id,
        title: file.title,
        fileExst: file.fileExst,
        updated: file.updated,
        webUrl: file.webUrl,
        fileType: file.fileType,
        hash,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Hash lookup error:', error);
      return null;
    }
  };

  const createFile = async (
    token: string,
    tenant: string,
    name: string,
    type: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    refresh?: () => Promise<boolean>,
  ): Promise<File> => {
    try {
      const { folderId } = state.value;
      if (!folderId) {
        throw new Error('Folder ID not found');
      }

      const typeMap: Record<string, { ext: string; title: string }> = {
        document: { ext: '.docx', title: name.endsWith('.docx') ? name : `${name}.docx` },
        spreadsheet: { ext: '.xlsx', title: name.endsWith('.xlsx') ? name : `${name}.xlsx` },
        presentation: { ext: '.pptx', title: name.endsWith('.pptx') ? name : `${name}.pptx` },
        pdf: { ext: '.pdf', title: name.endsWith('.pdf') ? name : `${name}.pdf` },
      };

      const { title, ext } = typeMap[type];

      const created = await api.createFile(token, tenant, folderId, title, refresh);

      const result: File = {
        id: created.id,
        title: created.title,
        fileExst: created.fileExst || ext,
        updated: created.updated,
        webUrl: created.webUrl,
        fileType: created.fileType,
      };

      await fetchRecentFiles(token, tenant, 1, refresh);

      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Create error:', error);

      let errorMessage = 'Failed to create file';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to DocSpace. Please check your internet connection and try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  const clear = async () => {
    state.value = {
      folderId: null,
      domain: null,
      perPage: 10,
      loading: false,
      fetching: false,
      error: null,
      files: [],
      hashMap: {},
      currentPage: 1,
      total: 0,
      hasMore: true,
    };
    await storage.remove(['documentsData', 'fileHashMap']);
  };

  return {
    state,
    isLoading,
    hasFolderId,
    fetchMyDocumentsFolder,
    fetchRecentFiles,
    uploadFile,
    findFileByHash,
    createFile,
    clear,
  };
}

const store = createStore();
const Context = createContext<Store>(store);

interface ProviderProps {
  children: preact.ComponentChildren;
}

export function Provider({ children }: ProviderProps) {
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useDocs(): Store {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useDocs must be used within Provider');
  }

  return context;
}
