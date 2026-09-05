import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Supabase credentials for state persistence & password updates
export const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yczcnpsdmhftvpwdenoy.supabase.co').trim();
export const SUPABASE_KEY = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljemNucHNkbWhmdHZwd2Rlbm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODMwNjQsImV4cCI6MjEwMjk1OTA2NH0.H_qomZFkVTfIsvmSkS9UUWn5hNjP9h1kGB3YEpPA3Vk').trim();

// Session secret for signing stateless authentication tokens
const SESSION_SECRET = (process.env.SESSION_SECRET || process.env.JWT_SECRET || 'aew-secure-portal-auth-token-secret-2025-x7z9').trim();

// Fallback initial state in case cloud DB is empty
export const DEFAULT_STATE: any = {
  version: 2,
  updatedAt: new Date().toISOString(),
  deletedIds: [],
  users: [
    {
      id: 'u-admin',
      teacherId: 'ADMIN-01',
      username: 'admin',
      password: 'admin123',
      name: 'Academic Operations Admin',
      email: 'admin@aew.com',
      role: 'admin',
      department: 'Academic Operations',
      subject: 'Management',
      dailyTargetMinutes: 9999,
      dailyLimit: 999,
    },
  ],
  assignedTopics: [],
  lectures: [],
  subjectReferences: [],
  dailyCommitments: [],
  pptRequests: [],
  extensions: [],
  walletTransactions: [],
  dayOffGrants: [],
  emailConfig: {
    provider: 'smtp',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    senderName: 'AEW Academic Operations',
  },
  emailLogs: [],
};

// In-memory cache fallback
let inMemoryStateCache: any = null;

// ─── 1. CORS VALIDATION & HEADERS ───────────────────────────────────────────
export function isOriginAllowed(origin: string): boolean {
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
        // ignore invalid URL
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = (req.headers.origin || req.headers.Origin || '') as string;
  const allowed = isOriginAllowed(origin);

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // Non-browser or direct curl/server-to-server request
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Disallowed origin: do not set Access-Control-Allow-Origin
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token, Content-Length'
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // Handled preflight
  }

  return false;
}

// ─── 2. IN-MEMORY RATE LIMITER ──────────────────────────────────────────────
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetMs: number } {
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

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]).trim();
  }
  return (req.socket?.remoteAddress || '127.0.0.1');
}

// ─── 3. PASSWORD HASHING (SCRYPT + SALT) ────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): { valid: boolean; needsRehash: boolean } {
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

  // Legacy plaintext verification (constant-time check where possible)
  const bufA = Buffer.from(password);
  const bufB = Buffer.from(stored);
  if (bufA.length !== bufB.length) {
    return { valid: password === stored, needsRehash: true };
  }
  const match = crypto.timingSafeEqual(bufA, bufB);
  return { valid: match, needsRehash: true };
}

// ─── 4. STATELESS SESSION TOKENS (HMAC-SHA256) ──────────────────────────────
function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export interface SessionPayload {
  sub: string;           // User ID
  teacherId: string;     // Teacher ID or ADMIN-01
  username?: string;
  role: 'admin' | 'teacher';
  name?: string;
  iat: number;
  exp: number;
}

export function createSessionToken(user: { id: string; teacherId: string; username?: string; role: string; name?: string }): string {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    teacherId: user.teacherId,
    username: user.username,
    role: user.role as 'admin' | 'teacher',
    name: user.name,
    iat: now,
    exp: now + 14 * 24 * 3600, // 14 days expiration
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): { valid: boolean; user?: SessionPayload; error?: string } {
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
    const payload: SessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, user: payload };
  } catch {
    return { valid: false, error: 'Invalid token payload JSON' };
  }
}

export function authenticateRequest(req: VercelRequest): { authenticated: boolean; user?: SessionPayload; error?: string } {
  const authHeader = (req.headers.authorization || req.headers.Authorization) as string;
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

// ─── 5. SANITIZATION HELPERS ────────────────────────────────────────────────
export function sanitizeUser(user: any): any {
  if (!user || typeof user !== 'object') return user;
  const clone = { ...user };
  delete clone.password;
  delete clone.passwordHash;
  return clone;
}

export function sanitizePortalState(state: any, role?: string): any {
  if (!state || typeof state !== 'object') return state;
  const clone = { ...state };
  if (Array.isArray(clone.users)) {
    clone.users = clone.users.map(sanitizeUser);
  }
  // If caller is not admin, scrub sensitive SMTP passwords & API keys
  if (role !== 'admin' && clone.emailConfig) {
    clone.emailConfig = {
      ...clone.emailConfig,
      smtpPass: clone.emailConfig.smtpPass ? '********' : undefined,
      resendApiKey: clone.emailConfig.resendApiKey ? '********' : undefined,
    };
  }
  return clone;
}

// ─── 6. CLOUD STATE PERSISTENCE HELPERS ──────────────────────────────────────
export async function getCloudPortalState(): Promise<any> {
  try {
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state?id=eq.aew_portal_master&select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
    });

    if (dbRes.ok) {
      const rows = await dbRes.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
        inMemoryStateCache = rows[0].data;
        return rows[0].data;
      }
    }
  } catch (err) {
    console.warn('[auth-utils] Error querying Supabase portal_master_state:', err);
  }

  return inMemoryStateCache || DEFAULT_STATE;
}

export async function saveCloudPortalState(state: any): Promise<boolean> {
  inMemoryStateCache = state;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: 'aew_portal_master',
        version: 2,
        data: state,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[auth-utils] Error persisting state to Supabase:', err);
    return false;
  }
}
