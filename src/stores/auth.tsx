import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { signal, computed } from '@preact/signals';

import { Client } from '@utils/client';
import { decodeJWT } from '@utils/jwt';
import { Storage } from '@utils/storage';

import { TOKEN_EXCHANGE_URL, OAUTH_CLIENT_ID } from '@config';

interface State {
  client: Client;
  authenticated: boolean;
  loading: boolean;
  signingIn: boolean;
  exchanging: boolean;
  error: string | null;
  tenant: string | null;
}

interface Store {
  state: ReturnType<typeof signal<State>>;
  isAuthenticated: ReturnType<typeof computed<boolean>>;
  isLoading: ReturnType<typeof computed<boolean>>;
  isSigningIn: ReturnType<typeof computed<boolean>>;
  isExchanging: ReturnType<typeof computed<boolean>>;
  checkAuthentication: () => Promise<boolean>;
  startSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshTokenIfNeeded: () => Promise<boolean>;
  getClient: () => Client;
}

function createStore(): Store {
  const storage = new Storage();
  const client = new Client(storage);

  const state = signal<State>({
    client,
    authenticated: false,
    loading: true,
    signingIn: false,
    exchanging: false,
    error: null,
    tenant: null,
  });

  const isAuthenticated = computed(() => state.value.authenticated);
  const isLoading = computed(() => state.value.loading);
  const isSigningIn = computed(() => state.value.signingIn);
  const isExchanging = computed(() => state.value.exchanging);

  const clearAuth = async () => {
    await storage.remove(['docspace_authentication']);
    client.authenticated = false;
    client.accessToken = null;
    state.value = {
      ...state.value,
      authenticated: false,
      loading: false,
      error: null,
      tenant: null,
    };
  };

  const refreshToken = async (refreshTokenValue: string): Promise<boolean> => {
    try {
      const response = await fetch(TOKEN_EXCHANGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshTokenValue,
          client_id: OAUTH_CLIENT_ID,
        }),
      });

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error('Token refresh failed with status:', response.status);
        await clearAuth();
        return false;
      }

      const tokens = await response.json();
      const decoded = decodeJWT(tokens.access_token);
      const tenant = decoded?.aud || null;

      await storage.set({
        docspace_authentication: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || refreshToken,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type,
          timestamp: Date.now(),
          tenant,
        },
      });

      client.authenticated = true;
      client.accessToken = tokens.access_token;
      state.value = { ...state.value, tenant };

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Token refresh error:', error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        state.value = {
          ...state.value,
          error: 'Unable to connect to authentication server. Please check your internet connection.',
        };
      }

      await clearAuth();
      return false;
    }
  };

  const checkAuthentication = async (): Promise<boolean> => {
    try {
      const { docspace_authentication } = await storage.get(['docspace_authentication']);

      if (docspace_authentication?.accessToken) {
        const tokenAge = Date.now() - (docspace_authentication.timestamp || 0);
        const expiresInMs = (docspace_authentication.expiresIn || 3600) * 1000;

        if (tokenAge < expiresInMs) {
          client.authenticated = true;
          client.accessToken = docspace_authentication.accessToken;

          const tenant = docspace_authentication.tenant || decodeJWT(docspace_authentication.accessToken)?.aud;

          state.value = {
            ...state.value,
            authenticated: true,
            loading: false,
            tenant,
          };

          return true;
        }

        if (docspace_authentication.refreshToken) {
          const refreshed = await refreshToken(docspace_authentication.refreshToken);
          if (refreshed) {
            state.value = { ...state.value, authenticated: true, loading: false };
            return true;
          }
        } else {
          await clearAuth();
        }
      }

      client.authenticated = false;
      client.accessToken = null;
      state.value = { ...state.value, authenticated: false, loading: false };

      return false;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auth check error:', error);
      state.value = {
        ...state.value,
        authenticated: false,
        loading: false,
        error: (error as Error).message,
      };

      return false;
    }
  };

  const startSignIn = async (): Promise<void> => {
    try {
      state.value = { ...state.value, signingIn: true, error: null };

      await chrome.runtime.sendMessage({ action: 'ping' });
      const response = await chrome.runtime.sendMessage({ action: 'startOAuthFlow' });

      if (!response.success) {
        throw new Error(response.error || 'OAuth flow failed');
      }

      return new Promise<void>((resolve, reject) => {
        let timeoutId: number | null = null;
        let listenerRemoved = false;

        const cleanup = () => {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (!listenerRemoved) {
            chrome.runtime.onMessage.removeListener(messageListener);
            listenerRemoved = true;
          }
        };

        const messageListener = async (message: any) => {
          if (message.action === 'exchangingTokens') {
            state.value = { ...state.value, signingIn: false, exchanging: true };

            if (timeoutId === null) {
              timeoutId = window.setTimeout(async () => {
                cleanup();
                state.value = {
                  ...state.value,
                  signingIn: false,
                  exchanging: false,
                  error: 'Sign-in timed out. Please try again.',
                };
                await storage.remove(['exchanging_tokens']);
                reject(new Error('Sign-in timed out. Please try again.'));
              }, 25000);
            }
          } else if (message.action === 'oauthSuccess') {
            cleanup();
            state.value = { ...state.value, signingIn: false, exchanging: false };
            resolve();
          } else if (message.action === 'oauthError') {
            cleanup();
            state.value = {
              ...state.value,
              signingIn: false,
              exchanging: false,
              error: message.error,
            };
            reject(new Error(message.error));
          }
        };

        chrome.runtime.onMessage.addListener(messageListener);
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Sign-in error:', error);
      state.value = {
        ...state.value,
        signingIn: false,
        exchanging: false,
        error: (error as Error).message,
      };
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await chrome.runtime.sendMessage({ action: 'clearAuth' });
      await clearAuth();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
      state.value = { ...state.value, error: (error as Error).message };
      throw error;
    }
  };

  const refreshTokenIfNeeded = async (): Promise<boolean> => {
    try {
      const { docspace_authentication } = await storage.get(['docspace_authentication']);

      if (!docspace_authentication?.accessToken) {
        return false;
      }

      const tokenAge = Date.now() - (docspace_authentication.timestamp || 0);
      const expiresInMs = (docspace_authentication.expiresIn || 3600) * 1000;

      if (tokenAge >= expiresInMs && docspace_authentication.refreshToken) {
        return refreshToken(docspace_authentication.refreshToken);
      }

      return tokenAge < expiresInMs;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Token refresh check error:', error);
      return false;
    }
  };

  const getClient = () => client;

  return {
    state,
    isAuthenticated,
    isLoading,
    isSigningIn,
    isExchanging,
    checkAuthentication,
    startSignIn,
    logout,
    refreshTokenIfNeeded,
    getClient,
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

export function useAuth(): Store {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useAuth must be used within Provider');
  }

  return context;
}
