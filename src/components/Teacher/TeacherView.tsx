import React, { useState, useMemo } from 'react';
import type { User, Lecture, AssignedTopic } from '../../types';
import { StorageService } from '../../services/storage';
import { VideoModal } from '../Common/VideoModal';
import { 
  Search, FileText, Plus, Play,
  Edit3, ExternalLink, Copy, Check, ChevronRight,
  Clock, CheckCircle, AlertCircle
} from 'lucide-react';

interface TeacherViewProps {
  teacher: User;
  currentPage: string;
  onPageChange: (page: string) => void;
  onOpenUpload: (prefillTopic?: AssignedTopic) => void;
  onOpenCommitmentModal?: () => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({ 
  teacher, 
  currentPage, 
  onPageChange, 
  onOpenUpload,
  onOpenCommitmentModal,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [topicFilter, setTopicFilter] = useState<'all' | 'needs_action' | 'in_review' | 'ready_to_deliver' | 'completed'>('all');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [acknowledgedRemarks, setAcknowledgedRemarks] = useState<Set<string>>(new Set());

  const dailyCommitment = useMemo(() => {
    return StorageService.getDailyCommitment(teacher.teacherId);
  }, [teacher.teacherId, refreshKey]);

  const formatDisplayTime = (time24?: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${period}`;
  };

  const lectures = useMemo(() => {
    return StorageService.getLectures().filter((l) => l.teacherId.toUpperCase() === teacher.teacherId.toUpperCase());
  }, [teacher.teacherId, refreshKey]);

  const assignedTopics = useMemo(() => {
    return StorageService.getAssignedTopics().filter((t) => t.teacherId.toUpperCase() === teacher.teacherId.toUpperCase());
  }, [teacher.teacherId, refreshKey]);

  const subjectReference = useMemo(() => {
    return StorageService.getReferenceForSubject(teacher.subject);
  }, [teacher.subject, refreshKey]);

  const minutesRecordedToday = StorageService.getMinutesRecordedToday(teacher.teacherId);
  const targetMinutes = teacher.dailyTargetMinutes || 120;
  const isTargetReached = minutesRecordedToday >= targetMinutes;

  const [selectedLectureForPreview, setSelectedLectureForPreview] = useState<Lecture | null>(null);
  const [searchTopicQuery, setSearchTopicQuery] = useState('');
  const [searchLectureQuery, setSearchLectureQuery] = useState('');
  const [lectureFilterTab, setLectureFilterTab] = useState<'all' | 'on_time' | 'with_notes'>('all');

  // Modal State for Proposing Subtopics
  const [proposingTopic, setProposingTopic] = useState<AssignedTopic | null>(null);
  const [proposedSubtopicList, setProposedSubtopicList] = useState<string[]>([]);
  const [subtopicInput, setSubtopicInput] = useState('');

  // Performance metrics
  const onTimeLectures = lectures.filter((l) => l.status === 'on_time').length;
  const punctualityScore = lectures.length > 0 ? Math.round((onTimeLectures / lectures.length) * 100) : 100;

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
      if (lectureFilterTab === 'with_notes') return !!lec.notesUrl;
      return true;
    });
  }, [lectures, searchLectureQuery, lectureFilterTab]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToast(`Copied ${label}`);
    setTimeout(() => setCopiedToast(null), 2000);
  };

  const getDeadlineText = (deadlineDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadlineDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
    if (diffDays === 0) return { text: 'Due today', isToday: true };
    if (diffDays === 1) return { text: 'Due tomorrow', isNear: true };
    return { text: `Due in ${diffDays}d`, isNormal: true };
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
      alert('Please add at least one subtopic.');
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
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-150 text-slate-200">
      
      {/* TOAST FEEDBACK */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-slate-100 px-3.5 py-2 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> {copiedToast}
        </div>
      )}

      {/* ─── OVERVIEW DASHBOARD ─── */}
      {(currentPage === 'dashboard' || !currentPage) && (
        <div className="space-y-8">
          
          {/* MINIMAL HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                {teacher.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {teacher.subject} • {teacher.department}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={onOpenCommitmentModal}
                className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-xs transition-colors flex items-center gap-1.5"
                title="Change today's upload commitment time"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{dailyCommitment ? `Upload by ${formatDisplayTime(dailyCommitment.promisedTime)}` : 'Set Upload Time'}</span>
              </button>

              <button
                onClick={() => onOpenUpload()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Upload Lecture
              </button>
            </div>
          </div>

          {/* COMMITTED UPLOAD SCHEDULE BANNER */}
          <div className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <span>Today's Upload Commitment:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {dailyCommitment ? formatDisplayTime(dailyCommitment.promisedTime) : 'Not committed yet'}
                  </span>
                  {dailyCommitment && (
                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      Confirmed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {dailyCommitment?.note ? `"${dailyCommitment.note}"` : 'Your promised time for uploading today\'s lecture recordings'}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenCommitmentModal}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-lg transition-colors text-xs self-start sm:self-auto shrink-0"
            >
              {dailyCommitment ? 'Edit Time' : 'Set Upload Time →'}
            </button>
          </div>

          {/* ACTIVE PRIORITY NOTIFICATION (IF ANY) */}
          {nextUrgentTopic && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Priority Deliverable</span>
                <div className="font-semibold text-slate-100 flex items-center gap-2">
                  <span>{nextUrgentTopic.topicTitle}</span>
                  <span className="text-[11px] text-slate-400 font-mono">Due {nextUrgentTopic.deadlineDate}</span>
                </div>
              </div>

              {nextUrgentTopic.subtopicsApprovalState === 'approved' ? (
                <button
                  onClick={() => onOpenUpload(nextUrgentTopic)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  Deliver Session →
                </button>
              ) : (
                <button
                  onClick={() => handleOpenProposeModal(nextUrgentTopic)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  <Edit3 className="w-3 h-3" /> Propose Subtopics →
                </button>
              )}
            </div>
          )}

          {/* MINIMAL HORIZONTAL STATS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">Today's Recording</div>
              <div className="text-xl font-bold text-slate-100">
                {minutesRecordedToday} <span className="text-xs font-normal text-slate-500">/ {targetMinutes}m</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {isTargetReached ? (
                  <span className="text-emerald-400 font-medium">Target Met ✓</span>
                ) : (
                  <span>{targetMinutes - minutesRecordedToday}m remaining</span>
                )}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">Delivered Sessions</div>
              <div className="text-xl font-bold text-slate-100">{lectures.length}</div>
              <div className="text-[11px] text-emerald-400">{punctualityScore}% on-time</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">Active Syllabus</div>
              <div className="text-xl font-bold text-slate-100">{assignedTopics.length}</div>
              <div className="text-[11px] text-slate-400">{readyToDeliverTopics.length} ready to record</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">On-Time Streak</div>
              <div className="text-xl font-bold text-slate-100">{onTimeLectures}</div>
              <div className="text-[11px] text-slate-400">Sessions recorded</div>
            </div>
          </div>

          {/* TWO CLEAN PANELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Syllabus Overview */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Syllabus Status</span>
                <button
                  onClick={() => onPageChange('syllabus')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div 
                  onClick={() => { setTopicFilter('needs_action'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="text-base font-bold text-amber-400">{needsActionTopics.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Needs Action</div>
                </div>
                <div 
                  onClick={() => { setTopicFilter('in_review'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="text-base font-bold text-purple-300">{inReviewTopics.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">In Review</div>
                </div>
                <div 
                  onClick={() => { setTopicFilter('ready_to_deliver'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="text-base font-bold text-emerald-400">{readyToDeliverTopics.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Ready to Record</div>
                </div>
              </div>
            </div>

            {/* Subject Reference Hub */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">Reference Material</span>
                  <button
                    onClick={() => onPageChange('resources')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                  >
                    Details <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {subjectReference ? (
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-200 truncate">{subjectReference.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{teacher.subject}</div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No reference materials added yet.</p>
                )}
              </div>

              {subjectReference && (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={subjectReference.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Drive
                  </a>
                  <button
                    onClick={() => copyToClipboard(subjectReference.referenceUrl, 'Drive URL')}
                    className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-lg transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RECENT DELIVERIES */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Recent Deliveries</span>
              <button
                onClick={() => onPageChange('lectures')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
              >
                Archive ({lectures.length}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {lectures.length === 0 ? (
              <div className="py-4 text-center text-slate-500 text-xs italic">
                No lectures delivered yet. Click "Upload Lecture" to submit your first session.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {lectures.slice(0, 3).map((lec) => (
                  <div key={lec.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate flex-1">
                      <div className="font-semibold text-slate-200 truncate">{lec.title}</div>
                      <div className="text-[11px] text-slate-400">{lec.primaryTopic} • {lec.durationMinutes || 45}m</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium ${
                        lec.status === 'on_time' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {lec.status === 'on_time' ? '✓ On-Time' : 'Overdue'}
                      </span>

                      <button
                        onClick={() => setSelectedLectureForPreview(lec)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1 font-medium transition-colors"
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

      {/* ─── SYLLABUS TOPICS PIPELINE ─── */}
      {currentPage === 'syllabus' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Syllabus & Topics</h2>
              <p className="text-xs text-slate-400">Propose subtopics, check approval status, and deliver sessions</p>
            </div>
            <button
              onClick={() => onOpenUpload()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Upload Lecture
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 text-xs">
              <button
                onClick={() => setTopicFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  topicFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({assignedTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('needs_action')}
                className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  topicFilter === 'needs_action' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Needs Action ({needsActionTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('in_review')}
                className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  topicFilter === 'in_review' ? 'bg-slate-800 text-purple-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                In Review ({inReviewTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('ready_to_deliver')}
                className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  topicFilter === 'ready_to_deliver' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ready to Record ({readyToDeliverTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('completed')}
                className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  topicFilter === 'completed' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Done ({completedTopics.length})
              </button>
            </div>

            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchTopicQuery}
                onChange={(e) => setSearchTopicQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-slate-700"
              />
            </div>
          </div>

          {/* Minimal Topic Cards */}
          {filteredTopics.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 border border-slate-800/60 rounded-xl text-slate-400 text-xs">
              No topics match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredTopics.map((topic) => {
                const isCompleted = topic.status === 'completed';
                const deadline = getDeadlineText(topic.deadlineDate);
                const approvalState = topic.subtopicsApprovalState || 'pending_teacher_input';
                const isApproved = approvalState === 'approved';
                const isUnderReview = approvalState === 'pending_admin_approval';
                const isRevision = approvalState === 'revision_requested';

                return (
                  <div
                    key={topic.id}
                    className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-4 space-y-3.5 flex flex-col justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate flex-1">
                          <h4 className="font-semibold text-slate-100 truncate">{topic.topicTitle}</h4>
                          <span className="text-[11px] text-slate-400 block">{topic.subject}</span>
                        </div>
                        <span className={`text-[10px] font-mono shrink-0 ${
                          deadline.isOverdue ? 'text-red-400' : deadline.isToday ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {deadline.text}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {isCompleted ? (
                          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Delivered</span>
                        ) : isApproved ? (
                          <span className="text-emerald-400 flex items-center gap-1">● Ready to Record</span>
                        ) : isUnderReview ? (
                          <span className="text-purple-300 flex items-center gap-1"><Clock className="w-3 h-3" /> In Admin Review</span>
                        ) : isRevision ? (
                          <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Revision Needed</span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">○ Subtopics Needed</span>
                        )}
                      </div>

                      {/* Subtopics */}
                      <div className="space-y-1 pt-1">
                        {((isUnderReview || isRevision) ? topic.proposedSubtopics : topic.subtopics)?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {((isUnderReview || isRevision) ? topic.proposedSubtopics! : topic.subtopics).map((st, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-300">
                                #{st}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">No subtopics defined yet.</p>
                        )}
                      </div>

                      {isRevision && topic.adminFeedback && (
                        <div className="p-2 bg-red-950/20 rounded-lg border border-red-500/20 text-[11px] text-red-300 italic">
                          "{topic.adminFeedback}"
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/50">
                      {isCompleted ? (
                        <div className="text-center text-[11px] text-emerald-400 font-medium py-0.5">
                          ✓ Completed
                        </div>
                      ) : isApproved ? (
                        <button
                          onClick={() => onOpenUpload(topic)}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
                        >
                          Upload Lecture →
                        </button>
                      ) : isUnderReview ? (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 font-medium rounded-lg transition-colors"
                        >
                          Edit Proposal
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors"
                        >
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

      {/* ─── DELIVERED LECTURES ─── */}
      {currentPage === 'lectures' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Delivered Lectures ({lectures.length})</h2>
              <p className="text-xs text-slate-400">All submitted lecture video recordings and PDF notes</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setLectureFilterTab('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    lectureFilterTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setLectureFilterTab('on_time')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    lectureFilterTab === 'on_time' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  On-Time
                </button>
                <button
                  onClick={() => setLectureFilterTab('with_notes')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    lectureFilterTab === 'with_notes' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Notes
                </button>
              </div>

              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchLectureQuery}
                  onChange={(e) => setSearchLectureQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-slate-700"
                />
              </div>
            </div>
          </div>

          {filteredLectures.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 border border-slate-800/60 rounded-xl text-slate-400 text-xs italic">
              No lecture recordings found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredLectures.map((lec) => (
                <div key={lec.id} className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-4 space-y-3 flex flex-col justify-between text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate flex-1">
                        <h4 className="font-semibold text-slate-100 truncate">{lec.title}</h4>
                        <span className="text-[11px] text-slate-400">{lec.subject}</span>
                      </div>
                      <span className={`text-[10px] font-medium shrink-0 ${
                        lec.status === 'on_time' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {lec.status === 'on_time' ? '✓ On-Time' : 'Overdue'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Topic: <strong className="text-slate-300 font-normal">{lec.primaryTopic}</strong></span>
                      <span className="font-mono text-slate-400">{lec.durationMinutes || 45}m</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">{new Date(lec.createdAt).toLocaleDateString()}</span>
                    
                    <div className="flex items-center gap-2">
                      {lec.notesUrl && (
                        <a
                          href={lec.notesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-md text-xs font-medium flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Notes
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedLectureForPreview(lec)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md text-xs flex items-center gap-1 transition-colors"
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

      {/* ─── SUBJECT REFERENCE LIBRARY ─── */}
      {currentPage === 'resources' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Subject Library</h2>
            <p className="text-xs text-slate-400">Curriculum reference materials and master Drive folder for {teacher.subject}</p>
          </div>

          {subjectReference ? (
            <div className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                <div>
                  <h3 className="font-semibold text-slate-100">{subjectReference.title}</h3>
                  <span className="text-[11px] text-slate-400">{subjectReference.subjectName} • {subjectReference.department}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(subjectReference.referenceUrl, 'Drive Link')}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy Link
                  </button>
                  <a
                    href={subjectReference.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Drive
                  </a>
                </div>
              </div>

              {subjectReference.notes && (
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 text-slate-300 space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Admin Instructions:</div>
                  <p className="italic">{subjectReference.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/30 border border-slate-800/60 rounded-xl text-slate-500 text-xs italic">
              No reference materials added for this subject.
            </div>
          )}
        </div>
      )}

      {/* ─── ADMIN DIRECTIVES ─── */}
      {currentPage === 'directives' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Admin Directives ({teacherRemarks.length})</h2>
            <p className="text-xs text-slate-400">Feedback and guidance notes from academic operations</p>
          </div>

          {teacherRemarks.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 border border-slate-800/60 rounded-xl text-slate-500 text-xs italic">
              No directives posted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teacherRemarks.map((rem) => {
                const isAck = acknowledgedRemarks.has(rem.id);
                return (
                  <div key={rem.id} className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-4 space-y-3 flex flex-col justify-between text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 truncate">Re: {rem.lectureTitle}</span>
                        <span className="text-[10px] text-slate-500">{rem.date}</span>
                      </div>
                      <p className="text-slate-300 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                        "{rem.remark}"
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">From: {rem.adminName}</span>
                      <button
                        onClick={() => toggleAcknowledgeRemark(rem.id)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          isAck ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-300 bg-slate-800 hover:text-white'
                        }`}
                      >
                        {isAck ? '✓ Acknowledged' : 'Acknowledge'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── PROPOSE SUBTOPICS MODAL ─── */}
      {proposingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-100">Propose Subtopics</h3>
                <p className="text-xs text-slate-400">{proposingTopic.topicTitle}</p>
              </div>
              <button onClick={() => setProposingTopic(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSubmitProposedSubtopics} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-medium">
                  Subtopics (Single or comma-separated):
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
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={handleAddProposedTag}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg min-h-[60px]">
                {proposedSubtopicList.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-2">No subtopics added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {proposedSubtopicList.map((st, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 flex items-center gap-1.5 text-xs">
                        #{st}
                        <button
                          type="button"
                          onClick={() => handleRemoveProposedTag(idx)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
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
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  Submit
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
