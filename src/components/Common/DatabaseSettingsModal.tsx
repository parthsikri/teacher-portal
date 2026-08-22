import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, X, Key, Globe, Shield, Copy, Check } from 'lucide-react';
import { SupabaseService } from '../../services/supabase';
import { StorageService } from '../../services/storage';

interface DatabaseSettingsModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({ onClose, onSuccess }) => {
  const currentConfig = SupabaseService.getConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.key || '');
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const SQL_SCHEMA = `-- 1. Create Portal State Table
create table if not exists portal_master_state (
  id text primary key default 'aew_portal_master',
  version integer default 2,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security & Public Access Policy
alter table portal_master_state enable row level security;

create policy "Allow anon full access" 
  on portal_master_state 
  for all 
  using (true) 
  with check (true);

-- 3. Initialize Default Administrator
insert into portal_master_state (id, version, data)
values (
  'aew_portal_master',
  2,
  '{"users":[{"id":"u-admin","teacherId":"ADMIN-01","username":"admin","password":"admin123","name":"Academic Operations Admin","email":"admin@aew.com","role":"admin","department":"Academic Operations","subject":"Management","dailyTargetMinutes":9999,"dailyLimit":999}],"assignedTopics":[],"lectures":[],"subjectReferences":[],"dailyCommitments":[],"pptRequests":[],"deletedIds":[]}'::jsonb
)
on conflict (id) do nothing;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter both Supabase Project URL and Anon Public Key.' });
      return;
    }

    setTesting(true);
    setStatusMsg({ type: 'info', text: 'Connecting to Supabase PostgreSQL database...' });

    const result = await SupabaseService.testConnection(url.trim(), anonKey.trim());
    setTesting(false);

    if (result.success) {
      SupabaseService.saveConfig(url.trim(), anonKey.trim());
      setStatusMsg({ type: 'success', text: result.message });

      // Trigger initial cloud push/pull
      await StorageService.syncFromCloud();
      await StorageService.syncToCloud();

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } else {
      setStatusMsg({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Supabase Database Connection</h3>
              <p className="text-xs text-slate-400">Direct PostgreSQL multi-device persistence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleTestAndSave} className="p-6 space-y-5 overflow-y-auto">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : statusMsg.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                  : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzproject.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Supabase Anon (Public) Key
              </label>
              <input
                type="password"
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Quick SQL Schema Box */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                SQL Table Setup (Run in Supabase SQL Editor)
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-indigo-300 flex items-center gap-1 transition-colors"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSql ? 'Copied!' : 'Copy SQL'}
              </button>
            </div>
            <pre className="text-[10px] font-mono text-slate-400 bg-slate-900 p-2.5 rounded-lg overflow-x-auto max-h-24 select-all">
              {SQL_SCHEMA}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testing}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connect & Sync
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
