import React, { useState, useMemo, useEffect } from 'react';
import type { User, CustomFeatureKey, UserRole } from '../../types';
import { StorageService } from '../../services/storage';
import {
  ShieldAlert,
  ShieldCheck,
  Crown,
  KeyRound,
  Search,
  Users,
  Sparkles,
  CheckCircle2,
  X,
  TrendingUp,
  PhoneCall,
  FileSpreadsheet,
  Image as ImageIcon,
  Code2,
  Layers,
  Clock,
  Video,
  Lock,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SuperAdminConsoleProps {
  currentUser: User;
  onPageChange?: (page: string) => void;
}

interface FeatureDefinition {
  key: CustomFeatureKey;
  title: string;
  category: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  unlockedTabs: string[];
}

const AVAILABLE_CUSTOM_FEATURES: FeatureDefinition[] = [
  {
    key: 'pr_portal',
    title: 'Public Relations & Sponsorship Suite',
    category: 'Growth & Outreach',
    badge: 'PR Access',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    description: 'Enables PR Leads Pipeline, MoU Agreement Maker, PR Missions, Task Submissions, and Sponsorship Commission tracking directly inside this user’s panel.',
    icon: TrendingUp,
    unlockedTabs: ['PR Mission Control', 'Leads Pipeline', 'MoU Agreements', 'PR Tasks', 'My Earnings'],
  },
  {
    key: 'sales_crm',
    title: 'Sales CRM & Calling Desk',
    category: 'Revenue & Admissions',
    badge: 'Sales CRM',
    badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    description: 'Grants access to the sales lead intake pipeline, student & corporate counseling logs, call disposition logging, and daily follow-up agendas.',
    icon: PhoneCall,
    unlockedTabs: ['Sales CRM Desk', 'Lead Pipeline', 'Call Logs', 'Follow-up Agendas'],
  },
  {
    key: 'ppt_generator',
    title: 'PYQ PPT Presentation Studio',
    category: 'Content Generation',
    badge: 'PPT Studio',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    description: 'Unlocks the automated PYQ Slide Deck generator, enabling instant AI lecture slides and structured PowerPoint exports.',
    icon: FileSpreadsheet,
    unlockedTabs: ['PYQ PPT Generator', 'AI Slide Templates', 'Export Center'],
  },
  {
    key: 'thumbnail_studio',
    title: '16:9 Thumbnail Studio',
    category: 'Creative Design',
    badge: 'Thumbnail Studio',
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    description: 'Grants access to the 16:9 high-res YouTube & portal thumbnail generator with custom faculty badges and title overlays.',
    icon: ImageIcon,
    unlockedTabs: ['16:9 Thumbnail Studio', 'Template Canvas', 'Export JPEG/PNG'],
  },
  {
    key: 'webdev_portal',
    title: 'Web Development & Engineering Hub',
    category: 'Software Engineering',
    badge: 'Dev Hub',
    badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    description: 'Allows non-engineering users to view and contribute to engineering task deliverables, claim open bounties, and submit PRs.',
    icon: Code2,
    unlockedTabs: ['Engineering Tasks', 'Open Bounties', 'Project Roadmap'],
  },
  {
    key: 'syllabus_manager',
    title: 'Curriculum & Syllabus Planner',
    category: 'Academic Ops',
    badge: 'Syllabus Planner',
    badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    description: 'Grants administrative syllabus curriculum management, topic milestone assignment, and standard textbook reference uploads.',
    icon: Layers,
    unlockedTabs: ['Syllabus & Deadlines', 'Curriculum Blueprint', 'Topic Assignments'],
  },
  {
    key: 'academic_audits',
    title: 'Lecture Quality & Video Audits',
    category: 'Quality Assurance',
    badge: 'Lecture Auditing',
    badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    description: 'Allows reviewing submitted lecture recordings, checking audio/video compliance, and issuing quality improvement directives.',
    icon: Video,
    unlockedTabs: ['Lecture Audits', 'Video Player Quality Check', 'Admin Remarks'],
  },
  {
    key: 'time_wallet_grants',
    title: 'Faculty Time Wallet & Extensions Control',
    category: 'Operations',
    badge: 'Time Wallet Admin',
    badgeColor: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
    description: 'Permits manual credit/debit adjustments on faculty time wallets, recording quota adjustments, and extension window authorizations.',
    icon: Clock,
    unlockedTabs: ['Time Wallet Transactions', 'Extension Authorization', 'Quota Control'],
  },
];

export const SuperAdminConsole: React.FC<SuperAdminConsoleProps> = ({
  currentUser,
  onPageChange,
}) => {
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingFeatures, setEditingFeatures] = useState<CustomFeatureKey[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [overrideFilter, setOverrideFilter] = useState<'all' | 'customized_only' | 'standard_only'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Security Check: strictly Super Admin
  const isSuperAdmin =
    currentUser.role === 'admin' &&
    (!currentUser.adminTier ||
      currentUser.adminTier === 'super_admin' ||
      currentUser.teacherId.toUpperCase() === 'ADMIN-01' ||
      currentUser.teacherId.toUpperCase() === 'ADMIN');

  useEffect(() => {
    const handleStorage = () => {
      setUsers(StorageService.getUsers());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('aew_users_updated', handleStorage);
    window.addEventListener('portal_storage_update', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('aew_users_updated', handleStorage);
      window.removeEventListener('portal_storage_update', handleStorage);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const customizedCount = users.filter((u) => u.customFeatures && u.customFeatures.length > 0).length;
    const superAdminCount = users.filter(
      (u) => u.role === 'admin' && (!u.adminTier || u.adminTier === 'super_admin')
    ).length;
    const totalGrants = users.reduce((acc, u) => acc + (u.customFeatures?.length || 0), 0);

    return { totalUsers, customizedCount, superAdminCount, totalGrants };
  }, [users]);

  // Filtered staff list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.isOffboarded) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (overrideFilter === 'customized_only' && (!u.customFeatures || u.customFeatures.length === 0)) return false;
      if (overrideFilter === 'standard_only' && u.customFeatures && u.customFeatures.length > 0) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        u.name.toLowerCase().includes(q) ||
        u.teacherId.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, overrideFilter, searchQuery]);

  // Handle opening modal for a user
  const handleOpenConfig = (user: User) => {
    setSelectedUser(user);
    setEditingFeatures(user.customFeatures ? [...user.customFeatures] : []);
  };

  // Toggle single feature
  const handleToggleFeature = (featureKey: CustomFeatureKey) => {
    setEditingFeatures((prev) =>
      prev.includes(featureKey) ? prev.filter((k) => k !== featureKey) : [...prev, featureKey]
    );
  };

  // Save updated features
  const handleSaveFeatures = () => {
    if (!selectedUser) return;

    // Check if sales_crm is toggled, also sync hasCrmAccess
    const hasCrm = editingFeatures.includes('sales_crm');

    const updated = StorageService.updateUser(selectedUser.id, {
      customFeatures: editingFeatures,
      hasCrmAccess: hasCrm || selectedUser.hasCrmAccess,
    });

    if (updated) {
      setUsers(StorageService.getUsers());
      showToast(`✓ Updated feature entitlements for ${selectedUser.name} (${editingFeatures.length} features enabled)`);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b'],
        });
      } catch {}
    }

    setSelectedUser(null);
  };

  // Presets
  const applyPreset = (preset: 'clear' | 'teacher_pr' | 'power_user' | 'teacher_sales') => {
    if (preset === 'clear') {
      setEditingFeatures([]);
    } else if (preset === 'teacher_pr') {
      setEditingFeatures(['pr_portal', 'ppt_generator']);
    } else if (preset === 'teacher_sales') {
      setEditingFeatures(['sales_crm', 'ppt_generator']);
    } else if (preset === 'power_user') {
      setEditingFeatures(AVAILABLE_CUSTOM_FEATURES.map((f) => f.key));
    }
  };

  // Security Access Denied Screen
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Super Admin Clearance Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This module contains root security privileges for the organization. Only authenticated Level-0 Super Administrators can configure cross-role feature entitlements.
          </p>
          <button
            onClick={() => onPageChange?.('admin_dashboard')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Return to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl shadow-emerald-600/40 flex items-center gap-2 border border-emerald-400/30 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* ─── HERO HEADER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-500/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold tracking-wide">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> ROOT PRIVILEGES • SUPER ADMIN CONSOLE
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Feature Entitlements & Access Matrix
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Dynamically assign cross-role features to any individual staff member. For example, grant a faculty member access to the PR Suite, or give a developer sales CRM calling access without changing their base role.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-950/80 border border-rose-500/30 shrink-0">
            <Crown className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs font-black text-white">{currentUser.name}</div>
              <div className="text-[10px] text-rose-300 font-mono">SUPER ADMIN (LEVEL 0)</div>
            </div>
          </div>
        </div>

        {/* ─── QUICK METRICS ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Total Active Staff
            </span>
            <div className="text-xl sm:text-2xl font-black text-white">{metrics.totalUsers}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Custom Entitlements
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-300">
              {metrics.customizedCount} <span className="text-xs text-slate-400 font-normal">users</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> Super Admins
            </span>
            <div className="text-xl sm:text-2xl font-black text-white">{metrics.superAdminCount} Root Accounts</div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-1">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Active Delegations
            </span>
            <div className="text-xl sm:text-2xl font-black text-white">{metrics.totalGrants} Modules</div>
          </div>
        </div>
      </div>

      {/* ─── STAFF ENTITLEMENT MATRIX TABLE ──────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6 shadow-xl">
        
        {/* Controls: Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee by name, ID, department..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="teacher">Academic Faculty</option>
              <option value="pr_intern">PR Interns</option>
              <option value="pr_head">PR Heads</option>
              <option value="web_developer">Web Developers</option>
              <option value="web_dev_manager">Web Dev Managers</option>
              <option value="sales">Sales Executives</option>
              <option value="admin">Administrators</option>
            </select>

            {/* Custom Status Filter */}
            <select
              value={overrideFilter}
              onChange={(e) => setOverrideFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">All Profiles</option>
              <option value="customized_only">Customized Only ({metrics.customizedCount})</option>
              <option value="standard_only">Standard Default Roles</option>
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Primary Role</th>
                <th className="py-3.5 px-4">Active Cross-Role Modules</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No team members found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const hasCustom = user.customFeatures && user.customFeatures.length > 0;
                  const isCurrentSuper =
                    user.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs text-rose-300 border border-slate-700 shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              {user.name}
                              {isCurrentSuper && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-mono font-bold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {user.teacherId} • {user.department || user.subject || 'Staff'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {hasCustom ? (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {user.customFeatures!.map((fKey) => {
                              const def = AVAILABLE_CUSTOM_FEATURES.find((f) => f.key === fKey);
                              return (
                                <span
                                  key={fKey}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    def?.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {def?.badge || fKey}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            Default {user.role.replace('_', ' ')} permissions
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {hasCustom ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <Sparkles className="w-3 h-3" /> Customized
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Standard</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenConfig(user)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer hover:border-slate-600"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-rose-400" /> Configure Access
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: CONFIGURE FEATURE ENTITLEMENTS ───────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-mono font-bold uppercase">
                  <ShieldAlert className="w-3 h-3 text-rose-400" /> Cross-Role Entitlement Grant
                </div>
                <h3 className="text-xl font-black text-white">
                  Configure Features for {selectedUser.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Base Role: <strong className="text-slate-200 capitalize">{selectedUser.role.replace('_', ' ')}</strong> ({selectedUser.teacherId}) • Department: {selectedUser.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick 1-Click Role Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('teacher_pr')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  🚀 + PR Suite Access (Teacher + PR)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('teacher_sales')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  📞 + Sales CRM Desk
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('power_user')}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  👑 All-Access Pass (Everything)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('clear')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to Default
                </button>
              </div>
            </div>

            {/* Checklist of Features */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Select Features to Grant ({editingFeatures.length} Enabled)
              </span>

              <div className="space-y-2.5">
                {AVAILABLE_CUSTOM_FEATURES.map((feat) => {
                  const Icon = feat.icon;
                  const isChecked = editingFeatures.includes(feat.key);

                  return (
                    <div
                      key={feat.key}
                      onClick={() => handleToggleFeature(feat.key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isChecked
                          ? 'bg-rose-500/10 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-rose-600 border-rose-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-xs flex items-center gap-2">
                            <Icon className="w-4 h-4 text-rose-400" />
                            {feat.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${feat.badgeColor}`}>
                            {feat.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {feat.description}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {feat.unlockedTabs.map((tab) => (
                            <span key={tab} className="text-[9px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              + {tab}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeatures}
                className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" /> Save & Authorize Entitlements
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
