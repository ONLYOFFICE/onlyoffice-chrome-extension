export const TOKEN_EXCHANGE_URL = import.meta.env.VITE_TOKEN_EXCHANGE_URL;
export const OAUTH_CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID;
export const OAUTH_SCOPES = 'files:write%20files:read%20rooms:read%20accounts.self:read%20accounts.self:write%20rooms:write';

export const HELP_LINK = import.meta.env.VITE_HELP_LINK ?? 'https://helpcenter.onlyoffice.com/';
export const FEEDBACK_LINK = import.meta.env.VITE_FEEDBACK_LINK ?? 'https://www.onlyoffice.com/';
export const ABOUT_LINK = import.meta.env.VITE_ABOUT_LINK ?? 'https://www.onlyoffice.com/';

export function validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!TOKEN_EXCHANGE_URL)
        errors.push('TOKEN_EXCHANGE_URL is not set in .env');
    if (!OAUTH_CLIENT_ID)
        errors.push('OAUTH_CLIENT_ID is not set in .env');
    return { valid: errors.length === 0, errors };
}
