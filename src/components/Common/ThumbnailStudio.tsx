import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ThumbnailService, 
  THUMBNAIL_THEMES, 
  type ThumbnailConfig, 
  type ThumbnailTheme 
} from '../../services/thumbnailService';
import { StorageService } from '../../services/storage';
import type { User, Lecture, AssignedTopic } from '../../types';
import { 
  Image as ImageIcon, Download, Upload, Trash2, 
  RefreshCw, CheckCircle2, Sparkles, Folder, 
  Layers, Users, Palette, Check,
  FileArchive, Eye, X
} from 'lucide-react';

interface ThumbnailStudioProps {
  initialSubject?: string;
  initialTeacherName?: string;
  initialTeacherId?: string;
  initialUnit?: string;
  initialTitle?: string;
  initialSubtopics?: string[];
  onClose?: () => void;
}

export const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({
  initialSubject = 'Data Structures & Algorithms',
  initialTeacherName,
  initialTeacherId,
  initialUnit = 'UNIT 1',
  initialTitle = 'Time & Space Complexity Masterclass',
  initialSubtopics = ['Big-O & Asymptotic Notations', 'Master Theorem & Recurrences', 'Best, Average & Worst Cases'],
  onClose,
}) => {
  // Mode selection: 'single' or 'unit_bulk'
  const [activeTab, setActiveTab] = useState<'single' | 'unit_bulk'>('single');

  const teachers: User[] = useMemo(() => StorageService.getTeachers(), []);
  const allLectures: Lecture[] = useMemo(() => StorageService.getLectures(), []);
  const allTopics: AssignedTopic[] = useMemo(() => StorageService.getAssignedTopics(), []);

  // ════════════════════════════════════════════════════════════════════════════
  // 1. SINGLE THUMBNAIL EDITOR STATE
  // ════════════════════════════════════════════════════════════════════════════
  const [subject, setSubject] = useState(initialSubject);
  const [unitNumber, setUnitNumber] = useState(initialUnit);
  const [title, setTitle] = useState(initialTitle);
  const [subtopics, setSubtopics] = useState<string[]>(initialSubtopics);
  const [subtopicInput, setSubtopicInput] = useState('');
  const [teacherName, setTeacherName] = useState(
    initialTeacherName || (teachers[0]?.name || 'Dr. Ananya Sharma')
  );
  const [teacherRole, setTeacherRole] = useState('HOD & Expert Educator • AEW');
  const [targetTag, setTargetTag] = useState('B.Tech 2nd Year • GATE 2026 • Placements');
  const [batchName, setBatchName] = useState('APNA ENGINEERING WALLAH');
  const [theme, setTheme] = useState<ThumbnailTheme>('obsidian_gold');
  const [facultyPhotoUrl, setFacultyPhotoUrl] = useState<string | undefined>(undefined);
  const [photoPosition, setPhotoPosition] = useState<'right' | 'left'>('right');
  const [selectedLectureId, setSelectedLectureId] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. BULK UNIT EXPORTER STATE
  // ════════════════════════════════════════════════════════════════════════════
  const [bulkTeacherId, setBulkTeacherId] = useState<string>(
    initialTeacherId || (teachers[0]?.teacherId || 'AEW-T-101')
  );
  const [bulkUnit, setBulkUnit] = useState<string>(initialUnit);
  const [bulkTheme, setBulkTheme] = useState<ThumbnailTheme>('obsidian_gold');
  const [bulkFacultyPhotoUrl, setBulkFacultyPhotoUrl] = useState<string | undefined>(undefined);
  const [bulkTargetTag, setBulkTargetTag] = useState('B.Tech Semester Exam • GATE 2026');
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Available distinct units for the selected bulk teacher
  const bulkAvailableUnits = useMemo(() => {
    const unitSet = new Set<string>();
    const teacherLecs = allLectures.filter(
      (l) => l.teacherId.toUpperCase() === bulkTeacherId.toUpperCase()
    );
    teacherLecs.forEach((l) => {
      if (l.unitNumber) unitSet.add(l.unitNumber.trim().toUpperCase());
    });

    const teacherTopics = allTopics.filter(
      (t) => t.teacherId.toUpperCase() === bulkTeacherId.toUpperCase()
    );
    teacherTopics.forEach((t) => {
      if (t.unitNumber) unitSet.add(t.unitNumber.trim().toUpperCase());
    });

    if (unitSet.size === 0) {
      unitSet.add('UNIT 1');
      unitSet.add('UNIT 2');
      unitSet.add('UNIT 3');
      unitSet.add('UNIT 4');
      unitSet.add('UNIT 5');
    }

    const arr = Array.from(unitSet);
    const num = (s: string) => parseInt(s.replace(/[^0-9]/g, ''), 10);
    return arr.sort((a, b) => {
      const na = num(a);
      const nb = num(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [bulkTeacherId, allLectures, allTopics]);

  // Selected Bulk Teacher Object
  const selectedBulkTeacher = useMemo(() => {
    return teachers.find((t) => t.teacherId.toUpperCase() === bulkTeacherId.toUpperCase()) || teachers[0];
  }, [teachers, bulkTeacherId]);

  // Items to generate for the selected bulk unit
  const bulkUnitItems = useMemo(() => {
    const teacherId = bulkTeacherId.toUpperCase();
    const cleanUnit = bulkUnit.toUpperCase();

    // 1. First get delivered lectures in this unit
    const lecs = allLectures.filter((l) => {
      if (l.teacherId.toUpperCase() !== teacherId) return false;
      const u = (l.unitNumber || 'UNIT 1').toUpperCase();
      return u === cleanUnit;
    });

    // 2. Also get syllabus topics for this unit
    const topics = allTopics.filter((t) => {
      if (t.teacherId.toUpperCase() !== teacherId) return false;
      const u = (t.unitNumber || 'UNIT 1').toUpperCase();
      return u === cleanUnit;
    });

    // Merge or deduplicate
    const combined: Array<{
      id: string;
      title: string;
      subtopics: string[];
      sourceType: 'lecture' | 'topic';
    }> = [];

    lecs.forEach((l) => {
      const autoSubtopics = ThumbnailService.autoDetectSubtopics({
        title: l.title,
        primaryTopic: l.primaryTopic,
        videoUrl: l.youtubeUrl || l.driveUrl,
        notesUrl: l.notesUrl,
        existingSubtopics: l.subtopics,
        assignedTopicId: l.assignedTopicId,
        allTopics,
      });

      combined.push({
        id: l.id,
        title: l.title || l.primaryTopic,
        subtopics: autoSubtopics,
        sourceType: 'lecture',
      });
    });

    // Add topics if not already represented in lectures
    topics.forEach((t) => {
      const alreadyIncluded = combined.some(
        (c) => c.title.toLowerCase() === t.topicTitle.toLowerCase()
      );
      if (!alreadyIncluded) {
        const autoSubtopics = ThumbnailService.autoDetectSubtopics({
          title: t.topicTitle,
          primaryTopic: t.topicTitle,
          existingSubtopics: (t.subtopics && t.subtopics.length > 0) ? t.subtopics : t.proposedSubtopics,
          assignedTopicId: t.id,
          allTopics,
        });

        combined.push({
          id: t.id,
          title: t.topicTitle,
          subtopics: autoSubtopics,
          sourceType: 'topic',
        });
      }
    });

    if (combined.length === 0) {
      // Fallback demo items
      return [
        {
          id: 'demo-1',
          title: `${cleanUnit} • Core Fundamentals & Concepts`,
          subtopics: ThumbnailService.autoDetectSubtopics({
            title: `${cleanUnit} Core Fundamentals`,
            allTopics,
          }),
          sourceType: 'topic' as const,
        },
        {
          id: 'demo-2',
          title: `${cleanUnit} • Advanced Numerical Problem Solving`,
          subtopics: ThumbnailService.autoDetectSubtopics({
            title: `${cleanUnit} Advanced Problem Solving`,
            allTopics,
          }),
          sourceType: 'topic' as const,
        },
      ];
    }

    return combined;
  }, [bulkTeacherId, bulkUnit, allLectures, allTopics]);

  // ════════════════════════════════════════════════════════════════════════════
  // SINGLE THUMBNAIL CANVAS RENDER EFFECT
  // ════════════════════════════════════════════════════════════════════════════
  const currentConfig: ThumbnailConfig = useMemo(() => {
    return {
      subject,
      unitNumber,
      title,
      subtopics,
      teacherName,
      teacherRole,
      targetTag,
      batchName,
      theme,
      facultyPhotoUrl,
      photoPosition,
    };
  }, [
    subject,
    unitNumber,
    title,
    subtopics,
    teacherName,
    teacherRole,
    targetTag,
    batchName,
    theme,
    facultyPhotoUrl,
    photoPosition,
  ]);

  useEffect(() => {
    if (activeTab !== 'single' || !canvasRef.current) return;
    let isCancelled = false;

    const render = async () => {
      if (!canvasRef.current) return;
      try {
        await ThumbnailService.renderThumbnail(canvasRef.current, currentConfig);
      } catch (err) {
        if (!isCancelled) {
          console.error('Error rendering thumbnail:', err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [currentConfig, activeTab]);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════
  const handleAddSubtopic = () => {
    const raw = subtopicInput.trim();
    if (!raw) return;
    const items = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const updated = [...subtopics];
    items.forEach((item) => {
      if (!updated.includes(item)) updated.push(item);
    });
    setSubtopics(updated);
    setSubtopicInput('');
  };

  const handleRemoveSubtopic = (index: number) => {
    setSubtopics(subtopics.filter((_, i) => i !== index));
  };

  const handleAutoDetectSubtopics = () => {
    const detected = ThumbnailService.autoDetectSubtopics({
      title,
      primaryTopic: title,
      allTopics,
    });
    if (detected && detected.length > 0) {
      setSubtopics(detected);
      setToastMsg('✨ Auto-detected key subtopics from video!');
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleSelectLectureForThumbnail = (lecId: string) => {
    setSelectedLectureId(lecId);
    const lec = allLectures.find((l) => l.id === lecId);
    if (!lec) return;
    setTitle(lec.title);
    setSubject(lec.subject || subject);
    setUnitNumber(lec.unitNumber || 'UNIT 1');
    setTeacherName(lec.teacherName || teacherName);

    // Auto-detect subtopics for this selected lecture video
    const detected = ThumbnailService.autoDetectSubtopics({
      title: lec.title,
      primaryTopic: lec.primaryTopic,
      videoUrl: lec.youtubeUrl || lec.driveUrl,
      notesUrl: lec.notesUrl,
      existingSubtopics: lec.subtopics,
      assignedTopicId: lec.assignedTopicId,
      allTopics,
    });

    setSubtopics(detected);
    setToastMsg(`✨ Loaded "${lec.title}" & auto-detected subtopics from video!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isBulk: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (isBulk) {
        setBulkFacultyPhotoUrl(result);
      } else {
        setFacultyPhotoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadSingle = async () => {
    setIsGeneratingSingle(true);
    try {
      const filename = `${unitNumber.replace(/\s+/g, '_')}_${title.replace(/[^a-zA-Z0-9]/g, '_')}_16x9_Thumbnail.png`;
      await ThumbnailService.downloadThumbnail(currentConfig, filename);
    } catch (err: any) {
      alert('Failed to download thumbnail: ' + (err?.message || err));
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const handleDownloadBulkZip = async () => {
    if (bulkUnitItems.length === 0) return;
    setIsBulkDownloading(true);
    setBulkProgress({ current: 0, total: bulkUnitItems.length });

    try {
      const teacher = selectedBulkTeacher;
      const zipItems = bulkUnitItems.map((item, idx) => {
        const itemConfig: ThumbnailConfig = {
          subject: teacher?.subject || subject,
          unitNumber: bulkUnit,
          title: item.title,
          subtopics: item.subtopics,
          teacherName: teacher?.name || teacherName,
          teacherRole: `${teacher?.subject || 'Engineering'} Lead Faculty`,
          targetTag: bulkTargetTag,
          batchName: 'APNA ENGINEERING WALLAH',
          theme: bulkTheme,
          facultyPhotoUrl: bulkFacultyPhotoUrl || facultyPhotoUrl,
          photoPosition: 'right',
        };

        const safeTitle = item.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
        return {
          filename: `0${idx + 1}_${bulkUnit}_${safeTitle}_Thumbnail.png`,
          config: itemConfig,
        };
      });

      const zipName = `${(teacher?.subject || 'Subject').replace(/\s+/g, '_')}_${bulkUnit.replace(/\s+/g, '_')}_Thumbnails.zip`;

      await ThumbnailService.downloadUnitThumbnailsZip(
        zipItems,
        zipName,
        (current, total) => setBulkProgress({ current, total })
      );
    } catch (err: any) {
      alert('Failed to generate unit thumbnails ZIP: ' + (err?.message || err));
    } finally {
      setIsBulkDownloading(false);
      setBulkProgress(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* FLOATING TOAST FEEDBACK */}
      {toastMsg && (
        <div className="fixed bottom-8 right-8 z-50 bg-slate-900 border border-amber-500/60 text-amber-300 px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            16:9 Broadcast Studio
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
            Lecture Thumbnail Generator & Bulk Unit Studio
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Generate high-impact 1920x1080 Full HD thumbnails based on Topics & Subtopics. Attach faculty cutouts, apply professional broadcast themes, and bulk download entire unit suites in one click.
          </p>
        </div>

        {/* MODE TABS & OPTIONAL CLOSE */}
        <div className="flex items-center gap-2 shrink-0 z-10">
          <div className="flex items-center bg-slate-950/90 border border-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'single'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Single Thumbnail Editor
            </button>

            <button
              onClick={() => setActiveTab('unit_bulk')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'unit_bulk'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileArchive className="w-4 h-4" />
              Bulk Unit Downloader (.ZIP)
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SINGLE THUMBNAIL EDITOR */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: CONTROLS & FORM */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Palette className="w-4 h-4 text-indigo-400" />
                Thumbnail Content & Styling
              </h3>

              {/* Auto-Load & Detect Subtopics from Video Session */}
              {allLectures.length > 0 && (
                <div className="p-3.5 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border border-indigo-500/40 rounded-2xl space-y-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Auto-Load from Video Session:
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">{allLectures.length} Videos Available</span>
                  </div>
                  <select
                    value={selectedLectureId}
                    onChange={(e) => handleSelectLectureForThumbnail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">⚡ Choose video to auto-detect subtopics...</option>
                    {allLectures.map((lec) => (
                      <option key={lec.id} value={lec.id}>
                        {lec.unitNumber || 'UNIT'} • {lec.title} ({lec.teacherName} - {lec.durationMinutes || 45}m)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Theme Preset Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Visual Broadcast Theme:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(THUMBNAIL_THEMES) as ThumbnailTheme[]).map((tKey) => {
                    const th = THUMBNAIL_THEMES[tKey];
                    const isSelected = theme === tKey;

                    return (
                      <button
                        key={tKey}
                        onClick={() => setTheme(tKey)}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-950/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: th.colors.accentPrimary }}
                            />
                            {th.name}
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            {th.description}
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Faculty Name & Photo Attachment */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Faculty Member & Cutout Photo:
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">Faculty Name:</span>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="e.g. Dr. Ananya Sharma"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">Designation / Role:</span>
                    <input
                      type="text"
                      value={teacherRole}
                      onChange={(e) => setTeacherRole(e.target.value)}
                      placeholder="e.g. HOD & Lead Faculty"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Photo Upload Area */}
                <div className="p-3.5 bg-slate-950/80 border border-dashed border-slate-700 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      Attach Faculty Photo / Cutout:
                    </span>
                    {facultyPhotoUrl && (
                      <button
                        onClick={() => setFacultyPhotoUrl(undefined)}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Photo
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, false)}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />

                  {facultyPhotoUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 bg-slate-900 rounded-xl border border-slate-800">
                        <img
                          src={facultyPhotoUrl}
                          alt="Faculty preview"
                          className="w-12 h-12 object-cover rounded-lg border border-indigo-500"
                        />
                        <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Photo loaded & framed on 16:9 thumbnail
                        </div>
                      </div>

                      {/* Photo Position Selector */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400 font-semibold">Photo Placement:</span>
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setPhotoPosition('right')}
                            className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                              photoPosition === 'right' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Right Side
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoPosition('left')}
                            className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                              photoPosition === 'left' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Left Side
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">
                      Upload transparent cutout PNG or regular JPG. If no photo is selected, a stylish educator avatar is automatically generated.
                    </p>
                  )}
                </div>
              </div>

              {/* Subject & Unit Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Subject Name:
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Data Structures"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Unit / Module:
                  </label>
                  <input
                    type="text"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="e.g. UNIT 1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Main Topic / Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Lecture Title / Primary Topic:
                </label>
                <textarea
                  rows={2}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Time & Space Complexity Masterclass"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Subtopics / Key Highlights */}
              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Subtopics / Bullet Highlights (Max 4):
                  </label>

                  <button
                    type="button"
                    onClick={handleAutoDetectSubtopics}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Auto-detect key subtopics from video title and syllabus"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    ✨ Auto-Detect from Video
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={subtopicInput}
                    onChange={(e) => setSubtopicInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtopic()}
                    placeholder="Add subtopic & press enter..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddSubtopic}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {subtopics.map((st, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-lg flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="text-amber-400 font-bold">#{i + 1}</span> {st}
                      <button
                        onClick={() => handleRemoveSubtopic(i)}
                        className="text-slate-500 hover:text-rose-400 ml-1 text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Exam Tag & Channel Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Exam / Audience Tag:
                  </label>
                  <input
                    type="text"
                    value={targetTag}
                    onChange={(e) => setTargetTag(e.target.value)}
                    placeholder="e.g. B.Tech Semester • GATE 2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Platform / Channel Name:
                  </label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="APNA ENGINEERING WALLAH"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE 16:9 PREVIEW CANVAS & DOWNLOAD */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    Live 16:9 Widescreen Broadcast Preview
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ultra HD 1920x1080 resolution (Standard YouTube / Portal format)
                  </p>
                </div>

                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-mono font-bold">
                  16:9 • 1080p Full HD
                </span>
              </div>

              {/* RESPONSIVE 16:9 CANVAS CONTAINER */}
              <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-black relative flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain"
                  style={{ display: 'block' }}
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Ready for YouTube, LMS & Portal Upload</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setTitle('Time & Space Complexity Masterclass');
                      setUnitNumber('UNIT 1');
                      setSubtopics(['Big-O & Asymptotic Notations', 'Master Theorem & Recurrences', 'Best, Average & Worst Cases']);
                      setTheme('obsidian_gold');
                    }}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition-colors shrink-0"
                  >
                    Reset
                  </button>

                  <button
                    onClick={handleDownloadSingle}
                    disabled={isGeneratingSingle}
                    className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isGeneratingSingle ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating PNG...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Full HD Thumbnail (1920x1080)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: BULK UNIT THUMBNAIL EXPORTER (.ZIP) */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'unit_bulk' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-8">
          
          {/* BULK CONTROLS HEADER */}
          <div className="space-y-4 pb-6 border-b border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                  <FileArchive className="w-5 h-5 text-amber-400" />
                  Bulk Unit Thumbnail Generator & ZIP Exporter
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a Faculty Member and Unit to generate uniform broadcast thumbnails for all sessions in that unit at once.
                </p>
              </div>

              {/* BULK DOWNLOAD BUTTON */}
              <button
                onClick={handleDownloadBulkZip}
                disabled={isBulkDownloading || bulkUnitItems.length === 0}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isBulkDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    Packaging ZIP ({bulkProgress?.current || 0}/{bulkProgress?.total || 0})...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-slate-950" />
                    Download All {bulkUnitItems.length} Unit Thumbnails (.ZIP)
                  </>
                )}
              </button>
            </div>

            {/* SELECTION BAR: FACULTY, UNIT, THEME */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Teacher Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> Select Faculty:
                </label>
                <select
                  value={bulkTeacherId}
                  onChange={(e) => setBulkTeacherId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.teacherId}>
                      {t.name} ({t.teacherId}) - {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-amber-400" /> Select Unit / Module:
                </label>
                <select
                  value={bulkUnit}
                  onChange={(e) => setBulkUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                >
                  {bulkAvailableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-400" /> Unit Visual Theme:
                </label>
                <select
                  value={bulkTheme}
                  onChange={(e) => setBulkTheme(e.target.value as ThumbnailTheme)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                >
                  {(Object.keys(THUMBNAIL_THEMES) as ThumbnailTheme[]).map((tKey) => (
                    <option key={tKey} value={tKey}>
                      {THUMBNAIL_THEMES[tKey].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Exam Tag for Bulk Unit */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Target Exam / Series Header Tag:
              </label>
              <input
                type="text"
                value={bulkTargetTag}
                onChange={(e) => setBulkTargetTag(e.target.value)}
                placeholder="e.g. B.Tech Semester Exam • GATE 2026 • Master Series"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Global Faculty Photo for Unit */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {bulkFacultyPhotoUrl ? (
                  <img
                    src={bulkFacultyPhotoUrl}
                    alt="Bulk faculty"
                    className="w-12 h-12 object-cover rounded-xl border border-amber-400 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                    👨‍🏫
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Unit Faculty Cutout Photo for {selectedBulkTeacher?.name || 'Selected Faculty'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    This photo will be attached across all thumbnails generated for this unit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {bulkFacultyPhotoUrl && (
                  <button
                    onClick={() => setBulkFacultyPhotoUrl(undefined)}
                    className="text-xs text-rose-400 font-bold hover:underline"
                  >
                    Remove
                  </button>
                )}
                <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0">
                  <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                  {bulkFacultyPhotoUrl ? 'Change Photo' : 'Upload Unit Faculty Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* UNIT SESSIONS PREVIEW GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Sessions in {bulkUnit} ({bulkUnitItems.length} Total Thumbnails):
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                Click any individual thumbnail to download standalone PNG
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bulkUnitItems.map((item, index) => {
                const itemConfig: ThumbnailConfig = {
                  subject: selectedBulkTeacher?.subject || subject,
                  unitNumber: bulkUnit,
                  title: item.title,
                  subtopics: item.subtopics,
                  teacherName: selectedBulkTeacher?.name || teacherName,
                  teacherRole: `${selectedBulkTeacher?.subject || 'Engineering'} Lead Faculty`,
                  targetTag: bulkTargetTag,
                  batchName: 'APNA ENGINEERING WALLAH',
                  theme: bulkTheme,
                  facultyPhotoUrl: bulkFacultyPhotoUrl || facultyPhotoUrl,
                  photoPosition: 'right',
                };

                return (
                  <UnitThumbnailCard
                    key={item.id || index}
                    index={index}
                    item={item}
                    config={itemConfig}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Individual Unit Thumbnail Card with real-time canvas render & download
 */
const UnitThumbnailCard: React.FC<{
  index: number;
  item: { id: string; title: string; subtopics: string[]; sourceType: string };
  config: ThumbnailConfig;
}> = ({ index, item, config }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    let isCancelled = false;

    ThumbnailService.renderThumbnail(canvasRef.current, config).catch((err) => {
      if (!isCancelled) console.error('Error rendering unit thumbnail card', err);
    });

    return () => {
      isCancelled = true;
    };
  }, [config]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const filename = `0${index + 1}_${config.unitNumber}_${config.title.replace(/[^a-zA-Z0-9]/g, '_')}_Thumbnail.png`;
      await ThumbnailService.downloadThumbnail(config, filename);
    } catch (err: any) {
      alert('Download error: ' + (err?.message || err));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg space-y-3 p-4 flex flex-col justify-between transition-all">
      <div className="space-y-3">
        {/* 16:9 PREVIEW CANVAS */}
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800/80 shadow-md">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            style={{ display: 'block' }}
          />
        </div>

        {/* METADATA */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-amber-400">
              #0{index + 1} • {config.unitNumber}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
              1920x1080 16:9
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug">
            {item.title}
          </h4>

          <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
            {item.subtopics.slice(0, 2).map((st, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                #{st}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* DOWNLOAD BUTTON */}
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        {isDownloading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 text-emerald-400" />
        )}
        Download 16:9 PNG
      </button>
    </div>
  );
};
