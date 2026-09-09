import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { StorageService } from '../../services/storage';
import { Eye, EyeOff, Lock, User as UserIcon, ShieldCheck, RefreshCw, Sparkles, GraduationCap, ShieldAlert, Award, Code2 } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true); // Start true — sync on mount

  // Sync latest cloud credentials on modal load — AWAIT it before allowing login
  useEffect(() => {
    setIsSyncing(true);
    StorageService.syncFromCloud()
      .catch(() => {})
      .finally(() => setIsSyncing(false));
  }, []);

  const handleQuickFill = (userType: 'teacher' | 'admin' | 'pr_intern' | 'web_dev_manager' | 'web_developer') => {
    setErrorMsg('');
    if (userType === 'teacher') {
      setIdentifier('teacher_101');
      setPassword('teach123');
    } else if (userType === 'admin') {
      setIdentifier('admin');
      setPassword('admin123');
    } else if (userType === 'pr_intern') {
      setIdentifier('pr_intern_1');
      setPassword('intern123');
    } else if (userType === 'web_dev_manager') {
      setIdentifier('webdev_manager');
      setPassword('dev123');
    } else if (userType === 'web_developer') {
      setIdentifier('developer_aarav');
      setPassword('dev123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawQuery = identifier.trim();
    const inputPass = password.trim();

    if (!rawQuery || !inputPass) {
      setErrorMsg('Please enter both your username and password.');
      return;
    }

    setIsAuthenticating(true);

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

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.token) {
        setErrorMsg(data.error || 'Authentication failed. Please check your credentials.');
        setIsAuthenticating(false);
        return;
      }

      // Store server-issued stateless session Bearer token
      StorageService.setSessionToken(data.token);

      const authenticatedUser: User = data.user;

      // Sync latest cloud state authenticated
      try {
        await StorageService.syncFromCloud();
      } catch {
        // ignore sync error
      }

      if (authenticatedUser.role === 'teacher') {
        StorageService.recordTeacherLogin(authenticatedUser.teacherId);
      }

      setIsAuthenticating(false);
      onLoginSuccess(authenticatedUser);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while attempting to log in. Please try again.');
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">Academic & PR Portal Login</h2>
          <p className="text-xs text-slate-400">
            Sign in to access faculty curriculum, academic ops, or PR intern workspace.
          </p>
        </div>

        {/* ONE-CLICK DEMO LOGIN SWITCHER */}
        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Quick Demo Switcher:
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickFill('teacher')}
              className="py-1.5 px-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-slate-200 font-semibold transition-all flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Teacher</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="py-1.5 px-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 hover:border-purple-500/50 text-slate-200 font-semibold transition-all flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('pr_intern')}
              className="py-1.5 px-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-amber-300 font-bold transition-all flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>PR Intern</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('web_dev_manager')}
              className="py-1.5 px-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 font-bold transition-all flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dev Lead</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('web_developer')}
              className="py-1.5 px-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 font-bold transition-all flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Developer</span>
            </button>
          </div>
        </div>

        {/* Syncing indicator */}
        {isSyncing && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2.5 px-4">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Fetching latest credentials from database…</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold">Username or ID</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter username (e.g. pr_intern_1)"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner font-mono"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner font-mono"
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
            disabled={isAuthenticating || isSyncing}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-600/30 transition-all text-xs disabled:opacity-50 cursor-pointer"
          >
            {isAuthenticating
              ? 'Authenticating…'
              : isSyncing
              ? 'Loading portal data…'
              : 'Sign In to Portal'}
          </button>
        </form>

        {/* Secure Academic Authentication Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure Academic & PR Authentication
          </span>
        </div>
      </div>
    </div>
  );
};
