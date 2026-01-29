import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { signal, computed } from '@preact/signals';

import { Storage } from '@utils/storage';
import { DocspaceAPI } from '@utils/http';

interface ProfileState {
  name: string;
  email: string;
  loading: boolean;
  avatar?: string;
  error: string | null;
}

interface ProfileStore {
  state: ReturnType<typeof signal<ProfileState>>;
  isLoading: ReturnType<typeof computed<boolean>>;
  fetchProfile: (accessToken: string, tenant: string, refreshTokenIfNeeded?: () => Promise<boolean>) => Promise<void>;
  clearProfile: () => void;
}

function createStore(): ProfileStore {
  const storage = new Storage();
  const api = new DocspaceAPI(storage);

  const state = signal<ProfileState>({
    name: '',
    email: '',
    loading: false,
    avatar: undefined,
    error: null,
  });

  const isLoading = computed(() => state.value.loading);

  const fetchProfile = async (
    accessToken: string,
    tenant: string,
    refreshTokenIfNeeded?: () => Promise<boolean>,
  ): Promise<void> => {
    try {
      if (!accessToken || !tenant) {
        state.value = {
          ...state.value,
          loading: false,
          error: null,
        };
        return;
      }

      state.value = { ...state.value, loading: true, error: null };

      const user = await api.getProfile(accessToken, tenant, refreshTokenIfNeeded);

      state.value = {
        name: user.displayName || 'User',
        email: user.email || '',
        avatar: user.avatar ? `${tenant}${user.avatar}` : undefined,
        loading: false,
        error: null,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching profile:', error);
      state.value = {
        ...state.value,
        loading: false,
        error: (error as Error).message,
      };
    }
  };

  const clearProfile = () => {
    state.value = {
      name: '',
      email: '',
      avatar: undefined,
      loading: false,
      error: null,
    };
  };

  return {
    state,
    isLoading,
    fetchProfile,
    clearProfile,
  };
}

const store = createStore();
const Context = createContext<ProfileStore>(store);

interface ProviderProps {
  children: preact.ComponentChildren;
}

export function Provider({ children }: ProviderProps) {
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useProfile(): ProfileStore {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useProfile must be used within Provider');
  }

  return context;
}
