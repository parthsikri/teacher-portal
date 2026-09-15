import React, { useState, useMemo } from 'react';
import type { User, SalesLead, SalesLeadStatus, SalesLeadPriority, CallDisposition } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Phone, MessageSquare, Plus, Search, Upload, CheckCircle2,
  Clock, Calendar, ChevronRight, X, PhoneCall, PhoneOff,
  Shield, Briefcase
} from 'lucide-react';

interface AdminSalesCrmSectionProps {
  currentUser: User;
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

export const AdminSalesCrmSection: React.FC<AdminSalesCrmSectionProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [leads, setLeads] = useState<SalesLead[]>(StorageService.getSalesLeads());
  const [employees, setEmployees] = useState<User[]>(StorageService.getUsers());
  const [permissions, setPermissions] = useState(StorageService.getCrmPermissions());

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Selected leads for bulk actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('');

  // Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [activeDetailLead, setActiveDetailLead] = useState<SalesLead | null>(null);

  // Call Logging Modal State
  const [callLoggingLead, setCallLoggingLead] = useState<SalesLead | null>(null);
  const [callPicked, setCallPicked] = useState<boolean>(true);
  const [callDisposition, setCallDisposition] = useState<CallDisposition>('picked_interested');
  const [callFeedback, setCallFeedback] = useState<string>('');
  const [wantToCallAgain, setWantToCallAgain] = useState<boolean>(true);
  const [callbackDate, setCallbackDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [callbackTime, setCallbackTime] = useState<string>('15:00');
  const [stageAfterCall, setStageAfterCall] = useState<SalesLeadStatus>('contacted');

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phoneNumber: '',
    altPhoneNumber: '',
    email: '',
    organization: '',
    designation: '',
    programOfInterest: '',
    city: '',
    state: '',
    priority: 'medium' as SalesLeadPriority,
    status: 'new' as SalesLeadStatus,
    dealValue: '',
    assignedToEmployeeId: '',
    source: 'Direct Admin Entry',
    tags: '',
    notes: '',
  });

  // Bulk Import Form State
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkDefaultEmployeeId, setBulkDefaultEmployeeId] = useState('');
  const [bulkDefaultProgram, setBulkDefaultProgram] = useState('');

  const refreshLocalData = () => {
    setLeads(StorageService.getSalesLeads());
    setEmployees(StorageService.getUsers());
    setPermissions(StorageService.getCrmPermissions());
    if (onRefreshData) onRefreshData();
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const inDiscussion = leads.filter(l => ['contacted', 'follow_up_scheduled', 'demo_scheduled', 'proposal_sent', 'negotiation'].includes(l.status)).length;
    const won = leads.filter(l => l.status === 'closed_won').length;
    const totalPipelineValue = leads.reduce((acc, l) => acc + (Number(l.dealValue) || 0), 0);
    const wonValue = leads.filter(l => l.status === 'closed_won').reduce((acc, l) => acc + (Number(l.dealValue) || 0), 0);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const followUpsToday = leads.filter(l => l.nextFollowUpDate === todayStr && l.status !== 'closed_won' && l.status !== 'closed_lost').length;

    return {
      total,
      newLeads,
      inDiscussion,
      won,
      wonValue,
      totalPipelineValue,
      followUpsToday,
    };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedStage !== 'all' && lead.status !== selectedStage) return false;
      if (selectedPriority !== 'all' && lead.priority !== selectedPriority) return false;
      if (selectedEmployee !== 'all') {
        if (selectedEmployee === 'unassigned' && lead.assignedToEmployeeId) return false;
        if (selectedEmployee !== 'unassigned' && lead.assignedToEmployeeId !== selectedEmployee) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(q);
        const matchPhone = lead.phoneNumber.includes(q) || (lead.altPhoneNumber && lead.altPhoneNumber.includes(q));
        const matchEmail = lead.email?.toLowerCase().includes(q);
        const matchOrg = lead.organization?.toLowerCase().includes(q);
        const matchProg = lead.programOfInterest?.toLowerCase().includes(q);
        const matchCity = lead.city?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchOrg && !matchProg && !matchCity) {
          return false;
        }
      }
      return true;
    });
  }, [leads, selectedStage, selectedPriority, selectedEmployee, searchQuery]);

  // Clean phone number for WhatsApp / Phone Call
  const cleanPhoneForLink = (phone: string): string => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    return clean;
  };

  // Open WhatsApp with greeting
  const handleLaunchWhatsApp = (lead: SalesLead) => {
    const cleanPhone = cleanPhoneForLink(lead.phoneNumber);
    const greeting = `Hello ${lead.name}, this is ${currentUser.name} from Apna Engineering Wallah regarding your inquiry for ${lead.programOfInterest || 'our engineering courses'}. When would be a good time to connect?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank');
  };

  // Open Call Logging Modal
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

  // Submit Call Log
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

  // Handle Add Single Lead
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim() || !newLeadForm.phoneNumber.trim()) {
      alert('Please provide at least student name and primary phone number.');
      return;
    }

    const assignedEmp = employees.find(e => e.id === newLeadForm.assignedToEmployeeId || e.teacherId === newLeadForm.assignedToEmployeeId);

    StorageService.addSalesLead({
      name: newLeadForm.name.trim(),
      phoneNumber: newLeadForm.phoneNumber.trim(),
      altPhoneNumber: newLeadForm.altPhoneNumber.trim() || undefined,
      email: newLeadForm.email.trim() || undefined,
      organization: newLeadForm.organization.trim() || undefined,
      designation: newLeadForm.designation.trim() || undefined,
      programOfInterest: newLeadForm.programOfInterest.trim() || undefined,
      city: newLeadForm.city.trim() || undefined,
      state: newLeadForm.state.trim() || undefined,
      priority: newLeadForm.priority,
      status: newLeadForm.status,
      dealValue: Number(newLeadForm.dealValue) || 0,
      assignedToEmployeeId: assignedEmp ? (assignedEmp.id || assignedEmp.teacherId) : undefined,
      assignedToEmployeeName: assignedEmp ? assignedEmp.name : undefined,
      source: newLeadForm.source.trim() || 'Direct Admin Entry',
      tags: newLeadForm.tags ? newLeadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      notes: newLeadForm.notes.trim() || undefined,
    });

    setShowAddLeadModal(false);
    setNewLeadForm({
      name: '',
      phoneNumber: '',
      altPhoneNumber: '',
      email: '',
      organization: '',
      designation: '',
      programOfInterest: '',
      city: '',
      state: '',
      priority: 'medium',
      status: 'new',
      dealValue: '',
      assignedToEmployeeId: '',
      source: 'Direct Admin Entry',
      tags: '',
      notes: '',
    });
    refreshLocalData();
  };

  // Handle Bulk Import of Contacts / Phone Numbers
  const handleProcessBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkCsvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('Please paste at least one contact line.');
      return;
    }

    const assignedEmp = employees.find(e => e.id === bulkDefaultEmployeeId || e.teacherId === bulkDefaultEmployeeId);
    let importedCount = 0;

    lines.forEach((line) => {
      // Support comma, tab, or semicolon separated columns:
      // Format: Name, Phone, Email, College/Org, Program, Notes
      const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length === 0 || !parts[0]) return;

      const name = parts[0];
      const phone = parts[1] || '';
      const email = parts[2] || '';
      const organization = parts[3] || '';
      const program = parts[4] || bulkDefaultProgram || '';
      const notes = parts[5] || '';

      if (phone || name) {
        StorageService.addSalesLead({
          name: name || 'Student Contact',
          phoneNumber: phone,
          email: email || undefined,
          organization: organization || undefined,
          programOfInterest: program || undefined,
          priority: 'medium',
          status: 'new',
          dealValue: 0,
          assignedToEmployeeId: assignedEmp ? (assignedEmp.id || assignedEmp.teacherId) : undefined,
          assignedToEmployeeName: assignedEmp ? assignedEmp.name : undefined,
          source: 'Bulk Contact Import',
          notes: notes || undefined,
          tags: ['Bulk Imported'],
        });
        importedCount++;
      }
    });

    alert(`Successfully imported ${importedCount} contacts into Sales CRM!`);
    setShowBulkImportModal(false);
    setBulkCsvText('');
    refreshLocalData();
  };

  // Bulk Reassign selected leads
  const handleExecuteBulkAssign = () => {
    if (selectedLeadIds.length === 0) {
      alert('Select at least one lead from the table.');
      return;
    }
    if (!bulkAssigneeId) {
      alert('Please select an employee to assign the leads to.');
      return;
    }

    const targetEmp = employees.find(e => e.id === bulkAssigneeId || e.teacherId === bulkAssigneeId);
    if (!targetEmp) return;

    StorageService.bulkAssignSalesLeads(selectedLeadIds, targetEmp.id || targetEmp.teacherId, targetEmp.name);
    setSelectedLeadIds([]);
    setBulkAssigneeId('');
    refreshLocalData();
  };

  // Toggle Employee CRM Access
  const handleToggleEmployeeCrm = (empId: string, currentStatus: boolean) => {
    StorageService.setEmployeeCrmAccess(empId, !currentStatus);
    refreshLocalData();
  };

  // Select all checkbox
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. TOP HEADER & KPI METRICS BAR ───────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 text-indigo-400">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                  Sales CRM & Admissions Lead Engine
                </h1>
                <p className="text-xs text-slate-400">
                  Manage phone directories, assign leads to employees, log call remarks, and track admissions conversion.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-all shadow-md hover:border-slate-600"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Employee CRM Access</span>
            </button>

            <button
              onClick={() => setShowBulkImportModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-all shadow-md hover:border-slate-600"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Bulk Import Contacts</span>
            </button>

            <button
              onClick={() => setShowAddLeadModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Lead</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-6">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
              Total Inquiries
            </span>
            <div className="text-xl md:text-2xl font-black text-slate-100">
              {metrics.total}
            </div>
            <span className="text-[10px] text-slate-500 block">All time registered</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 space-y-1">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono block">
              New Leads
            </span>
            <div className="text-xl md:text-2xl font-black text-blue-300">
              {metrics.newLeads}
            </div>
            <span className="text-[10px] text-blue-400/80 block">Awaiting first call</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono block">
              Calls Due Today
            </span>
            <div className="text-xl md:text-2xl font-black text-amber-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{metrics.followUpsToday}</span>
            </div>
            <span className="text-[10px] text-amber-400/80 block">Scheduled callbacks</span>
          </div>

          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono block">
              In Discussion
            </span>
            <div className="text-xl md:text-2xl font-black text-purple-300">
              {metrics.inDiscussion}
            </div>
            <span className="text-[10px] text-purple-400/80 block">Active counseling</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono block">
              Closed Admissions
            </span>
            <div className="text-xl md:text-2xl font-black text-emerald-300">
              {metrics.won}
            </div>
            <span className="text-[10px] text-emerald-400/80 block">₹{metrics.wonValue.toLocaleString('en-IN')} revenue</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
              Pipeline Value
            </span>
            <div className="text-xl md:text-2xl font-black text-slate-100 truncate">
              ₹{metrics.totalPipelineValue.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 block">Potential admissions</span>
          </div>
        </div>
      </div>

      {/* ─── 2. SEARCH & CONTROLS TOOLBAR ─────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone (+91), college, program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Filter by Stage */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Stages ({leads.length})</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({leads.filter(l => l.status === k).length})
                </option>
              ))}
            </select>

            {/* Filter by Priority */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔥 Urgent ({leads.filter(l => l.priority === 'urgent').length})</option>
              <option value="high">High ({leads.filter(l => l.priority === 'high').length})</option>
              <option value="medium">Medium ({leads.filter(l => l.priority === 'medium').length})</option>
              <option value="low">Low ({leads.filter(l => l.priority === 'low').length})</option>
            </select>

            {/* Filter by Assigned Employee */}
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Employees</option>
              <option value="unassigned">Unassigned ({leads.filter(l => !l.assignedToEmployeeId).length})</option>
              {employees.map((emp) => (
                <option key={emp.id || emp.teacherId} value={emp.id || emp.teacherId}>
                  {emp.name} ({leads.filter(l => l.assignedToEmployeeId === (emp.id || emp.teacherId)).length})
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pipeline Board
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Assignment Bar when leads are checked */}
        {selectedLeadIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold font-mono">
              <span>✓</span>
              <span>{selectedLeadIds.length} leads selected for bulk action</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bulkAssigneeId}
                onChange={(e) => setBulkAssigneeId(e.target.value)}
                className="bg-slate-900 border border-indigo-500/40 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="">Assign To Employee...</option>
                {employees.map(emp => (
                  <option key={emp.id || emp.teacherId} value={emp.id || emp.teacherId}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>

              <button
                onClick={handleExecuteBulkAssign}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow"
              >
                Apply Assignment
              </button>

              <button
                onClick={() => setSelectedLeadIds([])}
                className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. LEADS TABLE VIEW ────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                  </th>
                  <th className="p-4">Student / Contact</th>
                  <th className="p-4">Phone & Channels</th>
                  <th className="p-4">Program / College</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Assigned Employee</th>
                  <th className="p-4">Next Call / Remark</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500 space-y-2">
                      <div className="text-3xl">📭</div>
                      <p className="text-sm font-semibold text-slate-400">No leads match your current search or filter.</p>
                      <p className="text-xs">Add a new lead or click "Bulk Import Contacts" to populate your pipeline.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLeadIds.includes(lead.id);
                    const stageConfig = STATUS_LABELS[lead.status] || STATUS_LABELS.new;
                    const priorityConfig = PRIORITY_BADGES[lead.priority] || PRIORITY_BADGES.medium;

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-slate-850/50 transition-colors ${
                          isSelected ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLead(lead.id)}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                          />
                        </td>

                        {/* Name & Priority */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <button
                              onClick={() => setActiveDetailLead(lead)}
                              className="font-bold text-slate-100 hover:text-indigo-400 transition-colors text-sm text-left flex items-center gap-1.5"
                            >
                              <span>{lead.name}</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${priorityConfig.color}`}>
                                {priorityConfig.label}
                              </span>
                              {lead.dealValue ? (
                                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                                  ₹{lead.dealValue.toLocaleString('en-IN')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Phone & Direct Omnichannel Actions */}
                        <td className="p-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 font-mono text-slate-200 font-semibold">
                              <span>{lead.phoneNumber}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Click to Call */}
                              <a
                                href={`tel:${lead.phoneNumber}`}
                                title="Click to Call"
                                className="px-2 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1 transition-all"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call</span>
                              </a>

                              {/* Click to WhatsApp */}
                              <button
                                onClick={() => handleLaunchWhatsApp(lead)}
                                title="Send WhatsApp Message"
                                className="px-2 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1 transition-all"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Program & College */}
                        <td className="p-4">
                          <div className="space-y-1 max-w-[200px]">
                            <span className="font-semibold text-slate-200 block truncate" title={lead.programOfInterest}>
                              {lead.programOfInterest || 'General Admission'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate" title={lead.organization}>
                              {lead.organization || lead.city || 'Individual'}
                            </span>
                          </div>
                        </td>

                        {/* Pipeline Stage */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${stageConfig.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotColor}`} />
                            <span>{stageConfig.label}</span>
                          </span>
                        </td>

                        {/* Assigned Employee */}
                        <td className="p-4">
                          {lead.assignedToEmployeeName ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px]">
                                {lead.assignedToEmployeeName.charAt(0)}
                              </span>
                              <span className="text-xs text-slate-200 font-medium">
                                {lead.assignedToEmployeeName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-400/80 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Next Call & Last Remark */}
                        <td className="p-4">
                          <div className="space-y-1 max-w-[220px]">
                            {lead.nextFollowUpDate ? (
                              <div className="flex items-center gap-1 text-[11px] text-amber-300 font-mono font-semibold">
                                <Calendar className="w-3 h-3" />
                                <span>{lead.nextFollowUpDate} {lead.nextFollowUpTime || ''}</span>
                              </div>
                            ) : null}

                            {lead.lastFeedback ? (
                              <p className="text-[11px] text-slate-400 truncate italic" title={lead.lastFeedback}>
                                "{lead.lastFeedback}"
                              </p>
                            ) : (
                              <span className="text-[10px] text-slate-500">No calls logged yet</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenCallLogger(lead)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow transition-all"
                              title="Log Call Result & Schedule Follow-Up"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Log Call</span>
                            </button>

                            <button
                              onClick={() => setActiveDetailLead(lead)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                              title="View Details"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 4. KANBAN PIPELINE BOARD VIEW ───────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['new', 'contacted', 'follow_up_scheduled', 'closed_won'] as SalesLeadStatus[]).map((stageKey) => {
            const stageLeads = filteredLeads.filter(l => l.status === stageKey);
            const config = STATUS_LABELS[stageKey];

            return (
              <div key={stageKey} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col h-full space-y-3 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
                    <span className="font-bold text-xs text-slate-200 tracking-wide uppercase">
                      {config.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/40 space-y-2.5 transition-all shadow-sm group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4
                              onClick={() => setActiveDetailLead(lead)}
                              className="font-bold text-slate-100 hover:text-indigo-400 cursor-pointer text-xs transition-colors"
                            >
                              {lead.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {lead.phoneNumber}
                            </span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${PRIORITY_BADGES[lead.priority].color}`}>
                            {PRIORITY_BADGES[lead.priority].label}
                          </span>
                        </div>

                        {lead.programOfInterest && (
                          <div className="text-[11px] text-slate-300 truncate font-medium">
                            📚 {lead.programOfInterest}
                          </div>
                        )}

                        {lead.nextFollowUpDate && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-300 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>Callback: {lead.nextFollowUpDate} {lead.nextFollowUpTime || ''}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                            👤 {lead.assignedToEmployeeName || 'Unassigned'}
                          </span>

                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${lead.phoneNumber}`}
                              className="p-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300"
                              title="Call"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => handleLaunchWhatsApp(lead)}
                              className="p-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleOpenCallLogger(lead)}
                              className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white"
                              title="Log Call"
                            >
                              <PhoneCall className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 5. MODAL: CALL REMARK, DISPOSITION & CALLBACK SCHEDULER ──────── */}
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
                    <span>🟢 Call Picked (Connected)</span>
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
                  Call Disposition / Status
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
                      <option value="picked_interested">Picked - Admission Fee Confirmed / Ready to Pay</option>
                    </>
                  ) : (
                    <>
                      <option value="not_picked">Not Picked - Kept Ringing / No Answer</option>
                      <option value="busy">Not Picked - Line Busy / Call Waiting</option>
                      <option value="switched_off">Not Picked - Switched Off / Out of Coverage</option>
                      <option value="wrong_number">Not Picked - Wrong Number / Invalid</option>
                    </>
                  )}
                </select>
              </div>

              {/* Feedback & Detailed Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Feedback & Discussion Remarks *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={callPicked ? "Enter what student discussed, questions asked, fee objections, exam readiness..." : "Notes on why not picked, previous attempts..."}
                  value={callFeedback}
                  onChange={(e) => setCallFeedback(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Update Pipeline Stage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Update Lead Pipeline Stage
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
                    <span>Schedule Callback / Call Again?</span>
                  </label>
                  {wantToCallAgain && (
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      Will queue for notification
                    </span>
                  )}
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

                    {/* Quick Time Presets */}
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
                  Save Call Outcome & Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. MODAL: EMPLOYEE CRM ACCESS & VISIBILITY ────────────────── */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono block">
                  Access Governance
                </span>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <span>Configure Employee CRM Visibility</span>
                </h3>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Control which employees (teachers, PR interns, web developers, sales reps) are permitted to see the Sales CRM tab in their portal navigation. When enabled, employees only see the leads assigned to them.
            </p>

            <div className="overflow-x-auto max-h-96 border border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[10px] uppercase font-mono text-slate-400">
                  <tr>
                    <th className="p-3">Employee Name</th>
                    <th className="p-3">Role / Department</th>
                    <th className="p-3 text-center">Assigned Leads</th>
                    <th className="p-3 text-right">CRM Visibility Switch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees.map((emp) => {
                    const empId = emp.id || emp.teacherId;
                    const isStaffAdmin = emp.role === 'admin';
                    const hasAccess = isStaffAdmin || Boolean(emp.hasCrmAccess) || Boolean(permissions[empId]?.hasCrmAccess);
                    const leadCount = leads.filter(l => l.assignedToEmployeeId === empId || l.assignedToEmployeeId === emp.id).length;

                    return (
                      <tr key={empId} className="hover:bg-slate-850">
                        <td className="p-3">
                          <span className="font-bold text-slate-200 block">{emp.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{emp.teacherId}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                            {emp.role}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-200">
                          {leadCount}
                        </td>
                        <td className="p-3 text-right">
                          {isStaffAdmin ? (
                            <span className="text-[10px] text-indigo-400 font-mono font-bold">
                              Full Master Access (Admin)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleEmployeeCrm(empId, hasAccess)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                hasAccess
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {hasAccess ? '✓ Enabled' : 'Disabled'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. MODAL: ADD SINGLE NEW LEAD ──────────────────────────────── */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Add New Candidate / Inquiry</span>
              </h3>
              <button onClick={() => setShowAddLeadModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Student / Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siddharth Verma"
                    value={newLeadForm.name}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Primary Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={newLeadForm.phoneNumber}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phoneNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Alternate Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="Parent / Alternate number"
                    value={newLeadForm.altPhoneNumber}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, altPhoneNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="student@gmail.com"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">College / Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. DTU / VIT / NSUT"
                    value={newLeadForm.organization}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, organization: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Course / Program of Interest</label>
                  <input
                    type="text"
                    placeholder="e.g. GATE CS 2026 / OS Masterclass"
                    value={newLeadForm.programOfInterest}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, programOfInterest: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Assign To Employee</label>
                  <select
                    value={newLeadForm.assignedToEmployeeId}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, assignedToEmployeeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Leave Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id || emp.teacherId} value={emp.id || emp.teacherId}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Estimated Deal Value (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 18500"
                    value={newLeadForm.dealValue}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, dealValue: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Priority</label>
                  <select
                    value={newLeadForm.priority}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, priority: e.target.value as SalesLeadPriority })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">🔥 Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Initial Pipeline Stage</label>
                  <select
                    value={newLeadForm.status}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value as SalesLeadStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Initial Notes / Source Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Any details candidate shared about their target exam date, budget..."
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg"
                >
                  Save Lead to CRM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 8. MODAL: BULK IMPORT CONTACTS / PHONE NUMBERS ────────────── */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <span>Bulk Import Phone Numbers & Contacts</span>
              </h3>
              <button onClick={() => setShowBulkImportModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste contacts from Excel, Google Sheets, or CSV. Each line should contain values separated by commas or tabs:
              <br />
              <code className="text-indigo-300 font-mono text-[11px] block mt-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
                Name, Phone, Email, College/Organization, Program, Notes
              </code>
            </p>

            <form onSubmit={handleProcessBulkImport} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Assign All Imported Leads To:</label>
                  <select
                    value={bulkDefaultEmployeeId}
                    onChange={(e) => setBulkDefaultEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Leave Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id || emp.teacherId} value={emp.id || emp.teacherId}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Default Program / Course:</label>
                  <input
                    type="text"
                    placeholder="e.g. GATE CS 2026 Batch"
                    value={bulkDefaultProgram}
                    onChange={(e) => setBulkDefaultProgram(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Paste Contact Rows (1 row per contact):
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={`Rahul Sharma, 9876543210, rahul@gmail.com, DTU, GATE CS, Inquired about discount\nPooja Verma, 9123456780, pooja@vit.ac.in, VIT, Web Dev, Placement batch`}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg"
                >
                  Import All Contacts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 9. DRAWER: LEAD DETAILS & AUDIT TIMELINE ─────────────────── */}
      {activeDetailLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-5 shadow-2xl animate-in slide-in-from-right duration-200">
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

            {/* Quick Actions Strip */}
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

            {/* Information Grid */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono text-slate-100 font-semibold">{activeDetailLead.phoneNumber}</span>
              </div>
              {activeDetailLead.altPhoneNumber && (
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Alt Phone:</span>
                  <span className="font-mono text-slate-200">{activeDetailLead.altPhoneNumber}</span>
                </div>
              )}
              {activeDetailLead.email && (
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-200">{activeDetailLead.email}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">College / Org:</span>
                <span className="text-slate-200 font-medium">{activeDetailLead.organization || 'Individual'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Program:</span>
                <span className="text-indigo-300 font-semibold">{activeDetailLead.programOfInterest || 'General Admission'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Stage:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_LABELS[activeDetailLead.status].color}`}>
                  {STATUS_LABELS[activeDetailLead.status].label}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Assigned To:</span>
                <span className="text-slate-200 font-bold">{activeDetailLead.assignedToEmployeeName || 'Unassigned'}</span>
              </div>
              {activeDetailLead.dealValue ? (
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Deal Value:</span>
                  <span className="text-emerald-400 font-mono font-bold">₹{activeDetailLead.dealValue.toLocaleString('en-IN')}</span>
                </div>
              ) : null}
              {activeDetailLead.nextFollowUpDate && (
                <div className="flex justify-between pb-1">
                  <span className="text-amber-400 font-medium">Scheduled Follow-up:</span>
                  <span className="text-amber-300 font-mono font-bold">{activeDetailLead.nextFollowUpDate} {activeDetailLead.nextFollowUpTime || ''}</span>
                </div>
              )}
            </div>

            {/* Conversation History & Activity Logs */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Call Logs & Conversation Timeline ({activeDetailLead.activityLogs?.length || 0})</span>
              </h4>

              {(!activeDetailLead.activityLogs || activeDetailLead.activityLogs.length === 0) ? (
                <div className="p-6 text-center text-slate-500 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                  No call remarks recorded yet. Click "Log Remark" to add call notes.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDetailLead.activityLogs.map((log) => (
                    <div key={log.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {log.callPicked ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-mono">
                              🟢 Picked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold font-mono">
                              🔴 Not Picked
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-200">
                            {log.authorName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-slate-300 leading-relaxed pl-1 border-l-2 border-indigo-500/40">
                        "{log.feedback}"
                      </p>

                      {log.callbackDate && (
                        <div className="text-[10px] text-amber-400/90 font-mono flex items-center gap-1 pt-1">
                          <Clock className="w-3 h-3" />
                          <span>Callback requested for: {log.callbackDate} {log.callbackTime || ''}</span>
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
