import { decodeJWT } from '@utils/jwt';
import { Storage } from '@utils/storage';
import { DocspaceAPI } from '@utils/http';
import { downloadFile } from '@utils/url';
import { retryFetch } from '@utils/retry';
import {
  runtime, identity, declarativeNetRequest,
} from '@utils/browser';

import {
  OAUTH_CLIENT_ID, OAUTH_SCOPES, TOKEN_EXCHANGE_URL, validateConfig,
} from '@config';

declare const browser: any;

const configValidation = validateConfig();
if (!configValidation.valid) {
  throw new Error(`Configuration error: ${configValidation.errors.join(', ')}`);
}

const storage = new Storage();
const api = new DocspaceAPI(storage);

if (typeof browser !== 'undefined' && browser.webRequest) {
  browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const headers = details.requestHeaders || [];
      const filtered = headers.filter((header) => header.name.toLowerCase() !== 'origin');
      return { requestHeaders: filtered };
    },
    { urls: ['https://*.onlyoffice.com/*'] },
    ['blocking', 'requestHeaders'],
  );
}

async function exchangeCode(code: string) {
  try {
    const redirectUri = identity.getRedirectURL().replace(/\/$/, '');
    await storage.set({ exchanging_tokens: true });

    runtime.sendMessage({
      action: 'exchangingTokens',
    }).catch(() => {});

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: OAUTH_CLIENT_ID,
    });

    const response = await retryFetch(
      () => fetch(TOKEN_EXCHANGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }),
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const tokens = await response.json();
    const decoded = decodeJWT(tokens.access_token);
    const tenant = decoded?.aud || null;

    const authData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      timestamp: Date.now(),
      tenant,
    };

    await storage.set({ docspace_authentication: authData });
    await storage.remove(['pending_auth_error', 'exchanging_tokens']);

    runtime.sendMessage({
      action: 'oauthSuccess',
      tokens: authData,
    }).catch(() => {
      // eslint-disable-next-line no-console
      console.warn('Failed to send oauthSuccess message');
    });
  } catch (error) {
    let errorMessage = 'Authentication failed. Please try again.';
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to authentication server. Please check your internet connection and try again.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    await storage.set({
      pending_auth_error: errorMessage,
    });

    await storage.remove(['exchanging_tokens']);

    runtime.sendMessage({
      action: 'oauthError',
      error: errorMessage,
    }).catch(() => {
      // eslint-disable-next-line no-console
      console.warn('Failed to send oauthError message');
    });
  }
}

try {
  if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest?.RuleActionType) {
    declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [{
        id: 1,
        priority: 1,
        action: {
          type: declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            { header: 'Origin', operation: declarativeNetRequest.HeaderOperation.REMOVE },
          ],
        },
        condition: {
          urlFilter: '*.onlyoffice.com/api/*',
          resourceTypes: [declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
        },
      }],
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to add declarativeNetRequest rule:', error);
    });
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize declarativeNetRequest rules:', error);
}

runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ pong: true, timestamp: Date.now() });
    return true;
  }

  if (request.action === 'getAuth') {
    storage.get(['docspace_authentication']).then((result) => {
      sendResponse(result.docspace_authentication || null);
    });

    return true;
  }

  if (request.action === 'clearAuth') {
    storage.remove(['docspace_authentication']).then(() => {
      sendResponse({ success: true });
    });

    return true;
  }

  if (request.action === 'startOAuthFlow') {
    const redirectUri = identity.getRedirectURL().replace(/\/$/, '');
    const authUrl = `https://oauth.onlyoffice.com/oauth2/authorize?response_type=code&client_id=${OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${OAUTH_SCOPES}`;

    identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (redirectUrl) => {
        if (runtime.lastError) {
          const errorMsg = runtime.lastError.message || 'Authentication cancelled';

          storage.set({
            pending_auth_error: errorMsg.includes('canceled') ? 'Authentication cancelled' : errorMsg,
          });

          runtime.sendMessage({
            action: 'oauthError',
            error: errorMsg.includes('canceled') ? 'Authentication cancelled' : errorMsg,
          }).catch(() => {});

          sendResponse({ success: false, error: errorMsg });
          return;
        }

        if (!redirectUrl) {
          const errorMsg = 'Authentication cancelled';
          storage.set({ pending_auth_error: errorMsg });
          runtime.sendMessage({
            action: 'oauthError',
            error: errorMsg,
          }).catch(() => {});
          sendResponse({ success: false, error: errorMsg });
          return;
        }

        try {
          const url = new URL(redirectUrl);
          const code = url.searchParams.get('code');

          if (!code) {
            throw new Error('No authorization code received');
          }

          exchangeCode(code);
          sendResponse({ success: true });
        } catch (error) {
          const errorMsg = (error as Error).message;
          storage.set({ pending_auth_error: errorMsg });
          runtime.sendMessage({
            action: 'oauthError',
            error: errorMsg,
          }).catch(() => {});
          sendResponse({ success: false, error: errorMsg });
        }
      },
    );

    return true;
  }

  if (request.action === 'downloadFile') {
    (async () => {
      try {
        const result = await downloadFile(request.url, 5);
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
      }
    })();
    return true;
  }

  if (request.action === 'getFileInfo') {
    (async () => {
      try {
        const { tenant, accessToken, fileId } = request;

        const fileInfo = await api.getFileInfo(accessToken, tenant, fileId);
        sendResponse({ success: true, data: fileInfo });
      } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
      }
    })();
    return true;
  }

  if (request.action === 'uploadFile') {
    (async () => {
      try {
        const {
          tenant, accessToken, fileData, fileName, fileType,
        } = request;

        const binaryString = atob(fileData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

        const blob = new Blob([bytes], { type: fileType });
        const fileInfo = await api.uploadFile(accessToken, tenant, blob, fileName);
        sendResponse({ success: true, data: fileInfo });
      } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
      }
    })();
    return true;
  }

  if (request.action === 'deleteFile') {
    (async () => {
      try {
        const { tenant, accessToken, fileId } = request;
        await api.deleteFile(accessToken, tenant, fileId);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
      }
    })();
    return true;
  }

  return false;
});
