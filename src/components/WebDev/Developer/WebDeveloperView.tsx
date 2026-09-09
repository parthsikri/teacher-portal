import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Code2,
  GitBranch,
  GitPullRequest,
  Layers,
  Search,
  Send,
  ShieldCheck,
  Trophy,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  CheckSquare,
  Gift,
  Target,
  FileText,
  Heart,
  Building2,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  User,
  WebDevTask,
  WebDevProject,
  WebDevBounty,
  WebDevReward,
  WebDevRewardFulfillment,
  WebDevTeamChallenge,
  WebDevKudos,
  WebDevXPTransaction,
} from '../../../types';
import { WebDevService, calculateLevelFromXp } from '../../../services/webDevService';
import { TaskDetailModal } from '../Common/TaskDetailModal';
import { CertificateModal } from '../Common/CertificateModal';
import { CertificateVerificationModal } from '../Common/CertificateVerificationModal';

interface WebDeveloperViewProps {
  currentUser: User;
  currentPage?: string;
  onPageChange?: (page: string) => void;
  onRefreshUser?: () => void;
}

export const WebDeveloperView: React.FC<WebDeveloperViewProps> = ({
  currentUser,
  currentPage = 'dev_tasks',
  onPageChange,
  onRefreshUser,
}) => {
  // Navigation section synced directly with left panel
  const activeTab: 'tasks' | 'projects' | 'bounties' | 'leaderboard' | 'achievements' | 'rewards' | 'ledger' | 'team' = (() => {
    if (currentPage === 'dev_projects') return 'projects';
    if (currentPage === 'dev_bounties') return 'bounties';
    if (currentPage === 'dev_leaderboard') return 'leaderboard';
    if (currentPage === 'dev_achievements') return 'achievements';
    if (currentPage === 'dev_rewards') return 'rewards';
    if (currentPage === 'dev_ledger') return 'ledger';
    if (currentPage === 'dev_team') return 'team';
    return 'tasks';
  })();

  // Data state
  const [tasks, setTasks] = useState<WebDevTask[]>([]);
  const [projects, setProjects] = useState<WebDevProject[]>([]);
  const [bounties, setBounties] = useState<WebDevBounty[]>([]);
  const [rewards, setRewards] = useState<WebDevReward[]>([]);
  const [fulfillments, setFulfillments] = useState<WebDevRewardFulfillment[]>([]);
  const [challenges, setChallenges] = useState<WebDevTeamChallenge[]>([]);
  const [kudosList, setKudosList] = useState<WebDevKudos[]>([]);
  const [xpLedger, setXpLedger] = useState<WebDevXPTransaction[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'all_time'>('all_time');
  const [deptFilter, setDeptFilter] = useState<'all' | 'engineering' | 'faculty' | 'pr' | 'leadership'>('all');

  // Filter states
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedTask, setSelectedTask] = useState<WebDevTask | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<{
    fulfillment: WebDevRewardFulfillment;
    reward?: WebDevReward;
  } | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showKudosModal, setShowKudosModal] = useState(false);
  const [kudosRecipientId, setKudosRecipientId] = useState('');
  const [kudosMessage, setKudosMessage] = useState('');

  // Bounty submission modal
  const [claimBountyModal, setClaimBountyModal] = useState<WebDevBounty | null>(null);
  const [bountySolutionUrl, setBountySolutionUrl] = useState('');

  // Load all data
  const loadData = () => {
    const devTasks = WebDevService.getTasks({ assigneeId: currentUser.teacherId });
    const allProj = WebDevService.getProjects();
    const allBounties = WebDevService.getBounties();
    const allRewards = WebDevService.getRewards();
    const myFulfillments = WebDevService.getRewardFulfillments({ userId: currentUser.teacherId });
    const teamChallenges = WebDevService.getChallenges();
    const allKudos = WebDevService.getKudos();
    const myLedger = WebDevService.getXPLedger(currentUser.teacherId);

    setTasks(devTasks);
    setProjects(allProj);
    setBounties(allBounties);
    setRewards(allRewards);
    setFulfillments(myFulfillments);
    setChallenges(teamChallenges);
    setKudosList(allKudos);
    setXpLedger(myLedger);
    onRefreshUser?.();
  };

  useEffect(() => {
    loadData();
  }, [currentUser.teacherId]);

  // Derived user statistics
  const currentTotalXp = WebDevService.getUserTotalXP(currentUser.teacherId);
  const levelData = calculateLevelFromXp(currentTotalXp);
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasksCount = tasks.filter((t) => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter((t) => t.isBlocked);
  const reviewRequestedCount = tasks.filter((t) => t.status === 'review_requested').length;

  // Next reward calculation
  const eligibleNextReward = rewards
    .filter((r) => r.xpThreshold > currentTotalXp)
    .sort((a, b) => a.xpThreshold - b.xpThreshold)[0];

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  // Handle Send Kudos
  const handleSendKudos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kudosRecipientId || !kudosMessage.trim()) return;

    const users = WebDevService.getLeaderboard('all_time');
    const recipient = users.find((u) => u.userId === kudosRecipientId);
    if (!recipient) return;

    WebDevService.sendKudos({
      fromUserId: currentUser.teacherId,
      fromUserName: currentUser.name,
      toUserId: recipient.userId,
      toUserName: recipient.userName,
      message: kudosMessage.trim(),
    });

    try {
      confetti({ particleCount: 60, spread: 70 });
    } catch {
      // ignore
    }

    setShowKudosModal(false);
    setKudosRecipientId('');
    setKudosMessage('');
    loadData();
  };

  // Handle Claim Bounty
  const handleClaimBounty = (bountyId: string) => {
    const updated = WebDevService.claimBounty(bountyId, {
      id: currentUser.teacherId,
      name: currentUser.name,
    });
    if (updated) {
      loadData();
      try {
        confetti({ particleCount: 40, spread: 60 });
      } catch {
        // ignore
      }
    }
  };

  // Handle Submit Bounty
  const handleSubmitBounty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimBountyModal || !bountySolutionUrl.trim()) return;
    WebDevService.submitBounty(
      claimBountyModal.id,
      { id: currentUser.teacherId, name: currentUser.name },
      bountySolutionUrl.trim()
    );
    setClaimBountyModal(null);
    setBountySolutionUrl('');
    loadData();
  };

  // Handle Request Reward
  const handleRequestReward = (rewardId: string) => {
    const res = WebDevService.requestReward(rewardId, currentUser);
    if ('error' in res) {
      alert(res.error);
    } else {
      alert('Reward request submitted to manager! Check back soon for approval and issuance.');
      loadData();
    }
  };

  const leaderboardData = WebDevService.getLeaderboard(leaderboardPeriod, deptFilter);
  const myAchievements = WebDevService.getUserAchievements(currentUser.teacherId);
  const allAchievements = WebDevService.getAchievements();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* ─── HERO DEVELOPER PROFILE HEADER ────────────────────────────────────── */}
      <div className="relative border-b border-slate-800 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Developer Identity */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-500 to-purple-500 p-0.5 shadow-xl shadow-indigo-950">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                    {currentUser.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl sm:text-3xl font-black text-amber-300">
                        {currentUser.name?.charAt(0) || 'D'}
                      </span>
                    )}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-md">
                  LVL {levelData.level}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {currentUser.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {currentUser.webDevTitle || levelData.title}
                  </span>
                  {currentUser.githubUsername && (
                    <a
                      href={`https://github.com/${currentUser.githubUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      @{currentUser.githubUsername}
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active Sprint Contributor
                  </span>
                  <span>ID: <code className="text-slate-300 font-mono">{currentUser.teacherId}</code></span>
                  <span>Tasks Completed: <strong className="text-emerald-400">{completedTasksCount}</strong></span>
                  <span>In Progress: <strong className="text-sky-400">{inProgressTasksCount}</strong></span>
                  <span>In Review: <strong className="text-purple-400">{reviewRequestedCount}</strong></span>
                </div>
              </div>
            </div>

            {/* XP & Level Progress Card */}
            <div className="w-full lg:w-96 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                  <Trophy className="w-4 h-4" />
                  <span>{currentTotalXp.toLocaleString()} Total XP</span>
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  Next: Level {levelData.level + 1} ({levelData.nextLevelXp} XP)
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, levelData.progressPercent)}%` }}
                />
              </div>

              {eligibleNextReward && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-800/80">
                  <span className="truncate">Next Reward: <strong className="text-slate-200">{eligibleNextReward.title}</strong></span>
                  <span className="text-amber-400 font-bold flex-shrink-0 ml-2">
                    {eligibleNextReward.xpThreshold - currentTotalXp} XP to go
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Blockers Warning Banner (if any) */}
          {blockedTasks.length > 0 && (
            <div className="mt-6 bg-red-950/40 border border-red-500/40 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs text-red-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>
                  You have <strong>{blockedTasks.length} blocked task(s)</strong> awaiting resolution: {blockedTasks.map(t => t.title).join(', ')}
                </span>
              </div>
              <button
                onClick={() => {
                  onPageChange?.('dev_tasks');
                  setTaskStatusFilter('blocked');
                }}
                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg font-semibold flex-shrink-0 transition-colors"
              >
                View Blockers
              </button>
            </div>
          )}

          {/* Executive Sub-Header / Current Workspace Context */}
          <div className="pt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 mt-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Developer Workspace</span>
              <span className="text-slate-600">/</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-semibold flex items-center gap-1.5">
                {activeTab === 'tasks' && <CheckSquare className="w-3.5 h-3.5 text-amber-400" />}
                {activeTab === 'projects' && <Layers className="w-3.5 h-3.5 text-blue-400" />}
                {activeTab === 'bounties' && <Target className="w-3.5 h-3.5 text-emerald-400" />}
                {activeTab === 'leaderboard' && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                {activeTab === 'achievements' && <Award className="w-3.5 h-3.5 text-purple-400" />}
                {activeTab === 'rewards' && <Gift className="w-3.5 h-3.5 text-pink-400" />}
                {activeTab === 'ledger' && <FileText className="w-3.5 h-3.5 text-indigo-400" />}
                {activeTab === 'team' && <Heart className="w-3.5 h-3.5 text-red-400" />}
                {activeTab === 'tasks' && 'My Active Work & Backlog'}
                {activeTab === 'projects' && 'Projects & Milestones'}
                {activeTab === 'bounties' && 'Open Engineering Bounties'}
                {activeTab === 'leaderboard' && 'Organization Leaderboard'}
                {activeTab === 'achievements' && 'Milestones & Badges'}
                {activeTab === 'rewards' && 'Certificates & Swag'}
                {activeTab === 'ledger' && 'XP Ledger & Audit Log'}
                {activeTab === 'team' && 'Challenges & Kudos'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="hidden sm:inline">Use the <strong>left sidebar</strong> to switch between work modules</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── TAB 1: MY TASKS ──────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, descriptions, #tags..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'review_requested', label: 'Under Review' },
                  { id: 'changes_requested', label: 'Changes Req' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'blocked', label: 'Blocked' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTaskStatusFilter(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      taskStatusFilter === s.id
                        ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Grid / Cards */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-semibold text-slate-300">No tasks found matching filter</h3>
                <p className="text-xs text-slate-500">Check back later or browse open bounties to take on new initiatives.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map((t) => {
                  const completedSub = (t.subtasks || []).filter((s) => s.completed).length;
                  const totalSub = (t.subtasks || []).length;
                  const percent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                              {t.id}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize font-medium">
                              {t.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Award className="w-3.5 h-3.5" />
                              +{t.xpReward} XP
                            </span>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                          {t.title}
                        </h3>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-800/80">
                        {/* Subtasks Progress */}
                        {totalSub > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Subtasks ({completedSub}/{totalSub})</span>
                              <span className="font-semibold text-slate-300">{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                              t.status === 'review_requested' ? 'bg-amber-500/20 text-amber-300' :
                              t.status === 'changes_requested' ? 'bg-rose-500/20 text-rose-300' :
                              t.status === 'blocked' ? 'bg-red-500/20 text-red-300' :
                              'bg-indigo-500/20 text-indigo-300'
                            }`}>
                              {t.status.replace('_', ' ')}
                            </span>
                            {t.dueDate && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {t.dueDate}
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Open Task
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: PROJECTS & MILESTONES ─────────────────────────────────── */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projects.map((proj) => {
                const projMilestones = WebDevService.getMilestones(proj.id);
                const projTasks = WebDevService.getTasks({ projectId: proj.id });
                const myProjTasks = projTasks.filter((t) => t.assigneeId === currentUser.teacherId);

                return (
                  <div key={proj.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                            {proj.key}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                            proj.status === 'in_progress' ? 'bg-indigo-500/20 text-indigo-300' :
                            proj.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {proj.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mt-1.5">{proj.title}</h2>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{proj.description}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Overall Project Milestone Completion</span>
                        <span className="font-bold text-white">{proj.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-indigo-500 h-2 rounded-full"
                          style={{ width: `${proj.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-1.5">
                      {proj.techStack.map((tech) => (
                        <span key={tech} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono">
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Milestones list */}
                    {projMilestones.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Active Milestones ({projMilestones.length})
                        </div>
                        <div className="space-y-1.5">
                          {projMilestones.map((m) => (
                            <div key={m.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-200">{m.title}</div>
                                <div className="text-[10px] text-slate-500">Target: {m.targetDate}</div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                m.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                                m.status === 'in_progress' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {m.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer links */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                      <span>My Assigned Tasks: <strong className="text-amber-300">{myProjTasks.length}</strong></span>
                      {proj.repositoryUrl && (
                        <a
                          href={proj.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          Repository
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 3: OPEN BOUNTIES ─────────────────────────────────────────── */}
        {activeTab === 'bounties' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  Self-Service Engineering Bounties
                </h2>
                <p className="text-xs text-slate-400 max-w-xl">
                  Take on high-impact challenges, performance optimizations, and security audits outside sprint tasks. Earn instant recognition and bonus XP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bounties.map((bounty) => {
                const isClaimedByMe = bounty.claimedById === currentUser.teacherId;
                const isOpen = bounty.status === 'open';

                return (
                  <div
                    key={bounty.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          bounty.difficulty === 'hard' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          bounty.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {bounty.difficulty}
                        </span>

                        <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          <Award className="w-3.5 h-3.5" />
                          +{bounty.xpReward} XP
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">{bounty.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{bounty.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="capitalize text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                          #{bounty.category}
                        </span>
                        <span className={`text-[11px] font-semibold ${
                          bounty.status === 'completed' ? 'text-emerald-400' :
                          bounty.status === 'assigned' ? 'text-amber-400' :
                          bounty.status === 'submitted' ? 'text-indigo-400' :
                          'text-slate-400'
                        }`}>
                          Status: {bounty.status.toUpperCase()}
                        </span>
                      </div>

                      {isOpen && (
                        <button
                          onClick={() => handleClaimBounty(bounty.id)}
                          className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all"
                        >
                          Claim Bounty (+{bounty.xpReward} XP)
                        </button>
                      )}

                      {isClaimedByMe && bounty.status === 'assigned' && (
                        <button
                          onClick={() => setClaimBountyModal(bounty)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <GitPullRequest className="w-3.5 h-3.5" />
                          Submit Solution Proof
                        </button>
                      )}

                      {isClaimedByMe && bounty.status === 'submitted' && (
                        <div className="p-2 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-center text-xs text-indigo-300 font-medium">
                          Solution Submitted • Awaiting Manager Approval
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 4: LEADERBOARD ───────────────────────────────────────────── */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Organization-Wide All-Hands Leaderboard
                </h2>
                <p className="text-xs text-slate-400">
                  Cross-functional competition uniting Academic Faculty, Engineering, PR & Growth, and Leadership
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
                const isSelected = deptFilter === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setDeptFilter(dept.id as any)}
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

            {/* Podium for Top 3 */}
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
                    className={`relative bg-slate-900/90 border rounded-2xl p-5 text-center shadow-xl space-y-3 ${
                      item.userId === currentUser.teacherId ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-800'
                    }`}
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
                      <h4 className="font-bold text-white text-base flex items-center justify-center gap-1.5">
                        <span>{item.userName}</span>
                        {item.userId === currentUser.teacherId && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-bold">
                            YOU
                          </span>
                        )}
                      </h4>
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

            {/* Complete Ranking List */}
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
                  {leaderboardData.map((row) => {
                    const isMe = row.userId === currentUser.teacherId;
                    return (
                      <tr
                        key={row.userId}
                        className={`transition-colors ${isMe ? 'bg-amber-500/10' : 'hover:bg-slate-800/40'}`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-300 text-center">
                          #{row.rank}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{row.userName}</span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 5: ACHIEVEMENTS ─────────────────────────────────────────── */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Engineering Milestones & Badges
                </h2>
                <p className="text-xs text-slate-400">
                  Unlocked {myAchievements.length} of {allAchievements.length} official badges
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allAchievements.map((ach) => {
                const unlocked = myAchievements.find((ua) => ua.achievement.id === ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-2xl p-5 border transition-all ${
                      unlocked
                        ? 'bg-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                        {ach.icon}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          +{ach.xpBonus} XP
                        </span>
                        {unlocked && (
                          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                            ✓ Unlocked
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-base mt-3">{ach.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ach.description}</p>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                      Criteria: {ach.criteriaDescription}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 6: REWARDS & CERTIFICATES ───────────────────────────────── */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  Engineering Recognition, Certificates & Swag
                </h2>
                <p className="text-xs text-slate-400">
                  Redeem earned XP milestones for verified credentials and leadership recognition
                </p>
              </div>

              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Verify Any Certificate ID
              </button>
            </div>

            {/* Issued Credentials Wall */}
            {fulfillments.filter((f) => f.status === 'fulfilled' && f.certificateId).length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm uppercase tracking-wider">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  My Issued Official Digital Certificates
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fulfillments
                    .filter((f) => f.status === 'fulfilled' && f.certificateId)
                    .map((f) => {
                      const r = rewards.find((rew) => rew.id === f.rewardId);
                      return (
                        <div
                          key={f.id}
                          className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 shadow-xl space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-2xl">{r?.icon || '📜'}</span>
                            <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {f.verificationCode}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-white text-sm">{r?.title || 'Engineering Certificate'}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Issued: {f.issueDate}</p>
                          </div>

                          <button
                            onClick={() => setSelectedCertificate({ fulfillment: f, reward: r })}
                            className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View & Download PDF
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Catalog of Recognition Milestones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward) => {
                const fulfillment = fulfillments.find((f) => f.rewardId === reward.id);
                const isEligible = currentTotalXp >= reward.xpThreshold;
                const isFulfilled = fulfillment?.status === 'fulfilled';
                const isPending = fulfillment?.status === 'pending';

                return (
                  <div
                    key={reward.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-3xl">{reward.icon}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          isEligible
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {reward.xpThreshold} XP Required
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">{reward.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{reward.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800">
                      {isFulfilled ? (
                        <button
                          onClick={() => setSelectedCertificate({ fulfillment, reward })}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Issued • View Certificate
                        </button>
                      ) : isPending ? (
                        <div className="py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-xs font-semibold text-amber-300">
                          Request Pending Manager Approval
                        </div>
                      ) : isEligible ? (
                        <button
                          onClick={() => handleRequestReward(reward.id)}
                          className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all"
                        >
                          Claim Reward
                        </button>
                      ) : (
                        <div className="py-2 bg-slate-800/40 rounded-xl text-center text-xs text-slate-500">
                          Locked ({reward.xpThreshold - currentTotalXp} XP needed)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 7: XP LEDGER ────────────────────────────────────────────── */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Engineering XP Ledger & History
                </h2>
                <p className="text-xs text-slate-400">Complete immutable record of all earned XP and manager bonuses</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Transaction ID</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Awarded By</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">XP Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {xpLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{tx.id}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.type === 'manager_bonus' ? 'bg-purple-500/20 text-purple-300' :
                          tx.type === 'task_approved' ? 'bg-emerald-500/20 text-emerald-300' :
                          tx.type === 'bounty_approved' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {tx.type ? tx.type.replace('_', ' ') : 'XP'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200 font-medium">{tx.description}</td>
                      <td className="py-3.5 px-4 text-slate-400">{tx.awardedByName || 'System'}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(tx.createdAt || 0).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        +{tx.amount} XP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 8: KUDOS & CHALLENGES ───────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Active Challenge Banner */}
            {challenges.map((c) => {
              const curXp = c.currentXp || 0;
              const gXp = c.goalXp || 1;
              const pct = Math.min(100, Math.round((curXp / gXp) * 100));
              return (
                <div
                  key={c.id}
                  className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
                          Sprint Team Challenge
                        </span>
                        <span className="text-xs text-slate-400">Ends: {c.endDate}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{c.title}</h3>
                      <p className="text-xs text-slate-300">{c.description}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-purple-300">
                        {curXp.toLocaleString()} / {gXp.toLocaleString()} XP
                      </div>
                      <div className="text-[11px] text-slate-400">{pct}% Complete</div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>Reward: <strong>{c.rewardDescription}</strong></span>
                    <span className="text-purple-400 font-semibold">Every closed task & PR contributes!</span>
                  </div>
                </div>
              );
            })}

            {/* Peer Recognition / Kudos Wall */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-400" />
                    Peer Recognition & Kudos Wall
                  </h3>
                  <p className="text-xs text-slate-400">Celebrate engineering team members for great code and support</p>
                </div>

                <button
                  onClick={() => setShowKudosModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Peer Kudos (+25 XP)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kudosList.map((k) => (
                  <div key={k.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{k.fromUserName}</span>
                        <span className="text-slate-500">→</span>
                        <span className="font-bold text-amber-300">{k.toUserName}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        +{k.xpAmount} XP
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      "{k.message}"
                    </p>

                    <div className="text-[10px] text-slate-500">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: TASK DETAIL DRAWER ────────────────────────────────────────── */}
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

      {/* ─── MODAL: CERTIFICATE VIEWER & DOWNLOAD ─────────────────────────────── */}
      {selectedCertificate && (
        <CertificateModal
          fulfillment={selectedCertificate.fulfillment}
          reward={selectedCertificate.reward}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

      {/* ─── MODAL: CERTIFICATE VERIFICATION ──────────────────────────────────── */}
      {showVerifyModal && (
        <CertificateVerificationModal onClose={() => setShowVerifyModal(false)} />
      )}

      {/* ─── MODAL: SEND KUDOS ────────────────────────────────────────────────── */}
      {showKudosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              Send Peer Recognition Kudos
            </h3>
            <p className="text-xs text-slate-400">
              Recognize a fellow developer for assistance, thorough code reviews, or pairing. The recipient receives +25 XP!
            </p>

            <form onSubmit={handleSendKudos} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Teammate</label>
                <select
                  required
                  value={kudosRecipientId}
                  onChange={(e) => setKudosRecipientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Developer --</option>
                  {leaderboardData
                    .filter((u) => u.userId !== currentUser.teacherId)
                    .map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.userName} ({u.userTitle})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message *</label>
                <textarea
                  rows={3}
                  required
                  value={kudosMessage}
                  onChange={(e) => setKudosMessage(e.target.value)}
                  placeholder="Thank you for helping me debug the websocket connection issue!"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKudosModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-500/20"
                >
                  Send Kudos (+25 XP)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: SUBMIT BOUNTY SOLUTION ────────────────────────────────────── */}
      {claimBountyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GitPullRequest className="w-5 h-5 text-indigo-400" />
              Submit Bounty Solution
            </h3>
            <p className="text-xs text-slate-400">
              Provide PR link, branch, or live demo for: <strong className="text-white">{claimBountyModal.title}</strong>
            </p>

            <form onSubmit={handleSubmitBounty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  GitHub Pull Request / Demo URL *
                </label>
                <input
                  type="url"
                  required
                  value={bountySolutionUrl}
                  onChange={(e) => setBountySolutionUrl(e.target.value)}
                  placeholder="https://github.com/apna-engineering-wallah/repo/pull/55"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimBountyModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
                >
                  Submit Solution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
