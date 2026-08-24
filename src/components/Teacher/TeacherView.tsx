import React, { useState, useMemo, useEffect } from 'react';
import type { User, Lecture, AssignedTopic } from '../../types';
import { StorageService } from '../../services/storage';
import { VideoModal } from '../Common/VideoModal';
import { PptRequestPortal } from './PptRequestPortal';
import confetti from 'canvas-confetti';
import { 
  Search, FileText, Plus, Play,
  Edit3, ExternalLink, Copy, Check, ChevronRight, ChevronDown,
  Clock, CheckCircle, AlertTriangle, MessageSquare,
  FileSpreadsheet, Award, Image as ImageIcon, Folder,
  CheckCircle2, MessageCircle, Video,
  ArrowUp, ArrowDown, Trash2
} from 'lucide-react';

interface TeacherViewProps {
  teacher: User;
  currentPage: string;
  onPageChange: (page: string) => void;
  onOpenUpload: (prefillTopic?: AssignedTopic) => void;
  refreshTrigger?: number;
}

export const TeacherView: React.FC<TeacherViewProps> = ({ 
  teacher, 
  currentPage, 
  onPageChange, 
  onOpenUpload,
  refreshTrigger,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [topicFilter, setTopicFilter] = useState<'all' | 'revision_needed' | 'needs_action' | 'in_review' | 'ready_to_deliver' | 'completed'>('all');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  useEffect(() => {
    setRefreshKey((prev) => prev + 1);
  }, [refreshTrigger]);

  // Real-time ticking countdown for today's submission deadline
  const [timeRemaining, setTimeRemaining] = useState(() =>
    StorageService.getTodayTimeRemaining(teacher.teacherId)
  );

  useEffect(() => {
    const updateCountdown = () => {
      setTimeRemaining(StorageService.getTodayTimeRemaining(teacher.teacherId));
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    const handleStorageChange = () => {
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, [teacher.teacherId, refreshKey]);

  const lectures = useMemo(() => {
    return StorageService.getLectures().filter((l) => l.teacherId.toUpperCase() === teacher.teacherId.toUpperCase());
  }, [teacher.teacherId, refreshKey]);

  const assignedTopics = useMemo(() => {
    return StorageService.getAssignedTopics().filter((t) => t.teacherId.toUpperCase() === teacher.teacherId.toUpperCase());
  }, [teacher.teacherId, refreshKey]);

  const subjectReference = useMemo(() => {
    return StorageService.getReferenceForSubject(teacher.subject);
  }, [teacher.subject, refreshKey]);

  const pptRequests = useMemo(() => {
    return StorageService.getTeacherPptRequests(teacher.teacherId);
  }, [teacher.teacherId, refreshKey]);

  // On-time lecture submission statistics
  const onTimeStats = useMemo(() => {
    return StorageService.getOnTimeSubmissionStats(teacher.teacherId);
  }, [teacher.teacherId, refreshKey]);

  // Admin update notification counts
  const adminNotifications = useMemo(() => {
    return StorageService.getTeacherAdminNotificationCounts(teacher.teacherId);
  }, [teacher.teacherId, refreshKey]);

  const backlogInfo = useMemo(() => {
    return StorageService.getPreviousDayBacklog(teacher.teacherId);
  }, [teacher.teacherId, refreshKey, lectures]);

  const minutesRecordedToday = StorageService.getMinutesRecordedToday(teacher.teacherId);
  const targetMinutes = teacher.dailyTargetMinutes || 120;
  const isTargetReached = minutesRecordedToday >= targetMinutes;
  const remainingMinutesToday = Math.max(0, targetMinutes - minutesRecordedToday);

  const [selectedLectureForPreview, setSelectedLectureForPreview] = useState<Lecture | null>(null);
  const [searchTopicQuery, setSearchTopicQuery] = useState('');
  const [searchLectureQuery, setSearchLectureQuery] = useState('');
  const [lectureFilterTab, setLectureFilterTab] = useState<'all' | 'on_time' | 'with_notes'>('all');

  // Modal State for Proposing Subtopics
  const [proposingTopic, setProposingTopic] = useState<AssignedTopic | null>(null);
  const [proposedSubtopicList, setProposedSubtopicList] = useState<string[]>([]);
  const [subtopicInput, setSubtopicInput] = useState('');



  // Admin remarks filter state
  const [directiveFilterTab, setDirectiveFilterTab] = useState<'all' | 'pending' | 'acknowledged'>('all');
  const [searchDirectiveQuery, setSearchDirectiveQuery] = useState('');

  // Admin remarks for this teacher
  const teacherRemarks = useMemo(() => {
    const remarks: { 
      id: string; 
      lectureId: string;
      remark: string; 
      adminName: string; 
      lectureTitle: string; 
      date: string;
      createdAt?: string;
      isAcknowledged?: boolean;
      acknowledgedAt?: string;
      acknowledgedByName?: string;
    }[] = [];
    lectures.forEach((lec) => {
      lec.adminRemarks?.forEach((rem) => {
        remarks.push({
          id: rem.id,
          lectureId: lec.id,
          remark: rem.remarkText,
          adminName: rem.adminName,
          lectureTitle: lec.title,
          date: new Date(rem.createdAt).toLocaleDateString(),
          createdAt: rem.createdAt,
          isAcknowledged: rem.isAcknowledged,
          acknowledgedAt: rem.acknowledgedAt,
          acknowledgedByName: rem.acknowledgedByName,
        });
      });
    });
    // Sort: unacknowledged first, then by date descending
    return remarks.sort((a, b) => {
      if (!a.isAcknowledged && b.isAcknowledged) return -1;
      if (a.isAcknowledged && !b.isAcknowledged) return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [lectures]);

  const unacknowledgedDirectivesCount = useMemo(() => {
    return teacherRemarks.filter((r) => !r.isAcknowledged).length;
  }, [teacherRemarks]);

  const acknowledgedDirectivesCount = useMemo(() => {
    return teacherRemarks.filter((r) => r.isAcknowledged).length;
  }, [teacherRemarks]);

  const filteredTeacherRemarks = useMemo(() => {
    const q = searchDirectiveQuery.toLowerCase().trim();
    return teacherRemarks.filter((rem) => {
      if (directiveFilterTab === 'pending' && rem.isAcknowledged) return false;
      if (directiveFilterTab === 'acknowledged' && !rem.isAcknowledged) return false;
      if (q) {
        return (
          rem.remark.toLowerCase().includes(q) ||
          rem.lectureTitle.toLowerCase().includes(q) ||
          rem.adminName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teacherRemarks, directiveFilterTab, searchDirectiveQuery]);

  // Topic category breakdowns
  const revisionTopics = useMemo(() => {
    return assignedTopics.filter((t) => {
      const s = t.subtopicsApprovalState || 'pending_teacher_input';
      return t.status !== 'completed' && s === 'revision_requested';
    });
  }, [assignedTopics]);

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
    if (revisionTopics.length > 0) return revisionTopics[0];
    if (readyToDeliverTopics.length > 0) return readyToDeliverTopics[0];
    if (needsActionTopics.length > 0) return needsActionTopics[0];
    return assignedTopics.find((t) => t.status !== 'completed');
  }, [revisionTopics, readyToDeliverTopics, needsActionTopics, assignedTopics]);

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

      if (topicFilter === 'revision_needed') return !isCompleted && approval === 'revision_requested';
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

  // Resolve Unit for a lecture
  const resolveLectureUnit = (lec: Lecture, topics: AssignedTopic[]): string => {
    if (lec.unitNumber && lec.unitNumber.trim()) {
      return lec.unitNumber.trim().toUpperCase();
    }
    if (lec.assignedTopicId) {
      const matched = topics.find((t) => t.id === lec.assignedTopicId);
      if (matched?.unitNumber && matched.unitNumber.trim()) {
        return matched.unitNumber.trim().toUpperCase();
      }
    }
    const matchedByTitle = topics.find(
      (t) => t.topicTitle.toLowerCase() === lec.primaryTopic.toLowerCase()
    );
    if (matchedByTitle?.unitNumber && matchedByTitle.unitNumber.trim()) {
      return matchedByTitle.unitNumber.trim().toUpperCase();
    }
    const match = `${lec.title} ${lec.primaryTopic}`.match(/\b(UNIT|MODULE)\s*([0-9IVX]+)/i);
    if (match) {
      return `UNIT ${match[2].toUpperCase()}`;
    }
    return 'UNIT 1';
  };

  // Group filtered lectures strictly unit-wise
  const unitGroupedLectures = useMemo(() => {
    const map = new Map<string, { unitName: string; lectures: Lecture[]; totalDuration: number }>();

    filteredLectures.forEach((lec) => {
      const uName = resolveLectureUnit(lec, assignedTopics);
      if (!map.has(uName)) {
        map.set(uName, { unitName: uName, lectures: [], totalDuration: 0 });
      }
      const group = map.get(uName)!;
      group.lectures.push(lec);
      group.totalDuration += (lec.durationMinutes || 45);
    });

    const sortUnits = (a: string, b: string) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    };

    return Array.from(map.values()).sort((a, b) => sortUnits(a.unitName, b.unitName));
  }, [filteredLectures, assignedTopics]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToast(`Copied ${label}`);
    setTimeout(() => setCopiedToast(null), 2000);
  };



  const handleOpenProposeModal = (topic: AssignedTopic) => {
    setProposingTopic(topic);
    // Priority: if admin has already approved subtopics, show those (preserving admin's edits/reordering).
    // Otherwise fall back to what teacher proposed, then to empty.
    const existing = (topic.subtopicsApprovalState === 'approved' && topic.subtopics && topic.subtopics.length > 0)
      ? topic.subtopics
      : (topic.proposedSubtopics && topic.proposedSubtopics.length > 0)
      ? topic.proposedSubtopics
      : topic.subtopics || [];
    setProposedSubtopicList([...existing]);
    setSubtopicInput('');
  };

  const handleAddProposedTag = () => {
    const raw = subtopicInput.trim();
    if (!raw) return;

    const items = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    setProposedSubtopicList((prev) => {
      const updated = [...prev];
      items.forEach((item) => {
        if (!updated.includes(item)) {
          updated.push(item);
        }
      });
      return updated;
    });
    setSubtopicInput('');
  };

  const handleUpdateProposedSubtopic = (index: number, newName: string) => {
    setProposedSubtopicList((prev) => {
      const updated = [...prev];
      updated[index] = newName;
      return updated;
    });
  };

  const handleRemoveProposedTag = (index: number) => {
    setProposedSubtopicList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveProposedUp = (index: number) => {
    if (index <= 0) return;
    setProposedSubtopicList((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveProposedDown = (index: number) => {
    setProposedSubtopicList((prev) => {
      if (index >= prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  const handleJumpProposedSubtopic = (currentIndex: number, newIndex: number) => {
    setProposedSubtopicList((prev) => {
      const updated = [...prev];
      if (newIndex < 0 || newIndex >= updated.length || currentIndex === newIndex) return updated;
      const [item] = updated.splice(currentIndex, 1);
      updated.splice(newIndex, 0, item);
      return updated;
    });
  };

  const handleSubmitProposedSubtopics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingTopic) return;
    const cleanList = proposedSubtopicList.map((s) => s.trim()).filter((s) => s.length > 0);
    if (cleanList.length === 0) {
      alert('Please add at least one valid subtopic.');
      return;
    }

    StorageService.proposeSubtopics(proposingTopic.id, cleanList);
    setProposingTopic(null);
    setRefreshKey((k) => k + 1);
  };

  const handleAcknowledgeRemark = (lectureId: string, remarkId: string, currentAck?: boolean) => {
    if (currentAck) {
      StorageService.unacknowledgeAdminRemark(lectureId, remarkId);
      setCopiedToast('Acknowledgment reverted');
    } else {
      StorageService.acknowledgeAdminRemark(lectureId, remarkId, teacher.name);
      setCopiedToast('✓ Directive acknowledged and sent to Academic Operations!');
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.65 } });
      } catch {
        // ignore
      }
    }
    setTimeout(() => setCopiedToast(null), 3000);
    setRefreshKey((k) => k + 1);
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
              <div
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-medium text-xs flex items-center gap-1.5"
                title="Fixed daily upload cutoff schedule"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Daily Cutoff: <strong className="text-amber-300 font-mono">{timeRemaining.cutoffDisplay}</strong></span>
              </div>

              <button
                onClick={() => onOpenUpload()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Upload Lecture
              </button>
            </div>
          </div>

          {/* 1. REAL-TIME SUBMISSION DEADLINE & TIME REMAINING BANNER */}
          {(() => {
            const isCompleted = timeRemaining.isTargetMet;
            const isPassed = timeRemaining.isPassed;
            const hasYesterdayBacklog = !timeRemaining.isYesterdayFulfilled && timeRemaining.yesterdayUnfulfilledMinutes > 0;

            return (
              <div className={`border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-all shadow-sm ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border-emerald-500/40 text-emerald-200 shadow-emerald-950/20'
                  : isPassed
                  ? 'bg-gradient-to-r from-rose-950/40 via-slate-900/60 to-slate-900/40 border-rose-500/40 text-rose-200'
                  : 'bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-slate-900/60 border-indigo-500/40 text-indigo-100 shadow-indigo-950/20'
              }`}>
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                    isCompleted
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                      : isPassed
                      ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400 animate-pulse'
                      : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Today's Lecture Submission Window
                      </span>
                      
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✓ Target Completed On-Time
                        </span>
                      ) : isPassed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ⚠️ Deadline Missed for Today
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse font-mono">
                          ⏰ Live Countdown
                        </span>
                      )}

                      {hasYesterdayBacklog && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⚠️ Yesterday Incomplete ({timeRemaining.yesterdayUnfulfilledMinutes}m)
                        </span>
                      )}
                    </div>

                    {/* MAIN TIME REMAINING COUNTDOWN TEXT */}
                    <div className="font-extrabold text-slate-100 text-sm sm:text-base flex flex-wrap items-baseline gap-2">
                      {isCompleted ? (
                        <span className="text-emerald-300 font-bold">
                          All {timeRemaining.targetMinutes} minutes recorded for today! Great job maintaining on-time delivery.
                        </span>
                      ) : isPassed ? (
                        <span className="text-rose-300 font-bold">
                          Daily Cutoff ({timeRemaining.cutoffDisplay}) has passed. Uploads submitted now will be recorded as Delayed.
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 font-semibold text-xs sm:text-sm">Time Remaining Today:</span>
                          <span className="font-mono text-amber-300 text-base sm:text-lg tracking-wider bg-slate-950/80 px-2.5 py-0.5 rounded-lg border border-slate-800">
                            {String(timeRemaining.hours).padStart(2, '0')}h {String(timeRemaining.minutes).padStart(2, '0')}m {String(timeRemaining.seconds).padStart(2, '0')}s
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Fixed Daily Cutoff: <strong className="text-slate-200 font-mono">{timeRemaining.cutoffDisplay}</strong> • Progress: <strong className="text-slate-200">{timeRemaining.minutesRecordedToday}/{timeRemaining.targetMinutes} min</strong> ({timeRemaining.remainingMinutesToday}m remaining today)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!isCompleted && (
                    <button
                      onClick={() => onOpenUpload()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-xs shadow-md flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Upload Now
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 1.5 REVISION REQUESTED ALERT BANNER (IF ANY TOPIC HAS REVISION REQUESTED) */}
          {revisionTopics.length > 0 && (
            <div className="bg-gradient-to-r from-rose-950/80 via-red-950/60 to-slate-900 border-2 border-rose-500/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xl shadow-rose-950/40 animate-pulse">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider shadow-sm">
                      🔴 Action Required: {revisionTopics.length} Revision{revisionTopics.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-[11px] text-rose-300 font-bold hidden sm:inline">Admin Feedback Received</span>
                  </div>
                  <p className="font-extrabold text-slate-100 text-sm sm:text-base">
                    {revisionTopics.length === 1 
                      ? `Admin requested revisions for "${revisionTopics[0].topicTitle}" (${revisionTopics[0].unitNumber || 'UNIT 1'})`
                      : `Admin requested revisions on ${revisionTopics.length} syllabus topics.`}
                  </p>
                  {revisionTopics[0].adminFeedback && (
                    <p className="text-[11px] text-rose-200/90 italic truncate max-w-xl">
                      Admin Note: "{revisionTopics[0].adminFeedback}"
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  onPageChange('syllabus');
                  setTopicFilter('revision_needed');
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-rose-600/40 text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center"
              >
                View & Resubmit Topics →
              </button>
            </div>
          )}

          {/* ADMIN DIRECTIVES ALERT — shown when teacher has unacknowledged directives */}
          {teacherRemarks.filter((r) => !r.isAcknowledged).length > 0 && (() => {
            const unread = teacherRemarks.filter((r) => !r.isAcknowledged);
            const first = unread[0];
            return (
              <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border-2 border-indigo-500/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xl shadow-indigo-950/30">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider shadow-sm animate-pulse">
                        📌 {unread.length} Directive{unread.length > 1 ? 's' : ''} Awaiting Acknowledgment
                      </span>
                    </div>
                    <p className="font-bold text-slate-100 text-sm truncate max-w-xs sm:max-w-md">
                      Re: {first?.lectureTitle} — &quot;{(first?.remark || '').slice(0, 70)}{(first?.remark?.length || 0) > 70 ? '…' : ''}&quot;
                    </p>
                    <p className="text-[11px] text-indigo-200/70 italic">
                      Review and acknowledge {unread.length > 1 ? 'all directives' : 'this directive'} from Academic Operations
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onPageChange('directives')}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-indigo-600/40 text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> View &amp; Acknowledge →
                </button>
              </div>
            );
          })()}

          {/* ACTIVE PRIORITY NOTIFICATION (IF ANY) */}
          {nextUrgentTopic && (
            <div className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              nextUrgentTopic.subtopicsApprovalState === 'revision_requested'
                ? 'bg-rose-950/30 border-rose-500/60 shadow-lg shadow-rose-950/20'
                : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Priority Deliverable</span>
                  {nextUrgentTopic.subtopicsApprovalState === 'revision_requested' ? (
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
                      REVISION NEEDED
                    </span>
                  ) : adminNotifications.syllabus > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                      NEW
                    </span>
                  ) : null}
                </div>
                <div className="font-semibold text-slate-100 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-indigo-300 border border-slate-700">
                    {nextUrgentTopic.unitNumber || 'UNIT 1'}
                  </span>
                  <span>{nextUrgentTopic.topicTitle}</span>
                </div>
                {nextUrgentTopic.adminApprovalComment && (
                  <p className="text-[11px] text-emerald-300/90 italic flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-emerald-400 shrink-0" />
                    Admin Note: &quot;{nextUrgentTopic.adminApprovalComment}&quot;
                  </p>
                )}
              </div>

              {nextUrgentTopic.subtopicsApprovalState === 'approved' ? (
                <button
                  onClick={() => onOpenUpload(nextUrgentTopic)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  Deliver Session →
                </button>
              ) : nextUrgentTopic.subtopicsApprovalState === 'revision_requested' ? (
                <button
                  onClick={() => handleOpenProposeModal(nextUrgentTopic)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-md shadow-rose-600/30"
                >
                  <Edit3 className="w-3 h-3" /> Resubmit Subtopics →
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

          {/* 2. COMPREHENSIVE STATS ROW WITH ON-TIME PERCENTAGE & DIRECTIVES */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
            {/* Card 1: Today's Recording Progress */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">
                Today's Recording
              </div>
              <div className="text-xl font-bold text-slate-100">
                {minutesRecordedToday} <span className="text-xs font-normal text-slate-500">/ {targetMinutes}m</span>
              </div>
              <div className="text-[11px] space-y-0.5">
                {isTargetReached ? (
                  <span className="text-emerald-400 font-bold">Daily Target Met ✓</span>
                ) : (
                  <span className="text-slate-300 font-medium">{remainingMinutesToday}m remaining</span>
                )}
                {backlogInfo && !backlogInfo.isYesterdayFulfilled && (
                  <span className="text-amber-400 text-[10px] block font-medium">
                    ⚠️ Yesterday: {backlogInfo.yesterdayUnfulfilledMinutes}m unfulfilled
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: ON-TIME SUBMISSION PERCENTAGE (MINUTE-WEIGHTED) */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>On-Time Submission Rate</span>
                <Award className={`w-3.5 h-3.5 ${onTimeStats.onTimePercentage >= 85 ? 'text-amber-400' : 'text-slate-400'}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <div className={`text-2xl font-black ${
                  onTimeStats.onTimePercentage >= 90
                    ? 'text-emerald-400'
                    : onTimeStats.onTimePercentage >= 75
                    ? 'text-indigo-400'
                    : 'text-amber-400'
                }`}>
                  {onTimeStats.onTimePercentage}%
                </div>
                <span className="text-[10px] text-slate-400 font-medium">on-time</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-0.5">
                <div>
                  {onTimeStats.onTimeMinutes}m on-time of {onTimeStats.totalMinutes}m target
                </div>
                <div className="text-[10px] text-slate-400/90 font-medium">
                  Total Delivered: {onTimeStats.totalDeliveredMinutes}m ({Math.floor(onTimeStats.totalDeliveredMinutes / 60)}h {onTimeStats.totalDeliveredMinutes % 60}m)
                </div>
                {onTimeStats.lateMinutes > 0 && (
                  <div className="text-amber-400 text-[10px] font-medium">
                    ⚠️ {onTimeStats.lateMinutes}m marked late / unfulfilled
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Active Syllabus with Admin Badge */}
            <div 
              onClick={() => onPageChange('syllabus')}
              className="bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 rounded-xl p-4 space-y-1 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Active Syllabus</span>
                {adminNotifications.syllabus > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                    {adminNotifications.syllabus}
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-slate-100">{assignedTopics.length} Topics</div>
              <div className="text-[11px] text-slate-400">{readyToDeliverTopics.length} ready to record</div>
            </div>

            {/* Card 4: PYQ Slide Decks with Ready Badge */}
            <div 
              onClick={() => onPageChange('ppt_requests')}
              className="bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 rounded-xl p-4 space-y-1 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>PYQ Slide Decks</span>
                {adminNotifications.ppt > 0 ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-white">
                    {adminNotifications.ppt} READY
                  </span>
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <div className="text-xl font-bold text-slate-100">{pptRequests.length} Decks</div>
              <div className="text-[11px] text-slate-400">2-day turnaround →</div>
            </div>

            {/* Card 5: Admin Directives & Acknowledgments */}
            <div 
              onClick={() => onPageChange('directives')}
              className={`border rounded-xl p-4 space-y-1 cursor-pointer transition-all ${
                unacknowledgedDirectivesCount > 0
                  ? 'bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-slate-900/40 border-amber-500/50 hover:border-amber-500/80 shadow-md shadow-amber-950/20'
                  : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate font-semibold">Directives & Acks</span>
                {unacknowledgedDirectivesCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 animate-pulse">
                    {unacknowledgedDirectivesCount} PENDING
                  </span>
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </div>
              <div className="text-xl font-bold text-slate-100">
                {acknowledgedDirectivesCount}/{teacherRemarks.length}
              </div>
              <div className="text-[11px]">
                {unacknowledgedDirectivesCount > 0 ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">Action Required ➔</span>
                ) : teacherRemarks.length > 0 ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">All Acknowledged ✓</span>
                ) : (
                  <span className="text-slate-500">No directives</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. TWO CLEAN PANELS WITH ADMIN NOTIFICATION MARKS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Syllabus Overview with Notification Badges */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Syllabus Status</span>
                  {adminNotifications.syllabus > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      {adminNotifications.syllabus} Action Needed
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onPageChange('syllabus')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-medium"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div 
                  onClick={() => { setTopicFilter('needs_action'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="text-base font-bold text-amber-400">{needsActionTopics.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Needs Action</div>
                </div>
                <div 
                  onClick={() => { setTopicFilter('in_review'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="text-base font-bold text-slate-200">{inReviewTopics.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">In Review</div>
                </div>
                <div 
                  onClick={() => { setTopicFilter('ready_to_deliver'); onPageChange('syllabus'); }}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="text-base font-bold text-emerald-400">{readyToDeliverTopics.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Ready to Record</div>
                </div>
              </div>
            </div>

            {/* PYQ Slide Deck Request Portal Shortcut */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">Topic PYQ Presentation Decks</span>
                    {adminNotifications.ppt > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        {adminNotifications.ppt} Ready
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onPageChange('ppt_requests')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-medium"
                  >
                    Open Portal <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Request Previous Year Questions (PYQs) formatted into clean presentation slides for your topics <strong>2 days in advance</strong>.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onPageChange('ppt_requests')}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-300" /> Request Topic PYQ Deck
                </button>
              </div>
            </div>
          </div>

          {/* 4. ACADEMIC DIRECTIVES & TEACHER ACKNOWLEDGMENT ACTION CENTER */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 shadow-inner">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-100">
                      Academic Directives & Quality Feedback
                    </h3>
                    {unacknowledgedDirectivesCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 border border-amber-400 animate-pulse shadow-sm">
                        ⚠️ {unacknowledgedDirectivesCount} Action Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Official instructions & quality guidelines posted by Academic Operations on your lecture sessions
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setDirectiveFilterTab('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    directiveFilterTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({teacherRemarks.length})
                </button>
                <button
                  onClick={() => setDirectiveFilterTab('pending')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    directiveFilterTab === 'pending'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Action Required ({unacknowledgedDirectivesCount})
                </button>
                <button
                  onClick={() => setDirectiveFilterTab('acknowledged')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    directiveFilterTab === 'acknowledged'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Acknowledged ({acknowledgedDirectivesCount})
                </button>
              </div>
            </div>

            {/* Directives Cards */}
            {filteredTeacherRemarks.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-400 text-xs space-y-1.5">
                <div className="text-2xl">{teacherRemarks.length === 0 ? '✨' : '🔍'}</div>
                <p className="font-semibold text-slate-200">
                  {teacherRemarks.length === 0 
                    ? 'No Academic Directives Posted' 
                    : 'No directives under this filter'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {teacherRemarks.length === 0
                    ? 'When academic administrators review your lecture videos and post quality guidelines, they will appear here with an Acknowledge button.'
                    : 'Switch filter tab above to view other directives.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTeacherRemarks.slice(0, 4).map((rem) => {
                  const isAck = !!rem.isAcknowledged;
                  return (
                    <div
                      key={rem.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 shadow-md ${
                        isAck
                          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 border-emerald-500/30'
                          : 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900/90 border-amber-500/50 hover:border-amber-500/70 shadow-amber-950/20'
                      }`}
                    >
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {rem.lectureTitle}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">{rem.date}</span>
                        </div>

                        {/* STATUS BADGE */}
                        <div className="flex items-center gap-1.5">
                          {isAck ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Acknowledged {rem.acknowledgedAt ? `on ${new Date(rem.acknowledgedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 border border-amber-400 flex items-center gap-1 animate-pulse shadow-sm">
                              <Clock className="w-3 h-3" />
                              ⚠️ Action Required
                            </span>
                          )}
                        </div>

                        {/* DIRECTIVE TEXT */}
                        <div className="p-3 bg-purple-950/25 border border-purple-500/30 rounded-xl text-xs text-purple-200 italic leading-relaxed">
                          "{rem.remark}"
                        </div>
                      </div>

                      {/* ACTIONS ROW */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] text-slate-400">
                          From: <strong className="text-slate-300">{rem.adminName}</strong>
                        </span>

                        <button
                          onClick={() => handleAcknowledgeRemark(rem.lectureId, rem.id, isAck)}
                          className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                            isAck
                              ? 'text-emerald-400 bg-emerald-500/10 hover:bg-rose-500/10 hover:text-rose-300 border border-emerald-500/20 hover:border-rose-500/30'
                              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-indigo-500 text-slate-950 hover:opacity-95 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                          }`}
                          title={isAck ? 'Click to revert acknowledgment if needed' : 'Click to acknowledge directive'}
                        >
                          {isAck ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Acknowledged ✓
                            </>
                          ) : (
                            <>
                              <span>✍️</span> Acknowledge Directive
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredTeacherRemarks.length > 4 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => onPageChange('directives')}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 mx-auto"
                >
                  View All {teacherRemarks.length} Directives ➔
                </button>
              </div>
            )}
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
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-md"
            >
              <Plus className="w-3.5 h-3.5" /> Upload Lecture
            </button>
          </div>

          {/* RED REVISION NOTIFICATION ALERT BANNER AT TOP OF SYLLABUS LIST */}
          {revisionTopics.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-red-950/70 to-slate-900 border-2 border-rose-500/80 shadow-xl shadow-rose-950/40 space-y-3 animate-pulse">
              <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-600/30 border border-rose-500/50 text-rose-300 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-rose-100 flex items-center gap-2">
                      🔴 Action Required: Admin Requested Revision on {revisionTopics.length} Topic{revisionTopics.length === 1 ? '' : 's'}
                    </h3>
                    <p className="text-xs text-rose-200/80 mt-0.5">
                      The academic administrator reviewed your proposed syllabus subtopics and requested modifications with specific feedback.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setTopicFilter('revision_needed')}
                  className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md ${
                    topicFilter === 'revision_needed'
                      ? 'bg-white text-rose-900 shadow-white/20'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  }`}
                >
                  {topicFilter === 'revision_needed' ? '✓ Showing Revision Topics' : 'Filter Revision Topics →'}
                </button>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                onClick={() => setTopicFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  topicFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({assignedTopics.length})
              </button>

              {/* Dedicated Red Revision Filter Pill */}
              {revisionTopics.length > 0 && (
                <button
                  onClick={() => setTopicFilter('revision_needed')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-bold flex items-center gap-1.5 ${
                    topicFilter === 'revision_needed'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  🔴 Revision Needed ({revisionTopics.length})
                </button>
              )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map((topic) => {
                const isCompleted = topic.status === 'completed';
                const approvalState = topic.subtopicsApprovalState || 'pending_teacher_input';
                const isApproved = approvalState === 'approved';
                const isUnderReview = approvalState === 'pending_admin_approval';
                const isRevision = approvalState === 'revision_requested';

                return (
                  <div
                    key={topic.id}
                    className={`rounded-2xl p-4.5 space-y-3.5 flex flex-col justify-between text-xs transition-all relative overflow-hidden ${
                      isRevision
                        ? 'border-2 border-rose-500/80 bg-gradient-to-br from-rose-950/40 via-slate-900/95 to-slate-900/90 shadow-xl shadow-rose-950/30 hover:border-rose-400'
                        : 'bg-slate-900/40 border border-slate-800/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] border ${
                              isRevision
                                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                                : 'bg-slate-800 text-indigo-300 border-slate-700'
                            }`}>
                              {topic.unitNumber || 'UNIT 1'}
                            </span>
                            <h4 className="font-bold text-slate-100 truncate text-sm">{topic.topicTitle}</h4>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{topic.subject}</span>
                        </div>

                        {/* Top Notification Badge for Revision */}
                        {isRevision && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white shadow-md shadow-rose-600/30 flex items-center gap-1 shrink-0 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            REVISION
                          </span>
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {isCompleted ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Delivered</span>
                        ) : isApproved ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">● Ready to Record</span>
                        ) : isUnderReview ? (
                          <span className="text-purple-300 font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> In Admin Review</span>
                        ) : isRevision ? (
                          <span className="text-rose-400 font-black flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> 🔴 Admin Requested Revision</span>
                        ) : (
                          <span className="text-amber-400 font-medium flex items-center gap-1">○ Subtopics Needed</span>
                        )}
                      </div>

                      {/* Admin Feedback Box with Red Alert styling */}
                      {isRevision && topic.adminFeedback && (
                        <div className="p-3 bg-rose-950/60 rounded-xl border border-rose-500/40 text-xs space-y-1 shadow-inner">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                            <MessageSquare className="w-3 h-3 text-rose-400" />
                            Admin Revision Notes:
                          </div>
                          <p className="text-slate-100 font-medium italic text-[11px] leading-relaxed">
                            "{topic.adminFeedback}"
                          </p>
                        </div>
                      )}

                      {/* Admin Approval Guidelines Box */}
                      {isApproved && topic.adminApprovalComment && (
                        <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/35 text-xs space-y-1 shadow-inner">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                            Admin Approval Guidelines:
                          </div>
                          <p className="text-slate-100 font-medium italic text-[11px] leading-relaxed">
                            "{topic.adminApprovalComment}"
                          </p>
                        </div>
                      )}

                      {/* Subtopics Sequence */}
                      <div className="space-y-1.5 pt-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {isRevision ? 'Proposed Subtopics for Revision:' : 'Subtopics Sequence:'}
                        </span>
                        {((isUnderReview || isRevision) ? topic.proposedSubtopics : topic.subtopics)?.length ? (
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {((isUnderReview || isRevision) ? topic.proposedSubtopics! : topic.subtopics).map((st, i) => (
                              <div key={i} className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-2 ${
                                isRevision
                                  ? 'bg-rose-950/40 border border-rose-500/30 text-rose-200'
                                  : 'bg-slate-950/80 border border-slate-800/80 text-slate-300'
                              }`}>
                                <span className="font-mono font-bold text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 shrink-0">
                                  #{i + 1}
                                </span>
                                <span className="truncate flex-1">{st}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">No subtopics defined yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60">
                      {isCompleted ? (
                        <div className="text-center text-[11px] text-emerald-400 font-medium py-1">
                          ✓ Completed
                        </div>
                      ) : isApproved ? (
                        <button
                          onClick={() => onOpenUpload(topic)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-md text-xs flex items-center justify-center gap-1.5"
                        >
                          Upload Lecture →
                        </button>
                      ) : isUnderReview ? (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 font-semibold rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5"
                        >
                          Edit Proposal
                        </button>
                      ) : isRevision ? (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-600/30 text-xs flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Resubmit Revised Subtopics →
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5"
                        >
                          + Propose Subtopics
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
              <h2 className="text-xl font-bold text-slate-100 tracking-tight flex flex-wrap items-center gap-2">
                <span>Delivered Lectures ({filteredLectures.length})</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 font-mono">
                  ⏱️ {filteredLectures.reduce((s, l) => s + (l.durationMinutes || 45), 0)}m ({Math.floor(filteredLectures.reduce((s, l) => s + (l.durationMinutes || 45), 0) / 60)}h {filteredLectures.reduce((s, l) => s + (l.durationMinutes || 45), 0) % 60}m)
                </span>
              </h2>
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

          {unitGroupedLectures.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 border border-slate-800/60 rounded-xl text-slate-400 text-xs italic">
              No lecture recordings found.
            </div>
          ) : (
            <div className="space-y-6">
              {unitGroupedLectures.map((unitGroup) => (
                <div 
                  key={unitGroup.unitName}
                  className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 md:p-5 space-y-4 shadow-md"
                >
                  {/* UNIT HEADER RIBBON */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 shadow-sm">
                        <Folder className="w-3.5 h-3.5 text-amber-400" />
                        {unitGroup.unitName}
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        {unitGroup.lectures.length} {unitGroup.lectures.length === 1 ? 'Lecture' : 'Lectures'} Delivered
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>Unit Total:</span>
                        <strong className="text-amber-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {unitGroup.totalDuration} min
                        </strong>
                      </div>

                      <button
                        onClick={() => onPageChange('thumbnail_generator')}
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Unit Thumbnails
                      </button>
                    </div>
                  </div>

                  {/* LECTURES IN THIS UNIT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {unitGroup.lectures.map((lec) => (
                      <div key={lec.id} className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-4 space-y-3 flex flex-col justify-between text-xs hover:border-slate-700 transition-all">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="truncate flex-1">
                              <h4 className="font-semibold text-slate-100 truncate">{lec.title}</h4>
                              {lec.adminRemarks?.some((r) => !r.isAcknowledged) && (
                                <button
                                  onClick={() => onPageChange('directives')}
                                  className="text-[9px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 mt-0.5 w-fit hover:bg-amber-500/30 transition-colors"
                                >
                                  ⚠️ {lec.adminRemarks.filter((r) => !r.isAcknowledged).length} Directive{lec.adminRemarks.filter((r) => !r.isAcknowledged).length > 1 ? 's' : ''} — Tap to Acknowledge
                                </button>
                              )}
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

                          {/* INLINE ADMIN DIRECTIVES ON THIS LECTURE */}
                          {lec.adminRemarks && lec.adminRemarks.length > 0 && (
                            <div className="pt-2 border-t border-slate-800/80 space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 text-purple-400" />
                                  Academic Directives ({lec.adminRemarks.length})
                                </span>
                                {lec.adminRemarks.some((r) => !r.isAcknowledged) ? (
                                  <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                                    Action Required
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    All Acknowledged ✓
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                {lec.adminRemarks.map((rem) => {
                                  const isAck = !!rem.isAcknowledged;
                                  return (
                                    <div
                                      key={rem.id}
                                      className={`p-2.5 rounded-xl border space-y-1.5 text-[11px] transition-all ${
                                        isAck
                                          ? 'bg-slate-900/60 border-emerald-500/20'
                                          : 'bg-amber-950/20 border-amber-500/35 shadow-sm'
                                      }`}
                                    >
                                      <p className="text-slate-200 italic leading-relaxed">
                                        "{rem.remarkText}"
                                      </p>
                                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[10px]">
                                        <span className="text-slate-400">
                                          By <strong className="text-slate-300">{rem.adminName}</strong>
                                        </span>
                                        <button
                                          onClick={() => handleAcknowledgeRemark(lec.id, rem.id, isAck)}
                                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 ${
                                            isAck
                                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-rose-500/10 hover:text-rose-300 border border-emerald-500/20'
                                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm font-extrabold'
                                          }`}
                                        >
                                          {isAck ? (
                                            <>
                                              <Check className="w-3 h-3 text-emerald-400" /> Acknowledged ✓
                                            </>
                                          ) : (
                                            <>
                                              <span>✍️</span> Acknowledge
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">{new Date(lec.createdAt).toLocaleDateString()}</span>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onPageChange('thumbnail_generator')}
                              className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <ImageIcon className="w-3 h-3" /> Thumbnail
                            </button>

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                Admin Directives & Quality Feedback ({teacherRemarks.length})
              </h2>
              <p className="text-xs text-slate-400">
                Official quality guidelines and improvement remarks from Academic Operations on your lecture sessions
              </p>
            </div>

            {unacknowledgedDirectivesCount > 0 && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 w-fit animate-pulse shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                {unacknowledgedDirectivesCount} Action Required (Unacknowledged)
              </span>
            )}
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setDirectiveFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  directiveFilterTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({teacherRemarks.length})
              </button>
              <button
                onClick={() => setDirectiveFilterTab('pending')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  directiveFilterTab === 'pending'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Action Required ({unacknowledgedDirectivesCount})
              </button>
              <button
                onClick={() => setDirectiveFilterTab('acknowledged')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  directiveFilterTab === 'acknowledged'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Acknowledged ({acknowledgedDirectivesCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search directives or lecture..."
                value={searchDirectiveQuery}
                onChange={(e) => setSearchDirectiveQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              {searchDirectiveQuery && (
                <button
                  onClick={() => setSearchDirectiveQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DIRECTIVES LIST */}
          {filteredTeacherRemarks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/30 border border-slate-800/60 rounded-2xl text-slate-400 text-xs space-y-2">
              <div className="text-3xl">{teacherRemarks.length === 0 ? '✨' : '🔍'}</div>
              <p className="font-semibold text-slate-200 text-sm">
                {teacherRemarks.length === 0
                  ? 'No Directives Posted by Academic Operations'
                  : 'No Directives Match Your Filter'}
              </p>
              <p className="text-slate-500 max-w-md mx-auto">
                {teacherRemarks.length === 0
                  ? 'When administrators review your delivered lecture sessions and post quality suggestions or action points, they will appear here with an Acknowledge button.'
                  : 'Try clearing your search or switching to the "All" tab to see all directives.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeacherRemarks.map((rem) => {
                const isAck = !!rem.isAcknowledged;
                return (
                  <div 
                    key={rem.id} 
                    className={`border-2 rounded-2xl p-5 space-y-4 flex flex-col justify-between text-xs transition-all shadow-md ${
                      isAck
                        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 border-emerald-500/30 shadow-emerald-950/10'
                        : 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-950/20'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-100 truncate flex items-center gap-1.5 text-sm">
                          <Video className="w-4 h-4 text-indigo-400 shrink-0" />
                          Re: {rem.lectureTitle}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{rem.date}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAck ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Acknowledged by you {rem.acknowledgedAt ? `(${new Date(rem.acknowledgedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})` : ''}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 border border-amber-400 flex items-center gap-1 shadow-sm animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            ⚠️ Action Required (Please Acknowledge)
                          </span>
                        )}
                      </div>

                      <p className="text-slate-200 italic bg-purple-950/25 p-3.5 rounded-xl border border-purple-500/30 leading-relaxed font-medium">
                        "{rem.remark}"
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Posted by Academic Admin: <strong className="text-slate-200">{rem.adminName}</strong>
                      </span>

                      <button
                        onClick={() => handleAcknowledgeRemark(rem.lectureId, rem.id, isAck)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md ${
                          isAck 
                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-rose-500/10 hover:text-rose-300 border border-emerald-500/20 hover:border-rose-500/30' 
                            : 'bg-gradient-to-r from-amber-500 via-amber-400 to-indigo-500 text-slate-950 hover:opacity-95 shadow-amber-500/20 ring-2 ring-amber-400/50 scale-[1.02]'
                        }`}
                        title={isAck ? 'Click to revert acknowledgment if needed' : 'Click to acknowledge directive'}
                      >
                        {isAck ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Acknowledged ✓
                          </>
                        ) : (
                          <>
                            <span>✍️</span> Acknowledge Directive
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── PPT DECK REQUESTS PORTAL ─── */}
      {currentPage === 'ppt_requests' && (
        <PptRequestPortal
          teacher={teacher}
          onRefreshData={() => setRefreshKey((k) => k + 1)}
        />
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

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl max-h-72 overflow-y-auto space-y-2">
                {proposedSubtopicList.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-4 text-xs">No subtopics added yet. Type above and click + Add.</p>
                ) : (
                  proposedSubtopicList.map((st, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      {/* Sequence Number / Reorder Dropdown */}
                      <div className="flex items-center gap-1 shrink-0 relative">
                        <select
                          value={idx + 1}
                          onChange={(e) => handleJumpProposedSubtopic(idx, parseInt(e.target.value, 10) - 1)}
                          className="appearance-none font-mono font-extrabold text-[10px] text-indigo-400 bg-indigo-950/80 px-2 py-1 pr-4 rounded-md border border-indigo-500/30 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                          title="Click to jump to another position"
                        >
                          {proposedSubtopicList.map((_, i) => (
                            <option key={i} value={i + 1}>#{i + 1}</option>
                          ))}
                        </select>
                        <div className="absolute right-1 pointer-events-none text-indigo-400 opacity-60">
                          <ChevronDown className="w-2.5 h-2.5" />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={st}
                        onChange={(e) => handleUpdateProposedSubtopic(idx, e.target.value)}
                        placeholder={`Subtopic #${idx + 1} title...`}
                        className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-indigo-400 rounded-lg px-2.5 py-1 text-slate-100 text-xs font-semibold focus:outline-none"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveProposedUp(idx)}
                          className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 border border-slate-700 rounded-md disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === proposedSubtopicList.length - 1}
                          onClick={() => handleMoveProposedDown(idx)}
                          className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 border border-slate-700 rounded-md disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProposedTag(idx)}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/20 border border-slate-700 rounded-md transition-all cursor-pointer"
                          title="Delete Subtopic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
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
