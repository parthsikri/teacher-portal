import React, { useState, useMemo, useEffect } from 'react';
import type {
  User,
  HrTeamCategory,
  HrTask,
  HrTaskPriority,
  HrTaskStatus,
  HrPointLog,
} from '../../types';
import { StorageService } from '../../services/storage';
import {
  Users,
  ClipboardCheck,
  Award,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Send,
  Trash2,
  ShieldCheck,
  GraduationCap,
  PhoneCall,
  Code2,
  Sparkles,
  Check,
  X,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';

interface HrPortalViewProps {
  currentUser: User;
  currentPage: string;
  onPageChange?: (page: string) => void;
  onOpenOnboardHr?: () => void;
  refreshTrigger?: number;
}

export const TEAM_CATEGORY_META: Record<
  HrTeamCategory,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
    cardClass: string;
  }
> = {
  teacher: {
    label: 'Teacher / Academic Team',
    shortLabel: 'Teacher Team',
    icon: GraduationCap,
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    cardClass: 'border-purple-500/40 bg-purple-950/20',
  },
  pr: {
    label: 'PR & Sponsorship Team',
    shortLabel: 'PR Team',
    icon: Award,
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    cardClass: 'border-amber-500/40 bg-amber-950/20',
  },
  sales: {
    label: 'Sales & Admissions Team',
    shortLabel: 'Sales Team',
    icon: PhoneCall,
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    cardClass: 'border-blue-500/40 bg-blue-950/20',
  },
  web_dev: {
    label: 'Web Dev & Engineering Team',
    shortLabel: 'Web Dev Team',
    icon: Code2,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    cardClass: 'border-emerald-500/40 bg-emerald-950/20',
  },
};

export const HrPortalView: React.FC<HrPortalViewProps> = ({
  currentUser,
  currentPage,
  onPageChange,
  onOpenOnboardHr,
  refreshTrigger,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [hrTasks, setHrTasks] = useState<HrTask[]>(() => StorageService.getHrTasks());
  const [pointLogs, setPointLogs] = useState<HrPointLog[]>(() => StorageService.getHrPointLogs());

  // Active sub-tab ('tasks' | 'submissions' | 'members' | 'admin_allocation')
  const [activeTab, setActiveTab] = useState<'tasks' | 'submissions' | 'members' | 'admin_allocation'>(() => {
    if (currentPage === 'hr_submissions') return 'submissions';
    if (currentPage === 'hr_members') return 'members';
    if (isAdmin && currentPage === 'admin_hr') return 'admin_allocation';
    return 'tasks';
  });

  useEffect(() => {
    if (currentPage === 'hr_submissions') setActiveTab('submissions');
    else if (currentPage === 'hr_members') setActiveTab('members');
    else if (currentPage === 'hr_tasks' || currentPage === 'hr_dashboard') setActiveTab('tasks');
  }, [currentPage]);

  const reloadAll = () => {
    setUsers(StorageService.getUsers());
    setHrTasks(StorageService.getHrTasks());
    setPointLogs(StorageService.getHrPointLogs());
  };

  useEffect(() => {
    reloadAll();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleStorageUpdate = () => reloadAll();
    window.addEventListener('aew_users_updated', handleStorageUpdate);
    window.addEventListener('portal_storage_update', handleStorageUpdate);
    window.addEventListener('aew_cloud_data_synced', handleStorageUpdate);
    return () => {
      window.removeEventListener('aew_users_updated', handleStorageUpdate);
      window.removeEventListener('portal_storage_update', handleStorageUpdate);
      window.removeEventListener('aew_cloud_data_synced', handleStorageUpdate);
    };
  }, []);

  // Fresh HR User record
  const freshCurrentUser = useMemo(() => {
    return (
      users.find(
        (u) =>
          u.id === currentUser.id ||
          u.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase()
      ) || currentUser
    );
  }, [users, currentUser]);

  // All HR Managers in the organization (for Admin Allocation Panel)
  const hrManagers = useMemo(() => {
    return users.filter((u) => u.role === 'hr' && !u.isOffboarded);
  }, [users]);

  // All non-admin, non-HR staff across all 4 teams
  const allTeamStaff = useMemo(() => {
    return users.filter((u) => !u.isOffboarded && u.role !== 'admin' && u.role !== 'hr');
  }, [users]);

  // Members allotted to the current user (HR sees only Admin-allotted members; Admin sees all)
  const allottedMembers = useMemo(() => {
    return StorageService.getAllottedMembersForHr(freshCurrentUser);
  }, [freshCurrentUser, users]);

  const allottedMemberIdSet = useMemo(() => {
    return new Set(allottedMembers.map((m) => m.teacherId.toUpperCase()));
  }, [allottedMembers]);

  // Tasks visible to this HR (tasks assigned to allotted members or created by this HR; Admin sees all)
  const visibleTasks = useMemo(() => {
    if (isAdmin) return hrTasks;
    return hrTasks.filter(
      (t) =>
        allottedMemberIdSet.has(t.assignedToId.toUpperCase()) ||
        t.assignedByHrId.toUpperCase() === freshCurrentUser.teacherId.toUpperCase()
    );
  }, [isAdmin, hrTasks, allottedMemberIdSet, freshCurrentUser]);

  // ─── ADMIN HR ALLOCATION CONTROL STATE ──────────────────────────────────────
  const [selectedHrForAllocationId, setSelectedHrForAllocationId] = useState<string>('');
  const [allocTeams, setAllocTeams] = useState<HrTeamCategory[]>([]);
  const [allocMemberIds, setAllocMemberIds] = useState<string[]>([]);
  const [allocTitle, setAllocTitle] = useState<string>('');
  const [allocSearchQuery, setAllocSearchQuery] = useState<string>('');
  const [allocTeamFilter, setAllocTeamFilter] = useState<'all' | HrTeamCategory>('all');
  const [allocSaveBanner, setAllocSaveBanner] = useState<string | null>(null);
  const [showHrPasswords, setShowHrPasswords] = useState<boolean>(true);

  const selectedHrManager = useMemo(() => {
    if (!hrManagers.length) return null;
    return (
      hrManagers.find((h) => h.teacherId === selectedHrForAllocationId || h.id === selectedHrForAllocationId) ||
      hrManagers[0]
    );
  }, [hrManagers, selectedHrForAllocationId]);

  useEffect(() => {
    if (selectedHrManager) {
      setSelectedHrForAllocationId(selectedHrManager.teacherId);
      setAllocTeams(selectedHrManager.hrAssignedTeams || []);
      setAllocMemberIds((selectedHrManager.hrAssignedMemberIds || []).map((id) => id.toUpperCase()));
      setAllocTitle(selectedHrManager.hrTitle || 'HR Operations Lead');
    }
  }, [selectedHrManager?.teacherId]);

  const handleToggleAllocTeam = (team: HrTeamCategory) => {
    setAllocTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  };

  const handleToggleAllocMember = (teacherId: string) => {
    const clean = teacherId.toUpperCase();
    setAllocMemberIds((prev) =>
      prev.includes(clean) ? prev.filter((id) => id !== clean) : [...prev, clean]
    );
  };

  const handleSaveHrAllocation = () => {
    if (!selectedHrManager) return;
    StorageService.updateHrAllocation(
      selectedHrManager.teacherId,
      allocTeams,
      allocMemberIds,
      allocTitle
    );
    reloadAll();
    setAllocSaveBanner(`Saved team & member allocation for ${selectedHrManager.name} (${selectedHrManager.teacherId})!`);
    setTimeout(() => setAllocSaveBanner(null), 3500);
  };

  // ─── CREATE / ALLOT NEW TASK STATE ──────────────────────────────────────────
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<HrTaskPriority>('high');
  const [taskDeadline, setTaskDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return StorageService.toLocalDateKey(d);
  });
  const [taskMaxPoints, setTaskMaxPoints] = useState<number>(50);
  const [taskTeamFilter, setTaskTeamFilter] = useState<'all' | HrTeamCategory>('all');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [taskToast, setTaskToast] = useState<string | null>(null);

  const filteredAssignableMembers = useMemo(() => {
    if (taskTeamFilter === 'all') return allottedMembers;
    return allottedMembers.filter(
      (m) => StorageService.getRoleTeamCategory(m.role) === taskTeamFilter
    );
  }, [allottedMembers, taskTeamFilter]);

  const handleToggleAssignee = (teacherId: string) => {
    const clean = teacherId.toUpperCase();
    setSelectedAssigneeIds((prev) =>
      prev.includes(clean) ? prev.filter((id) => id !== clean) : [...prev, clean]
    );
  };

  const handleSelectAllFilteredAssignees = () => {
    const ids = filteredAssignableMembers.map((m) => m.teacherId.toUpperCase());
    setSelectedAssigneeIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || selectedAssigneeIds.length === 0) return;

    const created = StorageService.createHrTasks({
      title: taskTitle,
      description: taskDesc,
      targetMemberIds: selectedAssigneeIds,
      priority: taskPriority,
      deadlineDate: taskDeadline,
      maxPoints: taskMaxPoints,
      assignedByUser: freshCurrentUser,
    });

    reloadAll();
    setTaskTitle('');
    setTaskDesc('');
    setSelectedAssigneeIds([]);
    setShowCreateTaskForm(false);
    setTaskToast(`Allotted "${taskTitle}" to ${created.length} team member(s)!`);
    setTimeout(() => setTaskToast(null), 3500);
  };

  // ─── REVIEW SUBMISSION & AWARD POINTS STATE ─────────────────────────────────
  const [reviewingTask, setReviewingTask] = useState<HrTask | null>(null);
  const [awardPointsInput, setAwardPointsInput] = useState<number>(50);
  const [hrFeedbackInput, setHrFeedbackInput] = useState<string>('');

  const openReviewModal = (task: HrTask) => {
    setReviewingTask(task);
    setAwardPointsInput(task.awardedPoints !== undefined ? task.awardedPoints : task.maxPoints);
    setHrFeedbackInput(task.hrFeedback || '');
  };

  const handleReviewDecision = (decision: 'approved' | 'revision_requested') => {
    if (!reviewingTask) return;
    StorageService.reviewHrTask({
      taskId: reviewingTask.id,
      decision,
      awardedPoints: decision === 'approved' ? awardPointsInput : 0,
      hrFeedback:
        hrFeedbackInput.trim() ||
        (decision === 'approved'
          ? 'Great work! Submission verified and points credited.'
          : 'Please revise and update your submission proof.'),
      reviewerUser: freshCurrentUser,
    });
    setReviewingTask(null);
    reloadAll();
    setTaskToast(
      decision === 'approved'
        ? `Approved submission & awarded +${awardPointsInput} HR Points to ${reviewingTask.assignedToName}!`
        : `Requested revision from ${reviewingTask.assignedToName}.`
    );
    setTimeout(() => setTaskToast(null), 3500);
  };

  // ─── DIRECT SPOT POINTS MODAL STATE ─────────────────────────────────────────
  const [spotPointsMember, setSpotPointsMember] = useState<User | null>(null);
  const [spotPointsAmount, setSpotPointsAmount] = useState<number>(25);
  const [spotPointsReason, setSpotPointsReason] = useState<string>('');

  const handleAwardSpotPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotPointsMember || !spotPointsAmount) return;

    StorageService.awardDirectHrPoints({
      employeeId: spotPointsMember.teacherId,
      points: spotPointsAmount,
      reason: spotPointsReason.trim() || 'HR Excellence & Team Contribution Bonus',
      awardedByUser: freshCurrentUser,
    });
    const memberName = spotPointsMember.name;
    const pts = spotPointsAmount;
    setSpotPointsMember(null);
    setSpotPointsReason('');
    reloadAll();
    setTaskToast(`Awarded +${pts} HR Points to ${memberName}!`);
    setTimeout(() => setTaskToast(null), 3500);
  };

  // ─── FILTERS FOR TASK LIST & MEMBERS ────────────────────────────────────────
  const [boardTeamFilter, setBoardTeamFilter] = useState<'all' | HrTeamCategory>('all');
  const [boardStatusFilter, setBoardStatusFilter] = useState<'all' | HrTaskStatus>('all');
  const [boardSearch, setBoardSearch] = useState('');

  const filteredTasks = useMemo(() => {
    return visibleTasks.filter((t) => {
      if (boardTeamFilter !== 'all' && t.teamCategory !== boardTeamFilter) return false;
      if (boardStatusFilter !== 'all' && t.status !== boardStatusFilter) return false;
      if (boardSearch.trim()) {
        const q = boardSearch.toLowerCase();
        const match =
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assignedToName.toLowerCase().includes(q) ||
          t.assignedToId.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [visibleTasks, boardTeamFilter, boardStatusFilter, boardSearch]);

  const submittedQueueTasks = useMemo(() => {
    return visibleTasks.filter((t) => t.status === 'submitted');
  }, [visibleTasks]);

  const totalPointsAwardedByScope = useMemo(() => {
    if (isAdmin) {
      return allTeamStaff.reduce((sum, u) => sum + (u.hrPoints || 0), 0);
    }
    return allottedMembers.reduce((sum, u) => sum + (u.hrPoints || 0), 0);
  }, [isAdmin, allTeamStaff, allottedMembers]);

  return (
    <div className="space-y-6 pb-12">
      {/* TOP HEADER BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {isAdmin ? 'ADMIN HR GOVERNANCE & ALLOCATION CONSOLE' : 'HR TASK & PERFORMANCE PORTAL'}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2.5">
              <Users className="w-6 h-6 text-pink-400" />
              <span>
                {isAdmin
                  ? 'HR Module — Team Allocation, Tasks & Points'
                  : `Welcome, ${freshCurrentUser.name}`}
              </span>
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              {isAdmin
                ? 'Control which teams and individual members are allotted to each HR manager, oversee cross-team task assignments, verify submissions, and award performance points.'
                : 'Allot tasks to your Admin-assigned teams & members, inspect deliverable submissions, and award HR performance points.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && onOpenOnboardHr && (
              <button
                type="button"
                onClick={onOpenOnboardHr}
                className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-600/25 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Onboard New HR</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setActiveTab('tasks');
                setShowCreateTaskForm(true);
              }}
              disabled={allottedMembers.length === 0}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Allot New Task</span>
            </button>
          </div>
        </div>

        {/* HR'S ADMIN-ALLOTTED TEAMS & SCOPE PILL BAR (When logged in as HR) */}
        {!isAdmin && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Admin-Allotted Scope:
              </span>
              {(freshCurrentUser.hrAssignedTeams || []).length === 0 &&
                (freshCurrentUser.hrAssignedMemberIds || []).length === 0 ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  No teams or members allotted by Admin yet
                </span>
              ) : (
                <>
                  {(freshCurrentUser.hrAssignedTeams || []).map((teamKey) => {
                    const meta = TEAM_CATEGORY_META[teamKey];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <span
                        key={teamKey}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${meta.badgeClass}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.shortLabel}
                      </span>
                    );
                  })}
                  {(freshCurrentUser.hrAssignedMemberIds || []).length > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold">
                      +{(freshCurrentUser.hrAssignedMemberIds || []).length} Specific Member(s)
                    </span>
                  )}
                </>
              )}
            </div>
            <span className="text-xs font-mono text-slate-400">
              Total Allotted Members: <strong className="text-slate-100">{allottedMembers.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* TOAST NOTIFICATION */}
      {(taskToast || allocSaveBanner) && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{taskToast || allocSaveBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setTaskToast(null);
              setAllocSaveBanner(null);
            }}
            className="text-emerald-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAdmin ? 'Total Team Staff' : 'Allotted Members'}</span>
            <Users className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{allottedMembers.length}</div>
          <div className="text-[11px] text-slate-500">
            {isAdmin ? `${hrManagers.length} HR Manager(s) Active` : 'Authorized by Admin'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Allotted Tasks</span>
            <ClipboardCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{visibleTasks.length}</div>
          <div className="text-[11px] text-slate-500">
            {visibleTasks.filter((t) => t.status === 'approved').length} Approved & Completed
          </div>
        </div>

        <div
          onClick={() => setActiveTab('submissions')}
          className="bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 space-y-1 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
            <span>Submissions to Check</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{submittedQueueTasks.length}</div>
          <div className="text-[11px] text-amber-400/80">Click to review & award points →</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
            <span>HR Points Awarded</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">+{totalPointsAwardedByScope}</div>
          <div className="text-[11px] text-slate-500">Across tasks & spot bonuses</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('admin_allocation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'admin_allocation'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin: Allot Teams & Members to HR ({hrManagers.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setActiveTab('tasks');
            if (!isAdmin && onPageChange) onPageChange('hr_tasks');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Allot & Manage Tasks ({visibleTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('submissions');
            if (!isAdmin && onPageChange) onPageChange('hr_submissions');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'submissions'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
        >
          <Clock className="w-4 h-4" />
          <span>Check Submissions</span>
          {submittedQueueTasks.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-mono">
              {submittedQueueTasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('members');
            if (!isAdmin && onPageChange) onPageChange('hr_members');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'members'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
        >
          <Award className="w-4 h-4" />
          <span>Allotted Teams & Give Points ({allottedMembers.length})</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 0 (ADMIN ONLY): ALLOT TEAMS & SPECIFIC MEMBERS TO EACH HR
         ═══════════════════════════════════════════════════════════════════════════ */}
      {isAdmin && activeTab === 'admin_allocation' && (
        <div className="space-y-6">
          {hrManagers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-100">No HR Managers Onboarded Yet</h3>
                <p className="text-xs text-slate-400">
                  Onboard your first HR Manager to allot specific teams (Teacher, PR, Sales, Web Dev) or individual employees to them.
                </p>
              </div>
              {onOpenOnboardHr && (
                <button
                  type="button"
                  onClick={onOpenOnboardHr}
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Onboard First HR Manager</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: HR MANAGERS LIST */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    1. Select HR Manager ({hrManagers.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowHrPasswords(!showHrPasswords)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showHrPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showHrPasswords ? 'Hide Passwords' : 'Show Passwords'}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {hrManagers.map((hr) => {
                    const isSelected = selectedHrManager?.teacherId === hr.teacherId;
                    const hrAllottedCount = StorageService.getAllottedMembersForHr(hr).length;
                    const readablePass = StorageService.getReadablePassword(hr);
                    return (
                      <div
                        key={hr.id}
                        onClick={() => setSelectedHrForAllocationId(hr.teacherId)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${isSelected
                            ? 'bg-pink-950/25 border-pink-500 ring-1 ring-pink-500/40 shadow-lg'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-100">{hr.name}</span>
                              <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold">
                                {hr.teacherId}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {hr.hrTitle || hr.subject || 'HR Operations Lead'}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                              Configuring
                            </span>
                          )}
                        </div>

                        {/* Credentials pill */}
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">
                            User: <strong className="text-indigo-300">{hr.username}</strong>
                          </span>
                          <span className="text-slate-400">
                            Pass:{' '}
                            <strong className="text-emerald-300">
                              {showHrPasswords ? readablePass : '••••••'}
                            </strong>
                          </span>
                        </div>

                        {/* Allotted summary badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {(hr.hrAssignedTeams || []).map((tKey) => (
                            <span
                              key={tKey}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${TEAM_CATEGORY_META[tKey]?.badgeClass}`}
                            >
                              {TEAM_CATEGORY_META[tKey]?.shortLabel}
                            </span>
                          ))}
                          {(hr.hrAssignedMemberIds || []).length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                              +{hr.hrAssignedMemberIds?.length} Individual
                            </span>
                          )}
                          <span className="ml-auto text-[11px] font-bold text-pink-300">
                            {hrAllottedCount} Members Total
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: TEAM & MEMBER ALLOCATION MATRIX FOR SELECTED HR */}
              {selectedHrManager && (
                <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-pink-400 uppercase">
                        ADMIN CONTROL: TEAM & MEMBER ALLOCATION
                      </div>
                      <h3 className="text-lg font-black text-slate-100">
                        Allot Teams & Members to {selectedHrManager.name} ({selectedHrManager.teacherId})
                      </h3>
                      <p className="text-xs text-slate-400">
                        Select entire department teams and/or cherry-pick individual members below. This HR will only be able to allot tasks and points to the teams & members you select here.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveHrAllocation}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save HR Allocation</span>
                    </button>
                  </div>

                  {/* Step A: Whole Team Allocation Checkboxes */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        A. Allot Entire Department Teams (Click to toggle team access)
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setAllocTeams(['teacher', 'pr', 'sales', 'web_dev'])}
                          className="text-indigo-400 hover:underline cursor-pointer"
                        >
                          Allot All 4 Teams
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => setAllocTeams([])}
                          className="text-slate-400 hover:underline cursor-pointer"
                        >
                          Clear Teams
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(['teacher', 'pr', 'sales', 'web_dev'] as HrTeamCategory[]).map((teamKey) => {
                        const meta = TEAM_CATEGORY_META[teamKey];
                        const Icon = meta.icon;
                        const isChecked = allocTeams.includes(teamKey);
                        const teamCount = allTeamStaff.filter(
                          (u) => StorageService.getRoleTeamCategory(u.role) === teamKey
                        ).length;

                        return (
                          <div
                            key={teamKey}
                            onClick={() => handleToggleAllocTeam(teamKey)}
                            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isChecked
                                ? `${meta.cardClass} text-slate-100 shadow-md`
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { }}
                                className="rounded border-slate-700 text-pink-600 focus:ring-0 pointer-events-none"
                              />
                              <div>
                                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                  <Icon className="w-4 h-4" />
                                  <span>{meta.label}</span>
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {teamCount} active member(s) in team
                                </div>
                              </div>
                            </div>
                            {isChecked && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                Allotted
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step B: Specific Individual Member Allocation */}
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-200">
                          B. Allot Specific Individual Members ({allocMemberIds.length} Specifically Selected)
                        </label>
                        <p className="text-[11px] text-slate-400">
                          You can also assign specific members from any team even if the whole team is not checked above.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search member..."
                            value={allocSearchQuery}
                            onChange={(e) => setAllocSearchQuery(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                          />
                        </div>
                        <select
                          value={allocTeamFilter}
                          onChange={(e) => setAllocTeamFilter(e.target.value as any)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                        >
                          <option value="all">All Teams</option>
                          <option value="teacher">Teacher Team</option>
                          <option value="pr">PR Team</option>
                          <option value="sales">Sales Team</option>
                          <option value="web_dev">Web Dev Team</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                      {allTeamStaff
                        .filter((m) => {
                          const cat = StorageService.getRoleTeamCategory(m.role);
                          if (allocTeamFilter !== 'all' && cat !== allocTeamFilter) return false;
                          if (allocSearchQuery.trim()) {
                            const q = allocSearchQuery.toLowerCase();
                            return (
                              m.name.toLowerCase().includes(q) ||
                              m.teacherId.toLowerCase().includes(q) ||
                              m.department.toLowerCase().includes(q)
                            );
                          }
                          return true;
                        })
                        .map((member) => {
                          const cat = StorageService.getRoleTeamCategory(member.role) || 'teacher';
                          const coveredByTeam = allocTeams.includes(cat);
                          const explicitlyChecked = allocMemberIds.includes(member.teacherId.toUpperCase());
                          const isEffective = coveredByTeam || explicitlyChecked;

                          return (
                            <div
                              key={member.id}
                              onClick={() => handleToggleAllocMember(member.teacherId)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${isEffective
                                  ? 'bg-slate-950 border-pink-500/50 text-slate-100'
                                  : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isEffective}
                                  onChange={() => { }}
                                  className="rounded border-slate-700 text-pink-600 focus:ring-0 pointer-events-none"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-200 truncate">
                                    {member.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                                    <span>{member.teacherId}</span>
                                    <span>•</span>
                                    <span>{TEAM_CATEGORY_META[cat]?.shortLabel}</span>
                                  </div>
                                </div>
                              </div>
                              {coveredByTeam ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-semibold shrink-0">
                                  Via Team
                                </span>
                              ) : explicitlyChecked ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold shrink-0">
                                  Individual
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleSaveHrAllocation}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save Allocation for {selectedHrManager.name}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 1: ALLOT & MANAGE TASKS
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tasks' && (
        <div className="space-y-5">
          {/* ALLOT NEW TASK COLLAPSIBLE FORM */}
          {showCreateTaskForm && (
            <form
              onSubmit={handleCreateTaskSubmit}
              className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    <span>Allot New HR Task to Team / Members</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select one or more allotted team members, set the task instructions, deadline, and maximum points.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateTaskForm(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-300">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Complete Weekly Progress Report / Deliver 5 Campus Leads / Update Module Docs"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Max Points *</label>
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      step={5}
                      value={taskMaxPoints}
                      onChange={(e) => setTaskMaxPoints(parseInt(e.target.value) || 50)}
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2.5 text-xs text-emerald-300 font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as HrTaskPriority)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Task Description & Submission Requirements
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe what the employee needs to complete and what proof link or summary they should submit..."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Submission Deadline</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Target Team & Member Picker */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-200">
                      Select Allotted Team / Members ({selectedAssigneeIds.length} Selected):
                    </label>
                    {(['all', 'teacher', 'pr', 'sales', 'web_dev'] as const).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTaskTeamFilter(tf)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${taskTeamFilter === tf
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                      >
                        {tf === 'all' ? 'All Allotted' : TEAM_CATEGORY_META[tf].shortLabel}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllFilteredAssignees}
                      className="text-indigo-400 hover:underline font-semibold cursor-pointer"
                    >
                      Select All Shown ({filteredAssignableMembers.length})
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAssigneeIds([])}
                      className="text-slate-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {filteredAssignableMembers.map((member) => {
                    const isSel = selectedAssigneeIds.includes(member.teacherId.toUpperCase());
                    const cat = StorageService.getRoleTeamCategory(member.role) || 'teacher';
                    return (
                      <div
                        key={member.id}
                        onClick={() => handleToggleAssignee(member.teacherId)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${isSel
                            ? 'bg-indigo-950/40 border-indigo-500 text-slate-100'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => { }}
                          className="rounded border-slate-700 text-indigo-600 pointer-events-none"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 truncate">{member.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {member.teacherId} • {TEAM_CATEGORY_META[cat]?.shortLabel}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!taskTitle.trim() || selectedAssigneeIds.length === 0}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Allot Task to {selectedAssigneeIds.length} Member(s)</span>
                </button>
              </div>
            </form>
          )}

          {/* FILTER BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'teacher', 'pr', 'sales', 'web_dev'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setBoardTeamFilter(tf)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${boardTeamFilter === tf
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                >
                  {tf === 'all' ? 'All Teams' : TEAM_CATEGORY_META[tf].shortLabel}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={boardStatusFilter}
                onChange={(e) => setBoardStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Completion</option>
                <option value="submitted">Submitted (Needs Review)</option>
                <option value="approved">Approved & Points Given</option>
                <option value="revision_requested">Revision Requested</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search task or member..."
                  value={boardSearch}
                  onChange={(e) => setBoardSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* TASKS LIST */}
          {filteredTasks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <ClipboardCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No HR Tasks Found</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click "Allot New Task" above to assign tasks with points to your allotted teams and members.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task) => {
                const teamMeta = TEAM_CATEGORY_META[task.teamCategory] || TEAM_CATEGORY_META.teacher;
                const TeamIcon = teamMeta.icon;
                return (
                  <div
                    key={task.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 flex flex-col justify-between transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${teamMeta.badgeClass}`}
                          >
                            <TeamIcon className="w-3 h-3" />
                            {teamMeta.shortLabel}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${task.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : task.status === 'submitted'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                  : task.status === 'revision_requested'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-300'
                              }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-black">
                            {task.status === 'approved' && task.awardedPoints !== undefined
                              ? `Awarded +${task.awardedPoints} pts`
                              : `${task.maxPoints} pts`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              StorageService.deleteHrTask(task.id);
                              reloadAll();
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-500">Assigned To: </span>
                          <strong className="text-slate-200">{task.assignedToName}</strong>{' '}
                          <span className="text-[10px] font-mono text-indigo-300">({task.assignedToId})</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">Due: {task.deadlineDate}</span>
                      </div>

                      {/* Submission proof preview if submitted or approved */}
                      {(task.submissionUrl || task.submissionNotes) && (
                        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5 text-xs">
                          <div className="font-bold text-amber-300 flex items-center justify-between">
                            <span>Employee Submission Proof</span>
                            {task.submittedAt && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {new Date(task.submittedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {task.submissionUrl && (
                            <a
                              href={task.submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 underline font-mono text-[11px] break-all"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span>{task.submissionUrl}</span>
                            </a>
                          )}
                          {task.submissionNotes && (
                            <p className="text-slate-300 text-[11px]">{task.submissionNotes}</p>
                          )}
                        </div>
                      )}

                      {task.hrFeedback && (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                          <span className="font-bold text-pink-300">HR Feedback: </span>
                          {task.hrFeedback}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        By {task.assignedByHrName} ({task.assignedByHrId})
                      </span>
                      <button
                        type="button"
                        onClick={() => openReviewModal(task)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${task.status === 'submitted'
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>
                          {task.status === 'submitted'
                            ? 'Check Submission & Give Points'
                            : task.status === 'approved'
                              ? 'Adjust Points / Feedback'
                              : 'Verify & Award Points'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 2: DEDICATED SUBMISSIONS REVIEW QUEUE
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-100">
                Employee Task Submissions Queue ({submittedQueueTasks.length} Awaiting Verification)
              </h3>
              <p className="text-xs text-slate-400">
                Inspect submitted proof links and notes from your allotted team members, then approve to credit HR points or request revisions.
              </p>
            </div>
          </div>

          {submittedQueueTasks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-slate-200">All Caught Up!</div>
              <p className="text-xs text-slate-500">
                There are no pending submissions waiting for your verification right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {submittedQueueTasks.map((task) => {
                const teamMeta = TEAM_CATEGORY_META[task.teamCategory] || TEAM_CATEGORY_META.teacher;
                return (
                  <div
                    key={task.id}
                    className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${teamMeta.badgeClass}`}>
                          {teamMeta.shortLabel}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {task.assignedToName} ({task.assignedToId})
                        </span>
                        <span className="text-[11px] font-mono text-emerald-300 font-bold">
                          Max Points: +{task.maxPoints} pts
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-100">{task.title}</h4>
                      {task.submissionUrl && (
                        <div className="text-xs">
                          <span className="text-slate-400 font-semibold">Proof Link: </span>
                          <a
                            href={task.submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:underline font-mono inline-flex items-center gap-1"
                          >
                            <span>{task.submissionUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {task.submissionNotes && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                          <span className="text-slate-500 font-bold block mb-0.5">Submission Notes:</span>
                          {task.submissionNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openReviewModal(task)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>Review & Give Points</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 3: ALLOTTED TEAMS & GIVE POINTS
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allottedMembers.map((member) => {
              const cat = StorageService.getRoleTeamCategory(member.role) || 'teacher';
              const meta = TEAM_CATEGORY_META[cat];
              const Icon = meta.icon;
              const memberTasks = visibleTasks.filter(
                (t) => t.assignedToId.toUpperCase() === member.teacherId.toUpperCase()
              );
              const completedCount = memberTasks.filter((t) => t.status === 'approved').length;

              return (
                <div
                  key={member.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{member.name}</h4>
                        <div className="text-[11px] font-mono text-slate-400">{member.teacherId}</div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.badgeClass}`}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.shortLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <div className="text-[10px] text-slate-500">HR Points</div>
                        <div className="text-sm font-black text-emerald-400 font-mono">
                          +{member.hrPoints || 0} pts
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <div className="text-[10px] text-slate-500">Tasks Done</div>
                        <div className="text-sm font-black text-slate-200 font-mono">
                          {completedCount} / {memberTasks.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssigneeIds([member.teacherId.toUpperCase()]);
                        setActiveTab('tasks');
                        setShowCreateTaskForm(true);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      + Allot Task
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSpotPointsMember(member);
                        setSpotPointsAmount(25);
                        setSpotPointsReason('');
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Give Points</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RECENT HR POINTS AUDIT LOG */}
          {pointLogs.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent HR Points Ledger
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pointLogs.slice(0, 20).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200">{log.employeeName}</span>{' '}
                      <span className="text-slate-500 font-mono text-[10px]">({log.employeeId})</span>
                      <div className="text-[11px] text-slate-400">{log.reason}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-emerald-400">+{log.points} pts</span>
                      <div className="text-[10px] text-slate-500">By {log.awardedByHrName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL: CHECK SUBMISSION & AWARD POINTS
         ═══════════════════════════════════════════════════════════════════════════ */}
      {reviewingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                  HR SUBMISSION VERIFICATION & POINTS
                </span>
                <h3 className="text-base font-black text-slate-100">{reviewingTask.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingTask(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Member: <strong className="text-slate-100">{reviewingTask.assignedToName}</strong> (
                  {reviewingTask.assignedToId})
                </span>
                <span className="font-mono text-emerald-300 font-bold">
                  Max Points: {reviewingTask.maxPoints} pts
                </span>
              </div>
              {reviewingTask.submissionUrl ? (
                <div>
                  <span className="text-slate-400 block mb-0.5">Submitted Proof URL:</span>
                  <a
                    href={reviewingTask.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline font-mono break-all inline-flex items-center gap-1"
                  >
                    <span>{reviewingTask.submissionUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              ) : (
                <div className="text-amber-300/80 italic">No external URL attached.</div>
              )}
              {reviewingTask.submissionNotes && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Employee Notes:</span>
                  <p className="text-slate-200">{reviewingTask.submissionNotes}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Points to Award (Base: {reviewingTask.maxPoints} pts)
                </label>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  value={awardPointsInput}
                  onChange={(e) => setAwardPointsInput(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-sm text-emerald-300 font-mono font-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">HR Feedback / Review Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Add appreciation notes or revision instructions..."
                  value={hrFeedbackInput}
                  onChange={(e) => setHrFeedbackInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleReviewDecision('revision_requested')}
                className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer"
              >
                Request Revision
              </button>
              <button
                type="button"
                onClick={() => handleReviewDecision('approved')}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Award +{awardPointsInput} Points</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL: GIVE DIRECT SPOT POINTS TO MEMBER
         ═══════════════════════════════════════════════════════════════════════════ */}
      {spotPointsMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAwardSpotPoints}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                  DIRECT HR PERFORMANCE POINTS
                </span>
                <h3 className="text-base font-black text-slate-100">
                  Award Points to {spotPointsMember.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSpotPointsMember(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Points to Award *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    max={1000}
                    value={spotPointsAmount}
                    onChange={(e) => setSpotPointsAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-slate-950 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-sm text-emerald-300 font-mono font-black focus:outline-none"
                  />
                  {[10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSpotPointsAmount(preset)}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 cursor-pointer"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Reason / Citation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outstanding weekly delivery & proactive communication"
                  value={spotPointsReason}
                  onChange={(e) => setSpotPointsReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSpotPointsMember(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Credit +{spotPointsAmount} Points</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
