import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '../types';
import { StorageService } from '../services/storage';
import { WebDevService } from '../services/webDevService';
import { 
  LogOut, LayoutDashboard, Menu, X, Wallet,
  Award, Star, Code2, Trophy, Sparkles, Shield, PhoneCall, Key, Lock,
  ChevronDown, ChevronRight, GraduationCap, Users
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
  admin_hr: 'manage_hr',
};

export interface SubNavItem {
  id: string;
  label: string;
  badge?: string;
  badgeColor?: string;
}

export interface NavCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  directPageId?: string;
  badge?: string;
  badgeColor?: string;
  children?: SubNavItem[];
}

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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    teacher_module: true,
    academic: true,
    pr_module: true,
    pr_ops: true,
    sales_module: true,
    sales_ops: true,
    webdev_module: true,
    hr_module: true,
    hr_ops: true,
    engineering: true,
    sprints: true,
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

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

  // HR Task & Submission Badges
  const allHrTasks = StorageService.getHrTasks();
  const adminHrSubmissionsCount = currentUser.role === 'admin'
    ? allHrTasks.filter((t) => t.status === 'submitted').length
    : 0;
  const hrAllottedMemberIds = currentUser.role === 'hr'
    ? new Set(StorageService.getAllottedMembersForHr(currentUser).map((m) => m.teacherId.toUpperCase()))
    : new Set<string>();
  const hrPendingSubmissionsCount = currentUser.role === 'hr'
    ? allHrTasks.filter(
        (t) =>
          t.status === 'submitted' &&
          (hrAllottedMemberIds.has(t.assignedToId.toUpperCase()) ||
            t.assignedByHrId.toUpperCase() === currentUser.teacherId.toUpperCase())
      ).length
    : 0;
  const myPendingHrTasksCount = allHrTasks.filter(
    (t) =>
      t.assignedToId.toUpperCase() === currentUser.teacherId.toUpperCase() &&
      (t.status === 'pending' || t.status === 'revision_requested')
  ).length;

  // Super Admin verification
  const isSuperAdmin = currentUser.role === 'admin' && (
    currentUser.adminTier === 'super_admin' || 
    !currentUser.adminTier || 
    currentUser.teacherId.toUpperCase() === 'ADMIN-01' || 
    currentUser.teacherId.toUpperCase() === 'ADMIN'
  );

  const navCategories = useMemo<NavCategory[]>(() => {
    if (currentUser.role === 'admin') {
      const perms = currentUser.adminPermissions || [];
      const hasPerm = (p: string) => isSuperAdmin || perms.includes(p as any);

      const teacherChildren: SubNavItem[] = [
        ...(hasPerm('manage_faculty') || hasPerm('manage_credentials') ? [{ id: 'admin_faculty', label: 'Faculty & Staff Roster' }] : []),
        ...(hasPerm('manage_syllabus') ? [{ 
          id: 'admin_syllabus', 
          label: 'Syllabus & Deadlines',
          badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
        }] : []),
        ...(hasPerm('manage_lectures') ? [{ 
          id: 'admin_lectures', 
          label: 'Lecture Audits',
          badge: adminRemarkStats && adminRemarkStats.newAcks > 0 ? `${adminRemarkStats.newAcks} Ack` : undefined,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold',
        }] : []),
        ...(hasPerm('manage_syllabus') ? [{ id: 'admin_resources', label: 'Subject Resources' }] : []),
        { id: 'admin_wallet', label: 'Faculty Wallets' },
        ...(hasPerm('manage_leaves') ? [{ 
          id: 'admin_leaves', 
          label: 'Day Offs & Leaves',
          badge: StorageService.getDayOffGrants().filter(g => g.date >= StorageService.toLocalDateKey(new Date())).length > 0
            ? `${StorageService.getDayOffGrants().filter(g => g.date >= StorageService.toLocalDateKey(new Date())).length} Active`
            : undefined,
          badgeColor: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/60 font-bold',
        }] : []),
        ...(hasPerm('manage_leaves') ? [{ 
          id: 'admin_extensions', 
          label: 'Extension Windows',
          badge: adminActiveExtensions > 0 ? `${adminActiveExtensions} Active` : undefined,
          badgeColor: 'bg-purple-900/50 text-purple-300 border border-purple-700/60 font-bold',
        }] : []),
        ...(hasPerm('manage_syllabus') ? [{ 
          id: 'ppt_generator', 
          label: 'PYQ PPT Generator',
          badge: adminPptRequestsQueueCount > 0 ? `${adminPptRequestsQueueCount} Req` : undefined,
        }] : []),
        ...(hasPerm('manage_syllabus') || hasPerm('manage_faculty') ? [{ id: 'thumbnail_generator', label: '16:9 Thumbnail Studio' }] : []),
      ];

      const prChildren: SubNavItem[] = [
        ...(hasPerm('manage_pr') ? [{ 
          id: 'admin_pr', 
          label: 'PR War Room & Tasks',
          badge: adminPrSubmissionsCount > 0 ? `${adminPrSubmissionsCount} Sub` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono',
        }] : []),
      ];

      const salesChildren: SubNavItem[] = [
        ...(hasPerm('manage_sales') ? [{ 
          id: 'admin_sales_crm', 
          label: 'Sales CRM & Leads',
          badge: adminTodayCallsDueCount > 0 ? `${adminTodayCallsDueCount} Due` : (allSalesLeads.length > 0 ? `${allSalesLeads.length}` : undefined),
          badgeColor: adminTodayCallsDueCount > 0 
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono animate-pulse' 
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono',
        }] : []),
      ];

      const webdevChildren: SubNavItem[] = [
        ...(hasPerm('manage_webdev') ? [{ 
          id: 'admin_web_dev', 
          label: 'Web Dev War Room',
          badge: 'All Work',
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono',
        }] : []),
      ];

      const hrChildren: SubNavItem[] = [
        ...(hasPerm('manage_hr') || hasPerm('manage_faculty') ? [{
          id: 'admin_hr',
          label: 'HR Allocation & Tasks',
          badge: adminHrSubmissionsCount > 0 ? `${adminHrSubmissionsCount} Sub` : 'Teams',
          badgeColor: adminHrSubmissionsCount > 0
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono animate-pulse'
            : 'bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold font-mono',
        }] : []),
      ];

      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          directPageId: 'admin_dashboard',
        },
        ...(teacherChildren.length > 0 ? [{
          id: 'teacher_module',
          label: 'Teacher Module',
          icon: GraduationCap,
          children: teacherChildren,
        }] : []),
        ...(prChildren.length > 0 ? [{
          id: 'pr_module',
          label: 'PR Module',
          icon: Award,
          children: prChildren,
        }] : []),
        ...(salesChildren.length > 0 ? [{
          id: 'sales_module',
          label: 'Sales Module',
          icon: PhoneCall,
          children: salesChildren,
        }] : []),
        ...(webdevChildren.length > 0 ? [{
          id: 'webdev_module',
          label: 'Web Dev Module',
          icon: Code2,
          children: webdevChildren,
        }] : []),
        ...(hrChildren.length > 0 ? [{
          id: 'hr_module',
          label: 'HR Module',
          icon: Users,
          children: hrChildren,
        }] : []),
        {
          id: 'reports',
          label: 'Reports',
          icon: Trophy,
          children: [
            { 
              id: 'org_leaderboard', 
              label: 'Company Leaderboard',
              badge: 'All Staff',
              badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono',
            },
          ],
        },
        ...(isSuperAdmin ? [{
          id: 'settings',
          label: 'Settings',
          icon: Shield,
          children: [
            {
              id: 'super_admin_panel',
              label: 'Super Admin Console',
              badge: 'Root Access',
              badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold',
            },
          ],
        }] : []),
      ];
    }

    if (currentUser.role === 'teacher') {
      const customItems: SubNavItem[] = [];
      if (currentUser.customFeatures?.includes('ppt_generator')) {
        customItems.push({ id: 'ppt_generator', label: 'PYQ PPT Generator' });
      }
      if (currentUser.customFeatures?.includes('thumbnail_studio')) {
        customItems.push({ id: 'thumbnail_generator', label: '16:9 Thumbnail Studio' });
      }

      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          directPageId: 'dashboard',
        },
        {
          id: 'academic',
          label: 'Academic Work',
          icon: GraduationCap,
          children: [
            { 
              id: 'recording_status', 
              label: 'Recording Status',
              badge: teacherActiveExtensions > 0 
                ? `${teacherActiveExtensions} Ext` 
                : (backlogInfo && backlogInfo.yesterdayUnfulfilledMinutes > 0 ? 'Backlog' : undefined),
              badgeColor: teacherActiveExtensions > 0 
                ? 'bg-purple-900/50 text-purple-300 border border-purple-700/60 font-bold' 
                : 'bg-amber-500/20 text-amber-300',
            },
            { 
              id: 'syllabus', 
              label: 'Syllabus & Topics',
              badge: teacherRevisionCount > 0 
                ? `${teacherRevisionCount} Revision` 
                : (teacherActionRequiredCount > 0 ? `${teacherActionRequiredCount} New` : undefined),
              badgeColor: teacherRevisionCount > 0 
                ? 'bg-rose-600 text-white font-black animate-pulse shadow-md shadow-rose-600/40' 
                : 'bg-amber-500/20 text-amber-300',
            },
            { id: 'lectures', label: 'Delivered Lectures' },
            { 
              id: 'resources', 
              label: 'Study Resources',
              badge: teacherResourcesCount > 0 ? `${teacherResourcesCount} Res` : undefined,
              badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold',
            },
            { 
              id: 'ppt_requests', 
              label: 'PYQ Slide Decks',
              badge: teacherPptReadyCount > 0 ? `${teacherPptReadyCount} Ready` : undefined,
            },
            { 
              id: 'directives', 
              label: 'Admin Directives',
              badge: teacherUnacknowledgedDirectivesCount > 0 ? `${teacherUnacknowledgedDirectivesCount} New` : undefined,
              badgeColor: 'bg-amber-500/20 text-amber-300 font-bold',
            },
            {
              id: 'hr_tasks',
              label: 'HR Tasks & Points',
              badge: myPendingHrTasksCount > 0 ? `${myPendingHrTasksCount} Task` : (currentUser.hrPoints ? `+${currentUser.hrPoints}p` : undefined),
              badgeColor: myPendingHrTasksCount > 0 ? 'bg-pink-500/20 text-pink-300 font-bold' : 'bg-emerald-500/20 text-emerald-300 font-mono font-bold',
            },
          ],
        },
        {
          id: 'finance',
          label: 'Finance',
          icon: Wallet,
          children: [
            { 
              id: 'wallet', 
              label: 'Time Wallet',
              badge: teacherWalletInfo && teacherWalletInfo.balance > 0 
                ? `+${teacherWalletInfo.balance}m` 
                : undefined,
              badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold',
            },
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: Trophy,
          children: [
            { 
              id: 'org_leaderboard', 
              label: 'Company Leaderboard',
              badge: 'Honor Roll',
              badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold',
            },
          ],
        },
        ...(customItems.length > 0 ? [{
          id: 'custom_sections',
          label: 'Custom Sections',
          icon: Sparkles,
          children: customItems,
        }] : []),
      ];
    }

    if (currentUser.role === 'pr_intern' || currentUser.role === 'pr_head') {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          directPageId: 'pr_dashboard',
        },
        {
          id: 'pr_ops',
          label: 'PR Operations',
          icon: Award,
          children: [
            { 
              id: 'pr_tasks', 
              label: 'Tasks & XP',
              badge: prPendingTasksCount > 0 ? `${prPendingTasksCount} New` : undefined,
              badgeColor: 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 font-mono',
            },
            { id: 'pr_leads', label: 'Leads Pipeline' },
            { id: 'pr_mou_maker', label: 'MoU Agreements' },
            { id: 'pr_earnings', label: 'My Earnings' },
            {
              id: 'hr_tasks',
              label: 'HR Tasks & Points',
              badge: myPendingHrTasksCount > 0 ? `${myPendingHrTasksCount} Task` : (currentUser.hrPoints ? `+${currentUser.hrPoints}p` : undefined),
              badgeColor: myPendingHrTasksCount > 0 ? 'bg-pink-500/20 text-pink-300 font-bold' : 'bg-emerald-500/20 text-emerald-300 font-mono font-bold',
            },
            ...(currentUser.role === 'pr_head' ? [{ id: 'pr_team', label: 'PR Team Roster' }] : []),
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: Trophy,
          children: [
            { id: 'org_leaderboard', label: 'Company Leaderboard' },
          ],
        },
      ];
    }

    if (currentUser.role === 'web_dev_manager') {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          directPageId: 'wdm_my_tasks',
        },
        {
          id: 'sprints',
          label: 'Sprints & Work',
          icon: Code2,
          children: [
            { 
              id: 'wdm_review', 
              label: 'Review Desk',
              badge: wdmPendingReviews > 0 ? `${wdmPendingReviews} Pending` : undefined,
              badgeColor: 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30',
            },
            { id: 'wdm_tasks', label: 'All Tasks' },
            { id: 'wdm_projects', label: 'Projects & Roadmap' },
            { 
              id: 'wdm_bounties', 
              label: 'Bounties Desk',
              badge: wdmOpenBounties > 0 ? `${wdmOpenBounties} Open` : undefined,
              badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold',
            },
            { id: 'wdm_awards', label: 'Award & XP Thresholds' },
            { id: 'wdm_team', label: 'Engineering Roster' },
            { id: 'wdm_audit', label: 'Audit Trail' },
            {
              id: 'hr_tasks',
              label: 'HR Tasks & Points',
              badge: myPendingHrTasksCount > 0 ? `${myPendingHrTasksCount} Task` : (currentUser.hrPoints ? `+${currentUser.hrPoints}p` : undefined),
              badgeColor: myPendingHrTasksCount > 0 ? 'bg-pink-500/20 text-pink-300 font-bold' : 'bg-emerald-500/20 text-emerald-300 font-mono font-bold',
            },
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: Trophy,
          children: [
            { id: 'org_leaderboard', label: 'Company Leaderboard' },
          ],
        },
      ];
    }

    if (currentUser.role === 'web_developer') {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          directPageId: 'dev_tasks',
        },
        {
          id: 'engineering',
          label: 'Engineering Work',
          icon: Code2,
          children: [
            { id: 'dev_projects', label: 'Projects Roadmap' },
            { 
              id: 'dev_bounties', 
              label: 'Open Bounties',
              badge: wdmOpenBounties > 0 ? `${wdmOpenBounties} New` : undefined,
              badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold',
            },
            { id: 'dev_achievements', label: 'Achievements & Badges' },
            { id: 'dev_rewards', label: 'Awards & Certificates' },
            { id: 'dev_ledger', label: 'XP Ledger' },
            { id: 'dev_team', label: 'Team & Kudos' },
            {
              id: 'hr_tasks',
              label: 'HR Tasks & Points',
              badge: myPendingHrTasksCount > 0 ? `${myPendingHrTasksCount} Task` : (currentUser.hrPoints ? `+${currentUser.hrPoints}p` : undefined),
              badgeColor: myPendingHrTasksCount > 0 ? 'bg-pink-500/20 text-pink-300 font-bold' : 'bg-emerald-500/20 text-emerald-300 font-mono font-bold',
            },
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: Trophy,
          children: [
            { id: 'org_leaderboard', label: 'Company Leaderboard' },
          ],
        },
      ];
    }

    if (currentUser.role === 'hr') {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          directPageId: 'hr_dashboard',
        },
        {
          id: 'hr_ops',
          label: 'HR Operations',
          icon: Users,
          children: [
            { id: 'hr_tasks', label: 'Allot & Manage Tasks' },
            {
              id: 'hr_submissions',
              label: 'Check Submissions',
              badge: hrPendingSubmissionsCount > 0 ? `${hrPendingSubmissionsCount} Sub` : undefined,
              badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono animate-pulse',
            },
            { id: 'hr_members', label: 'Allotted Teams & Points' },
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: Trophy,
          children: [
            { id: 'org_leaderboard', label: 'Company Leaderboard' },
          ],
        },
      ];
    }

    // Sales role
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: PhoneCall,
        directPageId: 'sales_crm',
        badge: myTodayCallsDueCount > 0 ? `${myTodayCallsDueCount} Due` : (myAssignedLeads.length > 0 ? `${myAssignedLeads.length} Leads` : undefined),
        badgeColor: myTodayCallsDueCount > 0 
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono animate-pulse' 
          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono',
      },
      {
        id: 'sales_ops',
        label: 'Sales & HR Work',
        icon: Users,
        children: [
          {
            id: 'hr_tasks',
            label: 'HR Tasks & Points',
            badge: myPendingHrTasksCount > 0 ? `${myPendingHrTasksCount} Task` : (currentUser.hrPoints ? `+${currentUser.hrPoints}p` : undefined),
            badgeColor: myPendingHrTasksCount > 0 ? 'bg-pink-500/20 text-pink-300 font-bold' : 'bg-emerald-500/20 text-emerald-300 font-mono font-bold',
          },
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: Trophy,
        children: [
          { id: 'org_leaderboard', label: 'Company Leaderboard' },
        ],
      },
    ];
  }, [
    currentUser,
    isSuperAdmin,
    pendingApprovalsCount,
    adminRemarkStats,
    adminActiveExtensions,
    adminPptRequestsQueueCount,
    adminPrSubmissionsCount,
    adminHrSubmissionsCount,
    hrPendingSubmissionsCount,
    myPendingHrTasksCount,
    adminTodayCallsDueCount,
    allSalesLeads.length,
    teacherActiveExtensions,
    backlogInfo,
    teacherRevisionCount,
    teacherActionRequiredCount,
    teacherResourcesCount,
    teacherPptReadyCount,
    teacherUnacknowledgedDirectivesCount,
    teacherWalletInfo,
    prPendingTasksCount,
    wdmMyActiveTasks,
    wdmPendingReviews,
    wdmOpenBounties,
    devActiveTasks,
    myTodayCallsDueCount,
    myAssignedLeads.length,
  ]);

  // Keep the category containing currentPage expanded automatically
  useEffect(() => {
    const activeCat = navCategories.find((cat: NavCategory) =>
      cat.children?.some((child: SubNavItem) => child.id === currentPage)
    );
    if (activeCat) {
      setExpandedCategories((prev) => ({
        ...prev,
        [activeCat.id]: true,
      }));
    }
  }, [currentPage, navCategories]);

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

        {/* MIDDLE NAVIGATION ITEMS - Clean, Sleek Tree View (Matches Reference Screenshot) */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navCategories.map((cat) => {
            const Icon = cat.icon;
            const hasChildren = Boolean(cat.children && cat.children.length > 0);
            const isDirectActive = cat.directPageId === currentPage;
            const hasActiveChild = Boolean(cat.children?.some((child: SubNavItem) => child.id === currentPage));
            const isExpanded = Boolean(expandedCategories[cat.id]);

            if (!hasChildren) {
              // Direct Top-Level Link (e.g. Dashboard - No Chevron)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => cat.directPageId && handleNavClick(cat.directPageId)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer group ${
                    isDirectActive
                      ? 'text-white font-semibold bg-slate-800/80 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isDirectActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />
                    <span className="truncate">{cat.label}</span>
                  </div>

                  {cat.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cat.badgeColor || 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            }

            // Expandable Category (e.g. Teacher Module, PR Module, Reports, Settings)
            return (
              <div key={cat.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer group ${
                    hasActiveChild
                      ? 'text-white font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      hasActiveChild ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />
                    <span className="truncate">{cat.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {cat.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cat.badgeColor || 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {cat.badge}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                </button>

                {/* Sub-items with clean vertical guide line (like screenshot) */}
                {isExpanded && cat.children && (
                  <div className="relative pl-7 ml-3 my-1 space-y-0.5 animate-in fade-in duration-150">
                    {/* The sleek vertical guide line */}
                    <div className="absolute left-2.5 top-1 bottom-1 w-[2px] bg-slate-700/60 rounded-full" />

                    {cat.children.map((child: SubNavItem) => {
                      const isChildActive = currentPage === child.id;
                      const requiredPerm = ADMIN_PAGE_PERMISSIONS[child.id];
                      const isRestricted =
                        currentUser.role === 'admin' &&
                        currentUser.adminTier &&
                        currentUser.adminTier !== 'super_admin' &&
                        Array.isArray(currentUser.adminPermissions) &&
                        requiredPerm &&
                        !currentUser.adminPermissions.includes(requiredPerm as any);

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleNavClick(child.id)}
                          className={`w-full text-left py-1.5 px-2.5 rounded-lg text-[13px] transition-colors cursor-pointer flex items-center justify-between ${
                            isChildActive
                              ? 'text-white font-semibold bg-slate-800/70 shadow-sm'
                              : isRestricted
                              ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/20 opacity-75'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30 font-normal'
                          }`}
                          title={isRestricted ? `${child.label} (Access Restricted)` : child.label}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{child.label}</span>
                            {isRestricted && (
                              <Lock className="w-3 h-3 text-amber-500/70 shrink-0 inline ml-1" />
                            )}
                          </div>

                          {child.badge && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                              child.badgeColor || 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {child.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* BOTTOM USER PROFILE & LOGOUT */}
        <div className="p-4 border-t border-slate-800/60 space-y-3 text-xs">
          {(currentUser.role === 'pr_intern' || currentUser.role === 'pr_head') && (
            <div className="space-y-2">
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{currentUser.role === 'pr_head' ? 'PR Tier:' : 'Intern Tier:'}</span>
                  <span className="font-extrabold text-amber-300 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    {currentUser.prTier || 'Silver'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Take-Home Share:</span>
                  <span className="font-bold text-emerald-400">
                    {StorageService.getTierCommissionRate(currentUser.prTier || 'Silver', currentUser)}%
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
