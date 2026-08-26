import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { StorageService } from '../../services/storage';
import { Eye, EyeOff, Lock, User as UserIcon, ShieldCheck, RefreshCw } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawQuery = identifier.trim();
    const query = rawQuery.toLowerCase();
    const inputPass = password.trim();

    if (!rawQuery || !inputPass) {
      setErrorMsg('Please enter both your username and password.');
      return;
    }

    setIsAuthenticating(true);

    // Always do a fresh cloud sync before checking credentials
    // This ensures a new teacher onboarded from another device is found
    try {
      await StorageService.syncFromCloud();
    } catch {
      // If sync fails, proceed with locally cached data
    }

    const currentUsers = StorageService.getUsers();

    const match = currentUsers.find((u) => {
      const uTeacherId = (u.teacherId || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uTeacherId === query || uUsername === query || uEmail === query;
    });

    if (!match) {
      setErrorMsg('Account not found. Please check your Teacher ID / Username, or contact Admin.');
      setIsAuthenticating(false);
      return;
    }

    // Verify Password
    const expectedPassword = (match.password || (match.role === 'admin' ? 'admin123' : 'teach123')).trim();
    if (expectedPassword !== inputPass) {
      setErrorMsg('Incorrect password. Please try again.');
      setIsAuthenticating(false);
      return;
    }

    // Successful secure authentication
    onLoginSuccess(match);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-1">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">Academic Portal Login</h2>
          <p className="text-xs text-slate-400">
            Sign in to manage lectures, syllabus milestones, and curriculum pacing.
          </p>
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
            <label className="block text-slate-300 font-semibold">Username</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter your username"
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

        {/* QUICK DEMO / TEST ACCOUNT SELECTOR */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
            <span>⚡ Quick Faculty & Admin Select</span>
            <span className="text-[10px] text-indigo-400">Click to autofill</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {StorageService.getUsers().map((u) => {
              const pass = u.password || (u.role === 'admin' ? 'admin123' : 'teach123');
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setIdentifier(u.username || u.teacherId);
                    setPassword(pass);
                    setErrorMsg('');
                  }}
                  className="p-2 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all group cursor-pointer"
                >
                  <div className="font-bold text-slate-200 group-hover:text-indigo-300 text-[11px] truncate">
                    {u.role === 'admin' ? '🛡️ ' : '👨‍🏫 '}{u.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {u.username || u.teacherId} • {u.subject || u.role}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secure Academic Authentication Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure Academic Authentication
          </span>
        </div>
      </div>
    </div>
  );
};
