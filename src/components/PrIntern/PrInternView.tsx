import React, { useState, useMemo, useEffect } from 'react';
import type {
  User,
  PrTask,
  PrLead,
  PrMouRequest,
  PrTier,
  PrLeadStage,
  PrMouCategory,
  HackathonSponsorTier,
  CollegeSessionTopic,
  CollegeSessionMode,
  PrLeadCategory
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
  CheckCircle,
  Trophy,
  GraduationCap,
  Layers
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
  const [leadCategoryFilter, setLeadCategoryFilter] = useState<'all' | 'hackathon_sponsor' | 'college_society' | 'custom_partnership'>('all');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [editingLeadNotesId, setEditingLeadNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');

  // Add Lead Form State (Track-specific + Custom options)
  const [leadCategory, setLeadCategory] = useState<PrLeadCategory>('hackathon_sponsor');
  const [leadOrgName, setLeadOrgName] = useState('');
  const [leadContactPerson, setLeadContactPerson] = useState('');
  const [leadDesignation, setLeadDesignation] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadExpectedAmount, setLeadExpectedAmount] = useState<number>(50000);
  const [leadNotes, setLeadNotes] = useState('');

  // Track 1: Hackathon brand lead state
  const [leadHackathonTier, setLeadHackathonTier] = useState<HackathonSponsorTier>('track_challenge');
  const [leadCustomPackageName, setLeadCustomPackageName] = useState('');
  const [leadCompanyIndustry, setLeadCompanyIndustry] = useState('Developer Tools / Cloud');

  // Track 2: College society lead state
  const [leadCollegeName, setLeadCollegeName] = useState('');
  const [leadSocietyName, setLeadSocietyName] = useState('');
  const [leadFacultyMentor, setLeadFacultyMentor] = useState('');
  const [leadSessionTopic, setLeadSessionTopic] = useState<CollegeSessionTopic>('ai_ml_agents');
  const [leadCustomTopicName, setLeadCustomTopicName] = useState('');
  const [leadSessionMode, setLeadSessionMode] = useState<CollegeSessionMode>('offline_campus');
  const [leadTargetDate, setLeadTargetDate] = useState('');
  const [leadExpectedAudience, setLeadExpectedAudience] = useState<number>(140);

  // Track 3: Custom partnership lead state
  const [leadCustomTypeTitle, setLeadCustomTypeTitle] = useState('');

  // MoU Filter State
  const [mouCategoryFilter, setMouCategoryFilter] = useState<'all' | 'hackathon_sponsorship' | 'college_society_session' | 'custom_agreement'>('all');

  // MoU Generator Modal State
  const [showMouModal, setShowMouModal] = useState(false);
  const [selectedPreviewMou, setSelectedPreviewMou] = useState<PrMouRequest | null>(null);
  const [mouCategory, setMouCategory] = useState<PrMouCategory>('hackathon_sponsorship');
  const [mouPartnerOrg, setMouPartnerOrg] = useState('');
  const [mouSignatory, setMouSignatory] = useState('');
  const [mouDesignation, setMouDesignation] = useState('');
  const [mouAddress, setMouAddress] = useState('Campus Office / Corporate HQ');
  const [mouPurpose, setMouPurpose] = useState('Official Sponsorship & Deliverables Agreement for AEW National Hackathon 2026');
  const [mouSponsorshipAmount, setMouSponsorshipAmount] = useState<number>(50000);
  const [mouStartDate, setMouStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mouEndDate, setMouEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [mouCustomTerms, setMouCustomTerms] = useState<string>([
    'Second Party (Partner / Sponsor) commits to the agreed deliverables and partnership terms.',
    'Apna Engineering Wallah (AEW) shall provide official branding, stage presence, and student community outreach.',
    'Both parties agree to collaborate in good faith for event execution and student career growth.'
  ].join('\n'));

  // Track 1: Hackathon MoU specific fields
  const [mouHackathonName, setMouHackathonName] = useState('AEW National Hackathon 2026');
  const [mouHackathonTier, setMouHackathonTier] = useState<HackathonSponsorTier>('track_challenge');
  const [mouCustomTierName, setMouCustomTierName] = useState('');
  const [mouBoothRequired, setMouBoothRequired] = useState(true);
  const [mouKeynoteSlot, setMouKeynoteSlot] = useState(false);
  const [mouJudgeMentorSlot, setMouJudgeMentorSlot] = useState(true);
  const [mouResumeAccess, setMouResumeAccess] = useState(true);

  // Track 2: College Society MoU specific fields
  const [mouCollegeName, setMouCollegeName] = useState('');
  const [mouSocietyName, setMouSocietyName] = useState('');
  const [mouFacultyAdvisor, setMouFacultyAdvisor] = useState('');
  const [mouSessionTopic, setMouSessionTopic] = useState<CollegeSessionTopic>('ai_ml_agents');
  const [mouCustomTopic, setMouCustomTopic] = useState('');
  const [mouSessionMode, setMouSessionMode] = useState<CollegeSessionMode>('offline_campus');
  const [mouSessionDate, setMouSessionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [mouSessionTime, setMouSessionTime] = useState('11:00 AM - 1:00 PM');
  const [mouGuaranteedAudience, setMouGuaranteedAudience] = useState<number>(140);
  const [mouVenueOrPlatform, setMouVenueOrPlatform] = useState('College Main Auditorium / Seminar Hall');

  // Track 3: Custom Agreement MoU fields
  const [mouCustomAgreementTitle, setMouCustomAgreementTitle] = useState('Strategic Technical Partnership & Community Collaboration MoU');
  const [mouCustomPartnerType, setMouCustomPartnerType] = useState('Strategic Ecosystem Partner');
  const [mouCustomScopeOfWork, setMouCustomScopeOfWork] = useState('Collaborative initiatives in technology training, talent networking, and developer community empowerment.');

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
    window.addEventListener('aew_pr_leads_updated', handleSync);
    window.addEventListener('aew_pr_mous_updated', handleSync);
    window.addEventListener('aew_users_updated', handleSync);
    window.addEventListener('aew_cloud_data_synced', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('aew_pr_tasks_updated', handleSync);
      window.removeEventListener('aew_pr_leads_updated', handleSync);
      window.removeEventListener('aew_pr_mous_updated', handleSync);
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

  // Scope leads and MoUs to this individual intern unless PR Head inspects all team leads
  const isPrHead = currentUser.role === 'pr_head';
  const [prHeadLeadViewMode, setPrHeadLeadViewMode] = useState<'my_leads' | 'all_leads'>('my_leads');

  const myLeads = useMemo(() => {
    if (isPrHead && prHeadLeadViewMode === 'all_leads') {
      return leads;
    }
    const myId = (currentUser.teacherId || '').trim().toUpperCase();
    return leads.filter((l) => (l.internId || '').trim().toUpperCase() === myId);
  }, [leads, currentUser.teacherId, isPrHead, prHeadLeadViewMode]);

  const myMous = useMemo(() => {
    if (isPrHead && prHeadLeadViewMode === 'all_leads') {
      return mous;
    }
    const myId = (currentUser.teacherId || '').trim().toUpperCase();
    return mous.filter((m) => (m.internId || '').trim().toUpperCase() === myId);
  }, [mous, currentUser.teacherId, isPrHead, prHeadLeadViewMode]);

  // Leads pipeline calculations strictly scoped to this user's leads
  const totalPipelineRevenue = useMemo(() => {
    return myLeads
      .filter((l) => l.stage !== 'closed_lost')
      .reduce((sum, l) => sum + (l.closedAmount || l.expectedSponsorshipAmount || 0), 0);
  }, [myLeads]);

  const wonLeads = useMemo(() => {
    return myLeads.filter((l) => l.stage === 'closed_won');
  }, [myLeads]);

  const totalWonRevenue = useMemo(() => {
    return wonLeads.reduce((sum, l) => sum + (l.closedAmount || l.expectedSponsorshipAmount || 0), 0);
  }, [wonLeads]);

  const totalCommissionEarned = useMemo(() => {
    return wonLeads.reduce((sum, l) => sum + (l.commissionEarned || Math.round(((l.closedAmount || l.expectedSponsorshipAmount) * commissionRate) / 100)), 0);
  }, [wonLeads, commissionRate]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return myLeads.filter((lead) => {
      const matchesStage = leadFilterStage === 'all' || lead.stage === leadFilterStage;
      const effectiveCategory: PrLeadCategory = lead.leadCategory || (
        lead.type === 'college_society' ? 'college_society' :
        lead.type === 'custom_partnership' ? 'custom_partnership' :
        'hackathon_sponsor'
      );
      const matchesCategory = leadCategoryFilter === 'all' || effectiveCategory === leadCategoryFilter;
      const q = leadSearchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        lead.organizationName.toLowerCase().includes(q) ||
        lead.contactPerson.toLowerCase().includes(q) ||
        lead.designation.toLowerCase().includes(q) ||
        (lead.collegeName && lead.collegeName.toLowerCase().includes(q)) ||
        (lead.societyName && lead.societyName.toLowerCase().includes(q)) ||
        (lead.customPackageName && lead.customPackageName.toLowerCase().includes(q)) ||
        (lead.customTopicName && lead.customTopicName.toLowerCase().includes(q)) ||
        lead.phone?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q);
      return matchesStage && matchesCategory && matchesQuery;
    });
  }, [myLeads, leadFilterStage, leadCategoryFilter, leadSearchQuery]);

  // Filtered MoUs
  const filteredMous = useMemo(() => {
    return myMous.filter((mou) => {
      if (mouCategoryFilter === 'all') return true;
      const cat = mou.mouCategory || 'hackathon_sponsorship';
      return cat === mouCategoryFilter;
    });
  }, [myMous, mouCategoryFilter]);

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

  // 3. Add New Lead (Domain-Aware + Custom Options)
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const finalOrgName = leadCategory === 'college_society'
      ? (leadSocietyName.trim() ? `${leadSocietyName.trim()} (${leadCollegeName.trim() || 'College'})` : leadCollegeName.trim())
      : leadOrgName.trim();

    if (!finalOrgName || !leadContactPerson.trim()) {
      alert('Please fill in the Organization/College Name and Contact Person.');
      return;
    }

    const newLead = StorageService.createPrLead({
      internId: currentUser.teacherId,
      internName: currentUser.name,
      type: leadCategory === 'college_society' ? 'college_society' : leadCategory === 'custom_partnership' ? 'custom_partnership' : 'hackathon_sponsor',
      leadCategory,
      organizationName: finalOrgName,
      companyIndustry: leadCategory === 'hackathon_sponsor' ? leadCompanyIndustry : undefined,
      contactPerson: leadContactPerson.trim(),
      designation: leadDesignation.trim() || (leadCategory === 'college_society' ? 'Student Convener / Faculty In-Charge' : 'Sponsorship Lead'),
      email: leadEmail.trim(),
      phone: leadPhone.trim(),
      expectedSponsorshipAmount: leadCategory === 'college_society' ? 0 : (Number(leadExpectedAmount) || 0),
      stage: 'lead',
      internTierAtClosure: currentTier,
      commissionRate: commissionRate,
      notes: leadNotes.trim(),

      // Hackathon fields:
      hackathonTier: leadCategory === 'hackathon_sponsor' ? leadHackathonTier : undefined,
      customPackageName: leadCategory === 'hackathon_sponsor' && leadHackathonTier === 'custom_tier'
        ? leadCustomPackageName.trim()
        : (leadCategory === 'custom_partnership' ? leadCustomTypeTitle.trim() : undefined),

      // College Society fields:
      collegeName: leadCategory === 'college_society' ? leadCollegeName.trim() : undefined,
      societyName: leadCategory === 'college_society' ? leadSocietyName.trim() : undefined,
      facultyMentor: leadCategory === 'college_society' ? leadFacultyMentor.trim() : undefined,
      sessionTopic: leadCategory === 'college_society' ? leadSessionTopic : undefined,
      customTopicName: leadCategory === 'college_society' && leadSessionTopic === 'custom_topic' ? leadCustomTopicName.trim() : undefined,
      sessionMode: leadCategory === 'college_society' ? leadSessionMode : undefined,
      targetSessionDate: leadCategory === 'college_society' ? leadTargetDate : undefined,
      expectedAudience: leadCategory === 'college_society' ? (Number(leadExpectedAudience) || 140) : undefined,
    });

    setLeads([newLead, ...leads]);
    setShowAddLeadModal(false);
    // Reset Form
    setLeadOrgName('');
    setLeadCollegeName('');
    setLeadSocietyName('');
    setLeadFacultyMentor('');
    setLeadContactPerson('');
    setLeadDesignation('');
    setLeadPhone('');
    setLeadEmail('');
    setLeadNotes('');
    setLeadCustomPackageName('');
    setLeadCustomTopicName('');
    setLeadCustomTypeTitle('');
    setLeadExpectedAmount(50000);
    setLeadExpectedAudience(140);

    showToast(`✓ Added Lead: "${newLead.organizationName}"`, `Category: ${leadCategory.replace(/_/g, ' ').toUpperCase()}`);
  };

  // 4. Update Lead Stage / Status
  const handleStageChange = (leadId: string, nextStage: PrLeadStage) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;

    // Confirmation when shifting from 'lead' to 'contacted'
    if (nextStage === 'contacted') {
      const isCollegeSociety = target.leadCategory === 'college_society' || target.type === 'college_society';
      const confirmQuestion = isCollegeSociety
        ? `📞 Confirm Outreach to College Society:\n\nAre you sure you want to shift "${target.organizationName}" to Contacted?\n\nPlease confirm you have initiated contact with ${target.contactPerson} via WhatsApp pitch, email deck, or call.`
        : `📞 Confirm Sponsor Outreach:\n\nAre you sure you want to shift "${target.organizationName}" to Contacted?\n\nPlease confirm you have reached out to ${target.contactPerson} and shared the hackathon sponsorship pitch deck.`;

      if (!window.confirm(confirmQuestion)) {
        return;
      }
    }

    let closedVal: number | undefined = undefined;
    const isCollege = target.leadCategory === 'college_society' || target.type === 'college_society' || target.category === 'college_society_session';

    if (nextStage === 'closed_won') {
      if (isCollege) {
        // College Society Collaboration is a ₹0 Academic Barter - DO NOT ask for sponsorship amount!
        closedVal = 0;
        alert(
          `🎉 Outstanding Achievement! College Workshop Confirmed!\n\n` +
          `Institution / Society: ${target.organizationName}\n` +
          `Point of Contact: ${target.contactPerson}\n` +
          `Committed Audience: ${target.expectedAudience || 140} Students (Target: 130–155)\n\n` +
          `Commercials: ₹0 (Non-Commercial Academic Knowledge Barter)\n` +
          `Bounty stars and reputation points have been awarded!`
        );
      } else {
        // Commercial brand sponsorship
        const promptVal = prompt(
          `🎉 Congratulations on closing this Brand Sponsorship!\n\nConfirm final closed sponsorship amount (₹):`,
          String(target.expectedSponsorshipAmount || 50000)
        );
        if (!promptVal || isNaN(Number(promptVal))) return;
        closedVal = Number(promptVal);
      }

      try {
        confetti({
          particleCount: 120,
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

      showToast(
        `✓ Updated "${target.organizationName}" to ${nextStage.replace('_', ' ').toUpperCase()}`,
        nextStage === 'closed_won' 
          ? (isCollege ? 'Academic Barter Session Confirmed! (⭐ Bounty recorded)' : `Earned ₹${Math.round(((closedVal || 0) * commissionRate) / 100)} commission!`)
          : undefined
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

  // 7. Create MoU (Track-Specific + Custom Options)
  const handleCreateMou = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPartnerOrg = mouCategory === 'college_society_session'
      ? (mouSocietyName.trim() ? `${mouSocietyName.trim()}, ${mouCollegeName.trim() || 'College'}` : (mouCollegeName.trim() || mouPartnerOrg.trim()))
      : mouPartnerOrg.trim();

    if (!finalPartnerOrg || !mouSignatory.trim()) {
      alert('Please fill in Partner Organization/College and Signatory Name.');
      return;
    }

    const deliverablesList: string[] = [];
    if (mouCategory === 'hackathon_sponsorship') {
      if (mouBoothRequired) deliverablesList.push('Dedicated Sponsor Booth / Desk in Grand Finale Arena');
      if (mouKeynoteSlot) deliverablesList.push('15-Minute Keynote / Speaker Slot during Opening Ceremony');
      if (mouJudgeMentorSlot) deliverablesList.push('Official Judge & Mentor Panel representation');
      if (mouResumeAccess) deliverablesList.push('Exclusive Access to Top 1,000 Hackathon Participant Resumes');
      deliverablesList.push(`Official ${mouHackathonTier === 'custom_tier' ? (mouCustomTierName || 'Custom Partner') : mouHackathonTier.replace(/_/g, ' ').toUpperCase()} Branding on Devfolio & Livestreams`);
    } else if (mouCategory === 'college_society_session') {
      deliverablesList.push(`Hands-on workshop delivery on topic: ${mouSessionTopic === 'custom_topic' ? (mouCustomTopic || 'Custom Masterclass') : mouSessionTopic.replace(/_/g, ' ').toUpperCase()}`);
      deliverablesList.push(`Mode: ${mouSessionMode === 'offline_campus' ? 'On-Campus Auditorium Session' : mouSessionMode === 'virtual_webinar' ? 'Live Interactive Webinar' : 'Hybrid'}`);
      deliverablesList.push(`Guaranteed minimum audience commitment: ${mouGuaranteedAudience || 140} students (Target: 130–155)`);
      deliverablesList.push('AEW to provide verified digital certificates to all registered attendees at ₹0 cost');
      deliverablesList.push('College / Society to provide auditorium venue, audio-visual equipment, and campus publicity');
    }

    const defaultTerms = mouCustomTerms.split('\n').filter((line) => line.trim().length > 0);

    const newMou = StorageService.createPrMou({
      internId: currentUser.teacherId,
      internName: currentUser.name,
      partnerOrganization: finalPartnerOrg,
      partnerSignatory: mouSignatory.trim(),
      partnerDesignation: mouDesignation.trim() || (mouCategory === 'college_society_session' ? 'Faculty Advisor / Convener' : 'Authorized Signatory'),
      partnerAddress: mouAddress.trim() || (mouCategory === 'college_society_session' ? (mouCollegeName || 'College Campus') : 'Corporate HQ'),
      purpose: mouCategory === 'college_society_session'
        ? `Academic Workshop Collaboration on ${mouSessionTopic === 'custom_topic' ? (mouCustomTopic || 'Advanced Tech') : mouSessionTopic.replace(/_/g, ' ').toUpperCase()} with ${finalPartnerOrg}`
        : mouCategory === 'hackathon_sponsorship'
        ? `${mouHackathonName} Brand Sponsorship & Engagement Agreement`
        : mouPurpose.trim(),
      terms: defaultTerms.length > 0 ? defaultTerms : deliverablesList,
      sponsorshipAmount: mouCategory === 'college_society_session' ? 0 : (Number(mouSponsorshipAmount) || 0),
      startDate: mouStartDate,
      endDate: mouEndDate,
      status: 'pending_admin_approval',

      // Revamped Category & Details:
      mouCategory,
      hackathonName: mouCategory === 'hackathon_sponsorship' ? mouHackathonName : undefined,
      hackathonTier: mouCategory === 'hackathon_sponsorship' ? mouHackathonTier : undefined,
      customTierName: mouCategory === 'hackathon_sponsorship' && mouHackathonTier === 'custom_tier' ? mouCustomTierName : undefined,
      deliverables: deliverablesList,
      boothRequired: mouBoothRequired,
      keynoteSlot: mouKeynoteSlot,
      judgeMentorSlot: mouJudgeMentorSlot,
      resumeAccess: mouResumeAccess,

      collegeName: mouCategory === 'college_society_session' ? mouCollegeName : undefined,
      societyName: mouCategory === 'college_society_session' ? mouSocietyName : undefined,
      facultyAdvisorName: mouCategory === 'college_society_session' ? mouFacultyAdvisor : undefined,
      sessionTopic: mouCategory === 'college_society_session' ? mouSessionTopic : undefined,
      customSessionTopic: mouCategory === 'college_society_session' && mouSessionTopic === 'custom_topic' ? mouCustomTopic : undefined,
      sessionMode: mouCategory === 'college_society_session' ? mouSessionMode : undefined,
      sessionDate: mouCategory === 'college_society_session' ? mouSessionDate : undefined,
      sessionTime: mouCategory === 'college_society_session' ? mouSessionTime : undefined,
      guaranteedAudience: mouCategory === 'college_society_session' ? (Number(mouGuaranteedAudience) || 140) : undefined,
      venueOrPlatform: mouCategory === 'college_society_session' ? mouVenueOrPlatform : undefined,

      customAgreementTitle: mouCategory === 'custom_agreement' ? mouCustomAgreementTitle : undefined,
      customPartnerType: mouCategory === 'custom_agreement' ? mouCustomPartnerType : undefined,
      customScopeOfWork: mouCategory === 'custom_agreement' ? mouCustomScopeOfWork : undefined,
    });

    setMous([newMou, ...mous]);
    setShowMouModal(false);
    setSelectedPreviewMou(newMou);
    showToast(`✓ MoU Draft Created: "${newMou.partnerOrganization}"`, `Ref: ${newMou.mouNumber || newMou.id}`);
  };

  // Helper: Open WhatsApp with Domain-Tailored Pitch
  const handleOpenWhatsApp = (lead: PrLead) => {
    if (!lead.phone) {
      alert('No phone number registered for this lead.');
      return;
    }
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    let pitchMsg = '';

    if (lead.leadCategory === 'college_society' || lead.type === 'college_society') {
      const topicLabel = lead.sessionTopic === 'custom_topic'
        ? (lead.customTopicName || 'Emerging Tech Masterclass')
        : lead.sessionTopic ? lead.sessionTopic.replace(/_/g, ' ').toUpperCase() : 'AI & Full-Stack Development';
      pitchMsg = `Hi ${lead.contactPerson}, this is ${currentUser.name} from Apna Engineering Wallah (AEW). We would love to collaborate with ${lead.societyName || 'your technical society'} at ${lead.collegeName || lead.organizationName} to host a free hands-on workshop on "${topicLabel}" for your engineering students. We provide senior industry mentors, live code exercises, and verified digital certificates at ₹0 cost to the college. Can we connect for a brief 5-min call to pick a suitable date?`;
    } else if (lead.leadCategory === 'hackathon_sponsor' || lead.type === 'hackathon_sponsor') {
      pitchMsg = `Hi ${lead.contactPerson}, this is ${currentUser.name} from Apna Engineering Wallah (AEW). We are hosting the flagship AEW National Hackathon 2026 (10,000+ top engineering student developers) and would love to invite ${lead.organizationName} as an official Brand & Track Sponsor. We offer dedicated problem statement tracks, keynote speaker slots, student resume access, and finale booth presence. May I share our sponsorship brochure & tier deck with you?`;
    } else {
      pitchMsg = `Hi ${lead.contactPerson}, this is ${currentUser.name} from Apna Engineering Wallah (AEW). Reaching out regarding an exciting student technical partnership and strategic collaboration with ${lead.organizationName}. May I share our official partnership deck?`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(pitchMsg)}`, '_blank');
  };

  // Helper: Quick prefill MoU from lead
  const handleDraftMouForLead = (lead: PrLead) => {
    const isCollegeSociety = lead.leadCategory === 'college_society' || lead.type === 'college_society';
    const isCustom = lead.leadCategory === 'custom_partnership' || lead.type === 'custom_partnership';

    if (isCollegeSociety) {
      setMouCategory('college_society_session');
      setMouCollegeName(lead.collegeName || lead.organizationName);
      setMouSocietyName(lead.societyName || 'Technical Society');
      setMouFacultyAdvisor(lead.facultyMentor || lead.contactPerson);
      setMouSessionTopic(lead.sessionTopic || 'ai_ml_agents');
      setMouCustomTopic(lead.customTopicName || '');
      setMouSessionMode(lead.sessionMode || 'offline_campus');
      setMouGuaranteedAudience(lead.expectedAudience || 140);
      setMouPartnerOrg(lead.societyName ? `${lead.societyName}, ${lead.collegeName || lead.organizationName}` : lead.organizationName);
      setMouSignatory(lead.contactPerson);
      setMouDesignation(lead.designation || 'Student Convener / Faculty In-Charge');
      setMouSponsorshipAmount(0);
      setMouPurpose(`Official Academic Collaboration for Hands-on Workshop on ${lead.customTopicName || lead.sessionTopic?.replace(/_/g, ' ').toUpperCase() || 'Emerging Tech'}`);
    } else if (isCustom) {
      setMouCategory('custom_agreement');
      setMouPartnerOrg(lead.organizationName);
      setMouSignatory(lead.contactPerson);
      setMouDesignation(lead.designation);
      setMouCustomAgreementTitle(lead.customPackageName ? `Strategic Partnership: ${lead.customPackageName}` : `Strategic Partnership Agreement with ${lead.organizationName}`);
      setMouSponsorshipAmount(lead.closedAmount || lead.expectedSponsorshipAmount || 0);
      setMouPurpose(`Strategic Collaboration & Student Community Outreach Agreement with ${lead.organizationName}`);
    } else {
      // Hackathon Sponsor
      setMouCategory('hackathon_sponsorship');
      setMouPartnerOrg(lead.organizationName);
      setMouSignatory(lead.contactPerson);
      setMouDesignation(lead.designation);
      setMouHackathonTier(lead.hackathonTier || 'track_challenge');
      setMouCustomTierName(lead.customPackageName || '');
      setMouSponsorshipAmount(lead.closedAmount || lead.expectedSponsorshipAmount || 50000);
      setMouPurpose(`AEW National Hackathon 2026 Official Sponsorship Agreement with ${lead.organizationName}`);
    }

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
          { id: 'pr_leads', label: `Leads Pipeline (${myLeads.length})`, icon: DollarSign },
          { id: 'pr_tasks', label: `Tasks & XP (${pendingTasks.length} to do)`, icon: CheckCircle2 },
          { id: 'pr_mou_maker', label: `MoU Agreements (${myMous.length})`, icon: FileText },
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
              <div className="text-2xl font-black text-white font-mono">{myLeads.length}</div>
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
                  View Pipeline ({myLeads.length}) →
                </button>
              </div>

              {myLeads.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-200">No Leads Yet</div>
                  <p className="text-xs text-slate-400">
                    Add sponsors, college fest conveners, or brand partners to track deals and earn commission.
                  </p>
                  <button
                    onClick={() => setShowAddLeadModal(true)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add First Lead
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myLeads.slice(0, 3).map((lead) => {
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
                                onClick={() => handleOpenWhatsApp(lead)}
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

            <div className="flex items-center gap-2">
              {isPrHead && (
                <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button
                    onClick={() => setPrHeadLeadViewMode('my_leads')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      prHeadLeadViewMode === 'my_leads' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    My Leads ({leads.filter(l => (l.internId || '').toUpperCase() === currentUser.teacherId.toUpperCase()).length})
                  </button>
                  <button
                    onClick={() => setPrHeadLeadViewMode('all_leads')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      prHeadLeadViewMode === 'all_leads' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Team Leads ({leads.length})
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Add New Lead
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="space-y-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            {/* Track / Stream Filter Selector */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1 no-scrollbar border-b border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Stream:</span>
              {[
                { id: 'all', label: `All Leads (${myLeads.length})`, icon: Layers },
                { id: 'hackathon_sponsor', label: `🏆 Hackathon Sponsors (${myLeads.filter(l => (l.leadCategory || l.type) === 'hackathon_sponsor').length})`, icon: Trophy },
                { id: 'college_society', label: `🎓 College Society Workshops (${myLeads.filter(l => (l.leadCategory || l.type) === 'college_society').length})`, icon: GraduationCap },
                { id: 'custom_partnership', label: `📝 Custom Partnerships (${myLeads.filter(l => (l.leadCategory || l.type) === 'custom_partnership').length})`, icon: Briefcase },
              ].map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => setLeadCategoryFilter(stream.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    leadCategoryFilter === stream.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{stream.label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
              {/* Stage filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs no-scrollbar">
                {[
                  { id: 'all', label: 'All Stages' },
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
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer text-[11px] ${
                      leadFilterStage === pill.id
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
                  placeholder="Search org, college, topic, POC..."
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Leads Grid */}
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-bold text-slate-200 text-sm">No Leads Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {leadSearchQuery || leadFilterStage !== 'all' || leadCategoryFilter !== 'all'
                  ? 'No leads matched your filter criteria.'
                  : 'Start by pitching brand sponsors for the hackathon or booking college society workshops.'}
              </p>
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Lead
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLeads.map((lead) => {
                const isWon = lead.stage === 'closed_won';
                const isLost = lead.stage === 'closed_lost';
                const isCollegeSociety = lead.leadCategory === 'college_society' || lead.type === 'college_society';
                const isCustom = lead.leadCategory === 'custom_partnership' || lead.type === 'custom_partnership';
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
                      {/* Header: Track Tag, Title & Stage Dropdown */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {isCollegeSociety ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> College Society Workshop
                              </span>
                            ) : isCustom ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> Custom Partner
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> Hackathon Sponsor
                              </span>
                            )}

                            {/* Specific Sub-badge */}
                            {isCollegeSociety && lead.sessionTopic && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {lead.sessionTopic === 'custom_topic' ? (lead.customTopicName || 'Custom Topic') : lead.sessionTopic.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            )}
                            {!isCollegeSociety && !isCustom && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {lead.hackathonTier === 'custom_tier' ? (lead.customPackageName || 'Custom Tier') : (lead.hackathonTier?.replace(/_/g, ' ').toUpperCase() || 'SPONSOR')}
                              </span>
                            )}
                            {isCustom && lead.customPackageName && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {lead.customPackageName}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-white">{lead.organizationName}</h3>
                        </div>

                        {/* Interactive Status Selector */}
                        <select
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead.id, e.target.value as PrLeadStage)}
                          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer shrink-0"
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
                        <div className="text-xs">
                          <span className="text-slate-400">POC: </span>
                          <strong className="text-slate-100">{lead.contactPerson}</strong>
                          <span className="text-slate-400"> ({lead.designation})</span>
                          {isCollegeSociety && lead.facultyMentor && (
                            <span className="block text-[11px] text-slate-400 mt-0.5">
                              Faculty Mentor: <strong className="text-slate-300">{lead.facultyMentor}</strong>
                            </span>
                          )}
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
                                onClick={() => handleOpenWhatsApp(lead)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-semibold text-[11px] flex items-center gap-1 border border-emerald-800/40 cursor-pointer"
                                title="Open Pre-drafted WhatsApp Pitch"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>WhatsApp Pitch</span>
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

                      {/* Domain Value Banner: Financial vs Audience Reach */}
                      {isCollegeSociety ? (
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                              Format & Mode
                            </span>
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1 mt-0.5">
                              {lead.sessionMode === 'offline_campus' ? '🏫 On-Campus Workshop' : lead.sessionMode === 'virtual_webinar' ? '🌐 Live Interactive Webinar' : '🔀 Hybrid'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                              Target Audience
                            </span>
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              👥 {lead.confirmedAudience || lead.expectedAudience || 140} Students
                            </span>
                            <span className="text-[10px] text-emerald-400/80 font-semibold block">Target: 130 – 155 batch (₹0 Barter)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                              {isWon ? 'Confirmed Sponsorship' : 'Expected Sponsorship'}
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
                      )}

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
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveLeadNotes(lead.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
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
                            {lead.notes ? `"${lead.notes}"` : 'Click to add follow-up notes or next steps...'}
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
                          className="text-purple-400 hover:text-purple-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Draft MoU
                        </button>

                        <button
                          onClick={() => handleDeleteLead(lead.id, lead.organizationName)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
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
                MoU Agreements & Legal Contracts
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate official Memorandums of Understanding for Hackathon Brand Sponsors, College Society Workshops, and Custom Strategic Partners.
              </p>
            </div>

            <button
              onClick={() => setShowMouModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Draft New MoU
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-2xl no-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Agreement Type:</span>
            {[
              { id: 'all', label: `All Agreements (${myMous.length})` },
              { id: 'hackathon_sponsorship', label: `🏆 Hackathon Brand MoUs (${myMous.filter(m => (m.mouCategory || 'hackathon_sponsorship') === 'hackathon_sponsorship').length})` },
              { id: 'college_society_session', label: `🎓 College Society MoUs (${myMous.filter(m => m.mouCategory === 'college_society_session').length})` },
              { id: 'custom_agreement', label: `📝 Custom Agreements (${myMous.filter(m => m.mouCategory === 'custom_agreement').length})` },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setMouCategoryFilter(pill.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs ${
                  mouCategoryFilter === pill.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* List of Mous */}
          {filteredMous.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-200">No MoUs Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {mouCategoryFilter !== 'all'
                  ? 'No MoUs matched the selected category filter.'
                  : 'Once you close a deal or finalize a college workshop, generate an official legal MoU draft here.'}
              </p>
              <button
                onClick={() => setShowMouModal(true)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
              >
                + Draft New MoU
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMous.map((mou) => {
                const isSociety = mou.mouCategory === 'college_society_session';
                const isCustom = mou.mouCategory === 'custom_agreement';
                return (
                  <div
                    key={mou.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {isSociety ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> College Society Workshop MoU
                              </span>
                            ) : isCustom ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> Custom Strategic MoU
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> Hackathon Sponsorship Agreement
                              </span>
                            )}

                            {isSociety && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {mou.sessionTopic === 'custom_topic' ? (mou.customSessionTopic || 'Custom Workshop') : mou.sessionTopic?.replace(/_/g, ' ').toUpperCase() || 'TECH WORKSHOP'}
                              </span>
                            )}
                            {!isSociety && !isCustom && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {mou.hackathonTier === 'custom_tier' ? (mou.customTierName || 'Custom Tier') : (mou.hackathonTier?.replace(/_/g, ' ').toUpperCase() || 'TIER SPONSOR')}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-base text-white">{mou.partnerOrganization}</h4>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          mou.status === 'approved' || mou.status === 'signed'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : mou.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}>
                          {mou.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300">
                        Signatory: <strong>{mou.partnerSignatory}</strong> ({mou.partnerDesignation})
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-2">Scope / Objective: {mou.purpose}</div>

                      {/* Domain Banner */}
                      {isSociety ? (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block uppercase font-bold">Delivery Format</span>
                            <span className="font-bold text-amber-300">
                              {mou.sessionMode === 'offline_campus' ? '🏫 On-Campus' : mou.sessionMode === 'virtual_webinar' ? '🌐 Live Webinar' : '🔀 Hybrid'} • 👥 {mou.guaranteedAudience || 150}+ Students
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block uppercase font-bold">Commercials</span>
                            <strong className="text-emerald-400 font-mono text-xs">
                              ₹0 Academic Barter
                            </strong>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Agreed Commercial Consideration:</span>
                          <strong className="text-emerald-400 font-mono text-sm">
                            ₹{(mou.sponsorshipAmount || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px] font-mono">{mou.mouNumber || mou.id}</span>
                      <button
                        onClick={() => setSelectedPreviewMou(mou)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-400" /> View / Print Formal Contract
                      </button>
                    </div>
                  </div>
                );
              })}
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
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" /> Register Outreach Lead
                </h3>
                <p className="text-[11px] text-slate-400">Select whether this is for Hackathon Sponsorship, a College Society Session, or a Custom Partnership.</p>
              </div>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3-Way Track Selector */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLeadCategory('hackathon_sponsor');
                  setLeadExpectedAmount(50000);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                  leadCategory === 'hackathon_sponsor'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span className="text-[11px]">🏆 Hackathon Brand</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLeadCategory('college_society');
                  setLeadExpectedAmount(0);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                  leadCategory === 'college_society'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="text-[11px]">🎓 College Society</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLeadCategory('custom_partnership');
                  setLeadExpectedAmount(25000);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                  leadCategory === 'custom_partnership'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-[11px]">📝 Custom Lead</span>
              </button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-3.5 text-xs">
              {/* TRACK 1: HACKATHON BRAND SPONSOR FORM */}
              {leadCategory === 'hackathon_sponsor' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Sponsoring Brand / Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GitHub, Red Bull, Postman, AWS"
                        value={leadOrgName}
                        onChange={(e) => setLeadOrgName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Company Industry</label>
                      <select
                        value={leadCompanyIndustry}
                        onChange={(e) => setLeadCompanyIndustry(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Developer Tools / Cloud">Developer Tools / Cloud</option>
                        <option value="FinTech & Web3">FinTech & Web3</option>
                        <option value="AI & Machine Learning">AI & Machine Learning</option>
                        <option value="Beverages & FMCG">Beverages & FMCG (Red Bull, Monster)</option>
                        <option value="EdTech / Upskilling">EdTech / Upskilling</option>
                        <option value="Hardware & Robotics">Hardware & Robotics</option>
                        <option value="Other Industry">Other Industry</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Hackathon Sponsorship Tier</label>
                      <select
                        value={leadHackathonTier}
                        onChange={(e) => {
                          const val = e.target.value as HackathonSponsorTier;
                          setLeadHackathonTier(val);
                          if (val === 'title_partner') setLeadExpectedAmount(150000);
                          else if (val === 'powered_by') setLeadExpectedAmount(80000);
                          else if (val === 'track_challenge') setLeadExpectedAmount(35000);
                          else if (val === 'swag_beverage_perks') setLeadExpectedAmount(15000);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="title_partner">🏆 Title Partner (₹1,50,000+)</option>
                        <option value="powered_by">⚡ Powered By Partner (₹75k - ₹1L)</option>
                        <option value="track_challenge">🎯 Track Challenge Sponsor (₹30k - ₹50k)</option>
                        <option value="swag_beverage_perks">🎁 In-Kind / Swag / Beverage Partner</option>
                        <option value="custom_tier">✨ Custom Brand Tier (Custom Package)</option>
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* CUSTOM TIER INPUT (Shown when custom_tier is chosen) */}
                  {leadHackathonTier === 'custom_tier' && (
                    <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1 animate-in fade-in">
                      <label className="block text-indigo-200 font-bold mb-1">
                        Custom Brand Tier Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Diversity & Inclusion Track Partner / Cloud Infrastructure Sponsor"
                        value={leadCustomPackageName}
                        onChange={(e) => setLeadCustomPackageName(e.target.value)}
                        className="w-full bg-slate-950 border border-indigo-400/50 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-400"
                      />
                      <span className="text-[10px] text-indigo-300 block">Give this custom sponsorship package a clear, distinctive name.</span>
                    </div>
                  )}
                </>
              )}

              {/* TRACK 2: COLLEGE SOCIETY WORKSHOP FORM */}
              {leadCategory === 'college_society' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        College / University Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DTU Delhi / IIT Roorkee / VIT Vellore"
                        value={leadCollegeName}
                        onChange={(e) => setLeadCollegeName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Technical Society / Club Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ACM Student Chapter, GDSC, IEEE, E-Cell"
                        value={leadSocietyName}
                        onChange={(e) => setLeadSocietyName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Workshop / Session Topic</label>
                      <select
                        value={leadSessionTopic}
                        onChange={(e) => setLeadSessionTopic(e.target.value as CollegeSessionTopic)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="ai_ml_agents">🤖 Generative AI & Autonomous AI Agents</option>
                        <option value="fullstack_web_dev">💻 Full-Stack Web Dev & Modern Next.js</option>
                        <option value="dsa_problem_solving">⚡ DSA & FAANG Interview Mastery</option>
                        <option value="gate_placements_roadmap">🎯 Tech Placements & Career Roadmap</option>
                        <option value="hackathon_orientation">🏆 How to Win National Hackathons</option>
                        <option value="custom_topic">✨ Custom Workshop Topic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Delivery Mode</label>
                      <select
                        value={leadSessionMode}
                        onChange={(e) => setLeadSessionMode(e.target.value as CollegeSessionMode)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="offline_campus">🏫 Offline On-Campus Auditorium</option>
                        <option value="virtual_webinar">🌐 Live Interactive Webinar</option>
                        <option value="hybrid">🔀 Hybrid (Live Broadcast + Onsite)</option>
                      </select>
                    </div>
                  </div>

                  {/* CUSTOM WORKSHOP TOPIC INPUT */}
                  {leadSessionTopic === 'custom_topic' && (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl space-y-1 animate-in fade-in">
                      <label className="block text-amber-200 font-bold mb-1">
                        Custom Workshop Topic Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cybersecurity Red Teaming & Bug Bounty / DevOps with Docker & K8s"
                        value={leadCustomTopicName}
                        onChange={(e) => setLeadCustomTopicName(e.target.value)}
                        className="w-full bg-slate-950 border border-amber-400/50 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-300 font-semibold">Expected Student Audience</label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Target: 130 – 155
                        </span>
                      </div>
                      <input
                        type="number"
                        min={100}
                        max={300}
                        step={5}
                        placeholder="140 (130 - 155 students)"
                        value={leadExpectedAudience}
                        onChange={(e) => setLeadExpectedAudience(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        College workshop batch size should be near <strong>130 to 155 students</strong>.
                      </p>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Target Date (Optional)</label>
                      <input
                        type="date"
                        value={leadTargetDate}
                        onChange={(e) => setLeadTargetDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TRACK 3: CUSTOM STRATEGIC LEAD */}
              {leadCategory === 'custom_partnership' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Partner Organization / Entity Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GDG Chandigarh / Devpost Community"
                        value={leadOrgName}
                        onChange={(e) => setLeadOrgName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Custom Partnership Scope / Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Regional Hackathon Outreach Co-Host"
                        value={leadCustomTypeTitle}
                        onChange={(e) => setLeadCustomTypeTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Expected Financial Consideration (₹, if any)</label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={leadExpectedAmount}
                      onChange={(e) => setLeadExpectedAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              {/* CONTACT DETAILS (Shared across all tracks) */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                  Primary Point of Contact (Who they are)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Contact Person Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={leadContactPerson}
                      onChange={(e) => setLeadContactPerson(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Designation / Role</label>
                    <input
                      type="text"
                      placeholder={leadCategory === 'college_society' ? 'Society President / Student Secretary' : 'Brand Manager / Sponsorship Lead'}
                      value={leadDesignation}
                      onChange={(e) => setLeadDesignation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="contact@lead.com"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {leadCategory === 'college_society' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Faculty Mentor / Advisor Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Sunita Rao, Head of Computer Science"
                      value={leadFacultyMentor}
                      onChange={(e) => setLeadFacultyMentor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Conversation Notes / Next Actions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Spoke over WhatsApp. Sent brochure and awaiting meeting on Thursday."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-lg shadow-emerald-600/20"
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
      {/* ─── MODAL 3: MOU DRAFTING FORM (MULTI-TRACK & CUSTOM OPTIONS) ───── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showMouModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Draft Formal MoU Agreement
                </h3>
                <p className="text-[11px] text-slate-400">Select agreement type to generate a tailored legal document with custom clauses.</p>
              </div>
              <button
                onClick={() => setShowMouModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3-Way MoU Track Selector */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMouCategory('hackathon_sponsorship');
                  setMouPurpose(`${mouHackathonName} Brand Sponsorship & Engagement Agreement`);
                  setMouSponsorshipAmount(50000);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                  mouCategory === 'hackathon_sponsorship'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span className="text-[11px]">🏆 Hackathon Sponsor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMouCategory('college_society_session');
                  setMouPurpose(`Academic Workshop Collaboration on ${mouSessionTopic === 'custom_topic' ? (mouCustomTopic || 'Advanced Tech') : mouSessionTopic.replace(/_/g, ' ').toUpperCase()}`);
                  setMouSponsorshipAmount(0);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                  mouCategory === 'college_society_session'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="text-[11px]">🎓 College Society</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMouCategory('custom_agreement');
                  setMouPurpose(mouCustomAgreementTitle);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                  mouCategory === 'custom_agreement'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-[11px]">📝 Custom Agreement</span>
              </button>
            </div>

            <form onSubmit={handleCreateMou} className="space-y-3.5 text-xs">
              {/* TRACK 1: HACKATHON SPONSORSHIP CONTRACT FIELDS */}
              {mouCategory === 'hackathon_sponsorship' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Hackathon Event Name</label>
                      <input
                        type="text"
                        required
                        value={mouHackathonName}
                        onChange={(e) => setMouHackathonName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Partner Brand / Company *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GitHub India / Red Bull"
                        value={mouPartnerOrg}
                        onChange={(e) => setMouPartnerOrg(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Sponsorship Tier</label>
                      <select
                        value={mouHackathonTier}
                        onChange={(e) => {
                          const val = e.target.value as HackathonSponsorTier;
                          setMouHackathonTier(val);
                          if (val === 'title_partner') setMouSponsorshipAmount(150000);
                          else if (val === 'powered_by') setMouSponsorshipAmount(80000);
                          else if (val === 'track_challenge') setMouSponsorshipAmount(35000);
                          else if (val === 'swag_beverage_perks') setMouSponsorshipAmount(15000);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="title_partner">🏆 Title Partner (₹1,50,000+)</option>
                        <option value="powered_by">⚡ Powered By Partner (₹75k - ₹1L)</option>
                        <option value="track_challenge">🎯 Track Challenge Sponsor (₹30k - ₹50k)</option>
                        <option value="swag_beverage_perks">🎁 In-Kind / Swag / Beverage Partner</option>
                        <option value="custom_tier">✨ Custom Brand Tier</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Agreed Sponsorship Amount (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={mouSponsorshipAmount}
                        onChange={(e) => setMouSponsorshipAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* CUSTOM TIER INPUT */}
                  {mouHackathonTier === 'custom_tier' && (
                    <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1 animate-in fade-in">
                      <label className="block text-indigo-200 font-bold mb-1">Custom Brand Tier Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Official Cloud Infrastructure Partner"
                        value={mouCustomTierName}
                        onChange={(e) => setMouCustomTierName(e.target.value)}
                        className="w-full bg-slate-950 border border-indigo-400/50 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  )}

                  {/* Hackathon Deliverables Checkboxes */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                      Promised Deliverables Included in Contract
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mouBoothRequired}
                          onChange={(e) => setMouBoothRequired(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span>Physical Booth / Desk at Finale</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mouKeynoteSlot}
                          onChange={(e) => setMouKeynoteSlot(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span>15-min Keynote / Opening Slot</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mouJudgeMentorSlot}
                          onChange={(e) => setMouJudgeMentorSlot(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span>Jury / Mentor Panel Seat</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mouResumeAccess}
                          onChange={(e) => setMouResumeAccess(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span>Access to Developer Resume Book</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* TRACK 2: COLLEGE SOCIETY WORKSHOP MOU FIELDS */}
              {mouCategory === 'college_society_session' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">College / University Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DTU Delhi / IIT Roorkee"
                        value={mouCollegeName}
                        onChange={(e) => setMouCollegeName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Technical Society / Club Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ACM Student Chapter, GDSC, IEEE"
                        value={mouSocietyName}
                        onChange={(e) => setMouSocietyName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Workshop / Session Topic</label>
                      <select
                        value={mouSessionTopic}
                        onChange={(e) => setMouSessionTopic(e.target.value as CollegeSessionTopic)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="ai_ml_agents">🤖 Generative AI & Autonomous AI Agents</option>
                        <option value="fullstack_web_dev">💻 Full-Stack Web Dev & Modern Next.js</option>
                        <option value="dsa_problem_solving">⚡ DSA & FAANG Interview Mastery</option>
                        <option value="gate_placements_roadmap">🎯 Tech Placements & Career Roadmap</option>
                        <option value="hackathon_orientation">🏆 How to Win National Hackathons</option>
                        <option value="custom_topic">✨ Custom Workshop Topic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Delivery Mode</label>
                      <select
                        value={mouSessionMode}
                        onChange={(e) => setMouSessionMode(e.target.value as CollegeSessionMode)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="offline_campus">🏫 Offline On-Campus Auditorium</option>
                        <option value="virtual_webinar">🌐 Live Interactive Webinar</option>
                        <option value="hybrid">🔀 Hybrid Mode</option>
                      </select>
                    </div>
                  </div>

                  {/* CUSTOM WORKSHOP TOPIC INPUT */}
                  {mouSessionTopic === 'custom_topic' && (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl space-y-1 animate-in fade-in">
                      <label className="block text-amber-200 font-bold mb-1">Custom Workshop Topic Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cybersecurity Red Teaming & Bug Bounty / DevOps Masterclass"
                        value={mouCustomTopic}
                        onChange={(e) => setMouCustomTopic(e.target.value)}
                        className="w-full bg-slate-950 border border-amber-400/50 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-300 font-semibold">Guaranteed Student Attendance *</label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          130 – 155 Target
                        </span>
                      </div>
                      <input
                        type="number"
                        min={100}
                        max={300}
                        step={5}
                        required
                        placeholder="140"
                        value={mouGuaranteedAudience}
                        onChange={(e) => setMouGuaranteedAudience(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Committed audience batch must be near <strong>130 to 155 students</strong>.
                      </p>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Venue / Platform</label>
                      <input
                        type="text"
                        value={mouVenueOrPlatform}
                        onChange={(e) => setMouVenueOrPlatform(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Session Date</label>
                      <input
                        type="date"
                        value={mouSessionDate}
                        onChange={(e) => setMouSessionDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Time Slot</label>
                      <input
                        type="text"
                        placeholder="11:00 AM - 1:00 PM"
                        value={mouSessionTime}
                        onChange={(e) => setMouSessionTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TRACK 3: CUSTOM STRATEGIC AGREEMENT FIELDS */}
              {mouCategory === 'custom_agreement' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Custom Agreement Title *</label>
                      <input
                        type="text"
                        required
                        value={mouCustomAgreementTitle}
                        onChange={(e) => setMouCustomAgreementTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Partner Organization *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Indian Developers Guild"
                        value={mouPartnerOrg}
                        onChange={(e) => setMouPartnerOrg(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Partner Type / Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Strategic Talent & Community Partner"
                        value={mouCustomPartnerType}
                        onChange={(e) => setMouCustomPartnerType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Commercial Value (₹, if any)</label>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={mouSponsorshipAmount}
                        onChange={(e) => setMouSponsorshipAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Custom Scope of Work & Terms</label>
                    <textarea
                      rows={2}
                      value={mouCustomScopeOfWork}
                      onChange={(e) => setMouCustomScopeOfWork(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              {/* SIGNATORY & ADDRESS DETAILS (Shared) */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                  Partner Signatory & Legal Premises
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Signatory Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Ramesh Kumar / Ananya Sen"
                      value={mouSignatory}
                      onChange={(e) => setMouSignatory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Designation</label>
                    <input
                      type="text"
                      placeholder={mouCategory === 'college_society_session' ? 'Faculty Advisor / Convener' : 'Director / VP of Marketing'}
                      value={mouDesignation}
                      onChange={(e) => setMouDesignation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Partner Premises / Office Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Campus / Tech Park, Bangalore"
                    value={mouAddress}
                    onChange={(e) => setMouAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* DATES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Agreement Start Date</label>
                  <input
                    type="date"
                    value={mouStartDate}
                    onChange={(e) => setMouStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Agreement Valid Till</label>
                  <input
                    type="date"
                    value={mouEndDate}
                    onChange={(e) => setMouEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Custom Legal Clauses (1 per line)</label>
                <textarea
                  rows={2}
                  value={mouCustomTerms}
                  onChange={(e) => setMouCustomTerms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-lg shadow-purple-600/20"
                >
                  Generate Formal MoU Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODAL 4: PRINTABLE MOU PREVIEW (3 DISTINCT LAYOUTS) ─────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedPreviewMou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto font-serif">

            {/* Close Button Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 font-sans">
              <span className="text-xs font-mono font-bold text-slate-500">
                Reference: <strong className="text-indigo-700">{selectedPreviewMou.mouNumber || selectedPreviewMou.id}</strong>
              </span>
              <button
                onClick={() => setSelectedPreviewMou(null)}
                className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ─── TEMPLATE 1: HACKATHON BRAND SPONSORSHIP CONTRACT ─── */}
            {(selectedPreviewMou.mouCategory === 'hackathon_sponsorship' || (!selectedPreviewMou.mouCategory && selectedPreviewMou.sponsorshipAmount && selectedPreviewMou.sponsorshipAmount > 0)) && (
              <div className="space-y-5">
                {/* Official Letterhead */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <div className="inline-block px-3 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-sans font-black uppercase tracking-wider mb-1">
                    {selectedPreviewMou.hackathonName || 'AEW National Hackathon 2026'}
                  </div>
                  <h2 className="text-xl md:text-2xl font-black font-sans uppercase tracking-tight text-slate-900 mt-1">
                    BRAND SPONSORSHIP & PARTNERSHIP AGREEMENT
                  </h2>
                  <p className="text-xs text-slate-600 font-sans mt-0.5">
                    Tier: <strong className="text-slate-900">{selectedPreviewMou.customTierName || (selectedPreviewMou.hackathonTier ? selectedPreviewMou.hackathonTier.replace(/_/g, ' ').toUpperCase() : 'SPONSOR')}</strong> • Effective: {selectedPreviewMou.startDate} to {selectedPreviewMou.endDate}
                  </p>
                </div>

                {/* Parties */}
                <div className="text-xs leading-relaxed space-y-2.5">
                  <p>
                    This Formal Sponsorship Agreement is executed between:
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-sans text-xs">
                    <div>
                      <strong className="text-indigo-900">PARTY 1: APNA ENGINEERING WALLAH (AEW)</strong>, having its principal operational headquarters in New Delhi, India (hereinafter referred to as the <em>"Host Organizers"</em>).
                    </div>
                    <div>
                      <strong className="text-indigo-900">PARTY 2: {selectedPreviewMou.partnerOrganization.toUpperCase()}</strong>, represented by <strong>{selectedPreviewMou.partnerSignatory}</strong> ({selectedPreviewMou.partnerDesignation}), having offices at {selectedPreviewMou.partnerAddress || 'Registered Office'} (hereinafter referred to as the <em>"Sponsoring Partner"</em>).
                    </div>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">1. Sponsorship Commercial Consideration:</h4>
                    <p className="text-slate-700">
                      The Sponsoring Partner agrees to provide a commercial sponsorship consideration of <strong>₹{(selectedPreviewMou.sponsorshipAmount || 0).toLocaleString('en-IN')} (Indian Rupees)</strong> in exchange for official hackathon branding, talent engagement, and promotional deliverables.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">2. Guaranteed Deliverables & Privileges:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700 font-sans text-[11px]">
                      {selectedPreviewMou.deliverables && selectedPreviewMou.deliverables.length > 0 ? (
                        selectedPreviewMou.deliverables.map((item, i) => <li key={i}>{item}</li>)
                      ) : (
                        <>
                          <li>Official {selectedPreviewMou.customTierName || selectedPreviewMou.hackathonTier || 'Brand'} logo placement on hackathon website, Devfolio portal, and live broadcast stream.</li>
                          {selectedPreviewMou.boothRequired && <li>Allotment of prime physical interactive booth / desk during the Grand Finale arena.</li>}
                          {selectedPreviewMou.keynoteSlot && <li>15-Minute Keynote address slot during Opening / Inaugural Ceremony.</li>}
                          {selectedPreviewMou.judgeMentorSlot && <li>Seat on official Grand Finale Jury and Mentor Evaluation panel.</li>}
                          {selectedPreviewMou.resumeAccess && <li>Exclusive access to participant resume book for engineering talent recruitment.</li>}
                        </>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">3. Covenants & General Terms:</h4>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-700 font-sans text-[11px]">
                      {selectedPreviewMou.terms.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TEMPLATE 2: COLLEGE SOCIETY WORKSHOP COLLABORATION MOU ─── */}
            {selectedPreviewMou.mouCategory === 'college_society_session' && (
              <div className="space-y-5">
                {/* Academic Outreach Letterhead */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <div className="inline-block px-3 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-sans font-black uppercase tracking-wider mb-1">
                    Academic Outreach & Technical Upskilling Initiative
                  </div>
                  <h2 className="text-xl md:text-2xl font-black font-sans uppercase tracking-tight text-slate-900 mt-1">
                    MEMORANDUM OF UNDERSTANDING (ACADEMIC BARTER)
                  </h2>
                  <p className="text-xs text-slate-600 font-sans mt-0.5">
                    Collaboration with <strong className="text-slate-900">{selectedPreviewMou.societyName || 'Technical Society'}</strong> • {selectedPreviewMou.collegeName || selectedPreviewMou.partnerOrganization}
                  </p>
                </div>

                {/* Parties */}
                <div className="text-xs leading-relaxed space-y-2.5">
                  <p>
                    This Memorandum of Understanding (MoU) is entered between:
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-sans text-xs">
                    <div>
                      <strong className="text-indigo-900">PARTY 1: APNA ENGINEERING WALLAH (AEW)</strong>, an engineering education and upskilling organization dedicated to hands-on practical training.
                    </div>
                    <div>
                      <strong className="text-indigo-900">PARTY 2: {selectedPreviewMou.societyName ? selectedPreviewMou.societyName.toUpperCase() : 'TECHNICAL SOCIETY'}</strong> of <strong>{(selectedPreviewMou.collegeName || selectedPreviewMou.partnerOrganization).toUpperCase()}</strong>, represented by <strong>{selectedPreviewMou.partnerSignatory}</strong> ({selectedPreviewMou.partnerDesignation}).
                    </div>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">1. Technical Workshop Details:</h4>
                    <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1 font-sans text-[11px]">
                      <div><strong>Workshop Topic:</strong> {selectedPreviewMou.customSessionTopic || selectedPreviewMou.sessionTopic?.replace(/_/g, ' ').toUpperCase() || 'Advanced AI & Engineering Masterclass'}</div>
                      <div><strong>Delivery Mode:</strong> {selectedPreviewMou.sessionMode === 'offline_campus' ? 'Offline On-Campus Auditorium' : selectedPreviewMou.sessionMode === 'virtual_webinar' ? 'Live Interactive Webinar' : 'Hybrid Session'}</div>
                      <div><strong>Guaranteed Minimum Attendance:</strong> {selectedPreviewMou.guaranteedAudience || 140} Registered Engineering Students (130–155 target range)</div>
                      <div><strong>Scheduled Date & Slot:</strong> {selectedPreviewMou.sessionDate || selectedPreviewMou.startDate} • {selectedPreviewMou.sessionTime || '11:00 AM - 1:00 PM'}</div>
                      <div><strong>Venue / Platform:</strong> {selectedPreviewMou.venueOrPlatform || 'College Main Auditorium / Online Platform'}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">2. Financial Terms:</h4>
                    <p className="text-slate-700">
                      This collaboration is undertaken as a <strong>Zero-Fee (₹0) Academic Knowledge Barter</strong>. Neither party shall invoice or charge students or each other any consideration. AEW provides mentors and syllabus curriculum free of cost.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">3. Responsibilities of Parties:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700 font-sans text-[11px]">
                      <li>AEW shall deploy experienced senior industry instructors to deliver comprehensive live hands-on instruction.</li>
                      <li>AEW shall issue verified digital certificates of completion to all registered student attendees.</li>
                      <li>The Society / College shall provide the auditorium venue, audio-visual system, and active campus publicity.</li>
                      <li>The Society coordinators commit to ensuring the minimum guaranteed attendance of {selectedPreviewMou.guaranteedAudience || 140} students (target batch: 130–155).</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">4. Agreed Clauses:</h4>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-700 font-sans text-[11px]">
                      {selectedPreviewMou.terms.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TEMPLATE 3: CUSTOM STRATEGIC AGREEMENT ─── */}
            {selectedPreviewMou.mouCategory === 'custom_agreement' && (
              <div className="space-y-5">
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <div className="inline-block px-3 py-1 rounded bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-sans font-black uppercase tracking-wider mb-1">
                    {selectedPreviewMou.customPartnerType || 'Strategic Partnership Instrument'}
                  </div>
                  <h2 className="text-xl md:text-2xl font-black font-sans uppercase tracking-tight text-slate-900 mt-1">
                    {selectedPreviewMou.customAgreementTitle || 'MEMORANDUM OF UNDERSTANDING'}
                  </h2>
                  <p className="text-xs text-slate-600 font-sans mt-0.5">
                    Valid: {selectedPreviewMou.startDate} through {selectedPreviewMou.endDate}
                  </p>
                </div>

                <div className="text-xs leading-relaxed space-y-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-sans text-xs">
                    <div><strong>Party 1:</strong> Apna Engineering Wallah (AEW)</div>
                    <div><strong>Party 2:</strong> {selectedPreviewMou.partnerOrganization} ({selectedPreviewMou.partnerSignatory}, {selectedPreviewMou.partnerDesignation})</div>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">Scope of Collaboration:</h4>
                    <p className="text-slate-700">{selectedPreviewMou.customScopeOfWork || selectedPreviewMou.purpose}</p>
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-slate-900 uppercase tracking-wide text-xs mb-1">Terms & Conditions:</h4>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-700 font-sans text-[11px]">
                      {selectedPreviewMou.terms.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures & Verification Seal (Shared across all 3 layouts) */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-6 text-xs font-sans">
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-4">For Apna Engineering Wallah (AEW)</span>
                <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold mb-2 bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedPreviewMou.status === 'approved' || selectedPreviewMou.status === 'signed' ? 'DIGITALLY VERIFIED & SEALED' : 'AWAITING ADMIN APPROVAL'}
                </div>
                <span className="block font-bold text-slate-900">Dr. Vivek Sharma</span>
                <span className="text-[10px] text-slate-500">Director of Academic & Outreach Operations</span>
              </div>

              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-4">For {selectedPreviewMou.partnerOrganization}</span>
                <div className="h-4" />
                <span className="block font-bold text-slate-900">{selectedPreviewMou.partnerSignatory}</span>
                <span className="text-[10px] text-slate-500">{selectedPreviewMou.partnerDesignation}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
              <div className="text-[11px] text-slate-500">
                Prepared by PR Representative: <strong>{selectedPreviewMou.internName}</strong> ({selectedPreviewMou.internId})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Printer className="w-4 h-4" /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setSelectedPreviewMou(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
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
