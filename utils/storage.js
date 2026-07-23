const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const THEMES_DIR = path.join(DATA_DIR, 'themes');
const USERS_DIR = path.join(DATA_DIR, 'users');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const RATINGS_DIR = path.join(DATA_DIR, 'ratings');
const DOWNLOADS_DIR = path.join(DATA_DIR, 'downloads');
const REPORTS_DIR = path.join(DATA_DIR, 'reports');
const INDEX_FILE = path.join(THEMES_DIR, 'theme-index.json');
const REPORTS_FILE = path.join(REPORTS_DIR, 'reports.json');

// Ensure all directories exist
function ensureDirectories() {
  [THEMES_DIR, USERS_DIR, SESSIONS_DIR, RATINGS_DIR, DOWNLOADS_DIR, REPORTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, JSON.stringify({ themes: {} }));
  if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, JSON.stringify({ reports: [] }));
}

// Theme Index
function loadThemeIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch { return { themes: {} }; }
}

function saveThemeIndex(index) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// Theme CRUD
function createUserTheme(themeData, userId, authType) {
  const uuid = `theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const themeEntry = {
    uuid,
    name: themeData.name,
    description: themeData.description || '',
    author: userId,
    authType,
    platform: themeData.platform,
    createdAt: new Date().toISOString(),
    size: themeData.size || JSON.stringify(themeData.jsonData).length,
    theme: themeData.jsonData
  };

  fs.writeFileSync(path.join(THEMES_DIR, `${uuid}.json`), JSON.stringify(themeEntry, null, 2));

  const index = loadThemeIndex();
  index.themes[uuid] = {
    uuid,
    name: themeData.name,
    author: userId,
    platform: themeData.platform,
    createdAt: themeEntry.createdAt,
    size: themeEntry.size
  };
  saveThemeIndex(index);

  // Add to user's themes
  const user = getUser(userId, authType);
  if (user.ok) {
    user.user.themes = user.user.themes || [];
    user.user.themes.push(uuid);
    saveUser(userId, authType, user.user);
  }

  return { ok: true, uuid };
}

function getTheme(uuid) {
  const filePath = path.join(THEMES_DIR, `${uuid}.json`);
  if (!fs.existsSync(filePath)) return { ok: false, error: 'theme not found' };
  try {
    const theme = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { ok: true, theme };
  } catch { return { ok: false, error: 'failed to read theme' }; }
}

function loadThemeFile(uuid) {
  const filePath = path.join(THEMES_DIR, `${uuid}.json`);
  if (!fs.existsSync(filePath)) return { ok: false };
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch { return { ok: false }; }
}

function updateTheme(uuid, updates, userId) {
  const result = getTheme(uuid);
  if (!result.ok) return result;
  const theme = result.theme;
  if (theme.author !== userId) return { ok: false, error: 'not authorized' };

  if (updates.name) theme.name = updates.name;
  if (updates.description !== undefined) theme.description = updates.description;
  fs.writeFileSync(path.join(THEMES_DIR, `${uuid}.json`), JSON.stringify(theme, null, 2));

  // Update index
  const index = loadThemeIndex();
  if (index.themes[uuid]) {
    if (updates.name) index.themes[uuid].name = updates.name;
    saveThemeIndex(index);
  }

  return { ok: true };
}

function getThemeAuthor(uuid) {
  const theme = getTheme(uuid);
  return theme.ok ? theme.theme.author : null;
}

function deleteTheme(uuid, userId, isAdmin) {
  const filePath = path.join(THEMES_DIR, `${uuid}.json`);
  if (!fs.existsSync(filePath)) return { ok: false, error: 'theme not found' };

  const theme = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (theme.author !== userId && !isAdmin) return { ok: false, error: 'not authorized' };

  fs.unlinkSync(filePath);

  const index = loadThemeIndex();
  delete index.themes[uuid];
  saveThemeIndex(index);

  // Remove from user
  const user = getUser(theme.author, theme.authType);
  if (user.ok && user.user.themes) {
    user.user.themes = user.user.themes.filter(t => t !== uuid);
    saveUser(theme.author, theme.authType, user.user);
  }

  // Remove ratings
  const ratingsFile = path.join(RATINGS_DIR, `${uuid}.json`);
  if (fs.existsSync(ratingsFile)) fs.unlinkSync(ratingsFile);

  // Remove downloads
  const downloadsFile = path.join(DOWNLOADS_DIR, `${uuid}.json`);
  if (fs.existsSync(downloadsFile)) fs.unlinkSync(downloadsFile);

  return { ok: true };
}

function listThemes(sortBy = 'newest') {
  const index = loadThemeIndex();
  let themes = Object.values(index.themes || {});

  // Enrich with likes/dislikes/downloads
  themes = themes.map(t => {
    const ratings = getRatings(t.uuid);
    const downloads = getDownloadCount(t.uuid);
    return { ...t, likes: ratings.likes, dislikes: ratings.dislikes, downloads };
  });

  if (sortBy === 'likes') {
    themes.sort((a, b) => (b.likes || 0) - (b.dislikes || 0) - ((a.likes || 0) - (a.dislikes || 0)));
  } else if (sortBy === 'name') {
    themes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else {
    themes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  return { ok: true, themes };
}

function getUserThemes(username, authType) {
  const userResult = getUser(username, authType);
  if (!userResult.ok) return { ok: false, error: 'user not found' };
  const user = userResult.user;
  const themeUUIDs = user.themes || [];
  const themes = [];

  const index = loadThemeIndex();
  for (const uuid of themeUUIDs) {
    if (index.themes[uuid]) {
      const themeResult = loadThemeFile(uuid);
      if (themeResult.ok) {
        const ratings = getRatings(uuid);
        const downloads = getDownloadCount(uuid);
        themes.push({
          ...themeResult.data,
          likes: ratings.likes,
          dislikes: ratings.dislikes,
          downloads
        });
      }
    }
  }

  return { ok: true, themes, user };
}

// User management
function getUser(userId, authType) {
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return { ok: false, error: 'user not found' };
  try {
    const user = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { ok: true, user };
  } catch { return { ok: false, error: 'failed to read user' }; }
}

function saveUser(userId, authType, userData) {
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
}

function createOrUpdateUser(userId, authType, userData) {
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  let user = {};
  if (fs.existsSync(filePath)) {
    try { user = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch {}
  } else {
    user.createdAt = new Date().toISOString();
  }
  user = { ...user, ...userData, authType };
  fs.writeFileSync(filePath, JSON.stringify(user, null, 2));
  return { ok: true, user };
}

function deleteUser(userId, authType) {
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// Session management
function createSession(userId, authType, userData) {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const session = {
    userId,
    authType,
    user: userData,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  fs.writeFileSync(path.join(SESSIONS_DIR, `${sessionId}.json`), JSON.stringify(session, null, 2));
  return sessionId;
}

function getSession(sessionId) {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (new Date(session.expiresAt) < new Date()) {
      fs.unlinkSync(filePath);
      return null;
    }
    return session;
  } catch { return null; }
}

function deleteSession(sessionId) {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// Ratings
function getRatings(uuid) {
  const filePath = path.join(RATINGS_DIR, `${uuid}.json`);
  if (!fs.existsSync(filePath)) return { likes: 0, dislikes: 0, userRatings: {} };
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch { return { likes: 0, dislikes: 0, userRatings: {} }; }
}

function saveRatings(uuid, ratings) {
  fs.writeFileSync(path.join(RATINGS_DIR, `${uuid}.json`), JSON.stringify(ratings, null, 2));
}

function rateTheme(uuid, userId, rating) {
  const ratings = getRatings(uuid);
  ratings.userRatings = ratings.userRatings || {};

  if (ratings.userRatings[userId]) {
    const oldRating = ratings.userRatings[userId];
    if (oldRating === 'like') ratings.likes = Math.max(0, (ratings.likes || 0) - 1);
    if (oldRating === 'dislike') ratings.dislikes = Math.max(0, (ratings.dislikes || 0) - 1);
    if (oldRating === rating) {
      delete ratings.userRatings[userId];
      saveRatings(uuid, ratings);
      return true;
    }
  }

  ratings.userRatings[userId] = rating;
  if (rating === 'like') ratings.likes = (ratings.likes || 0) + 1;
  if (rating === 'dislike') ratings.dislikes = (ratings.dislikes || 0) + 1;

  saveRatings(uuid, ratings);
  return true;
}

// Downloads
function getDownloadCount(uuid) {
  const filePath = path.join(DOWNLOADS_DIR, `${uuid}.json`);
  if (!fs.existsSync(filePath)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.count || 0;
  } catch { return 0; }
}

function recordDownload(uuid, userId) {
  const filePath = path.join(DOWNLOADS_DIR, `${uuid}.json`);
  let data = { count: 0, users: [] };
  if (fs.existsSync(filePath)) {
    try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch {}
  }
  if (!data.users.includes(userId)) {
    data.users.push(userId);
    data.count = data.users.length;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

function hasDownloaded(uuid, userId) {
  const filePath = path.join(DOWNLOADS_DIR, `${uuid}.json`);
  if (!fs.existsSync(filePath)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.users && data.users.includes(userId);
  } catch { return false; }
}

// Reports
function getReports() {
  try {
    return JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
  } catch { return { reports: [] }; }
}

function saveReports(data) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(data, null, 2));
}

function createReport(reportData) {
  const reports = getReports();
  const report = {
    id: `report-${Date.now()}`,
    ...reportData,
    createdAt: new Date().toISOString(),
    resolved: false
  };
  reports.reports.push(report);
  saveReports(reports);
  return { ok: true, report };
}

function resolveReport(reportId) {
  const reports = getReports();
  const report = reports.reports.find(r => r.id === reportId);
  if (!report) return { ok: false, error: 'report not found' };
  report.resolved = true;
  report.resolvedAt = new Date().toISOString();
  saveReports(reports);
  return { ok: true };
}

// Theme detection
function detectPlatform(rawJson) {
  if (!rawJson) return { ok: false, error: 'no data' };
  if (rawJson.themes && Array.isArray(rawJson.themes)) {
    return { ok: true, platform: 'mistwarp' };
  }
  if (rawJson.colors || (rawJson.accent && rawJson.accent.colors)) {
    return { ok: true, platform: 'mistwarp' };
  }
  if (rawJson.isGradient !== undefined || rawJson.primaryColor) {
    return { ok: true, platform: 'nitrobolt' };
  }
  return { ok: true, platform: 'bilup' };
}

module.exports = {
  ensureDirectories,
  loadThemeIndex,
  saveThemeIndex,
  createUserTheme,
  getTheme,
  loadThemeFile,
  updateTheme,
  getThemeAuthor,
  deleteTheme,
  listThemes,
  getUserThemes,
  getUser,
  saveUser,
  createOrUpdateUser,
  deleteUser,
  createSession,
  getSession,
  deleteSession,
  getRatings,
  rateTheme,
  getDownloadCount,
  recordDownload,
  hasDownloaded,
  getReports,
  createReport,
  resolveReport,
  detectPlatform
};
