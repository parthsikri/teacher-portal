import React, { useState, useMemo, useEffect } from 'react';
import type { User, HrTask, HrPointLog } from '../../types';
import { StorageService } from '../../services/storage';
import {
  ClipboardCheck,
  Award,
  Send,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Link2,
} from 'lucide-react';

interface EmployeeHrTasksViewProps {
  currentUser: User;
  refreshTrigger?: number;
}

export const EmployeeHrTasksView: React.FC<EmployeeHrTasksViewProps> = ({
  currentUser,
  refreshTrigger,
}) => {
  const [tasks, setTasks] = useState<HrTask[]>(() => StorageService.getHrTasks());
  const [pointLogs, setPointLogs] = useState<HrPointLog[]>(() => StorageService.getHrPointLogs());
  const [freshUser, setFreshUser] = useState<User>(currentUser);

  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState<string>('');
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const reload = () => {
    setTasks(StorageService.getHrTasks());
    setPointLogs(StorageService.getHrPointLogs());
    const u = StorageService.getUsers().find(
      (item) =>
        item.id === currentUser.id ||
        item.teacherId.toUpperCase() === currentUser.teacherId.toUpperCase()
    );
    if (u) setFreshUser(u);
  };

  useEffect(() => {
    reload();
  }, [refreshTrigger, currentUser.teacherId]);

  useEffect(() => {
    const onStorage = () => reload();
    window.addEventListener('portal_storage_update', onStorage);
    window.addEventListener('aew_users_updated', onStorage);
    window.addEventListener('aew_cloud_data_synced', onStorage);
    return () => {
      window.removeEventListener('portal_storage_update', onStorage);
      window.removeEventListener('aew_users_updated', onStorage);
      window.removeEventListener('aew_cloud_data_synced', onStorage);
    };
  }, []);

  const myTasks = useMemo(() => {
    const cleanId = currentUser.teacherId.toUpperCase();
    return tasks.filter((t) => t.assignedToId.toUpperCase() === cleanId);
  }, [tasks, currentUser.teacherId]);

  const myPointLogs = useMemo(() => {
    const cleanId = currentUser.teacherId.toUpperCase();
    return pointLogs.filter((l) => l.employeeId.toUpperCase() === cleanId);
  }, [pointLogs, currentUser.teacherId]);

  const handleOpenSubmit = (task: HrTask) => {
    setSubmittingTaskId(task.id);
    setSubmissionUrl(task.submissionUrl || '');
    setSubmissionNotes(task.submissionNotes || '');
  };

  const handleSubmitProof = (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    if (!submissionUrl.trim() && !submissionNotes.trim()) return;
    StorageService.submitHrTask(taskId, submissionUrl, submissionNotes);
    setSubmittingTaskId(null);
    reload();
    setToastMsg('Task submission sent to HR for review & points approval!');
    setTimeout(() => setToastMsg(null), 3500);
  };

  const pendingCount = myTasks.filter(
    (t) => t.status === 'pending' || t.status === 'revision_requested'
  ).length;
  const approvedCount = myTasks.filter((t) => t.status === 'approved').length;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[10px] font-mono font-bold uppercase">
            <Sparkles className="w-3 h-3" /> HR TASKS & PERFORMANCE POINTS
          </div>
          <h2 className="text-xl font-black text-slate-100">My HR Tasks & Earned Points</h2>
          <p className="text-xs text-slate-400">
            View tasks allotted to you by HR, submit your work deliverables, and track your earned HR points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-right">
            <div className="text-[10px] font-bold uppercase text-emerald-300">Total HR Points</div>
            <div className="text-xl font-black font-mono text-emerald-400">
              +{freshUser.hrPoints || 0} pts
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-right">
            <div className="text-[10px] font-bold uppercase text-slate-400">Tasks Completed</div>
            <div className="text-xl font-black font-mono text-slate-100">
              {approvedCount} / {myTasks.length}
            </div>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* MY TASKS LIST */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-indigo-400" />
          <span>Allotted HR Tasks ({myTasks.length})</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
              {pendingCount} Action Needed
            </span>
          )}
        </h3>

        {myTasks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <ClipboardCheck className="w-7 h-7 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-slate-300">No HR Tasks Allotted Yet</div>
            <p className="text-xs text-slate-500">
              When your assigned HR manager allots a task to you or your team, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myTasks.map((task) => {
              const isSubmitting = submittingTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          task.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : task.status === 'submitted'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : task.status === 'revision_requested'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-black">
                        {task.status === 'approved' && task.awardedPoints !== undefined
                          ? `Earned +${task.awardedPoints} pts`
                          : `+${task.maxPoints} pts`}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-100">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Allotted by: <strong className="text-slate-200">{task.assignedByHrName}</strong></span>
                      <span className="font-mono">Due: {task.deadlineDate}</span>
                    </div>

                    {task.hrFeedback && (
                      <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 text-xs text-pink-200">
                        <span className="font-bold block mb-0.5">HR Review Feedback:</span>
                        {task.hrFeedback}
                      </div>
                    )}

                    {task.submissionUrl && !isSubmitting && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Your Submitted Proof</div>
                        <a
                          href={task.submissionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline font-mono text-[11px] inline-flex items-center gap-1 break-all"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>{task.submissionUrl}</span>
                        </a>
                        {task.submissionNotes && (
                          <p className="text-slate-300 text-[11px]">{task.submissionNotes}</p>
                        )}
                      </div>
                    )}

                    {isSubmitting && (
                      <form
                        onSubmit={(e) => handleSubmitProof(e, task.id)}
                        className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-indigo-400" />
                            <span>Proof / Deliverable Link (Drive, Sheet, Doc, GitHub, etc.)</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={submissionUrl}
                            onChange={(e) => setSubmissionUrl(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">
                            Submission Summary / Notes *
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Briefly describe what you completed..."
                            value={submissionNotes}
                            onChange={(e) => setSubmissionNotes(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSubmittingTaskId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Submit to HR</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {task.status !== 'approved' && !isSubmitting && (
                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenSubmit(task)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {task.status === 'submitted'
                            ? 'Update Submission'
                            : task.status === 'revision_requested'
                            ? 'Submit Revised Proof'
                            : 'Submit Task Deliverable'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POINTS LEDGER */}
      {myPointLogs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>My HR Points History</span>
          </h3>
          <div className="space-y-2">
            {myPointLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">{log.reason}</div>
                  <div className="text-[10px] text-slate-500">
                    Awarded by {log.awardedByHrName} • {new Date(log.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="font-mono font-black text-emerald-400 text-sm">+{log.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
