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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  User,
  WebDevTask,
  WebDevProject,
  WebDevBounty,
  WebDevReward,
  WebDevRewardFulfillment,
  WebDevAuditLog,
} from '../../../types';
import { WebDevService, calculateLevelFromXp } from '../../../services/webDevService';
import { StorageService } from '../../../services/storage';
import { TaskDetailModal } from '../Common/TaskDetailModal';
import { CertificateModal } from '../Common/CertificateModal';

interface WebDevManagerViewProps {
  currentUser: User;
}

export const WebDevManagerView: React.FC<WebDevManagerViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<
    'review_desk' | 'tasks' | 'projects' | 'bounties' | 'fulfillments' | 'team' | 'audit'
  >('review_desk');

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
  const [searchQuery, setSearchQuery] = useState('');

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
  const [newTaskProject, setNewTaskProject] = useState('PROJ-01');
  const [newTaskType, setNewTaskType] = useState<WebDevTask['type']>('feature');
  const [newTaskPriority, setNewTaskPriority] = useState<WebDevTask['priority']>('medium');
  const [newTaskXp, setNewTaskXp] = useState<number>(200);
  const [newTaskAssignee, setNewTaskAssignee] = useState('AEW-DEV-01');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('Frontend, React');

  // Create Bounty Modal State
  const [showCreateBountyModal, setShowCreateBountyModal] = useState(false);
  const [newBountyTitle, setNewBountyTitle] = useState('');
  const [newBountyDesc, setNewBountyDesc] = useState('');
  const [newBountyXp, setNewBountyXp] = useState(250);
  const [newBountyDiff, setNewBountyDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newBountyCat, setNewBountyCat] = useState<'feature' | 'bugfix' | 'optimization' | 'security' | 'testing'>('optimization');

  // Create Project Modal State
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjKey, setNewProjKey] = useState('');
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjRepo, setNewProjRepo] = useState('');
  const [newProjTech, setNewProjTech] = useState('Next.js, TypeScript, PostgreSQL');
  const [newProjLead, setNewProjLead] = useState('AEW-DEV-01');
  const [newProjTarget, setNewProjTarget] = useState('2026-11-15');

  const loadData = () => {
    const allTasks = WebDevService.getTasks();
    const allProjects = WebDevService.getProjects();
    const allBounties = WebDevService.getBounties();
    const allRewards = WebDevService.getRewards();
    const allFulfillments = WebDevService.getRewardFulfillments();
    const allLogs = WebDevService.getAuditLogs();
    const devs = StorageService.getUsers().filter(
      (u) => u.role === 'web_developer' || u.role === 'web_dev_manager'
    );

    setTasks(allTasks);
    setProjects(allProjects);
    setBounties(allBounties);
    setRewards(allRewards);
    setFulfillments(allFulfillments);
    setAuditLogs(allLogs);
    setDevelopers(devs);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Attention Center KPIs
  const pendingReviews = tasks.filter((t) => t.status === 'review_requested');
  const blockedTasks = tasks.filter((t) => t.isBlocked);
  const pendingFulfillments = fulfillments.filter((f) => f.status === 'pending');
  const activeTasksCount = tasks.filter((t) => t.status === 'in_progress').length;
  const totalAwardedXp = WebDevService.getXPLedger().reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
    if (taskProjectFilter !== 'all' && t.projectId !== taskProjectFilter) return false;
    if (taskAssigneeFilter !== 'all' && t.assigneeId !== taskAssigneeFilter) return false;
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

    const assignedUser = developers.find((d) => d.teacherId === newTaskAssignee);
    const tagsArr = newTaskTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    WebDevService.saveTask(
      {
        id: newTaskId.trim() || `TASK-${Date.now().toString().slice(-4)}`,
        projectId: newTaskProject,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        type: newTaskType,
        priority: newTaskPriority,
        status: 'in_progress',
        xpReward: Number(newTaskXp) || 150,
        assigneeId: assignedUser?.teacherId,
        assigneeName: assignedUser?.name,
        reviewerId: currentUser.teacherId,
        reviewerName: currentUser.name,
        dueDate: newTaskDue || undefined,
        tags: tagsArr,
        subtasks: [
          { id: `sub-${Date.now()}-1`, taskId: '', title: 'Initial technical research & setup', completed: false },
          { id: `sub-${Date.now()}-2`, taskId: '', title: 'Core code implementation & unit tests', completed: false },
          { id: `sub-${Date.now()}-3`, taskId: '', title: 'Verify PR diff & demo link', completed: false },
        ],
        isBlocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { id: currentUser.teacherId, name: currentUser.name }
    );

    setShowCreateTaskModal(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskId('');
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

  // Handle Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim()) return;

    const leadDev = developers.find((d) => d.teacherId === newProjLead);
    const techArr = newProjTech.split(',').map((s) => s.trim()).filter(Boolean);

    WebDevService.saveProject(
      {
        id: `PROJ-${Date.now().toString().slice(-4)}`,
        key: newProjKey.trim().toUpperCase() || 'PROJ',
        title: newProjTitle.trim(),
        description: newProjDesc.trim(),
        repositoryUrl: newProjRepo.trim() || undefined,
        techStack: techArr,
        status: 'planning',
        priority: 'high',
        managerId: currentUser.teacherId,
        managerName: currentUser.name,
        leadDeveloperId: leadDev?.teacherId,
        leadDeveloperName: leadDev?.name,
        progressPercentage: 10,
        startDate: new Date().toISOString().split('T')[0],
        targetDate: newProjTarget || '2026-12-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { id: currentUser.teacherId, name: currentUser.name }
    );

    setShowCreateProjectModal(false);
    setNewProjKey('');
    setNewProjTitle('');
    setNewProjDesc('');
    loadData();
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
                <span className="text-xs text-slate-400 font-mono">AEW-WDM-01</span>
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
                onClick={() => setShowCreateTaskModal(true)}
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mt-8">
            <div
              onClick={() => setActiveTab('review_desk')}
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
                setActiveTab('tasks');
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
              onClick={() => setActiveTab('projects')}
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
              onClick={() => setActiveTab('fulfillments')}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Reward Requests</span>
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {pendingFulfillments.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Certificates & perks</div>
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

          {/* Navigation Sub-tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pt-6 scrollbar-none">
            {[
              { id: 'review_desk', label: 'Review Desk', count: pendingReviews.length, icon: Shield },
              { id: 'tasks', label: 'All Tasks & Workload', count: tasks.length, icon: CheckSquare },
              { id: 'projects', label: 'Projects & Milestones', count: projects.length, icon: Layers },
              { id: 'bounties', label: 'Bounties Desk', count: bounties.length, icon: Target },
              { id: 'fulfillments', label: 'Rewards Fulfillment', count: pendingFulfillments.length, icon: Gift },
              { id: 'team', label: 'Engineering Team', count: developers.length, icon: Users },
              { id: 'audit', label: 'Audit Trail', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <option value="all">All Developers</option>
                  {developers.map((d) => (
                    <option key={d.teacherId} value={d.teacherId}>
                      {d.name}
                    </option>
                  ))}
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
                        <div className="font-semibold text-white max-w-xs truncate">{t.title}</div>
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
                          t.status === 'review_requested' ? 'bg-amber-500/20 text-amber-300' :
                          t.status === 'changes_requested' ? 'bg-rose-500/20 text-rose-300' :
                          t.status === 'blocked' ? 'bg-red-500/20 text-red-300' :
                          'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{t.dueDate || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                        +{t.xpReward} XP
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedTask(t)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition-colors"
                        >
                          Manage
                        </button>
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
                return (
                  <div key={proj.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                            {proj.key}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                            {proj.status}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mt-1">{proj.title}</h2>
                        <p className="text-xs text-slate-400 mt-1">{proj.description}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Milestone Progress</span>
                        <span className="font-bold text-white">{proj.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-indigo-500 h-2 rounded-full"
                          style={{ width: `${proj.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Roadmap Milestones ({projMilestones.length})
                      </div>
                      <div className="space-y-1.5">
                        {projMilestones.map((m) => (
                          <div key={m.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-slate-200">{m.title}</div>
                              <div className="text-[10px] text-slate-500">Target: {m.targetDate}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize bg-slate-800 text-slate-300">
                              {m.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
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
              {bounties.map((b) => (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-800 text-slate-300">
                      {b.difficulty}
                    </span>
                    <span className="text-xs font-bold text-amber-400">+{b.xpReward} XP</span>
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
                      <button
                        onClick={() => {
                          WebDevService.approveBounty(
                            b.id,
                            { id: currentUser.teacherId, name: currentUser.name },
                            'Excellent solution! High performance and test coverage verified.'
                          );
                          loadData();
                        }}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                      >
                        Approve Bounty & Award {b.xpReward} XP
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 5: REWARDS FULFILLMENT ───────────────────────────────────── */}
        {activeTab === 'fulfillments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  Engineering Recognition & Certificate Issuance
                </h2>
                <p className="text-xs text-slate-400">
                  Fulfill digital verified certificates with unique credential IDs and dispatch swag kits
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {fulfillments.map((f) => {
                const r = rewards.find((rew) => rew.id === f.rewardId);
                const isPending = f.status === 'pending';

                return (
                  <div
                    key={f.id}
                    className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isPending ? 'border-amber-500/50' : 'border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{r?.icon || '📜'}</span>
                        <h3 className="text-base font-bold text-white">{r?.title || 'Reward'}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isPending ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {f.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Recipient: <strong className="text-white">{f.userName}</strong> ({f.userTitle}) • Requested: {f.requestedAt ? new Date(f.requestedAt).toLocaleDateString() : 'Recent'}
                      </p>
                      {f.verificationCode && (
                        <div className="text-xs text-amber-400 font-mono flex items-center gap-1.5 mt-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Credential ID: {f.verificationCode}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <button
                          onClick={() => handleFulfillReward(f.id)}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-950 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Issue Verified Certificate
                        </button>
                      ) : (
                        <button
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
          </div>
        )}

        {/* ─── TAB 6: ENGINEERING TEAM ─────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {developers.map((dev) => {
                const devTasks = tasks.filter((t) => t.assigneeId === dev.teacherId);
                const devActiveTasks = devTasks.filter((t) => t.status === 'in_progress');
                const devBlocked = devTasks.filter((t) => t.isBlocked);
                const devXp = WebDevService.getUserTotalXP(dev.teacherId);
                const lvl = calculateLevelFromXp(devXp);

                return (
                  <div key={dev.teacherId} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-500 p-0.5 shadow-md">
                        <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-black text-amber-300">
                          {dev.name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">{dev.name}</h4>
                        <p className="text-xs text-slate-400">{dev.webDevTitle || lvl.title}</p>
                      </div>
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

                    {dev.skills && (
                      <div className="flex flex-wrap gap-1">
                        {dev.skills.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 7: AUDIT TRAIL ───────────────────────────────────────────── */}
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
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
                    {developers.map((d) => (
                      <option key={d.teacherId} value={d.teacherId}>
                        {d.name}
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
