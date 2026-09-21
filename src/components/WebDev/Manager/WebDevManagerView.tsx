import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Layers,
  Search,
  Plus,
  Shield,
  ThumbsUp,
  AlertTriangle,
  GitPullRequest,
  ExternalLink,
  Users,
  Briefcase,
  Target,
  FileText,
  Sparkles,
  CheckSquare,
  Gift,
  ShieldCheck,
  X,
  Trophy,
  Sliders,
  Edit2,
  Trash2,
  Building2,
  GraduationCap,
  Code2,
  UserPlus,
  UserMinus,
  Calendar,
  Crown,
  Clock,
  Copy,
  Check,
  Loader2,
  Mail,
  Send,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { notificationService } from '../../../services/notificationService';
import type {
  User,
  WebDevTask,
  WebDevProject,
  WebDevBounty,
  WebDevReward,
  WebDevRewardFulfillment,
  WebDevAuditLog,
  WebDevTeamChallenge,
} from '../../../types';
import { WebDevService, calculateLevelFromXp } from '../../../services/webDevService';
import { StorageService } from '../../../services/storage';
import { TaskDetailModal } from '../Common/TaskDetailModal';
import { CertificateModal } from '../Common/CertificateModal';
import { ProjectDetailModal } from '../Common/ProjectDetailModal';

interface WebDevManagerViewProps {
  currentUser: User;
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

export const WebDevManagerView: React.FC<WebDevManagerViewProps> = ({
  currentUser,
  currentPage = 'wdm_review',
  onPageChange,
}) => {
  const activeTab:
    | 'my_tasks'
    | 'review_desk'
    | 'tasks'
    | 'projects'
    | 'bounties'
    | 'awards'
    | 'team'
    | 'leaderboard'
    | 'audit' = (() => {
    if (currentPage === 'wdm_my_tasks') return 'my_tasks';
    if (currentPage === 'wdm_tasks') return 'tasks';
    if (currentPage === 'wdm_projects') return 'projects';
    if (currentPage === 'wdm_bounties') return 'bounties';
    if (currentPage === 'wdm_awards' || currentPage === 'wdm_fulfillments') return 'awards';
    if (currentPage === 'wdm_team') return 'team';
    if (currentPage === 'wdm_leaderboard') return 'leaderboard';
    if (currentPage === 'wdm_audit') return 'audit';
    return 'review_desk';
  })();

  // Data collections
  const [tasks, setTasks] = useState<WebDevTask[]>([]);
  const [projects, setProjects] = useState<WebDevProject[]>([]);
  const [bounties, setBounties] = useState<WebDevBounty[]>([]);
  const [rewards, setRewards] = useState<WebDevReward[]>([]);
  const [fulfillments, setFulfillments] = useState<WebDevRewardFulfillment[]>([]);
  const [auditLogs, setAuditLogs] = useState<WebDevAuditLog[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);

  // Task filtering & search
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>('all');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>('all');
  const [taskTimeFilter, setTaskTimeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // My Tasks state (Deliverables assigned to Manager by Admin)
  const [myTasksSearch, setMyTasksSearch] = useState('');
  const [myTasksFilter, setMyTasksFilter] = useState<'all' | 'in_progress' | 'review_requested' | 'completed' | 'blocked'>('all');

  // Modals state
  const [selectedTask, setSelectedTask] = useState<WebDevTask | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<{
    fulfillment: WebDevRewardFulfillment;
    reward?: WebDevReward;
  } | null>(null);

  // Review Desk Action State
  const [reviewingTask, setReviewingTask] = useState<WebDevTask | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'changes' | 'reject'>('approve');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [bonusXp, setBonusXp] = useState<number>(0);

  // Create Task Modal State
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskId, setNewTaskId] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskType, setNewTaskType] = useState<WebDevTask['type']>('feature');
  const [newTaskPriority, setNewTaskPriority] = useState<WebDevTask['priority']>('medium');
  const [newTaskXp, setNewTaskXp] = useState<number>(200);
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');

  // Manual Subtasks for Task Creation Modal
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Create Bounty Modal State
  const [showCreateBountyModal, setShowCreateBountyModal] = useState(false);
  const [newBountyTitle, setNewBountyTitle] = useState('');
  const [newBountyDesc, setNewBountyDesc] = useState('');
  const [newBountyXp, setNewBountyXp] = useState(200);
  const [newBountyDiff, setNewBountyDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newBountyCat, setNewBountyCat] = useState<'feature' | 'bugfix' | 'optimization' | 'security' | 'testing'>('feature');

  // Create Project Modal State with Milestones
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjKey, setNewProjKey] = useState('');
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjRepo, setNewProjRepo] = useState('');
  const [newProjTech, setNewProjTech] = useState('');
  const [newProjLead, setNewProjLead] = useState('');
  const [newProjTarget, setNewProjTarget] = useState('');

  // Milestones for Project Creation Modal
  const [newProjMilestones, setNewProjMilestones] = useState<
    Array<{ id: string; title: string; deadline: string; description?: string }>
  >([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDeadline, setNewMilestoneDeadline] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');

  // Add Milestone to Existing Project Modal State
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [selectedProjectForMilestone, setSelectedProjectForMilestone] = useState<WebDevProject | null>(null);
  const [selectedProject, setSelectedProject] = useState<WebDevProject | null>(null);
  const [addMilestoneTitle, setAddMilestoneTitle] = useState('');
  const [addMilestoneDeadline, setAddMilestoneDeadline] = useState('');
  const [addMilestoneDesc, setAddMilestoneDesc] = useState('');

  // Add Developer Modal State
  const [showAddDevModal, setShowAddDevModal] = useState(false);
  const [newDevName, setNewDevName] = useState('');
  const [newDevEmail, setNewDevEmail] = useState('');
  const [newDevUsername, setNewDevUsername] = useState('');
  const [newDevPassword, setNewDevPassword] = useState('dev123');
  const [newDevTitle, setNewDevTitle] = useState('Web Developer');
  const [newDevSkills, setNewDevSkills] = useState('');
  const [newDevRole, setNewDevRole] = useState<'web_developer' | 'web_dev_manager'>('web_developer');
  const [newDevPhone, setNewDevPhone] = useState('');
  const [createdDevSuccess, setCreatedDevSuccess] = useState<User | null>(null);
  const [devCopiedSuccess, setDevCopiedSuccess] = useState(false);
  const [devEmailSending, setDevEmailSending] = useState(false);
  const [devCloudSyncStatus, setDevCloudSyncStatus] = useState<'syncing' | 'synced' | 'error' | null>(null);
  const [devEmailDispatchResult, setDevEmailDispatchResult] = useState<{
    success: boolean;
    status: string;
    error?: string;
  } | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [manualSyncMsg, setManualSyncMsg] = useState<string | null>(null);

  // Leaderboard State
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'all_time'>('all_time');
  const [leaderboardDept, setLeaderboardDept] = useState<'all' | 'engineering' | 'faculty' | 'pr' | 'leadership'>('all');

  // Award Management State
  const [editingReward, setEditingReward] = useState<WebDevReward | null>(null);
  const [showCreateAwardModal, setShowCreateAwardModal] = useState(false);
  const [rewardFormTitle, setRewardFormTitle] = useState('');
  const [rewardFormCategory, setRewardFormCategory] = useState<'certificate' | 'swag' | 'perk' | 'title'>('certificate');
  const [rewardFormXp, setRewardFormXp] = useState<number>(500);
  const [rewardFormDesc, setRewardFormDesc] = useState('');
  const [rewardFormIcon, setRewardFormIcon] = useState('🏆');
  const [rewardFormPerk, setRewardFormPerk] = useState('');

  // Team Challenges Management State
  const [challenges, setChallenges] = useState<WebDevTeamChallenge[]>([]);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [chalTitle, setChalTitle] = useState('');
  const [chalDesc, setChalDesc] = useState('');
  const [chalGoalXp, setChalGoalXp] = useState(5000);
  const [chalReward, setChalReward] = useState('Team Swag & Recognition');
  const [chalEndDate, setChalEndDate] = useState('');

  const loadData = () => {
    const allTasks = WebDevService.getTasks();
    const allProjects = WebDevService.getProjects();
    const allBounties = WebDevService.getBounties();
    const allRewards = WebDevService.getRewards();
    const allFulfillments = WebDevService.getRewardFulfillments();
    const allLogs = WebDevService.getAuditLogs();
    const allChallenges = WebDevService.getChallenges();
    const devs = StorageService.getUsers().filter(
      (u) => u.role === 'web_developer' || u.role === 'web_dev_manager'
    );

    setTasks(allTasks);
    setProjects(allProjects);
    setBounties(allBounties);
    setRewards(allRewards);
    setFulfillments(allFulfillments);
    setAuditLogs(allLogs);
    setChallenges(allChallenges);
    setDevelopers(devs);
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('aew_webdev_tasks_synced', handleSync);
    window.addEventListener('aew_cloud_data_synced', handleSync);
    window.addEventListener('aew_users_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('aew_webdev_tasks_synced', handleSync);
      window.removeEventListener('aew_cloud_data_synced', handleSync);
      window.removeEventListener('aew_users_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Helper for cleanly formatting task deadline in Indian Standard Time (IST)
  const formatTaskDeadlineDisplay = (deadline?: string, dueDate?: string) => {
    const val = (deadline || dueDate || '').trim();
    if (!val) return 'No hard cutoff';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d} ${months[parseInt(m, 10) - 1]} ${y} (EOD)`;
    }
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return val;
    return dt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Quick deadline setter for Task creation modal
  const setQuickNewTaskDue = (hoursFromNow: number) => {
    const target = new Date();
    target.setHours(target.getHours() + hoursFromNow);
    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
    setNewTaskDue(localISOTime);
  };

  // Attention Center KPIs
  const pendingReviews = tasks.filter((t) => t.status === 'review_requested');
  const blockedTasks = tasks.filter((t) => t.isBlocked);
  const pendingFulfillments = fulfillments.filter((f) => f.status === 'pending');
  const activeTasksCount = tasks.filter((t) => t.status === 'in_progress').length;
  const totalAwardedXp = WebDevService.getXPLedger().reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Filtered Tasks
  const myAdminTasks = tasks.filter((t) => t.assigneeId === currentUser.teacherId);
  const myAdminActiveTasks = myAdminTasks.filter((t) => t.status !== 'completed' && t.status !== 'not_done');

  const filteredMyTasks = myAdminTasks.filter((t) => {
    if (myTasksFilter === 'in_progress' && t.status !== 'in_progress') return false;
    if (myTasksFilter === 'review_requested' && t.status !== 'review_requested') return false;
    if (myTasksFilter === 'completed' && t.status !== 'completed') return false;
    if (myTasksFilter === 'blocked' && !t.isBlocked) return false;
    if (myTasksSearch.trim()) {
      const q = myTasksSearch.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  const handleToggleMySubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.subtasks) return;
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    WebDevService.saveTask(
      { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() },
      { id: currentUser.teacherId, name: currentUser.name }
    );
    loadData();
  };

  const handleToggleMyBlocker = (task: WebDevTask) => {
    if (task.isBlocked) {
      WebDevService.saveTask(
        { ...task, isBlocked: false, blockerReason: undefined, updatedAt: new Date().toISOString() },
        { id: currentUser.teacherId, name: currentUser.name }
      );
    } else {
      const reason = prompt('Please specify the blocker or technical issue:');
      if (!reason) return;
      WebDevService.saveTask(
        { ...task, isBlocked: true, blockerReason: reason, updatedAt: new Date().toISOString() },
        { id: currentUser.teacherId, name: currentUser.name }
      );
    }
    loadData();
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
    if (taskProjectFilter !== 'all' && t.projectId !== taskProjectFilter) return false;
    if (taskAssigneeFilter === 'assigned_to_me') {
      if ((t.assigneeId || '').toUpperCase() !== (currentUser.teacherId || '').toUpperCase()) return false;
    } else if (taskAssigneeFilter === 'unassigned') {
      if (t.assigneeId) return false;
    } else if (taskAssigneeFilter !== 'all') {
      if ((t.assigneeId || '').toUpperCase() !== taskAssigneeFilter.toUpperCase()) return false;
    }
    if (taskTimeFilter !== 'all') {
      if (taskTimeFilter === 'on_time' && t.completionStatus !== 'on_time') return false;
      if (taskTimeFilter === 'late' && t.completionStatus !== 'late') return false;
      if (taskTimeFilter === 'not_done' && (t.status !== 'not_done' && t.completionStatus !== 'not_done')) return false;
      if (taskTimeFilter === 'pending' && (t.status === 'completed' || t.status === 'not_done')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  // Handle Review Execution
  const handleExecuteReview = () => {
    if (!reviewingTask) return;
    if (!reviewFeedback.trim()) {
      alert('Please provide detailed feedback for the developer.');
      return;
    }

    if (reviewAction === 'approve') {
      WebDevService.approveTaskSubmission(
        reviewingTask.id,
        { id: currentUser.teacherId, name: currentUser.name },
        reviewFeedback.trim(),
        bonusXp
      );
      try {
        confetti({ particleCount: 75, spread: 75, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } else if (reviewAction === 'changes') {
      WebDevService.requestChangesTaskSubmission(
        reviewingTask.id,
        { id: currentUser.teacherId, name: currentUser.name },
        reviewFeedback.trim()
      );
    } else if (reviewAction === 'reject') {
      WebDevService.rejectTaskSubmission(
        reviewingTask.id,
        { id: currentUser.teacherId, name: currentUser.name },
        reviewFeedback.trim()
      );
    }

    setReviewingTask(null);
    setReviewFeedback('');
    setBonusXp(0);
    loadData();
  };

  // Handle Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const finalProjectId = newTaskProject || (projects.length > 0 ? projects[0].id : 'PROJ-01');
    const assignedUser = developers.find((d) => d.teacherId === newTaskAssignee || d.id === newTaskAssignee);
    const tagsArr = newTaskTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const taskId = newTaskId.trim() || `DEV-TASK-${Date.now().toString().slice(-4)}`;
    const subtasksList = newTaskSubtasks.map((st, idx) => ({
      id: `sub-${Date.now()}-${idx + 1}`,
      taskId: taskId,
      title: st,
      completed: false,
    }));

    WebDevService.saveTask(
      {
        id: taskId,
        projectId: finalProjectId,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        type: newTaskType,
        priority: newTaskPriority,
        status: assignedUser ? 'in_progress' : 'todo',
        xpReward: Number(newTaskXp) || 150,
        assigneeId: assignedUser?.teacherId,
        assigneeName: assignedUser?.name,
        reviewerId: currentUser.teacherId,
        reviewerName: currentUser.name,
        dueDate: newTaskDue || undefined,
        tags: tagsArr,
        subtasks: subtasksList,
        isBlocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { id: currentUser.teacherId, name: currentUser.name }
    );

    // Dispatch email notification if assigned user has email
    if (assignedUser && assignedUser.email) {
      notificationService.notifyWebDevTaskAssigned({
        assigneeEmail: assignedUser.email,
        assigneeName: assignedUser.name,
        assigneeRole: assignedUser.role,
        taskTitle: newTaskTitle.trim(),
        taskDescription: newTaskDesc.trim(),
        projectName: projects.find((p) => p.id === newTaskProject)?.title || 'AEW Platform',
        projectId: newTaskProject,
        priority: newTaskPriority,
        xpReward: Number(newTaskXp) || 150,
        deadline: newTaskDue || undefined,
        dueDate: newTaskDue || undefined,
        assignedByName: `${currentUser.name} (Engineering Manager)`,
        subtasks: newTaskSubtasks,
      }).catch((err) => console.warn('[WebDevManagerView] Failed to dispatch task assignment email:', err));
    }

    setShowCreateTaskModal(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskId('');
    setNewTaskSubtasks([]);
    setNewSubtaskInput('');
    loadData();
  };

  // Handle Create Bounty
  const handleCreateBounty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBountyTitle.trim()) return;

    WebDevService.saveBounty(
      {
        id: `BOUNTY-${Date.now().toString().slice(-4)}`,
        title: newBountyTitle.trim(),
        description: newBountyDesc.trim(),
        xpReward: Number(newBountyXp) || 200,
        difficulty: newBountyDiff,
        status: 'open',
        category: newBountyCat,
        createdAt: new Date().toISOString(),
      },
      { id: currentUser.teacherId, name: currentUser.name }
    );

    setShowCreateBountyModal(false);
    setNewBountyTitle('');
    setNewBountyDesc('');
    loadData();
  };

  // Handle Create Challenge
  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chalTitle.trim()) return;

    WebDevService.saveChallenge({
      id: `CHAL-${Date.now().toString().slice(-4)}`,
      title: chalTitle.trim(),
      description: chalDesc.trim(),
      goalXp: Number(chalGoalXp) || 5000,
      currentXp: 0,
      rewardDescription: chalReward.trim() || 'Team Recognition & Bonus XP',
      startDate: new Date().toISOString().split('T')[0],
      endDate: chalEndDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'active',
    });

    setShowCreateChallengeModal(false);
    setChalTitle('');
    setChalDesc('');
    setChalReward('Team Swag & Recognition');
    loadData();
  };

  // Handle Delete Challenge
  const handleDeleteChallenge = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the sprint challenge "${title}"?`)) {
      WebDevService.deleteChallenge(id);
      loadData();
    }
  };

  // Handle Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim()) return;

    const leadDev = developers.find(
      (d) =>
        (d.teacherId || '').toUpperCase() === (newProjLead || '').toUpperCase() ||
        (d.id || '').toUpperCase() === (newProjLead || '').toUpperCase()
    );
    const techArr = newProjTech.split(',').map((s) => s.trim()).filter(Boolean);
    const projId = `PROJ-${Date.now().toString().slice(-4)}`;

    const milestonesToSave = newProjMilestones.map((m, idx) => ({
      id: m.id || `ms-${Date.now()}-${idx + 1}`,
      projectId: projId,
      title: m.title,
      description: m.description,
      deadline: m.deadline,
      targetDate: m.deadline,
      status: 'pending' as const,
      order: idx + 1,
      orderIndex: idx + 1,
      progressPercentage: 0,
      createdAt: new Date().toISOString(),
    }));

    WebDevService.saveProject(
      {
        id: projId,
        key: newProjKey.trim().toUpperCase() || 'PROJ',
        title: newProjTitle.trim(),
        description: newProjDesc.trim(),
        repositoryUrl: newProjRepo.trim() || undefined,
        techStack: techArr,
        status: 'planning',
        priority: 'high',
        managerId: currentUser.teacherId,
        managerName: currentUser.name,
        leadDeveloperId: leadDev?.teacherId || leadDev?.id || newProjLead || undefined,
        leadDeveloperName: leadDev?.name || undefined,
        progressPercentage: 10,
        startDate: new Date().toISOString().split('T')[0],
        targetDate: newProjTarget || '2026-12-01',
        milestones: milestonesToSave,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { id: currentUser.teacherId, name: currentUser.name }
    );

    setShowCreateProjectModal(false);
    setNewProjKey('');
    setNewProjTitle('');
    setNewProjDesc('');
    setNewProjMilestones([]);
    setNewMilestoneTitle('');
    setNewMilestoneDeadline('');
    setNewMilestoneDesc('');
    loadData();
  };

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForMilestone || !addMilestoneTitle.trim()) return;
    WebDevService.createMilestone({
      projectId: selectedProjectForMilestone.id,
      title: addMilestoneTitle.trim(),
      description: addMilestoneDesc.trim(),
      dueDate: addMilestoneDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'planned',
    });
    setShowAddMilestoneModal(false);
    setAddMilestoneTitle('');
    setAddMilestoneDeadline('');
    setAddMilestoneDesc('');
    setSelectedProjectForMilestone(null);
    loadData();
  };

  const handleManualCloudSync = async () => {
    setIsManualSyncing(true);
    setManualSyncMsg('Syncing...');
    try {
      const ok = await StorageService.syncToCloud();
      if (ok) {
        setManualSyncMsg('Synced to Cloud ✓');
        loadData();
      } else {
        setManualSyncMsg('Sync Failed');
      }
    } catch {
      setManualSyncMsg('Sync Error');
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setManualSyncMsg(null), 3000);
    }
  };

  const handleSendDevWelcomeEmail = async (user: User, plainPassword?: string) => {
    const targetEmail = (user.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setDevEmailDispatchResult({
        success: false,
        status: 'failed',
        error: 'No valid email address provided for this developer profile.',
      });
      return;
    }

    setDevEmailSending(true);
    try {
      const res = await notificationService.notifyEmployeeWelcome({
        employeeEmail: targetEmail,
        employeeName: user.name,
        employeeId: user.teacherId,
        role: user.role,
        department: user.department,
        subject: user.subject,
        username: user.username || user.teacherId.toLowerCase(),
        password: plainPassword || user.password,
        joiningDate: user.joiningDate,
        webDevTitle: user.webDevTitle,
      });
      setDevEmailDispatchResult(res);
    } catch (err: any) {
      setDevEmailDispatchResult({
        success: false,
        status: 'failed',
        error: err?.message || 'Error communicating with notification server',
      });
    } finally {
      setDevEmailSending(false);
    }
  };

  const handleAddDeveloperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName.trim() || !newDevEmail.trim()) {
      alert('Please fill in Developer Name and Work Email.');
      return;
    }

    const skillsArr = newDevSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const plainPassword = newDevPassword.trim() || 'dev123';
      const created = WebDevService.addDeveloperToTeam(
        {
          name: newDevName.trim(),
          email: newDevEmail.trim(),
          username: newDevUsername.trim(),
          password: plainPassword,
          webDevTitle: newDevTitle.trim() || (newDevRole === 'web_dev_manager' ? 'Lead Architect' : 'Web Developer'),
          skills: skillsArr,
          role: newDevRole,
          phone: newDevPhone.trim() || undefined,
        },
        { id: currentUser.teacherId, name: currentUser.name }
      );

      setCreatedDevSuccess(created);

      try {
        confetti({ particleCount: 60, spread: 70 });
      } catch {
        // ignore
      }

      setNewDevName('');
      setNewDevEmail('');
      setNewDevUsername('');
      setNewDevPassword('dev123');
      setNewDevTitle('Web Developer');
      setNewDevSkills('');
      setNewDevPhone('');
      loadData();

      // Dispatch welcome email with credentials
      handleSendDevWelcomeEmail(created, plainPassword);

      // Explicit Supabase cloud sync
      setDevCloudSyncStatus('syncing');
      StorageService.syncToCloud()
        .then((ok) => {
          setDevCloudSyncStatus(ok ? 'synced' : 'error');
        })
        .catch(() => {
          setDevCloudSyncStatus('error');
        });
    } catch (err: any) {
      alert(err.message || 'Failed to add developer.');
    }
  };

  const handleCopyDevCredentials = () => {
    if (!createdDevSuccess) return;
    const text = `AEW Portal Login Credentials:
Name: ${createdDevSuccess.name}
Role: ${createdDevSuccess.role.toUpperCase()} (${createdDevSuccess.webDevTitle || createdDevSuccess.department})
Employee ID: ${createdDevSuccess.teacherId}
Username: ${createdDevSuccess.username}
Password: ${createdDevSuccess.password}
Portal URL: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setDevCopiedSuccess(true);
      setTimeout(() => setDevCopiedSuccess(false), 2500);
    });
  };

  const handleCloseAddDevModal = () => {
    setShowAddDevModal(false);
    setCreatedDevSuccess(null);
    setDevEmailDispatchResult(null);
    setDevCloudSyncStatus(null);
  };

  // Handle Remove Developer from Team
  const handleRemoveDeveloper = (devId: string, devName: string) => {
    if (!devId) return;
    const cleanDevId = devId.trim().toUpperCase();
    const cleanCurTeacherId = (currentUser.teacherId || '').trim().toUpperCase();
    const cleanCurUserId = (currentUser.id || '').trim().toUpperCase();

    if (cleanDevId === cleanCurTeacherId || (cleanCurUserId && cleanDevId === cleanCurUserId)) {
      alert('You cannot remove yourself from the engineering squad.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to remove ${devName} (${devId}) from the engineering squad?\n\nTheir active tasks will be unassigned to maintain delivery continuity.`
    );
    if (!confirmed) return;

    try {
      const res = WebDevService.removeDeveloperFromTeam(devId, {
        id: currentUser.teacherId || currentUser.id,
        name: currentUser.name,
      });
      if (res.success) {
        loadData();
        // Background push to cloud
        StorageService.syncToCloud().catch(() => {});
      } else {
        alert(res.error || 'Failed to remove developer.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove developer.');
    }
  };

  // Handle Fulfill Reward
  const handleFulfillReward = (fulfillmentId: string) => {
    const fulfilled = WebDevService.fulfillReward(fulfillmentId, {
      id: currentUser.teacherId,
      name: currentUser.name,
    });
    if (fulfilled) {
      try {
        confetti({ particleCount: 80, spread: 80 });
      } catch {
        // ignore
      }
      loadData();
    }
  };

  // Handle Award Configuration
  const openEditReward = (r: WebDevReward) => {
    setEditingReward(r);
    setRewardFormTitle(r.title);
    setRewardFormCategory((r.category as any) || 'certificate');
    setRewardFormXp(r.xpThreshold);
    setRewardFormDesc(r.description);
    setRewardFormIcon(r.icon || '🏆');
    setRewardFormPerk(r.perkSummary || '');
    setShowCreateAwardModal(true);
  };

  const openCreateReward = () => {
    setEditingReward(null);
    setRewardFormTitle('');
    setRewardFormCategory('certificate');
    setRewardFormXp(500);
    setRewardFormDesc('');
    setRewardFormIcon('🏆');
    setRewardFormPerk('');
    setShowCreateAwardModal(true);
  };

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardFormTitle.trim()) return;

    WebDevService.saveReward(
      {
        id: editingReward ? editingReward.id : `REW-CUSTOM-${Date.now().toString().slice(-4)}`,
        title: rewardFormTitle.trim(),
        category: rewardFormCategory,
        xpThreshold: Math.max(50, Number(rewardFormXp) || 100),
        description: rewardFormDesc.trim(),
        icon: rewardFormIcon || '🏆',
        perkSummary: rewardFormPerk.trim(),
      },
      { id: currentUser.teacherId, name: currentUser.name }
    );

    setShowCreateAwardModal(false);
    setEditingReward(null);
    loadData();
  };

  const handleUpdateRewardThreshold = (reward: WebDevReward, newXp: number) => {
    WebDevService.saveReward(
      { ...reward, xpThreshold: Math.max(0, newXp) },
      { id: currentUser.teacherId, name: currentUser.name }
    );
    loadData();
  };

  const handleDeleteReward = (rewardId: string) => {
    if (!confirm('Are you sure you want to deactivate/delete this reward?')) return;
    WebDevService.deleteReward(rewardId, { id: currentUser.teacherId, name: currentUser.name });
    loadData();
  };

  const leaderboardData = WebDevService.getLeaderboard(leaderboardPeriod, leaderboardDept);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* ─── MANAGER OPERATIONS HEADER ──────────────────────────────────────── */}
      <div className="border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Engineering Operations
                </span>
                <span className="text-xs text-slate-400 font-mono">{currentUser?.teacherId || 'ENGINEERING'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Web Development Management Hub
              </h1>
              <p className="text-xs text-slate-400">
                Overseeing software releases, pull request approvals, developer workload, and performance recognition.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (projects.length > 0 && !newTaskProject) setNewTaskProject(projects[0].id);
                  setShowCreateTaskModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Assign New Task
              </button>

              <button
                onClick={() => setShowCreateBountyModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Target className="w-4 h-4 text-amber-400" />
                Create Bounty
              </button>

              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Briefcase className="w-4 h-4 text-indigo-400" />
                New Project
              </button>
            </div>
          </div>

          {/* Attention Center KPI Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-8">
            <div
              onClick={() => onPageChange?.('wdm_my_tasks')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'my_tasks'
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/30'
                  : myAdminActiveTasks.length > 0
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10 hover:border-emerald-500/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>My Tasks</span>
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {myAdminActiveTasks.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Assigned by Admin</div>
            </div>

            <div
              onClick={() => onPageChange?.('wdm_review')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                pendingReviews.length > 0
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                <span>Pending Reviews</span>
                <GitPullRequest className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {pendingReviews.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Awaiting PR approval</div>
            </div>

            <div
              onClick={() => {
                onPageChange?.('wdm_tasks');
                setTaskStatusFilter('blocked');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                blockedTasks.length > 0
                  ? 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/10'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-red-400 font-semibold">
                <span>Blocked Tasks</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {blockedTasks.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Need immediate clearance</div>
            </div>

            <div
              onClick={() => onPageChange?.('wdm_projects')}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold">
                <span>Active Projects</span>
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {projects.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{activeTasksCount} active tasks</div>
            </div>

            <div
              onClick={() => onPageChange?.('wdm_awards')}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Award Requests</span>
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {pendingFulfillments.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Thresholds & perks</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-purple-400 font-semibold">
                <span>XP Distributed</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
                {totalAwardedXp.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Across team ledger</div>
            </div>
          </div>

          {/* Executive Sub-Header / Current Workspace Context */}
          <div className="pt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 mt-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Operations Center</span>
              <span className="text-slate-600">/</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-semibold flex items-center gap-1.5">
                {activeTab === 'my_tasks' && <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />}
                {activeTab === 'review_desk' && <Shield className="w-3.5 h-3.5 text-amber-400" />}
                {activeTab === 'tasks' && <CheckSquare className="w-3.5 h-3.5 text-blue-400" />}
                {activeTab === 'projects' && <Layers className="w-3.5 h-3.5 text-indigo-400" />}
                {activeTab === 'bounties' && <Target className="w-3.5 h-3.5 text-emerald-400" />}
                {activeTab === 'awards' && <Gift className="w-3.5 h-3.5 text-pink-400" />}
                {activeTab === 'team' && <Users className="w-3.5 h-3.5 text-purple-400" />}
                {activeTab === 'leaderboard' && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                {activeTab === 'audit' && <FileText className="w-3.5 h-3.5 text-slate-400" />}
                {activeTab === 'my_tasks' && 'My Tasks & Admin Deliverables'}
                {activeTab === 'review_desk' && 'Review Desk & PR Approvals'}
                {activeTab === 'tasks' && 'All Tasks & Workload Command Center'}
                {activeTab === 'projects' && 'Projects & Roadmap Milestones'}
                {activeTab === 'bounties' && 'Bounties Desk'}
                {activeTab === 'awards' && 'Awards & XP Thresholds'}
                {activeTab === 'team' && 'Engineering Team & Squad Velocity'}
                {activeTab === 'leaderboard' && 'All-Hands Organization Leaderboard'}
                {activeTab === 'audit' && 'System Audit Trail'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="hidden sm:inline">Use the <strong>left sidebar</strong> to switch between management desks</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── TAB 0: MY TASKS (ADMIN DELIVERABLES FOR WEB DEV MANAGER) ────────── */}
        {activeTab === 'my_tasks' && (
          <div className="space-y-6">
            {/* Header / Intro Banner */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/30 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Executive Deliverables
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Assigned by Operations Admin</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-2">
                    <CheckSquare className="w-6 h-6 text-emerald-400" />
                    My Assigned Deliverables & Tasks ({myAdminTasks.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                    High-priority software architecture directives, core feature builds, and engineering milestones assigned directly to you by the Admin. Complete deliverables on time to claim 100% XP stakes and punctuality bonuses.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">Total Assigned XP</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-center justify-end gap-1">
                      <Sparkles className="w-4 h-4" />
                      {myAdminTasks.reduce((sum, t) => sum + (t.xpReward || 0), 0)} XP
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">In Progress</div>
                  <div className="text-lg font-black text-blue-400 mt-0.5">
                    {myAdminTasks.filter((t) => t.status === 'in_progress').length}
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Under Review</div>
                  <div className="text-lg font-black text-amber-400 mt-0.5">
                    {myAdminTasks.filter((t) => t.status === 'review_requested').length}
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completed On-Time</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    {myAdminTasks.filter((t) => t.status === 'completed' && t.completionStatus === 'on_time').length}
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Blocked / Need Help</div>
                  <div className="text-lg font-black text-rose-400 mt-0.5">
                    {myAdminTasks.filter((t) => t.isBlocked).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={myTasksSearch}
                  onChange={(e) => setMyTasksSearch(e.target.value)}
                  placeholder="Search my deliverables, tags, subtasks..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: `All (${myAdminTasks.length})` },
                  { id: 'in_progress', label: `In Progress (${myAdminTasks.filter((t) => t.status === 'in_progress').length})` },
                  { id: 'review_requested', label: `Under Review (${myAdminTasks.filter((t) => t.status === 'review_requested').length})` },
                  { id: 'completed', label: `Completed (${myAdminTasks.filter((t) => t.status === 'completed').length})` },
                  { id: 'blocked', label: `Blocked (${myAdminTasks.filter((t) => t.isBlocked).length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMyTasksFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      myTasksFilter === tab.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deliverables List */}
            {filteredMyTasks.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8 space-y-3">
                <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-semibold text-slate-300">
                  {myAdminTasks.length === 0 ? 'No Deliverables Assigned Yet' : 'No tasks match current filter'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {myAdminTasks.length === 0
                    ? 'When Operations Admin assigns technical architecture deliverables, milestones, or leadership tasks to you, they will appear here with XP bounties and deadline tracking.'
                    : 'Try clearing the search query or switching to the "All" tab to view all assigned deliverables.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMyTasks.map((t) => {
                  const completedSub = (t.subtasks || []).filter((s) => s.completed).length;
                  const totalSub = (t.subtasks || []).length;
                  const percent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;
                  const dVal = t.deadline || t.dueDate;
                  const dTime = dVal
                    ? /^\d{4}-\d{2}-\d{2}$/.test(dVal)
                      ? new Date(`${dVal}T23:59:59`).getTime()
                      : new Date(dVal).getTime()
                    : 0;
                  const isOverdue = Boolean(dTime && dTime < Date.now() && t.status !== 'completed' && t.status !== 'not_done');

                  return (
                    <div
                      key={t.id}
                      className={`group bg-slate-900/80 hover:bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between space-y-4 ${
                        t.isBlocked
                          ? 'border-rose-500/40 shadow-rose-950/20'
                          : isOverdue
                          ? 'border-amber-500/40 shadow-amber-950/20'
                          : t.status === 'completed'
                          ? 'border-emerald-500/30'
                          : 'border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Card Top Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                              {t.id}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-semibold">
                              {t.type}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                t.priority === 'critical'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                  : t.priority === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                              <Sparkles className="w-3.5 h-3.5" />
                              +{t.xpReward} XP
                            </span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3
                            onClick={() => setSelectedTask(t)}
                            className="text-sm font-bold text-white hover:text-emerald-300 cursor-pointer transition-colors leading-snug"
                          >
                            {t.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {t.description || 'No description provided.'}
                          </p>
                        </div>

                        {/* Assigner & Project info */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Assigned by: <strong className="text-slate-300">{t.assignedByName || 'Admin'}</strong></span>
                          </span>
                          <span className="text-slate-600">•</span>
                          <span>Project: <strong className="text-slate-300">{projects.find((p) => p.id === t.projectId)?.title || t.projectId || 'AEW Platform'}</strong></span>
                        </div>

                        {/* Deadline & Time Evaluation Status */}
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-400">Deadline:</span>
                            <span className={`font-semibold font-mono ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                              {formatTaskDeadlineDisplay(t.deadline, t.dueDate)}
                            </span>
                          </div>

                          {t.completionStatus === 'on_time' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Delivered On-Time (+100% XP)
                            </span>
                          )}
                          {t.completionStatus === 'late' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Delivered Late
                            </span>
                          )}
                          {t.completionStatus === 'not_done' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Missed Deadline
                            </span>
                          )}
                          {!t.completionStatus && isOverdue && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                              Overdue
                            </span>
                          )}
                        </div>

                        {/* Subtasks checklist (Interactive) */}
                        {t.subtasks && t.subtasks.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Checkpoints ({completedSub}/{totalSub})</span>
                              <span className="font-mono text-emerald-400 font-bold">{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="space-y-1 pt-1 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                              {t.subtasks.map((st) => (
                                <div
                                  key={st.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleMySubtask(t.id, st.id);
                                  }}
                                  className="flex items-center gap-2 text-xs py-1 px-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    readOnly
                                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 pointer-events-none"
                                  />
                                  <span className={`text-[11px] select-none ${st.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                    {st.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Blocker alert if active */}
                        {t.isBlocked && (
                          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Active Blocker:</span> {t.blockerReason || 'Technical obstruction reported.'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action Footer */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMyBlocker(t);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                              t.isBlocked
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                                : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {t.isBlocked ? 'Clear Blocker' : 'Report Blocker'}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {t.status === 'in_progress' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(t);
                              }}
                              className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                            >
                              <GitPullRequest className="w-3.5 h-3.5" />
                              Submit Work
                            </button>
                          )}
                          {t.status === 'review_requested' && (
                            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Under Review
                            </span>
                          )}
                          {t.status === 'completed' && (
                            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedTask(t)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            Details & Discussion &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 1: REVIEW DESK ───────────────────────────────────────────── */}
        {activeTab === 'review_desk' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  Developer Submissions Awaiting Review ({pendingReviews.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect code implementation, verify GitHub PR diffs, and grant base XP + optional excellence bonuses.
                </p>
              </div>
            </div>

            {pendingReviews.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-base font-semibold text-white">Review Desk is all clear!</h3>
                <p className="text-xs text-slate-400">All submitted tasks have been reviewed and approved.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReviews.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                            {t.id}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize font-medium">
                            {t.type}
                          </span>
                          <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            +{t.xpReward} Base XP
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{t.title}</h3>
                        <p className="text-xs text-slate-400">
                          Submitted by <strong className="text-slate-200">{t.assigneeName}</strong> on{' '}
                          {t.submission?.submittedAt ? new Date(t.submission.submittedAt).toLocaleString() : 'Recent'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTask(t)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                        >
                          View Full Drawer
                        </button>
                        <button
                          onClick={() => {
                            setReviewingTask(t);
                            setReviewAction('approve');
                          }}
                          className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-lg text-xs shadow-md shadow-emerald-950 transition-all flex items-center gap-1.5"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          Review Now
                        </button>
                      </div>
                    </div>

                    {/* Developer Submission Summary Card */}
                    {t.submission && (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {t.submission.summary}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
                          {t.submission.githubPrUrl && (
                            <a
                              href={t.submission.githubPrUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-colors"
                            >
                              <GitPullRequest className="w-3.5 h-3.5" />
                              Inspect Pull Request
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {t.submission.liveUrl && (
                            <a
                              href={t.submission.liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Launch Live Preview
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: ALL TASKS & WORKLOAD ─────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Admin-Assigned Deliverables Banner for Web Dev Manager */}
            {myAdminTasks.length > 0 && (
              <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Admin-Assigned Deliverables ({myAdminTasks.length})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {myAdminTasks.filter((t) => t.status !== 'completed' && t.status !== 'not_done').length} Pending
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Strategic tasks assigned directly to you by the Admin with XP stakes & time-based completion tracking.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTaskAssigneeFilter(
                      taskAssigneeFilter === 'assigned_to_me' ? 'all' : 'assigned_to_me'
                    )
                  }
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    taskAssigneeFilter === 'assigned_to_me'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                      : 'bg-slate-800 text-purple-300 border border-purple-500/30 hover:bg-slate-700'
                  }`}
                >
                  {taskAssigneeFilter === 'assigned_to_me' ? 'Show All Squad Tasks' : 'Filter My Admin Tasks'}
                </button>
              </div>
            )}

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, assignees, #tags..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={taskProjectFilter}
                  onChange={(e) => setTaskProjectFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>

                <select
                  value={taskAssigneeFilter}
                  onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Assignees</option>
                  <option value="assigned_to_me">👑 Assigned to Me ({myAdminTasks.length})</option>
                  <option value="unassigned">⏳ Unassigned (Backlog)</option>
                  {developers.map((d) => (
                    <option key={d.teacherId} value={d.teacherId}>
                      {d.role === 'web_dev_manager' ? '👑 ' : ''}{d.name}
                    </option>
                  ))}
                </select>

                <select
                  value={taskTimeFilter}
                  onChange={(e) => setTaskTimeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">⏱️ All Time Statuses</option>
                  <option value="on_time">✅ Done (On-Time)</option>
                  <option value="late">⏰ Done (Late)</option>
                  <option value="not_done">❌ Not Done (Missed)</option>
                  <option value="pending">⏳ Pending</option>
                </select>

                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review_requested">Under Review</option>
                  <option value="changes_requested">Changes Requested</option>
                  <option value="completed">Completed</option>
                  <option value="not_done">Not Done / Missed</option>
                  <option value="blocked">Blocked</option>
                  <option value="todo">To Do</option>
                </select>
              </div>
            </div>

            {/* Tasks Master Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Task ID</th>
                    <th className="py-3.5 px-4">Title</th>
                    <th className="py-3.5 px-4">Assignee</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-right">XP Reward</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {t.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white max-w-xs truncate flex items-center gap-1.5">
                          <span>{t.title}</span>
                          {t.assignedByRole === 'admin' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Admin
                            </span>
                          )}
                        </div>
                        {t.isBlocked && (
                          <div className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Blocked: {t.blockerReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {t.assigneeName || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          t.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                          t.status === 'not_done' ? 'bg-rose-500/20 text-rose-300' :
                          t.status === 'review_requested' ? 'bg-amber-500/20 text-amber-300' :
                          t.status === 'changes_requested' ? 'bg-rose-500/20 text-rose-300' :
                          t.status === 'blocked' ? 'bg-red-500/20 text-red-300' :
                          'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="text-slate-300 text-xs font-mono">{formatTaskDeadlineDisplay(t.deadline, t.dueDate)}</div>
                          {t.completionStatus && (
                            <div className="text-[10px] font-semibold">
                              {t.completionStatus === 'on_time' && <span className="text-emerald-400">✅ On-Time</span>}
                              {t.completionStatus === 'late' && <span className="text-amber-400">⏰ Late</span>}
                              {t.completionStatus === 'not_done' && <span className="text-rose-400">❌ Missed</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-amber-400">+{t.xpReward} XP</div>
                        {t.actualXpAwarded !== undefined && t.actualXpAwarded !== t.xpReward && (
                          <div className="text-[10px] text-slate-400">
                            Awarded: <strong className="text-emerald-300">+{t.actualXpAwarded} XP</strong>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedTask(t)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition-colors"
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete task "${t.title}" (${t.id})?`)) {
                                WebDevService.deleteTask(t.id);
                                loadData();
                              }
                            }}
                            className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded text-[11px] transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: PROJECTS & MILESTONES ─────────────────────────────────── */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projects.map((proj) => {
                const projMilestones = WebDevService.getMilestones(proj.id);
                const dynamicProgress = WebDevService.calculateProjectProgress(proj.id);
                const projTasks = WebDevService.getTasks({ projectId: proj.id });
                const leadDev = developers.find(
                  (d) =>
                    (d.teacherId || '').toUpperCase() === (proj.leadDeveloperId || '').toUpperCase() ||
                    (d.id || '').toUpperCase() === (proj.leadDeveloperId || '').toUpperCase()
                );
                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl space-y-5 cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                            {proj.key}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                            {proj.status}
                          </span>
                          {proj.leadDeveloperId && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-1 border border-amber-500/30">
                              👑 Lead: {leadDev?.name || proj.leadDeveloperName || proj.leadDeveloperId}
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-bold text-white mt-1.5 group-hover:text-amber-300 transition-colors">{proj.title}</h2>
                        <p className="text-xs text-slate-400 mt-1">{proj.description}</p>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectForMilestone(proj);
                            setShowAddMilestoneModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Add Milestone"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Milestone</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Permanently delete project "${proj.title}" (${proj.id}) and all associated milestones?`)) {
                              WebDevService.deleteProject(proj.id);
                              loadData();
                            }
                          }}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Dynamic Project Progress</span>
                        <span className="font-bold text-white">{dynamicProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${dynamicProgress}%` }}
                        />
                      </div>
                    </div>

                    {projMilestones.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Roadmap Milestones ({projMilestones.length})
                        </div>
                        <div className="space-y-1.5">
                          {projMilestones.map((m) => (
                            <div key={m.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    WebDevService.toggleMilestoneStatus(m.id);
                                    loadData();
                                  }}
                                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                                  title="Click to toggle completed / in progress"
                                >
                                  {m.status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-400" />
                                  )}
                                </button>
                                <div>
                                  <div className={`font-semibold ${m.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{m.title}</div>
                                  <div className="text-[10px] text-slate-500">Target: {m.targetDate || m.dueDate}</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                m.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {m.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <div className="flex items-center gap-3 text-slate-400">
                        <span>Tasks: <strong className="text-white">{projTasks.length}</strong></span>
                        {proj.repositoryUrl && (
                          <a
                            href={proj.repositoryUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Repo
                          </a>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Open Project Details & Tasks →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 4: BOUNTIES DESK ─────────────────────────────────────────── */}
        {activeTab === 'bounties' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  Engineering Bounties Management
                </h2>
                <p className="text-xs text-slate-400">Manage self-service technical bounties and approve completed submissions</p>
              </div>

              <button
                onClick={() => setShowCreateBountyModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add New Bounty
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bounties.length === 0 ? (
                <div className="col-span-full py-12 px-4 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                  <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-300">No Active Bounties</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    There are currently no engineering bounties posted. Click &quot;Add New Bounty&quot; above to create one.
                  </p>
                </div>
              ) : (
                bounties.map((b) => (
                  <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-800 text-slate-300">
                          {b.difficulty}
                        </span>
                        <span className="text-xs font-bold text-amber-400">+{b.xpReward} XP</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Permanently delete bounty "${b.title}" (${b.id})?`)) {
                            WebDevService.deleteBounty(b.id);
                            loadData();
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                        title="Delete Bounty"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{b.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{b.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-400">
                        {b.claimedByName ? `Claimed by ${b.claimedByName}` : 'Open for claims'}
                      </span>
                      <span className="font-semibold text-amber-300 uppercase text-[10px]">
                        {b.status}
                      </span>
                    </div>

                    {b.status === 'submitted' && (
                      <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2 text-xs">
                        <div className="font-semibold text-indigo-300">Submitted Proof:</div>
                        <a
                          href={b.submissionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 underline break-all"
                        >
                          {b.submissionUrl}
                        </a>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              WebDevService.approveBounty(
                                b.id,
                                { id: currentUser.teacherId, name: currentUser.name },
                                'Excellent solution! High performance and test coverage verified.'
                              );
                              loadData();
                            }}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors"
                          >
                            Approve & Award {b.xpReward} XP
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const feedback = prompt(
                                `Enter revision feedback or rejection reason for ${b.claimedByName || 'developer'}:`,
                                'Please update tests and resolve feedback before resubmitting.'
                              );
                              if (feedback === null) return;
                              const reopen = window.confirm(
                                'Reopen this bounty for ALL developers?\n\nClick "OK" to reopen for anyone, or "Cancel" to keep it assigned to this developer to rework.'
                              );
                              WebDevService.rejectBounty(
                                b.id,
                                { id: currentUser.teacherId, name: currentUser.name },
                                feedback.trim() || 'Submission rejected by reviewer.',
                                reopen
                              );
                              loadData();
                            }}
                            className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition-colors"
                          >
                            Reject / Rework
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: AWARDS & XP THRESHOLD CONFIGURATION DESK ───────────────── */}
        {activeTab === 'awards' && (
          <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  Award & XP Threshold Configuration Desk
                </h2>
                <p className="text-xs text-slate-400">
                  Configure which official awards, certificates, and perks developers unlock at what XP threshold. Manage fulfillment approvals.
                </p>
              </div>

              <button
                onClick={openCreateReward}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                Add Custom Award
              </button>
            </div>

            {/* Awards & XP Thresholds Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl p-2 bg-slate-950 rounded-xl border border-slate-800">
                          {reward.icon || '🏆'}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{reward.title}</h3>
                          <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                            {reward.category || 'Certificate'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditReward(reward)}
                          title="Edit Award & Threshold"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {reward.id.startsWith('REW-CUSTOM') && (
                          <button
                            onClick={() => handleDeleteReward(reward.id)}
                            title="Delete Award"
                            className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{reward.description}</p>
                    {reward.perkSummary && (
                      <div className="p-2 bg-indigo-950/30 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300">
                        🎁 <strong>Perk:</strong> {reward.perkSummary}
                      </div>
                    )}
                  </div>

                  {/* XP Threshold Configuration Bar */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-medium">
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        Required XP Threshold:
                      </span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {reward.xpThreshold.toLocaleString()} XP
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="100"
                        max="10000"
                        step="50"
                        value={reward.xpThreshold}
                        onChange={(e) => handleUpdateRewardThreshold(reward, Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          const val = prompt(`Set XP threshold for "${reward.title}":`, String(reward.xpThreshold));
                          if (val && !isNaN(Number(val))) {
                            handleUpdateRewardThreshold(reward, Number(val));
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-mono border border-slate-700 whitespace-nowrap"
                      >
                        Set Exact
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending Fulfillment Requests Queue */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Pending Reward & Certificate Fulfillment Requests
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verify developer eligibility, generate tamper-proof digital certificates, and approve swag shipments.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {pendingFulfillments.length} Pending
                </span>
              </div>

              {fulfillments.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No reward requests found. Developers can request certificates once they achieve the required XP threshold.
                </div>
              ) : (
                <div className="space-y-3">
                  {fulfillments.map((f) => {
                    const r = rewards.find((rew) => rew.id === f.rewardId);
                    const isPending = f.status === 'pending';

                    return (
                      <div
                        key={f.id}
                        className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          isPending ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{r?.icon || '📜'}</span>
                            <h4 className="text-sm font-bold text-white">{r?.title || 'Reward'}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isPending ? 'bg-amber-500/20 text-amber-300' :
                              f.status === 'rejected' ? 'bg-rose-500/20 text-rose-300' :
                              'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {f.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Recipient: <strong className="text-white">{f.userName}</strong> ({f.userTitle}) • Requested: {f.requestedAt ? new Date(f.requestedAt).toLocaleDateString() : 'Recent'}
                          </p>
                          {f.rejectionReason && (
                            <p className="text-[11px] text-rose-300/90 italic mt-1">
                              Rejection note: {f.rejectionReason}
                            </p>
                          )}
                          {f.verificationCode && (
                            <div className="text-xs text-amber-400 font-mono flex items-center gap-1.5 mt-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Credential ID: {f.verificationCode}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleFulfillReward(f.id)}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-950 flex items-center gap-1.5 transition-all"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Issue Verified Certificate
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = prompt(
                                    `Reason for rejecting ${f.userName}'s claim for "${r?.title || 'this reward'}":`,
                                    'Requirements or XP threshold verification incomplete.'
                                  );
                                  if (reason === null) return;
                                  WebDevService.rejectRewardFulfillment(
                                    f.id,
                                    { id: currentUser.teacherId, name: currentUser.name },
                                    reason.trim() || undefined
                                  );
                                  loadData();
                                }}
                                className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedCertificate({ fulfillment: f, reward: r })}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                            >
                              <FileText className="w-4 h-4 text-amber-400" />
                              Inspect Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 6: ENGINEERING TEAM ─────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Engineering Squad ({developers.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Manage team capacity, developer specializations, and squad membership
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleManualCloudSync}
                  disabled={isManualSyncing}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow"
                  title="Synchronize engineering roster with cloud database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>{manualSyncMsg || 'Sync to Cloud'}</span>
                </button>
                <button
                  onClick={() => setShowAddDevModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-950"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Developer to Squad
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {developers.map((dev) => {
                const devTasks = tasks.filter(
                  (t) =>
                    (t.assigneeId && t.assigneeId.toUpperCase() === dev.teacherId.toUpperCase()) ||
                    (dev.id && t.assigneeId && t.assigneeId.toUpperCase() === dev.id.toUpperCase())
                );
                const devActiveTasks = devTasks.filter((t) => t.status === 'in_progress');
                const devBlocked = devTasks.filter((t) => t.isBlocked);
                const devXp = WebDevService.getUserTotalXP(dev.teacherId);
                const lvl = calculateLevelFromXp(devXp);
                const isSelf =
                  (currentUser.teacherId && dev.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase()) ||
                  (currentUser.id && dev.id && dev.id.toUpperCase() === currentUser.id.toUpperCase());

                return (
                  <div key={dev.teacherId} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-500 p-0.5 shadow-md shrink-0">
                            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-black text-amber-300 text-base">
                              {dev.name.charAt(0)}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                              {dev.name}
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
                                  You
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-400">{dev.webDevTitle || lvl.title}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{dev.teacherId}</p>
                          </div>
                        </div>

                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDeveloper(dev.teacherId, dev.name)}
                            className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title={`Remove ${dev.name} from Squad`}
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">XP</div>
                          <div className="font-bold text-amber-400 mt-0.5">{devXp}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Active</div>
                          <div className="font-bold text-slate-200 mt-0.5">{devActiveTasks.length}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Blocked</div>
                          <div className={`font-bold mt-0.5 ${devBlocked.length > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {devBlocked.length}
                          </div>
                        </div>
                      </div>

                      {dev.skills && dev.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {dev.skills.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isSelf && (
                      <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Squad Member</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDeveloper(dev.teacherId, dev.name)}
                          className="px-2.5 py-1 text-[11px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                          title={`Remove ${dev.name} from Squad`}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Remove Member
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── SPRINT TEAM CHALLENGES DESK ──────────────────────────── */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-400" />
                    Sprint Team Challenges Desk ({challenges.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set shared squad milestones, hackathons, and collective delivery goals that reward everyone
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateChallengeModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Team Challenge
                </button>
              </div>

              {challenges.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No sprint challenges active. Click &quot;Add Team Challenge&quot; to motivate the engineering squad with collective targets.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {challenges.map((c) => {
                    const curXp = c.currentXp || 0;
                    const gXp = c.goalXp || 1;
                    const pct = Math.min(100, Math.round((curXp / gXp) * 100));
                    const isDone = c.status === 'completed' || curXp >= gXp;

                    return (
                      <div
                        key={c.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-indigo-500/20 text-indigo-300">
                              Sprint Challenge
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {isDone ? 'Completed' : 'Active'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteChallenge(c.id, c.title)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                title="Delete Challenge"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-white">{c.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{c.description}</p>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-medium">Sprint XP Progress</span>
                              <span className="font-bold text-amber-300">
                                {curXp.toLocaleString()} / {gXp.toLocaleString()} XP ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
                          <div className="truncate max-w-[220px]">
                            Reward: <strong className="text-slate-200">{c.rewardDescription}</strong>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">
                            {c.endDate ? `Ends: ${c.endDate}` : 'No deadline'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 7: ALL-HANDS LEADERBOARD ───────────────────────────────── */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  All-Hands Organization Leaderboard
                </h2>
                <p className="text-xs text-slate-400">
                  Cross-departmental performance benchmarking across Academic Faculty, Engineering, PR & Growth, and Leadership
                </p>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs self-start md:self-auto">
                {(['weekly', 'monthly', 'all_time'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setLeaderboardPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${
                      leaderboardPeriod === p
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: 'All Departments', icon: Sparkles },
                { id: 'engineering', label: 'Engineering & Dev', icon: Code2 },
                { id: 'faculty', label: 'Academic Faculty', icon: GraduationCap },
                { id: 'pr', label: 'Growth & PR', icon: Target },
                { id: 'leadership', label: 'Leadership & Ops', icon: Building2 },
              ].map((dept) => {
                const Icon = dept.icon;
                const isSelected = leaderboardDept === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setLeaderboardDept(dept.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/90 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{dept.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {leaderboardData.slice(0, 3).map((item, idx) => {
                const medalColors = [
                  'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-amber-500/20 ring-1 ring-amber-300',
                  'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 font-black shadow-slate-400/20 ring-1 ring-slate-200',
                  'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-bold shadow-amber-900/20 ring-1 ring-amber-600',
                ];
                const rankBadge = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];

                return (
                  <div
                    key={item.userId}
                    className="relative bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-center shadow-xl space-y-3"
                  >
                    <div className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${medalColors[idx]}`}>
                      {rankBadge[idx]}
                    </div>

                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-500 p-0.5 shadow-lg">
                      <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-black text-xl text-amber-300 overflow-hidden">
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.userName} className="w-full h-full object-cover" />
                        ) : (
                          item.userName.charAt(0)
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-base">{item.userName}</h4>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-300">
                          {item.department}
                        </span>
                        <span className="text-[11px] text-slate-400">Lvl {item.userLevel}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-xl font-black text-amber-400">{item.totalXp.toLocaleString()} Points</div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate px-2" title={item.highlights}>
                        {item.highlights || `${item.userTitle}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Complete Organization Roster Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-14">Rank</th>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Department & Role</th>
                    <th className="py-3.5 px-4">Key Contribution Highlights</th>
                    <th className="py-3.5 px-4 text-center">Level</th>
                    <th className="py-3.5 px-4 text-right">Total Score / XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {leaderboardData.map((row) => (
                    <tr key={row.userId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300 text-center">
                        #{row.rank}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{row.userName}</div>
                        <div className="text-[11px] text-slate-400">{row.userTitle}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          row.department === 'Engineering'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            : row.department === 'Academic Faculty'
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                            : row.department === 'Growth & PR'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          {row.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {row.highlights || 'Active Contributor'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                          Lvl {row.userLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                        {row.totalXp.toLocaleString()} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 8: AUDIT TRAIL ───────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Entity</th>
                    <th className="py-3.5 px-4">Performed By</th>
                    <th className="py-3.5 px-4">Details</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize">{log.entityType}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">{log.performedByUserName}</td>
                      <td className="py-3.5 px-4 text-slate-200">{log.details}</td>
                      <td className="py-3.5 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: TASK DRAWER ──────────────────────────────────────────────── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={(updated) => {
            setSelectedTask(updated);
            loadData();
          }}
          onTaskDeleted={() => {
            setSelectedTask(null);
            loadData();
          }}
        />
      )}

      {/* ─── MODAL: PROJECT DETAIL DRAWER ─────────────────────────────────────── */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          currentUser={currentUser}
          onClose={() => setSelectedProject(null)}
          onProjectUpdated={(updated) => {
            setSelectedProject(updated);
            loadData();
          }}
          onProjectDeleted={() => {
            setSelectedProject(null);
            loadData();
          }}
          onFilterTasksByProject={(projId) => {
            setTaskProjectFilter(projId);
            if (onPageChange) onPageChange('wdm_tasks');
          }}
        />
      )}

      {/* ─── MODAL: CERTIFICATE VIEWER ───────────────────────────────────────── */}
      {selectedCertificate && (
        <CertificateModal
          fulfillment={selectedCertificate.fulfillment}
          reward={selectedCertificate.reward}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

      {/* ─── MODAL: MANAGER REVIEW DESK ACTION ───────────────────────────────── */}
      {reviewingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                Review Submission
              </h3>
              <button onClick={() => setReviewingTask(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs font-bold text-white">{reviewingTask.title}</div>
              <div className="text-[11px] text-slate-400">
                Developer: {reviewingTask.assigneeName} • Base XP: +{reviewingTask.xpReward} XP
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewAction('approve')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  reviewAction === 'approve'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('changes')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  reviewAction === 'changes'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('reject')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  reviewAction === 'reject'
                    ? 'bg-red-700 text-white border-red-600'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Reject
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Feedback / Code Review Notes *
              </label>
              <textarea
                rows={3}
                required
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Provide constructive feedback on architectural choices and test coverage..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {reviewAction === 'approve' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Manager Recognition Bonus XP
                </label>
                <div className="flex items-center gap-2">
                  {[0, 25, 50, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBonusXp(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        bonusXp === v
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      +{v} XP
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewingTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReview}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20"
              >
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE TASK ──────────────────────────────────────────────── */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Assign New Engineering Task
              </h3>
              <button onClick={() => setShowCreateTaskModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Project *</label>
                <select
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select Project * --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement WebSocket reconnect logic"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Detailed requirements, edge cases, acceptance criteria..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Unassigned (Backlog) --</option>
                    {developers.map((d) => (
                      <option key={d.teacherId} value={d.teacherId}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">XP Reward</label>
                  <input
                    type="number"
                    value={newTaskXp}
                    onChange={(e) => setNewTaskXp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Target Deadline / Cutoff</label>
                    <span className="text-[10px] text-slate-400">Strict evaluation</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setQuickNewTaskDue(8)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px]"
                    >
                      Today (+8h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickNewTaskDue(24)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px]"
                    >
                      Tomorrow (+24h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickNewTaskDue(72)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px]"
                    >
                      3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickNewTaskDue(168)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px]"
                    >
                      1 Week
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Task Type</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="feature">Feature</option>
                    <option value="bugfix">Bugfix</option>
                    <option value="refactor">Refactor</option>
                    <option value="documentation">Documentation</option>
                    <option value="hotfix">Hotfix</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newTaskTags}
                    onChange={(e) => setNewTaskTags(e.target.value)}
                    placeholder="Frontend, React, API"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Manual Subtasks Checklist Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    Subtasks Checklist ({newTaskSubtasks.length})
                  </label>
                  <span className="text-[10px] text-slate-400">Custom breakdown of requirements</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSubtaskInput.trim()) {
                          setNewTaskSubtasks([...newTaskSubtasks, newSubtaskInput.trim()]);
                          setNewSubtaskInput('');
                        }
                      }
                    }}
                    placeholder="Type subtask and press Add or Enter..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubtaskInput.trim()) {
                        setNewTaskSubtasks([...newTaskSubtasks, newSubtaskInput.trim()]);
                        setNewSubtaskInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs rounded-xl border border-slate-700 hover:border-amber-500/50 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {newTaskSubtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {newTaskSubtasks.map((st, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg group"
                      >
                        <div className="flex items-center gap-2 text-xs text-slate-200 min-w-0">
                          <span className="w-4 h-4 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 flex items-center justify-center font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{st}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskSubtasks(newTaskSubtasks.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-500 hover:text-red-400 p-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Remove Subtask"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20"
                >
                  Create & Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE BOUNTY ────────────────────────────────────────────── */}
      {showCreateBountyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                Add Open Bounty
              </h3>
              <button onClick={() => setShowCreateBountyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBounty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bounty Title *</label>
                <input
                  type="text"
                  required
                  value={newBountyTitle}
                  onChange={(e) => setNewBountyTitle(e.target.value)}
                  placeholder="e.g. Optimize vendor bundle chunks"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={newBountyDesc}
                  onChange={(e) => setNewBountyDesc(e.target.value)}
                  placeholder="Technical criteria and expected deliverable..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">XP Reward</label>
                  <input
                    type="number"
                    value={newBountyXp}
                    onChange={(e) => setNewBountyXp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={newBountyDiff}
                    onChange={(e) => setNewBountyDiff(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={newBountyCat}
                  onChange={(e) => setNewBountyCat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="optimization">Optimization</option>
                  <option value="feature">Feature</option>
                  <option value="bugfix">Bugfix</option>
                  <option value="security">Security</option>
                  <option value="testing">Testing</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBountyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20"
                >
                  Publish Bounty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE PROJECT ───────────────────────────────────────────── */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Add Engineering Project
              </h3>
              <button onClick={() => setShowCreateProjectModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={newProjKey}
                    onChange={(e) => setNewProjKey(e.target.value)}
                    placeholder="API"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={newProjTitle}
                    onChange={(e) => setNewProjTitle(e.target.value)}
                    placeholder="e.g. Assessment Engine 2.0"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Overview of project objectives..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  value={newProjTech}
                  onChange={(e) => setNewProjTech(e.target.value)}
                  placeholder="React, Next.js, Node.js"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lead Developer</label>
                  <select
                    value={newProjLead}
                    onChange={(e) => setNewProjLead(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Select Lead Developer --</option>
                    {developers.map((d) => (
                      <option key={d.teacherId || d.id} value={d.teacherId || d.id}>
                        {d.name} ({d.teacherId || d.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newProjTarget}
                    onChange={(e) => setNewProjTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Repository URL (optional)</label>
                <input
                  type="url"
                  value={newProjRepo}
                  onChange={(e) => setNewProjRepo(e.target.value)}
                  placeholder="https://github.com/organization/repo"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Project Milestones & Deadlines Builder */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    Project Milestones & Deadlines ({newProjMilestones.length})
                  </label>
                  <span className="text-[10px] text-slate-400">Set clear delivery gates & deadlines</span>
                </div>

                {/* Milestone Builder Input Box */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Milestone Title *</label>
                      <input
                        type="text"
                        value={newMilestoneTitle}
                        onChange={(e) => setNewMilestoneTitle(e.target.value)}
                        placeholder="e.g. Beta Staging Deployment"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Milestone Deadline *</label>
                      <input
                        type="date"
                        value={newMilestoneDeadline}
                        onChange={(e) => setNewMilestoneDeadline(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Milestone Scope / Description (Optional)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMilestoneDesc}
                        onChange={(e) => setNewMilestoneDesc(e.target.value)}
                        placeholder="Acceptance criteria or scope..."
                        className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newMilestoneTitle.trim() || !newMilestoneDeadline) {
                            alert('Please provide milestone title and deadline.');
                            return;
                          }
                          setNewProjMilestones([
                            ...newProjMilestones,
                            {
                              id: `ms-${Date.now()}`,
                              title: newMilestoneTitle.trim(),
                              deadline: newMilestoneDeadline,
                              description: newMilestoneDesc.trim() || undefined,
                            },
                          ]);
                          setNewMilestoneTitle('');
                          setNewMilestoneDeadline('');
                          setNewMilestoneDesc('');
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1 shrink-0 shadow-md shadow-indigo-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Milestone
                      </button>
                    </div>
                  </div>
                </div>

                {/* Milestone List */}
                {newProjMilestones.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {newProjMilestones.map((ms, idx) => (
                      <div
                        key={ms.id}
                        className="flex items-start justify-between gap-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{ms.title}</div>
                            {ms.description && <div className="text-[11px] text-slate-400 truncate">{ms.description}</div>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-medium text-amber-300">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            {formatTaskDeadlineDisplay(ms.deadline)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewProjMilestones(newProjMilestones.filter((m) => m.id !== ms.id));
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 opacity-80 group-hover:opacity-100 transition-opacity"
                            title="Remove Milestone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD MILESTONE TO EXISTING PROJECT ─────────────────────── */}
      {showAddMilestoneModal && selectedProjectForMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                Add Milestone: {selectedProjectForMilestone.title}
              </h3>
              <button onClick={() => setShowAddMilestoneModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  value={addMilestoneTitle}
                  onChange={(e) => setAddMilestoneTitle(e.target.value)}
                  placeholder="e.g. Phase 2 API Release"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={addMilestoneDesc}
                  onChange={(e) => setAddMilestoneDesc(e.target.value)}
                  placeholder="Deliverables and completion criteria..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={addMilestoneDeadline}
                  onChange={(e) => setAddMilestoneDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT AWARD & XP THRESHOLD ───────────────────────── */}
      {showCreateAwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                {editingReward ? 'Configure Award & XP Threshold' : 'Create Custom Engineering Award'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateAwardModal(false);
                  setEditingReward(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Award Title *</label>
                <input
                  type="text"
                  required
                  value={rewardFormTitle}
                  onChange={(e) => setRewardFormTitle(e.target.value)}
                  placeholder="e.g. Master Architect Certificate, Platinum Code Swag"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={rewardFormCategory}
                    onChange={(e) => setRewardFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="certificate">Digital Certificate</option>
                    <option value="swag">Physical Swag Kit</option>
                    <option value="perk">Engineering Perk</option>
                    <option value="title">Honorary Title</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Required XP Threshold *</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    required
                    value={rewardFormXp}
                    onChange={(e) => setRewardFormXp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Display Icon</label>
                  <input
                    type="text"
                    value={rewardFormIcon}
                    onChange={(e) => setRewardFormIcon(e.target.value)}
                    placeholder="🏆 or 📜"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Special Perk / Benefit</label>
                  <input
                    type="text"
                    value={rewardFormPerk}
                    onChange={(e) => setRewardFormPerk(e.target.value)}
                    placeholder="e.g. AEW Tech Hoodie, Direct CEO 1-on-1"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description & Criteria</label>
                <textarea
                  rows={3}
                  value={rewardFormDesc}
                  onChange={(e) => setRewardFormDesc(e.target.value)}
                  placeholder="Official recognition criteria, skills verified, and honors conferred..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAwardModal(false);
                    setEditingReward(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20"
                >
                  {editingReward ? 'Update Award Threshold' : 'Create Award'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD DEVELOPER TO SQUAD ──────────────────────────────────── */}
      {showAddDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            {createdDevSuccess ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Developer Provisioned & Onboarded!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Engineering profile generated and ready for immediate portal access.
                  </p>
                </div>

                {/* Credential Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left font-mono text-xs space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400 font-sans font-bold text-[11px] uppercase tracking-wider">
                      🔑 Login Credentials
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                      {createdDevSuccess.role === 'web_dev_manager' ? 'Lead Architect' : 'Web Developer'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Employee ID:</span>
                    <span className="col-span-2 text-purple-300 font-bold select-all">{createdDevSuccess.teacherId}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Full Name:</span>
                    <span className="col-span-2 text-white font-sans font-medium">{createdDevSuccess.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Username:</span>
                    <span className="col-span-2 text-indigo-300 font-bold select-all">{createdDevSuccess.username}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Password:</span>
                    <span className="col-span-2 text-emerald-300 font-bold select-all">{createdDevSuccess.password}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Work Email:</span>
                    <span className="col-span-2 text-slate-300 truncate">{createdDevSuccess.email}</span>
                  </div>
                </div>

                {/* Welcome Email Status */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-left space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-purple-400" /> Welcome Email Dispatch
                    </span>
                    <span className="text-purple-300/80 font-mono text-[10px] truncate max-w-[180px]">
                      {createdDevSuccess.email}
                    </span>
                  </div>

                  {devEmailSending ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                      <span>Dispatching official credentials email...</span>
                    </div>
                  ) : devEmailDispatchResult?.success ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Welcome email with login credentials delivered!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendDevWelcomeEmail(createdDevSuccess, createdDevSuccess.password)}
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-200 underline cursor-pointer"
                      >
                        Resend
                      </button>
                    </div>
                  ) : devEmailDispatchResult && !devEmailDispatchResult.success ? (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px]">⚠️ Dispatch Notice</span>
                        <button
                          type="button"
                          onClick={() => handleSendDevWelcomeEmail(createdDevSuccess, createdDevSuccess.password)}
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 text-[10px] font-bold cursor-pointer"
                        >
                          Retry Email
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-300/80">
                        {devEmailDispatchResult.error || 'Check SMTP configuration or recipient address.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                      <span>Ready to dispatch welcome email</span>
                      <button
                        type="button"
                        onClick={() => handleSendDevWelcomeEmail(createdDevSuccess, createdDevSuccess.password)}
                        className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" /> Send Mail
                      </button>
                    </div>
                  )}
                </div>

                {/* Cloud Database Sync Status */}
                <div>
                  {devCloudSyncStatus === 'syncing' ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                      <span>Syncing developer record to Supabase Cloud Database...</span>
                    </div>
                  ) : devCloudSyncStatus === 'synced' ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Developer stored & synced to Supabase Cloud DB ✓</span>
                    </div>
                  ) : devCloudSyncStatus === 'error' ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                      <span>⚠️ Cloud sync pending (saved in local store)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDevCloudSyncStatus('syncing');
                          StorageService.syncToCloud().then((ok) => setDevCloudSyncStatus(ok ? 'synced' : 'error'));
                        }}
                        className="underline text-[10px] font-bold text-amber-300 hover:text-amber-100 cursor-pointer"
                      >
                        Retry Sync
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyDevCredentials}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow"
                  >
                    {devCopiedSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-purple-400" /> Copy Credentials
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseAddDevModal}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    Done & View Squad
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-purple-400" />
                    Add Developer to Engineering Squad
                  </h3>
                  <button
                    onClick={() => setShowAddDevModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddDeveloperSubmit} className="space-y-4">
                  {/* Role Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Department Role *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewDevRole('web_developer');
                          if (newDevTitle === 'Lead Software Architect & Manager') setNewDevTitle('Web Developer');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                          newDevRole === 'web_developer'
                            ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Code2 className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <div className="text-xs">Web Developer</div>
                          <div className="text-[10px] text-slate-400">Sprint tasks & bounties</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewDevRole('web_dev_manager');
                          setNewDevTitle('Lead Software Architect & Manager');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                          newDevRole === 'web_dev_manager'
                            ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs">Lead Architect</div>
                          <div className="text-[10px] text-slate-400">Full engineering desk</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newDevName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewDevName(val);
                          if (!newDevUsername || newDevUsername === newDevName.toLowerCase().replace(/[^a-z0-9]/g, '_')) {
                            const suggested = val.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
                            setNewDevUsername(suggested);
                            if (!newDevEmail || newDevEmail.includes('@aew.com')) {
                              setNewDevEmail(`${suggested}@aew.com`);
                            }
                          }
                        }}
                        placeholder="e.g. Arjun Mehta"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email *</label>
                      <input
                        type="email"
                        required
                        value={newDevEmail}
                        onChange={(e) => setNewDevEmail(e.target.value)}
                        placeholder="arjun@aew.com"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Portal Username *</label>
                      <input
                        type="text"
                        required
                        value={newDevUsername}
                        onChange={(e) => setNewDevUsername(e.target.value)}
                        placeholder="arjun.m"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password *</label>
                      <input
                        type="text"
                        required
                        value={newDevPassword}
                        onChange={(e) => setNewDevPassword(e.target.value)}
                        placeholder="dev123"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Specialization / Title</label>
                      <input
                        type="text"
                        value={newDevTitle}
                        onChange={(e) => setNewDevTitle(e.target.value)}
                        placeholder="e.g. Frontend Specialist, Full-Stack Engineer"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone (Optional)</label>
                      <input
                        type="tel"
                        value={newDevPhone}
                        onChange={(e) => setNewDevPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Tech Stack Skills (comma-separated)</label>
                    <input
                      type="text"
                      value={newDevSkills}
                      onChange={(e) => setNewDevSkills(e.target.value)}
                      placeholder="React, TypeScript, Tailwind, Node.js"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
                    <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      Automatic Credentials Dispatch & Cloud Sync
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Upon onboarding, the developer will be automatically registered in Supabase Cloud DB, assigned the next sequential employee ID, and sent a formal welcome email with portal credentials.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddDevModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-950 cursor-pointer"
                    >
                      Onboard Developer
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE SPRINT TEAM CHALLENGE ─────────────────────────── */}
      {showCreateChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                Create Sprint Team Challenge
              </h3>
              <button
                onClick={() => setShowCreateChallengeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Challenge Title *</label>
                <input
                  type="text"
                  required
                  value={chalTitle}
                  onChange={(e) => setChalTitle(e.target.value)}
                  placeholder="e.g. Q4 Sprint Bug-Bash & Zero Blockers"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={chalDesc}
                  onChange={(e) => setChalDesc(e.target.value)}
                  placeholder="Goal criteria and how engineers contribute..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target XP Goal *</label>
                  <input
                    type="number"
                    min={100}
                    required
                    value={chalGoalXp}
                    onChange={(e) => setChalGoalXp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={chalEndDate}
                    onChange={(e) => setChalEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Squad Reward Description</label>
                <input
                  type="text"
                  value={chalReward}
                  onChange={(e) => setChalReward(e.target.value)}
                  placeholder="e.g. Team Swag & Recognition (+100 Bonus XP each)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateChallengeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Publish Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
