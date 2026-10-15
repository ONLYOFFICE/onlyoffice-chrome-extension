import { OAUTH_CLIENT_ID, OAUTH_TOKEN_URL } from '@config';
import { decodeJWT } from './jwt';
import { Storage } from './storage';

export interface StoredAuthentication {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  timestamp: number;
  tenant: string | null;
}

let request: Promise<StoredAuthentication | null> | null = null;

async function refresh(storage: Storage, refreshToken: string): Promise<StoredAuthentication | null> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OAUTH_CLIENT_ID,
    }),
  });

  if (!response.ok) return null;

  const tokens = await response.json();
  const newAuthentication: StoredAuthentication = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken,
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
    timestamp: Date.now(),
    tenant: decodeJWT(tokens.access_token)?.aud || null,
  };

  await storage.set({ docspace_authentication: newAuthentication });
  return newAuthentication;
}

async function load(storage: Storage): Promise<StoredAuthentication | null> {
  const { docspace_authentication: auth } = await storage.get<{ docspace_authentication: StoredAuthentication }>(['docspace_authentication']);

  if (!auth?.accessToken) return null;
  if (Date.now() - (auth.timestamp || 0) < (auth.expiresIn || 3600) * 1000) return auth;
  if (!auth.refreshToken) return null;

  return refresh(storage, auth.refreshToken);
}

export function getValidAuthentication(storage: Storage): Promise<StoredAuthentication | null> {
  request ??= load(storage).finally(() => {
    request = null;
  });

  return request;
}
