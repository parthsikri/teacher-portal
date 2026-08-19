import React, { useState, useMemo } from 'react';
import type { User, Lecture, AssignedTopic } from '../../types';
import { StorageService } from '../../services/storage';
import { VideoModal } from '../Common/VideoModal';
import { 
  Search, Video, FileText, CheckCircle2, Clock, MessageSquare, 
  Sparkles, Plus, Play, Flame, Award, Zap, Target, ShieldCheck, CheckCircle,
  Edit3, Send, X, AlertTriangle, BookMarked, ExternalLink,
  Copy, Check, ChevronRight, Layers, Star, Trophy, Info
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

  // Fetch subject-wide reference material for teacher's subject
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

  // Timely Submissions Metrics & Gamification (Real Data Only)
  const onTimeLectures = lectures.filter((l) => l.status === 'on_time').length;
  const punctualityScore = lectures.length > 0 ? Math.round((onTimeLectures / lectures.length) * 100) : 100;
  const currentStreakDays = onTimeLectures;
  
  // Faculty Level calculation based on delivered sessions
  const facultyLevel = onTimeLectures >= 15 ? 4 : onTimeLectures >= 8 ? 3 : onTimeLectures >= 3 ? 2 : 1;
  const levelNames = ['🌱 Active Faculty', '⚡ Senior Instructor', '🥇 Lead Professor', '🌟 Master Academician'];
  const currentLevelName = levelNames[facultyLevel - 1];
  const nextLevelThreshold = facultyLevel === 1 ? 3 : facultyLevel === 2 ? 8 : facultyLevel === 3 ? 15 : 25;
  const prevLevelThreshold = facultyLevel === 1 ? 0 : facultyLevel === 2 ? 3 : facultyLevel === 3 ? 8 : 15;
  const levelProgress = Math.min(100, Math.round(((onTimeLectures - prevLevelThreshold) / (nextLevelThreshold - prevLevelThreshold)) * 100));

  // Dynamic time greeting
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

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

  // Find nearest upcoming active deliverable
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

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  // Calculate days remaining helper
  const getDeadlineStatus = (deadlineDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadlineDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d Overdue`, color: 'text-red-400 bg-red-500/10 border-red-500/30', urgent: true };
    if (diffDays === 0) return { label: '🔥 Due Today', color: 'text-amber-400 bg-amber-500/15 border-amber-500/40 animate-pulse', urgent: true };
    if (diffDays === 1) return { label: '⚡ Due Tomorrow', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30', urgent: true };
    return { label: `⏳ ${diffDays} days left`, color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30', urgent: false };
  };

  // Open Propose Subtopics Modal
  const handleOpenProposeModal = (topic: AssignedTopic) => {
    setProposingTopic(topic);
    const existing = (topic.proposedSubtopics && topic.proposedSubtopics.length > 0)
      ? topic.proposedSubtopics
      : topic.subtopics || [];
    setProposedSubtopicList([...existing]);
    setSubtopicInput('');
  };

  // Support adding single or multiple comma-separated subtopics
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
      alert('Please add at least one subtopic before submitting for approval.');
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
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8 animate-in fade-in duration-200">
      
      {/* TOAST FEEDBACK */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-4 h-4" /> {copiedToast}
        </div>
      )}

      {/* PAGE 1: 🏠 OVERVIEW DASHBOARD */}
      {(currentPage === 'dashboard' || !currentPage) && (
        <div className="space-y-7">
          
          {/* HERO BANNER WITH DYNAMIC GREETING & URGENT DELIVERABLE TICKER */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              
              {/* Left Column: Greeting & Info */}
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {teacher.teacherId}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {teacher.department}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                    <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                    {currentStreakDays} Session Streak
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-purple-400 fill-purple-400" /> {currentLevelName}
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight leading-tight">
                  {timeGreeting}, {teacher.name}! 👨‍🏫
                </h2>
                <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
                  Academic Discipline: <strong className="text-indigo-400 font-bold">{teacher.subject}</strong> • Review assigned syllabus topics, propose curriculum subtopics, and deliver on-time video lectures.
                </p>
              </div>

              {/* Right Column: Fast Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  onClick={() => onOpenUpload()}
                  disabled={isLimitReached}
                  className={`px-6 py-3.5 rounded-2xl font-black text-white text-xs shadow-2xl transition-all flex items-center justify-center gap-2 ${
                    isLimitReached
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {isLimitReached ? 'Daily Limit Reached' : '+ Quick Lecture Upload'}
                </button>
              </div>
            </div>

            {/* URGENT DELIVERABLE ACTION TICKER BANNER */}
            {nextUrgentTopic && (
              <div className="relative z-10 bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 font-black text-sm shrink-0">
                    ⚡
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Active Priority Deliverable
                    </div>
                    <div className="text-xs md:text-sm font-extrabold text-slate-100 flex items-center gap-2 flex-wrap">
                      <span>{nextUrgentTopic.topicTitle}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                        Due: {nextUrgentTopic.deadlineDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {nextUrgentTopic.subtopicsApprovalState === 'approved' ? (
                    <button
                      onClick={() => onOpenUpload(nextUrgentTopic)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" /> Record & Upload Now
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenProposeModal(nextUrgentTopic)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105"
                    >
                      <Edit3 className="w-3.5 h-3.5 fill-slate-950" /> Propose Subtopics
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PERFORMANCE KPI METRICS WITH INTERACTIVE PROGRESS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. On-Time Streak */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-xl relative overflow-hidden group hover:border-orange-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span>On-Time Streak</span>
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-3xl font-black text-orange-400 flex items-baseline gap-1.5">
                {currentStreakDays} <span className="text-xs font-bold text-slate-400">Sessions</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 100% Punctual Submissions
              </div>
            </div>

            {/* 2. Punctuality Score */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span>Punctuality Score</span>
                <Award className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-3xl font-black text-amber-400 flex items-baseline gap-1.5">
                {punctualityScore}% <span className="text-xs font-bold text-slate-400">Rating</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {onTimeLectures} of {lectures.length} delivered on-time
              </div>
            </div>

            {/* 3. Daily Upload Quota */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span>Daily Upload Quota</span>
                <Target className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-3xl font-black text-slate-100 flex items-baseline gap-1.5">
                {uploadsToday} <span className="text-xs font-bold text-slate-400">/ {dailyLimit} today</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${isLimitReached ? 'bg-amber-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                  style={{ width: `${Math.min(100, (uploadsToday / dailyLimit) * 100)}%` }}
                />
              </div>
            </div>

            {/* 4. Faculty Rank & Level Progression */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-xl relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span>Faculty Rank</span>
                <Trophy className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-purple-300 flex items-baseline gap-1">
                Level {facultyLevel}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{currentLevelName}</span>
                  <span>{levelProgress}% to next</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${levelProgress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN GRID: ACTION QUEUE & SUBJECT RESOURCES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Left: Syllabus Action Queue */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 font-bold text-sm">📌</span>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-100">Syllabus Workflow Queue</h3>
                      <p className="text-[11px] text-slate-400">Syllabus breakdown & lecture recording status</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onPageChange('syllabus')}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div 
                    onClick={() => { setTopicFilter('needs_action'); onPageChange('syllabus'); }}
                    className="p-3.5 bg-slate-950 border border-amber-500/30 rounded-2xl cursor-pointer hover:border-amber-500/60 transition-all text-center space-y-1 group"
                  >
                    <div className="text-2xl font-black text-amber-400 group-hover:scale-105 transition-transform">{needsActionTopics.length}</div>
                    <div className="text-[10px] font-bold text-slate-300">Needs Subtopics</div>
                  </div>
                  <div 
                    onClick={() => { setTopicFilter('in_review'); onPageChange('syllabus'); }}
                    className="p-3.5 bg-slate-950 border border-purple-500/30 rounded-2xl cursor-pointer hover:border-purple-500/60 transition-all text-center space-y-1 group"
                  >
                    <div className="text-2xl font-black text-purple-300 group-hover:scale-105 transition-transform">{inReviewTopics.length}</div>
                    <div className="text-[10px] font-bold text-slate-300">In Admin Review</div>
                  </div>
                  <div 
                    onClick={() => { setTopicFilter('ready_to_deliver'); onPageChange('syllabus'); }}
                    className="p-3.5 bg-slate-950 border border-emerald-500/30 rounded-2xl cursor-pointer hover:border-emerald-500/60 transition-all text-center space-y-1 group"
                  >
                    <div className="text-2xl font-black text-emerald-400 group-hover:scale-105 transition-transform">{readyToDeliverTopics.length}</div>
                    <div className="text-[10px] font-bold text-slate-300">Ready to Deliver</div>
                  </div>
                </div>
              </div>

              {readyToDeliverTopics.length > 0 ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between gap-3">
                  <div className="text-xs text-emerald-300 font-bold truncate">
                    Ready: {readyToDeliverTopics[0].topicTitle}
                  </div>
                  <button
                    onClick={() => onOpenUpload(readyToDeliverTopics[0])}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md shrink-0"
                  >
                    Upload Now 🚀
                  </button>
                </div>
              ) : null}
            </div>

            {/* Right: Whole-Subject Reference Material */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-sm">📚</span>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-100">Subject Reference Material</h3>
                      <p className="text-[11px] text-slate-400">Master Google Drive & Curriculum Guidelines</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onPageChange('resources')}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Full Library <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {subjectReference ? (
                  <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">
                        {subjectReference.subjectName}
                      </span>
                      <button
                        onClick={() => copyToClipboard(subjectReference.referenceUrl, 'Drive URL')}
                        className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
                      >
                        <Copy className="w-3 h-3" /> Copy Link
                      </button>
                    </div>
                    <h4 className="text-xs font-black text-slate-100 line-clamp-1">{subjectReference.title}</h4>
                    {subjectReference.notes && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-2">
                        "{subjectReference.notes}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-4 text-center bg-slate-950 rounded-2xl border border-slate-800">
                    No reference folder attached by admin yet.
                  </div>
                )}
              </div>

              {subjectReference && (
                <a
                  href={subjectReference.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Google Drive Folder ↗
                </a>
              )}
            </div>
          </div>

          {/* RECENT DELIVERED SESSIONS ARCHIVE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-7 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold text-sm">📹</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">Recent Deliveries ({lectures.length})</h3>
                  <p className="text-xs text-slate-400">Recently uploaded video sessions and lecture PDF notes</p>
                </div>
              </div>

              <button
                onClick={() => onPageChange('lectures')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View All Deliveries <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {lectures.length === 0 ? (
              <div className="p-12 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-2">
                <div className="text-3xl">📹</div>
                <div className="font-bold text-slate-300">No lectures delivered yet</div>
                <p>Click "+ Quick Lecture Upload" above to submit your first recorded lecture!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lectures.slice(0, 3).map((lec) => (
                  <div key={lec.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-md flex flex-col justify-between hover:border-slate-700 transition-all">
                    <div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-indigo-400">{lec.subject}</span>
                        <span className="text-slate-500">{new Date(lec.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-100 mt-1 line-clamp-1">{lec.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">Topic: {lec.primaryTopic}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lec.status === 'on_time' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {lec.status === 'on_time' ? '✓ On-Time' : '⚠️ Overdue'}
                      </span>

                      <button
                        onClick={() => setSelectedLectureForPreview(lec)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-white" /> Watch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE 2: 📌 SYLLABUS & SUBTOPIC APPROVAL PIPELINE */}
      {currentPage === 'syllabus' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" /> Syllabus Topics & Subtopic Approvals
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Propose syllabus subtopic breakdowns for admin approval, track individual subtopic deadlines, and deliver authorized sessions.
              </p>
            </div>
            <button
              onClick={() => onOpenUpload()}
              disabled={isLimitReached}
              className="px-5 py-2.5 rounded-xl font-extrabold text-white text-xs bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> + Upload Session
            </button>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-lg">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setTopicFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  topicFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                }`}
              >
                All Topics ({assignedTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('needs_action')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  topicFilter === 'needs_action' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-amber-400 hover:text-amber-300 bg-slate-950 border border-amber-500/30'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Needs Subtopics ({needsActionTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('in_review')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  topicFilter === 'in_review' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-300 hover:text-purple-200 bg-slate-950 border border-purple-500/30'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> In Admin Review ({inReviewTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('ready_to_deliver')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  topicFilter === 'ready_to_deliver' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-300 hover:text-emerald-200 bg-slate-950 border border-emerald-500/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Ready to Deliver ({readyToDeliverTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  topicFilter === 'completed' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                }`}
              >
                ✓ Completed ({completedTopics.length})
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchTopicQuery}
                onChange={(e) => setSearchTopicQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>
          </div>

          {/* Topics Grid */}
          {filteredTopics.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <div className="text-3xl">📋</div>
              <div className="font-bold text-slate-200 text-sm">No syllabus topics match this filter</div>
              <p className="text-xs text-slate-400">Try changing your filter above or search keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredTopics.map((topic) => {
                const isCompleted = topic.status === 'completed';
                const deadline = getDeadlineStatus(topic.deadlineDate);
                const approvalState = topic.subtopicsApprovalState || 'pending_teacher_input';
                const isApproved = approvalState === 'approved';
                const isUnderReview = approvalState === 'pending_admin_approval';
                const isRevision = approvalState === 'revision_requested';

                const currentStep = isCompleted ? 4 : isApproved ? 3 : isUnderReview ? 2 : 1;

                return (
                  <div
                    key={topic.id}
                    className={`bg-slate-900 border rounded-3xl p-5.5 space-y-4.5 flex flex-col justify-between transition-all shadow-xl relative overflow-hidden group ${
                      isCompleted
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : isRevision
                        ? 'border-red-500/40 bg-red-950/10'
                        : isUnderReview
                        ? 'border-purple-500/40 bg-purple-950/10'
                        : isApproved
                        ? 'border-emerald-500/40 bg-slate-900'
                        : 'border-amber-500/40'
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${deadline.color}`}>
                          {deadline.label}
                        </span>

                        {isCompleted ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> Delivered
                          </span>
                        ) : isApproved ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved
                          </span>
                        ) : isUnderReview ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3 text-purple-400" /> Admin Review
                          </span>
                        ) : isRevision ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" /> Revision Needed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Edit3 className="w-3 h-3 text-amber-400" /> Add Subtopics
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-black text-base text-slate-100 tracking-tight leading-snug">
                          {topic.topicTitle}
                        </h4>
                        <p className="text-xs text-indigo-400 font-semibold mt-0.5">{topic.subject}</p>
                      </div>

                      {/* VISUAL 4-STEP STEPPER */}
                      <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span className={currentStep >= 1 ? 'text-indigo-400' : ''}>1. Assigned</span>
                          <span className={currentStep >= 2 ? 'text-purple-400' : ''}>2. Proposed</span>
                          <span className={currentStep >= 3 ? 'text-emerald-400' : ''}>3. Approved</span>
                          <span className={currentStep >= 4 ? 'text-emerald-300' : ''}>4. Done</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 h-1.5">
                          <div className={`rounded-full ${currentStep >= 1 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                          <div className={`rounded-full ${currentStep >= 2 ? 'bg-purple-500' : 'bg-slate-800'}`} />
                          <div className={`rounded-full ${currentStep >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                          <div className={`rounded-full ${currentStep >= 4 ? 'bg-emerald-400' : 'bg-slate-800'}`} />
                        </div>
                      </div>

                      {topic.notes && (
                        <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 italic">
                          💬 Admin notes: "{topic.notes}"
                        </div>
                      )}

                      {isRevision && topic.adminFeedback && (
                        <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/30 text-xs text-red-300 space-y-1">
                          <div className="font-bold flex items-center gap-1 text-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Admin Feedback:
                          </div>
                          <p className="text-[11px] italic">"{topic.adminFeedback}"</p>
                        </div>
                      )}

                      {/* Subtopics List with Individual Deadlines */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                          <span>
                            {isUnderReview ? 'Proposed Subtopics (Under Review):' : 'Subtopics & Deadlines:'}
                          </span>
                          {isApproved && (
                            <span className="text-[9px] text-emerald-400 font-mono font-bold">✓ Approved</span>
                          )}
                        </div>

                        {((isUnderReview || isRevision) ? topic.proposedSubtopics : topic.subtopics)?.length ? (
                          <div className="space-y-1.5">
                            {((isUnderReview || isRevision) ? topic.proposedSubtopics! : topic.subtopics).map((st, idx) => {
                              const subItem = topic.subtopicItems?.find((item) => item.name.toLowerCase() === st.toLowerCase());
                              const stDeadline = subItem?.deadlineDate || topic.deadlineDate;
                              const stDeadlineInfo = getDeadlineStatus(stDeadline);

                              return (
                                <div
                                  key={idx}
                                  className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs ${
                                    isApproved
                                      ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                                      : isUnderReview
                                      ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                      : 'bg-slate-950 border-slate-800 text-slate-300'
                                  }`}
                                >
                                  <span className="font-semibold truncate mr-2">#{st}</span>
                                  {isApproved && (
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${stDeadlineInfo.color} shrink-0 flex items-center gap-1`}>
                                      <Clock className="w-2.5 h-2.5" /> Due: {stDeadline}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-400/90 italic bg-amber-500/5 p-2 rounded-xl border border-amber-500/20">
                            No subtopics added yet. Click button below to propose syllabus breakdown.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-950/80">
                      {isCompleted ? (
                        <div className="w-full py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-4 h-4" /> Delivered & Archived ✓
                        </div>
                      ) : isApproved ? (
                        <button
                          onClick={() => onOpenUpload(topic)}
                          disabled={isLimitReached}
                          className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/25 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Zap className="w-4 h-4 fill-white" /> Deliver & Upload Lecture 🚀
                        </button>
                      ) : isUnderReview ? (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-2.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Modify Proposed Subtopics
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenProposeModal(topic)}
                          className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Edit3 className="w-3.5 h-3.5 fill-slate-950" />
                          {isRevision ? 'Resubmit Subtopics' : '+ Add Subtopics for Approval'}
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

      {/* PAGE 3: 📹 DELIVERED LECTURES LIBRARY */}
      {currentPage === 'lectures' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-400" /> Delivered Lecture Archive ({lectures.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse submitted video streams, download lecture notes, and verify delivery timestamps.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search lectures..."
                  value={searchLectureQuery}
                  onChange={(e) => setSearchLectureQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setLectureFilterTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    lectureFilterTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({lectures.length})
                </button>
                <button
                  onClick={() => setLectureFilterTab('on_time')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    lectureFilterTab === 'on_time' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  On-Time ({onTimeLectures})
                </button>
                <button
                  onClick={() => setLectureFilterTab('with_notes')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    lectureFilterTab === 'with_notes' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PDF Notes
                </button>
              </div>
            </div>
          </div>

          {filteredLectures.length === 0 ? (
            <div className="p-16 text-center bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
              <div className="text-4xl">📚</div>
              <div className="font-bold text-slate-200 text-base">No lecture sessions found</div>
              <p className="text-xs text-slate-400">Click "+ Quick Lecture Upload" at top to submit your first session!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLectures.map((lec) => (
                <div
                  key={lec.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {lec.subject}
                        </span>
                        <h4 className="font-black text-sm text-slate-100 mt-1.5 leading-snug">{lec.title}</h4>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        lec.status === 'on_time'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {lec.status === 'on_time' ? '✓ On-Time' : '⚠️ Overdue'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-300 font-semibold">
                        Topic: <span className="text-indigo-300">{lec.primaryTopic}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lec.subtopics.map((st, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-medium">
                            #{st}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-900 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500">
                      Uploaded: {new Date(lec.createdAt).toLocaleDateString()}
                    </div>

                    <div className="flex items-center gap-2">
                      {lec.notesUrl && (
                        <a
                          href={lec.notesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
                          title="View PDF Notes"
                        >
                          <FileText className="w-3.5 h-3.5" /> Notes PDF
                        </a>
                      )}

                      <button
                        onClick={() => setSelectedLectureForPreview(lec)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-md"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Watch Video
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAGE 4: 📚 SUBJECT REFERENCE RESOURCES */}
      {currentPage === 'resources' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-emerald-400" /> Whole-Subject Reference Library
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Standard textbook guidelines, curriculum resources, and master Drive folders provided by Admin for <strong className="text-emerald-400">{teacher.subject}</strong>.
            </p>
          </div>

          {subjectReference ? (
            <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-7 space-y-5 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {subjectReference.subjectName} • {subjectReference.department}
                  </span>
                  <h3 className="text-xl font-black text-slate-100 mt-2">{subjectReference.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(subjectReference.referenceUrl, 'Reference URL')}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                  <a
                    href={subjectReference.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Google Drive ↗
                  </a>
                </div>
              </div>

              {subjectReference.notes && (
                <div className="p-5 bg-slate-950 rounded-2xl border border-emerald-500/20 space-y-2">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-400" /> Admin Syllabus & Course Notes:
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed italic">
                    "{subjectReference.notes}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <div className="text-4xl">📂</div>
              <div className="font-bold text-slate-200 text-base">No Reference Materials Available Yet</div>
              <p className="text-xs text-slate-400">Your academic admin has not attached a Google Drive reference folder for {teacher.subject} yet.</p>
            </div>
          )}
        </div>
      )}

      {/* PAGE 5: 💬 ADMIN DIRECTIVES & QUALITY REMARKS */}
      {currentPage === 'directives' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" /> Admin Quality Directives & Notes ({teacherRemarks.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review feedback and quality improvement directives posted by the administration for your lecture sessions.
            </p>
          </div>

          {teacherRemarks.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <div className="text-4xl">💬</div>
              <div className="font-bold text-slate-200 text-base">No Directives Posted</div>
              <p className="text-xs text-slate-400">No improvement remarks have been posted by the admin yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teacherRemarks.map((rem) => {
                const isAck = acknowledgedRemarks.has(rem.id);
                return (
                  <div key={rem.id} className="bg-slate-900 border border-purple-500/30 p-5.5 rounded-3xl space-y-3 shadow-lg flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">Re: {rem.lectureTitle}</span>
                        <span className="text-[10px] text-slate-500">{rem.date}</span>
                      </div>
                      <div className="text-xs text-purple-200 italic bg-slate-950 p-4 rounded-2xl border border-purple-500/20 leading-relaxed">
                        "{rem.remark}"
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        Admin: <strong className="text-purple-300">{rem.adminName}</strong>
                      </span>

                      <button
                        onClick={() => toggleAcknowledgeRemark(rem.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                          isAck
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30'
                        }`}
                      >
                        {isAck ? <Check className="w-3.5 h-3.5" /> : null}
                        {isAck ? 'Acknowledged ✓' : 'Acknowledge Directive'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: TEACHER PROPOSES SUBTOPICS FOR ADMIN APPROVAL */}
      {proposingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  Propose Subtopics Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Define subtopics for Admin review & approval</p>
              </div>
              <button onClick={() => setProposingTopic(null)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>

            <div className="p-4 bg-slate-950 border border-indigo-500/20 rounded-2xl space-y-2">
              <div className="text-[11px] text-indigo-400 font-bold uppercase">{proposingTopic.subject}</div>
              <h4 className="text-base font-black text-slate-100">{proposingTopic.topicTitle}</h4>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Deadline: <strong className="text-amber-400">{proposingTopic.deadlineDate}</strong></span>
                <span>•</span>
                <span>Priority: <strong className="text-slate-200 capitalize">{proposingTopic.priority}</strong></span>
              </div>

              {subjectReference && (
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <BookMarked className="w-3.5 h-3.5" /> Subject Master Resource:
                  </span>
                  <a
                    href={subjectReference.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 font-bold rounded-lg text-xs flex items-center gap-1"
                  >
                    Open Drive Material ↗
                  </a>
                </div>
              )}

              {proposingTopic.notes && (
                <div className="pt-2 text-xs text-slate-300 italic border-t border-slate-900">
                  💬 Admin instructions: "{proposingTopic.notes}"
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitProposedSubtopics} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold">
                  Add Subtopics to Syllabus (Type single or comma-separated) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Tarjan SCC, Bridges, Kosaraju Algorithm"
                    value={subtopicInput}
                    onChange={(e) => setSubtopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProposedTag();
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={handleAddProposedTag}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-md transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Subtopics List */}
              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-2 min-h-[90px]">
                <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
                  <span>Proposed Subtopic Tags ({proposedSubtopicList.length})</span>
                  <span className="text-[10px] text-slate-500">Will be sent to Admin for approval</span>
                </div>

                {proposedSubtopicList.length === 0 ? (
                  <div className="text-xs text-slate-500 italic text-center py-4">
                    No subtopics added yet. Type or paste comma-separated subtopics above and click "+ Add".
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {proposedSubtopicList.map((st, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-sm"
                      >
                        #{st}
                        <button
                          type="button"
                          onClick={() => handleRemoveProposedTag(idx)}
                          className="text-slate-400 hover:text-red-400 font-bold"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProposingTopic(null)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={proposedSubtopicList.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" /> Submit to Admin for Approval
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
