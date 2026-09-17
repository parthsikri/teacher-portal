import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

/**
 * SECURITY DIRECTIVE:
 * Quick login, demo credentials, and one-click auto-fill bypasses are strictly prohibited.
 * All staff, faculty, administrators, and interns must authenticate using valid registered credentials.
 */

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'LOGIN' | 'FORCE_CHANGE_PASSWORD'>('LOGIN');

  // Login credentials state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  // Mandatory first-login password change state
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Client-side rate limiting / lockout state (max 5 failed attempts -> 30s lockout)
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    try {
      return parseInt(sessionStorage.getItem('aew_login_failed_attempts') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });

  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    try {
      return parseInt(sessionStorage.getItem('aew_login_lockout_until') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Active timer to count down lockout seconds
  useEffect(() => {
    const checkLockout = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        setSecondsRemaining(Math.ceil((lockoutUntil - now) / 1000));
      } else {
        setSecondsRemaining(0);
        if (lockoutUntil > 0) {
          setLockoutUntil(0);
          try {
            sessionStorage.removeItem('aew_login_lockout_until');
            sessionStorage.setItem('aew_login_failed_attempts', '0');
            setFailedAttempts(0);
          } catch {}
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Sync latest cloud credentials on modal load
  useEffect(() => {
    setIsSyncing(true);
    StorageService.syncFromCloud()
      .catch(() => {})
      .finally(() => setIsSyncing(false));
  }, []);

  const isLockedOut = secondsRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    setErrorMsg('');

    const rawQuery = identifier.trim();
    const inputPass = password.trim();

    if (!rawQuery || !inputPass) {
      setErrorMsg('Please enter both your username and password.');
      return;
    }

    setIsAuthenticating(true);

    let authenticatedUser: User | null = null;
    let sessionToken: string | null = null;
    let serverErrorText: string = '';

    // 1. Try server-side authentication
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          identifier: rawQuery,
          password: inputPass,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.success && data.user) {
          authenticatedUser = data.user;
          sessionToken = data.token || `session_${Date.now()}`;
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        serverErrorText = errData.error || '';
      }
    } catch {
      // Network error / server not reachable / proxy 502
    }

    // 2. Resilient local fallback if server failed or returned error
    if (!authenticatedUser) {
      const localResult = StorageService.authenticateUser(rawQuery, inputPass);
      if (localResult.success && localResult.user) {
        authenticatedUser = localResult.user;
        sessionToken = `local_session_${Date.now()}_${authenticatedUser.id}`;
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        try {
          sessionStorage.setItem('aew_login_failed_attempts', String(nextAttempts));
        } catch {}

        if (nextAttempts >= 5) {
          const lockTime = Date.now() + 30000; // 30 seconds cooldown
          setLockoutUntil(lockTime);
          setSecondsRemaining(30);
          try {
            sessionStorage.setItem('aew_login_lockout_until', String(lockTime));
          } catch {}
          setErrorMsg('Security lockout: 5 consecutive failed login attempts. Please wait 30 seconds before retrying.');
        } else {
          const remainingBeforeLock = 5 - nextAttempts;
          setErrorMsg(
            `${serverErrorText || localResult.error || 'Invalid username or password. Please verify your credentials.'} (${remainingBeforeLock} attempt${remainingBeforeLock === 1 ? '' : 's'} remaining before security lockout)`
          );
        }

        setIsAuthenticating(false);
        return;
      }
    }

    // Reset failed attempts on success
    setFailedAttempts(0);
    setLockoutUntil(0);
    try {
      sessionStorage.removeItem('aew_login_failed_attempts');
      sessionStorage.removeItem('aew_login_lockout_until');
    } catch {}

    // 3. Mandatory First-Login Password Change Check
    if (authenticatedUser.mustChangePassword) {
      setPendingUser(authenticatedUser);
      setView('FORCE_CHANGE_PASSWORD');
      setIsAuthenticating(false);
      return;
    }

    // 4. Finalize session & regular login
    finalizeLogin(authenticatedUser, sessionToken);
  };

  const finalizeLogin = async (user: User, token: string | null) => {
    StorageService.setSessionToken(token || `session_${Date.now()}_${user.id}`);
    StorageService.setCurrentUser(user);

    try {
      await StorageService.syncFromCloud();
    } catch {
      // ignore
    }

    if (user.role === 'teacher') {
      StorageService.recordTeacherLogin(user.teacherId);
    }

    setIsAuthenticating(false);
    onLoginSuccess(user);
  };

  const handleForcePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pendingUser) return;
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew || !cleanConfirm) {
      setErrorMsg('Please enter and confirm your new password.');
      return;
    }

    if (cleanNew.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    if (cleanNew === (pendingUser.password || '').trim()) {
      setErrorMsg('Your new password cannot be the same as the temporary default password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await StorageService.forceSetUserPassword(pendingUser.id, cleanNew);
      if (!res.success || !res.user) {
        setErrorMsg(res.error || 'Failed to update password. Please try again.');
        setIsChangingPassword(false);
        return;
      }

      // Password successfully changed — proceed to finalize login
      finalizeLogin(res.user, `session_${Date.now()}_${res.user.id}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating password.');
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* VIEW 1: REGULAR SECURE LOGIN */}
        {view === 'LOGIN' && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Academic &amp; Staff Portal Login</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Authorized access for Faculty, Department Leads, Operations Admins, and Interns.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold tracking-wide">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> STRICT CREDENTIAL VERIFICATION
              </div>
            </div>

            {/* Syncing indicator */}
            {isSyncing && (
              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2.5 px-4">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Fetching latest credentials from database…</span>
              </div>
            )}

            {/* Lockout Throttling Banner */}
            {isLockedOut && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-200">Rate Limit Exceeded: Login Throttled</div>
                  <div className="text-[11px] text-rose-300/90 leading-relaxed">
                    Too many consecutive failed login attempts. For portal security, credential attempts are paused for{' '}
                    <span className="font-mono font-black text-rose-200">{secondsRemaining}s</span>.
                  </div>
                </div>
              </div>
            )}

            {errorMsg && !isLockedOut && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Username or Employee ID</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter username (e.g. pr_intern_1)"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isLockedOut}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                  <UserIcon className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLockedOut}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating || isSyncing || isLockedOut}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-600/30 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLockedOut
                  ? `Throttled (${secondsRemaining}s cooldown)`
                  : isAuthenticating
                  ? 'Authenticating…'
                  : isSyncing
                  ? 'Loading portal data…'
                  : 'Sign In to Portal'}
              </button>
            </form>

            {/* Secure Academic Authentication Footer */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure Academic &amp; PR Authentication
              </span>
            </div>
          </>
        )}

        {/* VIEW 2: MANDATORY FIRST-LOGIN PASSWORD UPDATE */}
        {view === 'FORCE_CHANGE_PASSWORD' && pendingUser && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-slate-100 tracking-tight flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" /> Mandatory Password Setup
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                Welcome, <strong>{pendingUser.name}</strong> ({pendingUser.teacherId})!
              </p>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-[11px] text-slate-400 text-left space-y-1 leading-relaxed">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Security Requirement:
                </div>
                <div>
                  You are logging in using a temporary onboarding password. To secure your account and protect portal operations, you must choose a new personal password before entering.
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleForcePasswordSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">New Password (min 6 characters)</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Create your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner font-mono text-xs"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword.length >= 6 ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>Minimum 6 characters</span>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-extrabold text-white shadow-lg shadow-emerald-600/30 transition-all text-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Secure Password…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Set New Password &amp; Enter Portal</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
