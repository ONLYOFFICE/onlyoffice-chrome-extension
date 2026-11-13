#!/usr/bin/env node
// Smoke checks that need no browser and no DocSpace account.
//   node scripts/smoke.mjs            build both targets, then check
//   node scripts/smoke.mjs --no-build check the existing dist-chrome / dist-firefox
//
// If an OAuth variable is missing from both .env and the environment, the build uses a
// placeholder value so the checks can still run. Such a build cannot sign in, so it must never be published.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => resolve(root, ...p);
const readJson = (p) => JSON.parse(readFileSync(at(p), 'utf8'));

const failures = [];
const warnings = [];
let passed = 0;

function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

function parseDotEnv() {
  const file = at('.env');
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

const formatsJson = at('vendor/document-formats/onlyoffice-docs-formats.json');
check(
  'submodule vendor/document-formats is checked out',
  existsSync(formatsJson),
  'run: git submodule update --init',
);

if (existsSync(formatsJson)) {
  const formats = JSON.parse(readFileSync(formatsJson, 'utf8'));
  const editable = formats.filter((f) => f.actions?.length > 0).map((f) => f.name);
  for (const ext of ['docx', 'xlsx', 'pptx', 'pdf']) {
    check(`format list contains editable .${ext}`, editable.includes(ext));
  }
}

const pkg = readJson('package.json');
const chromeManifestSrc = readJson('public/chrome/manifest.json');
const firefoxManifestSrc = readJson('public/firefox/manifest.json');
const changelogVersion = (readFileSync(at('CHANGELOG.md'), 'utf8').match(/^##\s*([0-9]+(?:\.[0-9]+)+)/m) || [])[1];

check(
  'version is the same in package.json, both manifests and CHANGELOG.md',
  new Set([pkg.version, chromeManifestSrc.version, firefoxManifestSrc.version, changelogVersion]).size === 1,
  `package=${pkg.version} chrome=${chromeManifestSrc.version} firefox=${firefoxManifestSrc.version} changelog=${changelogVersion}`,
);

function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (
    v && typeof v === 'object' ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  ));
}

const localesDir = at('src/i18n/locales');
const enKeys = new Set(flatKeys(readJson('src/i18n/locales/en.json')));
for (const file of readdirSync(localesDir).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
  const keys = new Set(flatKeys(readJson(`src/i18n/locales/${file}`)));
  const missing = [...enKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !enKeys.has(k));
  check(
    `locale ${file} has the same keys as en.json`,
    missing.length === 0 && extra.length === 0,
    `missing: ${missing.slice(0, 5).join(', ')} extra: ${extra.slice(0, 5).join(', ')}`,
  );
}

if (!process.argv.includes('--no-build')) {
  console.log('\nBuild');
  const dotEnv = parseDotEnv();
  const env = { ...process.env };
  const placeholders = [];
  const viteConfig = readFileSync(at('vite.config.ts'), 'utf8');
  const required = [...new Set(viteConfig.match(/env\.(VITE_[A-Z_]+)/g) || [])].map((s) => s.slice(4));
  for (const name of required) {
    if (!env[name] && !dotEnv[name]) {
      env[name] = name.includes('URL') ? 'https://smoke.invalid/token' : 'smoke-placeholder';
      placeholders.push(name);
    }
  }
  if (placeholders.length) {
    warnings.push(`built with placeholders for ${placeholders.join(', ')} - this build cannot sign in, do not publish it`);
  }

  for (const [label, cmd] of [['chrome', 'npx vite build'], ['firefox', 'npx vite build --mode firefox']]) {
    try {
      execSync(cmd, { cwd: root, env, stdio: 'pipe' });
      check(`vite build (${label})`, true);
    } catch (e) {
      check(`vite build (${label})`, false, String(e.stderr || e.message).split('\n').slice(-6).join(' '));
    }
  }
}

function checkDist(dir, browser) {
  console.log(`\n${dir}`);
  const manifestPath = at(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    check(`${dir}/manifest.json exists`, false, 'build first');
    return;
  }
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  check('manifest_version is 3', m.manifest_version === 3);
  check('name, version and description are set', Boolean(m.name && m.version && m.description));
  check('version matches package.json', m.version === pkg.version, `${m.version} vs ${pkg.version}`);

  const popup = m.action?.default_popup;
  check(`popup ${popup} exists`, Boolean(popup) && existsSync(at(dir, popup)));

  const bg = browser === 'chrome' ? [m.background?.service_worker] : (m.background?.scripts || []);
  check(
    `background script present (${bg.join(', ')})`,
    bg.length > 0 && bg.every((f) => f && existsSync(at(dir, f))),
  );
  if (browser === 'chrome') {
    check('background is a service_worker (MV3 Chrome)', Boolean(m.background?.service_worker));
  } else {
    check('background uses scripts (Firefox MV3)', Array.isArray(m.background?.scripts));
  }

  const panel = m.side_panel?.default_path || m.sidebar_action?.default_panel;
  if (panel) check(`side panel ${panel} exists`, existsSync(at(dir, panel)));

  const icons = { ...(m.icons || {}), ...(m.action?.default_icon || {}) };
  const missingIcons = Object.values(icons).filter((p) => !existsSync(at(dir, p)));
  check('all manifest icons exist', missingIcons.length === 0, missingIcons.join(', '));

  for (const perm of ['identity', 'storage', 'scripting', 'tabs', 'downloads']) {
    check(`permission "${perm}" declared`, (m.permissions || []).includes(perm));
  }

  check('no chrome/ or firefox/ manifest folders leaked into dist', !existsSync(at(dir, 'chrome')) && !existsSync(at(dir, 'firefox')));

  const html = readFileSync(at(dir, popup), 'utf8');
  check('popup HTML has no inline <script> (CSP script-src self)', !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html));

  if (browser === 'firefox' && !m.browser_specific_settings?.gecko?.id) {
    warnings.push('Firefox manifest has no browser_specific_settings.gecko.id - AMO requires it for MV3 and the OAuth redirect URL depends on it');
  }
}

checkDist('dist-chrome', 'chrome');
checkDist('dist-firefox', 'firefox');

console.log('');
for (const w of warnings) console.log(`  WARN  ${w}`);
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
