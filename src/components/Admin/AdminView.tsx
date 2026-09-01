import React, { useState, useMemo, useEffect } from 'react';
import type { User, Lecture, AssignedTopic, SubjectReference, SubtopicItem, PptRequest, PptRequestStatus } from '../../types';
import { StorageService } from '../../services/storage';
import { VideoModal } from '../Common/VideoModal';
import { DatabaseSettingsModal } from '../Common/DatabaseSettingsModal';
import { EmailSettingsModal } from '../Common/EmailSettingsModal';
import { DailyBacklogLogsView } from '../Teacher/DailyBacklogLogsView';
import { 
  Calendar, Search, UserPlus, Trash2, Video, FileText, ShieldCheck, 
  Eye, MessageCircle, Clock, X, 
  Key, Lock, User as UserIcon, EyeOff, CheckCircle2, 
  Edit3, Link2, Layers, BookMarked, FolderPlus,
  Users, FileSpreadsheet, Database, Folder,
  ChevronDown, ChevronUp, Image as ImageIcon, MessageSquare,
  ArrowUp, ArrowDown, ArrowLeft, Sparkles, BookOpen, Grid, ChevronRight, Wallet, Mail
} from 'lucide-react';

interface AdminViewProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onRefreshData?: () => void;
  refreshTrigger?: number;
}

const getNextTeacherId = (currentTeachers: User[]): string => {
  const ids = currentTeachers
    .map(t => {
      const match = t.teacherId.match(/AEW-T-(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => num > 0);
  
  const maxId = ids.length > 0 ? Math.max(...ids) : 100;
  return `AEW-T-${maxId + 1}`;
};

export const AdminView: React.FC<AdminViewProps> = ({ 
  currentPage, 
  onPageChange, 
  onRefreshData,
  refreshTrigger
}) => {
  const [teachers, setTeachers] = useState<User[]>(StorageService.getTeachers());
  const [lectures, setLectures] = useState<Lecture[]>(StorageService.getLectures());
  const [assignedTopics, setAssignedTopics] = useState<AssignedTopic[]>(StorageService.getAssignedTopics());
  const [subjectReferences, setSubjectReferences] = useState<SubjectReference[]>(StorageService.getSubjectReferences());
  const [pptRequests, setPptRequests] = useState<PptRequest[]>(StorageService.getPptRequests());

  // PPT Request Fulfillment Modal State
  const [fulfillingRequest, setFulfillingRequest] = useState<PptRequest | null>(null);
  const [fulfillStatus, setFulfillStatus] = useState<PptRequestStatus>('completed');
  const [fulfillPptUrl, setFulfillPptUrl] = useState('');
  const [fulfillPdfUrl, setFulfillPdfUrl] = useState('');
  const [fulfillRemarks, setFulfillRemarks] = useState('');
  
  const [selectedLectureForPreview, setSelectedLectureForPreview] = useState<Lecture | null>(null);
  const [remarkingLectureId, setRemarkingLectureId] = useState<string | null>(null);
  const [remarkInput, setRemarkInput] = useState('');
  const [searchTeacherQuery, setSearchTeacherQuery] = useState('');
  const [searchLectureQuery, setSearchLectureQuery] = useState('');
  const [searchTopicQuery, setSearchTopicQuery] = useState('');
  const [adminInspectDailyLogsTeacherId, setAdminInspectDailyLogsTeacherId] = useState<string | null>(null);

  // Step-by-Step Subject & Unit Square Card Selection State for Admin Syllabus
  const [selectedSubjectAdminSyllabus, setSelectedSubjectAdminSyllabus] = useState<string | null>(null);
  const [selectedUnitAdminSyllabus, setSelectedUnitAdminSyllabus] = useState<string | null>(null);
  const [adminSyllabusViewMode, setAdminSyllabusViewMode] = useState<'cards' | 'flat'>('cards');
  const [adminTopicFilterTab, setAdminTopicFilterTab] = useState<'all' | 'pending_approval' | 'revision_requested' | 'approved' | 'completed'>('all');
  const [selectedTeacherAdminSyllabus, setSelectedTeacherAdminSyllabus] = useState<string>('all');

  // Unit-wise and Teacher-wise Lecture Organization filters
  const [selectedTeacherLectureFilter, setSelectedTeacherLectureFilter] = useState<string>('all');
  const [selectedUnitLectureFilter, setSelectedUnitLectureFilter] = useState<string>('all');
  const [collapsedTeacherIds, setCollapsedTeacherIds] = useState<Set<string>>(new Set());

  const toggleCollapseTeacher = (teacherId: string) => {
    setCollapsedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  };

  // Academic Directives & Teacher Acknowledgments Tracker State
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [directiveFilter, setDirectiveFilter] = useState<'all' | 'acknowledged' | 'pending'>('all');
  const ackStats = useMemo(() => StorageService.getAdminRemarkAckStats(), [lectures, refreshCounter]);
  const allDirectives = useMemo(() => StorageService.getAllDirectivesWithLectures(), [lectures, refreshCounter]);
  
  const filteredDirectives = useMemo(() => {
    if (directiveFilter === 'acknowledged') return allDirectives.filter((d) => d.remark.isAcknowledged);
    if (directiveFilter === 'pending') return allDirectives.filter((d) => !d.remark.isAcknowledged);
    return allDirectives;
  }, [allDirectives, directiveFilter]);

  useEffect(() => {
    if (currentPage === 'admin_lectures' || currentPage === 'admin_dashboard') {
      StorageService.markAdminAcksAsRead();
    }
  }, [currentPage]);

  // Add Teacher Modal state with Credentials
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacherId, setNewTeacherId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('teach123');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('Computer Science & Engg');
  const [newSubject, setNewSubject] = useState('Data Structures & Algorithms');
  const [newTargetMinutes, setNewTargetMinutes] = useState(120);
  const [newMaxDailyMinutes, setNewMaxDailyMinutes] = useState(240);
  
  // Edit Teacher Credentials Modal State
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editTargetMinutes, setEditTargetMinutes] = useState(120);
  const [editMaxDailyMinutes, setEditMaxDailyMinutes] = useState(240);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Late Extensions Modal State
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  

  // Day Off / Leave Modal State
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [dayOffTeacherId, setDayOffTeacherId] = useState(teachers[0]?.teacherId || '');
  const [dayOffDate, setDayOffDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayOffEndDate, setDayOffEndDate] = useState('');
  const [dayOffReason, setDayOffReason] = useState('Medical Leave');
  const [dayOffNotes, setDayOffNotes] = useState('');
  const [extTeacherId, setExtTeacherId] = useState('');
  const [extStartWindow, setExtStartWindow] = useState('');
  const [extEndWindow, setExtEndWindow] = useState('');
  const [extAllowedMinutes, setExtAllowedMinutes] = useState(60);
  const [extNotes, setExtNotes] = useState('');
  const [extTopicIds, setExtTopicIds] = useState<string[]>([]);

  const extBreakdown = useMemo(() => {
    if (!extTeacherId) return null;
    return StorageService.getTeacherExtensionBreakdown(extTeacherId);
  }, [extTeacherId, refreshCounter, refreshTrigger, lectures]);

  useEffect(() => {
    if (currentPage !== 'admin_extensions') return;
    if (teachers.length === 0) {
      alert('Please onboard faculty first.');
      onPageChange('admin_faculty');
      return;
    }
    const defaultTeacherId = extTeacherId || teachers[0].teacherId;
    const now = new Date();
    if (!extTeacherId) {
      setExtTeacherId(defaultTeacherId);
      const breakdown = StorageService.getTeacherExtensionBreakdown(defaultTeacherId);
      setExtAllowedMinutes(breakdown.suggestedExtensionMinutes);
      setExtTopicIds(breakdown.undeliveredTopics.map((t) => t.id));
    }
    if (!extStartWindow) {
      setExtStartWindow(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      setExtEndWindow(new Date(now.getTime() + 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    }
    setShowExtensionModal(true);
  }, [currentPage, teachers]);

  // Standalone Assign Topic Modal State (Supports Comma Separated Topics)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState(teachers[0]?.teacherId || '');
  const [assignUnitNumber, setAssignUnitNumber] = useState('UNIT 1');
  const [assignTopicInput, setAssignTopicInput] = useState('');
  const [assignPriority, setAssignPriority] = useState<'high' | 'medium' | 'normal'>('high');
  const [assignNotes, setAssignNotes] = useState('');

  // Admin Credentials Modal State
  const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [adminName, setAdminName] = useState('Academic Operations Admin');
  const [adminEmail, setAdminEmail] = useState('admin@aew.com');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Subject Reference Modal State
  const [showSubjectRefModal, setShowSubjectRefModal] = useState(false);
  const [refSubjectName, setRefSubjectName] = useState('');
  const [refDepartment, setRefDepartment] = useState('Engineering');
  const [refTitle, setRefTitle] = useState('Master Subject Syllabus & Standard Reference Notes');
  const [refUrl, setRefUrl] = useState('');
  const [refNotes, setRefNotes] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});


  // Subtopic Review & Approval Modal State
  const [reviewingTopic, setReviewingTopic] = useState<AssignedTopic | null>(null);
  const [reviewSubtopicItems, setReviewSubtopicItems] = useState<SubtopicItem[]>([]);
  const [reviewSubtopicInput, setReviewSubtopicInput] = useState('');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [reviewTopicTitleInput, setReviewTopicTitleInput] = useState('');

  // Parse comma-separated or newline-separated topics live for preview
  const parsedTopicList = useMemo(() => {
    return assignTopicInput
      .split(/,|\n/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }, [assignTopicInput]);

  // Unique list of subjects taught by faculty
  const availableSubjects = useMemo(() => {
    const list = Array.from(new Set(teachers.map((t) => t.subject).filter(Boolean)));
    return list.length > 0 ? list : ['Data Structures & Algorithms', 'Thermodynamics', 'Signals & Systems'];
  }, [teachers]);


  const refreshState = () => {
    setTeachers(StorageService.getTeachers());
    setLectures(StorageService.getLectures());
    setAssignedTopics(StorageService.getAssignedTopics());
    setSubjectReferences(StorageService.getSubjectReferences());
    setPptRequests(StorageService.getPptRequests());
    if (onRefreshData) {
      onRefreshData();
    }
    setRefreshCounter((c) => c + 1);
  };

  useEffect(() => {
    refreshState();
  }, [refreshTrigger, currentPage]);

  useEffect(() => {
    const handleStorageChange = () => {
      refreshState();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    const interval = setInterval(refreshState, 2500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleOpenFulfillModal = (req: PptRequest) => {
    setFulfillingRequest(req);
    setFulfillStatus(req.status);
    setFulfillPptUrl(req.completedPptUrl || '');
    setFulfillPdfUrl(req.completedPdfUrl || '');
    setFulfillRemarks(req.adminRemarks || 'Deck prepared and verified by AEW Content Studio in broadcast 16:9 widescreen format.');
  };

  const handleSaveFulfillment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillingRequest) return;

    StorageService.updatePptRequest(fulfillingRequest.id, {
      status: fulfillStatus,
      completedPptUrl: fulfillPptUrl.trim() || undefined,
      completedPdfUrl: fulfillPdfUrl.trim() || undefined,
      adminRemarks: fulfillRemarks.trim() || undefined,
    });

    setFulfillingRequest(null);
    refreshState();
  };

  const handleUpdateTargetMinutes = (teacherId: string, deltaMinutes: number) => {
    const target = teachers.find((t) => t.teacherId === teacherId);
    if (!target) return;
    const current = target.dailyTargetMinutes || 120;
    const updatedMinutes = Math.max(15, current + deltaMinutes);
    StorageService.updateTeacherTargetMinutes(teacherId, updatedMinutes);
    refreshState();
  };

  // Onboard New Teacher + Credentials
  const handleAddTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTeacherId.trim()) return;

    const generatedUsername = newUsername.trim().toLowerCase() || newTeacherId.trim().toLowerCase();
    const generatedPassword = newPassword.trim() || 'teach123';

    StorageService.addTeacher({
      teacherId: newTeacherId.trim().toUpperCase(),
      username: generatedUsername,
      password: generatedPassword,
      name: newName.trim(),
      email: newEmail.trim() || `${newTeacherId.toLowerCase()}@aew.com`,
      department: newDept.trim() || 'Engineering',
      subject: newSubject.trim() || 'Engineering',
      dailyTargetMinutes: newTargetMinutes || 120,
      maxDailyMinutes: newMaxDailyMinutes || 240,
    });

    setShowAddModal(false);
    setNewName('');
    setNewUsername('');
    setNewPassword('teach123');
    setNewTargetMinutes(120);
    setNewMaxDailyMinutes(240);
    refreshState();
  };

  // Open Edit Credentials Modal for a teacher
  const handleOpenEditTeacher = (t: User) => {
    setEditingTeacher(t);
    setEditUsername(t.username || t.teacherId.toLowerCase());
    setEditPassword(t.password || 'teach123');
    setEditName(t.name);
    setEditEmail(t.email);
    setEditDept(t.department);
    setEditSubject(t.subject);
    setEditTargetMinutes(t.dailyTargetMinutes || 120);
    setEditMaxDailyMinutes(t.maxDailyMinutes || (t.dailyTargetMinutes ? t.dailyTargetMinutes * 2 : 240));
    setShowEditPassword(false);
  };

  // Save Updated Credentials
  const handleSaveEditTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    StorageService.updateUser(editingTeacher.id, {
      name: editName.trim(),
      username: editUsername.trim().toLowerCase(),
      password: editPassword.trim(),
      email: editEmail.trim(),
      department: editDept.trim(),
      subject: editSubject.trim(),
      dailyTargetMinutes: editTargetMinutes || 120,
      maxDailyMinutes: editMaxDailyMinutes || 240,
    });

    setEditingTeacher(null);
    refreshState();
  };

  // Open Admin Credentials Modal
  const handleOpenAdminProfileModal = () => {
    const adminUser = StorageService.getUsers().find((u) => u.role === 'admin') || StorageService.getCurrentUser();
    if (adminUser) {
      setAdminUsername(adminUser.username || 'admin');
      setAdminPassword(adminUser.password || 'admin123');
      setAdminName(adminUser.name || 'Academic Operations Admin');
      setAdminEmail(adminUser.email || 'admin@aew.com');
    }
    setShowAdminProfileModal(true);
  };

  // Save Admin Credentials
  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) {
      alert('Username and password cannot be empty.');
      return;
    }

    StorageService.updateAdminCredentials({
      username: adminUsername.trim(),
      password: adminPassword.trim(),
      name: adminName.trim(),
      email: adminEmail.trim(),
    });

    setShowAdminProfileModal(false);
    alert('✓ Admin login credentials updated successfully! You can now log in with these new credentials.');
    refreshState();
  };

  // Admin Assigns Topics (Supports Multiple Comma-Separated Topics)
  const handleAssignTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedTopicList.length === 0 || !assignTeacherId) return;

    const targetTeacher = teachers.find((t) => t.teacherId === assignTeacherId);
    if (!targetTeacher) {
      alert('Selected teacher does not exist in the faculty roster. Please select a valid teacher.');
      return;
    }

    StorageService.addMultipleAssignedTopics(parsedTopicList, {
      teacherId: assignTeacherId,
      subject: targetTeacher?.subject || 'Engineering',
      unitNumber: assignUnitNumber.trim() || 'UNIT 1',
      priority: assignPriority,
      notes: assignNotes.trim() || undefined,
    });

    setShowAssignModal(false);
    setAssignTopicInput('');
    setAssignNotes('');
    refreshState();
  };

  // Admin Adds/Updates Subject-Level Reference Material
  const handleSubjectRefSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refSubjectName.trim() || !refUrl.trim()) return;

    StorageService.addOrUpdateSubjectReference({
      subjectName: refSubjectName.trim(),
      department: refDepartment.trim(),
      title: refTitle.trim() || 'Master Subject Reference Material',
      referenceUrl: refUrl.trim(),
      notes: refNotes.trim() || undefined,
    });

    setShowSubjectRefModal(false);
    setRefSubjectName('');
    setRefUrl('');
    setRefNotes('');
    refreshState();
  };

  const handleRemoveSubjectRef = (id: string) => {
    if (window.confirm('Remove this subject reference material?')) {
      StorageService.removeSubjectReference(id);
      refreshState();
    }
  };

  // Open Review Subtopics Modal
  const handleOpenReviewModal = (topic: AssignedTopic) => {
    setReviewingTopic(topic);
    
    let items: SubtopicItem[] = [];
    if (topic.subtopicItems && topic.subtopicItems.length > 0) {
      items = topic.subtopicItems.map((item) => ({ ...item }));
    } else {
      const names = (topic.subtopicsApprovalState === 'approved' && topic.subtopics && topic.subtopics.length > 0)
        ? topic.subtopics
        : (topic.proposedSubtopics && topic.proposedSubtopics.length > 0)
        ? topic.proposedSubtopics
        : topic.subtopics || [];

      items = names.map((name, idx) => ({
        id: `sub-rev-${idx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        status: 'pending',
      }));
    }

    setReviewSubtopicItems(items);
    setReviewSubtopicInput('');
    setRevisionFeedback('');
    setApprovalComment(topic.adminApprovalComment || '');
    setReviewTopicTitleInput(topic.topicTitle || '');
    setShowRevisionInput(false);
  };

  // Add tag in review modal
  const handleAddReviewItem = () => {
    const raw = reviewSubtopicInput.trim();
    if (!raw || !reviewingTopic) return;

    const names = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    setReviewSubtopicItems((prev) => {
      const updated = [...prev];
      names.forEach((name, i) => {
        updated.push({
          id: `sub-rev-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name,
          status: 'pending',
        });
      });
      return updated;
    });

    setReviewSubtopicInput('');
  };

  const handleUpdateSubtopicName = (index: number, newName: string) => {
    setReviewSubtopicItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          name: newName,
        };
      }
      return updated;
    });
  };

  const handleRemoveReviewItem = (index: number) => {
    setReviewSubtopicItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveSubtopicUp = (index: number) => {
    if (index <= 0) return;
    setReviewSubtopicItems((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveSubtopicDown = (index: number) => {
    setReviewSubtopicItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  const handleJumpSubtopic = (currentIndex: number, newIndex: number) => {
    setReviewSubtopicItems((prev) => {
      const updated = [...prev];
      if (newIndex < 0 || newIndex >= updated.length || currentIndex === newIndex) return updated;
      const [item] = updated.splice(currentIndex, 1);
      updated.splice(newIndex, 0, item);
      return updated;
    });
  };

  const handleSaveClick = () => {
    if (!reviewingTopic) return;
    const itemsToSave = reviewSubtopicItems.filter((item) => item.name && item.name.trim().length > 0);
    const comment = approvalComment;
    const titleToSave = reviewTopicTitleInput;

    if (reviewingTopic.subtopicsApprovalState === 'approved') {
      const updatedTopic = StorageService.updateTopicAndSubtopics(
        reviewingTopic.id,
        titleToSave,
        itemsToSave,
        comment
      );
      if (updatedTopic) {
        setAssignedTopics((prev) => prev.map((t) => (t.id === reviewingTopic.id ? updatedTopic : t)));
      }
      setReviewingTopic(null);
      setApprovalComment('');
      refreshState();
    } else {
      handleDirectApprove(reviewingTopic.id, reviewSubtopicItems, approvalComment);
    }
  };

  // Direct 1-Click Approve Subtopics (with optional comment/guidelines)
  const handleDirectApprove = (topicId: string, customItems?: SubtopicItem[], customComment?: string, customTopicTitle?: string) => {
    const itemsToSave = (customItems !== undefined ? customItems : reviewSubtopicItems).filter((item) => item.name && item.name.trim().length > 0);
    const names = itemsToSave.map((c) => c.name.trim());
    const comment = customComment !== undefined ? customComment : approvalComment;
    const titleToSave = customTopicTitle !== undefined ? customTopicTitle : reviewTopicTitleInput;
    
    const updatedTopic = StorageService.approveSubtopics(topicId, names, itemsToSave, comment, titleToSave);
    if (updatedTopic) {
      setAssignedTopics((prev) => prev.map((t) => (t.id === topicId ? updatedTopic : t)));
    }
    setReviewingTopic(null);
    setApprovalComment('');
    refreshState();
  };

  // Request Revision with Admin feedback
  const handleRequestRevisionSubmit = () => {
    if (!reviewingTopic || !revisionFeedback.trim()) {
      alert('Please enter feedback notes for the teacher explaining what to revise.');
      return;
    }
    StorageService.requestSubtopicsRevision(reviewingTopic.id, revisionFeedback.trim());
    setReviewingTopic(null);
    refreshState();
  };

  const handleRemoveTeacher = (teacherId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove teacher "${name}" (${teacherId})?`)) {
      StorageService.removeTeacher(teacherId);
      refreshState();
    }
  };

  const handleRemoveTopic = (topicId: string) => {
    if (window.confirm('Delete this assigned topic?')) {
      StorageService.removeAssignedTopic(topicId);
      refreshState();
    }
  };

  const handleSendAdminRemark = (lectureId: string) => {
    if (!remarkInput.trim()) return;
    StorageService.addAdminRemark(lectureId, remarkInput.trim());
    setRemarkingLectureId(null);
    setRemarkInput('');
    refreshState();
  };

  const filteredTeachers = useMemo(() => {
    const q = searchTeacherQuery.toLowerCase().trim();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.teacherId || '').toLowerCase().includes(q) ||
        (t.username || '').toLowerCase().includes(q) ||
        (t.department || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q)
    );
  }, [teachers, searchTeacherQuery]);

  // Helper function to resolve unit name for any lecture
  const resolveLectureUnit = (lec: Lecture, topics: AssignedTopic[]): string => {
    if (lec.unitNumber && lec.unitNumber.trim()) {
      return lec.unitNumber.trim().toUpperCase();
    }
    if (lec.assignedTopicId) {
      const matchedTopic = topics.find((t) => t.id === lec.assignedTopicId);
      if (matchedTopic?.unitNumber && matchedTopic.unitNumber.trim()) {
        return matchedTopic.unitNumber.trim().toUpperCase();
      }
    }
    const matchedByTitle = topics.find(
      (t) =>
        t.teacherId.toUpperCase() === lec.teacherId.toUpperCase() &&
        t.topicTitle.toLowerCase() === lec.primaryTopic.toLowerCase()
    );
    if (matchedByTitle?.unitNumber && matchedByTitle.unitNumber.trim()) {
      return matchedByTitle.unitNumber.trim().toUpperCase();
    }

    const combined = `${lec.title} ${lec.primaryTopic}`;
    const match = combined.match(/\b(UNIT|MODULE)\s*([0-9IVX]+)/i);
    if (match) {
      return `UNIT ${match[2].toUpperCase()}`;
    }

    return 'UNASSIGNED';
  };

  // Distinct list of available units — scoped to the active teacher filter
  const allAvailableUnits = useMemo(() => {
    const unitSet = new Set<string>();
    const scopedLectures = selectedTeacherLectureFilter !== 'all'
      ? lectures.filter((l) => l.teacherId.toUpperCase() === selectedTeacherLectureFilter.toUpperCase())
      : lectures;
    scopedLectures.forEach((l) => {
      unitSet.add(resolveLectureUnit(l, assignedTopics));
    });
    // Only include syllabus units in "all teachers" view (keeps unit bar focused)
    if (selectedTeacherLectureFilter === 'all') {
      assignedTopics.forEach((t) => {
        if (t.unitNumber) unitSet.add(t.unitNumber.trim().toUpperCase());
      });
    } else {
      // Scope syllabus units to selected teacher
      assignedTopics.filter((t) => t.teacherId.toUpperCase() === selectedTeacherLectureFilter.toUpperCase()).forEach((t) => {
        if (t.unitNumber) unitSet.add(t.unitNumber.trim().toUpperCase());
      });
    }
    const arr = Array.from(unitSet);
    const num = (s: string) => parseInt(s.replace(/[^0-9]/g, ''), 10);
    return arr.sort((a, b) => {
      const na = num(a);
      const nb = num(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [lectures, assignedTopics, selectedTeacherLectureFilter]);

  // Hierarchically group lectures by Teacher -> then Unit-wise
  const teacherOrganizedLectures = useMemo(() => {
    const q = searchLectureQuery.toLowerCase().trim();

    // 1. First filter lectures by query
    let filtered = lectures;
    if (q) {
      filtered = filtered.filter((l) => {
        const u = resolveLectureUnit(l, assignedTopics).toLowerCase();
        return (
          (l.title || '').toLowerCase().includes(q) ||
          (l.teacherName || '').toLowerCase().includes(q) ||
          (l.teacherId || '').toLowerCase().includes(q) ||
          (l.subject || '').toLowerCase().includes(q) ||
          (l.primaryTopic || '').toLowerCase().includes(q) ||
          u.includes(q) ||
          (l.subtopics || []).some((st) => (st || '').toLowerCase().includes(q))
        );
      });
    }

    // 2. Filter by teacher if selected
    if (selectedTeacherLectureFilter !== 'all') {
      filtered = filtered.filter(
        (l) => l.teacherId.toUpperCase() === selectedTeacherLectureFilter.toUpperCase()
      );
    }

    // 3. Filter by unit if selected
    if (selectedUnitLectureFilter !== 'all') {
      filtered = filtered.filter(
        (l) => resolveLectureUnit(l, assignedTopics) === selectedUnitLectureFilter
      );
    }

    // 4. Group by Teacher
    const teacherMap = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        department: string;
        subject: string;
        totalLectures: number;
        totalDuration: number;
        unitMap: Map<string, { unitName: string; lectures: Lecture[]; totalDuration: number }>;
      }
    >();

    // If teacher filter is set, seed matching teacher
    teachers.forEach((t) => {
      if (selectedTeacherLectureFilter === 'all' || selectedTeacherLectureFilter.toUpperCase() === t.teacherId.toUpperCase()) {
        teacherMap.set(t.teacherId.toUpperCase(), {
          teacherId: t.teacherId,
          teacherName: t.name,
          department: t.department,
          subject: t.subject,
          totalLectures: 0,
          totalDuration: 0,
          unitMap: new Map(),
        });
      }
    });

    // Populate with filtered lectures
    filtered.forEach((lec) => {
      const cleanTId = lec.teacherId.toUpperCase();
      if (!teacherMap.has(cleanTId)) {
        const teacherObj = teachers.find((t) => t.teacherId.toUpperCase() === cleanTId);
        teacherMap.set(cleanTId, {
          teacherId: lec.teacherId,
          teacherName: teacherObj?.name || lec.teacherName,
          department: teacherObj?.department || lec.department,
          subject: teacherObj?.subject || lec.subject,
          totalLectures: 0,
          totalDuration: 0,
          unitMap: new Map(),
        });
      }

      const tData = teacherMap.get(cleanTId)!;
      tData.totalLectures += 1;
      tData.totalDuration += (lec.durationMinutes || 45);

      const unitName = resolveLectureUnit(lec, assignedTopics);
      if (!tData.unitMap.has(unitName)) {
        tData.unitMap.set(unitName, {
          unitName,
          lectures: [],
          totalDuration: 0,
        });
      }

      const uData = tData.unitMap.get(unitName)!;
      uData.lectures.push(lec);
      uData.totalDuration += (lec.durationMinutes || 45);
    });

    // Natural sort helper for Units
    const sortUnits = (a: string, b: string) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    };

    // Convert map to array and filter
    return Array.from(teacherMap.values())
      .filter((t) => {
        if (selectedTeacherLectureFilter !== 'all') {
          return true; // Show specifically selected teacher
        }
        // In "All Faculty" view, only display teachers who have delivered lectures
        return t.totalLectures > 0;
      })
      .map((t) => {
        const unitsArray = Array.from(t.unitMap.values()).sort((a, b) => sortUnits(a.unitName, b.unitName));
        unitsArray.forEach((u) => {
          u.lectures.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
        return {
          teacherId: t.teacherId,
          teacherName: t.teacherName,
          department: t.department,
          subject: t.subject,
          totalLectures: t.totalLectures,
          totalDuration: t.totalDuration,
          units: unitsArray,
        };
      });
  }, [lectures, assignedTopics, teachers, searchLectureQuery, selectedTeacherLectureFilter, selectedUnitLectureFilter]);

  // Available Subjects for Admin Syllabus Square Cards
  const adminAvailableSubjects = useMemo(() => {
    const subjectsMap = new Map<string, {
      name: string;
      department: string;
      topics: AssignedTopic[];
      units: string[];
      teachers: Set<string>;
      pendingApprovalCount: number;
      revisionCount: number;
      approvedCount: number;
      completedCount: number;
    }>();

    // From subject references
    subjectReferences.forEach((ref) => {
      const sKey = ref.subjectName.trim().toUpperCase();
      if (!subjectsMap.has(sKey)) {
        subjectsMap.set(sKey, {
          name: ref.subjectName.trim(),
          department: ref.department || 'Academic Curriculum',
          topics: [],
          units: [],
          teachers: new Set(),
          pendingApprovalCount: 0,
          revisionCount: 0,
          approvedCount: 0,
          completedCount: 0,
        });
      }
    });

    // From teachers
    teachers.forEach((t) => {
      if (t.subject) {
        const sKey = t.subject.trim().toUpperCase();
        if (!subjectsMap.has(sKey)) {
          subjectsMap.set(sKey, {
            name: t.subject.trim(),
            department: t.department || 'Academic Curriculum',
            topics: [],
            units: [],
            teachers: new Set(),
            pendingApprovalCount: 0,
            revisionCount: 0,
            approvedCount: 0,
            completedCount: 0,
          });
        }
        subjectsMap.get(sKey)!.teachers.add(t.name);
      }
    });

    // From assigned topics
    assignedTopics.forEach((topic) => {
      const sName = topic.subject?.trim() || 'General';
      const sKey = sName.toUpperCase();
      const targetTeacher = teachers.find((t) => t.teacherId.toUpperCase() === topic.teacherId.toUpperCase());
      
      if (!subjectsMap.has(sKey)) {
        subjectsMap.set(sKey, {
          name: sName,
          department: targetTeacher?.department || 'Academic Curriculum',
          topics: [],
          units: [],
          teachers: new Set(),
          pendingApprovalCount: 0,
          revisionCount: 0,
          approvedCount: 0,
          completedCount: 0,
        });
      }

      const item = subjectsMap.get(sKey)!;
      item.topics.push(topic);
      if (targetTeacher?.name) item.teachers.add(targetTeacher.name);
      else if (topic.teacherId) item.teachers.add(topic.teacherId);
      
      const uName = (topic.unitNumber || 'UNIT 1').trim().toUpperCase();
      if (!item.units.includes(uName)) {
        item.units.push(uName);
      }

      const approvalState = topic.subtopicsApprovalState || 'pending_teacher_input';
      if (topic.status === 'completed') item.completedCount++;
      else if (approvalState === 'approved') item.approvedCount++;
      else if (approvalState === 'revision_requested') item.revisionCount++;
      else if (approvalState === 'pending_admin_approval') item.pendingApprovalCount++;
    });

    return Array.from(subjectsMap.values()).sort((a, b) => b.topics.length - a.topics.length);
  }, [assignedTopics, subjectReferences, teachers]);

  // Available Units for Selected Subject in Admin Syllabus
  const adminAvailableUnitsForSubject = useMemo(() => {
    let relevantTopics = assignedTopics;
    if (selectedSubjectAdminSyllabus && selectedSubjectAdminSyllabus !== 'all') {
      relevantTopics = assignedTopics.filter(
        (t) => (t.subject || '').trim().toUpperCase() === selectedSubjectAdminSyllabus.trim().toUpperCase()
      );
    }

    const unitsMap = new Map<string, {
      unitName: string;
      topics: AssignedTopic[];
      teachers: Set<string>;
      pendingApprovalCount: number;
      revisionCount: number;
      approvedCount: number;
      completedCount: number;
    }>();

    // Seed default units if empty
    if (relevantTopics.length === 0) {
      ['UNIT 1', 'UNIT 2', 'UNIT 3'].forEach((u) => {
        unitsMap.set(u, {
          unitName: u,
          topics: [],
          teachers: new Set(),
          pendingApprovalCount: 0,
          revisionCount: 0,
          approvedCount: 0,
          completedCount: 0,
        });
      });
    }

    relevantTopics.forEach((topic) => {
      const uName = (topic.unitNumber || 'UNIT 1').trim();
      const uKey = uName.toUpperCase();
      const targetTeacher = teachers.find((t) => t.teacherId.toUpperCase() === topic.teacherId.toUpperCase());
      
      if (!unitsMap.has(uKey)) {
        unitsMap.set(uKey, {
          unitName: uName,
          topics: [],
          teachers: new Set(),
          pendingApprovalCount: 0,
          revisionCount: 0,
          approvedCount: 0,
          completedCount: 0,
        });
      }

      const item = unitsMap.get(uKey)!;
      item.topics.push(topic);
      if (targetTeacher?.name) item.teachers.add(targetTeacher.name);
      else if (topic.teacherId) item.teachers.add(topic.teacherId);
      
      const approvalState = topic.subtopicsApprovalState || 'pending_teacher_input';
      if (topic.status === 'completed') item.completedCount++;
      else if (approvalState === 'approved') item.approvedCount++;
      else if (approvalState === 'revision_requested') item.revisionCount++;
      else if (approvalState === 'pending_admin_approval') item.pendingApprovalCount++;
    });

    const sortUnits = (a: string, b: string) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    };

    return Array.from(unitsMap.values()).sort((a, b) => sortUnits(a.unitName, b.unitName));
  }, [assignedTopics, selectedSubjectAdminSyllabus, teachers]);

  const filteredAssignedTopics = useMemo(() => {
    return assignedTopics.filter((topic) => {
      // Subject filter
      if (selectedSubjectAdminSyllabus && selectedSubjectAdminSyllabus !== 'all') {
        if ((topic.subject || '').trim().toUpperCase() !== selectedSubjectAdminSyllabus.trim().toUpperCase()) {
          return false;
        }
      }

      // Unit filter
      if (selectedUnitAdminSyllabus && selectedUnitAdminSyllabus !== 'all') {
        if ((topic.unitNumber || 'UNIT 1').trim().toUpperCase() !== selectedUnitAdminSyllabus.trim().toUpperCase()) {
          return false;
        }
      }

      // Teacher filter
      if (selectedTeacherAdminSyllabus && selectedTeacherAdminSyllabus !== 'all') {
        if ((topic.teacherId || '').trim().toUpperCase() !== selectedTeacherAdminSyllabus.trim().toUpperCase()) {
          return false;
        }
      }

      // Status filter
      const approvalState = topic.subtopicsApprovalState || 'pending_teacher_input';
      if (adminTopicFilterTab === 'pending_approval' && approvalState !== 'pending_admin_approval') return false;
      if (adminTopicFilterTab === 'revision_requested' && approvalState !== 'revision_requested') return false;
      if (adminTopicFilterTab === 'approved' && (approvalState !== 'approved' || topic.status === 'completed')) return false;
      if (adminTopicFilterTab === 'completed' && topic.status !== 'completed') return false;

      // Query filter
      const q = searchTopicQuery.toLowerCase().trim();
      if (!q) return true;

      const targetTeacher = teachers.find((t) => t.teacherId.toUpperCase() === topic.teacherId.toUpperCase());
      const matchesTitle = (topic.topicTitle || '').toLowerCase().includes(q);
      const matchesTeacher = (topic.teacherId || '').toLowerCase().includes(q) || (targetTeacher?.name || '').toLowerCase().includes(q);
      const matchesSubject = (topic.subject || '').toLowerCase().includes(q);
      const matchesUnit = (topic.unitNumber || '').toLowerCase().includes(q);
      const matchesSubtopics = topic.subtopics?.some((st) => (st || '').toLowerCase().includes(q)) ||
        topic.proposedSubtopics?.some((st) => (st || '').toLowerCase().includes(q));

      return matchesTitle || matchesTeacher || matchesSubject || matchesUnit || !!matchesSubtopics;
    });
  }, [assignedTopics, selectedSubjectAdminSyllabus, selectedUnitAdminSyllabus, adminTopicFilterTab, selectedTeacherAdminSyllabus, searchTopicQuery, teachers]);

  const pendingApprovalTopics = assignedTopics.filter(
    (t) => t.subtopicsApprovalState === 'pending_admin_approval'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* PAGE 1: 🏠 OVERVIEW DASHBOARD */}
      {(currentPage === 'admin_dashboard' || currentPage === 'admin_extensions' || !currentPage) && (
        <div className="space-y-8">
          {/* HERO BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-purple-950/50 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Admin Operations
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                  Operations & Faculty Management
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
                Academic Administration Center
              </h2>
              <p className="text-xs md:text-sm text-slate-400 font-medium max-w-xl">
                Manage syllabus topics, set individual subtopic submission deadlines, oversee whole-subject reference libraries, and audit delivered sessions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onPageChange('thumbnail_generator')}
                className="px-4 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02]"
              >
                <ImageIcon className="w-4 h-4 text-amber-400" /> 16:9 Thumbnail Studio
              </button>
              <button
                onClick={() => onPageChange('ppt_generator')}
                className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02]"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" /> PYQ PPT Generator
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="px-4 py-3 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/40 text-indigo-300 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02] cursor-pointer"
              >
                <Mail className="w-4 h-4 text-indigo-400" /> Email Notifications
              </button>
              <button
                onClick={() => setShowDbModal(true)}
                className="px-4 py-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02] cursor-pointer"
              >
                <Database className="w-4 h-4 text-emerald-400" /> Database (Supabase)
              </button>
              <button
                onClick={handleOpenAdminProfileModal}
                className="px-4 py-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02]"
              >
                <Key className="w-4 h-4 text-indigo-400" /> Admin ID & Password
              </button>
              <button
                onClick={() => {
                  if (teachers.length === 0) {
                    alert('Please onboard at least one faculty member first.');
                    return;
                  }
                  setAssignTeacherId(teachers[0]?.teacherId || '');
                  setShowAssignModal(true);
                }}
                className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02]"
              >
                📌 + Assign Topics
              </button>
              <button
                onClick={() => {
                  const nextId = getNextTeacherId(teachers);
                  setNewTeacherId(nextId);
                  setNewUsername(`teacher_${nextId.replace('AEW-T-', '')}`);
                  setShowAddModal(true);
                }}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-purple-600/30 transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02]"
              >
                <UserPlus className="w-4 h-4" /> + Onboard Faculty
              </button>
            </div>
          </div>

          {/* METRICS STATS OVERVIEW */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div 
              onClick={() => onPageChange('admin_faculty')}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-1.5 shadow-lg cursor-pointer hover:border-indigo-500/40 transition-all"
            >
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>Faculty Members</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-black text-slate-100">{teachers.length}</div>
              <div className="text-[11px] text-indigo-400 font-medium">Manage roster ➔</div>
            </div>

            <div 
              onClick={() => onPageChange('admin_syllabus')}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-1.5 shadow-lg cursor-pointer hover:border-amber-500/40 transition-all"
            >
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>Assigned Topics</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400">{assignedTopics.length}</div>
              <div className="text-[11px] text-amber-300/80 font-medium">Syllabus tracker ➔</div>
            </div>

            <div 
              onClick={() => onPageChange('admin_syllabus')}
              className="bg-slate-900/90 border border-purple-500/40 rounded-3xl p-5 space-y-1.5 shadow-lg cursor-pointer hover:border-purple-500/80 transition-all bg-purple-950/10"
            >
              <div className="text-xs text-purple-300 font-semibold flex items-center justify-between">
                <span>Subtopics Due</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-black text-purple-300">{pendingApprovalTopics.length}</div>
              <div className="text-[11px] text-purple-400 font-medium">Review inbox ➔</div>
            </div>

            <div 
              onClick={() => onPageChange('admin_lectures')}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-1.5 shadow-lg cursor-pointer hover:border-emerald-500/40 transition-all"
            >
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>Delivered Lectures</span>
                <Video className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-slate-100">{lectures.length}</div>
              <div className="text-[11px] text-emerald-400 font-medium">Audit sessions ➔</div>
            </div>

            <div 
              onClick={() => onPageChange('admin_lectures')}
              className="bg-slate-900/90 border border-indigo-500/40 rounded-3xl p-5 space-y-1.5 shadow-lg cursor-pointer hover:border-indigo-500/80 transition-all bg-indigo-950/15 relative overflow-hidden"
            >
              {ackStats.newAcks > 0 && (
                <div className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
              )}
              <div className="text-xs text-indigo-300 font-semibold flex items-center justify-between">
                <span>Directives & Acks</span>
                <MessageCircle className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-black text-indigo-300">
                {ackStats.acknowledged}/{ackStats.total}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {ackStats.total > 0 ? Math.round((ackStats.acknowledged / ackStats.total) * 100) : 100}% Acknowledged
              </div>
            </div>
          </div>

          {/* PENDING APPROVAL ALERT BANNER */}
          {pendingApprovalTopics.length > 0 && (
            <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border-2 border-purple-500/50 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl animate-bounce">🔔</span>
                  <div>
                    <h3 className="text-base font-extrabold text-purple-200">
                      Subtopics Awaiting Your Approval ({pendingApprovalTopics.length})
                    </h3>
                    <p className="text-xs text-slate-400">Review teacher proposals & set individual subtopic submission deadlines</p>
                  </div>
                </div>
                <button
                  onClick={() => onPageChange('admin_syllabus')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Review All ➔
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingApprovalTopics.slice(0, 2).map((topic) => {
                  const targetTeacher = teachers.find((t) => t.teacherId === topic.teacherId);
                  return (
                    <div key={topic.id} className="bg-slate-950/90 border border-purple-500/30 rounded-2xl p-4.5 space-y-3 shadow-md flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400">
                            👨‍🏫 {targetTeacher?.name || topic.teacherId}
                          </span>
                          <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-bold">
                            Pending Review
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-100 mt-1">{topic.topicTitle}</h4>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                        <button
                          onClick={() => handleOpenReviewModal(topic)}
                          className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Review / Set Deadlines
                        </button>
                        <button
                          onClick={() => handleDirectApprove(topic.id)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve ✓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACADEMIC DIRECTIVES & FACULTY ACKNOWLEDGMENTS TRACKER */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <MessageCircle className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-100">
                        Academic Directives & Teacher Acknowledgments Feed
                      </h3>
                      {ackStats.newAcks > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                          🔔 {ackStats.newAcks} New Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Live audit of instructions posted to faculty recordings and their verified acknowledgment receipts
                    </p>
                  </div>
                </div>
              </div>

              {/* STATS BADGES & FILTER TABS */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setDirectiveFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      directiveFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({allDirectives.length})
                  </button>
                  <button
                    onClick={() => setDirectiveFilter('acknowledged')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      directiveFilter === 'acknowledged'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Acknowledged ({ackStats.acknowledged})
                  </button>
                  <button
                    onClick={() => setDirectiveFilter('pending')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      directiveFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Pending ({ackStats.pending})
                  </button>
                </div>
              </div>
            </div>

            {/* DIRECTIVES LIST */}
            {filteredDirectives.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs space-y-3">
                <div className="text-3xl">{allDirectives.length === 0 ? '📋' : '🔍'}</div>
                <div>
                  <p className="font-semibold text-slate-300">
                    {allDirectives.length === 0 ? 'No Academic Directives Posted Yet' : 'No Directives Match This Filter'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {allDirectives.length === 0
                      ? 'Open Lecture Audits, inspect a faculty recording, and click "Write Directive" to post your first quality directive.'
                      : 'Try switching to All or a different filter tab to view other directives.'}
                  </p>
                </div>
                {allDirectives.length === 0 && (
                  <button
                    onClick={() => onPageChange('admin_lectures')}
                    className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold rounded-xl text-xs transition-colors mx-auto"
                  >
                    Go to Lecture Audits →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDirectives.map((item) => {
                  const isAck = item.remark.isAcknowledged;

                  return (
                    <div
                      key={item.remark.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-md ${
                        isAck
                          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60'
                          : 'bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 border-amber-500/40 hover:border-amber-500/60'
                      }`}
                    >
                      {/* TOP: FACULTY & LECTURE INFO */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                              👨‍🏫
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-100 leading-tight">
                                {item.teacherName}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.teacherId} • {item.subject}
                              </span>
                            </div>
                          </div>

                          {/* ACKNOWLEDGMENT BADGE */}
                          {isAck ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Acknowledged
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Pending Action
                            </span>
                          )}
                        </div>

                        {/* LECTURE TITLE */}
                        <div className="px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-2">
                          <span className="truncate font-semibold flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {item.lectureTitle}
                          </span>
                          {item.unitNumber && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold shrink-0">
                              {item.unitNumber}
                            </span>
                          )}
                        </div>

                        {/* DIRECTIVE TEXT */}
                        <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-xs text-purple-200 italic leading-relaxed">
                          "{item.remark.remarkText}"
                        </div>
                      </div>

                      {/* BOTTOM: RECEIPT TIMESTAMP & ACTIONS */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                        {isAck ? (
                          <div className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Acknowledged by <strong>{item.remark.acknowledgedByName || item.teacherName}</strong>
                              {item.remark.acknowledgedAt && ` on ${new Date(item.remark.acknowledgedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          </div>
                        ) : (
                          <div className="text-amber-400/90 text-[10px] font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Awaiting teacher to acknowledge on Teacher Portal</span>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setSelectedTeacherLectureFilter(item.teacherId);
                            onPageChange('admin_lectures');
                          }}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 self-end sm:self-auto cursor-pointer"
                        >
                          Audit Lecture ➔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TEACHER TOPIC PYQ DECK REQUESTS QUEUE */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">
                      Faculty Topic PYQ Deck Requests Queue ({pptRequests.length})
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {pptRequests.filter((r) => r.status !== 'completed').length} In Queue
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Faculty request topic-wise PYQs 2 days in advance. Compile questions and deliver .pptx/.pdf download links.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange('ppt_generator')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Open PPT Studio
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pptRequests.map((req) => {
                const isDone = req.status === 'completed';
                const isInProg = req.status === 'in_progress';

                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                      isDone
                        ? 'bg-slate-950/70 border-emerald-500/30'
                        : isInProg
                        ? 'bg-slate-950/80 border-indigo-500/40'
                        : 'bg-slate-950/90 border-amber-500/30'
                    }`}
                  >
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                          {req.unitNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : isInProg
                            ? 'bg-indigo-500/15 text-indigo-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          {isDone ? '✓ Completed' : isInProg ? 'In Production' : 'Queued'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-100 truncate">{req.topicTitle}</h4>
                      <p className="text-[11px] text-slate-400">
                        Faculty: <strong className="text-slate-200">{req.teacherName}</strong> • Target: <strong className="text-amber-300 font-mono">{req.lectureDate}</strong>
                      </p>

                      {req.specialInstructions && (
                        <p className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 italic">
                          "{req.specialInstructions}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center gap-2 text-xs">
                      <button
                        onClick={() => handleOpenFulfillModal(req)}
                        className={`flex-1 py-1.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-1 ${
                          isDone
                            ? 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                        }`}
                      >
                        {isDone ? 'Edit Deck Links' : 'Fulfill & Deliver →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TODAY'S FACULTY UPLOAD COMMITMENT SCHEDULES */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Today's Faculty Upload Commitments
                </h3>
              </div>
              <button
                onClick={() => onPageChange('admin_faculty')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View Faculty Roster →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {teachers.map((t) => {
                const commitment = StorageService.getDailyCommitment(t.teacherId);
                const backlog = StorageService.getPreviousDayBacklog(t.teacherId);
                const recordedMins = StorageService.getMinutesRecordedToday(t.teacherId);
                const targetMins = t.dailyTargetMinutes || 120;
                const isMet = recordedMins >= targetMins;
                const onTime = StorageService.getOnTimeSubmissionStats(t.teacherId);

                const formatTime = (time24?: string) => {
                  if (!time24) return '';
                  const [hours, minutes] = time24.split(':').map(Number);
                  const period = hours >= 12 ? 'PM' : 'AM';
                  const formattedHours = hours % 12 || 12;
                  const formattedMinutes = String(minutes).padStart(2, '0');
                  return `${formattedHours}:${formattedMinutes} ${period}`;
                };

                return (
                  <div key={t.id} className="p-3 bg-slate-950/70 border border-slate-800/70 rounded-xl space-y-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 truncate">{t.name}</span>
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                          {t.teacherId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{t.subject}</div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Daily Cutoff:</span>
                        <span className={`font-mono font-bold ${
                          (t.dailyUploadCutoffTime || commitment) ? 'text-amber-400' : 'text-slate-500 italic'
                        }`}>
                          {t.dailyUploadCutoffTime 
                            ? formatTime(t.dailyUploadCutoffTime) 
                            : commitment 
                            ? formatTime(commitment.promisedTime) 
                            : 'Pending 1st Login'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Progress:</span>
                        <span className={isMet ? 'text-emerald-400 font-bold' : 'text-slate-300 font-medium'}>
                          {recordedMins} / {targetMins} min {isMet ? '✓' : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Total Delivered:</span>
                        <span className="font-mono font-bold text-slate-200">
                          {onTime.totalDeliveredMinutes}m ({Math.floor(onTime.totalDeliveredMinutes / 60)}h {onTime.totalDeliveredMinutes % 60}m)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">On-Time Rate:</span>
                        <span className={`font-mono font-bold ${
                          onTime.onTimePercentage >= 90
                            ? 'text-emerald-400'
                            : onTime.onTimePercentage >= 75
                            ? 'text-indigo-400'
                            : 'text-amber-400'
                        }`}>
                          {onTime.onTimePercentage}% ({onTime.onTimeMinutes}m on-time / {onTime.totalMinutes}m target)
                        </span>
                      </div>

                      {!backlog.isYesterdayFulfilled && (
                        <div className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          ⚠️ Yesterday incomplete ({backlog.yesterdayUnfulfilledMinutes}m)
                        </div>
                      )}

                      {commitment?.note && (
                        <p className="text-[10px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded border border-slate-800/60 truncate">
                          "{commitment.note}"
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeacherLectureFilter(t.teacherId);
                            onPageChange('admin_lectures');
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[10px] transition-all text-center cursor-pointer"
                        >
                          Audits ➔
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeacherAdminSyllabus(t.teacherId);
                            onPageChange('admin_syllabus');
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] transition-all text-center cursor-pointer"
                        >
                          Syllabus ➔
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExtTeacherId(t.teacherId);
                            const bk = StorageService.getTeacherExtensionBreakdown(t.teacherId);
                            setExtAllowedMinutes(bk.suggestedExtensionMinutes);
                            setExtTopicIds(bk.undeliveredTopics.map((top) => top.id));
                            setShowExtensionModal(true);
                          }}
                          className="py-1 px-2 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white font-bold text-[10px] transition-all text-center cursor-pointer"
                          title="Grant Extension"
                        >
                          ⏱️ Ext
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDayOffTeacherId(t.teacherId);
                            setShowDayOffModal(true);
                          }}
                          className="py-1 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-[10px] transition-all text-center cursor-pointer"
                          title="Grant Day Off / Leave"
                        >
                          🏖️ Leave
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2: 📌 SYLLABUS TOPICS & SUBTOPIC DEADLINES HUB (SQUARE CARDS SELECTOR) */}
      {currentPage === 'admin_syllabus' && (
        <div className="space-y-6">
          {/* HEADER BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
                    Syllabus & Subtopic Deadlines Center
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {adminSyllabusViewMode === 'cards' && !selectedSubjectAdminSyllabus
                      ? 'Step 1: Choose a subject module to review unit breakdowns and manage topic deadlines.'
                      : adminSyllabusViewMode === 'cards' && !selectedUnitAdminSyllabus
                      ? `Step 2: Choose a unit in ${selectedSubjectAdminSyllabus === 'all' ? 'all subjects' : selectedSubjectAdminSyllabus}`
                      : `Step 3: Review curriculum topics in ${selectedUnitAdminSyllabus === 'all' ? 'All Units' : selectedUnitAdminSyllabus}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setAdminSyllabusViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    adminSyllabusViewMode === 'cards'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Card Navigation (Subject ➔ Unit ➔ Topics)"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Module Cards</span>
                </button>
                <button
                  onClick={() => {
                    setAdminSyllabusViewMode('flat');
                    setSelectedSubjectAdminSyllabus('all');
                    setSelectedUnitAdminSyllabus('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    adminSyllabusViewMode === 'flat'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Direct Flat List of All Topics"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Topics</span>
                </button>
              </div>

              <button
                onClick={() => setShowReorderModal(true)}
                className="px-4 py-2 rounded-xl font-extrabold text-slate-200 text-xs bg-slate-900 border border-slate-700 hover:bg-slate-800 shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                ⇅ Reorder
              </button>
              <button
                onClick={() => {
                  if (teachers.length === 0) {
                    alert('Please onboard faculty first.');
                    return;
                  }
                  setAssignTeacherId(teachers[0]?.teacherId || '');
                  setShowAssignModal(true);
                }}
                className="px-4.5 py-2 rounded-xl font-extrabold text-slate-950 text-xs bg-amber-500 hover:bg-amber-400 shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                📌 + Assign Topics
              </button>
            </div>
          </div>

          {/* INTERACTIVE BREADCRUMB TRAIL */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  setSelectedSubjectAdminSyllabus(null);
                  setSelectedUnitAdminSyllabus(null);
                  setAdminSyllabusViewMode('cards');
                }}
                className={`font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                  !selectedSubjectAdminSyllabus && adminSyllabusViewMode === 'cards'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-amber-400 hover:bg-slate-800 hover:text-amber-300'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>1. Subjects ({adminAvailableSubjects.length})</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

              <button
                disabled={!selectedSubjectAdminSyllabus}
                onClick={() => {
                  setSelectedUnitAdminSyllabus(null);
                  setAdminSyllabusViewMode('cards');
                }}
                className={`font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent ${
                  selectedSubjectAdminSyllabus && !selectedUnitAdminSyllabus && adminSyllabusViewMode === 'cards'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : selectedSubjectAdminSyllabus
                    ? 'text-amber-400 hover:bg-slate-800 hover:text-amber-300'
                    : 'text-slate-500'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>
                  2. {selectedSubjectAdminSyllabus ? (selectedSubjectAdminSyllabus === 'all' ? 'All Subjects' : selectedSubjectAdminSyllabus) : 'Select Unit'}
                </span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

              <span
                className={`font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                  selectedUnitAdminSyllabus || adminSyllabusViewMode === 'flat'
                    ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                    : 'text-slate-500'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  3. {selectedUnitAdminSyllabus ? (selectedUnitAdminSyllabus === 'all' ? 'All Units' : selectedUnitAdminSyllabus) : 'Topics'}
                </span>
              </span>
            </div>

            {/* Quick Back Shortcuts */}
            <div className="flex items-center gap-2">
              {selectedUnitAdminSyllabus && (
                <button
                  onClick={() => setSelectedUnitAdminSyllabus(null)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Unit
                </button>
              )}
              {selectedSubjectAdminSyllabus && (
                <button
                  onClick={() => {
                    setSelectedSubjectAdminSyllabus(null);
                    setSelectedUnitAdminSyllabus(null);
                  }}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Subject
                </button>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STEP 1: CHOOSE SUBJECT (SQUARE CARDS UI)                        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {adminSyllabusViewMode === 'cards' && !selectedSubjectAdminSyllabus && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>📚 Step 1: Select Subject</span>
                  </h3>
                  <p className="text-xs text-slate-400">Click a subject module card to explore units and topics</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* "All Subjects Overview" Square Card */}
                <div
                  onClick={() => {
                    setSelectedSubjectAdminSyllabus('all');
                    setSelectedUnitAdminSyllabus('all');
                  }}
                  className="group relative rounded-3xl p-5 bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-purple-950/40 border-2 border-amber-500/40 hover:border-amber-400 hover:scale-[1.02] cursor-pointer transition-all shadow-xl flex flex-col justify-between aspect-square min-h-[220px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Overview
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-100 group-hover:text-amber-300 transition-colors">
                        All Subjects
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        View and manage topics across all academic subjects at once.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span>📌 {assignedTopics.length} Topics</span>
                      <span>👨‍🏫 {teachers.length} Faculty</span>
                    </div>
                    <div className="text-[11px] font-bold text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Manage All Topics →
                    </div>
                  </div>
                </div>

                {/* Individual Subject Square Cards */}
                {adminAvailableSubjects.map((subj) => (
                  <div
                    key={subj.name}
                    onClick={() => setSelectedSubjectAdminSyllabus(subj.name)}
                    className="group relative rounded-3xl p-5 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950 border border-slate-800 hover:border-amber-500/60 hover:scale-[1.02] cursor-pointer transition-all shadow-lg hover:shadow-amber-950/40 flex flex-col justify-between aspect-square min-h-[220px]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700 text-amber-300 flex items-center justify-center font-bold shadow-inner">
                          <BookOpen className="w-5 h-5 text-amber-400" />
                        </div>

                        {subj.pendingApprovalCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white animate-pulse shadow-sm shadow-purple-600/30">
                            🔔 {subj.pendingApprovalCount} Needs Review
                          </span>
                        ) : subj.revisionCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white shadow-sm">
                            ⚠️ {subj.revisionCount} Revision
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            {subj.department}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-black text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-2">
                          {subj.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {subj.department}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-800/80">
                      <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold text-slate-300">
                        <span className="truncate">📦 {subj.units.length || 1} Units</span>
                        <span className="truncate text-right">📌 {subj.topics.length} Topics</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 pt-0.5">
                        <span className="text-slate-400 font-normal">
                          👨‍🏫 {subj.teachers.size} Faculty
                        </span>
                        <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          Select Units ➔
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STEP 2: CHOOSE UNIT (SQUARE CARDS UI)                           */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {adminSyllabusViewMode === 'cards' && selectedSubjectAdminSyllabus && !selectedUnitAdminSyllabus && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>📦 Step 2: Choose Unit / Module</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {selectedSubjectAdminSyllabus === 'all' ? 'All Subjects' : selectedSubjectAdminSyllabus}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Click a unit card to open and manage its curriculum topics</p>
                </div>

                <button
                  onClick={() => setSelectedSubjectAdminSyllabus(null)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Subjects
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* "All Units in this Subject" Square Card */}
                <div
                  onClick={() => setSelectedUnitAdminSyllabus('all')}
                  className="group relative rounded-3xl p-5 bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-purple-950/40 border-2 border-amber-500/40 hover:border-amber-400 hover:scale-[1.02] cursor-pointer transition-all shadow-xl flex flex-col justify-between aspect-square min-h-[220px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold">
                        <Folder className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Full Subject
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-100 group-hover:text-amber-300 transition-colors">
                        All Units Combined
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        View and manage topics across all units in {selectedSubjectAdminSyllabus === 'all' ? 'the curriculum' : selectedSubjectAdminSyllabus}.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <div className="text-xs font-semibold text-slate-300">
                      📌 {adminAvailableUnitsForSubject.reduce((sum, u) => sum + u.topics.length, 0)} Topics in Total
                    </div>
                    <div className="text-[11px] font-bold text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Open All Units →
                    </div>
                  </div>
                </div>

                {/* Individual Unit Square Cards */}
                {adminAvailableUnitsForSubject.map((unit) => (
                  <div
                    key={unit.unitName}
                    onClick={() => setSelectedUnitAdminSyllabus(unit.unitName)}
                    className="group relative rounded-3xl p-5 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950 border border-slate-800 hover:border-amber-500/60 hover:scale-[1.02] cursor-pointer transition-all shadow-lg hover:shadow-amber-950/30 flex flex-col justify-between aspect-square min-h-[220px]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-black text-xs flex items-center gap-1.5 shadow-sm">
                          <Folder className="w-3.5 h-3.5 text-indigo-400" />
                          {unit.unitName}
                        </div>

                        {unit.pendingApprovalCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white animate-pulse shadow-sm">
                            🔔 {unit.pendingApprovalCount} Review
                          </span>
                        ) : unit.revisionCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            ⚠️ {unit.revisionCount}
                          </span>
                        ) : null}
                      </div>

                      <div className="pt-1">
                        <h4 className="text-base font-black text-slate-100 group-hover:text-amber-300 transition-colors">
                          {unit.unitName} Module
                        </h4>
                        <span className="text-xs text-slate-400 block mt-0.5 font-medium">
                          {unit.topics.length} Assigned Topic{unit.topics.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-400 truncate">
                        👨‍🏫 {Array.from(unit.teachers).join(', ') || 'No Faculty Assigned'}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 pt-0.5">
                        <span className="text-emerald-400">{unit.approvedCount} Approved</span>
                        <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          Open Unit Topics ➔
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STEP 3: TOPICS LIST FOR SELECTED UNIT / SUBJECT                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {(adminSyllabusViewMode === 'flat' || (selectedSubjectAdminSyllabus && selectedUnitAdminSyllabus)) && (
            <div className="space-y-5">
              {/* Faculty Filter Bar in Syllabus */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" /> Filter by Faculty:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTeacherAdminSyllabus('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedTeacherAdminSyllabus === 'all' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
                >
                  🌟 All Faculty ({assignedTopics.length})
                </button>
                {teachers.map((t) => {
                  const isSelected = selectedTeacherAdminSyllabus.toUpperCase() === t.teacherId.toUpperCase();
                  const count = assignedTopics.filter((top) => top.teacherId.toUpperCase() === t.teacherId.toUpperCase()).length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTeacherAdminSyllabus(isSelected ? 'all' : t.teacherId)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${isSelected ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 border border-amber-400' : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'}`}
                    >
                      <span>👨‍🏫 {t.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    onClick={() => setAdminTopicFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      adminTopicFilterTab === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({filteredAssignedTopics.length})
                  </button>

                  <button
                    onClick={() => setAdminTopicFilterTab('pending_approval')}
                    className={`px-3 py-1.5 rounded-lg transition-all font-bold flex items-center gap-1.5 ${
                      adminTopicFilterTab === 'pending_approval'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                    🔔 Awaiting Approval ({pendingApprovalTopics.length})
                  </button>

                  <button
                    onClick={() => setAdminTopicFilterTab('revision_requested')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      adminTopicFilterTab === 'revision_requested' ? 'bg-slate-800 text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚠️ Revision ({assignedTopics.filter((t) => t.subtopicsApprovalState === 'revision_requested').length})
                  </button>

                  <button
                    onClick={() => setAdminTopicFilterTab('approved')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      adminTopicFilterTab === 'approved' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ✓ Approved ({assignedTopics.filter((t) => t.subtopicsApprovalState === 'approved' && t.status !== 'completed').length})
                  </button>

                  <button
                    onClick={() => setAdminTopicFilterTab('completed')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      adminTopicFilterTab === 'completed' ? 'bg-slate-800 text-slate-200 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ✓ Delivered ({assignedTopics.filter((t) => t.status === 'completed').length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search topics by title, teacher..."
                    value={searchTopicQuery}
                    onChange={(e) => setSearchTopicQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Topics Grid */}
              {filteredAssignedTopics.length === 0 ? (
                <div className="p-16 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
                  <div className="text-4xl">📌</div>
                  <div className="font-bold text-slate-200 text-base">No Assigned Topics Found in this Selection</div>
                  <p className="text-xs text-slate-400">Click "📌 + Assign Topics" to add curriculum topics or choose another unit/subject.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssignedTopics.map((topic) => {
                    const targetTeacher = teachers.find((t) => t.teacherId === topic.teacherId);
                    const isCompleted = topic.status === 'completed';
                    const approvalState = topic.subtopicsApprovalState || 'pending_teacher_input';
                    const isApproved = approvalState === 'approved';
                    const isUnderReview = approvalState === 'pending_admin_approval';
                    const isRevision = approvalState === 'revision_requested';

                    return (
                      <div
                        key={topic.id}
                        className={`bg-slate-900 border rounded-3xl p-5 space-y-3.5 relative shadow-md flex flex-col justify-between ${
                          isCompleted
                            ? 'border-emerald-500/30'
                            : isUnderReview
                            ? 'border-purple-500/50 bg-purple-950/10'
                            : isApproved
                            ? 'border-emerald-500/30'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="truncate flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-slate-800 text-amber-400 border border-slate-700">
                                  {topic.unitNumber || 'UNIT 1'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-400">{topic.teacherId}</span>
                              </div>
                              <h4 className="font-bold text-sm text-slate-100 mt-1 truncate">{topic.topicTitle}</h4>
                              <p className="text-[11px] text-slate-400">{targetTeacher?.name || topic.teacherId} • {topic.subject}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveTopic(topic.id)}
                              className="text-slate-500 hover:text-red-400 text-xs p-1"
                              title="Delete Assigned Topic"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isCompleted ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ✓ Delivered On-Time
                              </span>
                            ) : isApproved ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Subtopics Approved
                              </span>
                            ) : isUnderReview ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 animate-pulse">
                                🔔 Subtopics Awaiting Approval
                              </span>
                            ) : isRevision ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                ⚠️ Revision Requested
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                ⏳ Waiting for Teacher Subtopics
                              </span>
                            )}
                          </div>

                          {/* Subtopics Sequence List */}
                          <div className="space-y-1.5">
                            <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                              <span className="flex items-center gap-1 text-slate-300">
                                <Layers className="w-3 h-3 text-purple-400" />
                                Subtopics Sequence ({topic.subtopics?.length || topic.proposedSubtopics?.length || 0}):
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenReviewModal(topic)}
                                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5 hover:underline"
                              >
                                <Edit3 className="w-2.5 h-2.5" /> Edit / Reorder
                              </button>
                            </div>

                            {(topic.subtopics && topic.subtopics.length > 0) || (topic.proposedSubtopics && topic.proposedSubtopics.length > 0) ? (
                              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                {(topic.subtopics && topic.subtopics.length > 0 ? topic.subtopics : topic.proposedSubtopics || []).map((st, idx) => (
                                  <div
                                    key={idx}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-200 font-medium flex items-center gap-2 group hover:border-purple-500/30 transition-colors"
                                  >
                                    <span className="font-mono font-extrabold text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 shrink-0">
                                      #{idx + 1}
                                    </span>
                                    <span className="truncate flex-1 flex items-center justify-between gap-2">
                                      <span className="truncate">{st}</span>
                                      {topic.subtopicItems?.find(item => item.name.trim().toLowerCase() === st.trim().toLowerCase())?.isApproved === false && (
                                        <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full shrink-0">
                                          pending approval
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic block py-1">
                                Teacher has not proposed subtopics yet
                              </span>
                            )}

                            {/* Approved Admin Guidelines / Comment */}
                            {topic.adminApprovalComment && (
                              <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 text-[11px] space-y-1">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> Approval Note:
                                  </span>
                                  <button
                                    onClick={() => handleOpenReviewModal(topic)}
                                    className="text-emerald-400/70 hover:text-emerald-300 underline font-normal lowercase"
                                  >
                                    edit
                                  </button>
                                </div>
                                <p className="text-slate-200 italic font-medium">"{topic.adminApprovalComment}"</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-950 space-y-2">
                          {/* Quick Actions */}
                          {isUnderReview && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenReviewModal(topic)}
                                className="flex-1 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Review &amp; Comment
                              </button>
                              <button
                                onClick={() => {
                                  const names = (topic.proposedSubtopics && topic.proposedSubtopics.length > 0)
                                    ? topic.proposedSubtopics
                                    : (topic.subtopics && topic.subtopics.length > 0)
                                    ? topic.subtopics
                                    : [];
                                  if (names.length === 0) {
                                    handleOpenReviewModal(topic);
                                    return;
                                  }
                                  const quickItems: SubtopicItem[] = names.map((name, idx) => ({
                                    id: `sub-qa-${idx}-${Date.now()}`,
                                    name: name.trim(),
                                    status: 'pending' as const,
                                  }));
                                  handleDirectApprove(topic.id, quickItems, '', topic.topicTitle);
                                }}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Quick Approve
                              </button>
                            </div>
                          )}

                          {isApproved && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenReviewModal(topic)}
                                className="flex-[2] py-2 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Manage Subtopics
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm("Change subtopics status back to 'Subtopics Needed' (Pending Teacher Input)?")) {
                                    StorageService.resetSubtopicsApprovalState(topic.id);
                                    refreshState();
                                  }
                                }}
                                className="flex-1 py-2 bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 transition-colors"
                                title="Require Teacher to Submit Subtopics"
                              >
                                Reset Status
                              </button>
                            </div>
                          )}

                          {!isUnderReview && !isApproved && !isCompleted && (
                            <button
                              onClick={() => handleOpenReviewModal(topic)}
                              className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Manage Subtopics
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
        </div>
      )}


      {/* ─── DEDICATED FACULTY TIME WALLETS & BACKLOG ACCOUNTING ─── */}
      {currentPage === 'admin_wallet' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  Faculty Time Wallets & Backlog Accounting
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Institutional Ledger
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Monitor banked faculty surplus minutes, inspect immutable audit trails, and offset historical late backlogs.
                </p>
              </div>
            </div>
          </div>

          {/* Institutional KPI Cards */}
          {(() => {
            let totalSurplusBanked = 0;
            let totalLateBacklog = 0;
            let totalTransfersApplied = 0;
            let teachersWithWallet = 0;

            teachers.forEach((t) => {
              const w = StorageService.getTimeWalletInfo(t.teacherId);
              const b = StorageService.getLateBacklogInfo(t.teacherId);
              totalSurplusBanked += w.balance;
              totalLateBacklog += b.remainingBacklogMinutes;
              totalTransfersApplied += w.totalAppliedToBacklog;
              if (w.balance > 0) teachersWithWallet += 1;
            });

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-indigo-900/50 bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-slate-900/60 p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Total Banked Surplus</div>
                  <div className="mt-2 text-3xl font-black text-indigo-200 font-mono">+{totalSurplusBanked} min</div>
                  <p className="mt-1 text-[11px] text-slate-400">Across {teachersWithWallet} faculty members with active balances.</p>
                </div>

                <div className="rounded-2xl border border-rose-900/40 bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-slate-900/60 p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Total Faculty Backlog</div>
                  <div className="mt-2 text-3xl font-black text-rose-300 font-mono">{totalLateBacklog} min</div>
                  <p className="mt-1 text-[11px] text-slate-400">Historical missed lecture quotas requiring extension.</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Offsets Transferred</div>
                  <div className="mt-2 text-2xl font-bold text-purple-400 font-mono">-{totalTransfersApplied} min</div>
                  <p className="mt-1 text-[11px] text-slate-400">Wallet balance applied directly to clear backlogs.</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Faculty Members</div>
                  <div className="mt-2 text-2xl font-bold text-slate-100 font-mono">{teachers.length} Active</div>
                  <p className="mt-1 text-[11px] text-slate-400">Academic staff monitored under quota tracking.</p>
                </div>
              </div>
            );
          })()}

          {/* Faculty Wallet Roster Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>👨‍🏫 Faculty Balances & Backlogs Matrix</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Live wallet reserves, unfulfilled historical quotas, and fast action triggers</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800/80 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Faculty Member</th>
                    <th className="px-3 py-3">Subject / Dept</th>
                    <th className="px-3 py-3">Daily Target</th>
                    <th className="px-3 py-3 text-indigo-400">Time Wallet</th>
                    <th className="px-3 py-3 text-slate-400">Raw Shortfall</th>
                    <th className="px-3 py-3 text-purple-400">Transferred</th>
                    <th className="px-3 py-3 text-rose-400">Net Late Backlog</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teachers.map((t) => {
                    const w = StorageService.getTimeWalletInfo(t.teacherId);
                    const b = StorageService.getLateBacklogInfo(t.teacherId);

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-200">
                          <div className="font-bold text-slate-100">{t.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{t.teacherId}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-400">{t.subject || t.department}</td>
                        <td className="px-3 py-3 text-slate-300 font-mono">{t.dailyTargetMinutes || 120}m</td>
                        <td className="px-3 py-3 font-mono font-bold text-indigo-300">
                          {w.balance > 0 ? `+${w.balance} min` : '0 min'}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-400">{b.rawHistoricalShortfall}m</td>
                        <td className="px-3 py-3 font-mono text-purple-400">-{w.totalAppliedToBacklog}m</td>
                        <td className="px-3 py-3 font-mono font-bold">
                          <span className={b.remainingBacklogMinutes > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {b.remainingBacklogMinutes > 0 ? `${b.remainingBacklogMinutes} min` : '✓ 0 min'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {w.balance > 0 && b.remainingBacklogMinutes > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const toApply = Math.min(w.balance, b.remainingBacklogMinutes);
                                  StorageService.applyWalletToBacklog(t.teacherId, toApply, 'Admin');
                                  setTeachers(StorageService.getTeachers());
                                  if (onRefreshData) onRefreshData();
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm cursor-pointer"
                              >
                                ⚡ Apply ({Math.min(w.balance, b.remainingBacklogMinutes)}m)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setAdminInspectDailyLogsTeacherId(t.teacherId)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-700/60"
                              title="Inspect Day-by-Day Recording and Backlog Logs"
                            >
                              📅 Daily Logs
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setExtTeacherId(t.teacherId);
                                const bk = StorageService.getTeacherExtensionBreakdown(t.teacherId);
                                setExtAllowedMinutes(bk.suggestedExtensionMinutes);
                                setExtTopicIds(bk.undeliveredTopics.map((top) => top.id));
                                setShowExtensionModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              ⏱️ Extension
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institutional Transaction Audit Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>📜 Institutional Wallet Transaction Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Complete record of surplus earnings and backlog offsets across all faculty</p>
              </div>
            </div>

            {(() => {
              const allTxs = StorageService.getWalletTransactions().sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );

              if (allTxs.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500 italic">
                    No transactions recorded yet across the institution.
                  </div>
                );
              }

              return (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {allTxs.map((tx) => {
                    const teacherObj = teachers.find((u) => u.teacherId.toUpperCase() === tx.teacherId.toUpperCase());
                    const name = teacherObj?.name || tx.teacherId;

                    return (
                      <div
                        key={tx.id}
                        className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                tx.type === 'deposit_surplus' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-purple-400 shadow-sm shadow-purple-400/50'
                              }`}
                            />
                            <span className="font-bold text-slate-100">{name} ({tx.teacherId})</span>
                            <span className="text-slate-500 font-mono text-[10px]">• {tx.date}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {tx.type === 'deposit_surplus' ? 'Surplus Earned' : 'Applied to Backlog'}
                            </span>
                            {tx.appliedBy && (
                              <span className="text-[10px] text-slate-500">
                                By {tx.appliedBy}
                              </span>
                            )}
                          </div>
                          {tx.note && <div className="text-[11px] text-slate-400">{tx.note}</div>}
                        </div>

                        <div
                          className={`text-sm font-mono font-black shrink-0 ${
                            tx.type === 'deposit_surplus' ? 'text-emerald-400' : 'text-purple-300'
                          }`}
                        >
                          {tx.type === 'deposit_surplus' ? `+${tx.amount}m` : `-${tx.amount}m`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}


      {/* PAGE 3: 👨‍🏫 FACULTY ROSTER & CREDENTIALS MANAGEMENT */}

      {/* ─── PAGE: 🏖️ FACULTY DAY OFFS & APPROVED LEAVES MANAGEMENT HUB ─── */}
      {currentPage === 'admin_leaves' && (() => {
        const todayKey = StorageService.toLocalDateKey(new Date());
        const yesterdayObj = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1);
        const yesterdayKey = StorageService.toLocalDateKey(yesterdayObj);
        const allGrants = StorageService.getDayOffGrants();
        const todayLeaves = allGrants.filter((g) => g.date === todayKey);
        const yesterdayLeaves = allGrants.filter((g) => g.date === yesterdayKey);
        const upcomingLeaves = allGrants.filter((g) => g.date > todayKey);

        return (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                    Faculty Day Offs & Approved Leaves Hub
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      0 min Target • No Backlog
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Grant official leaves for yesterday (retroactive backlog clearance), today, or upcoming schedules.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setDayOffTeacherId(teachers[0]?.teacherId || '');
                    setShowDayOffModal(true);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <span>🏖️</span> Grant New Day Off / Leave
                </button>
              </div>
            </div>

            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/50 via-slate-900/80 to-slate-900/60 p-5 relative overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>Excused Today</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">Active</span>
                </div>
                <div className="mt-2 text-3xl font-black text-emerald-200 font-mono">{todayLeaves.length} Faculty</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {todayLeaves.length > 0 ? todayLeaves.map((l) => l.teacherName).join(', ') : 'No faculty on leave today'}
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900/60 p-5 relative overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                  <span>Excused Yesterday</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">Retroactive</span>
                </div>
                <div className="mt-2 text-3xl font-black text-indigo-200 font-mono">{yesterdayLeaves.length} Faculty</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {yesterdayLeaves.length > 0 ? yesterdayLeaves.map((l) => l.teacherName).join(', ') : 'No retroactive leaves for yesterday'}
                </p>
              </div>

              <div className="rounded-2xl border border-purple-900/40 bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-900/60 p-5 relative overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
                  <span>Upcoming Leaves</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">Scheduled</span>
                </div>
                <div className="mt-2 text-3xl font-black text-purple-200 font-mono">{upcomingLeaves.length} Scheduled</div>
                <p className="mt-1 text-[11px] text-slate-400">Pre-approved upcoming leaves</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 relative overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Total Leaves Logged</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">All-time</span>
                </div>
                <div className="mt-2 text-3xl font-black text-slate-100 font-mono">{allGrants.length} Records</div>
                <p className="mt-1 text-[11px] text-slate-400">Complete institutional leave record</p>
              </div>
            </div>

            {/* Quick Grant Banner Card */}
            <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                  <span>💡 Need to clear yesterday&apos;s unfulfilled quota or excuse a teacher?</span>
                </h4>
                <p className="text-xs text-slate-300">
                  Granting a Day Off for yesterday immediately sets yesterday&apos;s required recording target to <strong>0 min</strong> and wipes out any shortfall/backlog debt!
                </p>
              </div>
              <button
                onClick={() => {
                  setDayOffTeacherId(teachers[0]?.teacherId || '');
                  setShowDayOffModal(true);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 shrink-0 cursor-pointer"
              >
                + Grant Day Off Now
              </button>
            </div>

            {/* Complete Leaves Roster */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                  <span>📋 Approved Faculty Leaves ({allGrants.length})</span>
                </h3>
              </div>

              {allGrants.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 italic bg-slate-950/50 rounded-2xl border border-slate-800/80">
                  No faculty leaves granted yet. Click &quot;Grant New Day Off / Leave&quot; above to excuse any teacher.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {allGrants.map((grant) => {
                    const isPast = grant.date < todayKey && grant.date !== yesterdayKey;
                    const isToday = grant.date === todayKey;
                    const isYesterday = grant.date === yesterdayKey;
                    const isUpcoming = grant.date > todayKey;

                    return (
                      <div key={grant.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-100 text-sm">{grant.teacherName}</span>
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                              {grant.teacherId}
                            </span>
                            {isYesterday ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Yesterday (Excused)
                              </span>
                            ) : isToday ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                                Today (Active Leave)
                              </span>
                            ) : isUpcoming ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Upcoming Scheduled
                              </span>
                            ) : isPast ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-800">
                                Past Leave
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-800">
                                Excused
                              </span>
                            )}
                          </div>

                          <div className="text-slate-300 text-xs flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                            <span className="text-emerald-400 font-mono font-bold">
                              📅 {grant.date}{grant.endDate ? ` to ${grant.endDate}` : ''}
                            </span>
                            <span>•</span>
                            <span>Category: <strong className="text-slate-200">{grant.reason}</strong></span>
                            {grant.notes && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400 italic">&quot;{grant.notes}&quot;</span>
                              </>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500">
                            Granted by {grant.grantedBy} on {new Date(grant.grantedAt).toLocaleString()}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            StorageService.revokeDayOff(grant.id);
                            setTeachers(StorageService.getTeachers());
                            if (onRefreshData) onRefreshData();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs transition-all self-start md:self-center cursor-pointer"
                        >
                          Revoke Leave
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {currentPage === 'admin_faculty' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Faculty Roster & Login Credentials ({teachers.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure teacher login usernames, reset passwords, adjust daily quotas, and onboard new faculty.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search faculty..."
                  value={searchTeacherQuery}
                  onChange={(e) => setSearchTeacherQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => {
                  const nextId = getNextTeacherId(teachers);
                  setNewTeacherId(nextId);
                  setNewUsername(`teacher_${nextId.replace('AEW-T-', '')}`);
                  setShowAddModal(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md shrink-0 flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" /> + Onboard Faculty
              </button>
            </div>
          </div>

          {filteredTeachers.length === 0 ? (
            <div className="p-16 text-center bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
              <div className="text-4xl">👨‍🏫</div>
              <div className="font-bold text-slate-200 text-base">No Faculty Found</div>
              <p className="text-xs text-slate-400">Click "+ Onboard Faculty" to register a new teacher.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredTeachers.map((t) => {
                return (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {t.teacherId}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-100 truncate mt-1">{t.name}</h4>
                          <p className="text-xs text-slate-400 truncate">{t.department}</p>
                          <p className="text-[11px] text-indigo-300/80 truncate mt-0.5">{t.subject}</p>
                        </div>

                        <button
                          onClick={() => handleRemoveTeacher(t.teacherId, t.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove Teacher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* CREDENTIALS BADGE */}
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1 font-medium">
                            <UserIcon className="w-3 h-3 text-indigo-400" /> Username:
                          </span>
                          <span className="font-mono font-bold text-slate-200">{t.username || t.teacherId.toLowerCase()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1 font-medium">
                            <Lock className="w-3 h-3 text-purple-400" /> Password:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-amber-400">
                              {visiblePasswords[t.teacherId] ? (t.password || 'teach123') : '••••••••'}
                            </span>
                            <button
                              onClick={() => setVisiblePasswords(prev => ({
                                ...prev,
                                [t.teacherId]: !prev[t.teacherId]
                              }))}
                              className="p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                              title={visiblePasswords[t.teacherId] ? "Hide password" : "Show password"}
                            >
                              {visiblePasswords[t.teacherId] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* DAILY RECORDING TARGET (MINUTES) */}
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Daily Min Target:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateTargetMinutes(t.teacherId, -15)}
                              className="px-1.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 text-xs flex items-center justify-center"
                              title="Decrease by 15 mins"
                            >
                              -15m
                            </button>
                            <span className="font-mono font-black text-amber-400 text-xs px-1">
                              {t.dailyTargetMinutes || 120} min
                            </span>
                            <button
                              onClick={() => handleUpdateTargetMinutes(t.teacherId, 15)}
                              className="px-1.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 text-xs flex items-center justify-center"
                              title="Increase by 15 mins"
                            >
                              +15m
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/60">
                          <span className="text-slate-400 font-medium">Daily Max Limit:</span>
                          <span className="font-mono font-black text-indigo-300 text-xs">
                            {t.maxDailyMinutes || (t.dailyTargetMinutes ? t.dailyTargetMinutes * 2 : 240)} min
                          </span>
                        </div>

                        {(() => {
                          const backlog = StorageService.getPreviousDayBacklog(t.teacherId);
                          const recorded = StorageService.getMinutesRecordedToday(t.teacherId);
                          const target = t.dailyTargetMinutes || 120;
                          const isMet = recorded >= target;

                          return (
                            <div className="space-y-0.5 pt-1 border-t border-slate-800/80">
                              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                                <span>Recorded Today:</span>
                                <span className={isMet ? 'text-emerald-400 font-bold' : 'text-slate-300 font-bold'}>
                                  {recorded} / {target} min {isMet ? '✓' : ''}
                                </span>
                              </div>
                              {!backlog.isYesterdayFulfilled && (
                                <div className="text-[10px] text-amber-400 font-bold">
                                  ⚠️ Yesterday incomplete ({backlog.yesterdayUnfulfilledMinutes}m)
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* PERMANENT DAILY UPLOAD CUTOFF TIME */}
                      {(() => {
                        const cutoff = t.dailyUploadCutoffTime || StorageService.getDailyCommitment(t.teacherId)?.promisedTime;
                        const formatTime = (time24?: string) => {
                          if (!time24) return '';
                          const [hours, minutes] = time24.split(':').map(Number);
                          const period = hours >= 12 ? 'PM' : 'AM';
                          const formattedHours = hours % 12 || 12;
                          const formattedMinutes = String(minutes).padStart(2, '0');
                          return `${formattedHours}:${formattedMinutes} ${period}`;
                        };

                        return (
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Daily Cutoff:</span>
                            <span className="font-mono font-bold text-amber-400">
                              {cutoff ? formatTime(cutoff) : 'Pending 1st Login'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <button
                      onClick={() => handleOpenEditTeacher(t)}
                      className="w-full py-2 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Key className="w-3.5 h-3.5" /> Edit Password & Profile
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PAGE 4: 📚 SUBJECT REFERENCE LIBRARY MANAGER */}
      {currentPage === 'admin_resources' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-emerald-400" /> Whole-Subject Reference Materials ({subjectReferences.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Attach Google Drive folders, syllabus outlines, and textbook links to whole subjects for all faculty members.
              </p>
            </div>

            <button
              onClick={() => {
                setRefSubjectName(availableSubjects[0] || '');
                setShowSubjectRefModal(true);
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 shrink-0"
            >
              <FolderPlus className="w-4 h-4" /> + Attach Subject Material
            </button>
          </div>

          {subjectReferences.length === 0 ? (
            <div className="p-16 text-center bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
              <div className="text-4xl">📚</div>
              <div className="font-bold text-slate-200 text-base">No Subject Resources Configured Yet</div>
              <p className="text-xs text-slate-400">Click "+ Attach Subject Material" to link Google Drive course folders to subjects.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subjectReferences.map((sref) => (
                <div key={sref.id} className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-3 flex flex-col justify-between shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {sref.subjectName}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-100 mt-1">{sref.title}</h4>
                        <p className="text-[11px] text-slate-400">{sref.department}</p>
                      </div>

                      <button
                        onClick={() => handleRemoveSubjectRef(sref.id)}
                        className="text-slate-500 hover:text-red-400 text-xs p-1"
                        title="Remove Reference Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {sref.notes && (
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300 italic">
                        "{sref.notes}"
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-900">
                    <a
                      href={sref.referenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <BookMarked className="w-3.5 h-3.5" /> Open Google Drive Material ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAGE 5: 🎬 LECTURE SUBMISSIONS & DIRECTIVES AUDIT (ORGANIZED BY TEACHER & UNITWISE) */}
      {currentPage === 'admin_lectures' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          
          {/* HEADER & GLOBAL STATS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
                <Video className="w-6 h-6 text-purple-400" />
                Faculty Lecture Directory & Quality Audits
              </h2>
              <p className="text-xs text-slate-400">
                All submitted sessions organized by Faculty and Unit with real-time directives & teacher acknowledgments.
              </p>
            </div>

            {/* Quick Metrics Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-300 font-semibold flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                <strong>{lectures.length}</strong> Total Lectures
              </span>
              <span className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <strong>
                  {Math.floor(lectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0) / 60)}h {lectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0) % 60}m
                </strong> ({lectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0)}m Total)
              </span>
              <span className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-300 font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <strong>{teachers.length}</strong> Faculty Members
              </span>
            </div>
          </div>

          {/* SEARCH & DUAL FILTER CONTROLS */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by lecture title, topic, subtopic, faculty name, or unit..."
                  value={searchLectureQuery}
                  onChange={(e) => setSearchLectureQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 shadow-inner"
                />
                {searchLectureQuery && (
                  <button 
                    onClick={() => setSearchLectureQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {(selectedTeacherLectureFilter !== 'all' || selectedUnitLectureFilter !== 'all' || searchLectureQuery) && (
                <button
                  onClick={() => {
                    setSelectedTeacherLectureFilter('all');
                    setSelectedUnitLectureFilter('all');
                    setSearchLectureQuery('');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Reset Filters
                </button>
              )}
            </div>

            {/* 1. TEACHER FILTER BAR */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3 h-3 text-indigo-400" />
                Filter by Faculty Member:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedTeacherLectureFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTeacherLectureFilter === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>🌟 All Faculty</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
                    {lectures.length}
                  </span>
                </button>

                {teachers.map((t) => {
                  const tLecs = lectures.filter((l) => l.teacherId.toUpperCase() === t.teacherId.toUpperCase());
                  const isSelected = selectedTeacherLectureFilter.toUpperCase() === t.teacherId.toUpperCase();

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeacherLectureFilter(isSelected ? 'all' : t.teacherId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 border border-amber-400'
                          : 'bg-slate-950/80 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>👨‍🏫 {t.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {tLecs.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. UNIT FILTER BAR */}
            {allAvailableUnits.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3 h-3 text-amber-400" />
                  Filter by Unit / Module:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedUnitLectureFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedUnitLectureFilter === 'all'
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    All Units
                  </button>

                  {allAvailableUnits.map((unit) => {
                    const isSelected = selectedUnitLectureFilter === unit;
                    return (
                      <button
                        key={unit}
                        onClick={() => setSelectedUnitLectureFilter(isSelected ? 'all' : unit)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                            : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        <span>📦 {unit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* TEACHER-GROUPED & UNITWISE LECTURES LIST */}
          {teacherOrganizedLectures.length === 0 ? (
            <div className="p-16 text-center bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
              <div className="text-4xl">📂</div>
              <div className="font-bold text-slate-200 text-base">No Lecture Submissions Matching Filters</div>
              <p className="text-xs text-slate-400">Try clearing the search query or teacher/unit filter to view all lectures.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {teacherOrganizedLectures.map((teacherGroup) => {
                const isCollapsed = collapsedTeacherIds.has(teacherGroup.teacherId.toUpperCase());

                return (
                  <div 
                    key={teacherGroup.teacherId} 
                    className="bg-slate-950/70 border-2 border-slate-800/90 rounded-3xl overflow-hidden shadow-xl transition-all"
                  >
                    {/* TEACHER ACCORDION HEADER BANNER */}
                    <div 
                      onClick={() => toggleCollapseTeacher(teacherGroup.teacherId.toUpperCase())}
                      className="p-5 md:p-6 bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/30 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-indigo-950/40 shrink-0">
                          👨‍🏫
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-base md:text-lg font-black text-slate-100 tracking-tight">
                              {teacherGroup.teacherName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {teacherGroup.teacherId}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs font-semibold text-amber-400">
                              {teacherGroup.subject}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{teacherGroup.department}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-slate-200">
                            📹 {teacherGroup.totalLectures} Lectures
                          </span>
                          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-amber-300">
                            ⏱️ {teacherGroup.totalDuration}m ({Math.floor(teacherGroup.totalDuration / 60)}h {teacherGroup.totalDuration % 60}m)
                          </span>
                          <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 font-bold">
                            📦 {teacherGroup.units.length} Units Active
                          </span>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 shrink-0">
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* TEACHER CONTENT: UNIT-WISE BREAKDOWN */}
                    {!isCollapsed && (
                      <div className="p-5 md:p-6 space-y-6">
                        {teacherGroup.units.length === 0 ? (
                          <div className="p-8 text-center bg-slate-900/40 border border-slate-800/60 rounded-2xl text-slate-400 text-xs italic">
                            No lecture sessions delivered yet by {teacherGroup.teacherName}.
                          </div>
                        ) : (
                          teacherGroup.units.map((unitGroup) => (
                            <div 
                              key={unitGroup.unitName} 
                              className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-md space-y-4 p-4 md:p-5"
                            >
                              {/* UNIT HEADER RIBBON */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                                <div className="flex items-center gap-2.5">
                                  <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                                    <Folder className="w-3.5 h-3.5 text-indigo-400" />
                                    {unitGroup.unitName}
                                  </div>
                                  <span className="text-xs font-bold text-slate-200">
                                    {unitGroup.lectures.length} {unitGroup.lectures.length === 1 ? 'Lecture' : 'Lectures'} Delivered
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                    <span>Unit Duration:</span>
                                    <strong className="text-amber-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                      {unitGroup.totalDuration} min ({Math.round((unitGroup.totalDuration / 60) * 10) / 10} hrs)
                                    </strong>
                                  </div>

                                  <button
                                    onClick={() => onPageChange('thumbnail_generator')}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" /> Unit Thumbnails & ZIP
                                  </button>
                                </div>
                              </div>

                              {/* LECTURES IN THIS UNIT */}
                              <div className="space-y-3.5">
                                {unitGroup.lectures.map((lec) => (
                                  <div 
                                    key={lec.id} 
                                    className="bg-slate-950/90 border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-4 md:p-5 space-y-3.5 transition-all shadow-sm"
                                  >
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                      <div className="space-y-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            {unitGroup.unitName}
                                          </span>
                                          <span className="font-bold text-amber-400">
                                            ⏱️ {lec.durationMinutes || 45} min
                                          </span>
                                          <span className="text-slate-600">•</span>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            lec.status === 'on_time'
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          }`}>
                                            {lec.status === 'on_time' ? '✓ On-Time Submission' : '⚠️ Late Submission'}
                                          </span>
                                          <span className="text-slate-600">•</span>
                                          <span className="text-[10px] text-slate-500 font-mono">
                                            {new Date(lec.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>

                                        <h4 className="text-base font-extrabold text-slate-100">{lec.title}</h4>

                                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                                          <span className="font-semibold text-slate-300">Topic: {lec.primaryTopic}</span>
                                          {lec.subtopics && lec.subtopics.length > 0 && (
                                            <>
                                              <span className="text-slate-600">•</span>
                                              {lec.subtopics.map((st, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                                                  #{st}
                                                </span>
                                              ))}
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                                        <button
                                          onClick={() => onPageChange('thumbnail_generator')}
                                          className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/25 flex items-center gap-1.5 transition-colors shadow-sm"
                                        >
                                          <ImageIcon className="w-3.5 h-3.5" /> 16:9 Thumbnail
                                        </button>

                                        {lec.notesUrl && (
                                          <a
                                            href={lec.notesUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs hover:bg-emerald-600/30 flex items-center gap-1.5 transition-colors"
                                          >
                                            <FileText className="w-3.5 h-3.5" /> Notes PDF
                                          </a>
                                        )}

                                        <button
                                          onClick={() => setSelectedLectureForPreview(lec)}
                                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> Inspect Video
                                        </button>

                                        <button
                                          onClick={() => {
                                            setRemarkingLectureId(remarkingLectureId === lec.id ? null : lec.id);
                                            setRemarkInput('');
                                          }}
                                          className="px-3.5 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold text-xs hover:bg-purple-600/30 flex items-center gap-1.5 transition-colors"
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" /> Write Directive
                                        </button>
                                      </div>
                                    </div>

                                    {/* Inline Write Directive Form */}
                                    {remarkingLectureId === lec.id && (
                                      <div className="p-4 bg-purple-950/30 border border-purple-500/40 rounded-2xl space-y-3 text-xs shadow-inner">
                                        <div className="font-bold text-purple-200">
                                          Post Directive / Quality Remark for {lec.teacherName}:
                                        </div>
                                        <textarea
                                          rows={2}
                                          placeholder="e.g. Solve 2 additional numerical problems on this unit topic in the next session."
                                          value={remarkInput}
                                          onChange={(e) => setRemarkInput(e.target.value)}
                                          className="w-full bg-slate-950 border border-purple-500/40 rounded-xl p-3 text-slate-100 focus:outline-none"
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() => setRemarkingLectureId(null)}
                                            className="px-4 py-1.5 text-slate-400 hover:text-slate-200"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleSendAdminRemark(lec.id)}
                                            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md"
                                          >
                                            Post Directive
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Posted Admin Directives with Teacher Acknowledgment Status */}
                                    {lec.adminRemarks && lec.adminRemarks.length > 0 && (
                                      <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                                            💬 Posted Admin Directives ({lec.adminRemarks.length}):
                                          </span>
                                          {lec.adminRemarks.some((r) => r.isAcknowledged) && (
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                              {lec.adminRemarks.filter((r) => r.isAcknowledged).length} Acknowledged
                                            </span>
                                          )}
                                        </div>

                                        <div className="space-y-2">
                                          {lec.adminRemarks.map((rem) => (
                                            <div 
                                              key={rem.id} 
                                              className={`text-xs p-3.5 rounded-xl border space-y-2 transition-all ${
                                                rem.isAcknowledged 
                                                  ? 'bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-slate-900/40 border-emerald-500/30 shadow-sm' 
                                                  : 'bg-purple-950/20 border-purple-500/30'
                                              }`}
                                            >
                                              <div className="text-slate-200 italic font-medium leading-relaxed">
                                                "{rem.remarkText}"
                                              </div>

                                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                                                <span className="text-slate-400 font-normal">
                                                  Posted by <strong className="text-slate-300">{rem.adminName}</strong>
                                                </span>

                                                {rem.isAcknowledged ? (
                                                  <span className="font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                    ✓ Acknowledged by {rem.acknowledgedByName || lec.teacherName} {rem.acknowledgedAt ? `on ${new Date(rem.acknowledgedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                                                  </span>
                                                ) : (
                                                  <span className="font-semibold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-amber-400" />
                                                    ⏳ Pending Teacher Acknowledgment
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADMIN REVIEWS & MANAGES SUBTOPICS */}
      {reviewingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Review & Manage Subtopics
                </h3>
                <p className="text-xs text-slate-400">{reviewingTopic.teacherId} • {reviewingTopic.subject}</p>
              </div>
              <button onClick={() => setReviewingTopic(null)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>

            <div className="p-4 bg-slate-950 border border-purple-500/20 rounded-2xl space-y-1">
              <input
                type="text"
                value={reviewTopicTitleInput}
                onChange={(e) => setReviewTopicTitleInput(e.target.value)}
                className="w-full bg-transparent font-extrabold text-sm text-slate-100 focus:outline-none focus:border-b focus:border-purple-500 pb-1"
                placeholder="Topic Title"
              />
              <p className="text-xs text-slate-400">Faculty pace their recording deliveries using daily recording targets and upload cutoff timers.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold">
                  Subtopics List:
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type subtopic name & click + Add"
                    value={reviewSubtopicInput}
                    onChange={(e) => setReviewSubtopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddReviewItem();
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddReviewItem}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                  >
                    + Add
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Subtopics Sequence & Order:</span>
                  <span className="text-[10px] text-purple-300">▲/▼ Reorder • Type in box to rename</span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl max-h-80 overflow-y-auto space-y-2.5">
                  {reviewSubtopicItems.length === 0 ? (
                    <div className="text-slate-500 text-center italic py-4">No subtopics in list. Add some above.</div>
                  ) : (
                    reviewSubtopicItems.map((st, i) => (
                      <div
                        key={st.id || i}
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 flex items-center justify-between gap-2.5 text-xs transition-all shadow-sm"
                      >
                        {/* Sequence Number / Reorder Dropdown */}
                        <div className="flex items-center gap-1 shrink-0 relative">
                          <select
                            value={i + 1}
                            onChange={(e) => handleJumpSubtopic(i, parseInt(e.target.value, 10) - 1)}
                            className="appearance-none font-mono font-extrabold text-[11px] text-purple-300 bg-purple-950/80 px-2 py-1 pr-4 rounded-md border border-purple-500/40 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                            title="Click to jump to another position"
                          >
                            {reviewSubtopicItems.map((_, idx) => (
                              <option key={idx} value={idx + 1}>#{idx + 1}</option>
                            ))}
                          </select>
                          <div className="absolute right-1 pointer-events-none text-purple-400 opacity-60">
                            <ChevronDown className="w-2.5 h-2.5" />
                          </div>
                        </div>

                        {/* Direct Editable Subtopic Name Input */}
                        <input
                          type="text"
                          value={st.name}
                          onChange={(e) => handleUpdateSubtopicName(i, e.target.value)}
                          placeholder={`Subtopic #${i + 1} title...`}
                          className="flex-1 bg-slate-950/90 border border-slate-700/80 focus:border-purple-400 rounded-lg px-3 py-1.5 text-slate-100 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors"
                        />

                        {/* Action Controls: Move Up, Move Down, Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => handleMoveSubtopicUp(i)}
                            className="p-1.5 text-slate-300 hover:text-purple-200 hover:bg-purple-600/30 border border-slate-700 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all cursor-pointer disabled:cursor-not-allowed"
                            title="Move Up in Sequence"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={i === reviewSubtopicItems.length - 1}
                            onClick={() => handleMoveSubtopicDown(i)}
                            className="p-1.5 text-slate-300 hover:text-purple-200 hover:bg-purple-600/30 border border-slate-700 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all cursor-pointer disabled:cursor-not-allowed"
                            title="Move Down in Sequence"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveReviewItem(i)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/20 border border-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Delete Subtopic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Revision Feedback Section */}
              {showRevisionInput ? (
                <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl space-y-2">
                  <label className="block text-red-300 font-bold text-xs">
                    Feedback / Revision Instructions for Teacher:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please add 2 more subtopics on dynamic programming optimization techniques."
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    className="w-full bg-slate-950 border border-red-500/40 rounded-xl p-2.5 text-slate-100 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRevisionInput(false)}
                      className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestRevisionSubmit}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl"
                    >
                      Send Revision Request
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Optional Approval Note / Guidelines for Teacher */}
              {!showRevisionInput && (
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2">
                  <label className="block text-emerald-300 font-bold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      Approval Note / Guidelines for Teacher (Optional):
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-normal">Sent to faculty upon approval</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Approved! Please cover the 2024 university numerical problem in subtopic #2."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl p-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-400 placeholder:text-slate-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {!showRevisionInput && reviewingTopic.subtopicsApprovalState === 'pending_admin_approval' && (
                  <button
                    type="button"
                    onClick={() => setShowRevisionInput(true)}
                    className="px-3.5 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl font-bold transition-colors"
                  >
                    ⚠️ Request Changes
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setReviewingTopic(null)}
                    className="px-4 py-2 text-slate-400 hover:text-slate-200 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveClick}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {reviewingTopic.subtopicsApprovalState === 'approved'
                      ? (approvalComment.trim() ? 'Save Changes with Note ✓' : 'Save Sequence & Changes ✓')
                      : reviewSubtopicItems.length === 0
                      ? 'Save Title & Changes ✓'
                      : (approvalComment.trim() ? 'Approve with Comment ✓' : 'Approve & Save Subtopics')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ONBOARD NEW TEACHER WITH CUSTOM USERNAME & PASSWORD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-100">Onboard Faculty & Set Credentials</h3>
                <p className="text-xs text-slate-400">Create user account with custom username and password</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>

            <form onSubmit={handleAddTeacherSubmit} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div className="font-bold text-slate-200 text-xs">1. Profile Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Teacher Unique ID *</label>
                    <input
                      type="text"
                      value={newTeacherId}
                      onChange={(e) => setNewTeacherId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 font-mono uppercase focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Harish Mehta"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                {/* USERNAME & PASSWORD */}
                <div className="p-3.5 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-3">
                  <div className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" /> 2. Login Credentials Configuration
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Login Username *</label>
                      <input
                        type="text"
                        placeholder="e.g. harish_mehta"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Login Password *</label>
                      <input
                        type="text"
                        placeholder="e.g. teach123"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Civil Engineering"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Primary Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Structural Analysis"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. harish.civil@aew.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Daily Min Target (Minutes)</label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={newTargetMinutes}
                      onChange={(e) => setNewTargetMinutes(parseInt(e.target.value) || 120)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Daily Max Limit (Minutes)</label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={newMaxDailyMinutes}
                      onChange={(e) => setNewMaxDailyMinutes(parseInt(e.target.value) || 240)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-md"
                >
                  Onboard Faculty & Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT TEACHER CREDENTIALS & PASSWORD */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-100">Edit Login Credentials & Password</h3>
                <p className="text-xs text-slate-400">{editingTeacher.name} ({editingTeacher.teacherId})</p>
              </div>
              <button onClick={() => setEditingTeacher(null)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>

            <form onSubmit={handleSaveEditTeacher} className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-3">
                <div className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" /> Login Credentials
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Username *</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Password *</label>
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {showEditPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showEditPassword ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Faculty Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Primary Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Daily Min Target (Minutes)</label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={editTargetMinutes}
                      onChange={(e) => setEditTargetMinutes(parseInt(e.target.value) || 120)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Daily Max Limit (Minutes)</label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={editMaxDailyMinutes}
                      onChange={(e) => setEditMaxDailyMinutes(parseInt(e.target.value) || 240)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none"
                    />
                  </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl shadow-md"
                >
                  Save New Password & Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADMIN ASSIGNS TOPICS (COMMA-SEPARATED SUPPORT) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Assign Syllabus Topics (Single or Bulk)
                </h3>
                <p className="text-xs text-slate-400">Enter one topic or multiple topics separated by commas</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>

            <form onSubmit={handleAssignTopicSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Assign to Faculty Member *</span>
                    <span className="text-[10px] text-amber-300 font-normal">Click a teacher below to select</span>
                  </label>
                  <select
                    value={assignTeacherId}
                    onChange={(e) => setAssignTeacherId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    required
                  >
                    {!assignTeacherId && <option value="">-- Click to Choose Faculty --</option>}
                    {teachers.map((t) => (
                      <option key={t.id} value={t.teacherId}>
                        {t.name} ({t.teacherId}) - {t.subject}
                      </option>
                    ))}
                  </select>

                  {/* Interactive One-Click Faculty Chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {teachers.map((t) => {
                      const isSelected = (assignTeacherId || '').toUpperCase() === t.teacherId.toUpperCase();
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAssignTeacherId(t.teacherId)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isSelected ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400 font-black' : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-amber-500/50'}`}
                        >
                          <span>👨‍🏫 {t.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                            {t.subject || t.teacherId}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Unit *</label>
                  <select
                    value={assignUnitNumber}
                    onChange={(e) => setAssignUnitNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="UNIT 1">UNIT 1</option>
                    <option value="UNIT 2">UNIT 2</option>
                    <option value="UNIT 3">UNIT 3</option>
                    <option value="UNIT 4">UNIT 4</option>
                    <option value="UNIT 5">UNIT 5</option>
                    <option value="UNIT 6">UNIT 6</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Primary Topics (Separate multiple with commas) *
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {parsedTopicList.length} topic{parsedTopicList.length === 1 ? '' : 's'} detected
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="e.g. Dynamic Programming, Graph Algorithms, Greedy Strategies, Segment Trees"
                  value={assignTopicInput}
                  onChange={(e) => setAssignTopicInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-amber-500 shadow-inner leading-relaxed"
                  required
                />

                {parsedTopicList.length > 1 && (
                  <div className="mt-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Will create {parsedTopicList.length} individual assigned topics:
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {parsedTopicList.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-medium">
                          {idx + 1}. {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="normal">Normal</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Guidelines / Directive for Teacher</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please solve minimum 3 practical numericals in these lectures."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={parsedTopicList.length === 0}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {parsedTopicList.length > 1
                    ? `Assign ${parsedTopicList.length} Topics to Faculty`
                    : 'Assign Topic to Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LATE LECTURE EXTENSIONS */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Manage Late Lecture Extensions
                </h3>
                <p className="text-xs text-slate-400">Grant temporary access to record and upload late lectures beyond daily limit</p>
              </div>
              <button onClick={() => { setShowExtensionModal(false); onPageChange('admin_dashboard'); }} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>

            {/* List of Active Extensions */}
            <div className="space-y-2">
              <span className="text-slate-300 font-bold block text-xs">Active & Recent Extensions ({StorageService.getExtensions().length})</span>
              {StorageService.getExtensions().length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-4 bg-slate-950/40 rounded-2xl border border-slate-800/80 text-center">
                  No active late lecture extensions found.
                </p>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                  {StorageService.getExtensions().map((ext) => {
                    const teacher = teachers.find((t) => t.teacherId === ext.teacherId);
                    const topicNames = ext.assignedTopicIds && ext.assignedTopicIds.length > 0
                      ? ext.assignedTopicIds.map((id) => assignedTopics.find((t) => t.id === id)?.topicTitle || id).join(', ')
                      : 'All Assigned Topics';

                    const nowMs = Date.now();
                    const isExpired = new Date(ext.endWindow).getTime() < nowMs;
                    const isDepleted = (ext.usedMinutes || 0) >= (ext.allowedMinutes || 0);
                    const isActive = !isExpired && !isDepleted;

                    return (
                      <div key={ext.id} className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-start justify-between gap-3 text-[11px]">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-200">{teacher?.name || ext.teacherId}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isActive 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : isDepleted 
                                ? 'bg-slate-800 border-slate-700 text-slate-400'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                              {isActive ? '● Active' : isDepleted ? '● Fully Utilized' : '● Expired'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              Marked as Late
                            </span>
                          </div>
                          <div className="text-purple-300 font-medium text-[11px]">
                            Topics: {topicNames}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Window: <strong className="text-slate-300 font-mono">{new Date(ext.startWindow).toLocaleString()} — {new Date(ext.endWindow).toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-[10px] text-slate-400">
                              Capacity: <strong className="text-indigo-300">{ext.usedMinutes} / {ext.allowedMinutes} min</strong> ({Math.max(0, ext.allowedMinutes - ext.usedMinutes)}m left)
                            </span>
                            <div className="flex-1 max-w-32 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                              <div 
                                className="bg-purple-500 h-full rounded-full transition-all" 
                                style={{ width: `${Math.min(100, Math.round(((ext.usedMinutes || 0) / Math.max(1, ext.allowedMinutes)) * 100))}%` }}
                              />
                            </div>
                          </div>
                          {ext.notes && <span className="text-slate-500 italic block text-[10px]">Reason: "{ext.notes}"</span>}
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Revoke/delete this late lecture extension?')) {
                              StorageService.deleteExtension(ext.id);
                              refreshState();
                            }
                          }}
                          className="text-red-400 hover:text-red-300 font-bold px-2.5 py-1 bg-red-950/30 border border-red-500/20 hover:border-red-500/40 rounded-lg text-[10px] transition-colors shrink-0"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form to Add New Extension */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!extTeacherId) return;
                if (!extStartWindow || !extEndWindow) {
                  alert('Please set start and end date/time window.');
                  return;
                }
                StorageService.addExtension({
                  teacherId: extTeacherId,
                  assignedTopicIds: extTopicIds,
                  startWindow: new Date(extStartWindow).toISOString(),
                  endWindow: new Date(extEndWindow).toISOString(),
                  allowedMinutes: extAllowedMinutes,
                  notes: extNotes.trim() || undefined,
                });
                setExtNotes('');
                setExtTopicIds([]);
                refreshState();
              }}
              className="space-y-4 text-xs pt-4 border-t border-slate-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-extrabold block text-xs">Create New Extension Window</span>
                <span className="text-[10px] text-amber-400 font-medium">⚡ Uploads will count as Late Submission</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Select Faculty Member *</span>
                    <span className="text-[10px] text-purple-300 font-normal">Click a teacher below to select</span>
                  </label>
                  <select
                    value={extTeacherId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setExtTeacherId(selectedId);
                      const breakdown = StorageService.getTeacherExtensionBreakdown(selectedId);
                      setExtAllowedMinutes(breakdown.suggestedExtensionMinutes);
                      setExtTopicIds(breakdown.undeliveredTopics.map((t) => t.id));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500 font-medium"
                    required
                  >
                    {!extTeacherId && <option value="">-- Choose Faculty Member --</option>}
                    {teachers.map((t) => (
                      <option key={t.id} value={t.teacherId}>
                        {t.name} ({t.teacherId}) - {t.subject}
                      </option>
                    ))}
                  </select>

                  {/* Interactive Faculty Selection Chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {teachers.map((t) => {
                      const isSelected = (extTeacherId || '').toUpperCase() === t.teacherId.toUpperCase();
                      const bk = StorageService.getTeacherExtensionBreakdown(t.teacherId);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setExtTeacherId(t.teacherId);
                            setExtAllowedMinutes(bk.suggestedExtensionMinutes);
                            setExtTopicIds(bk.undeliveredTopics.map((top) => top.id));
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isSelected ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400 font-black' : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-purple-500/50'}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>👨‍🏫 {t.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${isSelected ? 'bg-purple-900 text-purple-200' : 'bg-slate-800 text-slate-400'}`}>
                            {t.teacherId}
                          </span>
                          {bk.undeliveredTopics.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-slate-950 font-black">
                              {bk.undeliveredTopics.length} pending
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Additional Allowed Recording Minutes *</label>
                  <input
                    type="number"
                    min={15}
                    max={720}
                    step={15}
                    value={extAllowedMinutes}
                    onChange={(e) => setExtAllowedMinutes(parseInt(e.target.value) || 60)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Comprehensive Live Undelivered Lectures & Missing Time Breakdown */}
              {extBreakdown && (
                <div className="bg-slate-950/90 border border-purple-800/40 rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400 font-extrabold text-xs">📊 Auto-Calculation</span>
                      <span className="text-slate-200 font-bold text-xs">
                        {extBreakdown.undeliveredTopicsCount > 0
                          ? `${extBreakdown.undeliveredTopicsCount} Lecture${extBreakdown.undeliveredTopicsCount > 1 ? 's' : ''} Not Delivered`
                          : 'All Assigned Lectures Delivered'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Cutoff: <strong className="text-slate-200 font-mono">{extBreakdown.cutoffDisplay}</strong> {extBreakdown.isPassedCutoff ? '(Closed)' : '(Active)'}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold font-mono border ${
                        extBreakdown.totalTimeBacklogMinutes > 0
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}>
                        {extBreakdown.totalTimeBacklogMinutes > 0 ? `${extBreakdown.totalTimeBacklogMinutes}m Time Backlog` : 'Target Fulfilled'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Today's Target</div>
                      <div className="font-bold text-slate-100 font-mono text-sm mt-0.5">{extBreakdown.dailyTargetMinutes}m</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Recorded: <strong className="text-emerald-400">{extBreakdown.minutesRecordedToday}m</strong></div>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Today's Work</div>
                      <div className={`font-bold font-mono text-sm mt-0.5 ${extBreakdown.todayUndeliveredMinutes > 0 ? (extBreakdown.isPassedCutoff ? 'text-rose-400' : 'text-amber-400') : 'text-emerald-400'}`}>
                        {extBreakdown.todayUndeliveredMinutes}m
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{extBreakdown.todayUndeliveredMinutes > 0 ? (extBreakdown.isPassedCutoff ? 'Overdue cutoff' : 'In progress') : 'Target fulfilled'}</div>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Historical Backlog</div>
                      <div className={`font-bold font-mono text-sm mt-0.5 ${extBreakdown.pastUndeliveredMinutes > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {extBreakdown.pastUndeliveredMinutes}m
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{extBreakdown.pastSessionsMissedCount > 0 ? `${extBreakdown.pastSessionsMissedCount} missed day(s)` : '0 past deficit'}</div>
                    </div>
                    <div className="bg-purple-950/30 p-2.5 rounded-xl border border-purple-800/50">
                      <div className="text-purple-300 text-[10px] uppercase tracking-wider font-semibold">Suggested Extension</div>
                      <div className="font-bold text-purple-200 font-mono text-sm mt-0.5">{extBreakdown.suggestedExtensionMinutes}m</div>
                      <div className="text-[10px] text-purple-400/80 mt-0.5">Exact required quota</div>
                    </div>
                  </div>

                  {extBreakdown.timeWalletBalance > 0 && (
                    <div className="p-2.5 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-[11px] flex items-center justify-between text-indigo-300">
                      <div className="flex items-center gap-2">
                        <span>🏦 Time Wallet Balance:</span>
                        <strong className="text-indigo-200 font-mono font-bold">+{extBreakdown.timeWalletBalance} minutes available</strong>
                      </div>
                      {extBreakdown.historicalBacklogMinutes > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const toApply = Math.min(extBreakdown.timeWalletBalance, extBreakdown.historicalBacklogMinutes);
                            StorageService.applyWalletToBacklog(extBreakdown.teacherId, toApply, 'Admin');
                            const updated = StorageService.getTeacherExtensionBreakdown(extBreakdown.teacherId);
                            setExtAllowedMinutes(updated.suggestedExtensionMinutes);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm cursor-pointer"
                        >
                          ⚡ Apply Wallet to Backlog (-{Math.min(extBreakdown.timeWalletBalance, extBreakdown.historicalBacklogMinutes)}m)
                        </button>
                      )}
                    </div>
                  )}

                  {/* List of Undelivered Topics */}
                  {extBreakdown.undeliveredTopicsCount > 0 && (
                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60 text-[11px] space-y-1.5">
                      <div className="font-semibold text-slate-300 flex items-center justify-between">
                        <span>📝 Undelivered Lecture Topics ({extBreakdown.undeliveredTopicsCount}):</span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = extBreakdown.undeliveredTopics.map((t) => t.id);
                              setExtTopicIds(allIds);
                              const totalDuration = extBreakdown.undeliveredTopics.reduce((sum, top) => sum + (top.durationMinutes || 45), 0);
                              setExtAllowedMinutes(Math.max(15, totalDuration));
                            }}
                            className="text-purple-400 hover:text-purple-300 underline font-semibold cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setExtTopicIds([]);
                              setExtAllowedMinutes(extBreakdown.totalTimeBacklogMinutes > 0 ? extBreakdown.totalTimeBacklogMinutes : 60);
                            }}
                            className="text-slate-400 hover:text-slate-300 underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-24 overflow-y-auto">
                        {extBreakdown.undeliveredTopics.map((t) => {
                          const isSelected = extTopicIds.includes(t.id);
                          const topicDur = t.durationMinutes || 45;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                let nextIds: string[];
                                if (isSelected) {
                                  nextIds = extTopicIds.filter((id) => id !== t.id);
                                } else {
                                  nextIds = [...extTopicIds, t.id];
                                }
                                setExtTopicIds(nextIds);
                                if (nextIds.length > 0) {
                                  const totalM = extBreakdown.undeliveredTopics
                                    .filter((top) => nextIds.includes(top.id))
                                    .reduce((sum, top) => sum + (top.durationMinutes || 45), 0);
                                  setExtAllowedMinutes(Math.max(15, totalM));
                                } else {
                                  setExtAllowedMinutes(extBreakdown.totalTimeBacklogMinutes > 0 ? extBreakdown.totalTimeBacklogMinutes : 60);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-900/60 border-purple-500 text-purple-100 shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-400' : 'bg-amber-400'}`} />
                              <span className="font-bold">{t.unitNumber || 'Unit'}:</span> {t.topicTitle} <span className="opacity-75 font-mono">({topicDur}m)</span>
                              {isSelected ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* One-Click Duration Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/70">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Presets:</span>
                    {extBreakdown.totalTimeBacklogMinutes > 0 && (
                      <button
                        type="button"
                        onClick={() => setExtAllowedMinutes(extBreakdown.totalTimeBacklogMinutes)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                          extAllowedMinutes === extBreakdown.totalTimeBacklogMinutes
                            ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                            : 'bg-purple-950/40 border-purple-800/60 text-purple-300 hover:bg-purple-900/50'
                        }`}
                      >
                        🎯 Auto Exact Backlog ({extBreakdown.totalTimeBacklogMinutes}m)
                      </button>
                    )}
                    {[45, 60, 90, 120, 180, 240].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setExtAllowedMinutes(mins)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                          extAllowedMinutes === mins
                            ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                        }`}
                      >
                        {mins >= 60 ? (mins % 60 === 0 ? `${mins / 60}h` : `${mins}m`) : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
                📌 <strong className="text-slate-300">Note:</strong> Lectures submitted during this extension window will be recorded beyond normal daily limits to catch up on unfulfilled sessions, and will be logged as <strong className="text-amber-300">Late Submission</strong>.
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">Extension Window Timeframe *</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Quick Span:</span>
                    {[6, 12, 24, 48, 72].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => {
                          const base = new Date();
                          setExtStartWindow(new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                          setExtEndWindow(new Date(base.getTime() + hours * 3600000 - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                        }}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 transition-colors font-mono"
                      >
                        +{hours}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Window Starts *</label>
                    <input
                      type="datetime-local"
                      value={extStartWindow}
                      onChange={(e) => setExtStartWindow(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500 font-mono text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Window Expires *</label>
                    <input
                      type="datetime-local"
                      value={extEndWindow}
                      onChange={(e) => setExtEndWindow(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500 font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason / Notes for Extension</label>
                <input
                  type="text"
                  placeholder="e.g. Sickness recovery / System issues / Compensatory backlog completion"
                  value={extNotes}
                  onChange={(e) => setExtNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowExtensionModal(false); onPageChange('admin_dashboard'); }}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl shadow-md transition-all"
                >
                  Create Extension Window
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REORDER SYLLABUS TOPICS */}
      {showReorderModal && (() => {
        const groupedByUnit: Record<string, AssignedTopic[]> = {};
        assignedTopics.forEach((t) => {
          const unit = (t.unitNumber || 'UNASSIGNED').trim().toUpperCase();
          if (!groupedByUnit[unit]) {
            groupedByUnit[unit] = [];
          }
          groupedByUnit[unit].push(t);
        });

        const sortedUnits = Object.keys(groupedByUnit).sort((a, b) => {
          const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
          const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Reorder Syllabus Topics
                  </h3>
                  <p className="text-xs text-slate-400">Reorder the main assigned topics within their respective units.</p>
                </div>
                <button onClick={() => setShowReorderModal(false)} className="text-slate-400 hover:text-slate-100">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin">
                {sortedUnits.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No assigned topics available to reorder.</p>
                ) : (
                  sortedUnits.map((unit) => {
                    const unitTopics = groupedByUnit[unit];
                    return (
                      <div key={unit} className="space-y-2">
                        <div className="text-xs font-black text-indigo-400 uppercase tracking-wider bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/80">
                          {unit}
                        </div>
                        <div className="space-y-1.5">
                          {unitTopics.map((topic, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === unitTopics.length - 1;

                            return (
                              <div
                                key={topic.id}
                                className="flex items-center justify-between bg-slate-950/30 border border-slate-800/80 hover:border-slate-700/80 rounded-xl px-4 py-2.5 transition-colors gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="font-mono text-[10px] text-slate-500 font-bold">
                                    {idx + 1}.
                                  </span>
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-slate-200 truncate">{topic.topicTitle}</p>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {topic.subject} • Assigned to: {teachers.find(t => t.teacherId === topic.teacherId)?.name || topic.teacherId}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      if (isFirst) return;
                                      const prevTopic = unitTopics[idx - 1];
                                      StorageService.swapTopicOrders(topic.id, prevTopic.id);
                                      refreshState();
                                    }}
                                    disabled={isFirst}
                                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors font-bold"
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (isLast) return;
                                      const nextTopic = unitTopics[idx + 1];
                                      StorageService.swapTopicOrders(topic.id, nextTopic.id);
                                      refreshState();
                                    }}
                                    disabled={isLast}
                                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors font-bold"
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowReorderModal(false)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 5: ADMIN ATTACHES SUBJECT REFERENCE MATERIAL */}
      {showSubjectRefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-emerald-400" />
                  Attach Subject Reference Material
                </h3>
                <p className="text-xs text-slate-400">Add course syllabus drive link or notes folder for an entire subject</p>
              </div>
              <button onClick={() => setShowSubjectRefModal(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>

            <form onSubmit={handleSubjectRefSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select or Type Subject Name *</label>
                <input
                  type="text"
                  list="available-subjects-datalist"
                  placeholder="e.g. Data Structures & Algorithms or Thermodynamics"
                  value={refSubjectName}
                  onChange={(e) => setRefSubjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                  required
                />
                <datalist id="available-subjects-datalist">
                  {availableSubjects.map((s, i) => (
                    <option key={i} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Resource Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Master Course Syllabus, Textbook & Standard Notes"
                  value={refTitle}
                  onChange={(e) => setRefTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Google Drive / Reference Document URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/... or PDF Link"
                    value={refUrl}
                    onChange={(e) => setRefUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    required
                  />
                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science / Engineering"
                  value={refDepartment}
                  onChange={(e) => setRefDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Course Guidelines / Recommended Books</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Follow Cormen CLRS 4th Edition Chapters 1-12 as standard syllabus textbook."
                  value={refNotes}
                  onChange={(e) => setRefNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubjectRefModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md"
                >
                  Save Subject Reference Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULFILL PPT REQUEST MODAL FOR ADMIN */}
      {fulfillingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-slate-100">Fulfill Faculty PPT Request</h3>
              </div>
              <button
                onClick={() => setFulfillingRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFulfillment} className="p-5 space-y-4 text-xs">
              
              {/* Topic & Faculty Summary */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded">
                    {fulfillingRequest.unitNumber}
                  </span>
                  <span className="text-slate-400 font-mono">
                    Target: {fulfillingRequest.lectureDate}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-100">{fulfillingRequest.topicTitle}</h4>
                <p className="text-[11px] text-slate-400">
                  Faculty: <strong className="text-slate-200">{fulfillingRequest.teacherName}</strong> ({fulfillingRequest.subject})
                </p>
                {fulfillingRequest.specialInstructions && (
                  <p className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 italic mt-1">
                    "{fulfillingRequest.specialInstructions}"
                  </p>
                )}
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Production Status *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillStatus('pending')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      fulfillStatus === 'pending'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Queued
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillStatus('in_progress')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      fulfillStatus === 'in_progress'
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    In Production
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillStatus('completed')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      fulfillStatus === 'completed'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    ✓ Completed & Ready
                  </button>
                </div>
              </div>

              {/* PPT Download / Drive Link */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Completed PowerPoint (.pptx) Google Drive / Download URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/.../view"
                    value={fulfillPptUrl}
                    onChange={(e) => setFulfillPptUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* PDF Download / View Link */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Completed PDF Presentation Deck URL (Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/.../view"
                    value={fulfillPdfUrl}
                    onChange={(e) => setFulfillPdfUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                  <FileText className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Admin Remarks for Teacher */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Note for Faculty / Slide Design Summary
                </label>
                <textarea
                  rows={2}
                  value={fulfillRemarks}
                  onChange={(e) => setFulfillRemarks(e.target.value)}
                  placeholder="e.g. Presentation slides formatted in broadcast 16:9 widescreen format with PYQ badges."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Studio Shortcut */}
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl flex items-center justify-between">
                <span className="text-[11px] text-slate-300">Need to create this deck from Excel questions?</span>
                <button
                  type="button"
                  onClick={() => {
                    setFulfillingRequest(null);
                    onPageChange('ppt_generator');
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg transition-colors"
                >
                  Open PPT Generator Studio ➔
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFulfillingRequest(null)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md"
                >
                  Save & Deliver to Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN CREDENTIALS & SECURITY SETTINGS */}
      {showAdminProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">Admin Login & Credentials</h3>
                  <p className="text-xs text-slate-400">Update your administrator username and password</p>
                </div>
              </div>
              <button onClick={() => setShowAdminProfileModal(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>

            <form onSubmit={handleSaveAdminProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Username / Login ID *</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="e.g. admin or ops_manager"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Admin Password *</label>
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    {showAdminPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showAdminPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdminProfileModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-600/20"
                >
                  Save New Admin Credentials
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

      {showDbModal && (
        <DatabaseSettingsModal
          onClose={() => setShowDbModal(false)}
          onSuccess={() => refreshState()}
        />
      )}

      {/* ─── MODAL: GRANT DAY OFF / LEAVE TO TEACHER ─── */}
      {showDayOffModal && (() => {
        const nowObj = new Date();
        const yestObj = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate() - 1);
        const tomObj = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate() + 1);
        const yestKey = StorageService.toLocalDateKey(yestObj);
        const todayKey = StorageService.toLocalDateKey(nowObj);
        const tomKey = StorageService.toLocalDateKey(tomObj);
        const isYesterdaySelected = dayOffDate === yestKey;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/50 rounded-3xl shadow-2xl p-6 md:p-7 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <span className="text-xl">🏖️</span>
                    Grant Approved Day Off / Leave
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Excuses daily recording quota (0 min required) with zero backlog debt</p>
                </div>
                <button onClick={() => setShowDayOffModal(false)} className="text-slate-400 hover:text-slate-100 text-sm">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!dayOffTeacherId || !dayOffDate) return;
                  const targetT = teachers.find((t) => t.teacherId.toUpperCase() === dayOffTeacherId.toUpperCase());
                  StorageService.grantDayOff({
                    teacherId: dayOffTeacherId,
                    teacherName: targetT?.name || dayOffTeacherId,
                    date: dayOffDate,
                    endDate: dayOffEndDate || undefined,
                    reason: dayOffReason,
                    notes: dayOffNotes || undefined,
                    grantedBy: 'Academic Operations',
                  });
                  setShowDayOffModal(false);
                  setTeachers(StorageService.getTeachers());
                  if (onRefreshData) onRefreshData();
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Select Faculty Member *</label>
                  <select
                    value={dayOffTeacherId}
                    onChange={(e) => setDayOffTeacherId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.teacherId}>
                        👨‍🏫 {t.name} ({t.teacherId} — {t.subject})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Date Presets */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Quick Date Selection</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDayOffDate(yestKey);
                        setDayOffEndDate('');
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                        dayOffDate === yestKey && !dayOffEndDate
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <span>📅 Yesterday</span>
                      <span className="text-[10px] opacity-75 font-mono">{yestKey}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDayOffDate(todayKey);
                        setDayOffEndDate('');
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                        dayOffDate === todayKey && !dayOffEndDate
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <span>📅 Today</span>
                      <span className="text-[10px] opacity-75 font-mono">{todayKey}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDayOffDate(tomKey);
                        setDayOffEndDate('');
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                        dayOffDate === tomKey && !dayOffEndDate
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <span>📅 Tomorrow</span>
                      <span className="text-[10px] opacity-75 font-mono">{tomKey}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Leave Date (Start) *</label>
                    <input
                      type="date"
                      value={dayOffDate}
                      onChange={(e) => setDayOffDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">End Date (Optional for Multi-day)</label>
                    <input
                      type="date"
                      value={dayOffEndDate}
                      min={dayOffDate}
                      onChange={(e) => setDayOffEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {isYesterdaySelected && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-2xl text-[11px] text-indigo-200 flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <strong className="text-indigo-300 font-bold">Retroactive Leave for Yesterday:</strong>
                      <p className="mt-0.5 text-slate-300">
                        Granting leave for yesterday will instantly zero out yesterday's required target ({120}m) and wipe out any unfulfilled shortfall/backlog!
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Reason / Category *</label>
                  <select
                    value={dayOffReason}
                    onChange={(e) => setDayOffReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Medical Leave">🏥 Medical Leave</option>
                    <option value="Official Duty / Conference">🎓 Official Duty / Conference</option>
                    <option value="Approved Personal Day Off">🏖️ Approved Personal Day Off</option>
                    <option value="Curriculum & Question Paper Prep">📝 Curriculum & Exam Question Preparation</option>
                    <option value="Institutional Holiday">🎉 Institutional Holiday</option>
                    <option value="Family / Personal Emergency">⚠️ Personal / Family Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Special Notes / Admin Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Attending AICTE National Faculty Development Program"
                    value={dayOffNotes}
                    onChange={(e) => setDayOffNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-200 flex items-center gap-2">
                  <span>✓</span>
                  <span>Excuses faculty from recording videos on this date. Target = 0 min with zero backlog debt.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDayOffModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-slate-200 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    Grant Approved Leave ➔
                  </button>
                </div>
              </form>

              {/* List of Granted Leaves */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active & Upcoming Faculty Leaves ({StorageService.getDayOffGrants().length})
                </span>
                {StorageService.getDayOffGrants().length === 0 ? (
                  <div className="text-slate-500 italic text-[11px] p-3 text-center bg-slate-950 rounded-xl border border-slate-800/80">
                    No active leaves granted yet.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {StorageService.getDayOffGrants().map((grant) => {
                      const isPast = grant.date < todayKey;
                      const isToday = grant.date === todayKey;
                      const isYesterday = grant.date === yestKey;

                      return (
                        <div key={grant.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200">{grant.teacherName}</span>
                              <span className="text-[10px] font-mono text-slate-400">({grant.teacherId})</span>
                              {isYesterday ? (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold">
                                  Yesterday (Excused)
                                </span>
                              ) : isToday ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                                  Today (Active)
                                </span>
                              ) : isPast ? (
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px]">
                                  Past
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                                  Upcoming
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono">
                              📅 {grant.date}{grant.endDate ? ` to ${grant.endDate}` : ''} • {grant.reason}
                            </div>
                            {grant.notes && (
                              <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                                Note: "{grant.notes}"
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              StorageService.revokeDayOff(grant.id);
                              setTeachers(StorageService.getTeachers());
                              if (onRefreshData) onRefreshData();
                            }}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                            title="Revoke / Delete this granted leave"
                          >
                            Revoke
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {showEmailModal && (
        <EmailSettingsModal
          onClose={() => setShowEmailModal(false)}
          adminEmail={adminEmail}
        />
      )}

      {/* Admin Faculty Daily Backlog & Recording Logs Modal */}
      {adminInspectDailyLogsTeacherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 font-black text-lg">📅</span>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Faculty Daily Logs & Backlog Audit:{' '}
                    <span className="text-indigo-300">
                      {teachers.find((t) => t.teacherId.toUpperCase() === adminInspectDailyLogsTeacherId.toUpperCase())?.name || adminInspectDailyLogsTeacherId}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Inspect historical recording targets, delivered sessions, shortfalls, and leaves</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminInspectDailyLogsTeacherId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <DailyBacklogLogsView
              teacherId={adminInspectDailyLogsTeacherId}
              onOpenWalletModal={() => {
                setAdminInspectDailyLogsTeacherId(null);
              }}
              onPreviewLecture={(lec) => setSelectedLectureForPreview(lec)}
              isCompactModalView={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};
