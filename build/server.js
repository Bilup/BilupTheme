const express = require('express');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const helpers = require('../utils/helpers');
const storage = require('../utils/storage');
const { authMiddleware } = require('../middleware/auth');
const i18n = require('../utils/i18n');

const ROOT = path.join(__dirname, '..');
const mods = require(path.join(ROOT, 'mods.json')).mods;

// ──────────── Dev Server ────────────
function startServer() {
  const app = express();
  const PORT = process.env.PORT || 19876;

  storage.ensureDirectories();

  app.set('view engine', 'ejs');
  app.set('views', path.join(ROOT, 'views'));

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use('/static', express.static(path.join(ROOT, 'public')));
  app.use('/favicon.ico', express.static(path.join(ROOT, 'favicon.ico')));
  
  // Serve lucide.js locally from node_modules to avoid CDN tracking prevention
  const lucidePath = path.join(ROOT, 'node_modules', 'lucide', 'dist', 'umd', 'lucide.min.js');
  if (fs.existsSync(lucidePath)) {
    app.get('/static/js/lucide.js', (req, res) => {
      res.sendFile(lucidePath);
    });
  }
  
  app.use(authMiddleware);

  app.use((req, res, next) => {
    const lang = i18n.detectLanguage(req);
    res.cookie('lang', lang, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.locals.Lang = lang;
    res.locals.t = (key) => i18n.t(lang, key);
    next();
  });

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

function baseLocals(lang) {
  const t = (key) => i18n.t(lang, key);
  return {
    h: helpers,
    mods,
    formatNumber: helpers.formatNumber,
    formatDate: helpers.formatDate,
    slugify: helpers.slugify,
    buildGradientFromColors: helpers.buildGradientFromColors,
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
    Mods: mods,
    SiteOrigin: process.env.SITE_ORIGIN || 'http://localhost:19876',
    Lang: lang,
    t: t
  };
}

function pageData(lang, overrides) {
  return { ...baseLocals(lang), ...overrides };
}

const pageConfigs = [
  { template: 'pages/home',          output: 'index.html',               baseData: { ActivePage: 'home' } },
  { template: 'pages/index',         output: 'themes/index.html',        baseData: { ActivePage: 'themes', Themes: [], SortBy: 'newest', PlatformFilter: '', Users: {} } },
  { template: 'pages/about',         output: 'about/index.html',         baseData: { ActivePage: 'about' } },
  { template: 'pages/auth',          output: 'auth/index.html',          baseData: { ActivePage: 'auth' } },
  { template: 'pages/upload',        output: 'upload/index.html',        baseData: { ActivePage: 'upload' } },
  { template: 'pages/upload-success', output: 'upload-success/index.html', baseData: { ActivePage: 'upload', ThemeCount: 1 } },
  { template: 'pages/settings',      output: 'settings/index.html',      baseData: { ActivePage: 'settings' } },
  { template: 'pages/my-themes',     output: 'my-themes/index.html',     baseData: { ActivePage: 'my-themes', Themes: [], Users: {} } },
  { template: 'pages/likes',         output: 'likes/index.html',         baseData: { ActivePage: 'likes', Themes: [], Users: {} } },
  { template: 'pages/profile',       output: 'profile/index.html',       baseData: { ActivePage: 'profile', ProfileUser: { username: 'User', createdAt: new Date().toISOString() }, AuthType: 'rotur', Themes: [], IsOwnProfile: false } },
  { template: 'pages/404',           output: '404.html',                 baseData: { ActivePage: '' } },
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

  // Copy lucide UMD from node_modules to avoid CDN tracking prevention issues
  const lucideSource = path.join(ROOT, 'node_modules', 'lucide', 'dist', 'umd', 'lucide.min.js');
  const lucideDest = path.join(OUTPUT_DIR, 'static', 'js', 'lucide.js');
  if (fs.existsSync(lucideSource)) {
    ensureDir(path.dirname(lucideDest));
    fs.copyFileSync(lucideSource, lucideDest);
    console.log('  🖋️  Copied lucide.js to static/js/');
  }

  // Fix absolute /static/ paths in CSS (fonts, images) to be relative to css/ dir
  function fixCSSFile(cssPath) {
    if (!fs.existsSync(cssPath)) return;
    let css = fs.readFileSync(cssPath, 'utf8');
    // CSS is at static/css/, so fonts at ../fonts/
    const hadFonts = css.includes("url('/static/fonts/");
    css = css.replace(/url\('\/static\/fonts\//g, "url('../fonts/");
    css = css.replace(/url\("\/static\/fonts\//g, 'url("../fonts/');
    // Fix any other /static/ URLs in CSS
    css = css.replace(/url\('\/static\//g, "url('../");
    css = css.replace(/url\("\/static\//g, 'url("../');
    fs.writeFileSync(cssPath, css, 'utf8');
    if (hadFonts) console.log('  🖋️  Fixed font paths in CSS');
  }

  // Compute relative prefix for static paths based on output depth
  function staticPrefix(outputPath) {
    const depth = outputPath.split('/').length - 1;
    return depth === 0 ? '' : '../'.repeat(depth).replace(/\/$/, '');
  }

  // Fix absolute /static/ paths to relative ones in HTML
  function fixStaticPaths(html, prefix) {
    const p = prefix ? prefix + '/' : '';
    return html
      .replace(/href="\/static\//g, `href="${p}static/`)
      .replace(/src="\/static\//g, `src="${p}static/`)
      .replace(/src="https:\/\/unpkg\.com\/lucide@[^"]+\/dist\/umd\/lucide\.js"/g, `src="${p}static/js/lucide.js"`);
  }

  // Fix font paths in copied CSS
  fixCSSFile(path.join(OUTPUT_DIR, 'static', 'css', 'styles.css'));

  const languages = ['en', 'zh-CN'];
  let ok = 0, fail = 0;
  
  for (const lang of languages) {
    console.log(`\n🌐 Building ${lang} pages...`);
    for (const page of pageConfigs) {
      const tpl = path.join(VIEWS_DIR, `${page.template}.ejs`);
      const langOutput = lang === 'en' ? page.output : `${lang}/${page.output}`;
      const out = path.join(OUTPUT_DIR, langOutput);
      try {
        ensureDir(path.dirname(out));
        const prefix = staticPrefix(langOutput);
        const data = pageData(lang, { ...page.baseData, StaticRoot: prefix });
        let html = await ejs.renderFile(tpl, data, { views: [VIEWS_DIR] });
        html = fixStaticPaths(html, prefix);
        fs.writeFileSync(out, html, 'utf8');
        console.log(`  ✅  /${langOutput.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`);
        ok++;
      } catch (err) {
        console.error(`  ❌  ${lang}/${page.template} — ${err.message}`);
        fail++;
      }
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
