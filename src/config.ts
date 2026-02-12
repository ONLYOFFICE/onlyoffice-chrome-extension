const isFirefoxBuild = import.meta.env.MODE === 'firefox';

export const TOKEN_EXCHANGE_URL = isFirefoxBuild
  ? import.meta.env.VITE_TOKEN_FIREFOX_EXCHANGE_URL
  : import.meta.env.VITE_TOKEN_CHROME_EXCHANGE_URL;

export const OAUTH_CLIENT_ID = isFirefoxBuild
  ? import.meta.env.VITE_OAUTH_FIREFOX_CLIENT_ID
  : import.meta.env.VITE_OAUTH_CHROME_CLIENT_ID;

export const OAUTH_SCOPES = 'files:write%20files:read%20rooms:read%20accounts.self:read%20accounts.self:write%20rooms:write';

export const HELP_LINK = import.meta.env.VITE_HELP_LINK ?? 'https://helpcenter.onlyoffice.com/';
export const FEEDBACK_LINK = import.meta.env.VITE_FEEDBACK_LINK ?? 'https://feedback.onlyoffice.com/forums/966080-your-voice-matters?category_id=519288';
export const ABOUT_LINK = import.meta.env.VITE_ABOUT_LINK ?? 'https://github.com/ONLYOFFICE/onlyoffice-chrome-extension';

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!TOKEN_EXCHANGE_URL) {
    const tokenUrlVar = isFirefoxBuild
      ? 'VITE_TOKEN_FIREFOX_EXCHANGE_URL'
      : 'VITE_TOKEN_CHROME_EXCHANGE_URL';
    errors.push(`${tokenUrlVar} is not set in .env`);
  }

  if (!OAUTH_CLIENT_ID) {
    const clientIdVar = isFirefoxBuild
      ? 'VITE_OAUTH_FIREFOX_CLIENT_ID'
      : 'VITE_OAUTH_CHROME_CLIENT_ID';
    errors.push(`${clientIdVar} is not set in .env`);
  }

  return { valid: errors.length === 0, errors };
}
