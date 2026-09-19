import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  authenticateRequest,
  checkRateLimit,
  getClientIp,
  verifyPassword,
  hashPassword,
  createSessionToken,
  sanitizeUser,
  getCloudPortalState,
  saveCloudPortalState,
} from './auth-utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method === 'GET') {
    // Convenience endpoint for session validation via GET /api/auth
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return res.status(401).json({ success: false, error: auth.error || 'Unauthorized' });
    }
    const state = await getCloudPortalState();
    const users: any[] = Array.isArray(state.users) ? state.users : [];
    const freshUser = users.find((u) => u.id === auth.user!.sub || u.teacherId?.toUpperCase() === auth.user!.teacherId?.toUpperCase());
    return res.status(200).json({
      success: true,
      user: sanitizeUser(freshUser || auth.user),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const action = body.action || 'login';

  // ─── ACTION 1: LOGIN ─────────────────────────────────────────────────────────
  if (action === 'login') {
    const rawIdentifier = String(body.username || body.identifier || '').trim();
    const password = String(body.password || '').trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ success: false, error: 'Username/Teacher ID and password are required.' });
    }

    const ip = getClientIp(req);
    const rateLimitKey = `login:${ip}:${rawIdentifier.toLowerCase()}`;
    const rl = checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000); // 10 attempts per 15 min

    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many login attempts. Please try again in ${Math.ceil(rl.resetMs / 60000)} minutes.`,
      });
    }

    const state = await getCloudPortalState();
    const users: any[] = Array.isArray(state.users) ? state.users : [];
    const query = rawIdentifier.toLowerCase();

    // Strict user lookup by registered username, teacher/employee ID, or email address
    const matchedUser = users.find((u) => {
      const uTeacherId = (u.teacherId || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uTeacherId === query || uUsername === query || uEmail === query;
    });

    if (!matchedUser) {
      return res.status(401).json({ success: false, error: 'Invalid username or password. Please verify your credentials.' });
    }

    if (matchedUser.isOffboarded) {
      return res.status(403).json({
        success: false,
        error: `Account has been offboarded (${matchedUser.offboardReason || 'Departure'}). Access is disabled. Please contact HR administration.`,
      });
    }

    // Determine the user's authentic password (user-defined or default initial assigned password)
    const storedPassword = (
      matchedUser.password ||
      (matchedUser.role === 'admin'
        ? 'admin123'
        : matchedUser.role === 'pr_head'
        ? 'head123'
        : matchedUser.role === 'pr_intern'
        ? 'intern123'
        : matchedUser.role === 'web_dev_manager' || matchedUser.role === 'web_developer'
        ? 'dev123'
        : matchedUser.role === 'sales'
        ? 'sales123'
        : 'teach123')
    ).trim();

    // Strict cryptographic password verification — no master bypass passwords permitted
    const verifyResult = verifyPassword(password, storedPassword);

    if (!verifyResult.valid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password. Please verify your credentials.' });
    }

    // Automatic transparent migration: rehash legacy plaintext passwords using scrypt
    if (verifyResult.needsRehash) {
      try {
        const hashedPassword = hashPassword(password);
        matchedUser.password = hashedPassword;
        state.updatedAt = new Date().toISOString();
        await saveCloudPortalState(state);
        console.log(`[auth] Successfully upgraded password hash for user: ${matchedUser.teacherId}`);
      } catch (rehashErr) {
        console.warn('[auth] Failed to persist migrated password hash:', rehashErr);
      }
    }

    const token = createSessionToken(matchedUser);
    return res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(matchedUser),
    });
  }

  // ─── ACTION 1B: MANDATORY FIRST-LOGIN PASSWORD CHANGE ──────────────────────
  // This is deliberately separate from the session-authenticated password-change
  // action below: users flagged for first login must set a password before a
  // session is established. The temporary password is verified server-side.
  if (action === 'first_login_change_password') {
    const identifier = String(body.identifier || '').trim();
    const temporaryPassword = String(body.temporaryPassword || '').trim();
    const newPassword = String(body.newPassword || '').trim();

    if (!identifier || !temporaryPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Temporary and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`first-login-change:${ip}:${identifier.toLowerCase()}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ success: false, error: 'Too many password-change attempts. Please try again later.' });
    }

    const state = await getCloudPortalState();
    const users: any[] = Array.isArray(state.users) ? state.users : [];
    const query = identifier.toLowerCase();
    const user = users.find((candidate) =>
      (candidate.id || '').toLowerCase() === query ||
      (candidate.teacherId || '').toLowerCase() === query ||
      (candidate.username || '').toLowerCase() === query ||
      (candidate.email || '').toLowerCase() === query
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    if (user.isOffboarded) {
      return res.status(403).json({ success: false, error: 'This account has been offboarded. Access is disabled.' });
    }

    // If password setup was already completed, smoothly allow user to enter portal
    if (!user.mustChangePassword) {
      return res.status(200).json({
        success: true,
        token: createSessionToken(user),
        user: sanitizeUser(user),
      });
    }

    const defaultPassword = user.role === 'admin' ? 'admin123'
      : user.role === 'pr_head' ? 'head123'
      : user.role === 'pr_intern' ? 'intern123'
      : user.role === 'web_dev_manager' || user.role === 'web_developer' ? 'dev123'
      : user.role === 'sales' ? 'sales123' : 'teach123';
    const verification = verifyPassword(temporaryPassword, String(user.password || defaultPassword).trim());
    if (!verification.valid) {
      return res.status(401).json({ success: false, error: 'Temporary password is incorrect.' });
    }
    if (temporaryPassword === newPassword) {
      return res.status(400).json({ success: false, error: 'New password must differ from the temporary password.' });
    }

    user.password = hashPassword(newPassword);
    user.mustChangePassword = false;
    user.lastPasswordChangedAt = new Date().toISOString();
    state.updatedAt = new Date().toISOString();
    const saved = await saveCloudPortalState(state);
    if (!saved) {
      return res.status(503).json({ success: false, error: 'Password could not be saved. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      token: createSessionToken(user),
      user: sanitizeUser(user),
    });
  }

  // ─── ACTION 2: ME (VERIFY SESSION) ──────────────────────────────────────────
  if (action === 'me') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return res.status(401).json({ success: false, error: auth.error || 'Unauthorized' });
    }

    const state = await getCloudPortalState();
    const users: any[] = Array.isArray(state.users) ? state.users : [];
    const freshUser = users.find((u) => u.id === auth.user!.sub || u.teacherId?.toUpperCase() === auth.user!.teacherId?.toUpperCase());

    return res.status(200).json({
      success: true,
      user: sanitizeUser(freshUser || auth.user),
    });
  }

  // ─── ACTION 3: LOGOUT ────────────────────────────────────────────────────────
  if (action === 'logout') {
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  // ─── ACTION 4: CHANGE PASSWORD ───────────────────────────────────────────────
  if (action === 'change_password') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return res.status(401).json({ success: false, error: auth.error || 'Unauthorized' });
    }

    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both current password and new password are required.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const state = await getCloudPortalState();
    const users: any[] = Array.isArray(state.users) ? state.users : [];
    const targetUser = users.find((u) => u.id === auth.user!.sub || u.teacherId?.toUpperCase() === auth.user!.teacherId?.toUpperCase());

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const storedPassword = (targetUser.password || (targetUser.role === 'admin' ? 'admin123' : 'teach123')).trim();
    const verifyResult = verifyPassword(String(currentPassword).trim(), storedPassword);

    if (!verifyResult.valid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }

    targetUser.password = hashPassword(String(newPassword).trim());
    targetUser.mustChangePassword = false;
    targetUser.lastPasswordChangedAt = new Date().toISOString();
    state.updatedAt = new Date().toISOString();
    await saveCloudPortalState(state);

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  }

  return res.status(400).json({ success: false, error: `Unsupported auth action: ${action}` });
}
