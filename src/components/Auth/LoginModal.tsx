import React, { useState } from 'react';
import type { User } from '../../types';
import { StorageService } from '../../services/storage';
import { Eye, EyeOff, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
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

    const currentUsers = StorageService.getUsers();

    // Strict credential matching (Username, Teacher ID, or Email)
    const match = currentUsers.find((u) => {
      const uTeacherId = (u.teacherId || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();

      return uTeacherId === query || uUsername === query || uEmail === query;
    });

    if (!match) {
      setErrorMsg('Invalid credentials. Please verify your Username / Teacher ID and Password.');
      setIsAuthenticating(false);
      return;
    }

    // Verify Password
    const expectedPassword = (match.password || (match.role === 'admin' ? 'admin123' : 'teach123')).trim();
    if (expectedPassword !== inputPass) {
      setErrorMsg('Invalid credentials. Please verify your Username / Teacher ID and Password.');
      setIsAuthenticating(false);
      return;
    }

    // Successful secure authentication
    onLoginSuccess(match);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-md">
            AEW
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Apna Engineering Wallah</h2>
          <p className="text-xs text-slate-400 font-medium">Faculty & Academic Operations Portal</p>
        </div>

        {errorMsg ? (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium text-center flex items-center gap-2 justify-center">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* Secure Standard Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              Username or Teacher ID
            </label>
            <input
              type="text"
              placeholder="e.g. harish_mehta or AEW-T-101"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Password
            </label>
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
            disabled={isAuthenticating}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-600/30 transition-all text-xs disabled:opacity-50"
          >
            {isAuthenticating ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* Security badge */}
        <div className="pt-3 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure Academic Session Authentication
          </p>
        </div>
      </div>
    </div>
  );
};
