import React from 'react';
import type { User } from '../types';
import { StorageService } from '../services/storage';
import { 
  LogOut, LayoutDashboard, Layers, Video, BookMarked, MessageSquare, 
  Users, FileSpreadsheet, Image as ImageIcon, Wallet, Clock
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  onRefreshData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentPage,
  onPageChange,
  onLogout,
}) => {
  // Calculate notifications/action badges
  const pendingApprovalsCount = currentUser?.role === 'admin'
    ? StorageService.getAssignedTopics().filter((t) => t.subtopicsApprovalState === 'pending_admin_approval').length
    : 0;

  const teacherActionRequiredCount = currentUser?.role === 'teacher'
    ? StorageService.getAssignedTopics().filter(
        (t) => t.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase() &&
               t.status !== 'completed' &&
               (t.subtopicsApprovalState === 'pending_teacher_input' || t.subtopicsApprovalState === 'revision_requested')
      ).length
    : 0;

  const teacherRevisionCount = currentUser?.role === 'teacher'
    ? StorageService.getAssignedTopics().filter(
        (t) => t.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase() &&
               t.status !== 'completed' &&
               t.subtopicsApprovalState === 'revision_requested'
      ).length
    : 0;

  const teacherUnacknowledgedDirectivesCount = currentUser?.role === 'teacher'
    ? StorageService.getLectures().filter((l) => l.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase())
        .reduce((sum, lec) => sum + (lec.adminRemarks?.filter(r => !r.isAcknowledged).length || 0), 0)
    : 0;

  const adminRemarkStats = currentUser?.role === 'admin'
    ? StorageService.getAdminRemarkAckStats()
    : null;

  const teacherWalletInfo = currentUser?.role === 'teacher' ? StorageService.getTimeWalletInfo(currentUser.teacherId) : null;

  // Teacher Navigation Links
  const teacherNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recording_status', label: 'Recording Status', icon: Clock },
    { 
      id: 'wallet', 
      label: 'Time Wallet', 
      icon: Wallet,
      badge: teacherWalletInfo && teacherWalletInfo.balance > 0 ? `+${teacherWalletInfo.balance}m` : undefined,
      badgeColor: 'bg-indigo-500 text-white font-mono font-bold',
    },
    { 
      id: 'syllabus', 
      label: 'Syllabus & Topics', 
      icon: Layers,
      badge: teacherRevisionCount > 0 
        ? `${teacherRevisionCount} Revision` 
        : (teacherActionRequiredCount > 0 ? `${teacherActionRequiredCount}` : undefined),
      badgeColor: teacherRevisionCount > 0 
        ? 'bg-rose-600 text-white font-black animate-pulse shadow-md shadow-rose-600/40' 
        : 'bg-amber-500 text-slate-950 font-bold',
    },
    { id: 'lectures', label: 'Delivered Lectures', icon: Video },
    { id: 'resources', label: 'Subject Resources', icon: BookMarked },
    { 
      id: 'directives', 
      label: 'Admin Directives', 
      icon: MessageSquare,
      badge: teacherUnacknowledgedDirectivesCount > 0 ? `${teacherUnacknowledgedDirectivesCount}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
  ];

  // Admin Navigation Links
  const adminNavItems = [
    { id: 'admin_dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'admin_wallet', label: 'Faculty Wallets', icon: Wallet },
    { 
      id: 'admin_syllabus', 
      label: 'Syllabus & Approvals', 
      icon: Layers,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
      badgeColor: 'bg-purple-500 text-white animate-pulse',
    },
    { 
      id: 'ppt_generator', 
      label: 'PYQ PPT Generator', 
      icon: FileSpreadsheet,
    },
    { 
      id: 'thumbnail_generator', 
      label: '16:9 Thumbnail Studio', 
      icon: ImageIcon,
    },
    { id: 'admin_faculty', label: 'Faculty Roster', icon: Users },
    { id: 'admin_resources', label: 'Subject Library', icon: BookMarked },
    { 
      id: 'admin_lectures', 
      label: 'Lecture Audits', 
      icon: Video,
      badge: adminRemarkStats && adminRemarkStats.newAcks > 0 ? `${adminRemarkStats.newAcks} Ack` : undefined,
      badgeColor: 'bg-emerald-500 text-white font-bold',
    },
  ];

  const currentNavItems = currentUser?.role === 'admin' ? adminNavItems : teacherNavItems;

  return (
    <header className="w-full bg-slate-900/95 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onPageChange(currentUser?.role === 'admin' ? 'admin_dashboard' : 'dashboard')}
          className="flex items-center gap-3 cursor-pointer shrink-0 group"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            AEW
          </div>
          <div className="hidden sm:block">
            <h1 className="font-black text-xs md:text-sm text-slate-100 tracking-tight flex items-center gap-1.5 leading-none">
              Apna Engineering Wallah
              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Faculty Operations Portal</p>
          </div>
        </div>

        {/* Dynamic Top Navigation Links */}
        {currentUser && (
          <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none max-w-xl">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 relative ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* User Profile Badge & Logout */}
        {currentUser && (
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-xs shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <span className="font-bold text-slate-200 truncate max-w-[130px]">{currentUser.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                {currentUser.role === 'admin' ? 'ADMIN' : currentUser.teacherId}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-red-500/10 hover:text-red-400 text-slate-300 font-bold text-xs transition-all border border-slate-700/80 flex items-center gap-1 shadow-sm"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
