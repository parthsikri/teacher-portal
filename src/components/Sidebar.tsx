import React, { useState } from 'react';
import type { User } from '../types';
import { StorageService } from '../services/storage';
import { 
  LogOut, LayoutDashboard, Layers, Video, BookMarked, MessageSquare, 
  Users, Menu, X
} from 'lucide-react';

interface SidebarProps {
  currentUser: User | null;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  onRefreshData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentPage,
  onPageChange,
  onLogout,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!currentUser) return null;

  // Calculate live notification badges
  const pendingApprovalsCount = currentUser.role === 'admin'
    ? StorageService.getAssignedTopics().filter((t) => t.subtopicsApprovalState === 'pending_admin_approval').length
    : 0;

  const teacherActionRequiredCount = currentUser.role === 'teacher'
    ? StorageService.getAssignedTopics().filter(
        (t) => t.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase() &&
               t.status !== 'completed' &&
               (t.subtopicsApprovalState === 'pending_teacher_input' || t.subtopicsApprovalState === 'revision_requested')
      ).length
    : 0;

  const uploadsToday = currentUser.role === 'teacher' ? StorageService.getUploadsToday(currentUser.teacherId) : 0;
  const isLimitReached = currentUser.role === 'teacher' && uploadsToday >= currentUser.dailyLimit;

  // Teacher Navigation Links
  const teacherNavItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { 
      id: 'syllabus', 
      label: 'Syllabus & Approvals', 
      icon: Layers,
      badge: teacherActionRequiredCount > 0 ? `${teacherActionRequiredCount}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    { id: 'lectures', label: 'Delivered Lectures', icon: Video },
    { id: 'resources', label: 'Subject Reference Hub', icon: BookMarked },
    { id: 'directives', label: 'Admin Directives', icon: MessageSquare },
  ];

  // Admin Navigation Links
  const adminNavItems = [
    { id: 'admin_dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { 
      id: 'admin_syllabus', 
      label: 'Syllabus & Approvals', 
      icon: Layers,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
      badgeColor: 'bg-purple-500 text-white animate-pulse',
    },
    { id: 'admin_faculty', label: 'Faculty Roster', icon: Users },
    { id: 'admin_resources', label: 'Subject Reference Library', icon: BookMarked },
    { id: 'admin_lectures', label: 'Lecture Submissions Audit', icon: Video },
  ];

  const navItems = currentUser.role === 'admin' ? adminNavItems : teacherNavItems;

  const handleNavClick = (id: string) => {
    onPageChange(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE TOP BAR (For small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/95 border-b border-slate-800 z-40 px-4 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-xs shadow-md">
            AEW
          </div>
          <span className="font-black text-xs text-slate-100">Apna Engineering Wallah</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE BACKDROP */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/80 z-40 backdrop-blur-sm"
        />
      )}

      {/* FULL LEFT-SIDEBAR CONTAINER */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 lg:w-72 bg-slate-900 border-r border-slate-800 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* TOP BRAND HEADER */}
        <div className="p-6 border-b border-slate-800/80 space-y-4">
          <div 
            onClick={() => handleNavClick(currentUser.role === 'admin' ? 'admin_dashboard' : 'dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
              AEW
            </div>
            <div>
              <h1 className="font-black text-sm text-slate-100 tracking-tight flex items-center gap-1.5 leading-none">
                Apna Engg Wallah
                <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  PRO
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Faculty & Academic Portal</p>
            </div>
          </div>

          {/* CURRENT USER PROFILE CARD */}
          <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {currentUser.role === 'admin' ? '🛡️ ADMIN' : currentUser.teacherId}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            </div>
            <h3 className="font-black text-xs text-slate-100 truncate">{currentUser.name}</h3>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.department}</p>
            {currentUser.role === 'teacher' && (
              <p className="text-[10px] text-indigo-400 font-bold truncate">Subject: {currentUser.subject}</p>
            )}
          </div>
        </div>

        {/* MIDDLE NAVIGATION ITEMS */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-none">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navigation Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full px-3.5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-between group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 translate-x-1'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* BOTTOM USER STATUS & LOGOUT */}
        <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40">
          {/* Daily Quota Summary for Teachers */}
          {currentUser.role === 'teacher' && (
            <div className="p-3 bg-slate-950 border border-slate-800/90 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span>Daily Upload Quota</span>
                <span className="text-slate-200">{uploadsToday} / {currentUser.dailyLimit}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all ${isLimitReached ? 'bg-amber-400' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (uploadsToday / currentUser.dailyLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Logout Action */}
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-3 rounded-2xl bg-slate-950 hover:bg-red-500/10 hover:text-red-400 text-slate-400 font-bold text-xs transition-all border border-slate-800 flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
