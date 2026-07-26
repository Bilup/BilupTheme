const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');

const locales = {};
const availableLanguages = ['en', 'zh-CN'];

const langFileMap = { 'en': 'en', 'zh-CN': 'zh' };

function loadLocales() {
  for (const lang of availableLanguages) {
    const fileName = langFileMap[lang] || lang;
    const filePath = path.join(LOCALES_DIR, `${fileName}.json`);
    if (fs.existsSync(filePath)) {
      try {
        locales[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (err) {
        console.error(`Failed to load locale ${lang}:`, err);
      }
    }
  }
}

loadLocales();

function getLocale(lang) {
  return locales[lang] || locales.en;
}

function t(lang, key) {
  const locale = getLocale(lang);
  const keys = key.split('.');
  let result = locale;
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return key;
    }
  }
  return typeof result === 'string' ? result : key;
}

const langAliasMap = { 'zh': 'zh-CN' };

function detectLanguage(req) {
  const langParam = req.query.lang;
  if (langParam) {
    const normalizedLang = langAliasMap[langParam] || langParam;
    if (availableLanguages.includes(normalizedLang)) {
      return normalizedLang;
    }
  }

  const langCookie = req.cookies?.lang;
  if (langCookie) {
    const normalizedLang = langAliasMap[langCookie] || langCookie;
    if (availableLanguages.includes(normalizedLang)) {
      return normalizedLang;
    }
  }

  const acceptLang = req.headers['accept-language'];
  if (acceptLang) {
    const langs = acceptLang.split(',');
    for (const lang of langs) {
      const fullCode = lang.split(';')[0].toLowerCase();
      if (availableLanguages.includes(fullCode)) {
        return fullCode;
      }
      const shortCode = fullCode.split('-')[0];
      const mappedLang = langAliasMap[shortCode];
      if (mappedLang && availableLanguages.includes(mappedLang)) {
        return mappedLang;
      }
    }
  }

  return 'en';
}

module.exports = {
  t,
  getLocale,
  detectLanguage,
  availableLanguages
};