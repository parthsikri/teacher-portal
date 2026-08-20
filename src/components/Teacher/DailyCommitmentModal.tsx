import React, { useState } from 'react';
import type { User } from '../../types';
import { StorageService } from '../../services/storage';
import { Clock, CheckCircle2, Sparkles, ShieldAlert, X } from 'lucide-react';

interface DailyCommitmentModalProps {
  teacher: User;
  onClose: () => void;
  onSuccess: () => void;
  isMandatoryLoginPrompt?: boolean;
}

export const DailyCommitmentModal: React.FC<DailyCommitmentModalProps> = ({
  teacher,
  onClose,
  onSuccess,
  isMandatoryLoginPrompt = false,
}) => {
  const currentCutoff = teacher.dailyUploadCutoffTime || '20:00';
  const [selectedTime, setSelectedTime] = useState<string>(currentCutoff);
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Quick preset times
  const presets = [
    { label: '05:00 PM', value: '17:00' },
    { label: '07:00 PM', value: '19:00' },
    { label: '08:30 PM', value: '20:30' },
    { label: '10:00 PM', value: '22:00' },
    { label: '11:30 PM', value: '23:30' },
  ];

  const formatDisplayTime = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${period}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      setErrorMsg('Please select or specify your daily upload cutoff time.');
      return;
    }

    // 1. Permanently update the teacher's profile cutoff time (set once on first login)
    StorageService.updateTeacherCutoffTime(teacher.teacherId, selectedTime);

    // 2. Also register today's commitment
    StorageService.saveDailyCommitment(
      teacher.teacherId,
      teacher.name,
      selectedTime,
      note.trim() || 'Initial first-time login commitment'
    );

    onSuccess();
  };

  // If already set and opened manually, show locked info
  if (teacher.hasSetInitialCommitment && teacher.dailyUploadCutoffTime && !isMandatoryLoginPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 my-8">
          <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100">
                Daily Upload Cutoff Schedule
              </h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fixed Daily Cutoff Time:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {formatDisplayTime(teacher.dailyUploadCutoffTime)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Configured during your initial account setup.
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <p>
              Your daily cutoff time is fixed. Any lecture uploaded after <strong>{formatDisplayTime(teacher.dailyUploadCutoffTime)}</strong> on any day will be automatically marked as <strong>Not On Time</strong>.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 my-8">
        
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100">
                Initial Setup: Set Daily Upload Cutoff Time
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {teacher.name} • {teacher.department}
            </p>
          </div>

          {!isMandatoryLoginPrompt && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-medium">
              By what time will you upload your recorded lectures daily? *
            </label>
            <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-indigo-200 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <Sparkles className="w-3.5 h-3.5" /> One-Time Setup Rule:
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                This cutoff time is set <strong>just once</strong> when you log in for the first time. It becomes your permanent daily delivery schedule. Any lecture uploaded after this cutoff will be marked as <strong>Not On Time</strong>.
              </p>
            </div>
          </div>

          {/* QUICK TIME PRESETS */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Quick Presets:</span>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => {
                const isSelected = selectedTime === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSelectedTime(p.value)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* EXACT CUSTOM TIME PICKER */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-slate-400 font-medium text-[11px]">
              Or select exact daily cutoff time:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs font-semibold"
                required
              />
              <div className="px-3 py-2 bg-slate-950/80 border border-slate-800/80 rounded-xl text-slate-300 font-mono text-xs font-bold">
                {formatDisplayTime(selectedTime)}
              </div>
            </div>
          </div>

          {/* OPTIONAL NOTE */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-medium">
              Standard Daily Schedule Note (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Recording completed in afternoon academic slot"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-slate-700 text-xs"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
            {!isMandatoryLoginPrompt ? (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-slate-400 hover:text-slate-200 font-medium"
              >
                Cancel
              </button>
            ) : (
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> First-time login setup
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Save & Lock Daily Cutoff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
