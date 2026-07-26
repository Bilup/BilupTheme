function formatNumber(num) {
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1000000) return sign + (abs / 1000000).toFixed(1) + 'M';
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + 'K';
  return String(num);
}

function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const i18n = {
    'en': {
      'just_now': 'just now',
      'minutes_ago': '{n}m ago',
      'hours_ago': '{n}h ago',
      'days_ago': '{n}d ago'
    },
    'zh-CN': {
      'just_now': '刚刚',
      'minutes_ago': '{n}分钟前',
      'hours_ago': '{n}小时前',
      'days_ago': '{n}天前'
    }
  };

  const locale = i18n[lang] || i18n.en;

  if (diffSec < 60) return locale['just_now'];
  if (diffMin < 60) return locale['minutes_ago'].replace('{n}', diffMin);
  if (diffHour < 24) return locale['hours_ago'].replace('{n}', diffHour);
  if (diffDay < 7) return locale['days_ago'].replace('{n}', diffDay);

  const localeStr = lang === 'zh-CN' ? 'zh-CN' : 'en-US';
  return date.toLocaleDateString(localeStr, { year: 'numeric', month: 'short', day: 'numeric' });
}

function slugify(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildGradientFromColors(colors) {
  if (!colors) return '';
  let gradientColors = [];
  let direction = colors.gradientDirection || 135;

  if (colors.gradient && Array.isArray(colors.gradient)) {
    gradientColors = colors.gradient
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(c => c.color);
  }

  if (gradientColors.length === 0) return '';
  if (gradientColors.length === 1) gradientColors.push(gradientColors[0]);
  return `background: linear-gradient(${direction}deg, ${gradientColors.join(', ')});`;
}

function extractThemePreview(theme) {
  if (!theme) return { colors: null, accent: null };

  if (theme.colors) return { colors: theme.colors, accent: null };
  if (theme.accent) return { colors: null, accent: theme.accent };

  if (theme.theme) {
    if (theme.theme.colors) return { colors: theme.theme.colors, accent: null };
    if (theme.theme.accent) return { colors: null, accent: theme.theme.accent };

    const nested = theme.theme.themes;
    if (Array.isArray(nested) && nested.length > 0) {
      const first = nested[0];
      if (first && first.colors) return { colors: first.colors, accent: null };
      if (first && first.accent) return { colors: null, accent: first.accent };
    }
  }

  return { colors: null, accent: null };
}

function formatUsername(username, authType) {
  if (!username) return 'Unknown';
  if (authType === 'scratch') return `@${username}`;
  return username;
}

function getScratchUserAvatarURL(username) {
  return `https://cdn2.scratch.mit.edu/get_image/user/${username}_60x60.png`;
}

function getModIconURL(mods, platform) {
  if (!mods || !platform) return '';
  const mod = mods[platform.toLowerCase()];
  return mod ? mod.icon : '';
}

function getPlatformName(mods, platform) {
  if (!mods || !platform) return platform || '';
  const mod = mods[platform.toLowerCase()];
  return mod ? mod.name : platform;
}

function emptyStateData(icon, message, cta, ctaUrl, ctaText) {
  return { icon, message, cta, ctaUrl, ctaText };
}

function themeCardData(theme, mods, showAuthor, showActions, showDate, users) {
  return { Theme: theme, Mods: mods, ShowAuthor: showAuthor, ShowActions: showActions, ShowDate: showDate, Users: users };
}

function toJson(obj) {
  return JSON.stringify(obj);
}

function getPreviewURL(mods, platform) {
  if (!mods || !platform) return '';
  const mod = mods[platform.toLowerCase()];
  return mod ? mod.previewUrl : '';
}

module.exports = {
  formatNumber,
  formatDate,
  slugify,
  buildGradientFromColors,
  extractThemePreview,
  formatUsername,
  getScratchUserAvatarURL,
  getModIconURL,
  getPlatformName,
  getPreviewURL,
  emptyStateData,
  themeCardData,
  toJson
};
