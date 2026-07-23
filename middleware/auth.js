const storage = require('../utils/storage');

const ADMIN_USERS = ['mist'];

function authMiddleware(req, res, next) {
  const token = req.cookies?.auth_token;
  if (token) {
    const session = storage.getSession(token);
    if (session) {
      req.authenticated = true;
      req.user = session.user;
      req.userId = session.userId;
      req.authType = session.authType;
      req.isAdmin = ADMIN_USERS.includes(session.userId);
      req.session = session;
    } else {
      res.clearCookie('auth_token');
    }
  }

  if (!req.authenticated) {
    req.authenticated = false;
    req.user = null;
    req.userId = null;
    req.authType = null;
    req.isAdmin = false;
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.authenticated) {
    return res.status(401).json({ ok: false, error: 'must be logged in' });
  }
  next();
}

function requireAuthPage(req, res, next) {
  if (!req.authenticated) {
    return res.redirect('/auth');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.authenticated || !req.isAdmin) {
    return res.status(403).json({ ok: false, error: 'not authorized' });
  }
  next();
}

function clearAuthCookie(res) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}

module.exports = { authMiddleware, requireAuth, requireAuthPage, requireAdmin, clearAuthCookie };
