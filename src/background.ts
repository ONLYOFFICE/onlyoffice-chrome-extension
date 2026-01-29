import { decodeJWT } from '@utils/jwt';
import { Storage } from '@utils/storage';
import { DocspaceAPI } from '@utils/http';
import { downloadFile } from '@utils/url';

import {
  OAUTH_CLIENT_ID, OAUTH_SCOPES, TOKEN_EXCHANGE_URL, validateConfig,
} from '@config';

const storage = new Storage();
const api = new DocspaceAPI(storage);

async function exchangeCode(code: string) {
  try {
    const redirectUri = chrome.identity.getRedirectURL().replace(/\/$/, '');
    await storage.set({ exchanging_tokens: true });

    chrome.runtime.sendMessage({
      action: 'exchangingTokens',
    }).catch(() => {});

    const response = await fetch(TOKEN_EXCHANGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: OAUTH_CLIENT_ID,
      }),
    });

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

    chrome.runtime.sendMessage({
      action: 'oauthSuccess',
      tokens: authData,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.log('Could not notify popup:', err.message);
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

    chrome.runtime.sendMessage({
      action: 'oauthError',
      error: errorMessage,
    }).catch(() => {});
  }
}

chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1],
  addRules: [{
    id: 1,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        { header: 'Origin', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
      ],
    },
    condition: {
      urlFilter: '*.onlyoffice.com/api/*',
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  }],
}).catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to add declarativeNetRequest rule:', error);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
    const validation = validateConfig();
    if (!validation.valid) {
      sendResponse({
        success: false,
        error: `Configuration error: ${validation.errors.join(', ')}\n\nPlease create a .env file with TOKEN_EXCHANGE_URL and OAUTH_CLIENT_ID`,
      });
      return true;
    }

    const redirectUri = chrome.identity.getRedirectURL().replace(/\/$/, '');
    const authUrl = `https://oauth.onlyoffice.com/oauth2/authorize?response_type=code&client_id=${OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${OAUTH_SCOPES}`;

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (redirectUrl) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || 'Authentication cancelled';

          storage.set({
            pending_auth_error: errorMsg.includes('canceled') ? 'Authentication cancelled' : errorMsg,
          });

          chrome.runtime.sendMessage({
            action: 'oauthError',
            error: errorMsg.includes('canceled') ? 'Authentication cancelled' : errorMsg,
          }).catch(() => {});

          sendResponse({ success: false, error: errorMsg });
          return;
        }

        if (!redirectUrl) {
          const errorMsg = 'Authentication cancelled';
          storage.set({ pending_auth_error: errorMsg });
          chrome.runtime.sendMessage({
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
          chrome.runtime.sendMessage({
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

  return false;
});
