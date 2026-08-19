import React, { useState, useMemo } from 'react';
import type { User, Lecture, AssignedTopic } from '../../types';
import { StorageService } from '../../services/storage';
import { VideoModal } from '../Common/VideoModal';
import { 
  Search, Video, FileText, 
  Plus, Play, Flame, Zap, Target,
  Edit3, ExternalLink,
  Copy, Check, ChevronRight, Layers, Star
} from 'lucide-react';

interface TeacherViewProps {
  teacher: User;
  currentPage: string;
  onPageChange: (page: string) => void;
  onOpenUpload: (prefillTopic?: AssignedTopic) => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({ 
  teacher, 
  currentPage, 
  onPageChange, 
  onOpenUpload 
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [topicFilter, setTopicFilter] = useState<'all' | 'needs_action' | 'in_review' | 'ready_to_deliver' | 'completed'>('all');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [acknowledgedRemarks, setAcknowledgedRemarks] = useState<Set<string>>(new Set());

  const lectures = useMemo(() => {
    return StorageService.getLectures().filter((l) => l.teacherId.toUpperCase() === teacher.teacherId.toUpperCase());
  }, [teacher.teacherId, refreshKey]);

  const assignedTopics = useMemo(() => {
    return StorageService.getAssignedTopics().filter((t) => t.teacherId.toUpperCase() === teacher.teacherId.toUpperCase());
  }, [teacher.teacherId, refreshKey]);

  const subjectReference = useMemo(() => {
    return StorageService.getReferenceForSubject(teacher.subject);
  }, [teacher.subject, refreshKey]);

  const uploadsToday = StorageService.getUploadsToday(teacher.teacherId);
  const dailyLimit = teacher.dailyLimit;
  const isLimitReached = uploadsToday >= dailyLimit;

  const [selectedLectureForPreview, setSelectedLectureForPreview] = useState<Lecture | null>(null);
  const [searchTopicQuery, setSearchTopicQuery] = useState('');
  const [searchLectureQuery, setSearchLectureQuery] = useState('');
  const [lectureFilterTab, setLectureFilterTab] = useState<'all' | 'on_time' | 'overdue' | 'with_notes'>('all');

  // Modal State for Proposing Subtopics
  const [proposingTopic, setProposingTopic] = useState<AssignedTopic | null>(null);
  const [proposedSubtopicList, setProposedSubtopicList] = useState<string[]>([]);
  const [subtopicInput, setSubtopicInput] = useState('');

  // Timely Submissions Metrics
  const onTimeLectures = lectures.filter((l) => l.status === 'on_time').length;
  const punctualityScore = lectures.length > 0 ? Math.round((onTimeLectures / lectures.length) * 100) : 100;
  const currentStreakDays = onTimeLectures;
  
  // Faculty Level calculation
  const facultyLevel = onTimeLectures >= 15 ? 4 : onTimeLectures >= 8 ? 3 : onTimeLectures >= 3 ? 2 : 1;
  const levelNames = ['Level 1 • Active Faculty', 'Level 2 • Senior Instructor', 'Level 3 • Lead Professor', 'Level 4 • Master Academician'];
  const currentLevelName = levelNames[facultyLevel - 1];

  // Admin remarks for this teacher
  const teacherRemarks = useMemo(() => {
    const remarks: { id: string; remark: string; adminName: string; lectureTitle: string; date: string }[] = [];
    lectures.forEach((lec) => {
      lec.adminRemarks?.forEach((rem) => {
        remarks.push({
          id: rem.id,
          remark: rem.remarkText,
          adminName: rem.adminName,
          lectureTitle: lec.title,
          date: new Date(rem.createdAt).toLocaleDateString(),
        });
      });
    });
    return remarks;
  }, [lectures]);

  // Topic category breakdowns
  const needsActionTopics = assignedTopics.filter((t) => {
    const s = t.subtopicsApprovalState || 'pending_teacher_input';
    return t.status !== 'completed' && (s === 'pending_teacher_input' || s === 'revision_requested');
  });

  const inReviewTopics = assignedTopics.filter((t) => {
    return t.status !== 'completed' && t.subtopicsApprovalState === 'pending_admin_approval';
  });

  const readyToDeliverTopics = assignedTopics.filter((t) => {
    return t.status !== 'completed' && t.subtopicsApprovalState === 'approved';
  });

  const completedTopics = assignedTopics.filter((t) => t.status === 'completed');

  // Next active deliverable
  const nextUrgentTopic = useMemo(() => {
    if (readyToDeliverTopics.length > 0) return readyToDeliverTopics[0];
    if (needsActionTopics.length > 0) return needsActionTopics[0];
    return assignedTopics.find((t) => t.status !== 'completed');
  }, [readyToDeliverTopics, needsActionTopics, assignedTopics]);

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    return assignedTopics.filter((topic) => {
      const q = searchTopicQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        topic.topicTitle.toLowerCase().includes(q) ||
        topic.subject.toLowerCase().includes(q) ||
        topic.subtopics.some((st) => st.toLowerCase().includes(q)) ||
        (topic.proposedSubtopics && topic.proposedSubtopics.some((st) => st.toLowerCase().includes(q)));

      if (!matchesSearch) return false;

      const approval = topic.subtopicsApprovalState || 'pending_teacher_input';
      const isCompleted = topic.status === 'completed';

      if (topicFilter === 'needs_action') return !isCompleted && (approval === 'pending_teacher_input' || approval === 'revision_requested');
      if (topicFilter === 'in_review') return !isCompleted && approval === 'pending_admin_approval';
      if (topicFilter === 'ready_to_deliver') return !isCompleted && approval === 'approved';
      if (topicFilter === 'completed') return isCompleted;
      return true;
    });
  }, [assignedTopics, searchTopicQuery, topicFilter]);

  // Filtered lectures
  const filteredLectures = useMemo(() => {
    return lectures.filter((lec) => {
      const q = searchLectureQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lec.title.toLowerCase().includes(q) ||
        lec.primaryTopic.toLowerCase().includes(q) ||
        lec.subject.toLowerCase().includes(q) ||
        lec.subtopics.some((st) => st.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (lectureFilterTab === 'on_time') return lec.status === 'on_time';
      if (lectureFilterTab === 'overdue') return lec.status === 'overdue';
      if (lectureFilterTab === 'with_notes') return !!lec.notesUrl;
      return true;
    });
  }, [lectures, searchLectureQuery, lectureFilterTab]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  const getDeadlineStatus = (deadlineDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadlineDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: 'text-red-400 bg-red-500/10' };
    if (diffDays === 0) return { label: 'Due today', color: 'text-amber-400 bg-amber-500/10' };
    if (diffDays === 1) return { label: 'Due tomorrow', color: 'text-amber-300 bg-amber-500/10' };
    return { label: `Due in ${diffDays}d`, color: 'text-slate-400 bg-slate-800/80' };
  };

  const handleOpenProposeModal = (topic: AssignedTopic) => {
    setProposingTopic(topic);
    const existing = (topic.proposedSubtopics && topic.proposedSubtopics.length > 0)
      ? topic.proposedSubtopics
      : topic.subtopics || [];
    setProposedSubtopicList([...existing]);
    setSubtopicInput('');
  };

  const handleAddProposedTag = () => {
    const raw = subtopicInput.trim();
    if (!raw) return;

    const items = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const updated = [...proposedSubtopicList];

    items.forEach((item) => {
      if (!updated.includes(item)) {
        updated.push(item);
      }
    });

    setProposedSubtopicList(updated);
    setSubtopicInput('');
  };

  const handleRemoveProposedTag = (index: number) => {
    setProposedSubtopicList(proposedSubtopicList.filter((_, i) => i !== index));
  };

  const handleSubmitProposedSubtopics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingTopic) return;
    if (proposedSubtopicList.length === 0) {
      alert('Please add at least one subtopic before submitting.');
      return;
    }

    StorageService.proposeSubtopics(proposingTopic.id, proposedSubtopicList);
    setProposingTopic(null);
    setRefreshKey((k) => k + 1);
  };

  const toggleAcknowledgeRemark = (id: string) => {
    const next = new Set(acknowledgedRemarks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAcknowledgedRemarks(next);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-7 animate-in fade-in duration-150 text-slate-100">
      
      {/* TOAST NOTIFICATION */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl font-semibold text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" /> {copiedToast}
        </div>
      )}

      {/* PAGE 1: 🏠 OVERVIEW DASHBOARD */}
      {(currentPage === 'dashboard' || !currentPage) && (
        <div className="space-y-6">
          
          {/* TIDY HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  {teacher.teacherId}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {teacher.department}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
                Welcome back, {teacher.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Discipline: <strong className="text-slate-300 font-semibold">{teacher.subject}</strong> • {dailyLimit - uploadsToday} uploads remaining today
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => onOpenUpload()}
                disabled={isLimitReached}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {isLimitReached ? 'Daily Limit Reached' : 'Upload Lecture'}
              </button>
            </div>
          </div>

          {/* ACTIVE PRIORITY BANNER (CLEAN & TIDY) */}
          {nextUrgentTopic && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Next Deliverable
                  </div>
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>{nextUrgentTopic.topicTitle}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      • Due {nextUrgentTopic.deadlineDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {nextUrgentTopic.subtopicsApprovalState === 'approved' ? (
                  <button
                    onClick={() => onOpenUpload(nextUrgentTopic)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" /> Deliver Session ➔
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenProposeModal(nextUrgentTopic)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Propose Subtopics ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MINIMAL 4-METRIC GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-1">
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Delivered Lectures</span>
                <Video className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-100">{lectures.length}</div>
              <div className="text-[10px] text-emerald-400 font-medium">
                {onTimeLectures} on-time ({punctualityScore}%)
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-1">
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Active Syllabus</span>
                <Layers className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-100">{assignedTopics.length}</div>
              <div className="text-[10px] text-indigo-400 font-medium">
                {readyToDeliverTopics.length} ready to deliver
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-1">
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Today's Uploads</span>
                <Target className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-100">{uploadsToday} <span className="text-xs font-normal text-slate-400">/ {dailyLimit}</span></div>
              <div className="text-[10px] text-slate-400 font-medium">
                {dailyLimit - uploadsToday} remaining today
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-1">
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Faculty Status</span>
                <Star className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-base font-black text-slate-100 truncate mt-1">{currentLevelName}</div>
              <div className="text-[10px] text-orange-400 font-medium flex items-center gap-1">
                <Flame className="w-3 h-3 fill-orange-400" /> {currentStreakDays} streak
              </div>
            </div>
          </div>

          {/* TWO TIDY PANELS: SYLLABUS OVERVIEW & SUBJECT DRIVE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Syllabus Action Overview */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                  Syllabus Breakdown
                </h3>
                <button
                  onClick={() => onPageChange('syllabus')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div 
                  onClick={() => { setTopicFilter('needs_action'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-center"
                >
                  <div className="text-lg font-black text-amber-400">{needsActionTopics.length}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Needs Subtopics</div>
                </div>
                <div 
                  onClick={() => { setTopicFilter('in_review'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-center"
                >
                  <div className="text-lg font-black text-purple-300">{inReviewTopics.length}</div>
                  <div className="text-[10px] text-slate-400 font-medium">In Review</div>
                </div>
                <div 
                  onClick={() => { setTopicFilter('ready_to_deliver'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-center"
                >
                  <div className="text-lg font-black text-emerald-400">{readyToDeliverTopics.length}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Ready to Record</div>
                </div>
              </div>
            </div>

            {/* Subject Reference Drive */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                    Subject Resource Material
                  </h3>
                  <button
                    onClick={() => onPageChange('resources')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5"
                  >
                    Full Hub <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {subjectReference ? (
                  <div className="pt-1">
                    <h4 className="text-xs font-bold text-slate-200">{subjectReference.title}</h4>
                    {subjectReference.notes && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                        "{subjectReference.notes}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic pt-1">No reference materials attached yet.</p>
                )}
              </div>

              {subjectReference && (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={subjectReference.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Drive
                  </a>
                  <button
                    onClick={() => copyToClipboard(subjectReference.referenceUrl, 'Drive URL')}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RECENT DELIVERIES (CLEAN TIDY LIST) */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                Recent Deliveries ({lectures.length})
              </h3>
              <button
                onClick={() => onPageChange('lectures')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5"
              >
                View Archive <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {lectures.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs italic">
                No lectures delivered yet. Click "Upload Lecture" above to submit your first session.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {lectures.slice(0, 3).map((lec) => (
                  <div key={lec.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate flex-1">
                      <div className="font-bold text-slate-200 truncate">{lec.title}</div>
                      <div className="text-[11px] text-slate-400">{lec.primaryTopic} • {new Date(lec.createdAt).toLocaleDateString()}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lec.status === 'on_time' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {lec.status === 'on_time' ? 'On-Time' : 'Overdue'}
                      </span>

                      <button
                        onClick={() => setSelectedLectureForPreview(lec)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5 fill-slate-200" /> Watch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE 2: 📌 SYLLABUS TOPICS & SUBTOPICS PIPELINE */}
      {currentPage === 'syllabus' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Syllabus & Topics</h2>
              <p className="text-xs text-slate-400">Propose subtopics, check approval status, and deliver sessions</p>
            </div>
            <button
              onClick={() => onOpenUpload()}
              disabled={isLimitReached}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Upload Lecture
            </button>
          </div>

          {/* Clean Filters & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTopicFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  topicFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({assignedTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('needs_action')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  topicFilter === 'needs_action' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300'
                }`}
              >
                Needs Subtopics ({needsActionTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('in_review')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  topicFilter === 'in_review' ? 'bg-purple-600 text-white' : 'bg-slate-900 border border-slate-800 text-purple-300 hover:text-purple-200'
                }`}
              >
                In Review ({inReviewTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('ready_to_deliver')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  topicFilter === 'ready_to_deliver' ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-emerald-300 hover:text-emerald-200'
                }`}
              >
                Ready to Record ({readyToDeliverTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  topicFilter === 'completed' ? 'bg-slate-800 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Completed ({completedTopics.length})
              </button>
            </div>

            <div className="relative w-full md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchTopicQuery}
                onChange={(e) => setSearchTopicQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Clean Topic Cards */}
          {filteredTopics.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl text-slate-400 text-xs space-y-1">
              <div className="text-2xl">📋</div>
              <div className="font-bold text-slate-300">No topics found</div>
              <p>Try clearing your filter or searching for another keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map((topic) => {
                const isCompleted = topic.status === 'completed';
                const deadline = getDeadlineStatus(topic.deadlineDate);
                const approvalState = topic.subtopicsApprovalState || 'pending_teacher_input';
                const isApproved = approvalState === 'approved';
                const isUnderReview = approvalState === 'pending_admin_approval';
                const isRevision = approvalState === 'revision_requested';

                return (
                  <div
                    key={topic.id}
                    className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate flex-1">
                          <span className="text-[10px] font-mono text-indigo-400 block font-semibold">{topic.subject}</span>
                          <h4 className="font-black text-sm text-slate-100 truncate mt-0.5">{topic.topicTitle}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${deadline.color}`}>
                          {deadline.label}
                        </span>
                      </div>

                      {/* Status Tag */}
                      <div className="flex items-center gap-1.5">
                        {isCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            ✓ Completed
                          </span>
                        ) : isApproved ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            ● Ready to Record
                          </span>
                        ) : isUnderReview ? (
                          <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                            ⏳ Under Admin Review
                          </span>
                        ) : isRevision ? (
                          <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                            ⚠️ Revision Requested
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                            📝 Subtopics Needed
                          </span>
                        )}
                      </div>

                      {/* Subtopics */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] text-slate-400 font-semibold">Subtopics:</div>
                        {((isUnderReview || isRevision) ? topic.proposedSubtopics : topic.subtopics)?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {((isUnderReview || isRevision) ? topic.proposedSubtopics! : topic.subtopics).map((st, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                                #{st}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">No subtopics defined yet.</p>
                        )}
                      </div>

                      {isRevision && topic.adminFeedback && (
                        <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 text-[11px] text-red-300 italic">
                          Admin: "{topic.adminFeedback}"
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80">
                      {isCompleted ? (
                        <div className="text-center text-[11px] text-emerald-400 font-bold py-1">
                          ✓ Delivered
                        </div>
                      ) : isApproved ? (
                        <button
                          onClick={() => onOpenUpload(topic)}
                          disabled={isLimitReached}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" /> Upload Lecture ➔
                        </button>
                      ) : isUnderReview ? (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Proposal
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 fill-slate-950" />
                          {isRevision ? 'Resubmit Subtopics' : '+ Propose Subtopics'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PAGE 3: 📹 DELIVERED LECTURES */}
      {currentPage === 'lectures' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Delivered Lectures ({lectures.length})</h2>
              <p className="text-xs text-slate-400">All submitted lecture video recordings and PDF notes</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setLectureFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    lectureFilterTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setLectureFilterTab('on_time')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    lectureFilterTab === 'on_time' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  On-Time
                </button>
                <button
                  onClick={() => setLectureFilterTab('with_notes')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    lectureFilterTab === 'with_notes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  With Notes
                </button>
              </div>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchLectureQuery}
                  onChange={(e) => setSearchLectureQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {filteredLectures.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl text-slate-400 text-xs italic">
              No lecture recordings found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredLectures.map((lec) => (
                <div key={lec.id} className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate flex-1">
                        <span className="text-[10px] text-indigo-400 font-mono font-semibold">{lec.subject}</span>
                        <h4 className="font-bold text-sm text-slate-100 truncate mt-0.5">{lec.title}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        lec.status === 'on_time' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {lec.status === 'on_time' ? 'On-Time' : 'Overdue'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Topic: <span className="text-slate-200">{lec.primaryTopic}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-slate-500">{new Date(lec.createdAt).toLocaleDateString()}</span>
                    
                    <div className="flex items-center gap-2">
                      {lec.notesUrl && (
                        <a
                          href={lec.notesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Notes PDF
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedLectureForPreview(lec)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5 fill-white" /> Watch
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAGE 4: 📚 SUBJECT RESOURCES */}
      {currentPage === 'resources' && (
        <div className="space-y-5">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-xl font-black text-slate-100 tracking-tight">Subject Reference Library</h2>
            <p className="text-xs text-slate-400">Curriculum guidelines and master Google Drive folder for {teacher.subject}</p>
          </div>

          {subjectReference ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    {subjectReference.subjectName}
                  </span>
                  <h3 className="text-base font-black text-slate-100 mt-1.5">{subjectReference.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(subjectReference.referenceUrl, 'Drive Link')}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" /> Copy Link
                  </button>
                  <a
                    href={subjectReference.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Drive ↗
                  </a>
                </div>
              </div>

              {subjectReference.notes && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-slate-400 text-[10px] uppercase">Admin Instructions & Recommended Books:</div>
                  <p className="italic leading-relaxed">"{subjectReference.notes}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl text-slate-500 text-xs italic">
              No subject reference material attached yet.
            </div>
          )}
        </div>
      )}

      {/* PAGE 5: 💬 ADMIN DIRECTIVES */}
      {currentPage === 'directives' && (
        <div className="space-y-5">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-xl font-black text-slate-100 tracking-tight">Admin Directives ({teacherRemarks.length})</h2>
            <p className="text-xs text-slate-400">Quality feedback and guidance remarks from academic operations</p>
          </div>

          {teacherRemarks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl text-slate-500 text-xs italic">
              No directives posted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {teacherRemarks.map((rem) => {
                const isAck = acknowledgedRemarks.has(rem.id);
                return (
                  <div key={rem.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 truncate">Re: {rem.lectureTitle}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">{rem.date}</span>
                      </div>
                      <p className="text-xs text-slate-300 italic bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        "{rem.remark}"
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">By: {rem.adminName}</span>
                      <button
                        onClick={() => toggleAcknowledgeRemark(rem.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                          isAck ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {isAck ? <Check className="w-3 h-3" /> : null}
                        {isAck ? 'Acknowledged' : 'Acknowledge'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PROPOSE SUBTOPICS MODAL */}
      {proposingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Propose Subtopics</h3>
                <p className="text-xs text-slate-400">{proposingTopic.topicTitle}</p>
              </div>
              <button onClick={() => setProposingTopic(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSubmitProposedSubtopics} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">
                  Subtopics (Type or separate with commas):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Tarjan SCC, Bridges, Kosaraju"
                    value={subtopicInput}
                    onChange={(e) => setSubtopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProposedTag();
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddProposedTag}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl min-h-[70px]">
                {proposedSubtopicList.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-2">No subtopics added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {proposedSubtopicList.map((st, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 flex items-center gap-1.5 font-medium">
                        #{st}
                        <button
                          type="button"
                          onClick={() => handleRemoveProposedTag(idx)}
                          className="text-slate-400 hover:text-red-400 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProposingTopic(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={proposedSubtopicList.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLectureForPreview && (
        <VideoModal
          lecture={selectedLectureForPreview}
          onClose={() => setSelectedLectureForPreview(null)}
        />
      )}
    </div>
  );
};
