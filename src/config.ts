const isFirefoxBuild = import.meta.env.MODE === 'firefox';

export const OAUTH_AUTHORIZE_URL = import.meta.env.VITE_OAUTH_AUTHORIZE_URL ?? 'https://oauth.onlyoffice.com/oauth2/authorize';
export const OAUTH_TOKEN_URL = import.meta.env.VITE_OAUTH_TOKEN_URL ?? 'https://oauth.onlyoffice.com/oauth2/token';

export const OAUTH_CLIENT_ID = isFirefoxBuild
  ? import.meta.env.VITE_OAUTH_FIREFOX_CLIENT_ID
  : import.meta.env.VITE_OAUTH_CHROME_CLIENT_ID;

export const OAUTH_SCOPES = 'files:write%20files:read%20rooms:read%20accounts.self:read%20accounts.self:write%20rooms:write';

export const HELP_LINK = import.meta.env.VITE_HELP_LINK ?? 'https://helpcenter.onlyoffice.com/';
export const FEEDBACK_LINK = import.meta.env.VITE_FEEDBACK_LINK ?? 'https://feedback.onlyoffice.com/forums/966080-your-voice-matters?category_id=519288';
export const ABOUT_LINK = import.meta.env.VITE_ABOUT_LINK ?? 'https://github.com/ONLYOFFICE/onlyoffice-chrome-extension';

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!OAUTH_CLIENT_ID) {
    const clientIdVar = isFirefoxBuild
      ? 'VITE_OAUTH_FIREFOX_CLIENT_ID'
      : 'VITE_OAUTH_CHROME_CLIENT_ID';
    errors.push(`${clientIdVar} is not set in .env`);
  }

  return { valid: errors.length === 0, errors };
}
