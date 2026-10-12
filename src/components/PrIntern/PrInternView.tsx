import React, { useState, useMemo, useEffect } from 'react';
import type {
  User,
  PrTask,
  PrLead,
  PrMouRequest,
  PrTier,
  PrLeadStage
} from '../../types';
import { StorageService } from '../../services/storage';
import {
  Star,
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle2,
  Send,
  Plus,
  Phone,
  Mail,
  ExternalLink,
  Check,
  Printer,
  Search,
  Sparkles,
  Briefcase,
  Users,
  Crown,
  X,
  Trash2,
  Calendar,
  MessageCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PrInternViewProps {
  intern: User;
  currentPage: string;
  onPageChange: (page: string) => void;
  refreshTrigger?: number;
}

export const PrInternView: React.FC<PrInternViewProps> = ({
  intern,
  currentPage,
  onPageChange,
  refreshTrigger = 0,
}) => {
  // Live states from storage
  const [tasks, setTasks] = useState<PrTask[]>(() => StorageService.getPrTasks());
  const [leads, setLeads] = useState<PrLead[]>(() => StorageService.getPrLeads());
  const [mous, setMous] = useState<PrMouRequest[]>(() => StorageService.getPrMous());
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getCurrentUser() || intern);
  const [allUsers, setAllUsers] = useState<User[]>(() => StorageService.getUsers());

  // Task Filters & Submission Modal
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showTaskSubmitModal, setShowTaskSubmitModal] = useState<PrTask | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionProofUrl, setSubmissionProofUrl] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Lead Filters & Add Lead Modal
  const [leadFilterStage, setLeadFilterStage] = useState<string>('all');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [editingLeadNotesId, setEditingLeadNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');

  // Add Lead Form State
  const [leadOrgName, setLeadOrgName] = useState('');
  const [leadContactPerson, setLeadContactPerson] = useState('');
  const [leadDesignation, setLeadDesignation] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadType, setLeadType] = useState<PrLead['type']>('college_sponsorship');
  const [leadExpectedAmount, setLeadExpectedAmount] = useState<number>(50000);
  const [leadNotes, setLeadNotes] = useState('');

  // MoU Generator Modal State
  const [showMouModal, setShowMouModal] = useState(false);
  const [selectedPreviewMou, setSelectedPreviewMou] = useState<PrMouRequest | null>(null);
  const [mouPartnerOrg, setMouPartnerOrg] = useState('');
  const [mouSignatory, setMouSignatory] = useState('');
  const [mouDesignation, setMouDesignation] = useState('');
  const [mouAddress, setMouAddress] = useState('Campus Office / Event Desk');
  const [mouPurpose, setMouPurpose] = useState('Official Sponsorship & Knowledge Partner Agreement');
  const [mouSponsorshipAmount, setMouSponsorshipAmount] = useState<number>(50000);
  const [mouStartDate, setMouStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mouEndDate, setMouEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [mouCustomTerms, setMouCustomTerms] = useState<string>([
    'Second Party (Partner / Sponsor) commits to the agreed deliverables and partnership sponsorship terms.',
    'Apna Engineering Wallah (AEW) shall provide official branding, stage presence, and student community outreach.',
    'Both parties agree to collaborate in good faith for event execution and student career growth.'
  ].join('\n'));

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; sub?: string } | null>(null);

  // Re-sync listener
  useEffect(() => {
    const handleSync = () => {
      setTasks(StorageService.getPrTasks());
      setLeads(StorageService.getPrLeads());
      setMous(StorageService.getPrMous());
      const freshUsers = StorageService.getUsers();
      setAllUsers(freshUsers);
      const freshUser = freshUsers.find((u) => u.teacherId.toUpperCase() === intern.teacherId.toUpperCase());
      if (freshUser) setCurrentUser(freshUser);
    };

    handleSync();
    window.addEventListener('aew_pr_tasks_updated', handleSync);
    window.addEventListener('aew_users_updated', handleSync);
    window.addEventListener('aew_cloud_data_synced', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('aew_pr_tasks_updated', handleSync);
      window.removeEventListener('aew_users_updated', handleSync);
      window.removeEventListener('aew_cloud_data_synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [refreshTrigger, intern.teacherId]);

  // Derived Tier & Stats
  const currentTier: PrTier = currentUser.prTier || 'Silver';
  const xp = currentUser.prPoints || 0;
  const stars = currentUser.prStars || 0;
  const commissionRate = StorageService.getTierCommissionRate(currentTier, currentUser);

  // Next tier progress
  const nextTierInfo = useMemo(() => {
    if (currentTier === 'Silver') {
      const xpReq = Math.max(0, 100 - xp);
      const starsReq = Math.max(0, 5 - stars);
      const progressPercent = Math.min(100, Math.round(((xp / 100) * 0.6 + (stars / 5) * 0.4) * 100));
      return {
        nextTier: 'Gold' as PrTier,
        nextRate: 7.0,
        xpRemaining: xpReq,
        starsRemaining: starsReq,
        progressPercent,
        isMax: false,
      };
    }
    if (currentTier === 'Gold') {
      const xpReq = Math.max(0, 300 - xp);
      const starsReq = Math.max(0, 15 - stars);
      const progressPercent = Math.min(100, Math.round(((xp / 300) * 0.6 + (stars / 15) * 0.4) * 100));
      return {
        nextTier: 'Premium' as PrTier,
        nextRate: 12.0,
        xpRemaining: xpReq,
        starsRemaining: starsReq,
        progressPercent,
        isMax: false,
      };
    }
    return {
      nextTier: 'Premium' as PrTier,
      nextRate: 12.0,
      xpRemaining: 0,
      starsRemaining: 0,
      progressPercent: 100,
      isMax: true,
    };
  }, [currentTier, xp, stars]);

  // Tasks assigned to this intern
  const myTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.assignedToInternId.toUpperCase() === currentUser.teacherId.toUpperCase() ||
        t.assignedToInternId === 'all'
    );
  }, [tasks, currentUser.teacherId]);

  const pendingTasks = useMemo(() => {
    return myTasks.filter((t) => t.status === 'pending' || t.status === 'revision_requested');
  }, [myTasks]);

  const completedTasks = useMemo(() => {
    return myTasks.filter((t) => t.status === 'completed' || t.status === 'approved');
  }, [myTasks]);

  // Filtered Tasks for the Tasks Tab
  const displayedTasks = useMemo(() => {
    if (taskFilter === 'pending') return pendingTasks;
    if (taskFilter === 'completed') return completedTasks;
    return myTasks;
  }, [myTasks, pendingTasks, completedTasks, taskFilter]);

  // Leads pipeline calculations
  const totalPipelineRevenue = useMemo(() => {
    return leads
      .filter((l) => l.stage !== 'closed_lost')
      .reduce((sum, l) => sum + (l.closedAmount || l.expectedSponsorshipAmount || 0), 0);
  }, [leads]);

  const wonLeads = useMemo(() => {
    return leads.filter((l) => l.stage === 'closed_won');
  }, [leads]);

  const totalWonRevenue = useMemo(() => {
    return wonLeads.reduce((sum, l) => sum + (l.closedAmount || l.expectedSponsorshipAmount || 0), 0);
  }, [wonLeads]);

  const totalCommissionEarned = useMemo(() => {
    return wonLeads.reduce((sum, l) => sum + (l.commissionEarned || Math.round(((l.closedAmount || l.expectedSponsorshipAmount) * commissionRate) / 100)), 0);
  }, [wonLeads, commissionRate]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStage = leadFilterStage === 'all' || lead.stage === leadFilterStage;
      const q = leadSearchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        lead.organizationName.toLowerCase().includes(q) ||
        lead.contactPerson.toLowerCase().includes(q) ||
        lead.designation.toLowerCase().includes(q) ||
        lead.phone?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q);
      return matchesStage && matchesQuery;
    });
  }, [leads, leadFilterStage, leadSearchQuery]);

  // Trigger Toast Helper
  const showToast = (text: string, sub?: string) => {
    setToastMessage({ text, sub });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─── ACTIONS ─────────────────────────────────────────────────────────────

  // 1. Complete Task & Earn XP
  const handleCompleteTask = (taskToComplete: PrTask, notes?: string, proof?: string) => {
    setIsSubmittingTask(true);
    const result = StorageService.completePrTask(
      taskToComplete.id,
      notes || submissionNotes || 'Task completed and verified.',
      proof || submissionProofUrl || undefined,
      taskToComplete.pointsReward,
      taskToComplete.starsReward
    );

    if (result) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'],
        });
      } catch {}

      showToast(
        `✓ Task Completed! You earned +${taskToComplete.pointsReward} XP & +${taskToComplete.starsReward} Stars!`,
        result.promoted ? `🎉 Congratulations! You have been promoted to ${result.intern?.prTier} Tier!` : undefined
      );

      setTasks(StorageService.getPrTasks());
      const freshUsers = StorageService.getUsers();
      setAllUsers(freshUsers);
      const freshUser = freshUsers.find((u) => u.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase());
      if (freshUser) setCurrentUser(freshUser);

      setShowTaskSubmitModal(null);
      setSubmissionNotes('');
      setSubmissionProofUrl('');
    }
    setIsSubmittingTask(false);
  };

  // 2. Submit Task Proof (for review)
  const handleSubmitTaskForReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTaskSubmitModal) return;
    setIsSubmittingTask(true);
    const updated = StorageService.submitPrTask(
      showTaskSubmitModal.id,
      submissionNotes.trim() || 'Work delivered. Ready for review.',
      submissionProofUrl.trim() || undefined
    );
    if (updated) {
      showToast('✓ Work Submitted for Review', 'Your PR Head will review the submission and verify stars.');
      setTasks(StorageService.getPrTasks());
      setShowTaskSubmitModal(null);
      setSubmissionNotes('');
      setSubmissionProofUrl('');
    }
    setIsSubmittingTask(false);
  };

  // 3. Add New Lead
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadOrgName.trim() || !leadContactPerson.trim()) {
      alert('Please fill in the Organization Name and Contact Person.');
      return;
    }

    const newLead = StorageService.createPrLead({
      internId: currentUser.teacherId,
      internName: currentUser.name,
      type: leadType,
      organizationName: leadOrgName.trim(),
      contactPerson: leadContactPerson.trim(),
      designation: leadDesignation.trim() || 'Sponsorship Coordinator',
      email: leadEmail.trim(),
      phone: leadPhone.trim(),
      expectedSponsorshipAmount: Number(leadExpectedAmount) || 0,
      stage: 'lead',
      internTierAtClosure: currentTier,
      commissionRate: commissionRate,
      notes: leadNotes.trim(),
    });

    setLeads([newLead, ...leads]);
    setShowAddLeadModal(false);
    setLeadOrgName('');
    setLeadContactPerson('');
    setLeadDesignation('');
    setLeadPhone('');
    setLeadEmail('');
    setLeadNotes('');
    setLeadExpectedAmount(50000);

    showToast(`✓ Added Lead: "${newLead.organizationName}"`, `Contact: ${newLead.contactPerson}`);
  };

  // 4. Update Lead Stage / Status
  const handleStageChange = (leadId: string, nextStage: PrLeadStage) => {
    let closedVal: number | undefined = undefined;
    if (nextStage === 'closed_won') {
      const target = leads.find((l) => l.id === leadId);
      const promptVal = prompt(
        `🎉 Congratulations on closing this deal!\n\nConfirm final closed sponsorship amount (₹):`,
        String(target?.expectedSponsorshipAmount || 50000)
      );
      if (!promptVal || isNaN(Number(promptVal))) return;
      closedVal = Number(promptVal);

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}
    }

    const updated = StorageService.updatePrLeadStage(leadId, nextStage, closedVal);
    if (updated) {
      setLeads(StorageService.getPrLeads());
      const freshUser = StorageService.getUsers().find(
        (u) => u.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase()
      );
      if (freshUser) setCurrentUser(freshUser);

      const target = leads.find((l) => l.id === leadId);
      showToast(
        `✓ Updated "${target?.organizationName}" to ${nextStage.replace('_', ' ').toUpperCase()}`,
        nextStage === 'closed_won' ? `Earned ₹${Math.round(((closedVal || 0) * commissionRate) / 100)} commission!` : undefined
      );
    }
  };

  // 5. Save Notes on Lead
  const handleSaveLeadNotes = (leadId: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;
    target.notes = editingNotesText;
    StorageService.savePrLeads(leads);
    setEditingLeadNotesId(null);
    setEditingNotesText('');
    showToast('✓ Lead notes updated');
  };

  // 6. Delete Lead
  const handleDeleteLead = (leadId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to delete lead "${orgName}"?`)) return;
    StorageService.deletePrLead(leadId);
    setLeads(StorageService.getPrLeads());
    showToast(`Removed lead: "${orgName}"`);
  };

  // 7. Create MoU
  const handleCreateMou = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mouPartnerOrg.trim() || !mouSignatory.trim()) {
      alert('Please fill in Partner Organization and Signatory Name.');
      return;
    }

    const newMou = StorageService.createPrMou({
      internId: currentUser.teacherId,
      internName: currentUser.name,
      partnerOrganization: mouPartnerOrg.trim(),
      partnerSignatory: mouSignatory.trim(),
      partnerDesignation: mouDesignation.trim() || 'Authorized Representative',
      partnerAddress: mouAddress.trim() || 'Campus Office',
      purpose: mouPurpose.trim(),
      terms: mouCustomTerms.split('\n').filter((line) => line.trim().length > 0),
      sponsorshipAmount: Number(mouSponsorshipAmount) || 0,
      startDate: mouStartDate,
      endDate: mouEndDate,
      status: 'pending_admin_approval',
    });

    setMous([newMou, ...mous]);
    setShowMouModal(false);
    setSelectedPreviewMou(newMou);
    showToast(`✓ MoU Draft Created for "${newMou.partnerOrganization}"`);
  };

  // Helper: Open WhatsApp
  const handleOpenWhatsApp = (phone?: string, contactName?: string, orgName?: string) => {
    if (!phone) {
      alert('No phone number registered for this lead.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hi ${contactName || 'there'}, this is ${currentUser.name} from Apna Engineering Wallah (AEW). Reaching out regarding sponsorship and student technical collaboration with ${orgName || 'your organization'}.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Helper: Quick prefill MoU from lead
  const handleDraftMouForLead = (lead: PrLead) => {
    setMouPartnerOrg(lead.organizationName);
    setMouSignatory(lead.contactPerson);
    setMouDesignation(lead.designation);
    setMouSponsorshipAmount(lead.closedAmount || lead.expectedSponsorshipAmount || 50000);
    setMouPurpose(`Official Event Sponsorship & Student Partnership with ${lead.organizationName}`);
    setShowMouModal(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-indigo-600 text-white shadow-2xl flex items-start gap-3 border border-indigo-400 max-w-md animate-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">{toastMessage.text}</div>
            {toastMessage.sub && <div className="text-xs text-indigo-100 mt-0.5">{toastMessage.sub}</div>}
          </div>
          <button onClick={() => setToastMessage(null)} className="ml-auto text-indigo-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── WORKSPACE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
              currentTier === 'Premium'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : currentTier === 'Gold'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              {currentTier} Tier
            </span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {commissionRate}% Commission Share
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">
            Hello, {currentUser.name} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            PR & Sponsorship Workspace • ID: <span className="font-mono text-slate-300">{currentUser.teacherId}</span>
          </p>
        </div>

        {/* Quick Top Stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[90px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Earned XP</div>
            <div className="text-base font-black text-indigo-400 font-mono mt-0.5">{xp} XP</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[90px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stars</div>
            <div className="text-base font-black text-amber-400 font-mono mt-0.5">⭐ {stars}</div>
          </div>
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* ─── NAVIGATION TABS ─── */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs no-scrollbar">
        {[
          { id: 'pr_dashboard', label: 'Overview', icon: Briefcase },
          { id: 'pr_leads', label: `Leads Pipeline (${leads.length})`, icon: DollarSign },
          { id: 'pr_tasks', label: `Tasks & XP (${pendingTasks.length} to do)`, icon: CheckCircle2 },
          { id: 'pr_mou_maker', label: `MoU Agreements (${mous.length})`, icon: FileText },
          { id: 'pr_earnings', label: 'My Earnings', icon: TrendingUp },
          ...(currentUser.role === 'pr_head'
            ? [{ id: 'pr_team', label: `PR Team (${allUsers.filter((u) => u.role === 'pr_intern').length})`, icon: Users }]
            : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onPageChange(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 1: OVERVIEW DASHBOARD ───────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(currentPage === 'pr_dashboard' || !['pr_leads', 'pr_tasks', 'pr_mou_maker', 'pr_earnings', 'pr_team'].includes(currentPage)) && (
        <div className="space-y-6">

          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Active Leads</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{leads.length}</div>
              <div className="text-[11px] text-slate-400">
                Pipeline Value: <strong className="text-slate-200">₹{totalPipelineRevenue.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Assigned Tasks</span>
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{pendingTasks.length} to do</div>
              <div className="text-[11px] text-slate-400">
                Completed: <strong className="text-emerald-400">{completedTasks.length} tasks</strong>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Earned XP & Stars</span>
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                {xp} <span className="text-xs text-slate-400">XP</span> • ⭐ {stars}
              </div>
              <div className="text-[11px] text-slate-400">
                Tier: <strong className="text-slate-200">{currentTier}</strong> ({commissionRate}% share)
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Commission</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₹{totalCommissionEarned.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400">
                From <strong className="text-slate-200">{wonLeads.length} won deals</strong>
              </div>
            </div>
          </div>

          {/* Simple Tier Progression Bar */}
          {!nextTierInfo.isMax && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Level Up to {nextTierInfo.nextTier} Tier ({nextTierInfo.nextRate}% Commission)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Complete tasks assigned by PR Head to earn <strong className="text-indigo-300">{nextTierInfo.xpRemaining} more XP</strong> and <strong className="text-amber-300">{nextTierInfo.starsRemaining} more Stars</strong>.
                </p>
              </div>

              <div className="w-full md:w-64 space-y-1.5 shrink-0">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Progress</span>
                  <span className="text-white font-bold">{nextTierInfo.progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${nextTierInfo.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Two-Column Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Panel A: Tasks to Do */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-bold text-white text-base">Tasks Assigned by PR Head</h2>
                </div>
                <button
                  onClick={() => onPageChange('pr_tasks')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View All ({myTasks.length}) →
                </button>
              </div>

              {pendingTasks.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-200">You're All Caught Up!</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No pending tasks right now. Check back soon or contact your PR Head for new assignments.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              +{task.pointsReward} XP • ⭐ {task.starsReward}
                            </span>
                            {task.priority === 'urgent' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Urgent
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-slate-100">{task.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> Due: {task.deadline}
                        </span>
                        <button
                          onClick={() => handleCompleteTask(task)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Done & Claim XP</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel B: Recent Leads */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-bold text-white text-base">Your Active Leads</h2>
                </div>
                <button
                  onClick={() => onPageChange('pr_leads')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View Pipeline ({leads.length}) →
                </button>
              </div>

              {leads.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-200">No Leads Yet</div>
                  <p className="text-xs text-slate-400">
                    Add sponsors, college fest conveners, or brand partners to track deals and earn commission.
                  </p>
                  <button
                    onClick={() => setShowAddLeadModal(true)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add First Lead
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.slice(0, 3).map((lead) => {
                    const isWon = lead.stage === 'closed_won';
                    return (
                      <div
                        key={lead.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-100">{lead.organizationName}</h4>
                            <div className="text-xs text-slate-400">
                              👤 <strong>{lead.contactPerson}</strong> ({lead.designation})
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isWon
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : lead.stage === 'closed_lost'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {lead.stage.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400">
                            Deal: <strong className="text-slate-200">₹{(lead.closedAmount || lead.expectedSponsorshipAmount).toLocaleString('en-IN')}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            {lead.phone && (
                              <button
                                onClick={() => handleOpenWhatsApp(lead.phone, lead.contactPerson, lead.organizationName)}
                                className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1"
                                title="Open WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                              </button>
                            )}
                            <button
                              onClick={() => onPageChange('pr_leads')}
                              className="text-slate-400 hover:text-slate-200 text-[11px]"
                            >
                              Manage →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 2: LEADS PIPELINE ───────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_leads' && (
        <div className="space-y-6">

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Leads & Sponsorship Pipeline
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Register sponsors, track conversation stages, and record who they are. Every closed deal pays {commissionRate}% commission!
              </p>
            </div>

            <button
              onClick={() => setShowAddLeadModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Add New Lead
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            {/* Stage filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs no-scrollbar">
              {[
                { id: 'all', label: 'All Leads' },
                { id: 'lead', label: 'Prospects' },
                { id: 'contacted', label: 'Contacted' },
                { id: 'pitch_deck_sent', label: 'Pitch Sent' },
                { id: 'negotiation', label: 'In Discussion' },
                { id: 'closed_won', label: 'Won 🎉' },
                { id: 'closed_lost', label: 'Lost' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setLeadFilterStage(pill.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                    leadFilterStage === pill.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search org, person, phone..."
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Leads Grid */}
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-bold text-slate-200 text-sm">No Leads Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {leadSearchQuery || leadFilterStage !== 'all'
                  ? 'No leads matched your filter criteria.'
                  : 'Start by adding your first college fest, club, or sponsor lead.'}
              </p>
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Lead
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLeads.map((lead) => {
                const isWon = lead.stage === 'closed_won';
                const isLost = lead.stage === 'closed_lost';
                const projectedPayout = Math.round((lead.expectedSponsorshipAmount * commissionRate) / 100);

                return (
                  <div
                    key={lead.id}
                    className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                      isWon
                        ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900'
                        : isLost
                        ? 'border-slate-800 opacity-60'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header: Org & Stage Dropdown */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {lead.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <h3 className="font-bold text-base text-white mt-1">{lead.organizationName}</h3>
                        </div>

                        {/* Interactive Status Selector */}
                        <select
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead.id, e.target.value as PrLeadStage)}
                          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="lead">Lead / Prospect</option>
                          <option value="contacted">Contacted</option>
                          <option value="pitch_deck_sent">Pitch Sent</option>
                          <option value="negotiation">In Discussion</option>
                          <option value="mou_drafted">MoU Drafted</option>
                          <option value="closed_won">✅ Closed Won</option>
                          <option value="closed_lost">❌ Closed Lost</option>
                        </select>
                      </div>

                      {/* Who They Are: Contact Person Card */}
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs">
                            <span className="text-slate-400">Contact Person: </span>
                            <strong className="text-slate-100">{lead.contactPerson}</strong>
                            <span className="text-slate-400"> ({lead.designation})</span>
                          </div>
                        </div>

                        {/* Quick 1-Click Communications */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900 text-xs">
                          {lead.phone && (
                            <>
                              <a
                                href={`tel:${lead.phone}`}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-[11px] flex items-center gap-1 border border-slate-800"
                              >
                                <Phone className="w-3 h-3 text-indigo-400" />
                                <span>{lead.phone}</span>
                              </a>
                              <button
                                onClick={() => handleOpenWhatsApp(lead.phone, lead.contactPerson, lead.organizationName)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-semibold text-[11px] flex items-center gap-1 border border-emerald-800/40 cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>WhatsApp</span>
                              </button>
                            </>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-[11px] flex items-center gap-1 border border-slate-800 truncate max-w-[200px]"
                            >
                              <Mail className="w-3 h-3 text-indigo-400" />
                              <span className="truncate">{lead.email}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Financial Value Banner */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                            {isWon ? 'Confirmed Amount' : 'Expected Deal'}
                          </span>
                          <span className="text-base font-black text-white font-mono">
                            ₹{(isWon ? lead.closedAmount : lead.expectedSponsorshipAmount)?.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                            {isWon ? 'Confirmed Commission' : 'Your Projected Share'}
                          </span>
                          <span className="text-base font-black text-emerald-400 font-mono">
                            ₹{(isWon ? lead.commissionEarned : projectedPayout)?.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">({commissionRate}% rate)</span>
                        </div>
                      </div>

                      {/* Notes / Last update */}
                      {editingLeadNotesId === lead.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingNotesText}
                            onChange={(e) => setEditingNotesText(e.target.value)}
                            placeholder="Add meeting notes or next action steps..."
                            rows={2}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingLeadNotesId(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveLeadNotes(lead.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                            >
                              Save Notes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingLeadNotesId(lead.id);
                            setEditingNotesText(lead.notes || '');
                          }}
                          className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400 hover:border-slate-700 cursor-pointer group flex items-start justify-between"
                        >
                          <p className="line-clamp-2 italic">
                            {lead.notes ? `"${lead.notes}"` : 'Click to add notes or follow-up details...'}
                          </p>
                          <span className="text-[10px] text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                            Edit
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Added: {new Date(lead.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDraftMouForLead(lead)}
                          className="text-purple-400 hover:text-purple-300 font-semibold text-[11px] flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Draft MoU
                        </button>

                        <button
                          onClick={() => handleDeleteLead(lead.id, lead.organizationName)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 3: TASKS ASSIGNED BY PR HEAD & XP ───────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_tasks' && (
        <div className="space-y-6">

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                Assigned Tasks & XP Rewards
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete tasks assigned by your PR Head or AEW Admin. Earn XP and Stars to level up your tier and commission rate!
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setTaskFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  taskFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Tasks ({myTasks.length})
              </button>
              <button
                onClick={() => setTaskFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  taskFilter === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                To Do ({pendingTasks.length})
              </button>
              <button
                onClick={() => setTaskFilter('completed')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  taskFilter === 'completed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Completed ({completedTasks.length})
              </button>
            </div>
          </div>

          {/* Tasks List */}
          {displayedTasks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-slate-200">
                {taskFilter === 'pending' ? 'No Tasks Pending!' : 'No Tasks Found'}
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {taskFilter === 'pending'
                  ? 'Great job! You have cleared all tasks assigned by your PR Head.'
                  : 'Tasks assigned to you will show up here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedTasks.map((t) => {
                const isCompleted = t.status === 'completed' || t.status === 'approved';
                const isSubmitted = t.status === 'submitted';

                return (
                  <div
                    key={t.id}
                    className={`bg-slate-900 border rounded-2xl p-5 space-y-3 transition-all ${
                      isCompleted
                        ? 'border-emerald-500/30 bg-slate-900/80'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Bounty, Priority & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          +{t.starsReward} Stars
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{t.pointsReward} XP
                        </span>
                        {t.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase">
                            Urgent
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isCompleted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completed ✓
                          </span>
                        ) : isSubmitted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Submitted for Review
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            To Do
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Task Title & Description */}
                    <div>
                      <h3 className={`font-bold text-base ${isCompleted ? 'text-slate-300' : 'text-white'}`}>
                        {t.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.description}</p>
                    </div>

                    {/* Metadata & Assignee */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Deadline: <strong className="text-slate-300">{t.deadline}</strong>
                      </span>
                      <span>
                        Assigned by: <strong className="text-slate-300">{t.assignedByAdminName || 'PR Head'}</strong>
                      </span>
                    </div>

                    {/* Submitted Proof / Notes */}
                    {t.submissionNotes && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Your Submission:</span>
                        <p>{t.submissionNotes}</p>
                        {t.submissionProofUrl && (
                          <a
                            href={t.submissionProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> View Submitted Proof Link
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    {!isCompleted && (
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowTaskSubmitModal(t);
                            setSubmissionNotes(t.submissionNotes || '');
                            setSubmissionProofUrl(t.submissionProofUrl || '');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                        >
                          <Send className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Submit Notes & Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCompleteTask(t)}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/30"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Complete & Claim XP ✨</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 4: MOU GENERATOR ────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_mou_maker' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                MoU Agreements & Legal Drafts
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate official Memorandums of Understanding for corporate sponsors and college partners.
              </p>
            </div>

            <button
              onClick={() => setShowMouModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Draft New MoU
            </button>
          </div>

          {/* List of Mous */}
          {mous.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-200">No MoUs Drafted Yet</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Once you close a sponsorship deal, generate an official MoU here to send to the partner.
              </p>
              <button
                onClick={() => setShowMouModal(true)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                + Draft MoU
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mous.map((mou) => (
                <div
                  key={mou.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-base text-white">{mou.partnerOrganization}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase">
                        {mou.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      Signatory: <strong>{mou.partnerSignatory}</strong> ({mou.partnerDesignation})
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-2">Purpose: {mou.purpose}</div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Agreed Sponsorship:</span>
                      <strong className="text-emerald-400 font-mono text-sm">
                        ₹{mou.sponsorshipAmount?.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px] font-mono">{mou.id}</span>
                    <button
                      onClick={() => setSelectedPreviewMou(mou)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> View / Print MoU
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 5: COMMISSION LEDGER & EARNINGS ─────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_earnings' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Your Commission & Earnings Ledger
            </h2>
            <p className="text-xs text-slate-400">
              Verified breakdown of sponsorship revenues brought to AEW and confirmed commission payouts based on your {currentTier} tier rate ({commissionRate}%).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Total Sponsorship Closed</div>
                <div className="text-xl font-black text-white font-mono mt-1">
                  ₹{totalWonRevenue.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Your Current Commission Rate</div>
                <div className="text-xl font-black text-indigo-400 font-mono mt-1">
                  {commissionRate}% ({currentTier})
                </div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Confirmed Payout Earned</div>
                <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                  ₹{totalCommissionEarned.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Won Deals Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Closed Deals Breakdown</h3>
            {wonLeads.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl text-xs text-slate-400">
                No closed deals yet. Update leads in your pipeline to "Closed Won" to register your verified commissions.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {wonLeads.map((deal) => (
                  <div key={deal.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{deal.organizationName}</div>
                      <div className="text-slate-400 text-[11px]">Contact: {deal.contactPerson} ({deal.designation})</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400 font-mono">
                        +₹{(deal.commissionEarned || Math.round(((deal.closedAmount || deal.expectedSponsorshipAmount) * commissionRate) / 100)).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Deal: ₹{(deal.closedAmount || deal.expectedSponsorshipAmount).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 6: PR TEAM (PR HEAD ONLY) ───────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_team' && currentUser.role === 'pr_head' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                PR Team Roster
              </h2>
              <p className="text-xs text-slate-400">Manage PR interns, assign objectives, and review progress.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUsers.filter((u) => u.role === 'pr_intern' && !u.isOffboarded).map((member) => (
              <div key={member.teacherId} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">{member.name}</h3>
                    <div className="text-xs text-slate-400">{member.email}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {member.prTier || 'Silver'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
                  <span>Earned XP: <strong className="text-indigo-300">{member.prPoints || 0}</strong></span>
                  <span>Stars: <strong className="text-amber-300">⭐ {member.prStars || 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 1: ADD NEW LEAD ───────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Register Sponsorship Lead
              </h3>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Organization / College / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IIT Delhi Rendezvous Fest / Tech Mahindra"
                  value={leadOrgName}
                  onChange={(e) => setLeadOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Contact Person Name (Who they are) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={leadContactPerson}
                    onChange={(e) => setLeadContactPerson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Fest Convener / Sponsorship Head"
                    value={leadDesignation}
                    onChange={(e) => setLeadDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number (with WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="contact@sponsor.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lead Category</label>
                  <select
                    value={leadType}
                    onChange={(e) => setLeadType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="college_sponsorship">College Fest Sponsorship</option>
                    <option value="fest_mou">Official Fest MoU</option>
                    <option value="hackathon_partner">Hackathon Knowledge Partner</option>
                    <option value="campus_ambassador">Campus Ambassador Chapter</option>
                    <option value="corporate_sponsor">Corporate Brand Sponsor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Expected Deal Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={leadExpectedAmount}
                    onChange={(e) => setLeadExpectedAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Conversation Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Discussed title branding for annual hackathon. Requested official proposal pitch deck by Friday."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 2: COMPLETE TASK / SUBMIT PROOF ───────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showTaskSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Submit / Complete Task
              </h3>
              <button
                onClick={() => setShowTaskSubmitModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="font-bold text-white">{showTaskSubmitModal.title}</div>
              <div className="text-slate-400">{showTaskSubmitModal.description}</div>
              <div className="text-amber-400 font-mono font-bold pt-1">
                Reward: ⭐ {showTaskSubmitModal.starsReward} Stars • 🎖️ {showTaskSubmitModal.pointsReward} XP
              </div>
            </div>

            <form onSubmit={handleSubmitTaskForReview} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Submission Notes / Summary of Work
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize what you accomplished, links sent, or results achieved..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Proof URL (Google Drive, Sheet, or Screenshot Link)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://..."
                  value={submissionProofUrl}
                  onChange={(e) => setSubmissionProofUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTaskSubmitModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer"
                >
                  Submit for Review
                </button>
                <button
                  type="button"
                  disabled={isSubmittingTask}
                  onClick={() => handleCompleteTask(showTaskSubmitModal, submissionNotes, submissionProofUrl)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1 shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Complete & Claim XP ✨</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 3: MOU DRAFTING FORM ──────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showMouModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> Draft Formal MoU Agreement
              </h3>
              <button
                onClick={() => setShowMouModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMou} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Partner Organization / College Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rendezvous 2026, IIT Delhi"
                  value={mouPartnerOrg}
                  onChange={(e) => setMouPartnerOrg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Signatory Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={mouSignatory}
                    onChange={(e) => setMouSignatory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. President / Convener"
                    value={mouDesignation}
                    onChange={(e) => setMouDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Campus Office / Desk Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Student Activity Center"
                    value={mouAddress}
                    onChange={(e) => setMouAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sponsorship Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={mouSponsorshipAmount}
                    onChange={(e) => setMouSponsorshipAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Agreement Start Date</label>
                  <input
                    type="date"
                    value={mouStartDate}
                    onChange={(e) => setMouStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Agreement Valid Till</label>
                  <input
                    type="date"
                    value={mouEndDate}
                    onChange={(e) => setMouEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Partnership Purpose</label>
                <input
                  type="text"
                  value={mouPurpose}
                  onChange={(e) => setMouPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Custom Terms (1 per line)</label>
                <textarea
                  rows={3}
                  value={mouCustomTerms}
                  onChange={(e) => setMouCustomTerms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMouModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
                >
                  Generate MoU Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 4: PRINTABLE MOU PREVIEW ──────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedPreviewMou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-black text-xl text-slate-900">MEMORANDUM OF UNDERSTANDING</h3>
                <p className="text-xs text-slate-500">Ref: {selectedPreviewMou.mouNumber || selectedPreviewMou.id}</p>
              </div>
              <button
                onClick={() => setSelectedPreviewMou(null)}
                className="text-slate-400 hover:text-slate-800 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs leading-relaxed space-y-3">
              <p>
                This Memorandum of Understanding (MoU) is entered between{' '}
                <strong>Apna Engineering Wallah (AEW)</strong> and{' '}
                <strong>{selectedPreviewMou.partnerOrganization}</strong> represented by{' '}
                <strong>{selectedPreviewMou.partnerSignatory}</strong> ({selectedPreviewMou.partnerDesignation}).
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div><strong>Purpose:</strong> {selectedPreviewMou.purpose}</div>
                <div><strong>Agreed Amount:</strong> ₹{selectedPreviewMou.sponsorshipAmount?.toLocaleString('en-IN')}</div>
                <div><strong>Valid Through:</strong> {selectedPreviewMou.endDate}</div>
              </div>
              <div className="space-y-1 text-slate-700 pt-2">
                <div className="font-bold text-slate-900">Terms & Conditions:</div>
                <ul className="list-disc pl-5 space-y-1">
                  {selectedPreviewMou.terms.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Drafted by PR Intern: {currentUser.name} ({currentUser.teacherId})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedPreviewMou(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
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
