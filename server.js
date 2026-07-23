const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helpers = require('./utils/helpers');
const storage = require('./utils/storage');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5609;

// Initialize data directories
storage.ensureDirectories();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public')));

// Auth middleware
app.use(authMiddleware);

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Make helpers available to all views
app.use((req, res, next) => {
  res.locals.h = helpers;
  res.locals.mods = require(path.join(__dirname, 'mods.json')).mods;
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

// Routes
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/pages'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ ok: false, error: 'internal server error' });
});

app.listen(PORT, () => {
  console.log(`BilupTheme listening on http://localhost:${PORT}`);
});
