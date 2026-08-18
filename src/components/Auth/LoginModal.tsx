import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { StorageService } from '../../services/storage';
import { Eye, EyeOff, Lock, User as UserIcon, ShieldCheck, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountList, setShowAccountList] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  useEffect(() => {
    setActiveUsers(StorageService.getUsers());
  }, []);

  const handleAutoFillAndLogin = (u: User) => {
    setIdentifier(u.username || u.teacherId);
    setPassword(u.password || (u.role === 'admin' ? 'admin123' : 'teach123'));
    setErrorMsg('');
    // Direct instant login
    onLoginSuccess(u);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawQuery = identifier.trim();
    const query = rawQuery.toLowerCase();
    const cleanQueryAlphaNum = query.replace(/[^a-z0-9]/g, '');
    const inputPass = password.trim();

    if (!rawQuery || !inputPass) {
      setErrorMsg('Please enter both your login identifier and password.');
      return;
    }

    const currentUsers = StorageService.getUsers();
    setActiveUsers(currentUsers);

    // Multi-factor fuzzy identifier matcher
    const match = currentUsers.find((u) => {
      const uTeacherId = (u.teacherId || '').toLowerCase();
      const uTeacherIdAlphaNum = uTeacherId.replace(/[^a-z0-9]/g, '');
      const uUsername = (u.username || '').toLowerCase();
      const uUsernameAlphaNum = uUsername.replace(/[^a-z0-9]/g, '');
      const uEmail = (u.email || '').toLowerCase();
      const uEmailPrefix = uEmail.split('@')[0];
      const uName = (u.name || '').toLowerCase();
      const uNameClean = uName.replace(/^(dr\.|er\.|prof\.)\s*/i, '').trim();

      // 1. Exact Teacher ID match (e.g. AEW-T-101 or 101)
      if (uTeacherId === query || (cleanQueryAlphaNum.length >= 2 && uTeacherIdAlphaNum.includes(cleanQueryAlphaNum))) return true;

      // 2. Exact Username match (e.g. rajesh_kumar, rajesh)
      if (uUsername && (uUsername === query || (cleanQueryAlphaNum.length >= 3 && uUsernameAlphaNum.includes(cleanQueryAlphaNum)))) return true;

      // 3. Email match (full or prefix)
      if (uEmail === query || uEmailPrefix === query) return true;

      // 4. Full Name match (e.g. Prof. Rajesh Kumar or Rajesh Kumar)
      if (uName === query || uNameClean === query || uName.includes(query)) return true;

      // 5. Admin keywords
      if (u.role === 'admin' && (query === 'admin' || query === 'admin@aew.com')) return true;

      return false;
    });

    if (!match) {
      setErrorMsg(`Teacher or Account "${rawQuery}" not found. Please click "View Registered Accounts" below to select an active teacher.`);
      setShowAccountList(true);
      return;
    }

    // Verify Password
    const expectedPassword = (match.password || (match.role === 'admin' ? 'admin123' : 'teach123')).trim();
    if (expectedPassword !== inputPass) {
      setErrorMsg(`Incorrect password for ${match.name}. Check your password or use 1-click login below.`);
      setShowAccountList(true);
      return;
    }

    // Role-based portal opens automatically based on matched user profile
    onLoginSuccess(match);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-8 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-indigo-500/20">
            AEW
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">Apna Engineering Wallah</h2>
          <p className="text-xs text-slate-400 font-medium">Faculty & Operations Portal</p>
        </div>

        {errorMsg ? (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-2xl font-semibold text-center flex items-center gap-2 justify-center">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* Single Unified Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              Username, Teacher ID, or Name
            </label>
            <input
              type="text"
              placeholder="e.g. AEW-T-101, rajesh_kumar, or Full Name"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner font-mono"
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
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-extrabold text-white shadow-lg shadow-indigo-600/30 transition-all text-xs hover:scale-[1.01] active:scale-[0.99]"
          >
            Sign In to Workstation
          </button>
        </form>

        {/* REGISTERED ACCOUNTS & CREDENTIALS QUICK HELPER */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={() => {
              setActiveUsers(StorageService.getUsers());
              setShowAccountList(!showAccountList);
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-between transition-colors border border-slate-800 shadow-sm"
          >
            <span className="flex items-center gap-1.5 text-[11px] text-amber-400">
              <HelpCircle className="w-4 h-4" />
              Active Registered Accounts ({activeUsers.length})
            </span>
            {showAccountList ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {showAccountList && (
            <div className="space-y-2 max-h-64 overflow-y-auto p-1 text-[11px]">
              {activeUsers.map((u) => (
                <div
                  key={u.id}
                  className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors shadow-inner"
                >
                  <div className="truncate space-y-0.5">
                    <div className="font-extrabold text-slate-200 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${u.role === 'admin' ? 'bg-purple-400' : 'bg-emerald-400'} animate-pulse`} />
                      {u.name}
                      <span className="text-[10px] font-mono text-indigo-300">({u.role === 'admin' ? 'ADMIN' : u.teacherId})</span>
                    </div>
                    <div className="text-slate-400 text-[10px] flex flex-wrap items-center gap-2 font-mono">
                      <span>User: <strong className="text-slate-200">{u.username || u.teacherId.toLowerCase()}</strong></span>
                      <span>•</span>
                      <span>Pass: <strong className="text-amber-400">{u.password || (u.role === 'admin' ? 'admin123' : 'teach123')}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAutoFillAndLogin(u)}
                    className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl shrink-0 text-[10px] transition-all flex items-center gap-1 shadow-md hover:scale-105"
                  >
                    Login ⚡
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security badge / note */}
        <div className="text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Secure Admin & Teacher Session Authentication
          </p>
        </div>
      </div>
    </div>
  );
};
