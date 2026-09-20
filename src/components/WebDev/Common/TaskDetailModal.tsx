import React, { useState, useEffect } from 'react';
import {
  X,
  CheckSquare,
  Square,
  AlertTriangle,
  GitPullRequest,
  ExternalLink,
  Clock,
  Award,
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Shield,
  ThumbsUp,
  RotateCcw,
  Sparkles,
  Timer,
  Crown,
  Check,
  Edit3,
  Trash2,
  Save,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { WebDevTask, User } from '../../../types';
import { WebDevService } from '../../../services/webDevService';
import { StorageService } from '../../../services/storage';

interface TaskDetailModalProps {
  task: WebDevTask;
  currentUser: User;
  onClose: () => void;
  onTaskUpdated: (updatedTask: WebDevTask) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  currentUser,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const [currentTask, setCurrentTask] = useState<WebDevTask>(task);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [commentContent, setCommentContent] = useState('');

  // Real-time Deadline Countdown calculation (live updates every second)
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTaskDeadlineDisplay = (deadline?: string, dueDate?: string) => {
    const val = (deadline || dueDate || '').trim();
    if (!val) return 'No deadline';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d} ${months[parseInt(m, 10) - 1]} ${y} (EOD)`;
    }
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return val;
    return dt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateDeadlineRemaining = (deadline?: string, dueDate?: string) => {
    const raw = (deadline || dueDate || '').trim();
    if (!raw) return null;
    const targetMs = new Date(raw.includes('T') ? raw : `${raw}T23:59:59`).getTime();
    if (isNaN(targetMs)) return null;

    const diff = targetMs - now;
    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

    return {
      isOverdue,
      days,
      hours,
      minutes,
      seconds,
      totalMs: diff,
    };
  };

  const deadlineInfo = calculateDeadlineRemaining(currentTask.deadline, currentTask.dueDate);

  // Blocker reporting state
  const [showBlockerInput, setShowBlockerInput] = useState(false);
  const [blockerReason, setBlockerReason] = useState('');

  // Developer submit form state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [prUrl, setPrUrl] = useState(task.githubPrUrl || '');
  const [liveUrl, setLiveUrl] = useState(task.liveDemoUrl || '');
  const [submitSummary, setSubmitSummary] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');

  // Manager review review modal state
  const [reviewAction, setReviewAction] = useState<'approve' | 'changes' | 'reject' | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [bonusXp, setBonusXp] = useState<number>(0);

  // Time-Based Evaluation Action State
  const [showTimeEvalForm, setShowTimeEvalForm] = useState(false);
  const [timeEvalChoice, setTimeEvalChoice] = useState<'on_time' | 'late' | 'not_done'>('on_time');
  const [timeEvalXp, setTimeEvalXp] = useState<number>(task.xpReward || 200);
  const [timeEvalNotes, setTimeEvalNotes] = useState('');

  const isManagerOrAdmin = currentUser.role === 'web_dev_manager' || currentUser.role === 'admin';
  const cleanAssignee = (currentTask.assigneeId || '').trim().toUpperCase();
  const isAssignee = Boolean(
    cleanAssignee &&
    (cleanAssignee === (currentUser.teacherId || '').trim().toUpperCase() ||
     cleanAssignee === (currentUser.id || '').trim().toUpperCase())
  );

  // Edit Task State for Managers / Admins
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState(currentTask.title);
  const [editDescription, setEditDescription] = useState(currentTask.description);
  const [editPriority, setEditPriority] = useState(currentTask.priority);
  const [editStatus, setEditStatus] = useState(currentTask.status);
  const [editAssigneeId, setEditAssigneeId] = useState(currentTask.assigneeId || '');
  const [editXpReward, setEditXpReward] = useState(currentTask.xpReward || 200);
  const [editDueDate, setEditDueDate] = useState(currentTask.dueDate || currentTask.deadline || '');
  const [editEstHours, setEditEstHours] = useState(currentTask.estimatedHours || 4);

  const squadMembers = StorageService.getUsers().filter(
    (u) => u.role === 'web_developer' || u.role === 'web_dev_manager'
  );

  const handleSaveTaskEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedUser = squadMembers.find(
      (u) => u.teacherId?.toUpperCase() === editAssigneeId.toUpperCase() || u.id?.toUpperCase() === editAssigneeId.toUpperCase()
    );
    const updates: Partial<WebDevTask> = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      priority: editPriority as any,
      status: editStatus as any,
      assigneeId: assignedUser ? assignedUser.teacherId : (editAssigneeId ? editAssigneeId : undefined),
      assigneeName: assignedUser ? assignedUser.name : undefined,
      assigneeRole: assignedUser ? (assignedUser.role as any) : undefined,
      xpReward: Number(editXpReward) || 200,
      dueDate: editDueDate,
      deadline: editDueDate,
      estimatedHours: Number(editEstHours) || 1,
    };
    const updated = WebDevService.updateTask(currentTask.id, updates);
    if (updated) {
      setCurrentTask(updated);
      onTaskUpdated(updated);
      setIsEditingTask(false);
    }
  };

  const handleDeleteTask = () => {
    if (window.confirm(`Are you sure you want to permanently delete task "${currentTask.title}" (${currentTask.id})? This action cannot be undone.`)) {
      WebDevService.deleteTask(currentTask.id);
      if (onTaskDeleted) {
        onTaskDeleted(currentTask.id);
      }
      onClose();
    }
  };

  const handleOpenTimeEval = (choice: 'on_time' | 'late' | 'not_done') => {
    setTimeEvalChoice(choice);
    const baseReward = currentTask.xpReward || 200;
    if (choice === 'on_time') {
      setTimeEvalXp(baseReward);
    } else if (choice === 'late') {
      setTimeEvalXp(Math.round(baseReward * 0.7));
    } else {
      setTimeEvalXp(0);
    }
    setShowTimeEvalForm(true);
  };

  const handleConfirmTimeEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = WebDevService.markTaskTimeBasedStatus(currentTask.id, {
      status: timeEvalChoice,
      xpAwarded: timeEvalChoice === 'not_done' ? 0 : timeEvalXp,
      notes: timeEvalNotes,
      evaluator: {
        id: currentUser.teacherId,
        name: currentUser.name,
        role: currentUser.role,
      },
    });
    if (updated) {
      setCurrentTask({ ...updated });
      onTaskUpdated(updated);
      setShowTimeEvalForm(false);
      setTimeEvalNotes('');
      if (timeEvalChoice !== 'not_done') {
        try {
          confetti({ particleCount: 60, spread: 60 });
        } catch {}
      }
    }
  };

  // Toggle Subtask
  const handleToggleSubtask = (subId: string, currentVal: boolean) => {
    const updated = WebDevService.toggleSubtask(currentTask.id, subId, !currentVal);
    if (updated) {
      setCurrentTask({ ...updated });
      onTaskUpdated(updated);
    }
  };

  // Add Subtask
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const updated = WebDevService.addSubtask(currentTask.id, newSubtaskTitle.trim());
    if (updated) {
      setCurrentTask({ ...updated });
      onTaskUpdated(updated);
      setNewSubtaskTitle('');
    }
  };

  // Add Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    const updated = WebDevService.addTaskComment(currentTask.id, {
      authorId: currentUser.teacherId,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content: commentContent.trim(),
    });
    if (updated) {
      setCurrentTask({ ...updated });
      onTaskUpdated(updated);
      setCommentContent('');
    }
  };

  // Report Blocker
  const handleReportBlocker = () => {
    if (!blockerReason.trim()) return;
    const updated = WebDevService.reportTaskBlocker(currentTask.id, blockerReason.trim(), {
      id: currentUser.teacherId,
      name: currentUser.name,
    });
    if (updated) {
      setCurrentTask({ ...updated });
      onTaskUpdated(updated);
      setShowBlockerInput(false);
      setBlockerReason('');
    }
  };

  // Resolve Blocker
  const handleResolveBlocker = () => {
    const updated = WebDevService.resolveTaskBlocker(currentTask.id, {
      id: currentUser.teacherId,
      name: currentUser.name,
    });
    if (updated) {
      setCurrentTask({ ...updated });
      onTaskUpdated(updated);
    }
  };

  // Submit Work for Review (Developer)
  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitSummary.trim()) {
      alert('Please provide a short summary of work completed.');
      return;
    }
    const updated = WebDevService.submitTaskForReview(currentTask.id, {
      developerId: currentUser.teacherId,
      developerName: currentUser.name,
      summary: submitSummary.trim(),
      githubPrUrl: prUrl.trim() || undefined,
      liveUrl: liveUrl.trim() || undefined,
      notes: submitNotes.trim() || undefined,
    });
    if (updated) {
      setCurrentTask({ ...updated });
      onTaskUpdated(updated);
      setShowSubmitForm(false);
      try {
        confetti({ particleCount: 50, spread: 60 });
      } catch {
        // ignore
      }
    }
  };

  // Review Submissions (Manager)
  const handleExecuteReview = () => {
    if (!reviewFeedback.trim()) {
      alert('Please provide feedback for the developer.');
      return;
    }

    if (reviewAction === 'approve') {
      const res = WebDevService.approveTaskSubmission(
        currentTask.id,
        { id: currentUser.teacherId, name: currentUser.name },
        reviewFeedback.trim(),
        bonusXp
      );
      if (res) {
        setCurrentTask({ ...res.task });
        onTaskUpdated(res.task);
        try {
          confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
      }
    } else if (reviewAction === 'changes') {
      const res = WebDevService.requestChangesTaskSubmission(
        currentTask.id,
        { id: currentUser.teacherId, name: currentUser.name },
        reviewFeedback.trim()
      );
      if (res) {
        setCurrentTask({ ...res });
        onTaskUpdated(res);
      }
    } else if (reviewAction === 'reject') {
      const res = WebDevService.rejectTaskSubmission(
        currentTask.id,
        { id: currentUser.teacherId, name: currentUser.name },
        reviewFeedback.trim()
      );
      if (res) {
        setCurrentTask({ ...res });
        onTaskUpdated(res);
      }
    }

    setReviewAction(null);
    setReviewFeedback('');
    setBonusXp(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Completed</span>;
      case 'not_done':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Not Done / Missed</span>;
      case 'review_requested':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Under Review</span>;
      case 'changes_requested':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Changes Requested</span>;
      case 'blocked':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-300 border border-red-500/30">Blocked</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">In Progress</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300 border border-slate-600">To Do</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-red-500/20 text-red-400 border border-red-500/30">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-700 text-slate-400">Low</span>;
    }
  };

  const completedSubtasksCount = (currentTask.subtasks || []).filter((s) => s.completed).length;
  const totalSubtasksCount = (currentTask.subtasks || []).length;
  const subtasksPercent = totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/50">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                {currentTask.id}
              </span>
              {getStatusBadge(currentTask.status)}
              {getPriorityBadge(currentTask.priority)}
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium capitalize">
                {currentTask.type}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                <Award className="w-3.5 h-3.5" />
                +{currentTask.xpReward} XP
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {currentTask.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isManagerOrAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingTask(!isEditingTask)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isEditingTask
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title="Edit Task Details"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingTask ? 'Close Edit' : 'Edit'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Manager Edit Form */}
          {isEditingTask && (
            <form onSubmit={handleSaveTaskEdit} className="p-5 bg-slate-950 border border-amber-500/50 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Task Details ({currentTask.id})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingTask(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assignee</label>
                  <select
                    value={editAssigneeId}
                    onChange={(e) => setEditAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {squadMembers.map((m) => (
                      <option key={m.teacherId || m.id} value={m.teacherId || m.id}>
                        {m.name} ({m.teacherId}) - {m.role === 'web_dev_manager' ? 'Lead' : 'Developer'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review_requested">Review Requested</option>
                    <option value="changes_requested">Changes Requested</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                    <option value="not_done">Not Done</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">XP Reward</label>
                  <input
                    type="number"
                    min="10"
                    value={editXpReward}
                    onChange={(e) => setEditXpReward(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date / Deadline</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Est. Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={editEstHours}
                    onChange={(e) => setEditEstHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTask(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          )}
          {/* Blocker Alert Banner */}
          {currentTask.isBlocked && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-start justify-between gap-3 text-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-red-300">Task Currently Blocked</h4>
                  <p className="text-xs text-red-200 mt-1">{currentTask.blockerReason}</p>
                </div>
              </div>
              {(isManagerOrAdmin || isAssignee) && (
                <button
                  onClick={handleResolveBlocker}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolve Blocker
                </button>
              )}
            </div>
          )}

          {/* Details & Tags Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-800 text-xs">
            <div>
              <div className="text-slate-500 uppercase font-semibold text-[10px]">Assignee</div>
              <div className="text-white font-medium mt-1 flex items-center gap-1">
                {currentTask.assigneeRole === 'web_dev_manager' && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Manager
                  </span>
                )}
                <span>{currentTask.assigneeName || 'Unassigned'}</span>
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase font-semibold text-[10px]">Assigned By</div>
              <div className="text-white font-medium mt-1 flex items-center gap-1">
                {currentTask.assignedByRole === 'admin' && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
                <span>{currentTask.assignedByName || currentTask.reviewerName || 'System'}</span>
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase font-semibold text-[10px]">Reviewer</div>
              <div className="text-white font-medium mt-1">{currentTask.reviewerName || 'Unassigned'}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase font-semibold text-[10px]">Due Date</div>
              <div className="text-white font-medium mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-xs">
                  {formatTaskDeadlineDisplay(currentTask.deadline, currentTask.dueDate)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase font-semibold text-[10px]">Hours (Est / Act)</div>
              <div className="text-white font-medium mt-1">
                {currentTask.estimatedHours || 0}h / {currentTask.actualHours || 0}h
              </div>
            </div>
          </div>

          {/* Real-time Deadline Countdown Timer */}
          {deadlineInfo && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                currentTask.status === 'completed'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : deadlineInfo.isOverdue
                  ? 'bg-red-950/40 border-red-500/50 text-red-200 shadow-lg shadow-red-950/40'
                  : deadlineInfo.days === 0
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-950/40'
                  : 'bg-slate-800/60 border-slate-700/80 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 ${
                    currentTask.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : deadlineInfo.isOverdue
                      ? 'bg-red-500/20 text-red-400 animate-pulse'
                      : deadlineInfo.days === 0
                      ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {currentTask.status === 'completed'
                        ? 'Task Delivered'
                        : deadlineInfo.isOverdue
                        ? 'Deadline Overdue'
                        : 'Sprint Deadline Timer'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        currentTask.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : deadlineInfo.isOverdue
                          ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/50'
                          : deadlineInfo.days === 0
                          ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-500/50'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {currentTask.status === 'completed'
                        ? 'Completed'
                        : deadlineInfo.isOverdue
                        ? 'Action Required'
                        : deadlineInfo.days < 2
                        ? 'Due Soon'
                        : 'On Track'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Target Due Date: <strong className="text-white">{currentTask.dueDate} (End of Day)</strong>
                  </p>
                </div>
              </div>

              {/* Digital Countdown Display */}
              {currentTask.status !== 'completed' && currentTask.status !== 'not_done' && (
                <div className="flex items-center gap-1.5 font-mono text-center self-stretch sm:self-auto justify-center bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                  <div className="px-2 py-1 bg-slate-900 rounded-lg min-w-[42px]">
                    <div className="text-base font-black text-white">{deadlineInfo.days}</div>
                    <div className="text-[8px] uppercase tracking-wider text-slate-500">Days</div>
                  </div>
                  <span className="text-slate-600 font-bold">:</span>
                  <div className="px-2 py-1 bg-slate-900 rounded-lg min-w-[42px]">
                    <div className="text-base font-black text-white">
                      {String(deadlineInfo.hours).padStart(2, '0')}
                    </div>
                    <div className="text-[8px] uppercase tracking-wider text-slate-500">Hours</div>
                  </div>
                  <span className="text-slate-600 font-bold">:</span>
                  <div className="px-2 py-1 bg-slate-900 rounded-lg min-w-[42px]">
                    <div className="text-base font-black text-white">
                      {String(deadlineInfo.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[8px] uppercase tracking-wider text-slate-500">Mins</div>
                  </div>
                  <span className="text-slate-600 font-bold">:</span>
                  <div className="px-2 py-1 bg-slate-900 rounded-lg min-w-[42px]">
                    <div
                      className={`text-base font-black ${
                        deadlineInfo.isOverdue ? 'text-red-400' : 'text-amber-400'
                      }`}
                    >
                      {String(deadlineInfo.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-[8px] uppercase tracking-wider text-slate-500">Secs</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TIME-BASED EVALUATION & VERIFICATION CARD ────────────────────── */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Time-Based Evaluation & Verification
                </h4>
              </div>

              {currentTask.completionStatus && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    currentTask.completionStatus === 'on_time'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : currentTask.completionStatus === 'late'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {currentTask.completionStatus === 'on_time' && '✅ Done (On-Time)'}
                  {currentTask.completionStatus === 'late' && '⏰ Done (Late)'}
                  {currentTask.completionStatus === 'not_done' && '❌ Not Done (Missed Deadline)'}
                </span>
              )}
            </div>

            {/* Existing Evaluation Record */}
            {currentTask.timeMarkedAt && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>
                    Evaluated by: <strong className="text-slate-200">{currentTask.timeMarkedByName || 'Admin'}</strong>
                  </span>
                  <span>{new Date(currentTask.timeMarkedAt).toLocaleString()}</span>
                </div>
                <div className="text-slate-300">
                  Awarded XP: <strong className="text-amber-400">+{currentTask.actualXpAwarded || 0} XP</strong>
                </div>
                {currentTask.timeMarkedNote && (
                  <p className="text-slate-400 italic text-[11px] pt-1">
                    "{currentTask.timeMarkedNote}"
                  </p>
                )}
              </div>
            )}

            {/* Quick Action Buttons for Admin and Manager */}
            {isManagerOrAdmin && !showTimeEvalForm && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 mr-1">Mark Time Status:</span>
                <button
                  type="button"
                  onClick={() => handleOpenTimeEval('on_time')}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Done (On-Time)
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTimeEval('late')}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Done (Late)
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTimeEval('not_done')}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Not Done (Missed)
                </button>
              </div>
            )}

            {/* Inline Time Evaluation Form */}
            {isManagerOrAdmin && showTimeEvalForm && (
              <form onSubmit={handleConfirmTimeEvaluation} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>
                    Confirming:{' '}
                    <span className={
                      timeEvalChoice === 'on_time' ? 'text-emerald-400' :
                      timeEvalChoice === 'late' ? 'text-amber-400' : 'text-rose-400'
                    }>
                      {timeEvalChoice === 'on_time' && 'Done (On-Time)'}
                      {timeEvalChoice === 'late' && 'Done (Late / Overdue)'}
                      {timeEvalChoice === 'not_done' && 'Not Done (Missed Deadline)'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTimeEvalForm(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {timeEvalChoice !== 'not_done' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">XP to Award</label>
                    <input
                      type="number"
                      min="0"
                      value={timeEvalXp}
                      onChange={(e) => setTimeEvalXp(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Feedback / Remarks</label>
                  <textarea
                    rows={2}
                    value={timeEvalNotes}
                    onChange={(e) => setTimeEvalNotes(e.target.value)}
                    placeholder="Enter evaluation notes for the developer / manager..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTimeEvalForm(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Save Evaluation
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h3>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-800/30 p-4 rounded-xl border border-slate-800">
              {currentTask.description}
            </p>
          </div>

          {/* Technical Links & Branch */}
          <div className="flex flex-wrap items-center gap-3">
            {currentTask.githubBranch && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                <span className="text-slate-500">git:</span>
                <span>{currentTask.githubBranch}</span>
              </div>
            )}
            {currentTask.githubPrUrl && (
              <a
                href={currentTask.githubPrUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-colors"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>Pull Request</span>
                <ExternalLink className="w-3 h-3 text-indigo-400" />
              </a>
            )}
            {currentTask.liveDemoUrl && (
              <a
                href={currentTask.liveDemoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </a>
            )}
            {currentTask.tags && currentTask.tags.map((tag) => (
              <span key={tag} className="text-[11px] px-2.5 py-1 bg-slate-800 text-slate-400 rounded-md">
                #{tag}
              </span>
            ))}
          </div>

          {/* Subtasks Checklist */}
          <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Subtasks & Acceptance Checklist
                </h3>
                <span className="text-xs text-slate-400">
                  ({completedSubtasksCount}/{totalSubtasksCount})
                </span>
              </div>
              <span className="text-xs font-semibold text-amber-400">{subtasksPercent}% Done</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${subtasksPercent}%` }}
              />
            </div>

            <div className="space-y-1.5 pt-2">
              {(currentTask.subtasks || []).map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => (isAssignee || isManagerOrAdmin) && handleToggleSubtask(sub.id, Boolean(sub.completed))}
                  className={`flex items-start gap-2.5 p-2 rounded-lg text-xs transition-colors ${
                    isAssignee || isManagerOrAdmin ? 'cursor-pointer hover:bg-slate-800/60' : ''
                  } ${sub.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                >
                  {sub.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{sub.title}</span>
                </div>
              ))}
            </div>

            {/* Add Subtask Form */}
            {(isAssignee || isManagerOrAdmin) && (
              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a new checklist item..."
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </form>
            )}
          </div>

          {/* Submission Details (if present) */}
          {currentTask.submission && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Work Submission Proof
                  </h4>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                  currentTask.submission.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' :
                  currentTask.submission.status === 'changes_requested' ? 'bg-rose-500/20 text-rose-300' :
                  'bg-amber-500/20 text-amber-300'
                }`}>
                  {currentTask.submission.status ? currentTask.submission.status.replace('_', ' ') : 'Pending'}
                </span>
              </div>

              <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                {currentTask.submission.summary}
              </p>

              {currentTask.submission.notes && (
                <p className="text-xs text-slate-400 italic">
                  Note: {currentTask.submission.notes}
                </p>
              )}

              {currentTask.submission.managerFeedback && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center justify-between">
                    <span>Manager Review Feedback</span>
                    {currentTask.submission.bonusXpAwarded ? (
                      <span className="text-emerald-400 font-bold">
                        +{currentTask.submission.bonusXpAwarded} XP Bonus Awarded!
                      </span>
                    ) : null}
                  </div>
                  <div className="text-slate-300">{currentTask.submission.managerFeedback}</div>
                </div>
              )}
            </div>
          )}

          {/* Review Desk Actions for Manager / Admin */}
          {isManagerOrAdmin && currentTask.status === 'review_requested' && !reviewAction && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                Manager Review Desk
              </div>
              <p className="text-xs text-slate-300">
                This task has been submitted for official engineering review. Validate code quality, PR diff, and award recognition XP.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => setReviewAction('approve')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Approve & Award XP
                </button>
                <button
                  onClick={() => setReviewAction('changes')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Request Changes
                </button>
                <button
                  onClick={() => setReviewAction('reject')}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Reject Submission
                </button>
              </div>
            </div>
          )}

          {/* Manager Review Form (When Action Selected) */}
          {reviewAction && (
            <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400">
                <span>
                  {reviewAction === 'approve' ? '🎉 Approve Task & Grant XP' : reviewAction === 'changes' ? '📝 Request Revisions' : '❌ Reject Submission'}
                </span>
                <button onClick={() => setReviewAction(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  Feedback for {currentTask.assigneeName} *
                </label>
                <textarea
                  rows={3}
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Great implementation! Code is clean, modular, and tests pass.'
                      : 'Please address: 1. Add error boundaries 2. Clean up unhandled promise rejection.'
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {reviewAction === 'approve' && (
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300 font-semibold">
                    Bonus Recognition XP (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    {[0, 25, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBonusXp(val)}
                        className={`px-3 py-1 text-xs rounded-lg font-bold border transition-colors ${
                          bonusXp === val
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        +{val} XP
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Total XP awarded to {currentTask.assigneeName}: <strong className="text-amber-300">{(currentTask.xpReward || 0) + bonusXp} XP</strong>
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewAction(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReview}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Confirm & Submit
                </button>
              </div>
            </div>
          )}

          {/* Developer Submit Work Form */}
          {isAssignee && !showSubmitForm && currentTask.status !== 'completed' && currentTask.status !== 'review_requested' && (
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowSubmitForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
              >
                <GitPullRequest className="w-4 h-4" />
                Submit Work for Review (+{currentTask.xpReward} XP)
              </button>

              {!currentTask.isBlocked && (
                <button
                  onClick={() => setShowBlockerInput(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Report Blocker
                </button>
              )}
            </div>
          )}

          {/* Inline Blocker Form */}
          {showBlockerInput && (
            <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-red-400">
                <span>Report Blocker to Manager</span>
                <button onClick={() => setShowBlockerInput(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={2}
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                placeholder="Describe what is blocking you (e.g., waiting for API key, Figma tokens, server deploy)..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockerInput(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReportBlocker}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Submit Blocker
                </button>
              </div>
            </div>
          )}

          {/* Submission Modal Form for Developer */}
          {showSubmitForm && (
            <form onSubmit={handleSubmitWork} className="bg-slate-950 border border-amber-500/40 rounded-xl p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <GitPullRequest className="w-4 h-4" />
                  Submit Work for Manager Review
                </div>
                <button type="button" onClick={() => setShowSubmitForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  GitHub Pull Request URL (Optional)
                </label>
                <input
                  type="url"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/apna-engineering-wallah/repo/pull/12"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Live Preview / Demo URL (Optional)
                </label>
                <input
                  type="url"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://preview-12.aew-portal.dev"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Summary of Implementation *
                </label>
                <textarea
                  rows={3}
                  required
                  value={submitSummary}
                  onChange={(e) => setSubmitSummary(e.target.value)}
                  placeholder="Summarize code architecture, changes made, and test verification..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Testing Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g. Test on slow 3G or test with admin credentials"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-lg text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit for Approval
                </button>
              </div>
            </form>
          )}

          {/* Activity / Comments Thread */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <MessageSquare className="w-4 h-4" />
              Activity & Comments ({(currentTask.comments || []).length})
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {(currentTask.comments || []).map((comm) => (
                <div key={comm.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{comm.authorName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                        {comm.authorRole?.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(comm.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{comm.content}</p>
                </div>
              ))}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment or technical note..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Post
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
