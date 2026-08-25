import React, { useState } from 'react';
import type { User, AssignedTopic } from '../../types';
import { StorageService } from '../../services/storage';
import { ThumbnailService } from '../../services/thumbnailService';
import confetti from 'canvas-confetti';
import { Link2, Play, FileText, X, Sparkles } from 'lucide-react';

interface UploadLectureModalProps {
  teacher: User;
  prefillTopic?: AssignedTopic | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadLectureModal: React.FC<UploadLectureModalProps> = ({
  teacher,
  prefillTopic,
  onClose,
  onSuccess,
}) => {
  const backlogInfo = StorageService.getPreviousDayBacklog(teacher.teacherId);
  const minutesRecordedToday = StorageService.getMinutesRecordedToday(teacher.teacherId);
  const targetMinutes = teacher.dailyTargetMinutes || 120;
  const activeExtension = prefillTopic
    ? StorageService.getActiveExtensionForTopic(teacher.teacherId, prefillTopic.id)
    : null;

  // Form fields
  const [title, setTitle] = useState(prefillTopic ? prefillTopic.topicTitle : '');
  const [subject, setSubject] = useState(prefillTopic ? prefillTopic.subject : (teacher.subject || 'Engineering'));
  const [primaryTopic, setPrimaryTopic] = useState(prefillTopic ? prefillTopic.topicTitle : '');
  const [subtopics, setSubtopics] = useState<string[]>(prefillTopic ? prefillTopic.subtopics : []);
  const [subtopicInput, setSubtopicInput] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(
    prefillTopic ? prefillTopic.deadlineDate : new Date().toISOString().split('T')[0]
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(45);

  // Video Link format: 'youtube' | 'drive'
  const [videoLinkType, setVideoLinkType] = useState<'youtube' | 'drive'>('youtube');
  const [videoUrl, setVideoUrl] = useState('');

  // Class Notes Link
  const [notesUrl, setNotesUrl] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSubtopic = () => {
    const raw = subtopicInput.trim();
    if (!raw) return;
    const items = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const updated = [...subtopics];
    items.forEach((item) => {
      if (!updated.includes(item)) {
        updated.push(item);
      }
    });
    setSubtopics(updated);
    setSubtopicInput('');
  };

  const handleRemoveSubtopic = (index: number) => {
    setSubtopics(subtopics.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a Lecture Session Title.');
      return;
    }

    if (!primaryTopic.trim()) {
      setErrorMsg('Please enter the Primary Topic / Concept.');
      return;
    }

    if (!videoUrl.trim() && !notesUrl.trim()) {
      setErrorMsg('Please provide a Video Link (YouTube or Drive) or Class Notes Link.');
      return;
    }

    setIsSubmitting(true);

    try {
      const activeExt = prefillTopic ? StorageService.getActiveExtensionForTopic(teacher.teacherId, prefillTopic.id) : null;
      const timeRemaining = StorageService.getTodayTimeRemaining(teacher.teacherId);
      const extensionMinutesLeft = activeExt ? Math.max(0, activeExt.allowedMinutes - activeExt.usedMinutes) : 0;
      const effectiveDailyLimit = timeRemaining.maxDailyMinutes + extensionMinutesLeft;
      if (timeRemaining.minutesRecordedToday + durationMinutes > effectiveDailyLimit) {
        const limitMessage = activeExt
          ? `This session exceeds today's regular limit plus the ${extensionMinutesLeft} minutes left in this extension.`
          : `This session exceeds today's ${timeRemaining.maxDailyMinutes}-minute recording limit.`;
        setErrorMsg(limitMessage);
        setIsSubmitting(false);
        return;
      }

      const isOnTime = StorageService.isUploadOnTime(teacher.teacherId, deadlineDate);
      const submissionStatus = activeExt && !isOnTime ? 'extended' : (isOnTime ? 'on_time' : 'overdue');

      const youtubeLink = videoLinkType === 'youtube' && videoUrl.trim() ? videoUrl.trim() : undefined;
      const driveVideoLink = videoLinkType === 'drive' && videoUrl.trim() ? videoUrl.trim() : undefined;

      StorageService.addLecture({
        teacherId: teacher.teacherId,
        teacherName: teacher.name,
        department: teacher.department,
        subject: subject.trim() || teacher.subject || teacher.department,
        title: title.trim(),
        primaryTopic: primaryTopic.trim(),
        subtopics: subtopics.length > 0 ? subtopics : [primaryTopic.trim()],
        durationMinutes: Math.max(5, durationMinutes || 45),
        deadlineDate,
        status: submissionStatus,
        youtubeUrl: youtubeLink,
        driveUrl: driveVideoLink,
        notesUrl: notesUrl.trim() || undefined,
        assignedTopicId: prefillTopic ? prefillTopic.id : undefined,
        unitNumber: prefillTopic ? (prefillTopic.unitNumber || 'UNIT 1') : undefined,
      });

      if (isOnTime) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save lecture. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400" />
              {prefillTopic ? 'Fulfill Assigned Topic' : 'Submit Lecture Recording'}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {teacher.name} • {teacher.subject || teacher.department}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-400">Today: </span>
              <span className="font-bold text-amber-400">{minutesRecordedToday}/{targetMinutes} min</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} id="lecture-upload-form" className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {prefillTopic && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs rounded-xl flex items-center gap-2">
              <span className="text-sm">📌</span>
              <div>
                <strong>Assigned Topic:</strong> {prefillTopic.topicTitle} ({prefillTopic.unitNumber || 'UNIT 1'})
              </div>
            </div>
          )}

          {activeExtension && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs rounded-xl flex items-start gap-2">
              <span className="text-sm">⏱</span>
              <div>
                <strong>Extension active for this topic.</strong> {Math.max(0, activeExtension.allowedMinutes - activeExtension.usedMinutes)} minutes remain until {new Date(activeExtension.endWindow).toLocaleString()}.
              </div>
            </div>
          )}

          {backlogInfo && !backlogInfo.isYesterdayFulfilled && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <div>
                <strong>Notice:</strong> You have {backlogInfo.yesterdayUnfulfilledMinutes}m unfulfilled from yesterday.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. LECTURE DETAILS */}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Lecture Session Title *</label>
              <input
                type="text"
                placeholder="e.g. Lecture 14: Dynamic Programming Patterns & Shortest Paths"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Duration (Minutes) *</label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Topic Due Date</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Primary Topic / Concept *</label>
              <input
                type="text"
                placeholder="e.g. Graph Algorithms & Dijkstra"
                value={primaryTopic}
                onChange={(e) => setPrimaryTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 mb-2"
                required
              />

              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-medium">Subtopic Tags (Optional)</label>
                <button
                  type="button"
                  onClick={() => {
                    const detected = ThumbnailService.autoDetectSubtopics({
                      title,
                      primaryTopic,
                      videoUrl,
                      assignedTopicId: prefillTopic ? prefillTopic.id : undefined,
                    });
                    if (detected.length > 0) {
                      setSubtopics(detected);
                    }
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> ✨ Auto-Detect from Video
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add subtopics and press Enter"
                  value={subtopicInput}
                  onChange={(e) => setSubtopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtopic();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddSubtopic}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
                >
                  + Add
                </button>
              </div>

              {subtopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {subtopics.map((st, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] flex items-center gap-1.5"
                    >
                      {st}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtopic(i)}
                        className="hover:text-red-400 text-slate-400 font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* 2. LECTURE VIDEO LINK (YOUTUBE / DRIVE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-indigo-400" />
                Lecture Video Link *
              </label>

              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setVideoLinkType('youtube')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    videoLinkType === 'youtube'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Play className="w-3 h-3 text-red-400 fill-red-400" /> YouTube Unlisted
                </button>
                <button
                  type="button"
                  onClick={() => setVideoLinkType('drive')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    videoLinkType === 'drive'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Link2 className="w-3 h-3 text-blue-400" /> Google Drive
                </button>
              </div>
            </div>

            {videoLinkType === 'youtube' ? (
              <div>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-red-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Paste the Unlisted or Public YouTube video link for HD in-portal playback.
                </span>
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/.../view"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Paste the Google Drive video file sharing link (ensure sharing is set to "Anyone with link").
                </span>
              </div>
            )}
          </div>

          <hr className="border-slate-800" />

          {/* 3. CLASS NOTES / DPP LINK */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Class PDF Notes & Slides Link (Optional)
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/.../view"
              value={notesUrl}
              onChange={(e) => setNotesUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
            <span className="text-[10px] text-slate-500 block">
              Google Drive PDF link for handouts, handwritten notes, or slide deck.
            </span>
          </div>
        </form>

        {/* BOTTOM ACTION BAR */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="lecture-upload-form"
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow transition-colors text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : '✓ Publish & Save Session'}
          </button>
        </div>

      </div>
    </div>
  );
};
