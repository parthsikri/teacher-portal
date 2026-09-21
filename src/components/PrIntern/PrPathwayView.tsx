import React, { useState, useMemo, useEffect } from 'react';
import type { User, PrTask, PrTier, PrTaskCategory } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Award, Star, Sparkles, CheckCircle2, Lock, ArrowUpRight,
  TrendingUp, Compass, Flag, Copy, Check, Flame, Crown, X
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PrPathwayViewProps {
  intern: User;
  onRefreshUser?: () => void;
  onPageChange: (page: string) => void;
}

export interface PathwayMission {
  id: string;
  stageNumber: number;
  tier: PrTier;
  title: string;
  subtitle: string;
  description: string;
  category: 'college_outreach' | 'corporate_sponsorship' | 'mou_negotiation' | 'brand_collaboration' | 'event_marketing' | 'general';
  pointsReward: number;
  starsReward: number;
  elevationMeters: number;
  deliverablePrompt: string;
  guidelines: string[];
  recommendedPitchTemplate?: string;
  iconName: string;
}

export const PATHWAY_MISSIONS: PathwayMission[] = [
  // ─── ZONE 1: 🥈 SILVER FOOTHILLS (Base Level - 3.3% Commission) ───────────
  {
    id: 'pr-pw-1',
    stageNumber: 1,
    tier: 'Silver',
    title: 'Campus Outreach Onboarding & Pitch Deck Mastery',
    subtitle: 'Review Sponsorship Deck & Setup Outreach Kit',
    description: 'Familiarize yourself with the official AEW Tech Summit & Hackathon Sponsorship Proposal Deck, corporate sponsor tier privileges, and outreach messaging standards.',
    category: 'college_outreach',
    pointsReward: 25,
    starsReward: 1,
    elevationMeters: 25,
    deliverablePrompt: 'Confirm review of the sponsor deck and paste your custom outreach pitch link or notes.',
    guidelines: [
      'Download and review the 16:9 AEW Corporate Partnership Deck.',
      'Identify the 3 key value propositions: Brand Visibility, Keynote Slots, and Direct Student Recruitment.',
      'Save your personalized outreach WhatsApp and Email templates.'
    ],
    recommendedPitchTemplate: 'Subject: Exclusive Corporate Sponsorship & Campus Talent Partnership — AEW National Tech Summit 2026\n\nDear [Partner Name],\n\nI am writing from Apna Engineering Wallah (AEW) to invite [Company] as our official Title/Powered-By sponsor for the upcoming National Student Tech Summit & Hackathon 2026...',
    iconName: 'Compass'
  },
  {
    id: 'pr-pw-2',
    stageNumber: 2,
    tier: 'Silver',
    title: 'Prospect Discovery & Target Pipeline Building',
    subtitle: 'Identify 5 High-Potential Corporate Brands',
    description: 'Research and curate 5 tech companies, coding platforms, or developer tools companies looking for campus mindshare. Add them to your active PR Lead Pipeline.',
    category: 'corporate_sponsorship',
    pointsReward: 35,
    starsReward: 1,
    elevationMeters: 55,
    deliverablePrompt: 'Enter the company names and contact details of the 5 prospective brands you identified.',
    guidelines: [
      'Focus on dev tools, ed-tech, fintech, and hiring platforms.',
      'Locate Marketing Heads, Campus Relations Directors, or Developer Relations Leads on LinkedIn.',
      'Verify valid business email addresses or WhatsApp contacts.'
    ],
    iconName: 'Building2'
  },
  {
    id: 'pr-pw-3',
    stageNumber: 3,
    tier: 'Silver',
    title: 'First-Touch WhatsApp & Email Outreach Sprint',
    subtitle: 'Dispatch 3 Official Sponsor Proposals',
    description: 'Send personalized partnership proposals to at least 3 qualified corporate leads using our official AEW pitch templates and track responses.',
    category: 'brand_collaboration',
    pointsReward: 40,
    starsReward: 2,
    elevationMeters: 85,
    deliverablePrompt: 'Paste screenshot link or brief confirmation of the 3 sent proposals.',
    guidelines: [
      'Personalize the first paragraph for the specific company product.',
      'Highlight the 5,000+ targeted engineering student attendees.',
      'Include a direct link to the AEW Hackathon event website.'
    ],
    iconName: 'Send'
  },
  {
    id: 'pr-pw-4',
    stageNumber: 4,
    tier: 'Silver',
    title: 'Silver Apex Milestone: First Formal MoU Framework',
    subtitle: 'Prepare Initial MoU Draft & Claim Gold Gateway',
    description: 'Generate a structured sponsorship MoU draft for a ₹25,000+ event sponsor using the built-in MoU Generator and submit it for validation.',
    category: 'mou_negotiation',
    pointsReward: 50,
    starsReward: 2,
    elevationMeters: 120,
    deliverablePrompt: 'Link your generated MoU draft or enter the agreed sponsorship scope.',
    guidelines: [
      'Ensure clear financial disbursement terms (50% advance / 50% post-event).',
      'Verify partner legal name, registered address, and authorized signatory.',
      'Include sponsor logo display commitments.'
    ],
    iconName: 'FileText'
  },

  // ─── ZONE 2: 🥇 GOLD RIDGE (Growth Level - 7.0% Commission) ──────────────
  {
    id: 'pr-pw-5',
    stageNumber: 5,
    tier: 'Gold',
    title: 'Sponsor Stakeholder Pitch Meeting',
    subtitle: 'Lead Virtual Demo or Discovery Call',
    description: 'Coordinate and conduct a discovery video call with a prospective corporate sponsor to present branding tier options and negotiate scope.',
    category: 'corporate_sponsorship',
    pointsReward: 50,
    starsReward: 2,
    elevationMeters: 160,
    deliverablePrompt: 'Provide call minutes, meeting date, and key sponsor requirements.',
    guidelines: [
      'Present the Gold tier package with 45-min workshop slot.',
      'Discuss custom banner placements and student engagement sessions.',
      'Send immediate follow-up summary within 2 hours.'
    ],
    iconName: 'TrendingUp'
  },
  {
    id: 'pr-pw-6',
    stageNumber: 6,
    tier: 'Gold',
    title: 'MoU Customization & Legal Clause Alignment',
    subtitle: 'Refine Deliverables & Payment Milestones',
    description: 'Customize sponsor clauses (recruitment resume database access, hackathon judging seat, and exhibition booth) in consultation with AEW Operations.',
    category: 'mou_negotiation',
    pointsReward: 65,
    starsReward: 3,
    elevationMeters: 205,
    deliverablePrompt: 'Paste the finalized MoU reference number or agreed clause summary.',
    guidelines: [
      'Ensure standard indemnification and intellectual property safety.',
      'Confirm logo asset specifications (SVG/high-res PNG).',
      'Schedule date for official counter-signature.'
    ],
    iconName: 'ShieldCheck'
  },
  {
    id: 'pr-pw-7',
    stageNumber: 7,
    tier: 'Gold',
    title: 'Deal Closure & Revenue Inflow (₹50,000+)',
    subtitle: 'Close-Won Event Sponsorship & Earn 7% Payout',
    description: 'Successfully close a corporate sponsorship deal of ₹50,000 or higher. Mark the pipeline lead as Closed-Won and trigger commission credit.',
    category: 'corporate_sponsorship',
    pointsReward: 85,
    starsReward: 4,
    elevationMeters: 255,
    deliverablePrompt: 'Enter the Closed-Won lead ID, sponsor company name, and final agreed funding amount.',
    guidelines: [
      'Receive official sponsorship confirmation email from sponsor.',
      'Verify advance invoice generation by AEW finance desk.',
      'Your take-home commission of 7% (₹3,500+) is credited automatically!'
    ],
    iconName: 'Flame'
  },
  {
    id: 'pr-pw-8',
    stageNumber: 8,
    tier: 'Gold',
    title: 'Gold Apex Milestone: Multi-Campus Strategic Alliance',
    subtitle: 'Establish Multi-College Outreach Network & Unlock Premium',
    description: 'Partner with 2+ engineering colleges or student technical societies to co-host AEW Hackathon preliminary rounds.',
    category: 'brand_collaboration',
    pointsReward: 100,
    starsReward: 5,
    elevationMeters: 310,
    deliverablePrompt: 'Enter college names, faculty coordinators, and estimated student reach.',
    guidelines: [
      'Obtain written campus ambassador consent from college clubs.',
      'Distribute AEW Hackathon promotional material across student WhatsApp groups.',
      'Reach the 300 XP & 15 ⭐ threshold to ascend to the Premium Cloud Citadel!'
    ],
    iconName: 'Award'
  },

  // ─── ZONE 3: 💎 PREMIUM SUMMIT (Executive Pinnacle - 12.0% Commission) ───
  {
    id: 'pr-pw-9',
    stageNumber: 9,
    tier: 'Premium',
    title: 'Enterprise Title Sponsorship Proposal',
    subtitle: 'Pitch ₹1,00,000+ Powered-By Branding Tier',
    description: 'Present the highest-tier Title / Powered-By Sponsorship package to tier-1 enterprise SaaS, cloud, or tech unicorn leadership.',
    category: 'corporate_sponsorship',
    pointsReward: 100,
    starsReward: 5,
    elevationMeters: 375,
    deliverablePrompt: 'Paste link to enterprise pitch proposal or executive communication record.',
    guidelines: [
      'Highlight prime stage branding and naming rights (e.g., "[Brand] Presents AEW Tech Summit").',
      'Offer exclusive VIP dinner with top student creators and faculty.',
      'Present custom recruitment booth placements in the main hall.'
    ],
    iconName: 'Crown'
  },
  {
    id: 'pr-pw-10',
    stageNumber: 10,
    tier: 'Premium',
    title: 'Executive Keynote & Hackathon Judging Integration',
    subtitle: 'Coordinate Sponsor Leadership Stage Appearance',
    description: 'Align the sponsor CTO / Engineering VP as a keynote speaker and Grand Finale hackathon jury member for the tech summit.',
    category: 'event_marketing',
    pointsReward: 120,
    starsReward: 5,
    elevationMeters: 440,
    deliverablePrompt: 'Confirm speaker name, topic title, and session time slot.',
    guidelines: [
      'Draft speaker bio and promotional banner visual.',
      'Review hackathon judging rubrics with the sponsor representative.',
      'Coordinate media coverage and press release quotes.'
    ],
    iconName: 'Sparkles'
  },
  {
    id: 'pr-pw-11',
    stageNumber: 11,
    tier: 'Premium',
    title: 'Mega Deal Execution & Settlement (₹1,50,000+)',
    subtitle: 'Finalize Premium Enterprise Sponsorship with 12% Payout',
    description: 'Execute the complete enterprise sponsorship agreement and verify receipt of full funds. Earn the maximum 12% revenue commission!',
    category: 'mou_negotiation',
    pointsReward: 150,
    starsReward: 10,
    elevationMeters: 510,
    deliverablePrompt: 'Provide executed MoU copy, transaction ID, and final closed amount.',
    guidelines: [
      'Full legal execution by both parties with official stamps.',
      'Immediate 12% commission payout (₹18,000+ on ₹1.5L deal).',
      'Congratulations on demonstrating master-class corporate PR expertise!'
    ],
    iconName: 'Trophy'
  },
  {
    id: 'pr-pw-12',
    stageNumber: 12,
    tier: 'Premium',
    title: 'AEW PR Hall of Fame & Brand Laureate',
    subtitle: 'Highest Organizational Honor & Lifetime Ambassadorship',
    description: 'Reach the pinnacle of the AEW Public Relations Division. Permanent 12% maximum commission entitlement, executive LinkedIn recommendation, and verified certificate of merit.',
    category: 'general',
    pointsReward: 200,
    starsReward: 10,
    elevationMeters: 580,
    deliverablePrompt: 'Summarize your overall PR achievements and total revenue generated for AEW.',
    guidelines: [
      'Permanent executive ambassador status.',
      'Featured on the AEW Portal Hall of Fame leaderboard.',
      'Direct recommendation from AEW founders for future career opportunities.'
    ],
    iconName: 'Crown'
  }
];

export const PrPathwayView: React.FC<PrPathwayViewProps> = ({
  intern,
  onRefreshUser,
  onPageChange,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getCurrentUser() || intern);
  const [tasks, setTasks] = useState<PrTask[]>(() => StorageService.getPrTasks());
  const [selectedMission, setSelectedMission] = useState<PathwayMission | null>(null);
  const [submissionProof, setSubmissionProof] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState<PrTier | null>(null);

  // Sync state with storage
  const refreshLocalState = () => {
    const freshUser = StorageService.getCurrentUser() || StorageService.getUsers().find(u => u.teacherId === intern.teacherId) || intern;
    setCurrentUser(freshUser);
    setTasks(StorageService.getPrTasks());
    onRefreshUser?.();
  };

  useEffect(() => {
    refreshLocalState();
    const handleSync = () => refreshLocalState();
    window.addEventListener('aew_users_updated', handleSync);
    window.addEventListener('aew_cloud_data_synced', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('aew_users_updated', handleSync);
      window.removeEventListener('aew_cloud_data_synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const currentPoints = currentUser.prPoints || 0;
  const currentStars = currentUser.prStars || 0;
  const currentTier: PrTier = currentUser.prTier || 'Silver';

  // Calculate commission rate
  const commissionRate = StorageService.getTierCommissionRate(currentTier, currentUser);

  // Determine completion and unlock status for each pathway mission
  const missionStatuses = useMemo(() => {
    const statuses: Record<string, 'completed' | 'active' | 'locked'> = {};
    const myTasks = tasks.filter(t => t.assignedToInternId.toUpperCase() === currentUser.teacherId.toUpperCase());
    
    // Check which missions are completed via approved PrTasks or stored progress
    let highestCompletedIndex = -1;

    PATHWAY_MISSIONS.forEach((m, idx) => {
      // Mission is completed if there is an approved task with title matching or ID matching
      const matchingTask = myTasks.find(t => 
        t.title.toLowerCase().includes(m.title.slice(0, 20).toLowerCase()) ||
        (t.id && t.id.includes(m.id))
      );

      // Or if cumulative points and stars naturally place them beyond this stage
      const meetsCumulativeThreshold = 
        (m.tier === 'Silver' && currentPoints >= m.pointsReward * (idx + 1) * 0.7) ||
        (m.tier === 'Gold' && (currentTier === 'Gold' || currentTier === 'Premium')) ||
        (m.tier === 'Premium' && currentTier === 'Premium' && idx < 10);

      const isExplicitlyCompleted = matchingTask && matchingTask.status === 'approved';

      if (isExplicitlyCompleted || meetsCumulativeThreshold) {
        statuses[m.id] = 'completed';
        highestCompletedIndex = Math.max(highestCompletedIndex, idx);
      }
    });

    // The next uncompleted mission is active, everything else after is locked
    PATHWAY_MISSIONS.forEach((m, idx) => {
      if (!statuses[m.id]) {
        if (idx === highestCompletedIndex + 1 || (highestCompletedIndex === -1 && idx === 0)) {
          statuses[m.id] = 'active';
        } else {
          statuses[m.id] = 'locked';
        }
      }
    });

    return statuses;
  }, [tasks, currentUser.teacherId, currentPoints, currentStars, currentTier]);

  // Find the currently active mission index (the climber's position)
  const activeMissionIndex = useMemo(() => {
    const idx = PATHWAY_MISSIONS.findIndex(m => missionStatuses[m.id] === 'active');
    return idx !== -1 ? idx : PATHWAY_MISSIONS.length - 1;
  }, [missionStatuses]);

  // Calculate current elevation
  const currentElevation = useMemo(() => {
    const activeMission = PATHWAY_MISSIONS[activeMissionIndex];
    return activeMission ? activeMission.elevationMeters : 25;
  }, [activeMissionIndex]);

  // Next tier progress info
  const nextTierInfo = useMemo(() => {
    if (currentTier === 'Silver') {
      const ptsRemaining = Math.max(0, 100 - currentPoints);
      const starsRemaining = Math.max(0, 5 - currentStars);
      const ptsProgress = Math.min(100, (currentPoints / 100) * 100);
      const starsProgress = Math.min(100, (currentStars / 5) * 100);
      const totalProgress = Math.round((ptsProgress + starsProgress) / 2);
      return {
        nextTier: 'Gold' as PrTier,
        nextRate: 7.0,
        ptsRemaining,
        starsRemaining,
        progressPct: totalProgress,
        isMax: false,
      };
    } else if (currentTier === 'Gold') {
      const ptsRemaining = Math.max(0, 300 - currentPoints);
      const starsRemaining = Math.max(0, 15 - currentStars);
      const ptsProgress = Math.min(100, (currentPoints / 300) * 100);
      const starsProgress = Math.min(100, (currentStars / 15) * 100);
      const totalProgress = Math.round((ptsProgress + starsProgress) / 2);
      return {
        nextTier: 'Premium' as PrTier,
        nextRate: 12.0,
        ptsRemaining,
        starsRemaining,
        progressPct: totalProgress,
        isMax: false,
      };
    } else {
      return {
        nextTier: 'Premium' as PrTier,
        nextRate: 12.0,
        ptsRemaining: 0,
        starsRemaining: 0,
        progressPct: 100,
        isMax: true,
      };
    }
  }, [currentTier, currentPoints, currentStars]);

  // Handle Mission Submission & XP Claim
  const handleClaimMissionXP = (mission: PathwayMission) => {
    setIsSubmitting(true);
    try {
      // 1. Create or complete PrTask
      const taskId = `${mission.id}-${currentUser.teacherId.toLowerCase()}`;
      const existingTasks = StorageService.getPrTasks();
      const existingIdx = existingTasks.findIndex(t => t.id === taskId);

      const categoryMap: Record<PathwayMission['category'], PrTaskCategory> = {
        college_outreach: 'campus_ambassador',
        corporate_sponsorship: 'college_sponsorship',
        mou_negotiation: 'fest_mou',
        brand_collaboration: 'influencer_collab',
        event_marketing: 'content_promo',
        general: 'campus_ambassador',
      };

      if (existingIdx === -1) {
        StorageService.createPrTask({
          title: mission.title,
          description: mission.description,
          category: categoryMap[mission.category] || 'campus_ambassador',
          assignedToInternId: currentUser.teacherId,
          assignedToInternName: currentUser.name,
          assignedByAdminName: 'AEW PR Mission Control',
          deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          pointsReward: mission.pointsReward,
          starsReward: mission.starsReward,
          priority: 'high',
        });
      }

      // Submit proof
      StorageService.submitPrTask(
        taskId,
        submissionNotes.trim() || `Pathway Stage ${mission.stageNumber} deliverable verified.`,
        submissionProof.trim() || undefined
      );

      // Approve task and award XP & Stars
      const result = StorageService.approvePrTask(
        taskId,
        mission.pointsReward,
        mission.starsReward,
        `Mission Stage ${mission.stageNumber} completed on the PR Career Ascension Pathway.`
      );

      // Confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}

      // Check if promoted
      if (result?.promoted && result.intern?.prTier) {
        setCelebrationTier(result.intern.prTier);
        try {
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.4 }
          });
        } catch {}
      }

      refreshLocalState();
      setSelectedMission(null);
      setSubmissionProof('');
      setSubmissionNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit pathway mission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* ─── ELEVATION & TIER STATUS COCKPIT ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-96 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Current Level & Elevation Badge */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-md ${
                currentTier === 'Premium'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : currentTier === 'Gold'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {currentTier === 'Premium' ? <Crown className="w-3.5 h-3.5 text-purple-400" /> : <Award className="w-3.5 h-3.5 text-amber-400" />}
                {currentTier} Platform Class
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                💰 {commissionRate}% Revenue Share
              </span>
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>PR Career Ascension Pathway</span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  Altitude: {currentElevation}m
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Conquer outreach missions, collect XP Points 🎖️ and Stars ⭐, and scale the mountain to unlock higher revenue commission tiers.
              </p>
            </div>
          </div>

          {/* XP & Stars Gauge Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Total XP Points
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                {currentPoints}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Points Earned</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Total Stars
              </div>
              <div className="text-2xl font-black text-yellow-300 font-mono mt-1">
                {currentStars}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Stars Collected</div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Flag className="w-3 h-3 text-indigo-400" /> Completed
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {Object.values(missionStatuses).filter(s => s === 'completed').length} / {PATHWAY_MISSIONS.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Missions Cleared</div>
            </div>
          </div>

        </div>

        {/* Progress bar to next platform elevation */}
        {!nextTierInfo.isMax ? (
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                Ascension to <strong className="text-white">{nextTierInfo.nextTier} Ridge</strong> ({nextTierInfo.nextRate}% Commission):
              </span>
              <span className="font-mono text-indigo-300 font-bold text-[11px]">
                {nextTierInfo.ptsRemaining} XP & {nextTierInfo.starsRemaining} Stars remaining
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400"
                style={{ width: `${Math.max(8, nextTierInfo.progressPct)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-bold text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Apex Elevation Reached: You are operating at the highest organizational tier with 12.0% maximum commission!</span>
          </div>
        )}
      </div>

      {/* ─── INTERACTIVE PATHWAY QUEST MAP ─────────────────────────────────── */}
      <div className="relative py-8 px-4 sm:px-8 bg-slate-950/60 rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden">
        
        {/* Mountain contour background accents */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* ─── ZONE HEADERS & PLATFORM DIVIDERS ─── */}
        
        {/* ZONE 3 BANNER: PREMIUM SUMMIT */}
        <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-purple-950/40 border border-purple-500/30 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black uppercase tracking-widest border border-purple-500/40 mb-1">
            <Crown className="w-3.5 h-3.5 text-purple-400" />
            Zone 3: Premium Cloud Summit (Altitude: 350m - 600m)
          </div>
          <p className="text-xs text-purple-200/80 max-w-lg mx-auto">
            High-Stakes Enterprise Partnerships • Keynote Alliances • 12% Revenue Commission
          </p>
        </div>

        {/* MISSIONS 9 TO 12 (Premium Zone) */}
        <div className="space-y-12 max-w-3xl mx-auto relative">
          {PATHWAY_MISSIONS.slice(8, 12).map((mission, zoneIdx) => {
            const globalIdx = zoneIdx + 8;
            const status = missionStatuses[mission.id] || 'locked';
            const isLeft = globalIdx % 2 === 0;

            return (
              <PathwayNodeCard
                key={mission.id}
                mission={mission}
                status={status}
                isLeft={isLeft}
                isClimberHere={status === 'active'}
                internName={currentUser.name}
                onClick={() => setSelectedMission(mission)}
              />
            );
          })}
        </div>

        {/* GATEWAY DIVIDER: GOLD TO PREMIUM */}
        <div className="my-14 flex items-center justify-center">
          <div className="flex items-center gap-4 px-6 py-2.5 rounded-full bg-slate-900/90 border border-amber-500/30 shadow-xl text-xs font-bold text-amber-300">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Ascension Threshold: 300 XP & 15 ⭐ to Enter Premium Summit</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        {/* ZONE 2 BANNER: GOLD RIDGE */}
        <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-amber-950/40 border border-amber-500/30 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-widest border border-amber-500/40 mb-1">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Zone 2: Gold Ridge (Altitude: 150m - 350m)
          </div>
          <p className="text-xs text-amber-200/80 max-w-lg mx-auto">
            Sponsor Deal Closures • Custom MoU Drafting • 7% Revenue Commission
          </p>
        </div>

        {/* MISSIONS 5 TO 8 (Gold Zone) */}
        <div className="space-y-12 max-w-3xl mx-auto relative">
          {PATHWAY_MISSIONS.slice(4, 8).map((mission, zoneIdx) => {
            const globalIdx = zoneIdx + 4;
            const status = missionStatuses[mission.id] || 'locked';
            const isLeft = globalIdx % 2 === 0;

            return (
              <PathwayNodeCard
                key={mission.id}
                mission={mission}
                status={status}
                isLeft={isLeft}
                isClimberHere={status === 'active'}
                internName={currentUser.name}
                onClick={() => setSelectedMission(mission)}
              />
            );
          })}
        </div>

        {/* GATEWAY DIVIDER: SILVER TO GOLD */}
        <div className="my-14 flex items-center justify-center">
          <div className="flex items-center gap-4 px-6 py-2.5 rounded-full bg-slate-900/90 border border-indigo-500/30 shadow-xl text-xs font-bold text-indigo-300">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Ascension Threshold: 100 XP & 5 ⭐ to Enter Gold Ridge</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* ZONE 1 BANNER: SILVER FOOTHILLS */}
        <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/40 to-slate-900 border border-slate-700/50 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-widest border border-slate-700 mb-1">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            Zone 1: Silver Foothills (Altitude: 0m - 150m)
          </div>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Campus Outreach Foundation • Lead Scouting • 3.3% Base Commission
          </p>
        </div>

        {/* MISSIONS 1 TO 4 (Silver Zone) */}
        <div className="space-y-12 max-w-3xl mx-auto relative">
          {PATHWAY_MISSIONS.slice(0, 4).map((mission, globalIdx) => {
            const status = missionStatuses[mission.id] || 'locked';
            const isLeft = globalIdx % 2 === 0;

            return (
              <PathwayNodeCard
                key={mission.id}
                mission={mission}
                status={status}
                isLeft={isLeft}
                isClimberHere={status === 'active'}
                internName={currentUser.name}
                onClick={() => setSelectedMission(mission)}
              />
            );
          })}
        </div>

      </div>

      {/* ─── MISSION BRIEFING & SUBMISSION MODAL ───────────────────────────── */}
      {selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Stage {selectedMission.stageNumber} • {selectedMission.tier} Tier
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Altitude: {selectedMission.elevationMeters}m
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {selectedMission.title}
                </h3>
                <p className="text-xs text-slate-400">{selectedMission.subtitle}</p>
              </div>

              <button
                onClick={() => setSelectedMission(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reward Pill */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-slate-400">Mission Reward</div>
                <div className="text-xs text-slate-300">Awarded immediately upon task completion</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-black text-amber-400 font-mono bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                  +{selectedMission.pointsReward} XP
                </span>
                <span className="text-base font-black text-yellow-300 font-mono bg-yellow-500/10 px-3 py-1 rounded-xl border border-yellow-500/20 flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> +{selectedMission.starsReward}
                </span>
              </div>
            </div>

            {/* Description & Guidelines */}
            <div className="space-y-3 text-xs text-slate-300">
              <div className="font-bold text-white uppercase text-[11px] tracking-wider">Mission Objectives</div>
              <p className="leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                {selectedMission.description}
              </p>

              <div className="font-bold text-white uppercase text-[11px] tracking-wider pt-2">Tactical Guidelines</div>
              <ul className="space-y-1.5 pl-4 list-disc text-slate-300">
                {selectedMission.guidelines.map((g, idx) => (
                  <li key={idx} className="leading-relaxed">{g}</li>
                ))}
              </ul>
            </div>

            {/* Recommended Template if available */}
            {selectedMission.recommendedPitchTemplate && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                  <span>Recommended Outreach Template</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMission.recommendedPitchTemplate || '');
                      alert('Pitch template copied to clipboard!');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Pitch
                  </button>
                </div>
                <pre className="text-[11px] bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap font-mono max-h-36 overflow-y-auto">
                  {selectedMission.recommendedPitchTemplate}
                </pre>
              </div>
            )}

            {/* Deliverable Form */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="font-bold text-white uppercase text-[11px] tracking-wider">
                Submit Mission Deliverable
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proof URL (Google Drive, LinkedIn Post, WhatsApp Chat Link, or MoU Document):
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://linkedin.com/..."
                  value={submissionProof}
                  onChange={(e) => setSubmissionProof(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deliverables & Verification Notes:
                </label>
                <textarea
                  rows={3}
                  placeholder={selectedMission.deliverablePrompt}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedMission(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleClaimMissionXP(selectedMission)}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>Claiming XP...</>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Complete Mission & Claim +{selectedMission.pointsReward} XP
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Ops Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span>Need operational PR tools during your missions?</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onPageChange('pr_leads')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700/60 transition-all cursor-pointer"
          >
            📋 Lead Pipeline
          </button>
          <button
            type="button"
            onClick={() => onPageChange('pr_mou_maker')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700/60 transition-all cursor-pointer"
          >
            📜 MoU Generator
          </button>
          <button
            type="button"
            onClick={() => onPageChange('pr_earnings')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700/60 transition-all cursor-pointer"
          >
            💰 Commission Ledger
          </button>
        </div>
      </div>

      {/* ─── TIER ASCENSION CELEBRATION MODAL ───────────────────────────────── */}
      {celebrationTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-950 border border-amber-500/40 rounded-3xl max-w-md w-full p-8 text-center space-y-5 shadow-2xl relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
              <Crown className="w-10 h-10 text-slate-950" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Platform Elevation Unlocked!
              </span>
              <h3 className="text-3xl font-black text-white tracking-tight pt-2">
                Welcome to {celebrationTier} Tier!
              </h3>
              <p className="text-xs text-slate-300">
                Your outstanding outreach performance and mission completions have officially elevated you to the <strong className="text-amber-400 font-bold">{celebrationTier} Platform Class</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">New Sponsorship Commission Entitlement</div>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {celebrationTier === 'Premium' ? '12.0%' : '7.0%'}
              </div>
              <div className="text-[11px] text-slate-400">
                {celebrationTier === 'Premium' ? '+8.7% higher than base Silver tier!' : '+3.7% higher than base Silver tier!'}
              </div>
            </div>

            <button
              onClick={() => setCelebrationTier(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Continue Mountain Journey 🏔️
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// ─── HELPER COMPONENT: PATHWAY NODE CARD ────────────────────────────────────
interface PathwayNodeCardProps {
  mission: PathwayMission;
  status: 'completed' | 'active' | 'locked';
  isLeft: boolean;
  isClimberHere: boolean;
  internName: string;
  onClick: () => void;
}

const PathwayNodeCard: React.FC<PathwayNodeCardProps> = ({
  mission,
  status,
  isLeft,
  isClimberHere,
  internName,
  onClick,
}) => {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  return (
    <div className={`flex items-center gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse sm:flex-row'}`}>
      
      {/* Interactive Node Icon Button */}
      <div className="relative shrink-0 flex flex-col items-center">
        
        {/* Climber Avatar Token perched directly above the active node */}
        {isClimberHere && (
          <div className="absolute -top-12 z-20 flex flex-col items-center animate-bounce">
            <div className="px-2.5 py-1 rounded-full bg-indigo-600 border border-indigo-400 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-600/40 flex items-center gap-1 whitespace-nowrap">
              <Flag className="w-3 h-3 text-amber-300" />
              {internName ? `${internName.split(' ')[0]} (Here)` : 'You Are Here'}
            </div>
            <div className="w-2 h-2 bg-indigo-600 rotate-45 -mt-1" />
          </div>
        )}

        {/* Pulsing glow halo for active node */}
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-indigo-500/40 animate-ping pointer-events-none" />
        )}

        <button
          type="button"
          onClick={onClick}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-10 cursor-pointer border shadow-xl ${
            isCompleted
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white border-emerald-400 shadow-emerald-500/20 hover:scale-105'
              : isActive
              ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white border-indigo-300 shadow-indigo-500/40 ring-4 ring-indigo-500/20 hover:scale-110'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 opacity-60'
          }`}
          title={mission.title}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-7 h-7 text-white" />
          ) : isActive ? (
            <Sparkles className="w-7 h-7 text-amber-300 animate-spin-slow" />
          ) : (
            <Lock className="w-6 h-6 text-slate-600" />
          )}
        </button>

        {/* Stage number bubble */}
        <span className={`text-[10px] font-mono font-bold mt-1.5 px-2 py-0.5 rounded-full border ${
          isCompleted
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : isActive
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            : 'bg-slate-900 text-slate-600 border-slate-800'
        }`}>
          Stage {mission.stageNumber}
        </span>
      </div>

      {/* Node Mission Card */}
      <div
        onClick={onClick}
        className={`flex-1 p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
          isCompleted
            ? 'bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/50 shadow-lg'
            : isActive
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/50 hover:border-indigo-400 shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500/20'
            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-800 opacity-60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                mission.tier === 'Premium'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : mission.tier === 'Gold'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {mission.tier}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {mission.elevationMeters}m
              </span>
              {isCompleted && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Completed
                </span>
              )}
              {isActive && (
                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3" /> Active Mission
                </span>
              )}
            </div>

            <h4 className="text-sm md:text-base font-bold text-white tracking-tight">
              {mission.title}
            </h4>
            <p className="text-xs text-slate-400 line-clamp-2">
              {mission.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-black text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              +{mission.pointsReward} XP
            </span>
            <span className="text-xs font-black text-yellow-300 font-mono bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20 flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> +{mission.starsReward}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
