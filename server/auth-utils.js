const crypto = require('crypto');

// Session secret for signing stateless authentication tokens
const SESSION_SECRET = (process.env.SESSION_SECRET || process.env.JWT_SECRET || 'aew-secure-portal-auth-token-secret-2025-x7z9').trim();

// ─── 1. CORS VALIDATION ─────────────────────────────────────────────────────
function isOriginAllowed(origin) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname;
    // Localhost / loopback development
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    // Vercel preview and production deployments
    if (hostname.endsWith('.vercel.app')) return true;
    // Configured portal URL
    if (process.env.PORTAL_URL) {
      try {
        const portalUrl = new URL(process.env.PORTAL_URL);
        if (hostname === portalUrl.hostname) return true;
      } catch {
        // ignore
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ─── 2. IN-MEMORY RATE LIMITER ──────────────────────────────────────────────
const rateLimitStore = new Map();

function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetMs: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetMs: record.resetTime - now };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]).trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
}

// ─── 3. PASSWORD HASHING (SCRYPT + SALT) ────────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return { valid: false, needsRehash: false };

  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return { valid: false, needsRehash: false };
    const salt = parts[1];
    const originalHash = parts[2];
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');

    const bufA = Buffer.from(testHash, 'hex');
    const bufB = Buffer.from(originalHash, 'hex');
    if (bufA.length !== bufB.length) return { valid: false, needsRehash: false };
    return { valid: crypto.timingSafeEqual(bufA, bufB), needsRehash: false };
  }

  // Legacy plaintext verification
  const bufA = Buffer.from(password);
  const bufB = Buffer.from(stored);
  if (bufA.length !== bufB.length) {
    return { valid: password === stored, needsRehash: true };
  }
  const match = crypto.timingSafeEqual(bufA, bufB);
  return { valid: match, needsRehash: true };
}

// ─── 4. STATELESS SESSION TOKENS (HMAC-SHA256) ──────────────────────────────
function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

function createSessionToken(user) {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    teacherId: user.teacherId,
    username: user.username,
    role: user.role,
    name: user.name,
    iat: now,
    exp: now + 14 * 24 * 3600, // 14 days
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing token' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const bufExpected = Buffer.from(expectedSignature);
  const bufActual = Buffer.from(signature);

  if (bufExpected.length !== bufActual.length || !crypto.timingSafeEqual(bufExpected, bufActual)) {
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, user: payload };
  } catch {
    return { valid: false, error: 'Invalid token payload JSON' };
  }
}

function authenticateRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return { authenticated: false, error: 'Missing Authorization header' };
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { authenticated: false, error: 'Invalid Authorization header format. Expected Bearer <token>' };
  }

  const result = verifySessionToken(token);
  if (!result.valid || !result.user) {
    return { authenticated: false, error: result.error || 'Invalid session token' };
  }

  return { authenticated: true, user: result.user };
}

// ─── EXPRESS AUTH MIDDLEWARE ─────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return res.status(401).json({
      success: false,
      error: auth.error || 'Authentication required.',
    });
  }
  req.user = auth.user;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Requires ${role} role.`,
      });
    }
    next();
  };
}

// ─── 5. SANITIZATION HELPERS ────────────────────────────────────────────────
function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return user;
  const clone = { ...user };
  delete clone.password;
  delete clone.passwordHash;
  return clone;
}

function sanitizePortalState(state, role) {
  if (!state || typeof state !== 'object') return state;
  const clone = { ...state };
  if (Array.isArray(clone.users)) {
    clone.users = clone.users.map(sanitizeUser);
  }
  if (role !== 'admin' && clone.emailConfig) {
    clone.emailConfig = {
      ...clone.emailConfig,
      smtpPass: clone.emailConfig.smtpPass ? '********' : undefined,
      resendApiKey: clone.emailConfig.resendApiKey ? '********' : undefined,
    };
  }
  return clone;
}

module.exports = {
  isOriginAllowed,
  checkRateLimit,
  getClientIp,
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  authenticateRequest,
  requireAuth,
  requireRole,
  sanitizeUser,
  sanitizePortalState,
};
