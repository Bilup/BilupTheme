const express = require('express');
const router = express.Router();
const path = require('path');
const storage = require('../utils/storage');
const converter = require('../utils/theme-converter');
const authModule = require('../middleware/auth');
const { requireAuth, requireAdmin } = authModule;

// Load mods
const mods = require(path.join(__dirname, '..', 'mods.json')).mods;

// Health check
router.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

// Get mods
router.get('/mods', (req, res) => {
  res.json({ ok: true, mods });
});

// Get current user
router.get('/user', (req, res) => {
  if (!req.authenticated) {
    return res.status(401).json({ ok: false, error: 'not authenticated' });
  }
  res.json({ ok: true, user: req.user, authType: req.authType, userId: req.userId, isAdmin: req.isAdmin });
});

// Rotur Auth
router.get('/auth', async (req, res) => {
  const v = req.query.v;
  if (!v) return res.status(400).json({ ok: false, error: 'missing validator' });

  try {
    const https = require('https');
    const url = `https://api.rotur.dev/v2/validators/verify?v=${encodeURIComponent(v)}&key=BilupTheme`;

    const rawData = await new Promise((resolve, reject) => {
      https.get(url, (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => resolve(data));
      }).on('error', reject);
    });

    // Validate JSON before parsing
    let response;
    try {
      response = JSON.parse(rawData);
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Rotur auth server returned invalid response',
        detail: rawData
      });
    }

    if (!response.valid) {
      return res.status(401).json({ ok: false, error: response.error || 'auth failed' });
    }

    const userId = response.id || response.username;
    const authType = 'rotur';
    const userData = { username: userId, authType: 'rotur', avatar: '' };

    storage.ensureDirectories();
    storage.createOrUpdateUser(userId, authType, userData);
    const sessionId = storage.createSession(userId, authType, userData);

    res.cookie('auth_token', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'auth error: ' + err.message });
  }
});

// Logout
router.get('/logout', (req, res) => {
  const token = req.cookies?.auth_token;
  if (token) storage.deleteSession(token);
  authModule.clearAuthCookie(res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.auth_token;
  if (token) storage.deleteSession(token);
  authModule.clearAuthCookie(res);
  res.json({ ok: true });
});

// Get themes list
router.get('/themes', (req, res) => {
  const sortBy = req.query.sort || 'newest';
  const platformFilter = (req.query.platform || '').toLowerCase();
  const result = storage.listThemes(sortBy);

  if (!result.ok) return res.status(500).json({ ok: false, error: 'failed to load themes' });

  let themes = result.themes;
  if (platformFilter) {
    themes = themes.filter(t => (t.platform || '').toLowerCase() === platformFilter);
  }

  res.json({ ok: true, themes });
});

// Get single theme
router.get('/theme', (req, res) => {
  const uuid = req.query.uuid;
  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });

  const result = storage.getTheme(uuid);
  if (!result.ok) return res.status(404).json({ ok: false, error: 'theme not found' });

  const theme = result.theme;
  const ratings = storage.getRatings(uuid);
  theme.likes = ratings.likes;
  theme.dislikes = ratings.dislikes;
  theme.downloads = storage.getDownloadCount(uuid);

  res.json({ ok: true, theme });
});

// Detect platform
router.post('/theme/detect-platform', (req, res) => {
  const themeJson = req.body;
  if (!themeJson || Object.keys(themeJson).length === 0) {
    return res.status(400).json({ ok: false, error: 'theme data is required' });
  }
  const result = storage.detectPlatform(themeJson);
  if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
  res.json({ ok: true, platform: result.platform });
});

// Export theme to platform
router.get('/theme/export', async (req, res) => {
  const uuid = req.query.uuid;
  const platform = (req.query.platform || '').toLowerCase();

  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });
  if (!platform) return res.status(400).json({ ok: false, error: 'missing target platform' });

  const themeResult = storage.loadThemeFile(uuid);
  if (!themeResult.ok) return res.status(404).json({ ok: false, error: 'theme not found' });

  const themeData = themeResult.data;
  const themeEntry = themeData.theme;
  const targetPlatform = platform || (themeData.platform || '').toLowerCase();

  if (!targetPlatform) return res.status(400).json({ ok: false, error: 'could not determine platform' });
  if (!converter.isSupportedMod(targetPlatform)) {
    return res.status(400).json({ ok: false, error: `unsupported platform: ${targetPlatform}` });
  }

  const metadata = converter.buildExportMetadata(themeData, themeEntry);
  const interResult = converter.convertToIntermediate(themeEntry);
  if (!interResult.ok) return res.status(500).json({ ok: false, error: interResult.error });

  const exportResult = converter.exportToPlatform(interResult.intermediate, targetPlatform, metadata);
  if (!exportResult.ok) return res.status(500).json({ ok: false, error: exportResult.error });

  // Track download
  if (req.authenticated) {
    if (!storage.hasDownloaded(uuid, req.userId)) {
      storage.recordDownload(uuid, req.userId);
    }
  }

  const filename = `${uuid}-${platform}.json`;
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.json(exportResult.theme);
});

// Download theme
router.get('/theme/download', (req, res) => {
  const uuid = req.query.uuid;
  const platform = (req.query.platform || '').toLowerCase();

  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });

  const themeResult = storage.loadThemeFile(uuid);
  if (!themeResult.ok) return res.status(404).json({ ok: false, error: 'theme not found' });

  const themeData = themeResult.data;
  const themeEntry = themeData.theme;
  const targetPlatform = platform || (themeData.platform || '').toLowerCase();

  if (!targetPlatform) return res.status(400).json({ ok: false, error: 'could not determine platform' });
  if (!converter.isSupportedMod(targetPlatform)) {
    return res.status(400).json({ ok: false, error: `unsupported platform: ${targetPlatform}` });
  }

  const metadata = converter.buildExportMetadata(themeData, themeEntry);
  const interResult = converter.convertToIntermediate(themeEntry);
  if (!interResult.ok) return res.status(500).json({ ok: false, error: interResult.error });

  const exportResult = converter.exportToPlatform(interResult.intermediate, targetPlatform, metadata);
  if (!exportResult.ok) return res.status(500).json({ ok: false, error: exportResult.error });

  if (req.authenticated) {
    if (!storage.hasDownloaded(uuid, req.userId)) {
      storage.recordDownload(uuid, req.userId);
    }
  }

  const filename = `${uuid}.json`;
  if (platform) filename = `${uuid}-${platform}.json`;
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.json(exportResult.theme);
});

// Get ratings
router.get('/ratings', (req, res) => {
  const uuid = req.query.uuid;
  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });
  const ratings = storage.getRatings(uuid);
  res.json({ ok: true, likes: ratings.likes, dislikes: ratings.dislikes, userRatings: ratings.userRatings });
});

// Rate theme
router.post('/rate', requireAuth, (req, res) => {
  const uuid = req.body.uuid;
  const rating = req.body.rating;

  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });
  if (rating !== 'like' && rating !== 'dislike') return res.status(400).json({ ok: false, error: 'invalid rating' });

  const themeResult = storage.getTheme(uuid);
  if (!themeResult.ok) return res.status(404).json({ ok: false, error: 'theme not found' });

  storage.rateTheme(uuid, req.userId, rating);
  const ratings = storage.getRatings(uuid);
  res.json({ ok: true, likes: ratings.likes, dislikes: ratings.dislikes });
});

// Create theme
router.post('/theme', requireAuth, (req, res) => {
  const uploadData = req.body;
  if (!uploadData.themes || !Array.isArray(uploadData.themes) || uploadData.themes.length === 0) {
    return res.status(400).json({ ok: false, error: 'no themes to upload' });
  }

  const themeItems = uploadData.themes;
  const maxSize = 10240;
  const userQuota = 102400;

  // Validate
  for (const item of themeItems) {
    const name = (item.name || '').trim();
    const platform = (item.platform || '');

    if (!name) return res.status(400).json({ ok: false, error: 'theme name is required for all themes' });
    if (name.length > 100) return res.status(400).json({ ok: false, error: 'theme names must be 100 characters or fewer' });
    if ((item.description || '').length > 500) return res.status(400).json({ ok: false, error: 'theme descriptions must be 500 characters or fewer' });
    if (!platform) return res.status(400).json({ ok: false, error: 'theme platform is required for all themes' });
    if (!converter.isSupportedMod(platform)) return res.status(400).json({ ok: false, error: `unsupported mod: ${platform}` });
  }

  // Check quota
  let totalSize = 0;
  const userThemesResult = storage.getUserThemes(req.userId, req.authType);
  if (userThemesResult.ok) {
    const index = storage.loadThemeIndex();
    for (const theme of userThemesResult.themes) {
      if (index.themes[theme.uuid]?.size) {
        totalSize += index.themes[theme.uuid].size;
      }
    }
  }

  const uploadedSize = themeItems.reduce((sum, item) => {
    return sum + JSON.stringify(item.themeJson).length;
  }, 0);

  if (totalSize + uploadedSize > userQuota) {
    return res.status(400).json({ ok: false, error: 'user storage quota exceeded (max 100KB)' });
  }

  const createdUUIDs = [];
  const errors = [];

  for (const item of themeItems) {
    const themeName = item.name.trim();
    const themeDescription = (item.description || '');
    const platform = item.platform.toLowerCase();
    const jsonStr = JSON.stringify(item.themeJson);
    const themeSize = jsonStr.length;

    if (themeSize > maxSize) {
      errors.push(`theme '${themeName}' exceeds 10KB limit`);
    } else {
      const themeData = {
        name: themeName,
        description: themeDescription,
        jsonData: item.themeJson,
        size: themeSize,
        platform: platform
      };
      const result = storage.createUserTheme(themeData, req.userId, req.authType);
      if (result.ok) {
        createdUUIDs.push(result.uuid);
      } else {
        errors.push(`failed to create '${themeName}': ${result.error}`);
      }
    }
  }

  if (createdUUIDs.length === 0) {
    return res.status(400).json({ ok: false, error: errors[0] || 'failed to create themes' });
  }

  res.json({ ok: true, uuids: createdUUIDs, errors });
});

// Update theme name/description
router.put('/theme/name', requireAuth, (req, res) => {
  const { uuid, name, description } = req.body;

  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });
  if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'theme name is required' });
  if (name.length > 100 || (description || '').length > 500) {
    return res.status(400).json({ ok: false, error: 'name or description is too long' });
  }

  const themeResult = storage.getTheme(uuid);
  if (!themeResult.ok) return res.status(404).json({ ok: false, error: 'theme not found' });
  if (storage.getThemeAuthor(uuid) !== req.userId) {
    return res.status(403).json({ ok: false, error: 'not authorized' });
  }

  const result = storage.updateTheme(uuid, { name: name.trim(), description: description || '' }, req.userId);
  if (!result.ok) return res.status(500).json({ ok: false, error: result.error });

  res.json({ ok: true });
});

// Delete theme
router.delete('/theme', requireAuth, (req, res) => {
  const uuid = req.query.uuid;
  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });

  const result = storage.deleteTheme(uuid, req.userId, req.isAdmin);
  if (!result.ok) {
    if (result.error === 'not authorized') return res.status(403).json({ ok: false, error: 'not authorized' });
    if (result.error === 'theme not found') return res.status(404).json({ ok: false, error: 'theme not found' });
    return res.status(500).json({ ok: false, error: result.error });
  }

  res.json({ ok: true });
});

// Get download count
router.get('/theme/downloads', (req, res) => {
  const uuid = req.query.uuid;
  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });
  const count = storage.getDownloadCount(uuid);
  res.json({ ok: true, count });
});

// Check if user downloaded
router.get('/theme/check-downloaded', requireAuth, (req, res) => {
  const uuid = req.query.uuid;
  if (!uuid) return res.status(400).json({ ok: false, error: 'missing uuid' });
  const downloaded = storage.hasDownloaded(uuid, req.userId);
  res.json({ ok: true, downloaded });
});

// Get user themes
router.get('/user/themes', (req, res) => {
  const username = req.query.username;
  const authType = req.query.authType || 'rotur';
  if (!username) return res.status(400).json({ ok: false, error: 'missing username' });

  const result = storage.getUserThemes(username, authType);
  if (!result.ok) return res.status(404).json({ ok: false, error: 'user not found' });

  res.json({ ok: true, themes: result.themes, user: result.user });
});

// Get liked themes
router.get('/user/likes', requireAuth, (req, res) => {
  const result = storage.getUserLikedThemes ? {} : { themes: [] };
  // Simplified: iterate all themes and check user ratings
  const index = storage.loadThemeIndex();
  const allThemes = Object.values(index.themes || {});
  const likedThemes = [];

  for (const t of allThemes) {
    const ratings = storage.getRatings(t.uuid);
    if (ratings.userRatings && ratings.userRatings[req.userId] === 'like') {
      const themeResult = storage.loadThemeFile(t.uuid);
      if (themeResult.ok) {
        likedThemes.push(themeResult.data);
      }
    }
  }

  res.json({ ok: true, themes: likedThemes });
});

// Settings: Download all themes
router.get('/settings/download', requireAuth, (req, res) => {
  const userResult = storage.getUser(req.userId, req.authType);
  if (!userResult.ok) return res.status(404).json({ ok: false, error: 'user not found' });

  const user = userResult.user;
  const index = storage.loadThemeIndex();
  const themeUUIDs = user.themes || [];
  const themes = [];

  for (const uuid of themeUUIDs) {
    if (index.themes[uuid]) {
      const themeResult = storage.loadThemeFile(uuid);
      if (themeResult.ok) themes.push(themeResult.data);
    }
  }

  res.json({ ok: true, themes, username: user.username });
});

// Settings: Delete all user data
router.delete('/settings/user-data', requireAuth, (req, res) => {
  const userResult = storage.getUser(req.userId, req.authType);
  if (!userResult.ok) return res.status(404).json({ ok: false, error: 'user not found' });

  const themeUUIDs = userResult.user.themes || [];
  for (const uuid of themeUUIDs) {
    storage.deleteTheme(uuid, req.userId, false);
  }

  storage.deleteUser(req.userId, req.authType);

  const token = req.cookies?.auth_token;
  if (token) storage.deleteSession(token);
  authModule.clearAuthCookie(res);

  res.json({ ok: true, message: 'all user data deleted' });
});

// Reports
router.post('/report', requireAuth, (req, res) => {
  const result = storage.createReport({
    themeUuid: req.body.themeUuid,
    reason: req.body.reason,
    reporter: req.userId
  });
  res.json(result);
});

// Admin: Get reports
router.get('/admin/reports', requireAdmin, (req, res) => {
  const reports = storage.getReports();
  res.json({ ok: true, reports: reports.reports });
});

// Admin: Resolve report
router.post('/admin/report/resolve', requireAdmin, (req, res) => {
  const result = storage.resolveReport(req.body.reportId);
  res.json(result);
});

module.exports = router;
