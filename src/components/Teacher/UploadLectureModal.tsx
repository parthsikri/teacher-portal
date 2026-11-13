import React, { useState } from 'react';
import type { User, AssignedTopic, Lecture, LectureVideoItem } from '../../types';
import { StorageService } from '../../services/storage';
import { ThumbnailService } from '../../services/thumbnailService';
import confetti from 'canvas-confetti';
import { Link2, Play, FileText, X, Sparkles, Plus, Trash2, Film, CheckCircle2, MapPin, Wand2 } from 'lucide-react';

interface UploadLectureModalProps {
  teacher: User;
  prefillTopic?: AssignedTopic | null;
  prefillLecture?: Lecture | null;
  onClose: () => void;
  onSuccess: () => void;
}

const createEmptyVideoPart = (index: number, defaultTitle = ''): LectureVideoItem => ({
  id: `vid-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
  partTitle: defaultTitle || `Part ${index + 1}`,
  linkType: 'youtube',
  url: '',
  notesUrl: '',
  durationMinutes: 45,
  coveredSubtopics: [],
  description: '',
});

export const UploadLectureModal: React.FC<UploadLectureModalProps> = ({
  teacher,
  prefillTopic,
  prefillLecture,
  onClose,
  onSuccess,
}) => {
  const backlogInfo = StorageService.getPreviousDayBacklog(teacher.teacherId);
  const minutesRecordedToday = StorageService.getMinutesRecordedToday(teacher.teacherId);
  const targetMinutes = teacher.dailyTargetMinutes || 120;
  
  const undeliveredAssignedTopics = StorageService.getAssignedTopics().filter(
    (t) => t.teacherId.toUpperCase() === teacher.teacherId.toUpperCase() && t.status !== 'completed'
  );

  const [selectedAssignedTopicId, setSelectedAssignedTopicId] = useState<string>(
    prefillLecture?.assignedTopicId || (prefillTopic ? prefillTopic.id : '')
  );
  const chosenTopicId = prefillTopic ? prefillTopic.id : (prefillLecture?.assignedTopicId || selectedAssignedTopicId || undefined);
  const activeExtension = StorageService.getActiveExtensionForTopic(teacher.teacherId, chosenTopicId);
  const [showBacklogLogsDetails, setShowBacklogLogsDetails] = useState(false);

  const teacherAssignedSubjects = StorageService.getTeacherAssignedSubjects(teacher);

  // Form fields
  const [title, setTitle] = useState(prefillLecture?.title || (prefillTopic ? prefillTopic.topicTitle : ''));
  const [subject, setSubject] = useState(
    prefillLecture?.subject || (prefillTopic ? prefillTopic.subject : (teacherAssignedSubjects[0] || teacher.subject || 'Engineering'))
  );
  const [primaryTopic, setPrimaryTopic] = useState(
    prefillLecture?.primaryTopic || (prefillTopic ? prefillTopic.topicTitle : '')
  );
  const [subtopics, setSubtopics] = useState<string[]>(
    prefillLecture?.subtopics || (prefillTopic ? prefillTopic.subtopics : [])
  );
  const [subtopicInput, setSubtopicInput] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(
    prefillLecture?.deadlineDate || (prefillTopic ? prefillTopic.deadlineDate : new Date().toISOString().split('T')[0])
  );

  // Multi-video links with complete per-video info
  const [videoParts, setVideoParts] = useState<LectureVideoItem[]>(() => {
    if (prefillLecture?.videoParts && prefillLecture.videoParts.length > 0) {
      return prefillLecture.videoParts.map((vp) => ({ ...vp }));
    }
    if (prefillLecture && (prefillLecture.youtubeUrl || prefillLecture.driveUrl)) {
      const url = prefillLecture.youtubeUrl || prefillLecture.driveUrl || '';
      const isDrive = !prefillLecture.youtubeUrl && !!prefillLecture.driveUrl;
      return [{
        id: `vid-init-${Date.now()}`,
        partTitle: prefillLecture.title || 'Part 1: Main Lecture',
        linkType: isDrive ? 'drive' : 'youtube',
        url,
        notesUrl: prefillLecture.notesUrl || '',
        durationMinutes: prefillLecture.durationMinutes || 45,
        coveredSubtopics: prefillLecture.subtopics || [],
        description: prefillLecture.primaryTopic || '',
      }];
    }
    return [
      createEmptyVideoPart(
        0,
        prefillTopic ? `Part 1: ${prefillTopic.topicTitle}` : 'Part 1: Core Lecture'
      ),
    ];
  });

  // Total duration automatically summed across all video parts
  const durationMinutes = videoParts.reduce((sum, part) => sum + Math.max(0, Number(part.durationMinutes) || 0), 0);

  // Class Notes Link (Optional topic-level supplementary handout)
  const [notesUrl, setNotesUrl] = useState(prefillLecture?.notesUrl || '');
  const [quickSubtopicDrafts, setQuickSubtopicDrafts] = useState<Record<string, string>>({});

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickAddAndTagSubtopic = (videoIdx: number, videoId: string) => {
    const raw = (quickSubtopicDrafts[videoId] || '').trim();
    if (!raw) return;
    const items = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    if (items.length === 0) return;

    setSubtopics((prev) => {
      const next = [...prev];
      items.forEach((item) => {
        if (!next.includes(item)) next.push(item);
      });
      return next;
    });

    setVideoParts((prev) =>
      prev.map((part, i) => {
        if (i !== videoIdx) return part;
        const existing = part.coveredSubtopics || [];
        const nextCovered = [...existing];
        items.forEach((item) => {
          if (!nextCovered.includes(item)) nextCovered.push(item);
        });
        return { ...part, coveredSubtopics: nextCovered };
      })
    );

    setQuickSubtopicDrafts((prev) => ({ ...prev, [videoId]: '' }));
  };

  const handleDistributeSubtopicsEvenly = () => {
    if (subtopics.length === 0 || videoParts.length === 0) return;
    const chunkSize = Math.ceil(subtopics.length / videoParts.length);
    setVideoParts((prev) =>
      prev.map((part, idx) => ({
        ...part,
        coveredSubtopics: subtopics.slice(idx * chunkSize, (idx + 1) * chunkSize),
      }))
    );
  };

  const handleUpdateVideoPart = (index: number, patch: Partial<LectureVideoItem>) => {
    setVideoParts((prev) =>
      prev.map((part, i) => {
        if (i !== index) return part;
        const next = { ...part, ...patch };
        if (patch.url !== undefined) {
          const trimmed = patch.url.trim();
          if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
            next.linkType = 'youtube';
          } else if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
            next.linkType = 'drive';
          }
        }
        return next;
      })
    );
  };

  const handleToggleSubtopicForVideo = (videoIdx: number, subtopicName: string) => {
    setVideoParts((prev) =>
      prev.map((part, i) => {
        if (i !== videoIdx) return part;
        const existing = part.coveredSubtopics || [];
        const has = existing.includes(subtopicName);
        return {
          ...part,
          coveredSubtopics: has
            ? existing.filter((s) => s !== subtopicName)
            : [...existing, subtopicName],
        };
      })
    );
  };

  const handleAddVideoPart = () => {
    setVideoParts((prev) => [
      ...prev,
      createEmptyVideoPart(prev.length, `Part ${prev.length + 1}: ${primaryTopic.trim() || 'Continuation'}`),
    ]);
  };

  const handleRemoveVideoPart = (index: number) => {
    if (videoParts.length <= 1) return;
    setVideoParts((prev) => prev.filter((_, i) => i !== index));
  };

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

    const filledVideos = videoParts.filter((v) => v.url.trim().length > 0);
    if (filledVideos.length === 0 && !notesUrl.trim()) {
      setErrorMsg('Please provide at least one Video Link (YouTube or Drive) or a Class Notes Link.');
      return;
    }

    // Validate every video row that has a URL (or all rows if multiple video rows exist)
    for (let i = 0; i < videoParts.length; i++) {
      const vp = videoParts[i];
      const hasUrl = vp.url.trim().length > 0;
      if (!hasUrl && videoParts.length === 1 && notesUrl.trim()) {
        continue; // Notes-only submission
      }
      if (!hasUrl) {
        setErrorMsg(`Video #${i + 1}: Please enter the video URL or remove the empty video row.`);
        return;
      }
      if (!/^https?:\/\/.+/i.test(vp.url.trim())) {
        setErrorMsg(`Video #${i + 1}: Please enter a valid URL starting with http:// or https://.`);
        return;
      }
      if (!vp.partTitle.trim()) {
        setErrorMsg(`Video #${i + 1}: Please enter an accurate Video Title / Part Name.`);
        return;
      }
      if (!vp.durationMinutes || vp.durationMinutes < 5) {
        setErrorMsg(`Video #${i + 1}: Please enter an accurate duration (at least 5 minutes).`);
        return;
      }
      if (!vp.notesUrl || !vp.notesUrl.trim() || !/^https?:\/\/.+/i.test(vp.notesUrl.trim())) {
        setErrorMsg(`Video #${i + 1}: Class Notes / PDF link is compulsory (must start with http:// or https://).`);
        return;
      }
      const hasCoveredInfo =
        (vp.description && vp.description.trim().length > 0) ||
        (vp.coveredSubtopics && vp.coveredSubtopics.length > 0);
      if (!hasCoveredInfo) {
        setErrorMsg(`Video #${i + 1}: Please specify what topics/concepts this video covers (description or subtopics).`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const normalizedVideoParts: LectureVideoItem[] = filledVideos.map((vp, idx) => {
        const rawUrl = vp.url.trim();
        const isYt = rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be');
        const isDrive = rawUrl.includes('drive.google.com') || rawUrl.includes('docs.google.com');
        const resolvedType: 'youtube' | 'drive' = isYt ? 'youtube' : isDrive ? 'drive' : vp.linkType;
        return {
          ...vp,
          id: vp.id || `vid-${Date.now()}-${idx}`,
          partTitle: vp.partTitle.trim(),
          linkType: resolvedType,
          url: rawUrl,
          notesUrl: vp.notesUrl?.trim() || '',
          durationMinutes: Math.max(5, Number(vp.durationMinutes) || 45),
          coveredSubtopics: vp.coveredSubtopics || [],
          description: vp.description?.trim() || '',
        };
      });

      const totalSessionDuration =
        normalizedVideoParts.length > 0
          ? normalizedVideoParts.reduce((s, v) => s + v.durationMinutes, 0)
          : Math.max(5, durationMinutes || 45);

      const activeExt = StorageService.getActiveExtensionForTopic(teacher.teacherId, chosenTopicId);
      const timeRemaining = StorageService.getTodayTimeRemaining(teacher.teacherId);
      const extensionMinutesLeft = activeExt ? Math.max(0, activeExt.allowedMinutes - activeExt.usedMinutes) : 0;
      const effectiveDailyLimit = timeRemaining.maxDailyMinutes + extensionMinutesLeft;
      
      const existingLecture = chosenTopicId
        ? StorageService.getLectures().find(l => l.assignedTopicId === chosenTopicId)
        : prefillLecture || null;
      const existingDuration = existingLecture ? (existingLecture.durationMinutes || 0) : 0;
      const netAdditionalMinutes = Math.max(0, totalSessionDuration - existingDuration);

      if (timeRemaining.minutesRecordedToday + netAdditionalMinutes > effectiveDailyLimit) {
        const limitMessage = activeExt
          ? `This session (${totalSessionDuration}m) exceeds today's regular limit (${timeRemaining.maxDailyMinutes}m) plus the ${extensionMinutesLeft}m remaining in your active extension.`
          : `This session (${totalSessionDuration}m) exceeds today's ${timeRemaining.maxDailyMinutes}-minute recording limit.`;
        setErrorMsg(limitMessage);
        setIsSubmitting(false);
        return;
      }

      const isOnTime = StorageService.isUploadOnTime(teacher.teacherId, deadlineDate);
      // User strict requirement: Any lecture submitted under extension or past cutoff is marked as 'late' only!
      const submissionStatus = (activeExt || !isOnTime) ? 'late' : 'on_time';

      const youtubeLink = normalizedVideoParts.find((v) => v.linkType === 'youtube')?.url;
      const driveVideoLink = normalizedVideoParts.find((v) => v.linkType === 'drive')?.url;

      const chosenTopic = chosenTopicId ? StorageService.getAssignedTopics().find(t => t.id === chosenTopicId) : null;
      const unitNumber = prefillTopic ? (prefillTopic.unitNumber || 'UNIT 1') : (chosenTopic?.unitNumber || prefillLecture?.unitNumber || 'UNIT 1');

      const mergedSubtopics = Array.from(
        new Set([
          ...subtopics,
          ...normalizedVideoParts.flatMap((v) => v.coveredSubtopics || []),
        ])
      );

      StorageService.addLecture({
        teacherId: teacher.teacherId,
        teacherName: teacher.name,
        department: teacher.department,
        subject: subject.trim() || teacher.subject || teacher.department,
        title: title.trim(),
        primaryTopic: primaryTopic.trim(),
        subtopics: mergedSubtopics.length > 0 ? mergedSubtopics : [primaryTopic.trim()],
        durationMinutes: totalSessionDuration,
        deadlineDate,
        status: submissionStatus,
        youtubeUrl: youtubeLink,
        driveUrl: driveVideoLink,
        videoParts: normalizedVideoParts.length > 0 ? normalizedVideoParts : undefined,
        notesUrl: notesUrl.trim() || normalizedVideoParts[0]?.notesUrl || undefined,
        assignedTopicId: chosenTopicId,
        unitNumber,
      });

      if (isOnTime && !activeExt) {
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
            {backlogInfo.timeWalletBalance > 0 && (
              <div className="px-2 py-1 rounded-lg bg-indigo-950/50 border border-indigo-800/60 text-[11px] font-mono text-indigo-300 flex items-center gap-1">
                <span>Wallet: </span>
                <span className="font-bold text-indigo-200">+{backlogInfo.timeWalletBalance}m</span>
              </div>
            )}
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

          {!prefillTopic && undeliveredAssignedTopics.length > 0 && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <label className="block text-slate-300 font-semibold text-[11px]">
                📌 Link to Assigned Syllabus Topic (Optional)
              </label>
              <select
                value={selectedAssignedTopicId}
                onChange={(e) => {
                  const chosenId = e.target.value;
                  setSelectedAssignedTopicId(chosenId);
                  if (chosenId) {
                    const t = undeliveredAssignedTopics.find((item) => item.id === chosenId);
                    if (t) {
                      setTitle(t.topicTitle);
                      setPrimaryTopic(t.topicTitle);
                      setSubject(t.subject || teacher.subject || 'Engineering');
                      if (t.deadlineDate) setDeadlineDate(t.deadlineDate);
                      if (t.subtopics && t.subtopics.length > 0) setSubtopics(t.subtopics);
                    }
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
              >
                <option value="">-- General / Extra Recording (Not assigned to specific topic) --</option>
                {undeliveredAssignedTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.unitNumber || 'Unit'} — {t.topicTitle} [{t.subject || teacher.subject}] {t.deadlineDate ? `(Due: ${t.deadlineDate})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeExtension && (
            <div className="p-3.5 bg-purple-950/40 border border-purple-800/60 text-purple-200 text-xs rounded-xl flex items-start gap-2.5">
              <span className="text-base">⏱</span>
              <div className="space-y-0.5">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <span>Extension Window Active</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/50">
                    Marked as Late Submission
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  You have <strong className="text-purple-200 font-mono font-bold">{Math.max(0, activeExtension.allowedMinutes - activeExtension.usedMinutes)}m</strong> extra capacity beyond your daily limit until <strong className="text-slate-200 font-mono">{new Date(activeExtension.endWindow).toLocaleString()}</strong>.
                </div>
                {activeExtension.notes && (
                  <div className="text-[10px] text-purple-400 italic">Admin Note: "{activeExtension.notes}"</div>
                )}
              </div>
            </div>
          )}

          {backlogInfo && !backlogInfo.isYesterdayFulfilled && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <div>
                    <strong>Backlog Notice:</strong> You have {backlogInfo.yesterdayUnfulfilledMinutes}m unfulfilled backlog from yesterday ({backlogInfo.yesterdayDateStr}).
                    {backlogInfo.timeWalletBalance > 0 && (
                      <span className="text-indigo-300 ml-1">(+{backlogInfo.timeWalletBalance}m in Time Wallet).</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBacklogLogsDetails(!showBacklogLogsDetails)}
                  className="text-[10px] text-amber-300 hover:text-amber-100 font-bold underline shrink-0 cursor-pointer"
                >
                  {showBacklogLogsDetails ? 'Hide' : 'Crosscheck ➔'}
                </button>
              </div>

              {showBacklogLogsDetails && (
                <div className="pt-2 border-t border-amber-500/20 text-[11px] text-slate-300 space-y-1 bg-slate-950/60 p-2.5 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Yesterday's Required Quota:</span>
                    <span className="font-mono font-bold text-slate-200">{backlogInfo.yesterdayTarget} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Yesterday's Recorded Duration:</span>
                    <span className="font-mono font-bold text-slate-200">{backlogInfo.yesterdayRecorded} min</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>Unfulfilled Shortfall:</span>
                    <span className="font-mono">-{backlogInfo.yesterdayUnfulfilledMinutes} min</span>
                  </div>
                </div>
              )}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium text-xs">Subject</label>
                  {teacherAssignedSubjects.length > 1 && (
                    <span className="text-[10px] text-purple-400 font-mono">
                      {teacherAssignedSubjects.length} subjects
                    </span>
                  )}
                </div>
                {teacherAssignedSubjects.length > 1 ? (
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-medium cursor-pointer"
                  >
                    {teacherAssignedSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    {!teacherAssignedSubjects.includes(subject) && subject && (
                      <option value={subject}>{subject} (Custom)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                )}
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Total Duration (Auto-Summed)</label>
                <div className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 text-xs font-mono font-bold flex items-center justify-between">
                  <span>{durationMinutes} min</span>
                  <span className="text-[10px] text-slate-500 font-normal">{videoParts.length} {videoParts.length === 1 ? 'video' : 'videos'}</span>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Topic Due Date</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
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
                      videoUrl: videoParts[0]?.url || '',
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
                  placeholder="Add subtopics (comma-separated) and press Enter"
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

          {/* 2. LECTURE VIDEO LINKS (1 OR MORE VIDEOS WITH COMPULSORY NOTES & SUBTOPIC ROADMAP) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
                  <Film className="w-3.5 h-3.5 text-indigo-400" />
                  Lecture Video Links, Compulsory Notes & Roadmap *
                </label>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Upload 1 or more video links. Every video requires an accurate title, duration, compulsory Class Notes PDF link, and covered subtopics.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddVideoPart}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-300 font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Video
              </button>
            </div>

            {/* SUBTOPIC TAGGING ROADMAP TRACKER */}
            {subtopics.length > 0 && (() => {
              const coveredSet = new Set(videoParts.flatMap((v) => v.coveredSubtopics || []));
              const coveredCount = subtopics.filter((st) => coveredSet.has(st)).length;
              const coveragePct = Math.round((coveredCount / subtopics.length) * 100);
              return (
                <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] font-bold text-slate-200">
                        Subtopic Tagging Roadmap
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        coveredCount === subtopics.length
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {coveredCount}/{subtopics.length} Mapped ({coveragePct}%)
                      </span>
                    </div>
                    {videoParts.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDistributeSubtopicsEvenly}
                        className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Automatically distribute subtopics across your videos in order"
                      >
                        <Wand2 className="w-3 h-3" /> Auto-Map Across Videos
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        coveredCount === subtopics.length ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${coveragePct}%` }}
                    />
                  </div>

                  {/* Ordered Roadmap Steps */}
                  <div className="flex flex-wrap gap-1.5">
                    {subtopics.map((st, sIdx) => {
                      const assignedVideos = videoParts
                        .map((v, vIdx) => ((v.coveredSubtopics || []).includes(st) ? `V${vIdx + 1}` : null))
                        .filter(Boolean) as string[];
                      const isMapped = assignedVideos.length > 0;
                      return (
                        <div
                          key={st}
                          className={`px-2 py-1 rounded-lg text-[10px] border flex items-center gap-1.5 ${
                            isMapped
                              ? 'bg-emerald-950/30 border-emerald-500/35 text-emerald-200'
                              : 'bg-amber-950/20 border-dashed border-amber-500/40 text-amber-200'
                          }`}
                        >
                          <span className="font-mono font-bold text-[9px] px-1 rounded bg-slate-900 text-slate-300">
                            {sIdx + 1}
                          </span>
                          <span className="font-medium">{st}</span>
                          {isMapped ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[9px]">
                              ✓ {assignedVideos.join(', ')}
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-300 font-semibold">Unassigned</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3">
              {videoParts.map((vp, idx) => (
                <div
                  key={vp.id}
                  className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-[10px]">
                        Video #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleUpdateVideoPart(idx, { linkType: 'youtube' })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                            vp.linkType === 'youtube'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Play className="w-2.5 h-2.5 text-red-400 fill-red-400" /> YouTube
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateVideoPart(idx, { linkType: 'drive' })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                            vp.linkType === 'drive'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Link2 className="w-2.5 h-2.5 text-blue-400" /> Google Drive
                        </button>
                      </div>
                    </div>

                    {videoParts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVideoPart(idx)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={`Remove Video #${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Video Title / Part Name *
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g. Part ${idx + 1}: Concept & Solved Numericals`}
                        value={vp.partTitle}
                        onChange={(e) => handleUpdateVideoPart(idx, { partTitle: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Duration (min) *
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="360"
                        value={vp.durationMinutes}
                        onChange={(e) =>
                          handleUpdateVideoPart(idx, { durationMinutes: parseInt(e.target.value, 10) || 0 })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        {vp.linkType === 'youtube' ? 'YouTube Unlisted / Public URL *' : 'Google Drive Video Link *'}
                      </label>
                      <input
                        type="url"
                        placeholder={
                          vp.linkType === 'youtube'
                            ? 'https://www.youtube.com/watch?v=... or https://youtu.be/...'
                            : 'https://drive.google.com/file/d/.../view'
                        }
                        value={vp.url}
                        onChange={(e) => handleUpdateVideoPart(idx, { url: e.target.value })}
                        className={`w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none font-mono text-xs ${
                          vp.linkType === 'youtube' ? 'focus:border-red-500' : 'focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-emerald-300 font-semibold mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-emerald-400" />
                        Class Notes / PDF Link for Video #{idx + 1} *
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/.../view"
                        value={vp.notesUrl || ''}
                        onChange={(e) => handleUpdateVideoPart(idx, { notesUrl: e.target.value })}
                        className="w-full bg-slate-900 border border-emerald-500/30 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      What This Video Covers (Accurate Info / Summary) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Covers Dijkstra's algorithm proof, dry run, and time complexity analysis"
                      value={vp.description || ''}
                      onChange={(e) => handleUpdateVideoPart(idx, { description: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                    />

                    {/* STEP-BY-STEP SUBTOPIC ROADMAP CHECKLIST FOR THIS VIDEO */}
                    <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/90 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                          Subtopics Covered in Video #{idx + 1}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-300">
                          {(vp.coveredSubtopics || []).length} selected
                        </span>
                      </div>

                      {subtopics.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {subtopics.map((st, sIdx) => {
                            const selected = (vp.coveredSubtopics || []).includes(st);
                            const otherVideos = videoParts
                              .map((other, oIdx) => (oIdx !== idx && (other.coveredSubtopics || []).includes(st) ? `V${oIdx + 1}` : null))
                              .filter(Boolean) as string[];
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleToggleSubtopicForVideo(idx, st)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer flex items-center justify-between gap-1.5 text-left ${
                                  selected
                                    ? 'bg-indigo-600/25 border-indigo-500 text-indigo-100 shadow-sm'
                                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className={`w-4 h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center shrink-0 ${
                                    selected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {selected ? '✓' : sIdx + 1}
                                  </span>
                                  <span className="truncate">{st}</span>
                                </span>
                                {otherVideos.length > 0 && (
                                  <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400 shrink-0">
                                    In {otherVideos.join(',')}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Quick inline add & tag subtopic for this video */}
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          placeholder={`+ Add & tag new subtopic for Video #${idx + 1}...`}
                          value={quickSubtopicDrafts[vp.id] || ''}
                          onChange={(e) =>
                            setQuickSubtopicDrafts((prev) => ({ ...prev, [vp.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleQuickAddAndTagSubtopic(idx, vp.id);
                            }
                          }}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickAddAndTagSubtopic(idx, vp.id)}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer shrink-0"
                        >
                          + Tag
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* 3. SUPPLEMENTARY TOPIC-LEVEL HANDOUT / DPP LINK (OPTIONAL) */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Combined Topic Handout / DPP Link (Optional)
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
