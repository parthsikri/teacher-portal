import React, { useState, useMemo, useEffect } from 'react';
import type {
  User,
  PrTask,
  PrLead,
  PrMouRequest,
  PrTier,
  PrTaskCategory,
  PrTaskPriority
} from '../../types';
import { StorageService } from '../../services/storage';
import {
  Award,
  Star,
  TrendingUp,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Trash2,
  Sparkles,
  Check,
  X,
  Printer
} from 'lucide-react';

interface PrManagementSectionProps {
  onRefreshData?: () => void;
  refreshTrigger?: number;
}

export const PrManagementSection: React.FC<PrManagementSectionProps> = ({
  onRefreshData,
  refreshTrigger = 0,
}) => {
  // Local state pulled directly from storage
  const [interns, setInterns] = useState<User[]>(() => StorageService.getPrInterns());
  const [tasks, setTasks] = useState<PrTask[]>(() => StorageService.getPrTasks());
  const [leads, setLeads] = useState<PrLead[]>(() => StorageService.getPrLeads());
  const [mous, setMous] = useState<PrMouRequest[]>(() => StorageService.getPrMous());

  // Sub-tabs: reviews | roster | tasks | mous | leads
  const [activeSubTab, setActiveSubTab] = useState<'reviews' | 'roster' | 'tasks' | 'mous' | 'leads'>('reviews');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'open' | 'submitted' | 'approved' | 'revision_requested'>('all');

  // Modals state
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [reviewingTask, setReviewingTask] = useState<PrTask | null>(null);
  const [rewardingIntern, setRewardingIntern] = useState<User | null>(null);
  const [previewingMou, setPreviewingMou] = useState<PrMouRequest | null>(null);

  // Assign Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState<PrTaskCategory>('college_sponsorship');
  const [taskAssignedInternId, setTaskAssignedInternId] = useState<string>('all');
  const [taskStarsReward, setTaskStarsReward] = useState<number>(3);
  const [taskPointsReward, setTaskPointsReward] = useState<number>(50);
  const [taskDeadline, setTaskDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [taskPriority, setTaskPriority] = useState<PrTaskPriority>('high');

  // Review Task Form State
  const [reviewStars, setReviewStars] = useState<number>(3);
  const [reviewPoints, setReviewPoints] = useState<number>(50);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // Onboard Intern Form State
  const [newInternName, setNewInternName] = useState('');
  const [newInternUsername, setNewInternUsername] = useState('');
  const [newInternPassword, setNewInternPassword] = useState('intern123');
  const [newInternEmail, setNewInternEmail] = useState('');
  const [newInternPhone, setNewInternPhone] = useState('');
  const [newInternTier, setNewInternTier] = useState<PrTier>('Silver');
  const [newInternCollege, setNewInternCollege] = useState('');

  // Direct Bonus / Star Reward Form State
  const [bonusStars, setBonusStars] = useState<number>(1);
  const [bonusPoints, setBonusPoints] = useState<number>(25);
  const [bonusReason, setBonusReason] = useState('');

  // Synchronize with external changes
  const reloadData = () => {
    setInterns(StorageService.getPrInterns());
    setTasks(StorageService.getPrTasks());
    setLeads(StorageService.getPrLeads());
    setMous(StorageService.getPrMous());
    if (onRefreshData) onRefreshData();
  };

  useEffect(() => {
    reloadData();
  }, [refreshTrigger]);

  // Aggregate Key Metrics
  const metrics = useMemo(() => {
    const totalSponsorshipRevenue = leads
      .filter((l) => l.stage === 'closed_won')
      .reduce((sum, l) => sum + (l.closedAmount || l.expectedSponsorshipAmount || 0), 0);

    const totalCommissionsEarned = leads
      .filter((l) => l.stage === 'closed_won')
      .reduce((sum, l) => sum + (l.commissionEarned || 0), 0);

    const pendingReviewsCount = tasks.filter((t) => t.status === 'submitted').length;
    const pendingMousCount = mous.filter((m) => m.status === 'pending_admin_approval').length;
    const activeLeadsCount = leads.filter((l) => l.stage !== 'closed_lost').length;

    return {
      totalSponsorshipRevenue,
      totalCommissionsEarned,
      pendingReviewsCount,
      pendingMousCount,
      activeLeadsCount,
    };
  }, [tasks, leads, mous]);

  // Pending Task Submissions
  const submittedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'submitted');
  }, [tasks]);

  // Handle Assign Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDescription.trim()) return;

    if (taskAssignedInternId === 'all') {
      // Broadcast to all PR interns
      interns.forEach((intern) => {
        StorageService.createPrTask({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          category: taskCategory,
          assignedToInternId: intern.teacherId,
          assignedToInternName: intern.name,
          starsReward: Number(taskStarsReward),
          pointsReward: Number(taskPointsReward),
          deadline: taskDeadline,
          priority: taskPriority,
        });
      });
    } else {
      const selected = interns.find((i) => i.teacherId === taskAssignedInternId);
      StorageService.createPrTask({
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        category: taskCategory,
        assignedToInternId: taskAssignedInternId,
        assignedToInternName: selected ? selected.name : 'PR Intern',
        starsReward: Number(taskStarsReward),
        pointsReward: Number(taskPointsReward),
        deadline: taskDeadline,
        priority: taskPriority,
      });
    }

    setShowAssignTaskModal(false);
    setTaskTitle('');
    setTaskDescription('');
    reloadData();
  };

  // Open Review Modal with prefilled values
  const handleOpenReview = (task: PrTask) => {
    setReviewingTask(task);
    setReviewStars(task.starsReward || 3);
    setReviewPoints(task.pointsReward || 50);
    setReviewRemarks('');
  };

  // Handle Approve Task (Award Stars & Points)
  const handleConfirmApproveTask = () => {
    if (!reviewingTask) return;
    const result = StorageService.approvePrTask(
      reviewingTask.id,
      Number(reviewPoints),
      Number(reviewStars),
      reviewRemarks.trim() || 'Verified and approved by Academic & PR Operations Admin.'
    );

    if (result && result.promoted && result.intern) {
      alert(`🎉 Milestone reached! ${result.intern.name} has been promoted to ${result.intern.prTier} Tier! (New commission rate: ${StorageService.getTierCommissionRate(result.intern.prTier!)}%)`);
    }

    setReviewingTask(null);
    reloadData();
  };

  // Handle Reject / Request Revision on Task
  const handleConfirmRejectTask = () => {
    if (!reviewingTask) return;
    StorageService.rejectPrTask(
      reviewingTask.id,
      reviewRemarks.trim() || 'Please submit comprehensive proof of outreach (email thread, photos, or signoff).'
    );
    setReviewingTask(null);
    reloadData();
  };

  // Handle Onboard PR Intern
  const handleCreateIntern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternName.trim() || !newInternUsername.trim()) return;

    // Generate next PR Intern ID
    const count = interns.length + 1;
    const nextId = `AEW-PR-${String(count).padStart(2, '0')}`;

    StorageService.addPrIntern({
      teacherId: nextId,
      username: newInternUsername.trim().toLowerCase(),
      password: newInternPassword.trim() || 'intern123',
      name: newInternName.trim(),
      email: newInternEmail.trim() || `${newInternUsername.toLowerCase()}@aew.com`,
      phone: newInternPhone.trim(),
      prTier: newInternTier,
      prPoints: newInternTier === 'Gold' ? 120 : newInternTier === 'Premium' ? 350 : 0,
      prStars: newInternTier === 'Gold' ? 6 : newInternTier === 'Premium' ? 18 : 0,
      department: 'Public Relations & Sponsorship',
      subject: newInternCollege.trim() || 'College Sponsorship & Outreach',
      dailyTargetMinutes: 0,
      dailyLimit: 0,
    });

    setShowOnboardModal(false);
    setNewInternName('');
    setNewInternUsername('');
    setNewInternEmail('');
    setNewInternPhone('');
    setNewInternCollege('');
    reloadData();
  };

  // Handle Direct Star & Point Bonus Grant
  const handleConfirmBonus = () => {
    if (!rewardingIntern) return;
    const prevPoints = rewardingIntern.prPoints || 0;
    const prevStars = rewardingIntern.prStars || 0;
    const newPoints = prevPoints + Number(bonusPoints);
    const newStars = prevStars + Number(bonusStars);
    const newTier = StorageService.calculateTierFromPointsAndStars(newPoints, newStars);
    const promoted = rewardingIntern.prTier !== newTier && (newTier === 'Gold' || newTier === 'Premium');

    StorageService.updateUser(rewardingIntern.id, {
      prPoints: newPoints,
      prStars: newStars,
      prTier: newTier,
    });

    if (promoted) {
      alert(`🎉 Promotion Alert! ${rewardingIntern.name} upgraded to ${newTier} Tier (${StorageService.getTierCommissionRate(newTier)}% commission)!`);
    } else {
      alert(`⭐ Successfully awarded ${bonusStars} Stars and ${bonusPoints} Points to ${rewardingIntern.name}!`);
    }

    setRewardingIntern(null);
    setBonusStars(1);
    setBonusPoints(25);
    setBonusReason('');
    reloadData();
  };

  // Handle MOU Approval
  const handleMouStatusUpdate = (mouId: string, status: 'approved' | 'rejected', feedback: string) => {
    StorageService.updatePrMouStatus(mouId, status, feedback);
    if (previewingMou && previewingMou.id === mouId) {
      setPreviewingMou(null);
    }
    reloadData();
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER COMMAND BAR ────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3 tracking-wide">
              <Sparkles className="w-3.5 h-3.5" /> PR Gamification & Sponsorship Governance
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight flex items-center gap-3">
              <Award className="w-8 h-8 text-amber-400" /> PR Outreach War Room
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Calibrate intern tiers (<span className="text-slate-300 font-semibold">Silver 3.3%</span> • <span className="text-amber-300 font-semibold">Gold 7.0%</span> • <span className="text-purple-300 font-semibold">Premium 12.0%</span>), review proof submissions to award <span className="text-amber-400 font-semibold">⭐ Stars & 🎖️ Points</span>, and authorize binding college MOUs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAssignTaskModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Assign Outreach Task
            </button>
            <button
              onClick={() => setShowOnboardModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-400" /> Onboard PR Intern
            </button>
          </div>
        </div>

        {/* ─── LIVE METRIC CARDS ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Sponsorship</span>
            <span className="text-lg md:text-xl font-black text-emerald-400 mt-1 block">
              ₹{metrics.totalSponsorshipRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Closed Won pipeline</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Intern Commission</span>
            <span className="text-lg md:text-xl font-black text-amber-400 mt-1 block">
              ₹{metrics.totalCommissionsEarned.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Tier-based payouts</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Awaiting Review</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg md:text-xl font-black text-amber-300">
                {metrics.pendingReviewsCount}
              </span>
              {metrics.pendingReviewsCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Proof submissions</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending MOUs</span>
            <span className="text-lg md:text-xl font-black text-indigo-400 mt-1 block">
              {metrics.pendingMousCount}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Legal signoff queue</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 col-span-2 md:col-span-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active PR Interns</span>
            <span className="text-lg md:text-xl font-black text-purple-400 mt-1 block">
              {interns.length}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Silver, Gold & Premium</span>
          </div>
        </div>
      </div>

      {/* ─── SUB-NAVIGATION BAR ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('reviews')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'reviews'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Task Submissions
            {submittedTasks.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-slate-950">
                {submittedTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'roster'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            PR Interns Roster ({interns.length})
          </button>

          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'tasks'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            All Tasks ({tasks.length})
          </button>

          <button
            onClick={() => setActiveSubTab('mous')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'mous'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            MOU Legal Desk ({mous.length})
            {metrics.pendingMousCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-purple-500 text-white">
                {metrics.pendingMousCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('leads')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'leads'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Sponsorship Pipeline ({leads.length})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ─── TAB 1: TASK SUBMISSIONS REVIEW (AWARD STARS & POINTS) ─────── */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Proof Submissions Awaiting Admin Verification ({submittedTasks.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review intern submitted proof URLs and notes. Approving will award ⭐ Stars and 🎖️ Points, automatically recalculating intern tier eligibility!
              </p>
            </div>
          </div>

          {submittedTasks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200">Inbox Zero — All Proof Submissions Cleared!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No intern proof submissions are pending right now. You can assign fresh outreach tasks to keep the pipeline buzzing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submittedTasks.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Submitted Proof
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {t.submittedAt ? new Date(t.submittedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100">{t.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{t.description}</p>

                    <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Submitted By:</span>
                        <span className="text-indigo-300 font-bold">{t.assignedToInternName} ({t.assignedToInternId})</span>
                      </div>

                      {t.submissionProofUrl && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Proof URL:</span>
                          <a
                            href={t.submissionProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1 truncate max-w-[200px]"
                          >
                            Open Link <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}

                      {t.submissionNotes && (
                        <div className="text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                          <span className="text-slate-500 block text-[10px] font-bold uppercase mb-0.5">Intern Notes:</span>
                          <p className="italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">"{t.submissionNotes}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-amber-300">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {t.starsReward} Stars Reward
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-indigo-300">
                        <Award className="w-3.5 h-3.5 text-indigo-400" /> {t.pointsReward} Points Bounty
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReview(t)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Review & Award ⭐/🎖️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: PR INTERNS ROSTER & TIERS ──────────────────────────── */}
      {activeSubTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> PR Interns Roster & Performance Dashboard ({interns.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Overview of all PR interns, active tiers, accumulated stars, points, and sponsorship revenues. Admin can award direct bonus stars or points anytime.
              </p>
            </div>
            <button
              onClick={() => setShowOnboardModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Intern
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interns
              .filter((i) =>
                searchQuery
                  ? i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    i.teacherId.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
              )
              .map((intern) => {
                const tier = intern.prTier || 'Silver';
                const commissionRate = StorageService.getTierCommissionRate(tier);
                const points = intern.prPoints || 0;
                const stars = intern.prStars || 0;

                // Tier badge styles
                const isSilver = tier === 'Silver';
                const isGold = tier === 'Gold';
                const isPremium = tier === 'Premium';

                return (
                  <div
                    key={intern.id}
                    className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between ${
                      isPremium
                        ? 'border-purple-500/40 bg-gradient-to-b from-purple-950/20 to-slate-900'
                        : isGold
                        ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-slate-900'
                        : 'border-slate-700/60'
                    }`}
                  >
                    <div>
                      {/* Card Header: Avatar & Tier Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow-inner ${
                            isPremium
                              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                              : isGold
                              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                              : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                          }`}>
                            {intern.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-100">{intern.name}</h3>
                            <span className="text-xs text-slate-400 block font-mono">{intern.teacherId} • @{intern.username}</span>
                          </div>
                        </div>

                        {/* Tier Tag with Commission % */}
                        <div className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                          isPremium
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : isGold
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-700/40 text-slate-300 border border-slate-600/60'
                        }`}>
                          <Award className="w-3.5 h-3.5" />
                          {tier} ({commissionRate}%)
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-3 text-xs text-slate-400 space-y-1">
                        {intern.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{intern.email}</span>
                          </div>
                        )}
                        {intern.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span>{intern.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Gamification Stats Strip */}
                      <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <div className="text-center">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Stars (Admin)</span>
                          <span className="text-base font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {stars}
                          </span>
                        </div>
                        <div className="text-center border-l border-slate-800">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">XP Points</span>
                          <span className="text-base font-black text-indigo-400 flex items-center justify-center gap-1 mt-0.5">
                            <Award className="w-4 h-4 text-indigo-400" /> {points}
                          </span>
                        </div>
                      </div>

                      {/* Sponsorship Results */}
                      <div className="mt-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Revenue Brought:</span>
                          <span className="text-emerald-400 font-bold">
                            ₹{(intern.totalSponsorshipRevenue || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Commission Disbursed:</span>
                          <span className="text-amber-400 font-bold">
                            ₹{(intern.totalCommissionEarned || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Tier Progression Progress Bar */}
                      <div className="mt-3">
                        {isSilver && (
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Next: Gold (100 pts & 5 ⭐)</span>
                              <span className="font-semibold text-amber-400">
                                {Math.min(100, Math.round((points / 100) * 100))}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-slate-400 to-amber-400 rounded-full"
                                style={{ width: `${Math.min(100, (points / 100) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {isGold && (
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Next: Premium (300 pts & 15 ⭐)</span>
                              <span className="font-semibold text-purple-400">
                                {Math.min(100, Math.round((points / 300) * 100))}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-400 to-purple-400 rounded-full"
                                style={{ width: `${Math.min(100, (points / 300) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {isPremium && (
                          <div className="text-center text-[11px] font-bold text-purple-300 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            👑 Apex PR Intern (Maximum 12.0% Commission)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 mt-4 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setRewardingIntern(intern);
                          setBonusStars(1);
                          setBonusPoints(25);
                          setBonusReason('');
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Award Bonus ⭐ / Points
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: ALL ASSIGNED OUTREACH TASKS ────────────────────────── */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Outreach Tasks Studio ({tasks.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage campaigns, assign sponsorship discovery challenges, and configure bounty rewards.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open / In Progress</option>
                <option value="submitted">Submitted (Needs Review)</option>
                <option value="approved">Approved & Rewarded</option>
                <option value="revision_requested">Revision Requested</option>
              </select>

              <button
                onClick={() => setShowAssignTaskModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New Task
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks
              .filter((t) => (taskStatusFilter === 'all' ? true : t.status === taskStatusFilter))
              .filter((t) =>
                searchQuery
                  ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.assignedToInternName.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
              )
              .map((task) => (
                <div
                  key={task.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        task.priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : task.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.priority}
                      </span>

                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        task.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : task.status === 'submitted'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : task.status === 'revision_requested'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100">{task.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned To:</span>
                        <span className="text-indigo-300 font-semibold">{task.assignedToInternName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Deadline:</span>
                        <span className="text-slate-300 font-mono">{task.deadline}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-500">Bounty:</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          ⭐ {task.starsReward} Stars • 🎖️ {task.pointsReward} Pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                    {task.status === 'submitted' ? (
                      <button
                        onClick={() => handleOpenReview(task)}
                        className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        Review Proof
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        {task.status === 'approved' ? `Awarded: ⭐ ${task.awardedStars || task.starsReward} & 🎖️ ${task.awardedPoints || task.pointsReward} pts` : 'In progress by intern'}
                      </span>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`Delete task "${task.title}"?`)) {
                          StorageService.deletePrTask(task.id);
                          reloadData();
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: MOU LEGAL DESK & APPROVALS ──────────────────────────── */}
      {activeSubTab === 'mous' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" /> College Fest & Partner MOU Approval Desk ({mous.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review formal legal Memorandums of Understanding prepared by PR interns. Approving affixes the official AEW digital signature and seal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mous
              .filter((m) =>
                searchQuery
                  ? m.partnerOrganization.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.mouNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.internName.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
              )
              .map((mou) => (
                <div
                  key={mou.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                        {mou.mouNumber}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        mou.status === 'approved' || mou.status === 'signed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : mou.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {mou.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100">{mou.partnerOrganization}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      Signatory: <span className="text-slate-200 font-semibold">{mou.partnerSignatory}</span> ({mou.partnerDesignation})
                    </p>

                    <div className="mt-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase">Purpose:</span>
                        <p className="text-slate-300 line-clamp-2">{mou.purpose}</p>
                      </div>

                      <div className="flex justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Sponsorship Consideration:</span>
                        <span className="text-emerald-400 font-black">₹{(mou.sponsorshipAmount || 0).toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">Drafted By:</span>
                        <span className="text-indigo-300 font-semibold">{mou.internName} ({mou.internId})</span>
                      </div>

                      {mou.adminFeedback && (
                        <div className="pt-1 border-t border-slate-800 text-slate-400">
                          <span className="text-[10px] text-amber-400 font-bold block uppercase">Admin Note:</span>
                          <p className="italic text-slate-300">{mou.adminFeedback}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => setPreviewingMou(mou)}
                      className="flex-1 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> Full Legal Agreement
                    </button>

                    {mou.status === 'pending_admin_approval' && (
                      <>
                        <button
                          onClick={() => handleMouStatusUpdate(mou.id, 'approved', 'Approved by Director of Academic Operations.')}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="Approve MOU"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => {
                            const note = prompt('Please specify clarification or rejection remarks for the intern:');
                            if (note !== null) {
                              handleMouStatusUpdate(mou.id, 'rejected', note || 'Clarification required.');
                            }
                          }}
                          className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="Request Clarification / Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: SPONSORSHIP LEADS PIPELINE ──────────────────────────── */}
      {activeSubTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> College & Corporate Sponsorship Pipeline ({leads.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track deals in motion, verify commission forecasts, and monitor intern outreach velocity.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Organization / Event</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Lead Owner</th>
                    <th className="py-3 px-4">Deal Value</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Intern Rate</th>
                    <th className="py-3 px-4">Est. Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {leads
                    .filter((l) =>
                      searchQuery
                        ? l.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.internName.toLowerCase().includes(searchQuery.toLowerCase())
                        : true
                    )
                    .map((lead) => {
                      const isWon = lead.stage === 'closed_won';
                      return (
                        <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-100 block">{lead.organizationName}</span>
                            <span className="text-[11px] text-slate-400">{lead.contactPerson} ({lead.designation})</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold">
                              {lead.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-indigo-300">
                            {lead.internName}
                          </td>
                          <td className="py-3 px-4 font-black text-emerald-400">
                            ₹{(lead.closedAmount || lead.expectedSponsorshipAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isWon
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : lead.stage === 'closed_lost'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {lead.stage.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-300">
                              {lead.commissionRate}%
                            </span>
                            <span className="text-[10px] text-slate-500 block">({lead.internTierAtClosure || 'Silver'})</span>
                          </td>
                          <td className="py-3 px-4 font-black text-amber-400">
                            ₹{lead.commissionEarned ? lead.commissionEarned.toLocaleString('en-IN') : Math.round(((lead.expectedSponsorshipAmount * (lead.commissionRate || 3.3)) / 100)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: ASSIGN TASK TO PR INTERNS ────────────────────────── */}
      {showAssignTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Assign PR Outreach Task</h3>
                  <p className="text-xs text-slate-400">Configure stars and points bounty for completing this campaign</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignTaskModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Secure Title Sponsorship for BITS Pilani Oasis Fest"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Instructions & Proof Required *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the target college, POC, pitch deck requirements, and what proof (signed MOU / email confirmation) the intern must upload."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as PrTaskCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="college_sponsorship">College Sponsorship</option>
                    <option value="fest_mou">Fest MOU Agreement</option>
                    <option value="influencer_collab">Influencer Collaboration</option>
                    <option value="campus_ambassador">Campus Ambassador</option>
                    <option value="content_promo">Content Promotion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Assignee</label>
                  <select
                    value={taskAssignedInternId}
                    onChange={(e) => setTaskAssignedInternId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">⚡ All Active PR Interns</option>
                    {interns.map((i) => (
                      <option key={i.teacherId} value={i.teacherId}>
                        {i.name} ({i.teacherId} - {i.prTier || 'Silver'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bounty Rewards Setup */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-3">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Bounty Incentive Rewards
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">⭐ Star Bounty (Decided by Admin)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={taskStarsReward}
                      onChange={(e) => setTaskStarsReward(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">5 ⭐ needed for Gold, 15 ⭐ for Premium</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">🎖️ XP Points Bounty</label>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      step={10}
                      value={taskPointsReward}
                      onChange={(e) => setTaskPointsReward(parseInt(e.target.value) || 10)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">100 pts for Gold, 300 pts for Premium</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as PrTaskPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Blitz</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignTaskModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Assign Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: REVIEW SUBMITTED PROOF & AWARD STARS/POINTS ──────── */}
      {reviewingTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Review Proof & Award Rewards</h3>
                  <p className="text-xs text-slate-400">Evaluate intern work and grant stars and points</p>
                </div>
              </div>
              <button
                onClick={() => setReviewingTask(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Task:</span>
                  <span className="text-slate-200 font-bold">{reviewingTask.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Intern:</span>
                  <span className="text-indigo-300 font-bold">{reviewingTask.assignedToInternName}</span>
                </div>

                {reviewingTask.submissionProofUrl && (
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Proof Link:</span>
                    <a
                      href={reviewingTask.submissionProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 underline font-semibold flex items-center gap-1"
                    >
                      Open Link <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {reviewingTask.submissionNotes && (
                  <div className="pt-1 border-t border-slate-800">
                    <span className="text-slate-500 text-[10px] font-bold uppercase block">Intern Notes:</span>
                    <p className="text-slate-300 italic">"{reviewingTask.submissionNotes}"</p>
                  </div>
                )}
              </div>

              {/* Award Adjustment Controls */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-amber-500/20 space-y-3">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Reward Allocation (Admin Discretion)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">⭐ Stars to Award</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={reviewStars}
                      onChange={(e) => setReviewStars(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">🎖️ Points to Award</label>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      step={10}
                      value={reviewPoints}
                      onChange={(e) => setReviewPoints(parseInt(e.target.value) || 10)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Admin Verification Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Excellent outreach deck. Contact verified with Fest Chair."
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleConfirmRejectTask}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Request Revision
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingTask(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproveTask}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Award ⭐/🎖️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DIRECT BONUS STARS & POINTS GRANT ────────────────── */}
      {rewardingIntern && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Grant Bonus Stars / Points</h3>
                  <p className="text-xs text-slate-400">Direct incentive award for {rewardingIntern.name}</p>
                </div>
              </div>
              <button
                onClick={() => setRewardingIntern(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block">Current Tier:</span>
                  <span className="font-bold text-amber-300">{rewardingIntern.prTier || 'Silver'} ({StorageService.getTierCommissionRate(rewardingIntern.prTier || 'Silver')}%)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Current Balance:</span>
                  <span className="font-bold text-slate-200">⭐ {rewardingIntern.prStars || 0} • 🎖️ {rewardingIntern.prPoints || 0} pts</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">⭐ Add Stars</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={bonusStars}
                    onChange={(e) => setBonusStars(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">🎖️ Add Points</label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step={10}
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Reason / Commendation</label>
                <input
                  type="text"
                  placeholder="e.g. Exceptional leadership during IIT Delhi Fest Sponsorship pitch"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRewardingIntern(null)}
                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBonus}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Confirm Reward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: ONBOARD NEW PR INTERN ───────────────────────────── */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Onboard PR Intern</h3>
                  <p className="text-xs text-slate-400">Register login credentials and initial tier level</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIntern} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Malhotra"
                  value={newInternName}
                  onChange={(e) => {
                    setNewInternName(e.target.value);
                    if (!newInternUsername) {
                      setNewInternUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="aryan_m"
                    value={newInternUsername}
                    onChange={(e) => setNewInternUsername(e.target.value.toLowerCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={newInternPassword}
                    onChange={(e) => setNewInternPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="aryan@college.edu"
                    value={newInternEmail}
                    onChange={(e) => setNewInternEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newInternPhone}
                    onChange={(e) => setNewInternPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Starting Tier</label>
                  <select
                    value={newInternTier}
                    onChange={(e) => setNewInternTier(e.target.value as PrTier)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Silver">Silver (3.3% Commission)</option>
                    <option value="Gold">Gold (7.0% Commission)</option>
                    <option value="Premium">Premium (12.0% Commission)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Affiliated College / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. DTU Delhi / North Region"
                    value={newInternCollege}
                    onChange={(e) => setNewInternCollege(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Create PR Intern Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: FULL LEGAL MOU PREVIEW & APPROVAL ───────────────── */}
      {previewingMou && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Official MOU Legal Agreement</h3>
                  <p className="text-xs text-slate-400 font-mono">{previewingMou.mouNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewingMou(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Legal Document Parchment */}
            <div className="bg-white text-slate-900 rounded-2xl p-6 md:p-8 shadow-inner space-y-6 font-serif">
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <span className="text-xs tracking-widest font-sans font-bold uppercase text-indigo-700">Official Partnership Instrument</span>
                <h2 className="text-xl md:text-2xl font-black font-sans uppercase tracking-tight text-slate-900 mt-1">
                  MEMORANDUM OF UNDERSTANDING
                </h2>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  Ref Number: <span className="font-mono font-bold text-slate-900">{previewingMou.mouNumber}</span> • Effective: {previewingMou.startDate} to {previewingMou.endDate}
                </p>
              </div>

              <div className="text-xs leading-relaxed space-y-3">
                <p>
                  This <strong>Memorandum of Understanding ("MOU")</strong> is formally entered into between:
                </p>
                <div className="pl-4 border-l-2 border-slate-400 space-y-2">
                  <p>
                    <strong>PARTY 1: APNA ENGINEERING WALLAH (AEW)</strong>, an advanced technical education and engineering upskilling ecosystem having its operational headquarters in New Delhi, India.
                  </p>
                  <p>
                    <strong>PARTY 2: {previewingMou.partnerOrganization.toUpperCase()}</strong>, represented by <strong>{previewingMou.partnerSignatory}</strong> ({previewingMou.partnerDesignation}), having premises at {previewingMou.partnerAddress || 'Partner Campus Address'}.
                  </p>
                </div>

                <div className="pt-2">
                  <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">1. Objective & Scope:</h4>
                  <p className="text-slate-700">{previewingMou.purpose}</p>
                </div>

                <div className="pt-2">
                  <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">2. Consideration & Sponsorship Commercials:</h4>
                  <p className="text-slate-700">
                    The total sponsorship consideration agreed between parties is <strong>₹{(previewingMou.sponsorshipAmount || 0).toLocaleString('en-IN')} (Indian Rupees)</strong> payable as per the operational milestone schedule.
                  </p>
                </div>

                <div className="pt-2">
                  <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">3. Covenants & Deliverables:</h4>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                    {previewingMou.terms.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Signatures & Seals */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs font-sans">
                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-6">For Apna Engineering Wallah (AEW)</span>
                  <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded text-[10px] uppercase tracking-wider mb-2">
                    {previewingMou.status === 'approved' || previewingMou.status === 'signed' ? 'DIGITALLY VERIFIED & SEALED' : 'AWAITING ADMIN APPROVAL'}
                  </div>
                  <span className="block font-bold text-slate-900">Dr. Vivek Sharma</span>
                  <span className="text-[10px] text-slate-500">Director of Academic & Outreach Operations</span>
                </div>

                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-6">For {previewingMou.partnerOrganization}</span>
                  <div className="h-6" />
                  <span className="block font-bold text-slate-900">{previewingMou.partnerSignatory}</span>
                  <span className="text-[10px] text-slate-500">{previewingMou.partnerDesignation}</span>
                </div>
              </div>
            </div>

            {/* Admin Action Desk */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>

              <div className="flex items-center gap-2">
                {previewingMou.status === 'pending_admin_approval' && (
                  <>
                    <button
                      onClick={() => handleMouStatusUpdate(previewingMou.id, 'approved', 'Approved by Director of Academic Operations.')}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Sign Agreement
                    </button>
                    <button
                      onClick={() => {
                        const note = prompt('Please specify rejection/clarification note:');
                        if (note !== null) {
                          handleMouStatusUpdate(previewingMou.id, 'rejected', note || 'Clarification required.');
                        }
                      }}
                      className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Request Clarification
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPreviewingMou(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
