# HANDOVER: ONLYOFFICE DocSpace extension for Chrome/Firefox

---

## 1. Integration type

- **A standalone client, not a plugin inside a host.** It is a Manifest V3 browser extension. Two targets come from one codebase:
  Chrome (`dist-chrome`, service worker) and Firefox (`dist-firefox`, background scripts).
- **ONLYOFFICE product: DocSpace.** The extension talks to it in three ways:
  - **Authorization:** OAuth2 Authorization Code + **PKCE (S256)**, the extension is a public client with no client_secret:
    1. `background.ts` generates a `code_verifier` (32 random bytes in base64url) and a `code_challenge = base64url(SHA-256(verifier))`
       (`src/utils/pkce.ts`).
    2. `identity.launchWebAuthFlow` opens `OAUTH_AUTHORIZE_URL` with `code_challenge` + `code_challenge_method=S256`.
    3. The code from the redirect, together with the `code_verifier`, is exchanged straight at `OAUTH_TOKEN_URL` (`grant_type=authorization_code`).
    4. The refresh goes to the same `OAUTH_TOKEN_URL` (`grant_type=refresh_token`, `stores/auth.tsx`).
    Both URLs come from `.env` and default to `https://oauth.onlyoffice.com/oauth2/authorize` and `/oauth2/token`.
  - **Portal (tenant):** the user does not enter it; it comes from the `aud` field of the access token JWT.
  - **Data:** DocSpace REST API 2.0 (`src/utils/http.ts`):
    `files/@my`, `files/recent`, `files/file/{id}` (GET/DELETE), `files/file/{id}/presigneduri`,
    `files/{folderId}/file`, `files/@my/upload`, `people/@self`.
  - Documents are edited in the ONLYOFFICE Docs editors inside DocSpace: the extension only opens the file's `webUrl` in a new tab.
- The list of supported formats comes from the submodule `vendor/document-formats`
  (github.com/ONLYOFFICE/document-formats, currently v3.2.0). A format counts as editable when its `actions` list is not empty.
- **Legacy scheme (before PKCE, still in `develop`):** the code and the refresh token were exchanged through a server-side proxy at
  `TOKEN_EXCHANGE_URL` (`VITE_TOKEN_{CHROME,FIREFOX}_EXCHANGE_URL`). `feature/pkce` removes it completely.
- **DocSpace cloud first.** With PKCE, the OAuth URLs are set at build time, so another OAuth server can be targeted with a separate build.
  On-premise, however, needs its own OAuth app, and the `Origin` stripping only covers `*.onlyoffice.com` (§5).
- **Host and ONLYOFFICE versions.** The manifests set no minimum versions. The theoretical MV3 floor is Chrome 88+ and Firefox 109+;
  nobody has tested old versions. DocSpace must support OAuth apps with **PKCE for public clients** and these scopes:
  `files:write files:read rooms:read accounts.self:read accounts.self:write rooms:write`.
- Edge is not published separately, though the Chrome build should work there.

## 2. Main features

| # | Scenario | Where in the code |
|---|----------|-------------------|
| 1 | Sign in with DocSpace (OAuth + PKCE), automatic token refresh, sign out | `background.ts` (`startOAuthFlow`, `exchangeCode`), `utils/pkce.ts`, `stores/auth.tsx`, `hooks/useTokenExchange.ts` |
| 2 | Recent files list (10 items): open, download, delete (to the trash) | `stores/docs.tsx`, `pages/Files.tsx`, `hooks/useFileOperations.ts` |
| 3 | Create a document, spreadsheet, presentation or PDF form in My documents: name dialog with a "don't ask again" option, then the file opens in a tab | `hooks/useFileCreation.ts`, `features/files/components/create/*` |
| 4 | Upload one file from the device to My documents, then it opens in a tab | `App.tsx: handleUploadFiles`, `useFileOperations.upload` |
| 5 | Detect document links on the open page: **Download** or **Open in ONLYOFFICE** (downloads the file, dedupes by SHA-256, uploads to DocSpace, opens it). Works on the sign-in screen too, but only download is available there | `utils/detector.ts`, `useFileOperations.editDetected`, `utils/url.ts: downloadFile` |
| 6 | Profile with avatar, account menu (Help / Feedback / About) | `stores/profile.tsx`, `features/authentication/components/menu/*` |
| 7 | 6 UI languages (en, ru, de, es, fr, zh; auto-detected, choice saved) and a dark theme from `prefers-color-scheme` | `stores/i18n.tsx`, `i18n/`, `styles/colors.css` |

## 3. Build

- Toolchain: Node 20 (as in CI; works locally on 23 too), npm, Vite 7, TypeScript 5.9, ESLint 9 (airbnb-extended).
- Steps: `git checkout feature/pkce` (or develop after the merge) - `git submodule update --init` - `npm ci` - `.env` -
  `npm run build` (or `npm run package` to get the zips). On `feature/pkce`: lint 0 errors / 48 warnings, `npm run smoke` 41/41.
- **`.env` with PKCE.** No values are written here, only names:
  - required: `VITE_OAUTH_CHROME_CLIENT_ID`, `VITE_OAUTH_FIREFOX_CLIENT_ID` (separate OAuth apps, because the redirect URIs differ);
  - optional: `VITE_OAUTH_AUTHORIZE_URL`, `VITE_OAUTH_TOKEN_URL` (for another OAuth server or a test stand),
    `VITE_HELP_LINK`, `VITE_FEEDBACK_LINK`, `VITE_ABOUT_LINK`.
  - The previous maintainer's local `.env` is already set up for PKCE. With it, `develop` without pkce **does not** build,
    because it requires `VITE_TOKEN_*_EXCHANGE_URL`.
- **CI secrets after PKCE:** `CHROME_OAUTH_CLIENT_ID`, `FIREFOX_OAUTH_CLIENT_ID`, plus the optional `HELP_LINK`, `FEEDBACK_LINK`, `ABOUT_LINK`.
  On `feature/pkce` the workflows no longer read `CHROME_TOKEN_EXCHANGE_URL` / `FIREFOX_TOKEN_EXCHANGE_URL`; remove those secrets after the merge.
  A client_id is not a secret in the strict sense (a public client), but it is still kept in secrets and `.env`, not in code.
- **Unusual parts:**
  - There is no `public/` in Vite (`publicDir: false`). The custom `copy-browser-files` plugin in `vite.config.ts` copies
    `public/*` into dist and puts in the manifest for the right browser (`public/chrome` or `public/firefox`).
  - `background.js` is built without a hash in its name, because the manifest points to it.
  - The client_id is checked twice: in `vite.config.ts` (the build fails) and in `background.ts` (the service worker throws at startup).
  - The `--mode firefox` mode switches both the client_id and `outDir`.
  - `tsc --noEmit` is not suitable as a check: the tsconfig include `**/*` also pulls in dist. There are 0 TS errors in `src/`.
  - `npm run smoke` builds with placeholders when a client_id is missing. That is fine for checks, but such a build cannot sign in.
- **No private repositories or dependencies.** The submodule is public (GitHub ONLYOFFICE/document-formats).

## 4. Store publishing

- Targets: **Chrome Web Store** (README) and **Firefox Add-ons (AMO)**: there is a separate build and a zip for it.
- Automation (`.github/workflows`):
  - `licenses.yml`: checks dependency licenses (ONLYOFFICE/check-licenses) on push or PR to master/develop.
  - `create-tag.yml`: a push to `master` (except README/LICENSE/AUTHORS/.github) creates the tag `v<first version from CHANGELOG.md>`.
  - `release.yml`: a push of a `v*` tag runs lint, build and zip for both browsers and uploads them as artifacts.
  - `build.yml`: manual build with inputs for the client_id (on pkce the token-exchange inputs are already removed).
- CI works on GitHub (github.com/ONLYOFFICE/onlyoffice-chrome-extension). `origin` is the internal Gitea `git.onlyoffice.com`,
  and the code is mirrored to GitHub. Check how and by whom the mirror is synced.
- **Publishing to the stores is manual.** There is no API upload in CI. A person with access to the developer accounts
  (CWS Developer Dashboard, AMO Developer Hub; the company ONLYOFFICE/Ascensio account) uploads the zip from the CI artifacts.
- Review times: CWS usually takes 1-3 business days, longer with broad permissions. AMO: automatic validation plus manual review, from hours to weeks.
- **Common reasons for rejection or delays, with what to watch for:**
  - Broad host permissions `https://*/*`, `http://*/*` plus `tabs`, `scripting`, `cookies`, `webRequest`, `declarativeNetRequest`.
    A justification is needed for each one in the CWS listing (Privacy practices). `cookies` is not used in code, and `webRequest` is not used in Chrome.
  - AMO: the code is bundled by Vite, so **the source code is required**. Build instructions: Node 20,
    `git submodule update --init && npm ci`, `.env` with `VITE_OAUTH_FIREFOX_CLIENT_ID`, `npm run build:firefox`.
    PKCE makes this simpler: the build needs nothing except the public client_id.
  - AMO MV3 requires `browser_specific_settings.gecko.id`, and **the Firefox manifest has none**.
    Without a fixed ID the redirect URL (`identity.getRedirectURL()`) also changes, and the PKCE flow will fail with a redirect_uri mismatch.
  - A privacy policy is required because the extension handles user files and tokens.
- **Version.** The repository has old tags `v9.6.2 … v11.0` from the previous extension, while the current version is `1.0.0`.
  If the release goes into **the same** CWS/AMO listing, the store will reject a version lower than the published one.

## 5. Implicit knowledge

- **Why PKCE.** An extension cannot safely store a client_secret: anyone can unpack the zip. Before PKCE the secret lived on the
  token exchange proxy (`TOKEN_EXCHANGE_URL`), which was an extra service to maintain and a point of failure.
  PKCE replaces the secret with a one-time `code_verifier`, so the extension goes straight to the OAuth server. Do not bring back a client_secret or the proxy.
- **The `code_verifier` lives only in background memory** (the closure in `startOAuthFlow`) until the callback.
  If the service worker is unloaded while the OAuth window is open, the verifier is lost and the exchange fails; the user has to sign in again.
  If users report this, keep the verifier in `storage.session` instead.
- **PKCE exchange without retry.** On develop the exchange went through `retryFetch` (3 attempts). On pkce it is a single `fetch`,
  because an authorization code is single-use and a repeat request with the same code would be rejected anyway. The refresh still uses `retryFetch`.
- **OAuth errors from the redirect.** If there is no `code`, the text is taken from `error_description` / `error` in the URL ("Authorization failed: …").
- **Stripping `Origin`.** For `*.onlyoffice.com` requests the `Origin` header is removed: in Chrome with a dynamic
  declarativeNetRequest rule (id 1, `*.onlyoffice.com/api/*`, XHR/fetch), in Firefox with `webRequest.onBeforeSendHeaders` + blocking.
  Reason: the DocSpace API rejects cross-origin requests from `chrome-extension://` / `moz-extension://`. Do not remove it.
  Coverage differs: Firefox strips `Origin` for all of `https://*.onlyoffice.com/*`, while the Chrome rule only matches `/api/`.
  The token request goes to `oauth.onlyoffice.com/oauth2/token`, so in Chrome it is sent with `Origin`. If token requests fail
  in Chrome only, widen the DNR `urlFilter`.
- `referrerPolicy: 'no-referrer'` on all API requests.
- **Heavy operations go through the background** (upload, delete, getFileInfo, downloading a file found on a page). The file travels as base64 in a message.
  Reasons: the popup closes when it loses focus, which would cut the operation off, and the background can fetch from any domain
  under the host permissions. `runtime.sendMessage` only passes JSON-serializable data, hence base64. The cost is +33% memory, and large files are slow.
- **`downloadFile` (`utils/url.ts`) parses HTML stubs** with JS/meta redirects and follows them, up to 5 hops.
  It handles file hosts that return an intermediate page (`window.location` or `<meta http-equiv="refresh">`) instead of the file.
- **Dedup of "Open in ONLYOFFICE".** The SHA-256 of the file maps to a DocSpace fileId in `storage.local.fileHashMap`, locally only.
- **Redirect URI** = `identity.getRedirectURL()` without the trailing `/`. It must exactly match the URI registered in the OAuth app.
  It depends on the extension ID (the CWS ID or the unpacked ID). For local development, use a separate dev client_id
  or register the redirect URI of your unpacked ID in a test OAuth app.
- **The version lives in 4 places.** The tag is taken from `CHANGELOG.md`, and the manifests and package.json must match by hand (smoke checks this).
- After the code is received, `exchanging_tokens` is written to storage. If the popup was closed during the exchange, it picks the state up again when reopened.
- **Do not touch without a reason:** `OAUTH_SCOPES`, the redirect URI format, the PKCE parameters (S256), storage keys
  (`docspace_authentication`, `fileHashMap`, `documentsData`, `dont_ask_file_name`, `locale`, `pending_auth_error`,
  `exchanging_tokens`), DNR rule id 1, the name `background.js`, and the manifest copying in `vite.config.ts`.

## 6. Known problems, tech debt, branches

**Branches:**
- **`feature/pkce`** (origin, commit `32d2880`, 2026-10-14) is **the main candidate for merging**. Contents:
  - OAuth2 + PKCE (S256), new `src/utils/pkce.ts`;
  - removes `TOKEN_EXCHANGE_URL`, the proxy and its checks in `config.ts` / `vite.config.ts`;
  - configurable `VITE_OAUTH_AUTHORIZE_URL` / `VITE_OAUTH_TOKEN_URL`;
  - the workflows no longer require the token-exchange secrets or inputs;
  - fixes the refresh bug: the function `refreshToken` was saved instead of `refreshTokenValue`;
  - after `oauthSuccess` it calls `checkAuthentication()`, so the popup updates without reopening;
  - readable error text from the OAuth redirect.
  What is left to do before the merge:
  1. set up the Chrome and Firefox OAuth apps in DocSpace as public clients with PKCE, and register their redirect URIs;
  2. run checklist §8 with real client_ids;
  3. merge into `develop`, and remove the `*_TOKEN_EXCHANGE_URL` secrets from CI.
- `develop` contains the legacy proxy scheme. `master` is 45 commits behind `develop` (the DocSpace version 1.0.0 is not yet in master or the stores).

**Bugs that `feature/pkce` does not fix:**
1. `.github/workflows/release.yml`: the `create-release` job has the condition `github.ref == 'refs/heads/master'`, while the workflow
   runs on a tag push. The condition is never true, so no GitHub Release is created. Should be `startsWith(github.ref, 'refs/tags/v')`.
2. In every workflow, `actions/checkout@v4` runs without `submodules: true`, so `vendor/document-formats` is empty and the CI build most likely fails.
3. The Firefox manifest has no `gecko.id` (§4); with PKCE this is critical because of the redirect_uri.
4. Infinite scroll in the recent files is not wired up (`sentinelRef` is unused, `loadingMore={false}`), so only 10 files are visible.
5. The `Origin` stripping only covers `*.onlyoffice.com` (§5).

**Tech debt:**
- No tests apart from `npm run smoke`.
- Format maps are duplicated in 4 places (`utils/formats.ts`, `utils/hash.ts`, `utils/detector.ts`, `stores/docs.tsx`),
  and the OAuth error translation in 3 places (by matching strings "not approve" / "cancel").
- `I18nProvider` creates a new store on every render. The "Success" title and the default names ("New document"…) are not translated.
- Unused permissions: `cookies` everywhere, `webRequest` in Chrome. `utils/client.ts` partly duplicates `stores/auth.tsx`.
- Error texts from the background come in English and are not translated.
- The refresh logic exists only in the popup (`stores/auth.tsx`). The background uses whatever token it receives in the message.

## 7. Plans and commitments

No commitments to customers or partners are recorded in the repository. The technical plan below is the current plan.
Technical plan, in order:
1. **Finish and merge `feature/pkce` into `develop`** (see §6), and clean up the CI secrets.
2. Fix CI (submodule, release condition), add `gecko.id` and register the Firefox redirect URI.
3. Decide the version and the listing (§4), then develop - master, then release to CWS and AMO.
4. Infinite scroll for the recent files, cleanup of permissions and duplicated code.

## 8. Manual check list (smoke in the browser)

Automated: `npm run smoke` (build, manifests, versions, locales). The scenarios below need a browser and a DocSpace account.
Run them on **both** builds (Chrome and Firefox) from `feature/pkce` (or develop after the merge), with real client_ids.

**Preparation:** load `dist-chrome` (Load unpacked) / `dist-firefox` (Temporary Add-on). Register the redirect URI of this ID
in the OAuth app. Have a test page with links to `.docx`, `.xlsx`, `.pdf` and one non-document link.

**Authorization (PKCE):**
- [ ] **Install.** The extension loads without errors (`chrome://extensions` - "Errors" is empty).
- [ ] **Signed-out screen.** The popup shows the Welcome screen and the "Sign in" button. Detected links are listed with only Download working.
- [ ] **Sign in.** "Sign in" - OAuth window - login - select a portal - approve. The popup immediately shows the avatar and Recent files, without reopening.
- [ ] **PKCE parameters.** In DevTools of the service worker - Network: the authorize URL has `code_challenge` and `code_challenge_method=S256`.
      The `oauth2/token` request has `code_verifier` and **no** `client_secret`. There are no requests to the old proxy.
- [ ] **Sign-in cancel or denial.** The error is translated ("authentication cancelled" / "access not approved").
- [ ] **Exchange with the popup closed.** Close the popup right after approving, reopen it: sign-in finishes, nothing hangs.
- [ ] **Refresh.** Set `timestamp` to 0 in `storage.local.docspace_authentication` via DevTools, reopen the popup:
      the token refreshes, and the new `refreshToken` is a string (not empty or a function).
- [ ] **Session after a restart.** Restart the browser: you are still signed in.

**Files:**
- [ ] **Create** (×4 types). "+" - type - name - a tab opens in the editor; the file is in My documents and at the top of Recent.
      With the "don't ask again" checkbox, the next creation skips the dialog.
- [ ] **Upload.** "+" - Upload - choose a .docx: the overlay shows "Uploading…", then success; the file opens in a tab and appears in Recent. Uploading the same file again works.
- [ ] **Recent files.** Open (editor tab), Download (the file is saved), Delete - confirm: the item disappears, and the file is in the DocSpace trash.
- [ ] **Detection.** On the test page every document link is listed with the correct icon. The non-document link is not listed.
- [ ] **Open in ONLYOFFICE.** On a detected file: it uploads and opens. Repeat: the existing file opens (dedup), with no duplicate.
- [ ] **Download a detected file** saves it through the browser download.

**UI:**
- [ ] **Languages** ru/de/es/fr/zh: the popup is translated, with no `files.xxx` keys showing.
- [ ] **Dark theme:** logo, icons and colors are readable.
- [ ] **Menu:** Help / Feedback / About open the right links. Logout - the Welcome screen; reopening keeps you signed out.
- [ ] **Network off:** a clear error appears, and the popup does not show "Something went wrong".
