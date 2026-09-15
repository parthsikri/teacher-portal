import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Search,
  Building,
  UserCheck,
  Layers,
  Eye,
  RefreshCw,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Maximize2,
  X,
  UserPlus
} from 'lucide-react';
import type { User, UserRole, OfferLetter, OfferLetterRoleType, OfferLetterStatus, OfferLetterTheme } from '../../types';
import {
  OfferLetterService,
  AVAILABLE_SME_SUBJECTS,
  ROLE_PRESETS
} from '../../services/offerLetterService';
import { StorageService } from '../../services/storage';

interface AdminOfferLetterGeneratorProps {
  currentUser?: User;
  onOnboardCandidate?: (initialData: Partial<User>, offerId?: string) => void;
}

export const AdminOfferLetterGenerator: React.FC<AdminOfferLetterGeneratorProps> = ({ 
  currentUser: _currentUser,
  onOnboardCandidate,
}) => {
  // Navigation tabs: 'studio' | 'registry'
  const [activeTab, setActiveTab] = useState<'studio' | 'registry'>('studio');

  // Offer letters repository state
  const [offerLetters, setOfferLetters] = useState<OfferLetter[]>(() => StorageService.getOfferLetters());

  // Current working offer in the Studio
  const [currentOffer, setCurrentOffer] = useState<OfferLetter>(() => 
    OfferLetterService.createDefaultOfferLetter('sme', 'Engineering Mathematics')
  );

  // Subject selector state for SME
  const [selectedSubjectOption, setSelectedSubjectOption] = useState<string>('Engineering Mathematics');
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');

  // UI feedback states
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [previewModalOffer, setPreviewModalOffer] = useState<OfferLetter | null>(null);

  // Responsibilities temp input
  const [newRespInput, setNewRespInput] = useState('');

  // Registry search & filters
  const [registrySearch, setRegistrySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OfferLetterStatus>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | OfferLetterRoleType>('all');

  const printSectionRef = useRef<HTMLDivElement>(null);

  // Stats computed
  const stats = useMemo(() => {
    const total = offerLetters.length;
    const accepted = offerLetters.filter(o => o.status === 'accepted').length;
    const issued = offerLetters.filter(o => o.status === 'issued').length;
    const drafts = offerLetters.filter(o => o.status === 'draft').length;
    const smeCount = offerLetters.filter(o => o.roleType === 'sme').length;
    const internCount = offerLetters.filter(o => o.roleType !== 'sme').length;
    return { total, accepted, issued, drafts, smeCount, internCount };
  }, [offerLetters]);

  // Handle switching role preset
  const handleSelectRolePreset = (roleType: OfferLetterRoleType) => {
    const subject = roleType === 'sme' ? selectedSubjectOption : undefined;
    const updated = OfferLetterService.applyRolePreset(currentOffer, roleType, subject || 'Engineering Mathematics');
    setCurrentOffer(updated);
  };

  // Handle SME subject change
  const handleSubjectChange = (subjectName: string) => {
    setSelectedSubjectOption(subjectName);
    if (subjectName !== 'custom') {
      const updated = OfferLetterService.applyRolePreset(currentOffer, 'sme', subjectName);
      // Auto-set department based on subject if available
      const found = AVAILABLE_SME_SUBJECTS.find(s => s.name === subjectName);
      if (found) {
        updated.department = found.department;
      }
      setCurrentOffer(updated);
    }
  };

  // Handle custom subject commit
  const handleApplyCustomSubject = () => {
    if (!customSubjectInput.trim()) return;
    const subj = customSubjectInput.trim();
    const updated = OfferLetterService.applyRolePreset(currentOffer, 'sme', subj);
    setCurrentOffer(updated);
  };

  // Add responsibility
  const handleAddResponsibility = () => {
    if (!newRespInput.trim()) return;
    setCurrentOffer(prev => ({
      ...prev,
      responsibilities: [...prev.responsibilities, newRespInput.trim()],
    }));
    setNewRespInput('');
  };

  // Remove responsibility
  const handleRemoveResponsibility = (idx: number) => {
    setCurrentOffer(prev => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== idx),
    }));
  };

  // Reset responsibilities to preset default
  const handleResetResponsibilities = () => {
    const preset = ROLE_PRESETS[currentOffer.roleType] || ROLE_PRESETS.sme;
    const isSme = currentOffer.roleType === 'sme';
    const subj = currentOffer.subject || 'Engineering Mathematics';
    const resp = isSme 
      ? preset.responsibilities.map(r => r.replace(/\[Subject\]/g, subj))
      : [...preset.responsibilities];

    setCurrentOffer(prev => ({
      ...prev,
      responsibilities: resp,
    }));
  };

  // Regenerate Reference Number
  const handleRegenerateRefNumber = () => {
    setCurrentOffer(prev => ({
      ...prev,
      referenceNumber: OfferLetterService.generateReferenceNumber(),
    }));
  };

  // Save offer letter to storage
  const handleSaveOffer = (newStatus?: OfferLetterStatus) => {
    const toSave: OfferLetter = {
      ...currentOffer,
      status: newStatus || currentOffer.status,
      updatedAt: new Date().toISOString(),
    };
    const saved = StorageService.saveOfferLetter(toSave);
    setOfferLetters(StorageService.getOfferLetters());
    setCurrentOffer(saved);
    setSaveSuccessMsg(`✓ Offer letter "${saved.referenceNumber}" saved to registry!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Copy email invitation text
  const handleCopyEmail = (offerToCopy: OfferLetter = currentOffer) => {
    const text = OfferLetterService.formatOfferLetterEmail(offerToCopy);
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  // Download official PDF
  const handleDownloadPdf = (offerToDownload: OfferLetter = currentOffer) => {
    OfferLetterService.generatePdf(offerToDownload);
  };

  // Native print / save as PDF
  const handlePrint = (offerToPrint?: OfferLetter) => {
    if (offerToPrint && offerToPrint.id !== currentOffer.id) {
      setPreviewModalOffer(offerToPrint);
      setTimeout(() => window.print(), 200);
    } else {
      window.print();
    }
  };

  // Load an offer from registry into studio
  const handleLoadIntoStudio = (letter: OfferLetter) => {
    setCurrentOffer({ ...letter });
    if (letter.roleType === 'sme' && letter.subject) {
      setSelectedSubjectOption(letter.subject);
    }
    setActiveTab('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Duplicate an offer as new draft
  const handleDuplicateOffer = (letter: OfferLetter) => {
    const newOffer: OfferLetter = {
      ...letter,
      id: `ol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      referenceNumber: OfferLetterService.generateReferenceNumber(),
      candidateName: `${letter.candidateName} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentOffer(newOffer);
    if (newOffer.roleType === 'sme' && newOffer.subject) {
      setSelectedSubjectOption(newOffer.subject);
    }
    setActiveTab('studio');
    setSaveSuccessMsg(`✓ Loaded duplicate draft with new reference number!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleTriggerOnboard = (offer: OfferLetter) => {
    let mappedRole: UserRole = 'teacher';
    if (offer.roleType === 'sme') mappedRole = 'teacher';
    else if (offer.roleType === 'pr_intern') mappedRole = 'pr_intern';
    else if (offer.roleType === 'web_dev_intern') mappedRole = 'web_developer';
    else if (offer.roleType === 'sales_intern') mappedRole = 'sales';
    else if (offer.roleType === 'hr_intern') mappedRole = 'admin';
    else if (offer.roleType === 'graphic_designer') mappedRole = 'web_developer';
    else mappedRole = 'teacher';

    const initialData: Partial<User> = {
      name: offer.candidateName,
      email: offer.candidateEmail,
      phone: offer.candidatePhone,
      role: mappedRole,
      department: offer.department,
      subject: offer.subject || offer.roleTitle,
      joiningDate: offer.joiningDate,
      adminTier: offer.roleType === 'hr_intern' ? 'hr_admin' : undefined,
      adminPermissions: offer.roleType === 'hr_intern' ? ['manage_faculty', 'manage_offer_letters', 'manage_credentials', 'manage_leaves'] : undefined,
    };

    if (onOnboardCandidate) {
      onOnboardCandidate(initialData, offer.id);
    }
  };

  // Delete from registry
  const handleDeleteOffer = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the offer letter for "${name}"?`)) {
      StorageService.deleteOfferLetter(id);
      setOfferLetters(StorageService.getOfferLetters());
    }
  };

  // Change status directly in registry
  const handleUpdateStatus = (id: string, newStatus: OfferLetterStatus) => {
    StorageService.updateOfferLetterStatus(id, newStatus);
    setOfferLetters(StorageService.getOfferLetters());
  };

  // Filtered letters in registry
  const filteredLetters = useMemo(() => {
    return offerLetters.filter(l => {
      const q = registrySearch.toLowerCase();
      const matchSearch = 
        l.candidateName.toLowerCase().includes(q) ||
        l.referenceNumber.toLowerCase().includes(q) ||
        l.roleTitle.toLowerCase().includes(q) ||
        l.department.toLowerCase().includes(q) ||
        (l.candidateCollege && l.candidateCollege.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchRole = roleFilter === 'all' || l.roleType === roleFilter;

      return matchSearch && matchStatus && matchRole;
    });
  }, [offerLetters, registrySearch, statusFilter, roleFilter]);

  // Color mappings for themes
  const themeStyles = {
    executive_navy: {
      bar: 'bg-gradient-to-r from-slate-950 via-indigo-950 to-amber-600',
      badge: 'bg-indigo-950 text-indigo-300 border-indigo-700/50',
      title: 'text-slate-900',
      highlight: 'border-l-4 border-indigo-700 bg-indigo-50/50',
      subtext: 'text-slate-600',
      seal: 'border-indigo-800 text-indigo-900 bg-indigo-50',
    },
    modern_tech: {
      bar: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      title: 'text-indigo-950',
      highlight: 'border-l-4 border-purple-600 bg-purple-50/40',
      subtext: 'text-slate-600',
      seal: 'border-purple-800 text-purple-900 bg-purple-50',
    },
    classic_academic: {
      bar: 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-amber-700',
      badge: 'bg-zinc-100 text-zinc-800 border-zinc-300',
      title: 'text-zinc-950',
      highlight: 'border-l-4 border-zinc-700 bg-zinc-100/60',
      subtext: 'text-zinc-600',
      seal: 'border-zinc-800 text-zinc-900 bg-zinc-100',
    },
  };

  const activeTheme = themeStyles[currentOffer.templateTheme] || themeStyles.executive_navy;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & METRIC SUMMARY CARDS                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" /> OFFICIAL AEW RECRUITMENT SUITE
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-100 tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 md:w-9 md:h-9 text-indigo-400" />
              Offer Letter & Appointment Generator
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
              Generate standardized, legally drafted appointment letters with high-definition letterhead, customizable deliverables, stipend structures, and digital verification seals for Subject Matter Experts, HR, PR, Web Development, and campus teams.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 self-start lg:self-center shrink-0">
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" /> Studio & Live Builder
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'registry'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" /> Offer Registry ({offerLetters.length})
            </button>
          </div>
        </div>

        {/* Metric Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-2xl">
            <div className="text-[11px] text-slate-400 font-medium">Total Generated</div>
            <div className="text-xl font-black text-slate-100 font-mono mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-2xl">
            <div className="text-[11px] text-emerald-400 font-medium">Accepted Offers</div>
            <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">{stats.accepted}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-2xl">
            <div className="text-[11px] text-indigo-400 font-medium">Active / Issued</div>
            <div className="text-xl font-black text-indigo-300 font-mono mt-0.5">{stats.issued}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-2xl">
            <div className="text-[11px] text-amber-400 font-medium">Pending Drafts</div>
            <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{stats.drafts}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-2xl">
            <div className="text-[11px] text-purple-400 font-medium">SME Experts</div>
            <div className="text-xl font-black text-purple-300 font-mono mt-0.5">{stats.smeCount}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-2xl">
            <div className="text-[11px] text-sky-400 font-medium">Staff & Interns</div>
            <div className="text-xl font-black text-sky-300 font-mono mt-0.5">{stats.internCount}</div>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {saveSuccessMsg}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. STUDIO VIEW: BUILDER + LIVE A4 DOCUMENT PREVIEW           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: INTERACTIVE FORM BUILDER (7 cols on XL) */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* ROLE PRESET QUICK SELECTOR */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" /> 1. Select Position / Role Template
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">1-Click Auto-Fill</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {(Object.keys(ROLE_PRESETS) as OfferLetterRoleType[]).map((rType) => {
                  const preset = ROLE_PRESETS[rType];
                  const isSelected = currentOffer.roleType === rType;
                  return (
                    <button
                      key={rType}
                      type="button"
                      onClick={() => handleSelectRolePreset(rType)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-600/10 ring-1 ring-indigo-500'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-extrabold text-xs text-slate-100">{preset.label}</div>
                      <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{preset.department}</div>
                    </button>
                  );
                })}
              </div>

              {/* DYNAMIC SME SUBJECT PICKER (Shown if roleType === 'sme') */}
              {currentOffer.roleType === 'sme' && (
                <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 space-y-3 mt-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-indigo-300 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                      Subject Specialization (for Subject Matter Expert)
                    </label>
                    <span className="text-[10px] text-indigo-400 font-mono">Dynamic Syllabus</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <select
                        value={selectedSubjectOption}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-400 cursor-pointer"
                      >
                        {AVAILABLE_SME_SUBJECTS.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.department.split('&')[0]})
                          </option>
                        ))}
                        <option value="custom">✍️ Other / Custom Subject...</option>
                      </select>
                    </div>

                    {selectedSubjectOption === 'custom' && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Cybersecurity, Robotics..."
                          value={customSubjectInput}
                          onChange={(e) => setCustomSubjectInput(e.target.value)}
                          className="flex-1 bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomSubject}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CANDIDATE INFORMATION CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" /> 2. Appointee / Candidate Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Candidate Full Name *</label>
                  <input
                    type="text"
                    value={currentOffer.candidateName}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, candidateName: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Rohan Sharma"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Email Address *</label>
                  <input
                    type="email"
                    value={currentOffer.candidateEmail}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, candidateEmail: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. candidate@gmail.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={currentOffer.candidatePhone || ''}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, candidatePhone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">College / Institution Affiliation</label>
                  <input
                    type="text"
                    value={currentOffer.candidateCollege || ''}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, candidateCollege: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Delhi Technological University (DTU)"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Address / City</label>
                  <input
                    type="text"
                    value={currentOffer.candidateAddress || ''}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, candidateAddress: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Rohini Sector 16, New Delhi - 110089"
                  />
                </div>
              </div>
            </div>

            {/* APPOINTMENT & CONTRACT TERMS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-400" /> 3. Role Title & Terms of Appointment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Official Role Title</label>
                  <input
                    type="text"
                    value={currentOffer.roleTitle}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, roleTitle: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Department</label>
                  <input
                    type="text"
                    value={currentOffer.department}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Employment Category</label>
                  <select
                    value={currentOffer.employmentType}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, employmentType: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Full-time">Full-time</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Work Model</label>
                  <select
                    value={currentOffer.workMode}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, workMode: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Remote (Work From Home)">Remote (Work From Home)</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="In-Office (New Delhi)">In-Office (New Delhi)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Joining Date</label>
                  <input
                    type="date"
                    value={currentOffer.joiningDate}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, joiningDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Tenure / Duration</label>
                  <input
                    type="text"
                    value={currentOffer.duration}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 3 Months / 6 Months"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Weekly Commitment</label>
                  <input
                    type="text"
                    value={currentOffer.workingHours}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, workingHours: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 20-25 Hours/Week (Flexible)"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Acceptance Deadline</label>
                  <input
                    type="date"
                    value={currentOffer.validUntil}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, validUntil: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Reporting Authority / Manager</label>
                  <input
                    type="text"
                    value={currentOffer.reportingManager}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, reportingManager: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Director of Academic Operations & Dean"
                  />
                </div>
              </div>
            </div>

            {/* STIPEND & INCENTIVES */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="text-amber-400 font-bold">₹</span> 4. Compensation, Remuneration & Perks
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Fixed Stipend / Honorarium</label>
                  <input
                    type="text"
                    value={currentOffer.stipendAmount}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, stipendAmount: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. ₹25,000 / Month or ₹800 / Session"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Performance Incentive / Bonus</label>
                  <input
                    type="text"
                    value={currentOffer.incentiveDetails || ''}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, incentiveDetails: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Up to ₹5,000 based on milestone completion"
                  />
                </div>
              </div>
            </div>

            {/* KEY RESPONSIBILITIES EDITOR */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" /> 5. Key Responsibilities & Deliverables
                </h3>
                <button
                  type="button"
                  onClick={handleResetResponsibilities}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset to Role Defaults
                </button>
              </div>

              <div className="space-y-2">
                {currentOffer.responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 group">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-200 flex-1 leading-relaxed">{resp}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveResponsibility(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Remove responsibility"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Responsibility */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add custom responsibility / milestone bullet..."
                  value={newRespInput}
                  onChange={(e) => setNewRespInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddResponsibility(); } }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddResponsibility}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* DOCUMENT FORMATTING & SIGNATORY SETTINGS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" /> 6. Document Metadata & Authorization
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-400">Reference Number</label>
                    <button
                      type="button"
                      onClick={handleRegenerateRefNumber}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> New Ref
                    </button>
                  </div>
                  <input
                    type="text"
                    value={currentOffer.referenceNumber}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Letterhead Theme</label>
                  <select
                    value={currentOffer.templateTheme}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, templateTheme: e.target.value as OfferLetterTheme }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="executive_navy">Executive Navy & Gold</option>
                    <option value="modern_tech">Modern Tech AEW (Indigo/Amber)</option>
                    <option value="classic_academic">Classic Academic (Charcoal/Zinc)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Authorized Signatory Name</label>
                  <input
                    type="text"
                    value={currentOffer.signatoryName}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, signatoryName: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Signatory Title</label>
                  <input
                    type="text"
                    value={currentOffer.signatoryTitle}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, signatoryTitle: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2 pt-1 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentOffer.includeDigitalSeal}
                      onChange={(e) => setCurrentOffer(prev => ({ ...prev, includeDigitalSeal: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                    />
                    <span className="text-xs text-slate-300 font-semibold">Include AEW Digital Verification Seal & Stamp</span>
                  </label>

                  <select
                    value={currentOffer.status}
                    onChange={(e) => setCurrentOffer(prev => ({ ...prev, status: e.target.value as OfferLetterStatus }))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-bold"
                  >
                    <option value="draft">Status: Draft</option>
                    <option value="issued">Status: Issued</option>
                    <option value="accepted">Status: Accepted</option>
                    <option value="declined">Status: Declined</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ACTION TOOLBAR */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-20 backdrop-blur-md bg-slate-900/95">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-purple-400" /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyEmail()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-amber-400" /> {copiedEmail ? 'Copied!' : 'Copy Email'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerOnboard(currentOffer)}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                  title="Onboard candidate directly into portal as employee"
                >
                  <UserPlus className="w-4 h-4" /> ⚡ Onboard as Employee
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveOffer('issued')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save & Issue
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOffer()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: LIVE A4 DOCUMENT PREVIEW (5 cols on XL) */}
          <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-20">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Document Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFullscreenPreview(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                </button>
              </div>
            </div>

            {/* REALISTIC A4 LETTERHEAD CONTAINER */}
            <div 
              id="offer-letter-printable-sheet"
              ref={printSectionRef}
              className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden font-sans text-xs select-text leading-relaxed"
              style={{ minHeight: '842px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}
            >
              {/* Top Letterhead Brand Bar */}
              <div className={`h-3 w-full ${activeTheme.bar}`}></div>

              <div className="p-6 md:p-8 space-y-5">
                
                {/* Header Letterhead */}
                <div className="flex items-start justify-between border-b-2 border-slate-900/80 pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 text-white font-black flex items-center justify-center text-sm tracking-wider shadow-md">
                      AEW
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight text-slate-950 uppercase">
                        APNA ENGINEERING WALLAH
                      </h2>
                      <p className="text-[10px] text-slate-600 font-medium">
                        Center for Technical Excellence & Academic Curriculum
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        New Delhi, India • academic-ops@aew.com • apnaengineeringwallah.com
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {currentOffer.referenceNumber}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Date: {currentOffer.createdAt ? currentOffer.createdAt.split('T')[0] : OfferLetterService.getTodayDateString()}
                    </div>
                  </div>
                </div>

                {/* Candidate Address Block */}
                <div className="space-y-0.5 text-xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To:</div>
                  <div className="font-extrabold text-slate-900 text-sm">{currentOffer.candidateName || '[Candidate Name]'}</div>
                  {currentOffer.candidateCollege && (
                    <div className="text-slate-600 text-[11px]">{currentOffer.candidateCollege}</div>
                  )}
                  {currentOffer.candidateAddress && (
                    <div className="text-slate-500 text-[10px]">{currentOffer.candidateAddress}</div>
                  )}
                  <div className="text-slate-600 text-[10px] font-mono">
                    {currentOffer.candidateEmail} {currentOffer.candidatePhone ? `| ${currentOffer.candidatePhone}` : ''}
                  </div>
                </div>

                {/* Formal Subject Line */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-extrabold text-xs text-slate-900">
                  SUBJECT: APPOINTMENT LETTER FOR THE POSITION OF "{currentOffer.roleTitle.toUpperCase()}"
                </div>

                {/* Formal Salutation */}
                <p className="text-slate-700 text-justify text-[11px] leading-relaxed">
                  Dear <strong>{currentOffer.candidateName || 'Candidate'}</strong>, on behalf of Apna Engineering Wallah (AEW), we are pleased to extend this formal offer of appointment for the position of <strong>{currentOffer.roleTitle}</strong> within our <strong>{currentOffer.department}</strong>. We believe your expertise will play a vital role in our academic mission.
                </p>

                {/* Terms Summary Grid */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
                  <div className="bg-slate-100 font-bold px-3 py-1.5 text-slate-800 border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    Appointment Schedule & Terms
                  </div>
                  <div className="divide-y divide-slate-200 bg-white">
                    <div className="grid grid-cols-2 p-2 px-3">
                      <span className="text-slate-500">Designation / Role</span>
                      <span className="font-bold text-slate-900">{currentOffer.roleTitle}</span>
                    </div>
                    <div className="grid grid-cols-2 p-2 px-3 bg-slate-50/50">
                      <span className="text-slate-500">Department</span>
                      <span className="font-medium text-slate-800">{currentOffer.department}</span>
                    </div>
                    <div className="grid grid-cols-2 p-2 px-3">
                      <span className="text-slate-500">Work Category & Mode</span>
                      <span className="font-medium text-slate-800">{currentOffer.employmentType} ({currentOffer.workMode})</span>
                    </div>
                    <div className="grid grid-cols-2 p-2 px-3 bg-slate-50/50">
                      <span className="text-slate-500">Scheduled Joining Date</span>
                      <span className="font-bold text-slate-900 font-mono">{currentOffer.joiningDate}</span>
                    </div>
                    <div className="grid grid-cols-2 p-2 px-3">
                      <span className="text-slate-500">Duration / Tenure</span>
                      <span className="font-medium text-slate-800">{currentOffer.duration}</span>
                    </div>
                    <div className="grid grid-cols-2 p-2 px-3 bg-slate-50/50">
                      <span className="text-slate-500">Working Commitment</span>
                      <span className="font-medium text-slate-800">{currentOffer.workingHours}</span>
                    </div>
                    <div className="grid grid-cols-2 p-2 px-3">
                      <span className="text-slate-500 font-semibold">Fixed Remuneration</span>
                      <span className="font-bold text-emerald-700">{currentOffer.stipendAmount}</span>
                    </div>
                    {currentOffer.incentiveDetails && (
                      <div className="grid grid-cols-2 p-2 px-3 bg-slate-50/50">
                        <span className="text-slate-500">Performance Incentive</span>
                        <span className="text-slate-700 text-[10px]">{currentOffer.incentiveDetails}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 1: Responsibilities */}
                <div className="space-y-1.5">
                  <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                    1. Scope of Work & Deliverables
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    {currentOffer.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-600 font-bold mt-0.5">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 2: Perks */}
                <div className="space-y-1.5">
                  <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                    2. Benefits & Learning Privileges
                  </div>
                  <ul className="space-y-1 text-[10px] text-slate-600">
                    {currentOffer.perks.slice(0, 4).map((perk, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold mt-0.5">✓</span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 3: Legal & Confidentiality */}
                <div className="space-y-1 text-[10px] text-slate-500 border-t border-slate-200 pt-2">
                  <p className="font-bold text-slate-700">Confidentiality & Intellectual Property:</p>
                  <p className="text-justify leading-snug">
                    All created curricula, questions, slide decks, software codes, and internal records remain the proprietary intellectual property of AEW. This appointment is subject to a 7-day notice period by either party.
                  </p>
                </div>

                {/* Dual Signature Block */}
                <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-4">
                  {/* AEW Block */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">For Apna Engineering Wallah</div>
                    {currentOffer.includeDigitalSeal && (
                      <div className="inline-block bg-indigo-50 border border-indigo-300 text-indigo-900 text-[9px] font-bold px-2 py-0.5 rounded font-mono">
                        ✓ DIGITALLY SEALED & VERIFIED
                      </div>
                    )}
                    <div className="pt-4">
                      <div className="font-extrabold text-slate-900 text-xs">{currentOffer.signatoryName}</div>
                      <div className="text-[10px] text-slate-600">{currentOffer.signatoryTitle}</div>
                      <div className="text-[9px] text-slate-400">Apna Engineering Wallah (AEW)</div>
                    </div>
                  </div>

                  {/* Candidate Acceptance Block */}
                  <div className="space-y-2 text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Candidate Acceptance</div>
                    <div className="text-[9px] text-slate-500">I accept this offer & agreed terms</div>
                    <div className="pt-8">
                      <div className="border-b border-slate-400 w-36 ml-auto"></div>
                      <div className="font-bold text-slate-800 text-[10px] mt-1">{currentOffer.candidateName}</div>
                      <div className="text-[9px] text-slate-400">Date: _______________</div>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-2">
                  Apna Engineering Wallah • Registered Academic Organization • Strictly Confidential
                </div>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. REGISTRY & ARCHIVE VIEW                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'registry' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Issued Offer Letters Registry ({filteredLetters.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage, search, export, and track countersigned statuses across all institutional appointments.
              </p>
            </div>

            <button
              onClick={() => {
                setCurrentOffer(OfferLetterService.createDefaultOfferLetter('sme'));
                setActiveTab('studio');
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 self-start md:self-center cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Draft New Offer Letter
            </button>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by candidate name, role, college, or ref no..."
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Drafts Only</option>
              <option value="issued">Issued</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="sme">Subject Matter Experts</option>
              <option value="hr_intern">HR Interns</option>
              <option value="pr_intern">PR Interns</option>
              <option value="web_dev_intern">Web Dev Interns</option>
              <option value="graphic_designer">Design & Media</option>
              <option value="sales_intern">Sales & BD</option>
              <option value="custom">Custom Roles</option>
            </select>
          </div>

          {/* Table of Letters */}
          {filteredLetters.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800/80 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400 font-medium">No offer letters matched your search filter.</p>
              <button
                onClick={() => { setRegistrySearch(''); setStatusFilter('all'); setRoleFilter('all'); }}
                className="text-xs text-indigo-400 font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-950/60">
                    <th className="py-3 px-4">Ref Number</th>
                    <th className="py-3 px-4">Candidate & College</th>
                    <th className="py-3 px-4">Role & Specialization</th>
                    <th className="py-3 px-4">Joining Date</th>
                    <th className="py-3 px-4">Stipend</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredLetters.map((letter) => {
                    const statusColors = {
                      draft: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                      issued: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
                      accepted: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                      declined: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                      revoked: 'bg-slate-800 text-slate-400 border-slate-700',
                    };

                    return (
                      <tr key={letter.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                          {letter.referenceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-100">{letter.candidateName}</div>
                          <div className="text-[11px] text-slate-400">{letter.candidateCollege || letter.candidateEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-200">{letter.roleTitle}</div>
                          <div className="text-[11px] text-slate-500">{letter.department}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {letter.joiningDate}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400 whitespace-nowrap">
                          {letter.stipendAmount}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={letter.status}
                            onChange={(e) => handleUpdateStatus(letter.id, e.target.value as OfferLetterStatus)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider focus:outline-none cursor-pointer ${statusColors[letter.status] || 'bg-slate-800 text-slate-300'}`}
                          >
                            <option value="draft">Draft</option>
                            <option value="issued">Issued</option>
                            <option value="accepted">Accepted</option>
                            <option value="declined">Declined</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setPreviewModalOffer(letter);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Preview Document"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(letter)}
                              className="p-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopyEmail(letter)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Copy Email Invitation"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleTriggerOnboard(letter)}
                              className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                              title="Onboard Candidate as Employee"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleLoadIntoStudio(letter)}
                              className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                              title="Edit in Studio"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateOffer(letter)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors cursor-pointer"
                              title="Duplicate as New Draft"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteOffer(letter.id, letter.candidateName)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. FULLSCREEN / PREVIEW MODAL                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(fullscreenPreview || previewModalOffer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 my-8">
            
            {/* Modal Top Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                  {(previewModalOffer || currentOffer).referenceNumber}
                </span>
                <span className="text-xs text-slate-300 font-extrabold">
                  {(previewModalOffer || currentOffer).roleTitle}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(previewModalOffer || currentOffer)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-400" /> Print
                </button>
                <button
                  onClick={() => {
                    setFullscreenPreview(false);
                    setPreviewModalOffer(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Document Viewer */}
            <div className="bg-white text-slate-900 p-8 md:p-12 rounded-2xl shadow-inner space-y-6 font-sans text-xs border border-slate-200 select-text leading-relaxed">
              
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 text-white font-black flex items-center justify-center text-sm tracking-wider">
                    AEW
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                      APNA ENGINEERING WALLAH (AEW)
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Center for Technical Excellence, Academic Curriculum & Innovation
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Regd. Office: New Delhi, India • academic-ops@aew.com • Ref: {(previewModalOffer || currentOffer).referenceNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-slate-600">
                  <div>Date: {(previewModalOffer || currentOffer).createdAt ? (previewModalOffer || currentOffer).createdAt.split('T')[0] : OfferLetterService.getTodayDateString()}</div>
                  <div className="text-indigo-700 font-bold mt-1">Valid Until: {(previewModalOffer || currentOffer).validUntil}</div>
                </div>
              </div>

              {/* Salutation Box */}
              <div className="space-y-1">
                <div className="text-slate-500 font-bold uppercase text-[11px]">To:</div>
                <div className="text-base font-black text-slate-900">{(previewModalOffer || currentOffer).candidateName}</div>
                {(previewModalOffer || currentOffer).candidateCollege && (
                  <div className="text-slate-600">{(previewModalOffer || currentOffer).candidateCollege}</div>
                )}
                {(previewModalOffer || currentOffer).candidateAddress && (
                  <div className="text-slate-500">{(previewModalOffer || currentOffer).candidateAddress}</div>
                )}
                <div className="text-slate-500 font-mono">
                  {(previewModalOffer || currentOffer).candidateEmail} | {(previewModalOffer || currentOffer).candidatePhone || 'On Record'}
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl font-bold text-xs border border-slate-200">
                SUBJECT: OFFICIAL OFFER OF APPOINTMENT AS "{(previewModalOffer || currentOffer).roleTitle.toUpperCase()}"
              </div>

              <p className="text-justify text-slate-700 leading-relaxed text-xs">
                Dear <strong>{(previewModalOffer || currentOffer).candidateName}</strong>, on behalf of Apna Engineering Wallah, we are pleased to offer you the position of <strong>{(previewModalOffer || currentOffer).roleTitle}</strong> in our <strong>{(previewModalOffer || currentOffer).department}</strong>. Your scheduled joining date is <strong>{(previewModalOffer || currentOffer).joiningDate}</strong> for a duration of <strong>{(previewModalOffer || currentOffer).duration}</strong>.
              </p>

              {/* Terms Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 font-bold px-3 py-1.5 text-slate-800 text-[11px] uppercase tracking-wider">
                  Terms of Appointment
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200">
                  <div className="p-2.5 space-y-1">
                    <div className="text-slate-500 text-[10px]">Employment Type</div>
                    <div className="font-bold text-slate-900">{(previewModalOffer || currentOffer).employmentType} ({(previewModalOffer || currentOffer).workMode})</div>
                  </div>
                  <div className="p-2.5 space-y-1">
                    <div className="text-slate-500 text-[10px]">Remuneration / Stipend</div>
                    <div className="font-bold text-emerald-700">{(previewModalOffer || currentOffer).stipendAmount}</div>
                  </div>
                </div>
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b pb-1">
                  Scope of Work & Deliverables
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                  {(previewModalOffer || currentOffer).responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[10px] font-bold text-slate-500">FOR APNA ENGINEERING WALLAH</div>
                  <div className="pt-8">
                    <div className="font-black text-slate-900">{(previewModalOffer || currentOffer).signatoryName}</div>
                    <div className="text-slate-600 text-[11px]">{(previewModalOffer || currentOffer).signatoryTitle}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-500">ACCEPTED & ACKNOWLEDGED</div>
                  <div className="pt-8">
                    <div className="border-b border-slate-400 w-44 ml-auto"></div>
                    <div className="font-bold text-slate-900 text-xs mt-1">{(previewModalOffer || currentOffer).candidateName}</div>
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
