const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const FONTS_DIR = path.join(PUBLIC_DIR, 'fonts');
const CSS_FILE = path.join(PUBLIC_DIR, 'css', 'styles.css');

const FONT_FAMILY = 'Poppins';
const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800];
const CSS_URL = `https://fonts.googleapis.com/css2?family=${FONT_FAMILY}:wght@${FONT_WEIGHTS.join(';')}&display=swap`;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetch(res.headers.location));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function downloadFonts() {
  ensureDir(FONTS_DIR);

  console.log('⬇️  Fetching Google Fonts CSS...');
  const cssBuffer = await fetch(CSS_URL);
  const cssText = cssBuffer.toString('utf8');

  // Parse @font-face rules and download files
  const urlPattern = /url\((https:\/\/[^)]+)\)/g;
  const localCssParts = [];
  let match;
  let fileIndex = 0;

  // Split CSS by @font-face blocks
  const blocks = cssText.split('@font-face').filter(b => b.trim());
  console.log(`📄 Found ${blocks.length} font-face blocks`);

  for (const block of blocks) {
    const fullBlock = '@font-face' + block;
    const urls = [];
    let m;
    urlPattern.lastIndex = 0;
    while ((m = urlPattern.exec(fullBlock)) !== null) {
      urls.push(m[1].replace(/["']/g, ''));
    }

    if (urls.length === 0) {
      localCssParts.push(fullBlock);
      continue;
    }

    // Download first URL (woff2)
    const fontUrl = urls[0];
    const ext = path.extname(new URL(fontUrl).pathname) || '.woff2';
    const fileName = `${FONT_FAMILY.toLowerCase()}-${fileIndex}${ext}`;
    const filePath = path.join(FONTS_DIR, fileName);

    try {
      console.log(`  ⏳ Downloading ${fontUrl.split('/').pop()}...`);
      const fontData = await fetch(fontUrl);
      fs.writeFileSync(filePath, fontData);
      console.log(`  ✅ Saved fonts/${fileName} (${(fontData.length / 1024).toFixed(1)} KB)`);

      // Replace URL with local path
      const localBlock = fullBlock.replace(urlPattern, `url('/static/fonts/${fileName}')`);
      localCssParts.push(localBlock);
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      localCssParts.push(fullBlock);
    }
    fileIndex++;
  }

  // Prepend to CSS file
  const localFontCss = localCssParts.join('\n\n');
  const existingCss = fs.readFileSync(CSS_FILE, 'utf8');

  // Remove any existing @import for Google Fonts
  const cleanedCss = existingCss.replace(/@import\s+url\([^)]*googleapis[^)]*\)\s*;\s*\n?/gi, '');

  fs.writeFileSync(CSS_FILE, localFontCss + '\n\n' + cleanedCss, 'utf8');
  console.log(`\n✅ Font CSS prepended to styles.css`);
  console.log(`📂 Font files saved to public/fonts/`);
}

downloadFonts().catch(err => {
  console.error('Font download failed:', err.message);
  process.exit(1);
});
