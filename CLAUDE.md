# CLAUDE.md

Browser extension (Manifest V3) for ONLYOFFICE DocSpace. A single codebase builds both Chrome and Firefox.
Stack: Preact, @preact/signals, TypeScript, Vite 7. More context: HANDOVER.md.

## Branches
- **The current line of work is `feature/pkce`**: OAuth2 Authorization Code + PKCE (S256), with no server-side proxy.
  Branch new work from it, or merge it into `develop` first (HANDOVER.md §6-7).
- `develop` without pkce still uses the legacy scheme with the token exchange proxy (`TOKEN_EXCHANGE_URL`). Do not build on it.
- Releases come from `master` (`develop` - `master`).

## Commands
```bash
git submodule update --init   # vendor/document-formats; the build fails without it
npm ci                        # Node 20 (as in CI)
npm run lint                  # ESLint on src/; must have 0 errors (warnings are OK)
npm run build                 # dist-chrome/ + dist-firefox/
npm run build:chrome          # = vite build
npm run build:firefox         # = vite build --mode firefox
npm run smoke                 # build both + checks: manifests, versions, locales, files
npm run package               # build + docspace-chrome.zip / docspace-firefox.zip
```
- `.env` is required (not in git). With PKCE: `VITE_OAUTH_CHROME_CLIENT_ID`, `VITE_OAUTH_FIREFOX_CLIENT_ID` are required;
  `VITE_OAUTH_AUTHORIZE_URL`, `VITE_OAUTH_TOKEN_URL` are optional (default `https://oauth.onlyoffice.com/oauth2/{authorize,token}`);
  `VITE_HELP_LINK`, `VITE_FEEDBACK_LINK`, `VITE_ABOUT_LINK` are optional. `vite.config.ts` fails the build when a client_id is missing.
- Run in the browser: Chrome: `chrome://extensions` - Developer mode - Load unpacked - `dist-chrome/`.
  Firefox: `about:debugging` - Load Temporary Add-on - `dist-firefox/manifest.json`. After a rebuild, reload the extension.
- `npm run dev` / `tsc` are not usable for checks: there is no extension API in the dev server, and tsconfig includes `**/*` (pulls in dist).
- There are no automated tests apart from `npm run smoke`. Check features with the manual checklist in HANDOVER.md §8.

## Structure
- `src/background.ts`: service worker (Firefox: background script). OAuth: `createPKCE()` (`utils/pkce.ts`) -
  `launchWebAuthFlow` with `code_challenge` - `exchangeCode(code, verifier)` against `OAUTH_TOKEN_URL`. Also stripping the `Origin` header
  and operations the popup sends as messages (`uploadFile`, `deleteFile`, `getFileInfo`, `downloadFile`).
- `src/stores/auth.tsx`: session state and refresh (`grant_type=refresh_token` straight to `OAUTH_TOKEN_URL`).
- `src/index.tsx` - `src/pages/App.tsx`: popup. `pages/` are screens, `features/<area>/components` are UI by area,
  `components/` are basic UI elements, `hooks/` hold the popup logic, `stores/` hold the signal stores (auth, docs, profile, feedback, i18n).
- `src/utils/http.ts` (`DocspaceAPI`): all DocSpace REST API 2.0 calls. `utils/browser.ts` wraps chrome/browser.
- `src/config.ts`: values from `.env` and OAuth scopes. `src/i18n/locales/*.json`: en, ru, de, es, fr, zh.
- `public/chrome/manifest.json`, `public/firefox/manifest.json`: separate manifests that the vite plugin copies into dist.
- `vendor/document-formats`: submodule with the list of formats (extensions, mime types, editability).

## Conventions
- Imports go through aliases (`@utils/…`, `@stores/…`, `@features/…`, `@icons/…`, `@vendor/…`); see vite.config.ts/tsconfig.json.
- Call extension APIs only through `@utils/browser` (`runtime`, `tabs`, `storage`…), never `chrome.*` directly: Firefox compatibility.
- Every user-facing string goes through `t('section.key')`. A new key goes into **all 6** locales (smoke checks this).
- Code style is ESLint airbnb-extended: 2 spaces, single quotes, max-len 120, `console.*` only with `eslint-disable-next-line`.
- Commits follow Conventional Commits (`feat:`, `fix(scope):`, `chore:`, `styles:`).

## Do not
- Do not write secrets or configuration values (client_id, store tokens) to files or commits; `.env` stays out of git.
- Do not add a client_secret or bring back the server-side token proxy: the extension is a public OAuth client, and PKCE replaces the secret.
- Do not change `OAUTH_SCOPES`, the redirect URI format (`identity.getRedirectURL()` without the trailing `/`),
  the PKCE parameters (S256, verifier 32 random bytes in base64url)
  or the storage keys (`docspace_authentication`, `fileHashMap`, `documentsData`, `locale`, `dont_ask_file_name`…)
  unless you have to: they must match the registered OAuth app, and existing users would get logged out.
- Do not remove the `Origin` stripping (declarativeNetRequest rule id 1 / Firefox webRequest): the DocSpace API will start rejecting requests.
- Do not add manifest permissions without a reason: each one makes store review harder.
- The version lives in 4 places: `package.json`, both manifests, the top `## x.y.z` in `CHANGELOG.md`. Change them together (smoke checks this).
