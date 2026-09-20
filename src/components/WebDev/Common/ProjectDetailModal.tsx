import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Users,
  Trash2,
  Calendar,
  Crown,
  ChevronRight,
  ListTodo,
  Code2,
} from 'lucide-react';
import type { WebDevProject, WebDevTask, WebDevMilestone, User } from '../../../types';
import { WebDevService } from '../../../services/webDevService';
import { StorageService } from '../../../services/storage';
import { TaskDetailModal } from './TaskDetailModal';

interface ProjectDetailModalProps {
  project: WebDevProject;
  currentUser: User;
  onClose: () => void;
  onProjectUpdated?: (updatedProject: WebDevProject) => void;
  onProjectDeleted?: (projectId: string) => void;
  onFilterTasksByProject?: (projectId: string) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  currentUser,
  onClose,
  onProjectUpdated,
  onProjectDeleted,
  onFilterTasksByProject,
}) => {
  const [currentProject, setCurrentProject] = useState<WebDevProject>(project);
  const [tasks, setTasks] = useState<WebDevTask[]>([]);
  const [milestones, setMilestones] = useState<WebDevMilestone[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'team'>('tasks');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<WebDevTask | null>(null);

  // New milestone form state
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msDeadline, setMsDeadline] = useState('');

  const isManagerOrAdmin = currentUser.role === 'web_dev_manager' || currentUser.role === 'admin';
  const isProjectLead = Boolean(
    currentProject.leadDeveloperId &&
    ((currentProject.leadDeveloperId || '').toUpperCase() === (currentUser.teacherId || '').toUpperCase() ||
     (currentProject.leadDeveloperId || '').toUpperCase() === (currentUser.id || '').toUpperCase())
  );

  const loadProjectData = () => {
    const pTasks = WebDevService.getTasks({ projectId: currentProject.id });
    const pMilestones = WebDevService.getMilestones(currentProject.id);
    const refreshedProj = WebDevService.getProjectById(currentProject.id) || currentProject;
    setTasks(pTasks);
    setMilestones(pMilestones);
    setCurrentProject(refreshedProj);
  };

  useEffect(() => {
    loadProjectData();
  }, [currentProject.id]);

  const dynamicProgress = WebDevService.calculateProjectProgress(currentProject.id);

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const blockedTasks = tasks.filter((t) => t.isBlocked);
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const reviewTasks = tasks.filter((t) => t.status === 'review_requested');

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'my_tasks') {
      const myId = (currentUser.teacherId || '').toUpperCase();
      const myUid = (currentUser.id || '').toUpperCase();
      const assId = (t.assigneeId || '').toUpperCase();
      return assId === myId || assId === myUid;
    }
    if (taskFilter === 'blocked') return t.isBlocked;
    return t.status === taskFilter;
  });

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;
    WebDevService.createMilestone({
      projectId: currentProject.id,
      title: msTitle.trim(),
      description: msDesc.trim(),
      dueDate: msDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'planned',
    });
    setMsTitle('');
    setMsDesc('');
    setMsDeadline('');
    setShowAddMilestone(false);
    loadProjectData();
    if (onProjectUpdated) {
      const updated = WebDevService.getProjectById(currentProject.id);
      if (updated) onProjectUpdated(updated);
    }
  };

  const handleToggleMilestone = (mId: string) => {
    WebDevService.toggleMilestoneStatus(mId);
    loadProjectData();
    if (onProjectUpdated) {
      const updated = WebDevService.getProjectById(currentProject.id);
      if (updated) onProjectUpdated(updated);
    }
  };

  const handleDeleteProject = () => {
    if (window.confirm(`Permanently delete project "${currentProject.title}" (${currentProject.id}) and all associated milestones?`)) {
      WebDevService.deleteProject(currentProject.id);
      if (onProjectDeleted) {
        onProjectDeleted(currentProject.id);
      }
      onClose();
    }
  };

  // Get unique assigned contributors
  const assignedDevIds = new Set<string>();
  tasks.forEach((t) => {
    if (t.assigneeId) assignedDevIds.add(t.assigneeId.toUpperCase());
  });
  const allUsers = StorageService.getUsers();
  const projectContributors = allUsers.filter(
    (u) => assignedDevIds.has((u.teacherId || '').toUpperCase()) || assignedDevIds.has((u.id || '').toUpperCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {currentProject.key}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                currentProject.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                currentProject.status === 'in_progress' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {currentProject.status.replace('_', ' ')}
              </span>
              {isProjectLead && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                  <Crown className="w-3 h-3 text-amber-400" />
                  You are Project Lead
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>{currentProject.title}</span>
            </h1>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {currentProject.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isManagerOrAdmin && (
              <button
                type="button"
                onClick={handleDeleteProject}
                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl transition-colors"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-lg space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                Dynamic Project Delivery Progress
              </span>
              <span className="font-bold text-white">{dynamicProgress}% Completed</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${dynamicProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentProject.repositoryUrl && (
              <a
                href={currentProject.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3 h-3 text-indigo-400" />
                <span>GitHub Repo</span>
              </a>
            )}
            {onFilterTasksByProject && (
              <button
                type="button"
                onClick={() => {
                  onFilterTasksByProject(currentProject.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>View on Sprint Board</span>
              </button>
            )}
          </div>
        </div>

        {/* Overview KPI Cards */}
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-950/20 border-b border-slate-800 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-500">Project Lead</div>
            <div className="font-semibold text-white mt-1 flex items-center gap-1 truncate">
              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">{currentProject.leadDeveloperName || 'Unassigned'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-500">Total Tasks</div>
            <div className="font-bold text-white mt-1 text-sm">{tasks.length}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-500">Shipped</div>
            <div className="font-bold text-emerald-400 mt-1 text-sm">{completedTasks.length}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-500">In Progress</div>
            <div className="font-bold text-indigo-400 mt-1 text-sm">{inProgressTasks.length + reviewTasks.length}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-500">Blocked</div>
            <div className={`font-bold mt-1 text-sm ${blockedTasks.length > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {blockedTasks.length}
            </div>
          </div>
        </div>

        {/* Tech Stack Chips */}
        {currentProject.techStack && currentProject.techStack.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              Tech Stack:
            </span>
            {currentProject.techStack.map((tech) => (
              <span key={tech} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono">
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Sub-navigation Tabs */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'tasks'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Tasks ({tasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'milestones'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Milestones ({milestones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'team'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Assigned Squad ({projectContributors.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-4">
          
          {/* TAB 1: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {['all', 'my_tasks', 'in_progress', 'review_requested', 'completed', 'blocked'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTaskFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                        taskFilter === f
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f === 'my_tasks' ? 'Assigned to Me' : f.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-400">
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </span>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  <ListTodo className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No tasks found matching the filter.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="p-3 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                            {t.id}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                            t.status === 'review_requested' ? 'bg-amber-500/20 text-amber-300' :
                            t.status === 'blocked' ? 'bg-red-500/20 text-red-300' :
                            'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            t.priority === 'critical' ? 'text-red-400' :
                            t.priority === 'high' ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {t.priority}
                          </span>
                          {t.isBlocked && (
                            <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Blocked
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-white text-xs truncate group-hover:text-amber-300 transition-colors">
                          {t.title}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-slate-300 font-medium">{t.assigneeName || 'Unassigned'}</div>
                          <div className="text-[10px] text-amber-400 font-bold">+{t.xpReward} XP</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MILESTONES */}
          {activeTab === 'milestones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Project Milestones</h3>
                  <p className="text-[11px] text-slate-400">Key deliverables and timeline gates</p>
                </div>

                {isManagerOrAdmin && !showAddMilestone && (
                  <button
                    type="button"
                    onClick={() => setShowAddMilestone(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Milestone</span>
                  </button>
                )}
              </div>

              {/* Inline Add Milestone Form */}
              {showAddMilestone && (
                <form onSubmit={handleCreateMilestone} className="p-4 bg-slate-950 border border-indigo-500/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">Create New Project Milestone</span>
                    <button type="button" onClick={() => setShowAddMilestone(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      value={msTitle}
                      onChange={(e) => setMsTitle(e.target.value)}
                      placeholder="Milestone title (e.g. Phase 2 Staging Deploy)..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={msDesc}
                      onChange={(e) => setMsDesc(e.target.value)}
                      placeholder="Description (optional)..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="date"
                      value={msDeadline}
                      onChange={(e) => setMsDeadline(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddMilestone(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                    >
                      Save Milestone
                    </button>
                  </div>
                </form>
              )}

              {milestones.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No milestones set for this project yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {milestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(m.id)}
                          className="text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Click to toggle status"
                        >
                          {m.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-400" />
                          )}
                        </button>
                        <div>
                          <div className={`font-semibold text-sm ${m.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {m.title}
                          </div>
                          {m.description && <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>}
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            Target Date: {m.targetDate || m.dueDate || m.deadline || 'EOD'}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        m.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ASSIGNED SQUAD */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-white">
                Engineers Assigned to Tasks in this Project ({projectContributors.length})
              </div>

              {projectContributors.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No developers have been assigned tasks on this project yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projectContributors.map((dev) => {
                    const devTasks = tasks.filter(
                      (t) => (t.assigneeId || '').toUpperCase() === (dev.teacherId || '').toUpperCase()
                    );
                    const devDone = devTasks.filter((t) => t.status === 'completed').length;
                    const isLead = (currentProject.leadDeveloperId || '').toUpperCase() === (dev.teacherId || '').toUpperCase();

                    return (
                      <div
                        key={dev.teacherId || dev.id}
                        className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {isLead && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            <span>{dev.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{dev.webDevTitle || 'Web Developer'}</div>
                        </div>

                        <div className="text-right text-[11px]">
                          <div className="text-slate-300 font-medium">{devTasks.length} tasks assigned</div>
                          <div className="text-emerald-400 font-bold">{devDone} completed</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nested Task Detail Modal */}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            currentUser={currentUser}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={(updated) => {
              setSelectedTask(updated);
              loadProjectData();
            }}
            onTaskDeleted={() => {
              setSelectedTask(null);
              loadProjectData();
            }}
          />
        )}
      </div>
    </div>
  );
};
