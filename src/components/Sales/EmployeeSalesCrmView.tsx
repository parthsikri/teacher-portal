import React, { useState, useMemo } from 'react';
import type { User, SalesLead, SalesLeadStatus, SalesLeadPriority, CallDisposition } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Phone, MessageSquare, Clock, CheckCircle2, PhoneCall, PhoneOff,
  Search, Plus, X, ChevronRight, Briefcase
} from 'lucide-react';

interface EmployeeSalesCrmViewProps {
  currentUser: User;
  onPageChange?: (page: string) => void;
  onRefreshData?: () => void;
}

const STATUS_LABELS: Record<SalesLeadStatus, { label: string; color: string; dotColor: string }> = {
  new: { label: 'New Lead', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30', dotColor: 'bg-blue-400' },
  contacted: { label: 'Contacted', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30', dotColor: 'bg-purple-400' },
  follow_up_scheduled: { label: 'Follow-Up Scheduled', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dotColor: 'bg-amber-400' },
  demo_scheduled: { label: 'Demo / Counseling', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dotColor: 'bg-cyan-400' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', dotColor: 'bg-indigo-400' },
  negotiation: { label: 'Fee Negotiation', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30', dotColor: 'bg-orange-400' },
  closed_won: { label: 'Enrolled (Closed Won)', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dotColor: 'bg-emerald-400' },
  closed_lost: { label: 'Lost / Dropped', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30', dotColor: 'bg-rose-400' },
};

const PRIORITY_BADGES: Record<SalesLeadPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-slate-400 bg-slate-800/60 border-slate-700' },
  medium: { label: 'Medium', color: 'text-blue-300 bg-blue-500/15 border-blue-500/30' },
  high: { label: 'High Priority', color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  urgent: { label: '🔥 Urgent', color: 'text-rose-300 bg-rose-500/20 border-rose-500/40 font-bold' },
};

export const EmployeeSalesCrmView: React.FC<EmployeeSalesCrmViewProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [leads, setLeads] = useState<SalesLead[]>(StorageService.getSalesLeads());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'queue' | 'all'>('queue');

  // Modals
  const [callLoggingLead, setCallLoggingLead] = useState<SalesLead | null>(null);
  const [activeDetailLead, setActiveDetailLead] = useState<SalesLead | null>(null);
  const [showAddInboundModal, setShowAddInboundModal] = useState(false);

  // Call Logging Form State
  const [callPicked, setCallPicked] = useState<boolean>(true);
  const [callDisposition, setCallDisposition] = useState<CallDisposition>('picked_interested');
  const [callFeedback, setCallFeedback] = useState<string>('');
  const [wantToCallAgain, setWantToCallAgain] = useState<boolean>(true);
  const [callbackDate, setCallbackDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [callbackTime, setCallbackTime] = useState<string>('15:00');
  const [stageAfterCall, setStageAfterCall] = useState<SalesLeadStatus>('contacted');

  // New Inbound Lead State
  const [inboundName, setInboundName] = useState('');
  const [inboundPhone, setInboundPhone] = useState('');
  const [inboundEmail, setInboundEmail] = useState('');
  const [inboundOrg, setInboundOrg] = useState('');
  const [inboundProgram, setInboundProgram] = useState('');
  const [inboundNotes, setInboundNotes] = useState('');

  const refreshLocalData = () => {
    setLeads(StorageService.getSalesLeads());
    if (onRefreshData) onRefreshData();
  };

  // STRICT EMPLOYEE FILTERING: Only show leads assigned to THIS employee!
  const myLeads = useMemo(() => {
    const myIds = [currentUser.id, currentUser.teacherId].filter(Boolean).map(id => String(id).toUpperCase());
    return leads.filter(l => l.assignedToEmployeeId && myIds.includes(String(l.assignedToEmployeeId).toUpperCase()));
  }, [leads, currentUser]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's Follow-up Queue (leads scheduled for today or new leads)
  const todayQueueLeads = useMemo(() => {
    return myLeads.filter(l => {
      if (l.status === 'closed_won' || l.status === 'closed_lost') return false;
      if (l.nextFollowUpDate && l.nextFollowUpDate <= todayStr) return true;
      if (l.status === 'new') return true;
      return false;
    });
  }, [myLeads, todayStr]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    const list = activeTab === 'queue' ? todayQueueLeads : myLeads;
    return list.filter((lead) => {
      if (selectedStage !== 'all' && lead.status !== selectedStage) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(q);
        const matchPhone = lead.phoneNumber.includes(q) || (lead.altPhoneNumber && lead.altPhoneNumber.includes(q));
        const matchOrg = lead.organization?.toLowerCase().includes(q);
        const matchProg = lead.programOfInterest?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchOrg && !matchProg) return false;
      }
      return true;
    });
  }, [activeTab, todayQueueLeads, myLeads, selectedStage, searchQuery]);

  // Clean phone number for WhatsApp
  const cleanPhoneForLink = (phone: string): string => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    return clean;
  };

  const handleLaunchWhatsApp = (lead: SalesLead) => {
    const cleanPhone = cleanPhoneForLink(lead.phoneNumber);
    const greeting = `Hello ${lead.name}, this is ${currentUser.name} from Apna Engineering Wallah. I am following up regarding your interest in our ${lead.programOfInterest || 'engineering courses'}. When can we connect for a quick 5-minute discussion?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank');
  };

  const handleOpenCallLogger = (lead: SalesLead) => {
    setCallLoggingLead(lead);
    setCallPicked(true);
    setCallDisposition('picked_interested');
    setCallFeedback('');
    setWantToCallAgain(true);
    setCallbackDate(new Date().toISOString().split('T')[0]);
    setCallbackTime('16:00');
    setStageAfterCall(lead.status === 'new' ? 'contacted' : lead.status);
  };

  const handleSubmitCallLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callLoggingLead) return;

    StorageService.addSalesActivityLog(callLoggingLead.id, {
      leadId: callLoggingLead.id,
      authorId: currentUser.id || currentUser.teacherId,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      callPicked,
      disposition: callDisposition,
      feedback: callFeedback.trim() || (callPicked ? 'Call connected with student.' : 'Call could not be connected.'),
      wantToCallAgain,
      callbackDate: wantToCallAgain ? callbackDate : undefined,
      callbackTime: wantToCallAgain ? callbackTime : undefined,
      stageBefore: callLoggingLead.status,
      stageAfter: stageAfterCall,
    });

    setCallLoggingLead(null);
    refreshLocalData();
  };

  const handleAddInboundLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundName.trim() || !inboundPhone.trim()) {
      alert('Please provide student name and phone number.');
      return;
    }

    StorageService.addSalesLead({
      name: inboundName.trim(),
      phoneNumber: inboundPhone.trim(),
      email: inboundEmail.trim() || undefined,
      organization: inboundOrg.trim() || undefined,
      programOfInterest: inboundProgram.trim() || undefined,
      priority: 'high',
      status: 'contacted',
      dealValue: 0,
      assignedToEmployeeId: currentUser.id || currentUser.teacherId,
      assignedToEmployeeName: currentUser.name,
      source: 'Direct Employee Inbound',
      notes: inboundNotes.trim() || undefined,
      tags: ['Inbound Direct'],
    });

    setShowAddInboundModal(false);
    setInboundName('');
    setInboundPhone('');
    setInboundEmail('');
    setInboundOrg('');
    setInboundProgram('');
    setInboundNotes('');
    refreshLocalData();
  };

  const metrics = useMemo(() => {
    const total = myLeads.length;
    const dueToday = todayQueueLeads.length;
    const won = myLeads.filter(l => l.status === 'closed_won').length;
    const inDiscussion = myLeads.filter(l => ['contacted', 'follow_up_scheduled', 'demo_scheduled', 'negotiation'].includes(l.status)).length;
    return { total, dueToday, won, inDiscussion };
  }, [myLeads, todayQueueLeads]);

  return (
    <div className="space-y-6">
      {/* ─── 1. TOP HEADER & METRICS ───────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 text-indigo-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                  My Sales Calling & Admissions CRM
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[10px] font-bold">
                  {currentUser.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute daily calls, log call feedback, and schedule candidate callbacks.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddInboundModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Inbound Inquiry</span>
          </button>
        </div>

        {/* Sales Calling KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-6">
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono block">
              Today's Call Queue
            </span>
            <div className="text-2xl md:text-3xl font-black text-amber-300 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{metrics.dueToday}</span>
            </div>
            <span className="text-[10px] text-amber-400/80 block">Callbacks due & new leads</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
              Assigned To Me
            </span>
            <div className="text-2xl md:text-3xl font-black text-slate-100">
              {metrics.total}
            </div>
            <span className="text-[10px] text-slate-500 block">Total entries</span>
          </div>

          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono block">
              In Discussion
            </span>
            <div className="text-2xl md:text-3xl font-black text-purple-300">
              {metrics.inDiscussion}
            </div>
            <span className="text-[10px] text-purple-400/80 block">Active counseling</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono block">
              Admissions Won
            </span>
            <div className="text-2xl md:text-3xl font-black text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" />
              <span>{metrics.won}</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 block">Successful enrollments</span>
          </div>
        </div>
      </div>

      {/* ─── 2. TABS & FILTER BAR ──────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Queue Tab Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Today's Call Queue ({todayQueueLeads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>All My Leads ({myLeads.length})</span>
            </button>
          </div>

          {/* Search & Stage Filters */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="all">All Stages</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── 3. LEADS LIST / CALL CARDS ─────────────────────────────────── */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-3xl">🎉</div>
            <p className="text-sm font-semibold text-slate-300">
              {activeTab === 'queue' ? "All caught up! No pending calls in today's queue." : "No leads assigned to you match this filter."}
            </p>
            <p className="text-xs text-slate-500">
              Check the "All My Leads" tab or ask your administrator to assign new candidate inquiries.
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const stageConfig = STATUS_LABELS[lead.status] || STATUS_LABELS.new;
            const priorityConfig = PRIORITY_BADGES[lead.priority] || PRIORITY_BADGES.medium;
            const isCallbackToday = lead.nextFollowUpDate === todayStr;

            return (
              <div
                key={lead.id}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-5 md:p-6 shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Candidate Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h3
                        onClick={() => setActiveDetailLead(lead)}
                        className="text-base font-bold text-slate-100 hover:text-indigo-400 cursor-pointer transition-colors"
                      >
                        {lead.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stageConfig.color}`}>
                        {stageConfig.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="font-mono text-slate-200 font-semibold">{lead.phoneNumber}</span>
                      {lead.organization && <span>🏫 {lead.organization}</span>}
                      {lead.programOfInterest && <span className="text-indigo-300 font-medium">📚 {lead.programOfInterest}</span>}
                      {lead.dealValue ? <span className="text-emerald-400 font-mono font-bold">₹{lead.dealValue.toLocaleString('en-IN')}</span> : null}
                    </div>
                  </div>

                  {/* Calling & Messaging Action Bar */}
                  <div className="flex items-center gap-2">
                    {/* Direct Call Button */}
                    <a
                      href={`tel:${lead.phoneNumber}`}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
                      title="Direct Phone Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>

                    {/* WhatsApp Button */}
                    <button
                      onClick={() => handleLaunchWhatsApp(lead)}
                      className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-all"
                      title="Launch WhatsApp Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Log Call Result & Schedule Callback */}
                    <button
                      onClick={() => handleOpenCallLogger(lead)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Log Call Remark</span>
                    </button>

                    <button
                      onClick={() => setActiveDetailLead(lead)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      title="View Profile & History"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Last Remark & Scheduled Follow-up Strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/60 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
                      Last Call Feedback
                    </span>
                    {lead.lastFeedback ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${lead.lastCallPicked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {lead.lastCallPicked ? 'Picked' : 'Not Picked'}
                        </span>
                        <p className="text-slate-300 truncate italic">
                          "{lead.lastFeedback}"
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No calls made yet • Tap "Call" or "Log Call Remark"</span>
                    )}
                  </div>

                  <div className="space-y-0.5 md:text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
                      Next Scheduled Callback
                    </span>
                    {lead.nextFollowUpDate ? (
                      <div className="flex items-center md:justify-end gap-1.5">
                        {isCallbackToday && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold animate-pulse">
                            DUE TODAY
                          </span>
                        )}
                        <span className="font-mono text-amber-300 font-bold">
                          {lead.nextFollowUpDate} at {lead.nextFollowUpTime || 'flexible'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No callback scheduled</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── 4. MODAL: LOG CALL REMARK & CALLBACK SCHEDULER ───────────── */}
      {callLoggingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono block">
                  Log Call Outcome & Follow-Up
                </span>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>{callLoggingLead.name}</span>
                  <span className="text-xs font-mono text-slate-400">({callLoggingLead.phoneNumber})</span>
                </h3>
              </div>
              <button
                onClick={() => setCallLoggingLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCallLog} className="space-y-4">
              {/* Question 1: Call Picked or Not Picked? */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Did the student / contact pick up the call?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCallPicked(true);
                      setCallDisposition('picked_interested');
                    }}
                    className={`py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                      callPicked
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>🟢 Call Picked</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCallPicked(false);
                      setCallDisposition('not_picked');
                    }}
                    className={`py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                      !callPicked
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <PhoneOff className="w-4 h-4 text-rose-400" />
                    <span>🔴 Not Picked / Busy</span>
                  </button>
                </div>
              </div>

              {/* Disposition Breakdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Call Disposition / Outcome
                </label>
                <select
                  value={callDisposition}
                  onChange={(e) => setCallDisposition(e.target.value as CallDisposition)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {callPicked ? (
                    <>
                      <option value="picked_interested">Picked - Interested / Discussion Ongoing</option>
                      <option value="picked_followup_requested">Picked - Follow-Up Requested by Candidate/Parent</option>
                      <option value="picked_not_interested">Picked - Not Interested / Already Enrolled Elsewhere</option>
                      <option value="picked_interested">Picked - Admission Fee Confirmed / Enrolled</option>
                    </>
                  ) : (
                    <>
                      <option value="not_picked">Not Picked - Kept Ringing / No Answer</option>
                      <option value="busy">Not Picked - Line Busy / Call Waiting</option>
                      <option value="switched_off">Not Picked - Switched Off / Out of Coverage</option>
                      <option value="wrong_number">Not Picked - Wrong Number</option>
                    </>
                  )}
                </select>
              </div>

              {/* Feedback & Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Feedback & Discussion Remarks *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={callPicked ? "Enter what student discussed, course questions, exam target, fee thoughts..." : "Reason why not picked, retry plan..."}
                  value={callFeedback}
                  onChange={(e) => setCallFeedback(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Update Pipeline Stage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Update Lead Stage
                </label>
                <select
                  value={stageAfterCall}
                  onChange={(e) => setStageAfterCall(e.target.value as SalesLeadStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Call Again / Callback Scheduler */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantToCallAgain}
                      onChange={(e) => setWantToCallAgain(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <span>Call Again / Schedule Callback?</span>
                  </label>
                </div>

                {wantToCallAgain && (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">
                          Callback Date
                        </label>
                        <input
                          type="date"
                          value={callbackDate}
                          onChange={(e) => setCallbackDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">
                          Callback Time
                        </label>
                        <input
                          type="time"
                          value={callbackTime}
                          onChange={(e) => setCallbackTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 font-mono">Quick:</span>
                      {[
                        { label: 'Today 4 PM', d: new Date().toISOString().split('T')[0], t: '16:00' },
                        { label: 'Today 6 PM', d: new Date().toISOString().split('T')[0], t: '18:00' },
                        { label: 'Tomorrow 11 AM', d: new Date(Date.now() + 86400000).toISOString().split('T')[0], t: '11:00' },
                        { label: 'Tomorrow 5 PM', d: new Date(Date.now() + 86400000).toISOString().split('T')[0], t: '17:00' },
                      ].map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            setCallbackDate(preset.d);
                            setCallbackTime(preset.t);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 font-mono border border-slate-800"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCallLoggingLead(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg"
                >
                  Save Call Remark & Re-queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 5. MODAL: ADD INBOUND INQUIRY ──────────────────────────────── */}
      {showAddInboundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Add Inbound Candidate Inquiry</span>
              </h3>
              <button onClick={() => setShowAddInboundModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInboundLead} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Student / Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ankit Sharma"
                  value={inboundName}
                  onChange={(e) => setInboundName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={inboundPhone}
                  onChange={(e) => setInboundPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">College / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. DTU / VIT"
                  value={inboundOrg}
                  onChange={(e) => setInboundOrg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Course / Program of Interest</label>
                <input
                  type="text"
                  placeholder="e.g. GATE CS 2026 Batch"
                  value={inboundProgram}
                  onChange={(e) => setInboundProgram(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Inbound Notes / Request</label>
                <textarea
                  rows={2}
                  placeholder="What candidate inquired about..."
                  value={inboundNotes}
                  onChange={(e) => setInboundNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInboundModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg"
                >
                  Add to My Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. DRAWER: LEAD DETAILS & CALL TIMELINE ──────────────────── */}
      {activeDetailLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono block">
                  Lead Profile & History
                </span>
                <h3 className="text-lg font-bold text-slate-100">{activeDetailLead.name}</h3>
              </div>
              <button
                onClick={() => setActiveDetailLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <a
                href={`tel:${activeDetailLead.phoneNumber}`}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Phone</span>
              </a>

              <button
                onClick={() => handleLaunchWhatsApp(activeDetailLead)}
                className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  const target = activeDetailLead;
                  setActiveDetailLead(null);
                  handleOpenCallLogger(target);
                }}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Log Remark</span>
              </button>
            </div>

            {/* Details */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono text-slate-100 font-semibold">{activeDetailLead.phoneNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">College:</span>
                <span className="text-slate-200">{activeDetailLead.organization || 'Individual'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Program:</span>
                <span className="text-indigo-300 font-semibold">{activeDetailLead.programOfInterest || 'General'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Stage:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_LABELS[activeDetailLead.status].color}`}>
                  {STATUS_LABELS[activeDetailLead.status].label}
                </span>
              </div>
              {activeDetailLead.nextFollowUpDate && (
                <div className="flex justify-between pb-1">
                  <span className="text-amber-400 font-medium">Scheduled Callback:</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {activeDetailLead.nextFollowUpDate} at {activeDetailLead.nextFollowUpTime || 'flexible'}
                  </span>
                </div>
              )}
            </div>

            {/* Past Call History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Call History & Discussion Timeline ({activeDetailLead.activityLogs?.length || 0})</span>
              </h4>

              {(!activeDetailLead.activityLogs || activeDetailLead.activityLogs.length === 0) ? (
                <div className="p-6 text-center text-slate-500 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                  No call remarks recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDetailLead.activityLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${log.callPicked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {log.callPicked ? '🟢 Call Picked' : '🔴 Not Picked'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-slate-300 pl-1 border-l-2 border-indigo-500/40">
                        "{log.feedback}"
                      </p>

                      {log.callbackDate && (
                        <div className="text-[10px] text-amber-300/90 font-mono flex items-center gap-1 pt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Callback: {log.callbackDate} {log.callbackTime || ''}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
