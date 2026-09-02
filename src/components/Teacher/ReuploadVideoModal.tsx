import React, { useState } from 'react';
import type { Lecture } from '../../types';
import { StorageService } from '../../services/storage';
import { YoutubeIcon as Youtube } from '../Common/YoutubeIcon';
import confetti from 'canvas-confetti';
import {
  X,
  RefreshCw,
  HardDrive,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface ReuploadVideoModalProps {
  lecture: Lecture;
  onClose: () => void;
  onSuccess: (updatedLecture: Lecture) => void;
}

const PRESET_REASONS = [
  '🎙️ Audio / Mic Issue Fixed',
  '📹 Re-recorded in 1080p HD Quality',
  '✍️ Admin Directive Revision Fulfilled',
  '🔗 Updated / Fixed Broken Video Link',
  '💡 Re-recorded with Extra Examples & Derivations',
  '⏱️ Full Comprehensive Version Replacement',
];

export const ReuploadVideoModal: React.FC<ReuploadVideoModalProps> = ({
  lecture,
  onClose,
  onSuccess,
}) => {
  const currentLinkType: 'youtube' | 'drive' = lecture.youtubeUrl ? 'youtube' : 'drive';
  const currentUrl = lecture.youtubeUrl || lecture.driveUrl || '';

  const [videoLinkType, setVideoLinkType] = useState<'youtube' | 'drive'>(currentLinkType);
  const [videoUrl, setVideoUrl] = useState(currentUrl);
  const [notesUrl, setNotesUrl] = useState(lecture.notesUrl || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(lecture.durationMinutes || 45);
  const [reuploadReason, setReuploadReason] = useState(
    lecture.adminRemarks?.some((r) => !r.isAcknowledged)
      ? 'Admin directive revision fulfilled'
      : 'Re-recorded with improved audio & video quality'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentVersion = (lecture.reuploadCount || 0) + 1;
  const nextVersion = currentVersion + 1;

  // Validation
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isYouTubeValid = videoLinkType === 'youtube' && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
  const isDriveValid = videoLinkType === 'drive' && (videoUrl.includes('drive.google.com') || videoUrl.includes('docs.google.com'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUrl = videoUrl.trim();
    if (!cleanUrl) {
      setErrorMsg('Please enter a valid video link.');
      return;
    }

    if (!isValidUrl(cleanUrl)) {
      setErrorMsg('Please enter a valid URL format (starting with https://).');
      return;
    }

    if (!reuploadReason.trim()) {
      setErrorMsg('Please specify a brief reason for replacing the video.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = StorageService.reuploadLectureVideo(lecture.id, {
        videoLinkType,
        videoUrl: cleanUrl,
        notesUrl: notesUrl.trim() || undefined,
        durationMinutes: Math.max(5, durationMinutes || 45),
        reuploadReason: reuploadReason.trim(),
      });

      if (!updated) {
        throw new Error('Failed to update lecture. Please try again.');
      }

      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      onSuccess(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while re-uploading the video.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-purple-500/40 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-purple-400 animate-spin-reverse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <span>Re-upload / Replace Video</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Version {nextVersion}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">
                {lecture.title} ({lecture.subject})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancel & Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CURRENT LECTURE SNAPSHOT */}
        <div className="bg-slate-950/70 px-6 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400">Current Status:</span>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
              lecture.status === 'on_time'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {lecture.status === 'on_time' ? '✓ On-Time' : '⚠️ Late / Catchup'}
            </span>
            {lecture.unitNumber && (
              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                {lecture.unitNumber}
              </span>
            )}
            <span className="font-mono text-slate-400">⏱️ {lecture.durationMinutes || 45}m duration</span>
          </div>

          {lecture.reuploadedAt && (
            <span className="text-[10px] text-purple-300 font-mono">
              Last replaced: {new Date(lecture.reuploadedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Video Link Source Platform Toggle */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Select Video Platform Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVideoLinkType('youtube')}
                className={`py-2.5 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  videoLinkType === 'youtube'
                    ? 'bg-rose-950/40 text-rose-200 border-rose-500 shadow-md shadow-rose-950/30 ring-1 ring-rose-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Youtube className="w-4 h-4 text-rose-500" />
                <span>YouTube Unlisted Video</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoLinkType('drive')}
                className={`py-2.5 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  videoLinkType === 'drive'
                    ? 'bg-sky-950/40 text-sky-200 border-sky-500 shadow-md shadow-sky-950/30 ring-1 ring-sky-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span>Google Drive Link</span>
              </button>
            </div>
          </div>

          {/* Video URL Input */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              New Video Link URL *
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                {videoLinkType === 'youtube' ? (
                  <Youtube className="w-4 h-4 text-rose-500" />
                ) : (
                  <HardDrive className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <input
                type="url"
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={
                  videoLinkType === 'youtube'
                    ? 'https://youtu.be/... or https://www.youtube.com/watch?v=...'
                    : 'https://drive.google.com/file/d/.../view or folder link'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs"
              />
            </div>
            {videoUrl && (
              <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                {videoLinkType === 'youtube' && isYouTubeValid && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Valid YouTube Video Link format detected
                  </span>
                )}
                {videoLinkType === 'drive' && isDriveValid && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Valid Google Drive Link format detected
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Duration & Notes in 2-column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Lecture Duration (Minutes) *</span>
              </label>
              <input
                type="number"
                min={5}
                max={480}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Update if re-recorded lecture duration changed.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Class Notes / DPP Link (Optional)</span>
              </label>
              <input
                type="url"
                value={notesUrl}
                onChange={(e) => setNotesUrl(e.target.value)}
                placeholder="https://drive.google.com/... (PDF notes)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Quick Preset Reason Tags */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">
              Reason for Re-uploading / Replacing Video *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReuploadReason(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                    reuploadReason === preset
                      ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              required
              value={reuploadReason}
              onChange={(e) => setReuploadReason(e.target.value)}
              placeholder="e.g. Fixed audio background noise and added clear formula derivations..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 text-xs focus:outline-none focus:border-purple-500 mt-1"
            />
          </div>

          {/* Information Notice */}
          <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl flex items-start gap-2.5 text-slate-400 text-[11px]">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Replacing the video maintains all topic completion records, on-time delivery credits, and timestamps while instantly updating student & admin viewing links across the portal and notifying Academic Operations.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-600/30 text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Replacing Video...' : 'Replace & Save Video →'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
