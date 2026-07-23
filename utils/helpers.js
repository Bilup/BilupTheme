function formatNumber(num) {
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1000000) return sign + (abs / 1000000).toFixed(1) + 'M';
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + 'K';
  return String(num);
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
  } else if (colors.primary && colors.secondary) {
    gradientColors = [colors.primary, colors.secondary];
  }

  if (gradientColors.length === 0) return '';
  if (gradientColors.length === 1) gradientColors.push(gradientColors[0]);
  return `background: linear-gradient(${direction}deg, ${gradientColors.join(', ')});`;
}

function buildGradientFromAccent(accent) {
  if (!accent || !accent.colors || !Array.isArray(accent.colors)) return '';
  const gradientColors = accent.colors
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(c => c.color);
  const direction = accent.direction || 135;
  if (gradientColors.length === 0) return '';
  if (gradientColors.length === 1) gradientColors.push(gradientColors[0]);
  return `background: linear-gradient(${direction}deg, ${gradientColors.join(', ')});`;
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
  buildGradientFromAccent,
  formatUsername,
  getScratchUserAvatarURL,
  getModIconURL,
  getPlatformName,
  getPreviewURL,
  emptyStateData,
  themeCardData,
  toJson
};
