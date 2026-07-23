const express = require('express');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const helpers = require('../utils/helpers');
const storage = require('../utils/storage');
const { authMiddleware } = require('../middleware/auth');

const ROOT = path.join(__dirname, '..');
const mods = require(path.join(ROOT, 'mods.json')).mods;

// ──────────── Dev Server ────────────
function startServer() {
  const app = express();
  const PORT = process.env.PORT || 5609;

  storage.ensureDirectories();

  app.set('view engine', 'ejs');
  app.set('views', path.join(ROOT, 'views'));

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use('/static', express.static(path.join(ROOT, 'public')));
  app.use(authMiddleware);

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use((req, res, next) => {
    res.locals.h = helpers;
    res.locals.mods = mods;
    res.locals.formatNumber = helpers.formatNumber;
    res.locals.formatDate = helpers.formatDate;
    res.locals.slugify = helpers.slugify;
    res.locals.buildGradientFromColors = helpers.buildGradientFromColors;
    res.locals.buildGradientFromAccent = helpers.buildGradientFromAccent;
    res.locals.formatUsername = helpers.formatUsername;
    res.locals.getScratchUserAvatarURL = helpers.getScratchUserAvatarURL;
    res.locals.getModIconURL = helpers.getModIconURL;
    res.locals.getPreviewURL = helpers.getPreviewURL;
    res.locals.toJson = helpers.toJson;
    res.locals.emptyStateData = helpers.emptyStateData;
    res.locals.themeCardData = helpers.themeCardData;
    next();
  });

  app.use('/api', require('../routes/api'));
  app.use('/', require('../routes/pages'));

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ ok: false, error: 'internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`BilupTheme listening on http://localhost:${PORT}`);
  });
}

// ──────────── Static Build ────────────
const OUTPUT_DIR = path.join(ROOT, 'build-pages');
const VIEWS_DIR = path.join(ROOT, 'views');
const PUBLIC_DIR = path.join(ROOT, 'public');

function baseLocals() {
  return {
    h: helpers,
    mods,
    formatNumber: helpers.formatNumber,
    formatDate: helpers.formatDate,
    slugify: helpers.slugify,
    buildGradientFromColors: helpers.buildGradientFromColors,
    buildGradientFromAccent: helpers.buildGradientFromAccent,
    formatUsername: helpers.formatUsername,
    getScratchUserAvatarURL: helpers.getScratchUserAvatarURL,
    getModIconURL: helpers.getModIconURL,
    getPreviewURL: helpers.getPreviewURL,
    toJson: helpers.toJson,
    emptyStateData: helpers.emptyStateData,
    themeCardData: helpers.themeCardData,
    Authenticated: false,
    User: null, UserId: null, AuthType: null, IsAdmin: false,
    ActivePage: '',
    Mods: mods
  };
}

function pageData(overrides) {
  return { ...baseLocals(), ...overrides };
}

const pages = [
  { template: 'pages/home',          output: 'index.html',               data: pageData({ ActivePage: 'home' }) },
  { template: 'pages/index',         output: 'themes/index.html',        data: pageData({ ActivePage: 'themes', Themes: [], SortBy: 'newest', PlatformFilter: '', Users: {} }) },
  { template: 'pages/about',         output: 'about/index.html',         data: pageData({ ActivePage: 'about' }) },
  { template: 'pages/auth',          output: 'auth/index.html',          data: pageData({ ActivePage: 'auth' }) },
  { template: 'pages/upload',        output: 'upload/index.html',        data: pageData({ ActivePage: 'upload' }) },
  { template: 'pages/upload-success', output: 'upload-success/index.html', data: pageData({ ActivePage: 'upload', ThemeCount: 1 }) },
  { template: 'pages/settings',      output: 'settings/index.html',      data: pageData({ ActivePage: 'settings' }) },
  { template: 'pages/my-themes',     output: 'my-themes/index.html',     data: pageData({ ActivePage: 'my-themes', Themes: [], Users: {} }) },
  { template: 'pages/likes',         output: 'likes/index.html',         data: pageData({ ActivePage: 'likes', Themes: [], Users: {} }) },
  { template: 'pages/profile',       output: 'profile/index.html',       data: pageData({ ActivePage: 'profile', ProfileUser: { username: 'User', createdAt: new Date().toISOString() }, AuthType: 'rotur', Themes: [], IsOwnProfile: false }) },
  { template: 'pages/404',           output: '404.html',                 data: pageData({ ActivePage: '' }) },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyAssets(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyAssets(s, d) : fs.copyFileSync(s, d);
  }
}

async function buildPages() {
  console.log('🔨 Building BilupTheme static pages...\n');

  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true });
  ensureDir(OUTPUT_DIR);

  console.log('📁 Copying static assets...');
  copyAssets(PUBLIC_DIR, path.join(OUTPUT_DIR, 'static'));

  // Copy fonts from node_modules if not in public
  const fontSourceDir = path.join(ROOT, 'node_modules', '@fontsource', 'poppins', 'files');
  const fontsDest = path.join(OUTPUT_DIR, 'static', 'fonts');
  if (fs.existsSync(fontSourceDir)) {
    ensureDir(fontsDest);
    for (const f of fs.readdirSync(fontSourceDir)) {
      if (f.startsWith('poppins-latin-')) {
        fs.copyFileSync(path.join(fontSourceDir, f), path.join(fontsDest, f));
      }
    }
  }

  let ok = 0, fail = 0;
  for (const page of pages) {
    const tpl = path.join(VIEWS_DIR, `${page.template}.ejs`);
    const out = path.join(OUTPUT_DIR, page.output);
    try {
      ensureDir(path.dirname(out));
      const html = await ejs.renderFile(tpl, page.data, { views: [VIEWS_DIR] });
      fs.writeFileSync(out, html, 'utf8');
      console.log(`  ✅  /${page.output.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`);
      ok++;
    } catch (err) {
      console.error(`  ❌  ${page.template} — ${err.message}`);
      fail++;
    }
  }

  console.log(`\n📊 ${ok} pages built, ${fail} failed`);
  console.log(`📂 Output: ${OUTPUT_DIR}\n`);
}

// ──────────── Entry ────────────
const mode = process.argv[2];
if (mode === 'build' || mode === 'b') {
  buildPages();
} else {
  startServer();
}
