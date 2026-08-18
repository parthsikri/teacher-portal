import React, { useState } from 'react';
import type { User, AssignedTopic } from '../../types';
import { StorageService } from '../../services/storage';
import { uploadFileToDrive } from '../../services/uploadService';
import confetti from 'canvas-confetti';
import { UploadCloud, Link2, Sparkles, Play } from 'lucide-react';

interface UploadLectureModalProps {
  teacher: User;
  prefillTopic?: AssignedTopic | null;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

interface FileUploadStatus {
  state: UploadState;
  progress: number;
  driveLink: string;
  error: string;
}

const initialFileStatus: FileUploadStatus = { state: 'idle', progress: 0, driveLink: '', error: '' };

export const UploadLectureModal: React.FC<UploadLectureModalProps> = ({
  teacher,
  prefillTopic,
  onClose,
  onSuccess,
}) => {
  const uploadsToday = StorageService.getUploadsToday(teacher.teacherId);
  const isLimitReached = uploadsToday >= teacher.dailyLimit;

  // Form fields
  const [title, setTitle] = useState(prefillTopic ? prefillTopic.topicTitle : '');
  const [subject, setSubject] = useState(prefillTopic ? prefillTopic.subject : teacher.subject);
  const [primaryTopic, setPrimaryTopic] = useState(prefillTopic ? prefillTopic.topicTitle : '');
  const [subtopics, setSubtopics] = useState<string[]>(prefillTopic ? prefillTopic.subtopics : []);
  const [subtopicInput, setSubtopicInput] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(prefillTopic ? prefillTopic.deadlineDate : new Date().toISOString().split('T')[0]);

  // Video source choice
  const [videoMode, setVideoMode] = useState<'upload' | 'youtube' | 'drive_link'>('upload');

  // Manual link inputs
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoDriveUrl, setVideoDriveUrl] = useState('');
  const [notesDriveUrl, setNotesDriveUrl] = useState('');

  // File upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoStatus, setVideoStatus] = useState<FileUploadStatus>(initialFileStatus);

  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [notesStatus, setNotesStatus] = useState<FileUploadStatus>(initialFileStatus);

  const [errorMsg, setErrorMsg] = useState('');

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

  const handleUpload = async (
    file: File,
    setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>
  ) => {
    setStatus({ state: 'uploading', progress: 5, driveLink: '', error: '' });

    const result = await uploadFileToDrive(file, (pct) => {
      setStatus((s) => ({ ...s, progress: pct }));
    });

    if (result.success && result.driveLink) {
      setStatus({ state: 'done', progress: 100, driveLink: result.driveLink, error: '' });
    } else {
      setStatus({ state: 'error', progress: 0, driveLink: '', error: result.error || 'Upload failed.' });
    }
  };

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setVideoFile(f);
      setVideoStatus(initialFileStatus);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleNotesFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setNotesFile(f);
      setNotesStatus(initialFileStatus);
    }
  };

  const finalVideoUrl = videoStatus.driveLink || videoDriveUrl.trim();
  const finalNotesUrl = notesStatus.driveLink || notesDriveUrl.trim();
  const hasContent = youtubeUrl.trim() || finalVideoUrl || finalNotesUrl;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      setErrorMsg('Daily upload limit reached for today.');
      return;
    }
    if (!title.trim() || !primaryTopic.trim()) {
      setErrorMsg('Please enter Lecture Title and Primary Topic.');
      return;
    }
    if (!hasContent) {
      setErrorMsg('Please upload a PDF notes file, video file, or provide a lecture link.');
      return;
    }
    if (videoStatus.state === 'uploading' || notesStatus.state === 'uploading') {
      setErrorMsg('Please wait for file uploads to complete.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const isOnTime = deadlineDate >= today;

    StorageService.addLecture({
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      department: teacher.department,
      subject,
      title: title.trim(),
      primaryTopic: primaryTopic.trim(),
      subtopics: subtopics.length > 0 ? subtopics : [primaryTopic.trim()],
      deadlineDate,
      status: isOnTime ? 'on_time' : 'overdue',
      youtubeUrl: youtubeUrl.trim() || undefined,
      driveUrl: finalVideoUrl || undefined,
      notesUrl: finalNotesUrl || undefined,
      assignedTopicId: prefillTopic ? prefillTopic.id : undefined,
      fileName: videoFile?.name || notesFile?.name || undefined,
    });

    // Trigger celebration confetti if delivered on time!
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP BANNER HEADER (STICKY) */}
        <div className="px-7 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl shadow-inner">
              📤
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
                {prefillTopic ? 'Fulfill Assigned Topic' : 'Upload Lecture Session'}
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  🔥 Streak Bonus Active
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {teacher.name} • <span className="text-indigo-300 font-mono">{teacher.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Quota: </span>
              <span className="font-extrabold text-amber-400">{uploadsToday}/{teacher.dailyLimit}</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center text-base font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmit} id="lecture-upload-form" className="p-7 space-y-6 text-xs overflow-y-auto flex-1">
          {prefillTopic && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-2xl flex items-center gap-2.5 shadow-sm">
              <span className="text-lg">📌</span>
              <div>
                <strong>Fulfilling Assigned Syllabus Requirement:</strong> {prefillTopic.topicTitle} (Target: {prefillTopic.deadlineDate})
              </div>
            </div>
          )}

          {isLimitReached && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-2xl flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <strong>Daily Quota Reached</strong>
                <p className="text-[11px] text-amber-400/80">You have uploaded {uploadsToday} out of {teacher.dailyLimit} allowed lectures today.</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-2xl font-semibold flex items-center gap-2">
              <span>🛑</span> {errorMsg}
            </div>
          )}

          {/* SECTION 1: LECTURE DETAILS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">1</span>
              Lecture Information
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Lecture Session Title *</label>
              <input
                type="text"
                placeholder="e.g. Lecture 14: Dynamic Programming Patterns & 0/1 Knapsack"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs shadow-inner"
                required
                disabled={isLimitReached}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject / Course</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  disabled={isLimitReached}
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Completion Deadline Date</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  disabled={isLimitReached}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Primary Topic *</label>
              <input
                type="text"
                placeholder="e.g. Dynamic Programming"
                value={primaryTopic}
                onChange={(e) => setPrimaryTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 mb-2"
                required
                disabled={isLimitReached}
              />

              <label className="block text-slate-400 font-semibold mb-1">Subtopics Covered (Tags)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Type subtopic name and press Enter or Add"
                  value={subtopicInput}
                  onChange={(e) => setSubtopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtopic();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  disabled={isLimitReached}
                />
                <button
                  type="button"
                  onClick={handleAddSubtopic}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md transition-colors"
                  disabled={isLimitReached}
                >
                  + Add Tag
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {subtopics.map((st, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    🏷️ {st}
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
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* SECTION 2: CLASS PDF NOTES UPLOAD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">2</span>
                Class PDF Notes & Slides
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                ☁️ Direct Google Drive Upload
              </span>
            </div>

            <div className="bg-slate-950 border-2 border-dashed border-emerald-500/30 rounded-2xl p-5 text-center space-y-3 hover:border-emerald-500/50 transition-colors">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl shadow-inner">
                📄
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-slate-100">Upload PDF Notes Document</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">File will be uploaded directly to Google Drive and linked automatically</p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <input
                  type="file"
                  accept=".pdf"
                  id="big-pdf-picker"
                  onChange={handleNotesFileSelect}
                  className="hidden"
                  disabled={isLimitReached || notesStatus.state === 'uploading'}
                />
                <label
                  htmlFor="big-pdf-picker"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs cursor-pointer shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  📁 Browse PDF File
                </label>
              </div>

              {notesFile && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xl">📄</span>
                    <div>
                      <div className="font-bold text-slate-200 truncate">{notesFile.name}</div>
                      <div className="text-[10px] text-slate-400">{(notesFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>

                  {notesStatus.state !== 'done' && (
                    <button
                      type="button"
                      onClick={() => handleUpload(notesFile, setNotesStatus)}
                      disabled={notesStatus.state === 'uploading'}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
                    >
                      {notesStatus.state === 'uploading' ? `Uploading ${notesStatus.progress}%` : '☁️ Upload Now'}
                    </button>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {notesStatus.state === 'uploading' && (
                <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${notesStatus.progress}%` }}
                  />
                </div>
              )}

              {/* Success */}
              {notesStatus.state === 'done' && notesStatus.driveLink && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-left flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✅</span>
                    <div>
                      <div className="font-bold text-emerald-400">Uploaded to Google Drive!</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-md">{notesStatus.driveLink}</div>
                    </div>
                  </div>
                  <a
                    href={notesStatus.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 font-bold rounded-lg text-xs"
                  >
                    Open ↗
                  </a>
                </div>
              )}

              {/* Error */}
              {notesStatus.state === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold text-left">
                  ❌ {notesStatus.error}
                </div>
              )}
            </div>

            {/* Manual link fallback */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                Or paste existing Google Drive PDF Link manually:
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={notesStatus.state === 'done' ? notesStatus.driveLink : notesDriveUrl}
                onChange={(e) => setNotesDriveUrl(e.target.value)}
                readOnly={notesStatus.state === 'done'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                disabled={isLimitReached}
              />
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* SECTION 3: LECTURE VIDEO SOURCE (CLEAN, PROMINENT BUTTON CARDS) */}
          <div className="space-y-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <span className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xs">3</span>
                Lecture Video Source
              </div>
              <span className="text-[11px] text-purple-400 font-medium">Select source format</span>
            </div>

            {/* 3 Prominent Large Video Option Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setVideoMode('upload')}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  videoMode === 'upload'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-200 font-extrabold shadow-lg shadow-purple-600/20 scale-[1.02]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl">
                  <UploadCloud className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100">Upload Video File</div>
                  <p className="text-[10px] text-slate-400">Direct to Drive</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVideoMode('youtube')}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  videoMode === 'youtube'
                    ? 'bg-red-600/20 border-red-500 text-red-200 font-extrabold shadow-lg shadow-red-600/20 scale-[1.02]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xl">
                  <Play className="w-5 h-5 text-red-400 fill-red-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100">YouTube Video</div>
                  <p className="text-[10px] text-slate-400">Unlisted Link</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVideoMode('drive_link')}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  videoMode === 'drive_link'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-extrabold shadow-lg shadow-indigo-600/20 scale-[1.02]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl">
                  <Link2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100">Drive Video Link</div>
                  <p className="text-[10px] text-slate-400">Paste Link</p>
                </div>
              </button>
            </div>

            {/* VIDEO INPUT CONTENT ACCORDING TO SELECTION */}
            {videoMode === 'upload' && (
              <div className="bg-slate-950 border-2 border-dashed border-purple-500/30 rounded-2xl p-5 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl">
                  🎬
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-100">Upload Video File to Google Drive</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Supports .mp4, .mov, .mkv files</p>
                </div>

                <div className="flex justify-center">
                  <input
                    type="file"
                    accept="video/*"
                    id="big-video-picker"
                    onChange={handleVideoFileSelect}
                    className="hidden"
                    disabled={isLimitReached || videoStatus.state === 'uploading'}
                  />
                  <label
                    htmlFor="big-video-picker"
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs cursor-pointer shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
                  >
                    🎬 Browse Video File
                  </label>
                </div>

                {videoFile && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xl">🎥</span>
                      <div>
                        <div className="font-bold text-slate-200 truncate">{videoFile.name}</div>
                        <div className="text-[10px] text-slate-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                      </div>
                    </div>

                    {videoStatus.state !== 'done' && (
                      <button
                        type="button"
                        onClick={() => handleUpload(videoFile, setVideoStatus)}
                        disabled={videoStatus.state === 'uploading'}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
                      >
                        {videoStatus.state === 'uploading' ? `Uploading ${videoStatus.progress}%` : '☁️ Upload to Drive'}
                      </button>
                    )}
                  </div>
                )}

                {videoStatus.state === 'uploading' && (
                  <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden">
                    <div
                      className="bg-purple-400 h-full transition-all duration-300"
                      style={{ width: `${videoStatus.progress}%` }}
                    />
                  </div>
                )}

                {videoStatus.state === 'done' && videoStatus.driveLink && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-left flex items-center justify-between">
                    <div>
                      <div className="font-bold text-purple-300">✅ Video Uploaded to Google Drive!</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-md">{videoStatus.driveLink}</div>
                    </div>
                    <a
                      href={videoStatus.driveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 font-bold rounded-lg text-xs"
                    >
                      Open ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {videoMode === 'youtube' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">YouTube Unlisted URL *</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-red-500 font-mono text-xs shadow-inner"
                  disabled={isLimitReached}
                />
              </div>
            )}

            {videoMode === 'drive_link' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Google Drive Video Link *</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/.../view"
                  value={videoDriveUrl}
                  onChange={(e) => setVideoDriveUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs shadow-inner"
                  disabled={isLimitReached}
                />
              </div>
            )}
          </div>
        </form>

        {/* STICKY BOTTOM ACTION BAR (NEVER CUT OFF) */}
        <div className="px-7 py-4 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>On-Time submissions reward streak bonuses!</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="lecture-upload-form"
              disabled={isLimitReached || videoStatus.state === 'uploading' || notesStatus.state === 'uploading'}
              className={`px-7 py-3 rounded-xl font-extrabold text-white shadow-xl transition-all text-xs flex items-center gap-2 ${
                isLimitReached || videoStatus.state === 'uploading' || notesStatus.state === 'uploading'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30 hover:scale-[1.02]'
              }`}
            >
              🚀 Publish & Save Session
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
