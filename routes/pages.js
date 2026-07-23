const express = require('express');
const router = express.Router();
const path = require('path');
const storage = require('../utils/storage');
const helpers = require('../utils/helpers');
const authModule = require('../middleware/auth');

const mods = require(path.join(__dirname, '..', 'mods.json')).mods;

function baseData(req) {
  return {
    Authenticated: req.authenticated || false,
    User: req.user || null,
    UserId: req.userId || null,
    AuthType: req.authType || null,
    IsAdmin: req.isAdmin || false,
    Mods: mods,
    ActivePage: ''
  };
}

// Home
router.get('/', (req, res) => {
  const data = { ...baseData(req), ActivePage: 'home' };
  res.render('pages/home', data);
});

// Browse themes
router.get('/themes', (req, res) => {
  const sortBy = req.query.sort || 'newest';
  const platformFilter = req.query.platform || '';
  const result = storage.listThemes(sortBy);

  let themes = result.ok ? result.themes : [];
  if (platformFilter) {
    themes = themes.filter(t => (t.platform || '').toLowerCase() === platformFilter.toLowerCase());
  }

  // Get all users for author display
  const users = {};
  // We'll load user data on-demand via the template

  const data = {
    ...baseData(req),
    ActivePage: 'themes',
    Themes: themes,
    SortBy: sortBy,
    PlatformFilter: platformFilter,
    Users: users
  };
  res.render('pages/index', data);
});

// Theme detail by UUID
router.get('/theme', (req, res) => {
  const uuid = req.query.uuid;
  if (!uuid) return res.redirect('/themes');

  const result = storage.getTheme(uuid);
  if (!result.ok) return res.redirect('/404');

  const theme = result.theme;
  const ratings = storage.getRatings(uuid);
  const downloads = storage.getDownloadCount(uuid);
  const platform = theme.platform || '';
  const modData = mods[platform.toLowerCase()];

  // Check user rating
  let userRating = null;
  if (req.authenticated && ratings.userRatings) {
    userRating = ratings.userRatings[req.userId] || null;
  }

  // Author info
  let authorUser = null;
  let authorAuthType = null;
  if (theme.author) {
    const userResult = storage.getUser(theme.author, theme.authType || 'rotur');
    if (userResult.ok) {
      authorUser = userResult.user;
      authorAuthType = theme.authType;
    }
  }

  const isOwner = req.authenticated && req.userId === theme.author;

  // Author's other themes
  let authorThemeCount = 0;
  if (authorUser) {
    authorThemeCount = (authorUser.themes || []).length;
  }

  const data = {
    ...baseData(req),
    ActivePage: 'theme-detail',
    Theme: theme,
    ThemeUUID: uuid,
    Platform: platform,
    ModData: modData || null,
    Ratings: ratings,
    Downloads: downloads,
    UserRating: userRating,
    IsOwner: isOwner,
    AuthorUser: authorUser,
    AuthorAuthType: authorAuthType,
    AuthorThemeCount: authorThemeCount,
    AuthorJoinDate: authorUser ? helpers.formatDate(authorUser.createdAt) : null
  };
  res.render('pages/theme-detail', data);
});

// Theme detail by slug
router.get('/themes/:username/:themename', (req, res) => {
  const { username, themename } = req.params;
  const slug = helpers.slugify(themename);

  // Find theme by author and slug
  const index = storage.loadThemeIndex();
  const uuid = Object.keys(index.themes || {}).find(key => {
    const t = index.themes[key];
    return t.author === username && helpers.slugify(t.name) === slug;
  });

  if (!uuid) return res.redirect('/404');

  // Redirect to theme detail
  res.redirect(`/theme?uuid=${uuid}`);
});

// Auth page
router.get('/auth', (req, res) => {
  if (req.authenticated) return res.redirect('/');
  const data = { ...baseData(req), ActivePage: 'auth' };
  res.render('pages/auth', data);
});

// About
router.get('/about', (req, res) => {
  const data = { ...baseData(req), ActivePage: 'about' };
  res.render('pages/about', data);
});

// Logout
router.get('/logout', (req, res) => {
  const token = req.cookies?.auth_token;
  if (token) storage.deleteSession(token);
  authModule.clearAuthCookie(res);
  res.redirect('/');
});

// Upload
router.get('/upload', authModule.requireAuthPage, (req, res) => {
  const data = { ...baseData(req), ActivePage: 'upload' };
  res.render('pages/upload', data);
});

// Upload success
router.get('/upload-success', authModule.requireAuthPage, (req, res) => {
  const count = parseInt(req.query.count || '1');
  const data = { ...baseData(req), ActivePage: 'upload', ThemeCount: count };
  res.render('pages/upload-success', data);
});

// Profile
router.get('/profile', (req, res) => {
  const userId = req.query.userId || req.userId;
  const authType = req.query.authType || req.authType || 'rotur';

  if (!userId) return res.redirect('/auth');

  const userResult = storage.getUser(userId, authType);
  if (!userResult.ok) return res.redirect('/404');

  const profileUser = userResult.user;
  const themesResult = storage.getUserThemes(userId, authType);
  const themes = themesResult.ok ? themesResult.themes : [];

  const data = {
    ...baseData(req),
    ActivePage: 'profile',
    ProfileUser: profileUser,
    AuthType: authType,
    Themes: themes,
    IsOwnProfile: req.authenticated && req.userId === userId
  };
  res.render('pages/profile', data);
});

// My themes
router.get('/my-themes', authModule.requireAuthPage, (req, res) => {
  const result = storage.getUserThemes(req.userId, req.authType);
  const themes = result.ok ? result.themes : [];

  const data = {
    ...baseData(req),
    ActivePage: 'my-themes',
    Themes: themes,
    Users: {}
  };
  res.render('pages/my-themes', data);
});

// Liked themes
router.get('/likes', authModule.requireAuthPage, (req, res) => {
  // Get themes that user liked
  const index = storage.loadThemeIndex();
  const allThemes = Object.values(index.themes || {});
  const likedThemes = [];

  for (const t of allThemes) {
    const ratings = storage.getRatings(t.uuid);
    if (ratings.userRatings && ratings.userRatings[req.userId] === 'like') {
      const themeResult = storage.loadThemeFile(t.uuid);
      if (themeResult.ok) {
        const downloads = storage.getDownloadCount(t.uuid);
        likedThemes.push({ ...themeResult.data, likes: ratings.likes, dislikes: ratings.dislikes, downloads });
      }
    }
  }

  const data = {
    ...baseData(req),
    ActivePage: 'likes',
    Themes: likedThemes,
    Users: {}
  };
  res.render('pages/likes', data);
});

// Settings
router.get('/settings', authModule.requireAuthPage, (req, res) => {
  const data = { ...baseData(req), ActivePage: 'settings' };
  res.render('pages/settings', data);
});

// 404
router.get('/404', (req, res) => {
  const data = { ...baseData(req) };
  res.status(404).render('pages/404', data);
});

// Catch-all 404
router.use((req, res) => {
  const data = { ...baseData(req) };
  res.status(404).render('pages/404', data);
});

module.exports = router;
