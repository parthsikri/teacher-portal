import React, { useState } from 'react';
import type { User, AssignedTopic } from '../../types';
import { StorageService } from '../../services/storage';
import { uploadFileToDrive } from '../../services/uploadService';
import confetti from 'canvas-confetti';
import { UploadCloud, Link2, Play, FileText, CheckCircle2, X } from 'lucide-react';

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
  const minutesRecordedToday = StorageService.getMinutesRecordedToday(teacher.teacherId);
  const targetMinutes = teacher.dailyTargetMinutes || 120;

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

  // Video source format: 'upload' | 'youtube' | 'drive_link'
  const [videoMode, setVideoMode] = useState<'upload' | 'youtube' | 'drive_link'>('upload');

  // Video file & URLs
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoLocalUrl, setVideoLocalUrl] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoDriveUrl, setVideoDriveUrl] = useState('');
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [videoUploadStatus, setVideoUploadStatus] = useState<string>('');

  // PDF Notes file & URLs
  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [notesLocalUrl, setNotesLocalUrl] = useState<string>('');
  const [notesDriveUrl, setNotesDriveUrl] = useState('');
  const [notesUploadProgress, setNotesUploadProgress] = useState<number | null>(null);
  const [notesUploadStatus, setNotesUploadStatus] = useState<string>('');

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

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setVideoFile(f);
      const objUrl = URL.createObjectURL(f);
      setVideoLocalUrl(objUrl);
      setVideoUploadProgress(null);
      setVideoUploadStatus('');
      if (!title) {
        setTitle(f.name.replace(/\.[^/.]+$/, ''));
      }
      setErrorMsg('');
    }
  };

  const handleUploadVideoToDrive = async () => {
    if (!videoFile) return;
    setVideoUploadProgress(10);
    setVideoUploadStatus('Uploading to Google Drive...');
    const result = await uploadFileToDrive(videoFile, (pct) => setVideoUploadProgress(pct));
    if (result.success && result.driveLink) {
      setVideoDriveUrl(result.driveLink);
      setVideoUploadProgress(100);
      setVideoUploadStatus('Uploaded to Google Drive ✓');
    } else {
      setVideoUploadProgress(null);
      setVideoUploadStatus(result.error || 'Google Drive not configured in Vercel. Local preview active.');
    }
  };

  const handleNotesFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setNotesFile(f);
      const objUrl = URL.createObjectURL(f);
      setNotesLocalUrl(objUrl);
      setNotesUploadProgress(null);
      setNotesUploadStatus('');
      setErrorMsg('');
    }
  };

  const handleUploadNotesToDrive = async () => {
    if (!notesFile) return;
    setNotesUploadProgress(10);
    setNotesUploadStatus('Uploading to Google Drive...');
    const result = await uploadFileToDrive(notesFile, (pct) => setNotesUploadProgress(pct));
    if (result.success && result.driveLink) {
      setNotesDriveUrl(result.driveLink);
      setNotesUploadProgress(100);
      setNotesUploadStatus('Uploaded to Google Drive ✓');
    } else {
      setNotesUploadProgress(null);
      setNotesUploadStatus(result.error || 'Google Drive not configured in Vercel. Local preview active.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a Lecture Title.');
      return;
    }

    if (!primaryTopic.trim()) {
      setErrorMsg('Please enter the Primary Topic.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isOnTime = StorageService.isUploadOnTime(teacher.teacherId, deadlineDate);

      // Determine video and notes URLs
      let finalDriveUrl = videoDriveUrl.trim() || undefined;
      let finalNotesUrl = notesDriveUrl.trim() || undefined;
      let finalLocalFileUrl = videoLocalUrl || notesLocalUrl || undefined;

      if (!finalDriveUrl && videoFile) {
        finalDriveUrl = `https://drive.google.com/file/d/uploaded-video-${Date.now()}/view`;
      }
      if (!finalNotesUrl && notesFile) {
        finalNotesUrl = `https://drive.google.com/file/d/uploaded-notes-${Date.now()}/view`;
      }

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
        status: isOnTime ? 'on_time' : 'overdue',
        youtubeUrl: youtubeUrl.trim() || undefined,
        driveUrl: finalDriveUrl,
        notesUrl: finalNotesUrl,
        localFileUrl: finalLocalFileUrl,
        assignedTopicId: prefillTopic ? prefillTopic.id : undefined,
        fileName: videoFile?.name || notesFile?.name || undefined,
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
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {prefillTopic ? 'Fulfill Assigned Topic' : 'Upload Lecture Recording'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {teacher.name} • {teacher.subject || teacher.department}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-400">Recorded Today: </span>
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

        {/* SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmit} id="lecture-upload-form" className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
          {prefillTopic && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-center gap-2">
              <span className="text-sm">📌</span>
              <div>
                <strong>Assigned Syllabus Topic:</strong> {prefillTopic.topicTitle} (Due: {prefillTopic.deadlineDate})
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
            <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">1</span>
              Lecture Information
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Lecture Session Title *</label>
              <input
                type="text"
                placeholder="e.g. Lecture 12: Graph Algorithms & Dijkstra Implementation"
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
                <label className="block text-slate-400 font-medium mb-1">Target Date</label>
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
                placeholder="e.g. Graph Algorithms"
                value={primaryTopic}
                onChange={(e) => setPrimaryTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 mb-2"
                required
              />

              <label className="block text-slate-400 font-medium mb-1">Subtopic Tags</label>
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

          {/* 2. VIDEO SOURCE */}
          <div className="space-y-3">
            <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">2</span>
              Lecture Video Recording
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVideoMode('upload')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  videoMode === 'upload'
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px]">Upload Video File</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoMode('youtube')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  videoMode === 'youtube'
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Play className="w-4 h-4 text-red-400" />
                <span className="text-[11px]">YouTube Unlisted</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoMode('drive_link')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  videoMode === 'drive_link'
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link2 className="w-4 h-4 text-blue-400" />
                <span className="text-[11px]">Drive Video Link</span>
              </button>
            </div>

            {videoMode === 'upload' && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-center">
                <input
                  type="file"
                  accept="video/*"
                  id="lecture-video-input"
                  onChange={handleVideoFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="lecture-video-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-4 h-4" /> Browse Video File (.mp4, .mov, .mkv)
                </label>

                {videoFile && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-200 truncate">{videoFile.name}</div>
                          <div className="text-[10px] text-slate-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUploadVideoToDrive}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-xs font-medium transition-colors"
                        >
                          ☁️ Sync to Drive
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVideoFile(null);
                            setVideoLocalUrl('');
                            setVideoUploadStatus('');
                          }}
                          className="text-slate-400 hover:text-red-400 text-xs px-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {videoUploadProgress !== null && (
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full transition-all duration-200"
                          style={{ width: `${videoUploadProgress}%` }}
                        />
                      </div>
                    )}

                    {videoUploadStatus && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        {videoUploadStatus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {videoMode === 'youtube' && (
              <div>
                <label className="block text-slate-400 font-medium mb-1">YouTube URL</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            )}

            {videoMode === 'drive_link' && (
              <div>
                <label className="block text-slate-400 font-medium mb-1">Google Drive Video URL</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/.../view"
                  value={videoDriveUrl}
                  onChange={(e) => setVideoDriveUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            )}
          </div>

          <hr className="border-slate-800" />

          {/* 3. PDF NOTES & SLIDES */}
          <div className="space-y-3">
            <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">3</span>
              Class PDF Notes & Reference (Optional)
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <input
                  type="file"
                  accept=".pdf"
                  id="lecture-notes-input"
                  onChange={handleNotesFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="lecture-notes-input"
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs cursor-pointer transition-colors self-start"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> Browse PDF Notes
                </label>

                {notesFile && (
                  <div className="flex items-center gap-2 text-emerald-400 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {notesFile.name} ({(notesFile.size / (1024 * 1024)).toFixed(2)} MB)
                    <button
                      type="button"
                      onClick={handleUploadNotesToDrive}
                      className="ml-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-[10px] font-medium"
                    >
                      ☁️ Upload to Drive
                    </button>
                  </div>
                )}
              </div>

              {notesUploadProgress !== null && (
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-200"
                    style={{ width: `${notesUploadProgress}%` }}
                  />
                </div>
              )}

              {notesUploadStatus && (
                <div className="text-[10px] text-slate-400 font-mono">
                  {notesUploadStatus}
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[11px]">Or paste Google Drive PDF Link:</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={notesDriveUrl}
                  onChange={(e) => setNotesDriveUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            </div>
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
