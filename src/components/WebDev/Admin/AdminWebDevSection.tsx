import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Download,
  AlertTriangle,
  Briefcase,
  FileText,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Crown,
  X,
  Check,
  Timer,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  User,
  WebDevTask,
  WebDevProject,
  WebDevAuditLog,
  WebDevRewardFulfillment,
  WebDevTaskPriority,
  WebDevTaskType,
} from '../../../types';
import { WebDevService } from '../../../services/webDevService';
import { StorageService } from '../../../services/storage';
import { TaskDetailModal } from '../Common/TaskDetailModal';

interface AdminWebDevSectionProps {
  currentUser: User;
  onSwitchUserRole?: (targetRole: 'web_dev_manager' | 'web_developer') => void;
}

export const AdminWebDevSection: React.FC<AdminWebDevSectionProps> = ({
  currentUser,
}) => {
  const [tasks, setTasks] = useState<WebDevTask[]>([]);
  const [projects, setProjects] = useState<WebDevProject[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<WebDevAuditLog[]>([]);
  const [fulfillments, setFulfillments] = useState<WebDevRewardFulfillment[]>([]);

  // Filter states for the All-Work Master Table
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDeveloper, setFilterDeveloper] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterTimeStatus, setFilterTimeStatus] = useState('all');

  // Sub-tabs
  const [activeSection, setActiveSection] = useState<'all_work' | 'projects_health' | 'audit_trail'>('all_work');

  // Task drawer modal
  const [selectedTask, setSelectedTask] = useState<WebDevTask | null>(null);

  // ─── ADMIN TASK ASSIGNMENT MODAL STATE ────────────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDescription, setAssignDescription] = useState('');
  const [assignPriority, setAssignPriority] = useState<WebDevTaskPriority>('high');
  const [assignType, setAssignType] = useState<WebDevTaskType | string>('management');
  const [assignXp, setAssignXp] = useState<number>(300);
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignTags, setAssignTags] = useState('admin-assigned, management');
  const [assignSubtasks, setAssignSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // ─── TIME-BASED EVALUATION MODAL STATE ────────────────────────────────────
  const [timeEvalTask, setTimeEvalTask] = useState<WebDevTask | null>(null);
  const [evalStatus, setEvalStatus] = useState<'on_time' | 'late' | 'not_done'>('on_time');
  const [evalXp, setEvalXp] = useState<number>(250);
  const [evalNotes, setEvalNotes] = useState('');

  const loadData = () => {
    const allTasks = WebDevService.getTasks();
    const allProjects = WebDevService.getProjects();
    const allDevs = StorageService.getUsers().filter(
      (u) => u.role === 'web_developer' || u.role === 'web_dev_manager'
    );
    const allLogs = WebDevService.getAuditLogs();
    const allFul = WebDevService.getRewardFulfillments();

    setTasks(allTasks);
    setProjects(allProjects);
    setDevelopers(allDevs);
    setAuditLogs(allLogs);
    setFulfillments(allFul);

    // Default assignee to first Web Dev Manager if assign modal is opened
    const firstManager = allDevs.find((u) => u.role === 'web_dev_manager');
    if (firstManager && !assigneeId) {
      setAssigneeId(firstManager.teacherId);
    } else if (allDevs.length > 0 && !assigneeId) {
      setAssigneeId(allDevs[0].teacherId);
    }
    if (allProjects.length > 0 && !assignProjectId) {
      setAssignProjectId(allProjects[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper for computing time & deadline status
  const getTimeStatusInfo = (task: WebDevTask) => {
    if (task.completionStatus === 'on_time') {
      return {
        label: 'Done (On-Time)',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        badgeColor: 'text-emerald-400',
        icon: '✅',
        isDone: true,
      };
    }
    if (task.completionStatus === 'late') {
      return {
        label: 'Done (Late)',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        badgeColor: 'text-amber-400',
        icon: '⏰',
        isDone: true,
      };
    }
    if (task.status === 'not_done' || task.completionStatus === 'not_done') {
      return {
        label: 'Not Done (Missed)',
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        badgeColor: 'text-rose-400',
        icon: '❌',
        isDone: true,
      };
    }
    if (task.status === 'completed') {
      return {
        label: 'Done',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        badgeColor: 'text-emerald-400',
        icon: '✅',
        isDone: true,
      };
    }

    const dVal = task.deadline || task.dueDate;
    if (!dVal) {
      return {
        label: 'No Deadline',
        color: 'bg-slate-800 text-slate-400 border-slate-700',
        badgeColor: 'text-slate-400',
        icon: '—',
        isDone: false,
      };
    }

    const dTime = new Date(dVal).getTime();
    const now = new Date().getTime();
    const diffHours = Math.round((dTime - now) / (1000 * 60 * 60));

    if (diffHours < 0) {
      const overdueDays = Math.max(1, Math.abs(Math.round(diffHours / 24)));
      return {
        label: `Overdue (${overdueDays}d late)`,
        color: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse',
        badgeColor: 'text-red-400',
        icon: '⚠️',
        isDone: false,
        isOverdue: true,
      };
    } else if (diffHours <= 24) {
      return {
        label: `Due Soon (${diffHours}h left)`,
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        badgeColor: 'text-amber-400',
        icon: '⏳',
        isDone: false,
        isDueSoon: true,
      };
    } else {
      const daysLeft = Math.round(diffHours / 24);
      return {
        label: `On Track (${daysLeft}d left)`,
        color: 'bg-slate-800 text-slate-300 border-slate-700',
        badgeColor: 'text-emerald-400',
        icon: '🟢',
        isDone: false,
      };
    }
  };

  // Filtered All-Work
  const filteredTasks = tasks.filter((t) => {
    if (filterDeveloper !== 'all' && t.assigneeId !== filterDeveloper) return false;
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    
    // Time Status Filter
    if (filterTimeStatus !== 'all') {
      if (filterTimeStatus === 'on_time' && t.completionStatus !== 'on_time') return false;
      if (filterTimeStatus === 'late' && t.completionStatus !== 'late') return false;
      if (filterTimeStatus === 'not_done' && (t.status !== 'not_done' && t.completionStatus !== 'not_done')) return false;
      if (filterTimeStatus === 'pending' && (t.status === 'completed' || t.status === 'not_done')) return false;
      if (filterTimeStatus === 'overdue') {
        const dVal = t.deadline || t.dueDate;
        if (!dVal || t.status === 'completed' || t.status === 'not_done') return false;
        if (new Date(dVal).getTime() >= new Date().getTime()) return false;
      }
    }

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

  // KPIs
  const totalAwardedXp = WebDevService.getXPLedger().reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalBlocked = tasks.filter((t) => t.isBlocked).length;
  const totalCompleted = tasks.filter((t) => t.status === 'completed').length;
  const totalInReview = tasks.filter((t) => t.status === 'review_requested').length;
  const totalCertsIssued = fulfillments.filter((f) => f.status === 'fulfilled' && f.certificateId).length;

  // Export CSV of All Work
  const handleExportCsv = () => {
    const headers = [
      'Task ID',
      'Title',
      'Project ID',
      'Assignee ID',
      'Assignee Name',
      'Assignee Role',
      'Assigned By',
      'Priority',
      'Type',
      'Status',
      'Time Evaluation',
      'Base XP',
      'Actual XP Awarded',
      'Due Date / Deadline',
      'Is Blocked',
      'Blocker Reason',
      'GitHub PR',
    ];

    const rows = filteredTasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.projectId,
      t.assigneeId || '',
      `"${(t.assigneeName || '').replace(/"/g, '""')}"`,
      t.assigneeRole || '',
      `"${(t.assignedByName || '').replace(/"/g, '""')}"`,
      t.priority,
      t.type,
      t.status,
      t.completionStatus || 'pending',
      t.xpReward,
      t.actualXpAwarded !== undefined ? t.actualXpAwarded : (t.status === 'completed' ? t.xpReward : 0),
      t.deadline || t.dueDate || '',
      t.isBlocked ? 'YES' : 'NO',
      `"${(t.blockerReason || '').replace(/"/g, '""')}"`,
      t.githubPrUrl || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AEW_WebDev_Master_Work_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── HANDLER: ADMIN CREATES & ASSIGNS TASK ──────────────────────────────
  const handleAdminCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim()) return;

    const assignedUser = developers.find((d) => d.teacherId === assigneeId);
    const taskId = `ADM-TASK-${Date.now().toString().slice(-4)}`;
    const subtasksList = assignSubtasks.map((st, idx) => ({
      id: `sub-${Date.now()}-${idx + 1}`,
      taskId,
      title: st,
      completed: false,
    }));

    const tagsArr = assignTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!tagsArr.includes('admin-assigned')) {
      tagsArr.unshift('admin-assigned');
    }

    WebDevService.saveTask(
      {
        id: taskId,
        projectId: assignProjectId || (projects[0]?.id || 'core_platform'),
        title: assignTitle.trim(),
        description: assignDescription.trim(),
        type: assignType,
        priority: assignPriority,
        status: 'in_progress',
        xpReward: Number(assignXp) || 300,
        assigneeId: assignedUser?.teacherId,
        assigneeName: assignedUser?.name,
        assigneeRole: assignedUser?.role,
        reviewerId: currentUser.teacherId,
        reviewerName: currentUser.name,
        assignedById: currentUser.teacherId,
        assignedByName: currentUser.name,
        assignedByRole: currentUser.role,
        dueDate: assignDeadline || undefined,
        deadline: assignDeadline || undefined,
        tags: tagsArr,
        subtasks: subtasksList,
        isBlocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { id: currentUser.teacherId, name: currentUser.name }
    );

    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } catch {}

    setShowAssignModal(false);
    setAssignTitle('');
    setAssignDescription('');
    setAssignSubtasks([]);
    setSubtaskInput('');
    setAssignDeadline('');
    setAssignXp(300);
    loadData();
  };

  // Quick deadline helpers for modal
  const setQuickDeadline = (hoursFromNow: number) => {
    const target = new Date();
    target.setHours(target.getHours() + hoursFromNow);
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
    setAssignDeadline(localISOTime);
  };

  // ─── HANDLER: OPEN TIME-BASED EVALUATION MODAL ───────────────────────────
  const openTimeEvalModal = (t: WebDevTask) => {
    setTimeEvalTask(t);
    const dVal = t.deadline || t.dueDate;
    const isLate = dVal ? new Date().getTime() > new Date(dVal).getTime() : false;
    const baseReward = t.xpReward || 200;

    if (t.completionStatus === 'on_time') {
      setEvalStatus('on_time');
      setEvalXp(t.actualXpAwarded !== undefined ? t.actualXpAwarded : baseReward);
    } else if (t.completionStatus === 'late') {
      setEvalStatus('late');
      setEvalXp(t.actualXpAwarded !== undefined ? t.actualXpAwarded : Math.round(baseReward * 0.7));
    } else if (t.status === 'not_done' || t.completionStatus === 'not_done') {
      setEvalStatus('not_done');
      setEvalXp(0);
    } else {
      // Intelligently suggest based on current time vs deadline
      if (isLate) {
        setEvalStatus('late');
        setEvalXp(Math.round(baseReward * 0.7)); // 70% for late completion
      } else {
        setEvalStatus('on_time');
        setEvalXp(baseReward); // 100% on time
      }
    }
    setEvalNotes(t.timeMarkedNote || '');
  };

  const handleSaveTimeEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeEvalTask) return;

    WebDevService.markTaskTimeBasedStatus(timeEvalTask.id, {
      status: evalStatus,
      xpAwarded: evalStatus === 'not_done' ? 0 : evalXp,
      notes: evalNotes,
      evaluator: {
        id: currentUser.teacherId,
        name: currentUser.name,
        role: currentUser.role,
      },
    });

    if (evalStatus !== 'not_done') {
      try {
        confetti({ particleCount: 75, spread: 75, origin: { y: 0.6 } });
      } catch {}
    }

    setTimeEvalTask(null);
    loadData();
  };

  const managersList = developers.filter((d) => d.role === 'web_dev_manager');
  const devsList = developers.filter((d) => d.role === 'web_developer');

  return (
    <div className="space-y-8">
      {/* ─── EXECUTIVE WAR ROOM HEADER ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                Admin War Room
              </span>
              <span className="text-xs text-slate-400">Web Development Management Oversight</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Engineering Division Master Operations
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Assign strategic software deliverables directly to Web Dev Managers, govern sprint velocity, and perform time-based milestone evaluations with XP stakes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const firstMgr = developers.find((d) => d.role === 'web_dev_manager');
                if (firstMgr) setAssigneeId(firstMgr.teacherId);
                setShowAssignModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              Assign Task to Web Dev Manager / Dev
            </button>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export Work Master CSV
            </button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-400">Projects</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{projects.length}</div>
            <div className="text-[10px] text-slate-500">Active initiatives</div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Web Dev Managers
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
              {managersList.length}
            </div>
            <div className="text-[10px] text-slate-400">
              +{devsList.length} Developers
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Tasks</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{tasks.length}</div>
            <div className="text-[10px] text-emerald-400 font-medium">{totalCompleted} shipped</div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-amber-400">Under Review</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{totalInReview}</div>
            <div className="text-[10px] text-slate-500">Awaiting clearance</div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-red-400">Blockers</div>
            <div className={`text-xl sm:text-2xl font-black mt-0.5 ${totalBlocked > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {totalBlocked}
            </div>
            <div className="text-[10px] text-slate-500">Impediments</div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-purple-400">Total XP Issued</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
              {totalAwardedXp.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">{totalCertsIssued} verified certs</div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-800 pt-4">
          <button
            onClick={() => setActiveSection('all_work')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSection === 'all_work'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            All-Work Master Table ({tasks.length})
          </button>

          <button
            onClick={() => setActiveSection('projects_health')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSection === 'projects_health'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Project Health & Roadmap
          </button>

          <button
            onClick={() => setActiveSection('audit_trail')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSection === 'audit_trail'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Web Dev Audit Trail
          </button>
        </div>
      </div>

      {/* ─── VIEW 1: ALL-WORK MASTER TABLE ──────────────────────────────────── */}
      {activeSection === 'all_work' && (
        <div className="space-y-4">
          {/* Master Filters Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by task title, description, developer, #tags..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterDeveloper}
                  onChange={(e) => setFilterDeveloper(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Assignees</option>
                  <optgroup label="👑 Web Dev Managers">
                    {managersList.map((d) => (
                      <option key={d.teacherId} value={d.teacherId}>
                        👑 {d.name} (Manager)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="💻 Web Developers">
                    {devsList.map((d) => (
                      <option key={d.teacherId} value={d.teacherId}>
                        💻 {d.name}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <select
                  value={filterTimeStatus}
                  onChange={(e) => setFilterTimeStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">⏱️ All Time Statuses</option>
                  <option value="on_time">✅ Done (On-Time)</option>
                  <option value="late">⏰ Done (Late)</option>
                  <option value="not_done">❌ Not Done (Missed)</option>
                  <option value="overdue">⚠️ Overdue Active Tasks</option>
                  <option value="pending">⏳ Pending / In-Flight</option>
                </select>

                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review_requested">Under Review</option>
                  <option value="changes_requested">Changes Requested</option>
                  <option value="completed">Completed</option>
                  <option value="not_done">Not Done / Missed</option>
                  <option value="blocked">Blocked</option>
                  <option value="todo">To Do</option>
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>
                Showing <strong>{filteredTasks.length}</strong> of <strong>{tasks.length}</strong> tasks
              </span>
              {(filterDeveloper !== 'all' ||
                filterProject !== 'all' ||
                filterStatus !== 'all' ||
                filterPriority !== 'all' ||
                filterType !== 'all' ||
                filterTimeStatus !== 'all' ||
                searchQuery) && (
                <button
                  onClick={() => {
                    setFilterDeveloper('all');
                    setFilterProject('all');
                    setFilterStatus('all');
                    setFilterPriority('all');
                    setFilterType('all');
                    setFilterTimeStatus('all');
                    setSearchQuery('');
                  }}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* Master Table Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Task ID</th>
                    <th className="py-3.5 px-4">Project</th>
                    <th className="py-3.5 px-4">Deliverable Title</th>
                    <th className="py-3.5 px-4">Assignee</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Deadline & Timing</th>
                    <th className="py-3.5 px-4 text-right">XP</th>
                    <th className="py-3.5 px-4 text-center">Time Evaluation</th>
                    <th className="py-3.5 px-4 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        No tasks matched your current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => {
                      const proj = projects.find((p) => p.id === t.projectId);
                      const timeInfo = getTimeStatusInfo(t);
                      const isManager =
                        t.assigneeRole === 'web_dev_manager' ||
                        developers.find((d) => d.teacherId === t.assigneeId)?.role === 'web_dev_manager';

                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {t.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {proj?.key || t.projectId}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white max-w-sm truncate flex items-center gap-1.5">
                              {t.title}
                              {t.assignedByRole === 'admin' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Admin Assigned
                                </span>
                              )}
                            </div>
                            {t.isBlocked && (
                              <div className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                Blocked: {t.blockerReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {isManager ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5" />
                                  Manager
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                  Dev
                                </span>
                              )}
                              <span className="text-slate-200 font-medium">
                                {t.assigneeName || 'Unassigned'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.priority === 'critical'
                                  ? 'bg-red-500/20 text-red-400'
                                  : t.priority === 'high'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : t.status === 'not_done'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : t.status === 'review_requested'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : t.status === 'changes_requested'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : t.status === 'blocked'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {t.deadline || t.dueDate ? (
                                  new Date(t.deadline || t.dueDate || '').toLocaleString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                ) : (
                                  <span className="text-slate-600">No deadline</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${timeInfo.color}`}
                                >
                                  {timeInfo.icon} {timeInfo.label}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-bold text-amber-400">
                              +{t.xpReward} XP
                            </div>
                            {t.actualXpAwarded !== undefined && t.actualXpAwarded !== t.xpReward && (
                              <div className="text-[10px] text-slate-400">
                                Awarded: <strong className="text-emerald-300">+{t.actualXpAwarded} XP</strong>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTimeEvalModal(t);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                              title="Mark task as Done (On-Time), Done (Late), or Not Done"
                            >
                              <Timer className="w-3 h-3 text-amber-400" />
                              Mark / Evaluate
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-slate-400 hover:text-white">
                              <ChevronRight className="w-4 h-4 inline" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW 2: PROJECTS HEALTH & MATRIX ───────────────────────────────── */}
      {activeSection === 'projects_health' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map((p) => {
            const pTasks = tasks.filter((t) => t.projectId === p.id);
            const pCompleted = pTasks.filter((t) => t.status === 'completed').length;
            const pBlocked = pTasks.filter((t) => t.isBlocked).length;
            const pReview = pTasks.filter((t) => t.status === 'review_requested').length;
            const milestones = WebDevService.getMilestones(p.id);

            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                      {p.key}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">{p.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                    {p.progressPercentage}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Tasks</div>
                    <div className="font-bold text-white mt-0.5">{pTasks.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Shipped</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{pCompleted}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">In Review</div>
                    <div className="font-bold text-amber-400 mt-0.5">{pReview}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Blocked</div>
                    <div className={`font-bold mt-0.5 ${pBlocked > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {pBlocked}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Milestones ({milestones.length})</div>
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-200">{m.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── VIEW 3: AUDIT TRAIL ─────────────────────────────────────────────── */}
      {activeSection === 'audit_trail' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
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
      )}

      {/* ─── MODAL 1: ADMIN ASSIGN TASK TO WEB DEV MANAGER / DEVELOPER ───────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Assign Task by Admin</h3>
                  <p className="text-xs text-slate-400">
                    Assign engineering or management deliverables to Web Dev Managers with XP and deadlines.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminCreateTask} className="space-y-4">
              {/* Project & Assignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assignee (Web Dev Manager / Dev) *
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <optgroup label="👑 Web Dev Managers">
                      {managersList.map((m) => (
                        <option key={m.teacherId} value={m.teacherId}>
                          👑 {m.name} (Web Dev Manager)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="💻 Web Developers">
                      {devsList.map((d) => (
                        <option key={d.teacherId} value={d.teacherId}>
                          💻 {d.name} (Developer)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Project *</label>
                  <select
                    value={assignProjectId}
                    onChange={(e) => setAssignProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="core_platform">AEW Core Platform & Operations</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.key})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Deliverable Title *</label>
                <input
                  type="text"
                  required
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Architect Redis Caching & Optimize API Latency"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deliverable Guidelines & Requirements *</label>
                <textarea
                  rows={3}
                  required
                  value={assignDescription}
                  onChange={(e) => setAssignDescription(e.target.value)}
                  placeholder="Explain acceptance criteria, architectural expectations, and milestones..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Priority & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={assignPriority}
                    onChange={(e) => setAssignPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="critical">Critical (Immediate Production Focus)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Task Type</label>
                  <select
                    value={assignType}
                    onChange={(e) => setAssignType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="management">Management & Architecture</option>
                    <option value="feature">Feature Engineering</option>
                    <option value="bugfix">Bugfix / Production Patch</option>
                    <option value="refactor">Code Refactoring & Tech Debt</option>
                    <option value="devops">DevOps & CI/CD Pipeline</option>
                    <option value="testing">Testing & QA Automation</option>
                    <option value="critical_production_issue">Critical Production Issue</option>
                  </select>
                </div>
              </div>

              {/* XP Reward with quick buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">XP Reward *</label>
                  <span className="text-[11px] text-amber-400 font-mono font-bold">+{assignXp} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="25"
                    step="25"
                    required
                    value={assignXp}
                    onChange={(e) => setAssignXp(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-1.5">
                    {[100, 250, 500, 1000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAssignXp(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                          assignXp === preset
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Deadline & Quick Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Target Deadline & Cutoff *</label>
                  <span className="text-[10px] text-slate-400">Strict time-based evaluation applies</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="datetime-local"
                    required
                    value={assignDeadline}
                    onChange={(e) => setAssignDeadline(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(8)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                    >
                      Today (8h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(24)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                    >
                      Tomorrow (24h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(72)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                    >
                      3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(168)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                    >
                      1 Week
                    </button>
                  </div>
                </div>
              </div>

              {/* Checkpoint Checklist (Subtasks) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Deliverable Checkpoints / Subtasks ({assignSubtasks.length})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (subtaskInput.trim()) {
                          setAssignSubtasks([...assignSubtasks, subtaskInput.trim()]);
                          setSubtaskInput('');
                        }
                      }
                    }}
                    placeholder="e.g. Write integration test suite and open PR"
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (subtaskInput.trim()) {
                        setAssignSubtasks([...assignSubtasks, subtaskInput.trim()]);
                        setSubtaskInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    + Add Checkpoint
                  </button>
                </div>

                {assignSubtasks.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                    {assignSubtasks.map((st, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-1.5 bg-slate-900/80 rounded border border-slate-800/80"
                      >
                        <span className="text-slate-300">
                          {idx + 1}. {st}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAssignSubtasks(assignSubtasks.filter((_, i) => i !== idx))
                          }
                          className="text-slate-500 hover:text-red-400 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tags</label>
                <input
                  type="text"
                  value={assignTags}
                  onChange={(e) => setAssignTags(e.target.value)}
                  placeholder="admin-assigned, architecture, high-impact"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Crown className="w-4 h-4" />
                  Assign Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: TIME-BASED EVALUATION (DONE ON-TIME, LATE, NOT DONE) ───── */}
      {timeEvalTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Time-Based Task Resolution</h3>
                  <p className="text-xs text-slate-400">
                    Audit deliverable against scheduled deadline and award XP.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTimeEvalTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Info Summary */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-amber-400 font-bold">{timeEvalTask.id}</span>
                <span className="text-[11px] text-slate-400">Base Reward: +{timeEvalTask.xpReward} XP</span>
              </div>
              <h4 className="text-sm font-bold text-white">{timeEvalTask.title}</h4>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span>Assignee: <strong>{timeEvalTask.assigneeName || 'Unassigned'}</strong></span>
                <span>•</span>
                <span>
                  Deadline:{' '}
                  <strong>
                    {timeEvalTask.deadline || timeEvalTask.dueDate
                      ? new Date(timeEvalTask.deadline || timeEvalTask.dueDate || '').toLocaleString()
                      : 'Not set'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Timing Assessment Alert */}
            {(() => {
              const dVal = timeEvalTask.deadline || timeEvalTask.dueDate;
              if (!dVal) return null;
              const isPast = new Date().getTime() > new Date(dVal).getTime();
              const diffH = Math.round(Math.abs(new Date().getTime() - new Date(dVal).getTime()) / (1000 * 60 * 60));
              return (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                    isPast
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {isPast
                      ? `Deadline was exceeded by approx ${diffH} hour${diffH === 1 ? '' : 's'}. Late or missed marking suggested.`
                      : `Currently within schedule (${diffH} hour${diffH === 1 ? '' : 's'} remaining). On-time completion eligible.`}
                  </span>
                </div>
              );
            })()}

            <form onSubmit={handleSaveTimeEvaluation} className="space-y-4">
              {/* 3 Status Choices */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Select Resolution Outcome *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: On-Time */}
                  <button
                    type="button"
                    onClick={() => {
                      setEvalStatus('on_time');
                      setEvalXp(timeEvalTask.xpReward || 250);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      evalStatus === 'on_time'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">Done (On-Time)</span>
                      {evalStatus === 'on_time' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">100% Base XP (+ On-Time bonus)</div>
                  </button>

                  {/* Option 2: Late */}
                  <button
                    type="button"
                    onClick={() => {
                      setEvalStatus('late');
                      setEvalXp(Math.round((timeEvalTask.xpReward || 250) * 0.7));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      evalStatus === 'late'
                        ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">Done (Late)</span>
                      {evalStatus === 'late' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Prorated / Discounted XP (70%)</div>
                  </button>

                  {/* Option 3: Not Done */}
                  <button
                    type="button"
                    onClick={() => {
                      setEvalStatus('not_done');
                      setEvalXp(0);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      evalStatus === 'not_done'
                        ? 'bg-rose-500/20 border-rose-500 text-white ring-1 ring-rose-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-400">Not Done (Missed)</span>
                      {evalStatus === 'not_done' && <Check className="w-4 h-4 text-rose-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">0 XP • Missed deadline recorded</div>
                  </button>
                </div>
              </div>

              {/* XP Awarded Input */}
              {evalStatus !== 'not_done' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">XP to Award Assignee</label>
                    <span className="text-xs text-amber-400 font-mono font-bold">+{evalXp} XP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={evalXp}
                      onChange={(e) => setEvalXp(Number(e.target.value))}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setEvalXp(timeEvalTask.xpReward || 250)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                    >
                      100% Base
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvalXp(Math.round((timeEvalTask.xpReward || 250) * 0.7))}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                    >
                      70% Late
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvalXp((timeEvalTask.xpReward || 250) + 50)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-medium"
                    >
                      +50 Bonus
                    </button>
                  </div>
                </div>
              )}

              {/* Notes / Evaluator Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Evaluation Remarks / Feedback for Assignee
                </label>
                <textarea
                  rows={2}
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder={
                    evalStatus === 'on_time'
                      ? 'Great delivery on time! All checkpoints verified.'
                      : evalStatus === 'late'
                      ? 'Completed 1 day late. Prorated XP awarded.'
                      : 'Deadline missed without submission or milestone progress.'
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTimeEvalTask(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                    evalStatus === 'on_time'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : evalStatus === 'late'
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Time-Based Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: TASK DRAWER ──────────────────────────────────────────────── */}
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
    </div>
  );
};
