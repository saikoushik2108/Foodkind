import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';

/** Require a valid JWT cookie or Bearer header. Attaches req.user and req.organization. */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = req.cookies?.token || bearerToken;

    if (!token) return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, error: { message: 'Session invalid' } });
    }

    req.user = user;

    if (user.organization) {
      req.organization = await Organization.findById(user.organization);
    } else {
      req.organization = null;
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { message: 'Token invalid or expired' } });
  }
}

/** Optional auth — attaches user if token present, but does not block. */
export async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return next();

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.sub);
    if (user && user.status === 'ACTIVE') {
      req.user = user;
      if (user.organization) {
        req.organization = await Organization.findById(user.organization);
      }
    }
  } catch { /* ignore */ }
  next();
}

/** Require specific roles. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { message: 'Insufficient permissions' } });
    }
    next();
  };
}

/** Require specific organization types. */
export function requireOrgType(...types) {
  return (req, res, next) => {
    if (!req.organization) {
      return res.status(403).json({ success: false, error: { message: 'No organization associated' } });
    }
    if (!types.includes(req.organization.type)) {
      return res.status(403).json({ success: false, error: { message: 'Organization type not permitted for this action' } });
    }
    next();
  };
}

/** Require the organization to be verified (APPROVED). */
export function requireVerified(req, res, next) {
  if (!req.organization) {
    return res.status(403).json({ success: false, error: { message: 'No organization associated' } });
  }
  if (req.organization.verificationStatus !== 'APPROVED') {
    return res.status(403).json({ success: false, error: { message: 'Organization is not verified yet' } });
  }
  next();
}

/** Generate a JWT token and set it as an httpOnly cookie. */
export function signTokenCookie(res, user) {
  const token = jwt.sign({ sub: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const sameSite = process.env.COOKIE_SAME_SITE || (env.isProd ? 'none' : 'lax');
  const secure = env.isProd || sameSite === 'none';

  res.cookie('token', token, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  return token;
}
