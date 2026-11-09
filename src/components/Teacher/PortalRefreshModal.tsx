import React, { useState } from 'react';
import type { User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Video,
  Clock,
  Sparkles,
  Calendar,
  X,
  History
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PortalRefreshModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: User;
  performedBy?: string;
  onSuccess: (message: string) => void;
}

export const PortalRefreshModal: React.FC<PortalRefreshModalProps> = ({
  isOpen,
  onClose,
  teacher,
  performedBy = 'Teacher',
  onSuccess,
}) => {
  const [reason, setReason] = useState('New Academic Cycle / Fresh Start');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (!isOpen) return null;

  const currentStats = StorageService.getOnTimeSubmissionStats(teacher.teacherId);
  const currentBacklog = StorageService.getLateBacklogInfo(teacher.teacherId);
  const currentWallet = StorageService.getTimeWalletInfo(teacher.teacherId);
  const todayKey = StorageService.toLocalDateKey(new Date());

  const allLectures = StorageService.getLectures().filter(
    (l) => l.teacherId.toUpperCase() === teacher.teacherId.toUpperCase()
  );
  const totalPreservedVideos = allLectures.length;
  const totalPreservedMinutes = allLectures.reduce((acc, l) => acc + (l.durationMinutes || 45), 0);

  const refreshHistory = teacher.portalRefreshHistory || [];

  const handleConfirmRefresh = () => {
    setIsSubmitting(true);
    try {
      const res = StorageService.portalRefreshTeacher(
        teacher.teacherId,
        performedBy,
        reason.trim() || 'New Academic Cycle'
      );

      if (res.success) {
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
        onSuccess(res.message);
        onClose();
      } else {
        alert(res.message || 'Failed to refresh portal. Please try again.');
      }
    } catch (err: any) {
      alert(err?.message || 'An unexpected error occurred while refreshing portal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 my-8 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
            <RotateCcw className="w-6 h-6 animate-spin-once" />
          </div>
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Cycle Baseline Reset
              </span>
              {teacher.portalRefreshedAt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  Refreshed: {StorageService.toLocalDateKey(teacher.portalRefreshedAt)}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-100 tracking-tight">
              Portal Refresh for {teacher.name}
            </h2>
            <p className="text-xs text-slate-400">
              Start faculty delivery metrics, on-time submission rate, and backlog origin from 0 without deleting any submitted videos.
            </p>
          </div>
        </div>

        {/* 1. Crucial Guarantee: Videos Are 100% Preserved */}
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Guaranteed: All Submitted Videos Stay 100% Safe</span>
          </div>
          <p className="text-emerald-200/90 leading-relaxed text-[11px]">
            The faculty member&apos;s existing library of <strong className="text-emerald-300 font-mono font-bold">{totalPreservedVideos} submitted lecture{totalPreservedVideos === 1 ? '' : 's'}</strong> ({totalPreservedMinutes} recording minutes), video links, lesson titles, DPPs, and remarks are <strong className="text-white underline">never deleted</strong>. Historical submissions remain fully intact and accessible.
          </p>
        </div>

        {/* 2. What Starts from 0 */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>What Will Start from Zero (0):</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-slate-400 font-medium text-[11px]">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> On-Time Submission Rate
                </span>
                <span className="font-mono text-slate-500 line-through text-[10px]">{currentStats.onTimePercentage}%</span>
              </div>
              <div className="text-emerald-400 font-black text-sm">
                100% Fresh Baseline
              </div>
              <p className="text-[10px] text-slate-400">
                Only lectures uploaded in this new cycle will count towards this percentage.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-slate-400 font-medium text-[11px]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Late Backlog Debt
                </span>
                <span className="font-mono text-slate-500 line-through text-[10px]">{currentBacklog.remainingBacklogMinutes}m</span>
              </div>
              <div className="text-emerald-400 font-black text-sm">
                0 min (All Debt Cleared)
              </div>
              <p className="text-[10px] text-slate-400">
                Past unfulfilled quota debt is reset to 0. Tracking origin begins today ({todayKey}).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-slate-400 font-medium text-[11px]">
                <span className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-purple-400" /> Cycle Delivered Minutes
                </span>
                <span className="font-mono text-slate-500 line-through text-[10px]">{currentStats.totalDeliveredMinutes}m</span>
              </div>
              <div className="text-slate-200 font-black text-sm font-mono">
                0 min in new cycle
              </div>
              <p className="text-[10px] text-slate-400">
                Performance quota restarts from zero while library videos remain accessible.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-slate-400 font-medium text-[11px]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Time Wallet Balance
                </span>
                <span className="font-mono text-slate-500 line-through text-[10px]">+{currentWallet.balance}m</span>
              </div>
              <div className="text-slate-200 font-black text-sm font-mono">
                0 min (Fresh Ledger)
              </div>
              <p className="text-[10px] text-slate-400">
                Surplus bank restarts so future overtime deposits count exclusively for new targets.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Cycle Label / Reason Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Cycle Description or Reason (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. November 2026 Cycle, Semester 2, Clean Slate"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['New Monthly Cycle', 'Semester 2 Launch', 'Target Clean Slate', 'Administrative Refresh'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setReason(tag)}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Past Refresh History Accordion (if any) */}
        {refreshHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-800/70 space-y-2">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3 h-3" />
              <span>{showHistory ? 'Hide' : 'View'} Previous Refresh History ({refreshHistory.length})</span>
            </button>
            {showHistory && (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {refreshHistory.map((rec, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[10px] text-slate-300 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>{new Date(rec.refreshedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span className="text-indigo-300 font-mono">By {rec.refreshedBy}</span>
                    </div>
                    <div className="text-slate-400">{rec.reason || 'Cycle Refresh'}</div>
                    {rec.statsSnapshot && (
                      <div className="text-slate-500 font-mono text-[9px] flex gap-2 pt-0.5">
                        <span>Rate: {rec.statsSnapshot.onTimePercentage}%</span>
                        <span>Delivered: {rec.statsSnapshot.totalDeliveredMinutes}m</span>
                        <span>Backlog: {rec.statsSnapshot.remainingBacklogMinutes}m</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Keep Current Stats
          </button>
          <button
            type="button"
            onClick={handleConfirmRefresh}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Refreshing Portal...' : 'Confirm Portal Refresh (Start from 0)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

