import React, { useState, useMemo } from 'react';
import type { User, PrTask, PrLead, PrMouRequest, PrCollege, PrTier, PrLeadStage } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Award, Star, DollarSign, TrendingUp, FileText, CheckCircle2,
  Send, Plus, Building2, Phone, Mail,
  ExternalLink, Copy, Check, Printer, ShieldCheck, ChevronRight,
  Search, ArrowUpRight, Sparkles, HelpCircle, Briefcase
} from 'lucide-react';

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
  const [colleges, setColleges] = useState<PrCollege[]>(() => StorageService.getPrColleges());
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getCurrentUser() || intern);

  // Modals & form state
  const [showTaskSubmitModal, setShowTaskSubmitModal] = useState<PrTask | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionProofUrl, setSubmissionProofUrl] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [leadOrgName, setLeadOrgName] = useState('');
  const [leadContactPerson, setLeadContactPerson] = useState('');
  const [leadDesignation, setLeadDesignation] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadType, setLeadType] = useState<PrLead['type']>('college_sponsorship');
  const [leadExpectedAmount, setLeadExpectedAmount] = useState<number>(50000);
  const [leadNotes, setLeadNotes] = useState('');

  const [showMouModal, setShowMouModal] = useState(false);
  const [selectedPreviewMou, setSelectedPreviewMou] = useState<PrMouRequest | null>(null);
  const [mouPartnerOrg, setMouPartnerOrg] = useState('');
  const [mouSignatory, setMouSignatory] = useState('');
  const [mouDesignation, setMouDesignation] = useState('');
  const [mouAddress, setMouAddress] = useState('');
  const [mouPurpose, setMouPurpose] = useState('Official Academic Knowledge Partner & Title Sponsor for Annual College Fest');
  const [mouSponsorshipAmount, setMouSponsorshipAmount] = useState<number>(50000);
  const [mouStartDate, setMouStartDate] = useState('2026-09-20');
  const [mouEndDate, setMouEndDate] = useState('2026-09-22');
  const [mouCustomTerms, setMouCustomTerms] = useState<string>([
    'AEW shall be recognized as the Principal Title Sponsor across all event hoardings, posters, and digital broadcasts.',
    'AEW faculty shall be allocated a 60-minute prime stage slot for interactive tech keynote and student mentorship.',
    'Partner institution shall provide AEW prime 10x10 ft booth space in main college courtyard for app downloads.',
    'Financial consideration to be disbursed: 50% advance upon MoU signing, 50% post-event completion.',
    'Partner shall grant AEW access to share free syllabus and PYQ repository links to all registered student delegates.'
  ].join('\n'));

  // Quick WhatsApp pitch copied indicator
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null);

  // Filters & search
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');
  const [collegeSearch, setCollegeSearch] = useState('');
  const [calculatorAmount, setCalculatorAmount] = useState<number>(100000);

  // Re-sync on external trigger or storage updates
  React.useEffect(() => {
    setTasks(StorageService.getPrTasks());
    setLeads(StorageService.getPrLeads());
    setMous(StorageService.getPrMous());
    setColleges(StorageService.getPrColleges());
    const freshUser = StorageService.getUsers().find((u) => u.teacherId.toUpperCase() === intern.teacherId.toUpperCase());
    if (freshUser) setCurrentUser(freshUser);
  }, [refreshTrigger, intern.teacherId]);

  // Tier info & stats
  const currentTier: PrTier = currentUser.prTier || 'Silver';
  const points = currentUser.prPoints || 0;
  const stars = currentUser.prStars || 0;
  const commissionRate = StorageService.getTierCommissionRate(currentTier);

  // Next tier threshold calculation
  const nextTierInfo = useMemo(() => {
    if (currentTier === 'Silver') {
      const ptsReq = Math.max(0, 100 - points);
      const starsReq = Math.max(0, 5 - stars);
      const ptsProgress = Math.min(100, Math.round((points / 100) * 100));
      return {
        nextTier: 'Gold' as PrTier,
        nextRate: 7.0,
        ptsRemaining: ptsReq,
        starsRemaining: starsReq,
        progressPct: ptsProgress,
        isMax: false,
      };
    } else if (currentTier === 'Gold') {
      const ptsReq = Math.max(0, 300 - points);
      const starsReq = Math.max(0, 15 - stars);
      const ptsProgress = Math.min(100, Math.round(((points - 100) / 200) * 100));
      return {
        nextTier: 'Premium' as PrTier,
        nextRate: 12.0,
        ptsRemaining: ptsReq,
        starsRemaining: starsReq,
        progressPct: ptsProgress,
        isMax: false,
      };
    }
    return {
      nextTier: 'Premium' as PrTier,
      nextRate: 12.0,
      ptsRemaining: 0,
      starsRemaining: 0,
      progressPct: 100,
      isMax: true,
    };
  }, [currentTier, points, stars]);

  // Aggregate financial metrics
  const internLeads = leads.filter((l) => l.internId.toUpperCase() === currentUser.teacherId.toUpperCase());
  const totalClosedRevenue = currentUser.totalSponsorshipRevenue || internLeads.filter(l => l.stage === 'closed_won').reduce((sum, l) => sum + (l.closedAmount || l.expectedSponsorshipAmount || 0), 0);
  const totalCommissionEarned = currentUser.totalCommissionEarned || internLeads.filter(l => l.stage === 'closed_won').reduce((sum, l) => sum + (l.commissionEarned || 0), 0);
  const pipelineValue = internLeads.filter(l => l.stage !== 'closed_won' && l.stage !== 'closed_lost').reduce((sum, l) => sum + (l.expectedSponsorshipAmount || 0), 0);

  // Tasks filter
  const myTasks = tasks.filter((t) => t.assignedToInternId.toUpperCase() === currentUser.teacherId.toUpperCase());
  const filteredTasks = myTasks.filter((t) => {
    if (taskFilterStatus === 'all') return true;
    return t.status === taskFilterStatus;
  });

  // Handle task submission
  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTaskSubmitModal) return;
    if (!submissionNotes.trim()) {
      alert('Please provide brief submission notes or summary of work done.');
      return;
    }
    setIsSubmittingTask(true);
    const updated = StorageService.submitPrTask(showTaskSubmitModal.id, submissionNotes, submissionProofUrl);
    if (updated) {
      setTasks(StorageService.getPrTasks());
      setShowTaskSubmitModal(null);
      setSubmissionNotes('');
      setSubmissionProofUrl('');
    }
    setIsSubmittingTask(false);
  };

  // Handle adding lead
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadOrgName.trim() || !leadContactPerson.trim()) {
      alert('Please fill in the organization name and contact person.');
      return;
    }
    const newLead = StorageService.createPrLead({
      internId: currentUser.teacherId,
      internName: currentUser.name,
      type: leadType,
      organizationName: leadOrgName.trim(),
      contactPerson: leadContactPerson.trim(),
      designation: leadDesignation.trim() || 'Fest Convener',
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
  };

  // Handle stage change & deal closure
  const handleStageChange = (leadId: string, nextStage: PrLeadStage) => {
    let closedVal: number | undefined = undefined;
    if (nextStage === 'closed_won') {
      const target = leads.find(l => l.id === leadId);
      const promptVal = prompt('Confirm final closed sponsorship amount (₹):', String(target?.expectedSponsorshipAmount || 50000));
      if (!promptVal || isNaN(Number(promptVal))) return;
      closedVal = Number(promptVal);
    }
    const updated = StorageService.updatePrLeadStage(leadId, nextStage, closedVal);
    if (updated) {
      setLeads(StorageService.getPrLeads());
      const freshUser = StorageService.getUsers().find((u) => u.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase());
      if (freshUser) setCurrentUser(freshUser);
    }
  };

  // Handle MOU Creation
  const handleCreateMou = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mouPartnerOrg.trim() || !mouSignatory.trim()) {
      alert('Please enter the partner organization name and signatory authority.');
      return;
    }
    const termsArray = mouCustomTerms.split('\n').map(t => t.trim()).filter(Boolean);
    const newMou = StorageService.createPrMou({
      internId: currentUser.teacherId,
      internName: currentUser.name,
      partnerOrganization: mouPartnerOrg.trim(),
      partnerSignatory: mouSignatory.trim(),
      partnerDesignation: mouDesignation.trim() || 'Dean Student Welfare',
      partnerAddress: mouAddress.trim() || 'College Campus Administrative Block',
      purpose: mouPurpose.trim(),
      terms: termsArray,
      sponsorshipAmount: Number(mouSponsorshipAmount) || 0,
      startDate: mouStartDate,
      endDate: mouEndDate,
      status: 'pending_admin_approval',
    });
    setMous([newMou, ...mous]);
    setShowMouModal(false);
    setSelectedPreviewMou(newMou);
  };

  // 1-Click Copy WhatsApp Pitch
  const handleCopyPitch = (college: PrCollege) => {
    const text = `Greetings Prof./Dr. ${college.contactPerson} (${college.name}),\n\nHope this finds you well. I am ${currentUser.name} representing Apna Engineering Wallah (AEW) - India's leading engineering curriculum & placement platform.\n\nWe would love to collaborate with ${college.name} as an Academic Knowledge Partner and offer title sponsorship support for your upcoming college fests and technical hackathons. We also provide free accredited masterclasses on Data Structures, Algorithms, and System Design for your student batches.\n\nCould we connect for a brief 10-minute introductory call this week?\n\nWarm regards,\n${currentUser.name}\nPublic Relations & Campus Outreach Executive\nApna Engineering Wallah (AEW)`;
    navigator.clipboard.writeText(text);
    setCopiedPitchId(college.id);
    setTimeout(() => setCopiedPitchId(null), 3000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* ─── TOP HEADER BAR ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 ${
              currentTier === 'Premium'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                : currentTier === 'Gold'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
            }`}>
              <Award className="w-3.5 h-3.5" />
              {currentTier} Tier Intern
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
              💰 {commissionRate}% Sponsorship Share
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-400">
            Public Relations & Campus Sponsorship Workspace • {currentUser.teacherId}
          </p>
        </div>

        {/* Quick KPI Pills in Header */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Verified Stars
            </div>
            <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
              {stars} ⭐
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-indigo-400" /> Bounty Points
            </div>
            <div className="text-lg font-black text-indigo-300 font-mono mt-0.5">
              {points} 🎖️
            </div>
          </div>
        </div>
      </div>

      {/* ─── TAB NAVIGATION BAR ─── */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto text-xs no-scrollbar">
        {[
          { id: 'pr_dashboard', label: 'Mission Control & Tier', icon: Award },
          { id: 'pr_tasks', label: `Assigned Tasks (${myTasks.filter(t => t.status === 'pending').length} New)`, icon: CheckCircle2 },
          { id: 'pr_leads', label: `Lead Pipeline (${leads.length})`, icon: DollarSign },
          { id: 'pr_mou_maker', label: `MOU Generator (${mous.length})`, icon: FileText },
          { id: 'pr_colleges', label: `Campus Network (${colleges.length})`, icon: Building2 },
          { id: 'pr_earnings', label: 'Commission Ledger', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onPageChange(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 1: MISSION CONTROL & TIER PROGRESSION ──────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_dashboard' && (
        <div className="space-y-6">
          
          {/* TIER HERO CARD */}
          <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden shadow-2xl transition-all ${
            currentTier === 'Premium'
              ? 'bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-purple-500/30'
              : currentTier === 'Gold'
              ? 'bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border-amber-500/30'
              : 'bg-gradient-to-br from-slate-800/40 via-slate-900 to-slate-950 border-slate-700/50'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-950/80 border border-slate-800 text-slate-200">
                    Tier-Based Prerogative Status
                  </span>
                  <span className="text-xs text-slate-400">• Evaluated & Assigned by Admin</span>
                </div>

                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                    {currentTier === 'Premium' ? '💎 Premium Tier' : currentTier === 'Gold' ? '🥇 Gold Tier' : '🥈 Silver Tier'}
                  </h2>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {commissionRate}%
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  As a <strong className="text-white">{currentTier} Tier</strong> intern, you take home{' '}
                  <strong className="text-emerald-300 font-bold">{commissionRate}% of all sponsorship revenue</strong> you bring to AEW. Earn more Stars ⭐ and Points 🎖️ by completing Admin-assigned tasks to automatically unlock higher tiers!
                </p>

                {/* Progress bar to next tier */}
                {!nextTierInfo.isMax ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                      <span>Progress to {nextTierInfo.nextTier} Tier ({nextTierInfo.nextRate}% Commission):</span>
                      <span className="font-mono text-indigo-400">
                        {nextTierInfo.ptsRemaining} pts & {nextTierInfo.starsRemaining} stars left
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
                      <div
                        className="h-full rounded-full transition-all bg-gradient-to-r from-indigo-500 to-amber-400"
                        style={{ width: `${nextTierInfo.progressPct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-xs font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    You have reached the highest tier (Premium) with maximum 12% revenue commission!
                  </div>
                )}
              </div>

              {/* TIER COMPARISON MATRIX */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3 min-w-[280px]">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span>Commission Table</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                </div>

                <div className="space-y-2 text-xs">
                  <div className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                    currentTier === 'Silver' ? 'bg-slate-800 border border-slate-700 text-white font-bold' : 'text-slate-400'
                  }`}>
                    <span className="flex items-center gap-2">🥈 Silver (Base)</span>
                    <span className="font-mono font-black text-slate-200">3.3%</span>
                  </div>

                  <div className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                    currentTier === 'Gold' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold' : 'text-slate-400'
                  }`}>
                    <span className="flex items-center gap-2">🥇 Gold (100p + 5⭐)</span>
                    <span className="font-mono font-black text-amber-300">7.0%</span>
                  </div>

                  <div className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                    currentTier === 'Premium' ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200 font-bold' : 'text-slate-400'
                  }`}>
                    <span className="flex items-center gap-2">💎 Premium (300p + 15⭐)</span>
                    <span className="font-mono font-black text-purple-300">12.0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 PRIMARY METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Total Closed Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                ₹{totalClosedRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" /> Brought to company
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Your Take-Home Payout</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-300 font-mono">
                ₹{totalCommissionEarned.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-indigo-400 flex items-center gap-1 font-medium">
                💰 Based on {commissionRate}% tier share
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Active Pipeline Value</span>
                <Briefcase className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                ₹{pipelineValue.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400">
                {internLeads.filter(l => l.stage !== 'closed_won' && l.stage !== 'closed_lost').length} deals in discussion
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Approved MOUs</span>
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono">
                {mous.filter(m => m.status === 'approved' || m.status === 'signed').length}
              </div>
              <div className="text-[11px] text-slate-400">
                Formal legal partner contracts
              </div>
            </div>
          </div>

          {/* COMMISSION SIMULATOR & QUICK ACTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COMMISSION SIMULATOR */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Real-Time Sponsorship Commission Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test expected sponsorship amounts to see your exact take-home earnings at your current tier vs higher tiers.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-300 font-semibold shrink-0">Sponsorship Deal Amount (₹):</label>
                  <input
                    type="number"
                    step="5000"
                    min="10000"
                    max="1000000"
                    value={calculatorAmount}
                    onChange={(e) => setCalculatorAmount(Math.max(0, Number(e.target.value)))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500 w-44"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className={`p-4 rounded-2xl border ${currentTier === 'Silver' ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="text-[11px] text-slate-400 font-medium">Silver Tier (3.3%)</div>
                    <div className="text-lg font-black text-slate-200 font-mono mt-1">
                      ₹{Math.round((calculatorAmount * 3.3) / 100).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Take-home payout</div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${currentTier === 'Gold' ? 'bg-amber-950/40 border-amber-500/50' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="text-[11px] text-amber-300 font-medium">Gold Tier (7.0%)</div>
                    <div className="text-lg font-black text-amber-300 font-mono mt-1">
                      ₹{Math.round((calculatorAmount * 7.0) / 100).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-amber-400/80 mt-0.5">+₹{Math.round((calculatorAmount * (7.0 - 3.3)) / 100).toLocaleString('en-IN')} more than Silver!</div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${currentTier === 'Premium' ? 'bg-purple-950/40 border-purple-500/50' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="text-[11px] text-purple-300 font-medium">Premium Tier (12.0%)</div>
                    <div className="text-lg font-black text-purple-300 font-mono mt-1">
                      ₹{Math.round((calculatorAmount * 12.0) / 100).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-purple-400/80 mt-0.5">+₹{Math.round((calculatorAmount * (12.0 - 3.3)) / 100).toLocaleString('en-IN')} more!</div>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS DRAWER */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" /> Quick PR Actions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct triggers to accelerate your outreach and sponsorship deals.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => setShowAddLeadModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Sponsorship Lead
                  </span>
                  <ChevronRight className="w-4 h-4 text-indigo-200" />
                </button>

                <button
                  onClick={() => setShowMouModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-between transition-all cursor-pointer border border-slate-700/60"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" /> Create Formal MoU
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => onPageChange('pr_tasks')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-between transition-all cursor-pointer border border-slate-700/60"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> View Assigned Tasks ({myTasks.filter(t => t.status === 'pending').length})
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Admin reviews task submissions & grants Stars every 24 hours.</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 2: ASSIGNED TASKS & STARS ROOM ─────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_tasks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-indigo-400" /> Assigned Tasks & Star Bounties
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tasks assigned directly by Academic Operations Admin. Complete them and submit proof to earn Stars ⭐ and Points 🎖️.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
              {['all', 'pending', 'submitted', 'approved', 'revision_requested'].map((st) => (
                <button
                  key={st}
                  onClick={() => setTaskFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl capitalize font-bold transition-all cursor-pointer ${
                    taskFilterStatus === st
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-bold text-slate-300 text-base">No tasks found</div>
              <p className="text-xs text-slate-500">You are all caught up on tasks in this category!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((t) => {
                const isPending = t.status === 'pending';
                const isSubmitted = t.status === 'submitted';
                const isApproved = t.status === 'approved';
                const isRevision = t.status === 'revision_requested';

                return (
                  <div
                    key={t.id}
                    className={`bg-slate-900 border rounded-3xl p-6 space-y-4 shadow-xl transition-all flex flex-col justify-between ${
                      isApproved
                        ? 'border-emerald-500/30'
                        : isRevision
                        ? 'border-rose-500/40'
                        : isSubmitted
                        ? 'border-amber-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Bounties & Priority */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1 font-mono">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            +{t.starsReward} Stars
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center gap-1 font-mono">
                            <TrendingUp className="w-3.5 h-3.5" />
                            +{t.pointsReward} Pts
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : isSubmitted
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : isRevision
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base text-slate-100">{t.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{t.description}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Deadline: <strong className="text-slate-200">{t.deadline}</strong></span>
                        <span>Assigned by: <strong className="text-slate-300">{t.assignedByAdminName}</strong></span>
                      </div>

                      {/* Notes / Proof info */}
                      {t.submissionNotes && (
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Submission:</span>
                          <p className="text-slate-300">{t.submissionNotes}</p>
                          {t.submissionProofUrl && (
                            <a
                              href={t.submissionProofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 text-[11px] inline-flex items-center gap-1 font-semibold mt-1"
                            >
                              <ExternalLink className="w-3 h-3" /> View Submitted Proof Link
                            </a>
                          )}
                        </div>
                      )}

                      {/* Admin remarks */}
                      {t.adminRemarks && (
                        <div className={`p-3 rounded-2xl border text-xs space-y-0.5 ${
                          isApproved
                            ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
                            : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                        }`}>
                          <strong className="text-[10px] uppercase font-bold tracking-wider block">Admin Feedback:</strong>
                          <p>{t.adminRemarks}</p>
                        </div>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="pt-4 border-t border-slate-800/80">
                      {isPending || isRevision ? (
                        <button
                          onClick={() => {
                            setShowTaskSubmitModal(t);
                            setSubmissionNotes(t.submissionNotes || '');
                            setSubmissionProofUrl(t.submissionProofUrl || '');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isRevision ? 'Submit Revised Work' : 'Submit Task Proof & Notes'}
                        </button>
                      ) : isSubmitted ? (
                        <div className="text-center text-xs text-amber-400/90 font-medium py-1">
                          ⏳ Waiting for Admin review & Star/Point allocation
                        </div>
                      ) : (
                        <div className="text-center text-xs text-emerald-400 font-bold py-1 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          +{t.awardedStars || t.starsReward} Stars & +{t.awardedPoints || t.pointsReward} Points Awarded!
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 3: LEAD GENERATOR & SPONSORSHIP PIPELINE ─────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_leads' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-400" /> Sponsorship Lead Generator & Pipeline
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Register sponsorship opportunities with colleges, techfests, and brand partners. Every closed deal pays {commissionRate}% commission!
              </p>
            </div>

            <button
              onClick={() => setShowAddLeadModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Register New Sponsorship Lead
            </button>
          </div>

          {/* Leads table / cards */}
          {leads.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-bold text-slate-300 text-base">No Leads Registered Yet</div>
              <p className="text-xs text-slate-500">Click "+ Register New Sponsorship Lead" to start building your revenue pipeline.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leads.map((lead) => {
                const isWon = lead.stage === 'closed_won';
                const isLost = lead.stage === 'closed_lost';
                const projectedPayout = Math.round((lead.expectedSponsorshipAmount * commissionRate) / 100);

                return (
                  <div
                    key={lead.id}
                    className={`bg-slate-900 border rounded-3xl p-6 space-y-4 shadow-xl transition-all flex flex-col justify-between ${
                      isWon
                        ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900'
                        : isLost
                        ? 'border-slate-800 opacity-60'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                            {lead.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <h3 className="font-extrabold text-base text-slate-100 mt-1">{lead.organizationName}</h3>
                          <div className="text-xs text-slate-400">
                            {lead.contactPerson} ({lead.designation})
                          </div>
                        </div>

                        {/* Status selector */}
                        <select
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead.id, e.target.value as PrLeadStage)}
                          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="lead">Lead / Prospect</option>
                          <option value="contacted">Contacted</option>
                          <option value="pitch_deck_sent">Pitch Deck Sent</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="mou_drafted">MoU Drafted</option>
                          <option value="closed_won">✅ Closed Won</option>
                          <option value="closed_lost">❌ Closed Lost</option>
                        </select>
                      </div>

                      {/* Financial projection banner */}
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400 text-[11px] block">
                            {isWon ? 'Final Closed Revenue:' : 'Expected Sponsorship:'}
                          </span>
                          <span className="text-base font-black text-slate-100 font-mono">
                            ₹{(isWon ? lead.closedAmount : lead.expectedSponsorshipAmount)?.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-slate-400 text-[11px] block">
                            {isWon ? 'Confirmed Commission:' : 'Projected Payout:'}
                          </span>
                          <span className="text-base font-black text-emerald-400 font-mono">
                            ₹{(isWon ? lead.commissionEarned : projectedPayout)?.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 block">({commissionRate}% {currentTier})</span>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-500" /> {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-500" /> {lead.email}
                          </span>
                        )}
                      </div>

                      {lead.notes && (
                        <p className="text-xs text-slate-400 italic bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
                          "{lead.notes}"
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Added on {new Date(lead.createdAt).toLocaleDateString()}
                      </span>

                      {!isWon && !isLost && (
                        <button
                          onClick={() => handleStageChange(lead.id, 'closed_won')}
                          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          Mark as Closed Won ➔
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 4: MOU MAKER & FORMAL AGREEMENTS ────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_mou_maker' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-400" /> Formal MoU Maker & Legal Agreements
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate official Memorandums of Understanding with college fests, knowledge partners, and student bodies with automated legal terms and signatory blocks.
              </p>
            </div>

            <button
              onClick={() => setShowMouModal(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Draft New Official MoU
            </button>
          </div>

          {/* List of MOUs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mous.map((m) => {
              const isApproved = m.status === 'approved' || m.status === 'signed';
              return (
                <div
                  key={m.id}
                  className={`bg-slate-900 border rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between ${
                    isApproved ? 'border-purple-500/40 bg-gradient-to-br from-purple-950/15 via-slate-900 to-slate-900' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                          {m.mouNumber}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-100 mt-2">{m.partnerOrganization}</h3>
                        <div className="text-xs text-slate-400">
                          Signatory: <strong className="text-slate-200">{m.partnerSignatory}</strong> ({m.partnerDesignation})
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isApproved
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : m.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="text-[11px] text-slate-400 font-semibold">Purpose:</div>
                      <p className="text-slate-200">{m.purpose}</p>
                      {m.sponsorshipAmount ? (
                        <div className="pt-1 flex items-center justify-between font-mono">
                          <span className="text-slate-400">Consideration:</span>
                          <span className="text-emerald-400 font-bold">₹{m.sponsorshipAmount.toLocaleString('en-IN')}</span>
                        </div>
                      ) : null}
                    </div>

                    {m.adminFeedback && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-purple-300">
                        <strong>Admin Note:</strong> {m.adminFeedback}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Duration: {m.startDate} to {m.endDate}
                    </span>

                    <button
                      onClick={() => setSelectedPreviewMou(m)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700/60"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-400" /> View & Print Formal MoU
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 5: CAMPUS DIRECTORY & WHATSAPP PITCH MAKER ─────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_colleges' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-400" /> Engineering Colleges Outreach Directory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verified training and placement officers (TPOs), HODs, and student body heads across universities.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search colleges, cities..."
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colleges
              .filter((c) => c.name.toLowerCase().includes(collegeSearch.toLowerCase()) || c.city.toLowerCase().includes(collegeSearch.toLowerCase()))
              .map((c) => {
                const isCopied = copiedPitchId === c.id;
                return (
                  <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                            {c.tier} • {c.state}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-100 mt-1">{c.name}</h4>
                          <p className="text-xs text-slate-400">{c.city}</p>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-800 text-slate-300">
                          {c.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1 text-xs">
                        <div className="text-slate-200 font-semibold">{c.contactPerson}</div>
                        <div className="text-slate-400 text-[11px]">{c.designation}</div>
                        <div className="flex items-center gap-3 text-slate-400 text-[11px] pt-1">
                          <span>📞 {c.phone}</span>
                          <span>✉️ {c.email}</span>
                        </div>
                      </div>

                      {c.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          "{c.notes}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopyPitch(c)}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopied ? 'WhatsApp Pitch Copied!' : 'Copy Tailored Pitch'}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── TAB 6: COMMISSION LEDGER & PAYOUTS ──────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentPage === 'pr_earnings' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" /> Commission Ledger & Closed Deals Statement
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified earnings statement for all sponsorship agreements closed under your PR ID ({currentUser.teacherId}).
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="font-bold text-sm text-slate-100">Itemized Sponsorship Statements</div>
              <div className="font-mono text-xs text-slate-400">
                Total Earned: <strong className="text-emerald-400 text-sm">₹{totalCommissionEarned.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-semibold">Partner / Organization</th>
                    <th className="p-4 font-semibold">Date Closed</th>
                    <th className="p-4 font-semibold">Deal Volume (₹)</th>
                    <th className="p-4 font-semibold">Intern Tier Rate</th>
                    <th className="p-4 font-semibold text-right">Commission Payout (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leads.filter(l => l.stage === 'closed_won').map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold text-slate-200">
                        {l.organizationName}
                        <span className="block text-[11px] text-slate-400 font-normal">{l.contactPerson}</span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">
                        {new Date(l.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-200">
                        ₹{(l.closedAmount || l.expectedSponsorshipAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {l.commissionRate || commissionRate}% ({l.internTierAtClosure || currentTier})
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-400 text-right text-sm">
                        +₹{(l.commissionEarned || Math.round(((l.closedAmount || l.expectedSponsorshipAmount) * commissionRate) / 100)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {leads.filter(l => l.stage === 'closed_won').length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No closed won deals in ledger yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 1: SUBMIT TASK PROOF ──────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showTaskSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-100">Submit Task for Admin Review</h3>
                <p className="text-xs text-slate-400">{showTaskSubmitModal.title}</p>
              </div>
              <button onClick={() => setShowTaskSubmitModal(null)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
              <span>Reward Upon Approval: <strong>+{showTaskSubmitModal.starsReward} Stars ⭐</strong> and <strong>+{showTaskSubmitModal.pointsReward} Points 🎖️</strong></span>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Summary of Work Accomplished *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the actions taken, meetings conducted, colleges reached, or deliverables finalized..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Proof Link (Google Drive / Docs / Spreadsheet / Social Post)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={submissionProofUrl}
                  onChange={(e) => setSubmissionProofUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTaskSubmitModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTask ? 'Submitting…' : 'Submit for Admin Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 2: ADD NEW SPONSORSHIP LEAD ───────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" /> Register Sponsorship Opportunity
              </h3>
              <button onClick={() => setShowAddLeadModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">College / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi Technological University (Yuvaan Fest)"
                  value={leadOrgName}
                  onChange={(e) => setLeadOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Gupta"
                    value={leadContactPerson}
                    onChange={(e) => setLeadContactPerson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Convener / TPO Head"
                    value={leadDesignation}
                    onChange={(e) => setLeadDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98110..."
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Email Address</label>
                  <input
                    type="email"
                    placeholder="fest@college.ac.in"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Deal Category</label>
                  <select
                    value={leadType}
                    onChange={(e) => setLeadType(e.target.value as PrLead['type'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="college_sponsorship">College Fest Title Sponsorship</option>
                    <option value="event_partner">Hackathon / Event Partner</option>
                    <option value="brand_sponsor">Co-Branded Workshop</option>
                    <option value="campus_ambassador_lead">Campus Ambassador Chapter</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Expected Deal Amount (₹)</label>
                  <input
                    type="number"
                    step="5000"
                    placeholder="50000"
                    value={leadExpectedAmount}
                    onChange={(e) => setLeadExpectedAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between font-mono">
                <span className="text-slate-400">Your Take-Home Commission ({commissionRate}%):</span>
                <span className="text-emerald-400 font-bold">₹{Math.round((leadExpectedAmount * commissionRate) / 100).toLocaleString('en-IN')}</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Discussion Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key deliverables discussed, timeline, special requests..."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  Save Sponsorship Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 3: CREATE FORMAL MOU ──────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showMouModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" /> Draft Formal Memorandum of Understanding (MoU)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generates legal contract between Apna Engineering Wallah (AEW) and Partner Institution.
                </p>
              </div>
              <button onClick={() => setShowMouModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateMou} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Partner Institution / Festival Council Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi Technological University Cultural & Technical Council"
                  value={mouPartnerOrg}
                  onChange={(e) => setMouPartnerOrg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Signatory Authority Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prof. K. Sharma"
                    value={mouSignatory}
                    onChange={(e) => setMouSignatory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Signatory Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Dean Student Welfare / Fest Convener"
                    value={mouDesignation}
                    onChange={(e) => setMouDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Partner Campus Address</label>
                <input
                  type="text"
                  placeholder="e.g. Shahbad Daulatpur, Bawana Road, Delhi - 110042"
                  value={mouAddress}
                  onChange={(e) => setMouAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">MoU Purpose & Theme</label>
                <input
                  type="text"
                  placeholder="e.g. Official Academic Knowledge Partner & Title Sponsor for Annual College Fest"
                  value={mouPurpose}
                  onChange={(e) => setMouPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Sponsorship Amount (₹)</label>
                  <input
                    type="number"
                    step="5000"
                    value={mouSponsorshipAmount}
                    onChange={(e) => setMouSponsorshipAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={mouStartDate}
                    onChange={(e) => setMouStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">End Date</label>
                  <input
                    type="date"
                    value={mouEndDate}
                    onChange={(e) => setMouEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Key Terms & Mutual Deliverables (One per line)</label>
                <textarea
                  rows={5}
                  value={mouCustomTerms}
                  onChange={(e) => setMouCustomTerms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMouModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Generate Official Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 4: FULL FORMAL MOU PREVIEW & PRINT ────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedPreviewMou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6 my-8">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="font-mono text-xs text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                Document: {selectedPreviewMou.mouNumber}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setSelectedPreviewMou(null)}
                  className="p-2 text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* FORMAL PRINTABLE LEGAL CONTRACT CONTAINER */}
            <div className="bg-white text-slate-900 p-8 md:p-12 rounded-2xl shadow-inner space-y-6 font-serif leading-relaxed text-xs border border-slate-200">
              
              {/* Header Letterhead */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase font-sans">
                  APNA ENGINEERING WALLAH (AEW)
                </h1>
                <p className="text-[11px] text-slate-600 font-sans font-medium">
                  Center for Technical Excellence & Academic Operations • New Delhi - 110001
                </p>
                <div className="text-[10px] font-mono text-slate-500 tracking-wider">
                  OFFICIAL MEMORANDUM OF UNDERSTANDING • {selectedPreviewMou.mouNumber}
                </div>
              </div>

              {/* Preamble */}
              <div className="space-y-2 text-justify">
                <p>
                  This Memorandum of Understanding (hereinafter referred to as <strong>"MoU"</strong>) is entered into as of{' '}
                  <strong>{selectedPreviewMou.startDate}</strong>, by and between:
                </p>
                <p>
                  <strong>FIRST PARTY:</strong> <strong>APNA ENGINEERING WALLAH (AEW)</strong>, an academic organization dedicated to advanced engineering curriculum, having its principal operations in New Delhi, represented herein by its authorized PR Representative <strong>{selectedPreviewMou.internName}</strong>.
                </p>
                <p className="text-center font-bold">AND</p>
                <p>
                  <strong>SECOND PARTY:</strong> <strong>{selectedPreviewMou.partnerOrganization}</strong>, having its address at {selectedPreviewMou.partnerAddress}, represented herein by <strong>{selectedPreviewMou.partnerSignatory}</strong>, in the capacity of <strong>{selectedPreviewMou.partnerDesignation}</strong>.
                </p>
              </div>

              {/* Purpose */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-950 uppercase font-sans text-[11px]">1. PURPOSE & SCOPE</h4>
                <p className="text-justify">{selectedPreviewMou.purpose}</p>
              </div>

              {/* Financial Clause */}
              {selectedPreviewMou.sponsorshipAmount ? (
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-950 uppercase font-sans text-[11px]">2. CONSIDERATION & SPONSORSHIP DISBURSEMENT</h4>
                  <p>
                    The First Party agrees to provide a financial consideration of{' '}
                    <strong>₹{selectedPreviewMou.sponsorshipAmount.toLocaleString('en-IN')}</strong> to the Second Party, disbursed in compliance with milestone deliverables specified herein.
                  </p>
                </div>
              ) : null}

              {/* Deliverables List */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-950 uppercase font-sans text-[11px]">3. MUTUAL RESPONSIBILITIES & COVENANTS</h4>
                <ol className="list-decimal pl-5 space-y-1.5">
                  {selectedPreviewMou.terms.map((t, idx) => (
                    <li key={idx} className="text-justify">{t}</li>
                  ))}
                </ol>
              </div>

              {/* Validity */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-950 uppercase font-sans text-[11px]">4. DURATION</h4>
                <p>
                  This agreement takes effect on <strong>{selectedPreviewMou.startDate}</strong> and shall remain in force until{' '}
                  <strong>{selectedPreviewMou.endDate}</strong>, unless terminated earlier by mutual consent in writing.
                </p>
              </div>

              {/* Signatures & Seal */}
              <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-300 font-sans">
                <div className="space-y-4">
                  <div className="h-10 border-b border-slate-400">
                    <span className="text-[10px] text-emerald-700 font-bold font-mono">
                      {selectedPreviewMou.status === 'approved' ? '✓ Digitally Verified & Sealed' : '[Pending Seal]'}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">For APNA ENGINEERING WALLAH</div>
                    <div className="text-[11px] text-slate-600">{selectedPreviewMou.internName} (PR Representative)</div>
                    <div className="text-[10px] text-slate-500">Directorate of Academic Operations</div>
                  </div>
                </div>

                <div className="space-y-4 text-right">
                  <div className="h-10 border-b border-slate-400"></div>
                  <div>
                    <div className="font-bold text-slate-900">For {selectedPreviewMou.partnerOrganization}</div>
                    <div className="text-[11px] text-slate-600">{selectedPreviewMou.partnerSignatory}</div>
                    <div className="text-[10px] text-slate-500">{selectedPreviewMou.partnerDesignation}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
