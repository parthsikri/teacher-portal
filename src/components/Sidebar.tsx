import React, { useState, useMemo } from 'react';
import type { User } from '../types';
import { StorageService } from '../services/storage';
import { WebDevService } from '../services/webDevService';
import { 
  Calendar, LogOut, LayoutDashboard, Layers, Video, BookMarked, MessageSquare, 
  Users, Menu, X, FileSpreadsheet, Image as ImageIcon, Clock, Wallet,
  Award, CheckCircle2, DollarSign, Star, TrendingUp, Building2, FileText,
  Code2, Trophy, Target, Sparkles, Shield, Gift, ListTodo, Briefcase, PhoneCall, FileCheck, Key, Lock
} from 'lucide-react';
import { ChangePasswordModal } from './Common/ChangePasswordModal';

const ADMIN_PAGE_PERMISSIONS: Record<string, string> = {
  admin_faculty: 'manage_faculty',
  admin_syllabus: 'manage_syllabus',
  admin_lectures: 'manage_lectures',
  admin_leaves: 'manage_leaves',
  admin_pr: 'manage_pr',
  admin_web_dev: 'manage_webdev',
  admin_sales_crm: 'manage_sales',
  admin_offer_letters: 'manage_offer_letters',
};

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
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  if (!currentUser) return null;

  // Calculate live notification badges
  const pendingApprovalsCount = currentUser.role === 'admin'
    ? StorageService.getAssignedTopics().filter((t) => t.subtopicsApprovalState === 'pending_admin_approval').length
    : 0;

  const adminPptRequestsQueueCount = currentUser.role === 'admin'
    ? StorageService.getPptRequests().filter((r) => r.status === 'pending' || r.status === 'in_progress').length
    : 0;

  const adminPrSubmissionsCount = currentUser.role === 'admin'
    ? StorageService.getPrTasks().filter((t) => t.status === 'submitted').length
    : 0;

  const prPendingTasksCount = currentUser.role === 'pr_intern'
    ? StorageService.getPrTasks().filter(
        (t) => t.assignedToInternId.toUpperCase() === currentUser.teacherId.toUpperCase() && t.status === 'pending'
      ).length
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
  const teacherWalletInfo = currentUser.role === 'teacher' ? StorageService.getTimeWalletInfo(currentUser.teacherId) : null;
  const minutesRecordedToday = currentUser.role === 'teacher' ? StorageService.getMinutesRecordedToday(currentUser.teacherId) : 0;
  const targetMinutes = currentUser.role === 'teacher' ? (currentUser.dailyTargetMinutes || 120) : 0;
  const isTargetReached = currentUser.role === 'teacher' ? minutesRecordedToday >= targetMinutes : false;
  const teacherActiveExtensions = currentUser.role === 'teacher' ? StorageService.getActiveExtensions(currentUser.teacherId).length : 0;
  const adminActiveExtensions = currentUser.role === 'admin' ? StorageService.getActiveExtensions().length : 0;
  const teacherResourcesCount = currentUser.role === 'teacher'
    ? StorageService.getAllReferencesForTeacher(
        currentUser,
        StorageService.getAssignedTopics().filter((t) => t.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase())
      ).length
    : 0;

  // Sales CRM Badges & Visibility
  const todayStr = StorageService.toLocalDateKey(new Date());
  const allSalesLeads = StorageService.getSalesLeads();
  const adminTodayCallsDueCount = currentUser.role === 'admin'
    ? allSalesLeads.filter(
        (l) => l.nextFollowUpDate === todayStr && l.status !== 'closed_won' && l.status !== 'closed_lost'
      ).length
    : 0;

  const myAssignedLeads = allSalesLeads.filter(
    (l) => (l.assignedToEmployeeId === currentUser.id || l.assignedToEmployeeId === currentUser.teacherId)
  );
  const myTodayCallsDueCount = myAssignedLeads.filter(
    (l) => l.nextFollowUpDate === todayStr && l.status !== 'closed_won' && l.status !== 'closed_lost'
  ).length;

  const hasEmployeeCrmAccess = StorageService.hasUserCrmAccess(currentUser);

  // PR Intern Navigation Links
  const prNavItems = [
    { id: 'pr_dashboard', label: 'Mission Control & Tier', icon: Award },
    { 
      id: 'pr_tasks', 
      label: 'Assigned Tasks', 
      icon: CheckCircle2,
      badge: prPendingTasksCount > 0 ? `${prPendingTasksCount} New` : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 font-mono',
    },
    { id: 'pr_leads', label: 'Sponsorship Leads', icon: DollarSign },
    { id: 'pr_mou_maker', label: 'MoU Maker & Legal', icon: FileText },
    { id: 'pr_colleges', label: 'Campus Network', icon: Building2 },
    { id: 'pr_earnings', label: 'Commission Ledger', icon: TrendingUp },
  ];

  // Teacher Navigation Links
  const teacherNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'recording_status', 
      label: 'Recording Status', 
      icon: Clock,
      badge: teacherActiveExtensions > 0 
        ? `${teacherActiveExtensions} Ext` 
        : (backlogInfo && backlogInfo.yesterdayUnfulfilledMinutes > 0 ? 'Backlog' : undefined),
      badgeColor: teacherActiveExtensions > 0 
        ? 'bg-purple-900/50 text-purple-300 border border-purple-700/60 font-bold' 
        : 'bg-amber-500/20 text-amber-300',
    },
    { 
      id: 'wallet', 
      label: 'Time Wallet', 
      icon: Wallet,
      badge: teacherWalletInfo && teacherWalletInfo.balance > 0 
        ? `+${teacherWalletInfo.balance}m` 
        : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold',
    },
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
    { 
      id: 'resources', 
      label: 'Study Resources', 
      icon: BookMarked,
      badge: teacherResourcesCount > 0 ? `${teacherResourcesCount} Res` : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold',
    },
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
      id: 'admin_pr', 
      label: 'PR Team & Gamification', 
      icon: Award,
      badge: adminPrSubmissionsCount > 0 ? `${adminPrSubmissionsCount} Sub` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono',
    },
    { 
      id: 'admin_wallet', 
      label: 'Faculty Wallets', 
      icon: Wallet,
    },
    { 
      id: 'admin_leaves', 
      label: 'Day Offs & Leaves', 
      icon: Calendar,
      badge: StorageService.getDayOffGrants().filter(g => g.date >= StorageService.toLocalDateKey(new Date())).length > 0
        ? `${StorageService.getDayOffGrants().filter(g => g.date >= StorageService.toLocalDateKey(new Date())).length} Active`
        : undefined,
      badgeColor: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/60 font-bold',
    },
    { 
      id: 'admin_extensions', 
      label: 'Extension Windows', 
      icon: Clock,
      badge: adminActiveExtensions > 0 ? `${adminActiveExtensions} Active` : undefined,
      badgeColor: 'bg-purple-900/50 text-purple-300 border border-purple-700/60 font-bold',
    },
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
    { 
      id: 'thumbnail_generator', 
      label: '16:9 Thumbnail Studio', 
      icon: ImageIcon,
    },
    { id: 'admin_faculty', label: 'Staff & Faculty Roster', icon: Users },
    { id: 'admin_resources', label: 'Subject Resources', icon: BookMarked },
    { 
      id: 'admin_lectures', 
      label: 'Lecture Audits', 
      icon: Video,
      badge: adminRemarkStats && adminRemarkStats.newAcks > 0 ? `${adminRemarkStats.newAcks} Ack` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold',
    },
    { 
      id: 'admin_web_dev', 
      label: 'Web Dev War Room', 
      icon: Code2,
      badge: 'All Work',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono',
    },
    { 
      id: 'admin_sales_crm', 
      label: 'Sales CRM & Leads', 
      icon: PhoneCall,
      badge: adminTodayCallsDueCount > 0 ? `${adminTodayCallsDueCount} Due` : (allSalesLeads.length > 0 ? `${allSalesLeads.length}` : undefined),
      badgeColor: adminTodayCallsDueCount > 0 
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono animate-pulse' 
        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono',
    },
    { 
      id: 'admin_offer_letters', 
      label: 'Offer Letter Studio', 
      icon: FileCheck,
      badge: 'Generator',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold font-mono',
    },
  ];

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }

  // Web Dev counts & badges
  const wdmMyActiveTasks = currentUser.role === 'web_dev_manager'
    ? WebDevService.getTasks({ assigneeId: currentUser.teacherId }).filter((t) => t.status !== 'completed' && t.status !== 'not_done').length
    : 0;
  const wdmPendingReviews = currentUser.role === 'web_dev_manager'
    ? WebDevService.getTasks({ status: 'review_requested' }).length
    : 0;
  const wdmOpenBounties = (currentUser.role === 'web_dev_manager' || currentUser.role === 'web_developer')
    ? WebDevService.getBounties().filter((b) => b.status === 'open').length
    : 0;
  const devActiveTasks = currentUser.role === 'web_developer'
    ? WebDevService.getTasks({ assigneeId: currentUser.teacherId }).filter((t) => t.status !== 'completed').length
    : 0;

  // Web Dev Manager Navigation Links
  const wdmNavItems: NavItem[] = [
    { 
      id: 'wdm_my_tasks', 
      label: 'My Tasks', 
      icon: CheckCircle2,
      badge: wdmMyActiveTasks > 0 ? `${wdmMyActiveTasks} Active` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30',
    },
    { 
      id: 'wdm_review', 
      label: 'Review Desk', 
      icon: Shield,
      badge: wdmPendingReviews > 0 ? `${wdmPendingReviews} Pending` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30',
    },
    { id: 'wdm_tasks', label: 'All Tasks', icon: ListTodo },
    { id: 'wdm_projects', label: 'Projects & Roadmap', icon: Briefcase },
    { 
      id: 'wdm_bounties', 
      label: 'Bounties Desk', 
      icon: Target,
      badge: wdmOpenBounties > 0 ? `${wdmOpenBounties} Open` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold',
    },
    { id: 'wdm_awards', label: 'Award & XP Thresholds', icon: Gift },
    { id: 'wdm_team', label: 'Engineering Roster', icon: Users },
    { id: 'wdm_leaderboard', label: 'Company Leaderboard', icon: Trophy },
    { id: 'wdm_audit', label: 'Audit Trail', icon: FileText },
  ];

  // Web Developer Navigation Links
  const devNavItems: NavItem[] = [
    { 
      id: 'dev_tasks', 
      label: 'My Tasks', 
      icon: ListTodo,
      badge: devActiveTasks > 0 ? `${devActiveTasks} Active` : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30',
    },
    { id: 'dev_projects', label: 'Projects Roadmap', icon: Briefcase },
    { 
      id: 'dev_bounties', 
      label: 'Open Bounties', 
      icon: Target,
      badge: wdmOpenBounties > 0 ? `${wdmOpenBounties} New` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold',
    },
    { id: 'dev_leaderboard', label: 'Company Leaderboard', icon: Trophy },
    { id: 'dev_achievements', label: 'Achievements & Badges', icon: Sparkles },
    { id: 'dev_rewards', label: 'Awards & Certificates', icon: Award },
    { id: 'dev_ledger', label: 'XP Ledger', icon: Clock },
    { id: 'dev_team', label: 'Team & Kudos', icon: Users },
  ];

  // Dedicated Sales Representative Navigation
  const salesNavItems: NavItem[] = [
    { 
      id: 'sales_crm', 
      label: 'Sales CRM Desk', 
      icon: PhoneCall,
      badge: myTodayCallsDueCount > 0 ? `${myTodayCallsDueCount} Due` : (myAssignedLeads.length > 0 ? `${myAssignedLeads.length} Leads` : undefined),
      badgeColor: myTodayCallsDueCount > 0 
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono animate-pulse' 
        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold font-mono',
    },
  ];

  // Filter admin items according to admin permissions scope
  const filteredAdminNavItems = useMemo(() => {
    if (currentUser.role !== 'admin') return adminNavItems;
    if (!currentUser.adminPermissions || currentUser.adminTier === 'super_admin') {
      return adminNavItems;
    }
    const perms = currentUser.adminPermissions;
    return adminNavItems.filter((item) => {
      if (item.id === 'admin_overview') return true;
      if (item.id === 'admin_faculty') return perms.includes('manage_faculty') || perms.includes('manage_credentials');
      if (item.id === 'admin_syllabus') return perms.includes('manage_syllabus');
      if (item.id === 'ppt_generator') return perms.includes('manage_syllabus');
      if (item.id === 'thumbnail_generator') return perms.includes('manage_syllabus') || perms.includes('manage_faculty');
      if (item.id === 'admin_resources') return perms.includes('manage_syllabus');
      if (item.id === 'admin_lectures') return perms.includes('manage_lectures');
      if (item.id === 'admin_extensions') return perms.includes('manage_leaves');
      if (item.id === 'admin_pr_management') return perms.includes('manage_pr');
      if (item.id === 'admin_web_dev') return perms.includes('manage_webdev');
      if (item.id === 'admin_sales_crm') return perms.includes('manage_sales');
      if (item.id === 'admin_offer_letters') return perms.includes('manage_offer_letters');
      return true;
    });
  }, [currentUser, adminNavItems]);

  const baseNavItems: NavItem[] = currentUser.role === 'admin' 
    ? filteredAdminNavItems 
    : currentUser.role === 'sales'
    ? salesNavItems
    : (currentUser.role === 'pr_intern' || currentUser.role === 'pr_head')
    ? prNavItems
    : currentUser.role === 'web_dev_manager'
    ? wdmNavItems
    : currentUser.role === 'web_developer'
    ? devNavItems
    : teacherNavItems;

  const navItems: NavItem[] = (hasEmployeeCrmAccess && currentUser.role !== 'admin' && currentUser.role !== 'sales')
    ? [
        ...baseNavItems,
        {
          id: 'sales_crm',
          label: 'Sales CRM Desk',
          icon: PhoneCall,
          badge: myTodayCallsDueCount > 0 ? `${myTodayCallsDueCount} Due` : (myAssignedLeads.length > 0 ? `${myAssignedLeads.length}` : undefined),
          badgeColor: myTodayCallsDueCount > 0 
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono animate-pulse' 
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono',
        }
      ]
    : baseNavItems;

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
            const requiredPerm = ADMIN_PAGE_PERMISSIONS[item.id];
            const isRestricted =
              currentUser.role === 'admin' &&
              currentUser.adminTier &&
              currentUser.adminTier !== 'super_admin' &&
              Array.isArray(currentUser.adminPermissions) &&
              requiredPerm &&
              !currentUser.adminPermissions.includes(requiredPerm as any);

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                  isActive
                    ? 'bg-slate-800 text-white font-bold shadow-sm'
                    : isRestricted
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 opacity-75 font-medium'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-medium'
                }`}
                title={isRestricted ? `${item.label} (Access Restricted)` : item.label}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : isRestricted ? 'text-slate-500' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                  {isRestricted && (
                    <Lock className="w-3 h-3 text-amber-500/70 ml-1 inline" />
                  )}
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
          {currentUser.role === 'pr_intern' && (
            <div className="space-y-2">
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Intern Tier:</span>
                  <span className="font-extrabold text-amber-300 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    {currentUser.prTier || 'Silver'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Take-Home Share:</span>
                  <span className="font-bold text-emerald-400">
                    {StorageService.getTierCommissionRate(currentUser.prTier || 'Silver')}%
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {currentUser.prStars || 0} Stars
                  </span>
                  <span className="text-indigo-300 font-bold">
                    🎖️ {currentUser.prPoints || 0} Pts
                  </span>
                </div>
              </div>
            </div>
          )}

          {(currentUser.role === 'web_developer' || currentUser.role === 'web_dev_manager') && (
            <div className="space-y-2">
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Level & Rank:</span>
                  <span className="font-extrabold text-amber-300 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Level {currentUser.webDevLevel || 1}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-semibold truncate">
                  {currentUser.webDevTitle || (currentUser.role === 'web_dev_manager' ? 'Engineering Lead' : 'Full Stack Developer')}
                </div>
                <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    +{currentUser.webDevXp || 0} XP
                  </span>
                  <span className="text-emerald-400 font-bold">
                    ✓ Verified
                  </span>
                </div>
              </div>
            </div>
          )}

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

              {/* TIME WALLET MINI BADGE */}
              {teacherWalletInfo && (
                <button
                  type="button"
                  onClick={() => handleNavClick('wallet')}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/60 text-slate-300 text-[11px] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="text-indigo-300 flex items-center gap-1.5 font-medium">
                    <Wallet className="w-3.5 h-3.5 text-indigo-400" /> Time Wallet:
                  </span>
                  <span className="font-mono text-indigo-200 font-bold">
                    +{teacherWalletInfo.balance} min
                  </span>
                </button>
              )}

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

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(true)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                title="Change Password"
              >
                <Key className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {showChangePasswordModal && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          user={currentUser}
        />
      )}
    </>
  );
};
