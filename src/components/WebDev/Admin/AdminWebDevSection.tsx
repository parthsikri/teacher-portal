import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Download,
  AlertTriangle,
  Briefcase,
  FileText,
  ChevronRight,
} from 'lucide-react';
import type {
  User,
  WebDevTask,
  WebDevProject,
  WebDevAuditLog,
  WebDevRewardFulfillment,
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

  // Sub-tabs
  const [activeSection, setActiveSection] = useState<'all_work' | 'projects_health' | 'audit_trail'>('all_work');

  // Task drawer modal
  const [selectedTask, setSelectedTask] = useState<WebDevTask | null>(null);

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
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered All-Work
  const filteredTasks = tasks.filter((t) => {
    if (filterDeveloper !== 'all' && t.assigneeId !== filterDeveloper) return false;
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
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
      'Priority',
      'Type',
      'Status',
      'XP Reward',
      'Estimated Hours',
      'Actual Hours',
      'Due Date',
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
      t.priority,
      t.type,
      t.status,
      t.xpReward,
      t.estimatedHours || 0,
      t.actualHours || 0,
      t.dueDate || '',
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

  return (
    <div className="space-y-8">
      {/* ─── EXECUTIVE WAR ROOM HEADER ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin War Room
              </span>
              <span className="text-xs text-slate-400">Web Development Management Oversight</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Engineering Division Master Operations
            </h2>
            <p className="text-xs text-slate-400">
              Total visibility into cross-project software deliverables, sprint velocity, technical debt, and credential fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
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
            <div className="text-[10px] uppercase font-bold text-slate-400">Developers</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {developers.filter((d) => d.role === 'web_developer').length}
            </div>
            <div className="text-[10px] text-slate-500">+1 Lead Architect</div>
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
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
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
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
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
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
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
                  placeholder="Search by task title, description, developer name, tags..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterDeveloper}
                  onChange={(e) => setFilterDeveloper(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Developers</option>
                  {developers.map((d) => (
                    <option key={d.teacherId} value={d.teacherId}>
                      {d.name}
                    </option>
                  ))}
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

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Types</option>
                  <option value="feature">Feature</option>
                  <option value="bugfix">Bugfix</option>
                  <option value="refactor">Refactor</option>
                  <option value="performance">Performance</option>
                  <option value="devops">DevOps</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>
                Showing <strong>{filteredTasks.length}</strong> of <strong>{tasks.length}</strong> total tasks
              </span>
              {(filterDeveloper !== 'all' || filterProject !== 'all' || filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterDeveloper('all');
                    setFilterProject('all');
                    setFilterStatus('all');
                    setFilterPriority('all');
                    setFilterType('all');
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
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Task ID</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Deliverable Title</th>
                  <th className="py-3.5 px-4">Developer</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">XP</th>
                  <th className="py-3.5 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTasks.map((t) => {
                  const proj = projects.find((p) => p.id === t.projectId);
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
                        <div className="font-semibold text-white max-w-sm truncate">{t.title}</div>
                        {t.isBlocked && (
                          <div className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Blocked: {t.blockerReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {t.assigneeName || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          t.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                          t.status === 'review_requested' ? 'bg-amber-500/20 text-amber-300' :
                          t.status === 'changes_requested' ? 'bg-rose-500/20 text-rose-300' :
                          t.status === 'blocked' ? 'bg-red-500/20 text-red-300' :
                          'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{t.dueDate || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                        +{t.xpReward} XP
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-slate-400 hover:text-white">
                          <ChevronRight className="w-4 h-4 inline" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      {/* ─── MODAL: TASK DRAWER ──────────────────────────────────────────────── */}
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
