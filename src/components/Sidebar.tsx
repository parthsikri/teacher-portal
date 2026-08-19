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

  const minutesRecordedToday = currentUser.role === 'teacher' ? StorageService.getMinutesRecordedToday(currentUser.teacherId) : 0;
  const targetMinutes = currentUser.role === 'teacher' ? (currentUser.dailyTargetMinutes || 120) : 0;
  const isTargetReached = minutesRecordedToday >= targetMinutes;

  // Teacher Navigation Links
  const teacherNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'syllabus', 
      label: 'Syllabus & Topics', 
      icon: Layers,
      badge: teacherActionRequiredCount > 0 ? `${teacherActionRequiredCount}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    { id: 'lectures', label: 'Delivered Lectures', icon: Video },
    { id: 'resources', label: 'Subject Library', icon: BookMarked },
    { id: 'directives', label: 'Admin Directives', icon: MessageSquare },
  ];

  // Admin Navigation Links
  const adminNavItems = [
    { id: 'admin_dashboard', label: 'Overview', icon: LayoutDashboard },
    { 
      id: 'admin_syllabus', 
      label: 'Syllabus & Deadlines', 
      icon: Layers,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
      badgeColor: 'bg-purple-500 text-white animate-pulse',
    },
    { id: 'admin_faculty', label: 'Faculty Roster', icon: Users },
    { id: 'admin_resources', label: 'Subject Resources', icon: BookMarked },
    { id: 'admin_lectures', label: 'Lecture Audits', icon: Video },
  ];

  const navItems = currentUser.role === 'admin' ? adminNavItems : teacherNavItems;

  const handleNavClick = (id: string) => {
    onPageChange(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900/95 border-b border-slate-800 z-40 px-4 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-xs">
            AEW
          </div>
          <span className="font-bold text-xs text-slate-200">Apna Engineering Wallah</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
        className={`fixed top-0 left-0 bottom-0 w-60 lg:w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col justify-between shadow-xl transition-transform duration-200 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* TOP BRAND HEADER */}
        <div className="p-5 border-b border-slate-800/70 space-y-3.5">
          <div 
            onClick={() => handleNavClick(currentUser.role === 'admin' ? 'admin_dashboard' : 'dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs shadow-md group-hover:scale-105 transition-transform shrink-0">
              AEW
            </div>
            <div>
              <h1 className="font-bold text-xs text-slate-100 tracking-tight leading-none">
                Apna Engg Wallah
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Faculty Operations</p>
            </div>
          </div>

          {/* USER PROFILE CARD */}
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300">
                {currentUser.role === 'admin' ? 'Admin' : currentUser.teacherId}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <h3 className="font-bold text-xs text-slate-200 truncate">{currentUser.name}</h3>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.subject}</p>
          </div>
        </div>

        {/* MIDDLE NAVIGATION ITEMS */}
        <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
          <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* BOTTOM QUOTA & LOGOUT */}
        <div className="p-3 border-t border-slate-800/70 space-y-2.5">
          {currentUser.role === 'teacher' && (
            <div className="px-2.5 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>Daily Target</span>
                <span className={isTargetReached ? 'text-emerald-400 font-bold' : 'text-slate-300 font-bold'}>
                  {minutesRecordedToday} / {targetMinutes} min
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full transition-all ${isTargetReached ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (minutesRecordedToday / (targetMinutes || 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full py-2 px-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-slate-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
