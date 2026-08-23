import React, { useState } from 'react';
import type { User } from '../types';
import { StorageService } from '../services/storage';
import { 
  LogOut, LayoutDashboard, Layers, Video, BookMarked, MessageSquare, 
  Users, Menu, X, FileSpreadsheet
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

  const adminPptRequestsQueueCount = currentUser.role === 'admin'
    ? StorageService.getPptRequests().filter((r) => r.status === 'pending' || r.status === 'in_progress').length
    : 0;

  const teacherActionRequiredCount = currentUser.role === 'teacher'
    ? StorageService.getAssignedTopics().filter(
        (t) => t.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase() &&
               t.status !== 'completed' &&
               (t.subtopicsApprovalState === 'pending_teacher_input' || t.subtopicsApprovalState === 'revision_requested')
      ).length
    : 0;

  const teacherRevisionCount = currentUser.role === 'teacher'
    ? StorageService.getAssignedTopics().filter(
        (t) => t.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase() &&
               t.status !== 'completed' &&
               t.subtopicsApprovalState === 'revision_requested'
      ).length
    : 0;

  const teacherPptReadyCount = currentUser.role === 'teacher'
    ? StorageService.getTeacherPptRequests(currentUser.teacherId).filter(
        (r) => r.status === 'completed' && r.isNewForTeacher
      ).length
    : 0;

  const teacherUnacknowledgedDirectivesCount = currentUser.role === 'teacher'
    ? StorageService.getLectures().filter((l) => l.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase())
        .reduce((sum, lec) => sum + (lec.adminRemarks?.filter((r) => !r.isAcknowledged).length || 0), 0)
    : 0;

  const adminRemarkStats = currentUser.role === 'admin'
    ? StorageService.getAdminRemarkAckStats()
    : null;

  const backlogInfo = currentUser.role === 'teacher' ? StorageService.getPreviousDayBacklog(currentUser.teacherId) : null;
  const minutesRecordedToday = currentUser.role === 'teacher' ? StorageService.getMinutesRecordedToday(currentUser.teacherId) : 0;
  const targetMinutes = currentUser.role === 'teacher' ? (currentUser.dailyTargetMinutes || 120) : 0;
  const isTargetReached = currentUser.role === 'teacher' ? minutesRecordedToday >= targetMinutes : false;

  // Teacher Navigation Links
  const teacherNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'syllabus', 
      label: 'Syllabus & Topics', 
      icon: Layers,
      badge: teacherRevisionCount > 0 
        ? `${teacherRevisionCount} Revision` 
        : (teacherActionRequiredCount > 0 ? `${teacherActionRequiredCount} New` : undefined),
      badgeColor: teacherRevisionCount > 0 
        ? 'bg-rose-600 text-white font-black animate-pulse shadow-md shadow-rose-600/40' 
        : 'bg-amber-500/20 text-amber-300',
    },
    { 
      id: 'ppt_requests', 
      label: 'PYQ Slide Decks', 
      icon: BookMarked,
      badge: teacherPptReadyCount > 0 ? `${teacherPptReadyCount} Ready` : undefined,
    },
    { id: 'lectures', label: 'Delivered Lectures', icon: Video },
    { id: 'resources', label: 'Subject Library', icon: BookMarked },
    { 
      id: 'directives', 
      label: 'Admin Directives', 
      icon: MessageSquare,
      badge: teacherUnacknowledgedDirectivesCount > 0 ? `${teacherUnacknowledgedDirectivesCount} New` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 font-bold',
    },
  ];

  // Admin Navigation Links
  const adminNavItems = [
    { id: 'admin_dashboard', label: 'Overview', icon: LayoutDashboard },
    { 
      id: 'admin_syllabus', 
      label: 'Syllabus & Deadlines', 
      icon: Layers,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
    },
    { 
      id: 'ppt_generator', 
      label: 'PYQ PPT Generator', 
      icon: FileSpreadsheet,
      badge: adminPptRequestsQueueCount > 0 ? `${adminPptRequestsQueueCount} Req` : undefined,
    },
    { id: 'admin_faculty', label: 'Faculty Roster', icon: Users },
    { id: 'admin_resources', label: 'Subject Resources', icon: BookMarked },
    { 
      id: 'admin_lectures', 
      label: 'Lecture Audits', 
      icon: Video,
      badge: adminRemarkStats && adminRemarkStats.newAcks > 0 ? `${adminRemarkStats.newAcks} Ack` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold',
    },
  ];

  const navItems = currentUser.role === 'admin' ? adminNavItems : teacherNavItems;

  const handleNavClick = (id: string) => {
    onPageChange(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
            AEW
          </div>
          <span className="font-semibold text-xs text-slate-200">Apna Engineering Wallah</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
        >
          {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* MOBILE BACKDROP */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/70 z-40 backdrop-blur-sm"
        />
      )}

      {/* FULL LEFT-SIDEBAR CONTAINER */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 lg:w-72 bg-slate-900/95 border-r border-slate-800/80 z-50 flex flex-col justify-between transition-transform duration-150 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* TOP BRAND HEADER */}
        <div className="p-5 border-b border-slate-800/60 space-y-3">
          <div 
            onClick={() => handleNavClick(currentUser.role === 'admin' ? 'admin_dashboard' : 'dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md group-hover:scale-105 transition-transform shrink-0">
              AEW
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-100 leading-none">
                Apna Engg Wallah
              </h1>
              <p className="text-[11px] text-slate-400 mt-1">Faculty & Academic Portal</p>
            </div>
          </div>
        </div>

        {/* MIDDLE NAVIGATION ITEMS */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                  isActive
                    ? 'bg-slate-800 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    (item as any).badgeColor || 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* BOTTOM USER PROFILE & LOGOUT */}
        <div className="p-4 border-t border-slate-800/60 space-y-3 text-xs">
          {currentUser.role === 'teacher' && (
            <div className="space-y-2">
              <div className="p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Daily Target:</span>
                  <span className={isTargetReached ? 'text-emerald-400 font-bold' : 'text-slate-200 font-semibold'}>
                    {minutesRecordedToday} / {targetMinutes} min
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all ${isTargetReached ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, (minutesRecordedToday / (targetMinutes || 1)) * 100)}%` }}
                  />
                </div>
                {backlogInfo && !backlogInfo.isYesterdayFulfilled && (
                  <div className="text-[10px] text-amber-400 font-medium">
                    ⚠️ Yesterday: {backlogInfo.yesterdayUnfulfilledMinutes}m unfulfilled
                  </div>
                )}
              </div>

              {/* PERMANENT DAILY CUTOFF DISPLAY (LOCKED & READ-ONLY) */}
              {(() => {
                const cutoff = currentUser.dailyUploadCutoffTime || StorageService.getDailyCommitment(currentUser.teacherId)?.promisedTime || '20:00';
                const formatTime = (time24?: string) => {
                  if (!time24) return '08:00 PM';
                  const [hours, minutes] = time24.split(':').map(Number);
                  const period = hours >= 12 ? 'PM' : 'AM';
                  const formattedHours = hours % 12 || 12;
                  const formattedMinutes = String(minutes).padStart(2, '0');
                  return `${formattedHours}:${formattedMinutes} ${period}`;
                };

                return (
                  <div
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300 text-[11px] flex items-center justify-between"
                  >
                    <span className="text-slate-400">Fixed Daily Cutoff:</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {formatTime(cutoff)}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="truncate flex-1 mr-2">
              <div className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{currentUser.subject || currentUser.department}</div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
