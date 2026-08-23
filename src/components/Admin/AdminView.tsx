import React, { useState, useMemo, useEffect } from 'react';
import type { User, Lecture, AssignedTopic, SubjectReference, SubtopicItem, PptRequest } from '../../types';
import { StorageService } from '../../services/storage';
import { VideoModal } from '../Common/VideoModal';
import { DatabaseSettingsModal } from '../Common/DatabaseSettingsModal';
import { 
  Search, UserPlus, Trash2, Video, FileText, ShieldCheck, 
  Eye, MessageCircle, Clock, X, 
  Key, Lock, User as UserIcon, EyeOff, CheckCircle2, 
  Edit3, Link2, Layers, BookMarked, FolderPlus,
  Users, FileSpreadsheet, Database, Folder,
  ChevronDown, ChevronUp, Image as ImageIcon
} from 'lucide-react';

interface AdminViewProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onRefreshData?: () => void;
  refreshTrigger?: number;
}

export const AdminView: React.FC<AdminViewProps> = ({ 
  currentPage, 
  onPageChange, 
  refreshTrigger
}) => {
  const [teachers, setTeachers] = useState<User[]>(StorageService.getTeachers());
  const [lectures, setLectures] = useState<Lecture[]>(StorageService.getLectures());
  const [assignedTopics, setAssignedTopics] = useState<AssignedTopic[]>(StorageService.getAssignedTopics());
  const [subjectReferences, setSubjectReferences] = useState<SubjectReference[]>(StorageService.getSubjectReferences());
  const [pptRequests, setPptRequests] = useState<PptRequest[]>(StorageService.getPptRequests());

  // PPT Request Fulfillment Modal State
  const [fulfillingRequest, setFulfillingRequest] = useState<PptRequest | null>(null);
  const [fulfillStatus, setFulfillStatus] = useState<'pending' | 'in_progress' | 'completed'>('completed');
  const [fulfillPptUrl, setFulfillPptUrl] = useState('');
  const [fulfillPdfUrl, setFulfillPdfUrl] = useState('');
  const [fulfillRemarks, setFulfillRemarks] = useState('');
  
  const [selectedLectureForPreview, setSelectedLectureForPreview] = useState<Lecture | null>(null);
  const [remarkingLectureId, setRemarkingLectureId] = useState<string | null>(null);
  const [remarkInput, setRemarkInput] = useState('');
  const [searchTeacherQuery, setSearchTeacherQuery] = useState('');
  const [searchLectureQuery, setSearchLectureQuery] = useState('');
  const [searchTopicQuery, setSearchTopicQuery] = useState('');

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
  const [newTeacherId, setNewTeacherId] = useState(`AEW-T-10${teachers.length + 1}`);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('teach123');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('Computer Science & Engg');
  const [newSubject, setNewSubject] = useState('Data Structures & Algorithms');
  const [newTargetMinutes, setNewTargetMinutes] = useState(120);

  // Edit Teacher Credentials Modal State
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editTargetMinutes, setEditTargetMinutes] = useState(120);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Standalone Assign Topic Modal State (Supports Comma Separated Topics)
  const [showAssignModal, setShowAssignModal] = useState(false);
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

  // Subject Reference Modal State
  const [showSubjectRefModal, setShowSubjectRefModal] = useState(false);
  const [refSubjectName, setRefSubjectName] = useState('');
  const [refDepartment, setRefDepartment] = useState('Engineering');
  const [refTitle, setRefTitle] = useState('Master Subject Syllabus & Standard Reference Notes');
  const [refUrl, setRefUrl] = useState('');
  const [refNotes, setRefNotes] = useState('');


  // Subtopic Review & Approval Modal State
  const [reviewingTopic, setReviewingTopic] = useState<AssignedTopic | null>(null);
  const [reviewSubtopicItems, setReviewSubtopicItems] = useState<SubtopicItem[]>([]);
  const [reviewSubtopicInput, setReviewSubtopicInput] = useState('');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);

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
    setFulfillStatus(req.status === 'completed' ? 'completed' : 'completed');
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
    });

    setShowAddModal(false);
    setNewName('');
    setNewUsername('');
    setNewPassword('teach123');
    setNewTargetMinutes(120);
    setNewTeacherId(`AEW-T-10${teachers.length + 2}`);
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
    const names = (topic.proposedSubtopics && topic.proposedSubtopics.length > 0)
      ? topic.proposedSubtopics
      : topic.subtopics || [];

    const items: SubtopicItem[] = names.map((name, idx) => ({
      id: `sub-rev-${idx}-${Date.now()}`,
      name,
      status: 'pending',
    }));

    setReviewSubtopicItems(items);
    setReviewSubtopicInput('');
    setRevisionFeedback('');
    setShowRevisionInput(false);
  };

  // Add tag in review modal
  const handleAddReviewItem = () => {
    const raw = reviewSubtopicInput.trim();
    if (!raw || !reviewingTopic) return;

    const names = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const updated = [...reviewSubtopicItems];

    names.forEach((name, i) => {
      if (!updated.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        updated.push({
          id: `sub-rev-${Date.now()}-${i}`,
          name,
          status: 'pending',
        });
      }
    });

    setReviewSubtopicItems(updated);
    setReviewSubtopicInput('');
  };

  const handleRemoveReviewItem = (index: number) => {
    setReviewSubtopicItems(reviewSubtopicItems.filter((_, i) => i !== index));
  };

  // Direct 1-Click Approve Subtopics
  const handleDirectApprove = (topicId: string, customItems?: SubtopicItem[]) => {
    const names = customItems ? customItems.map((c) => c.name) : undefined;
    StorageService.approveSubtopics(topicId, names, customItems);
    setReviewingTopic(null);
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
        t.name.toLowerCase().includes(q) ||
        t.teacherId.toLowerCase().includes(q) ||
        (t.username && t.username.toLowerCase().includes(q)) ||
        t.department.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
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

    return 'UNIT 1';
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
          l.title.toLowerCase().includes(q) ||
          l.teacherName.toLowerCase().includes(q) ||
          l.teacherId.toLowerCase().includes(q) ||
          l.subject.toLowerCase().includes(q) ||
          l.primaryTopic.toLowerCase().includes(q) ||
          u.includes(q) ||
          l.subtopics.some((st) => st.toLowerCase().includes(q))
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

  const filteredAssignedTopics = useMemo(() => {
    const q = searchTopicQuery.toLowerCase().trim();
    if (!q) return assignedTopics;
    return assignedTopics.filter(
      (t) =>
        t.topicTitle.toLowerCase().includes(q) ||
        t.teacherId.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.subtopics.some((st) => st.toLowerCase().includes(q))
    );
  }, [assignedTopics, searchTopicQuery]);

  const pendingApprovalTopics = assignedTopics.filter(
    (t) => t.subtopicsApprovalState === 'pending_admin_approval'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* PAGE 1: 🏠 OVERVIEW DASHBOARD */}
      {(currentPage === 'admin_dashboard' || !currentPage) && (
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
                onClick={() => setShowDbModal(true)}
                className="px-4 py-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02]"
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
                  setNewTeacherId(`AEW-T-10${teachers.length + 1}`);
                  setNewUsername(`teacher_${teachers.length + 1}`);
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2: 📌 SYLLABUS TOPICS & SUBTOPIC DEADLINES HUB */}
      {currentPage === 'admin_syllabus' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" /> Syllabus & Subtopic Deadlines Center
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign modules to faculty, adjust individual submission deadlines per subtopic, and approve syllabus breakdowns.
              </p>
            </div>
            <button
              onClick={() => {
                if (teachers.length === 0) {
                  alert('Please onboard faculty first.');
                  return;
                }
                setAssignTeacherId(teachers[0]?.teacherId || '');
                setShowAssignModal(true);
              }}
              className="px-5 py-2.5 rounded-xl font-extrabold text-slate-950 text-xs bg-amber-500 hover:bg-amber-400 shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              📌 + Assign New Topics
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search topics by title, teacher ID, subject, or subtopics..."
              value={searchTopicQuery}
              onChange={(e) => setSearchTopicQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>

          {/* Topics Grid */}
          {filteredAssignedTopics.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <div className="text-4xl">📌</div>
              <div className="font-bold text-slate-200 text-base">No Assigned Topics Found</div>
              <p className="text-xs text-slate-400">Click "📌 + Assign New Topics" to distribute curriculum topics to teachers.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        ? 'border-purple-500/50 bg-purple-950/5'
                        : isApproved
                        ? 'border-emerald-500/30'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-amber-400">{topic.teacherId}</span>
                          <h4 className="font-bold text-sm text-slate-100">{topic.topicTitle}</h4>
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

                      {/* Subtopics */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                          <span>Subtopics Breakdown:</span>
                          <span className="text-[10px] text-indigo-400 font-mono">
                            {topic.subtopics?.length || 0} subtopics
                          </span>
                        </div>

                        {topic.subtopics && topic.subtopics.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {topic.subtopics.map((st, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200 font-medium"
                              >
                                #{st}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic block py-1">
                            Teacher has not proposed subtopics yet
                          </span>
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
                            <Edit3 className="w-3.5 h-3.5" /> Review Subtopics
                          </button>
                          <button
                            onClick={() => handleDirectApprove(topic.id)}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-sm"
                          >
                            Approve ✓
                          </button>
                        </div>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => handleOpenReviewModal(topic)}
                          className="w-full py-2 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Manage Subtopics
                        </button>
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

      {/* PAGE 3: 👨‍🏫 FACULTY ROSTER & CREDENTIALS MANAGEMENT */}
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
                  setNewTeacherId(`AEW-T-10${teachers.length + 1}`);
                  setNewUsername(`teacher_${teachers.length + 1}`);
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
                          <span className="font-mono font-bold text-amber-400">{t.password || 'teach123'}</span>
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
                <strong>{lectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0)}m</strong> Total Time
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
                                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                          }`}>
                                            {lec.status === 'on_time' ? '✓ On-Time Submission' : '⚠️ Overdue'}
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
              <h4 className="font-extrabold text-sm text-slate-100">{reviewingTopic.topicTitle}</h4>
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

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl max-h-60 overflow-y-auto space-y-2">
                  {reviewSubtopicItems.length === 0 ? (
                    <div className="text-slate-500 text-center italic py-3">No subtopics in list.</div>
                  ) : (
                    reviewSubtopicItems.map((st, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-purple-200 truncate flex-1">#{st.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveReviewItem(i)}
                          className="text-slate-400 hover:text-red-400 font-bold p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
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
                    onClick={() => handleDirectApprove(reviewingTopic.id, reviewSubtopicItems)}
                    disabled={reviewSubtopicItems.length === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Save Subtopics
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
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Faculty Member *</label>
                  <select
                    value={assignTeacherId}
                    onChange={(e) => setAssignTeacherId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    required
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.teacherId}>
                        {t.name} ({t.teacherId}) - {t.subject}
                      </option>
                    ))}
                  </select>
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

      {/* MODAL 4: ADMIN ATTACHES SUBJECT REFERENCE MATERIAL */}
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
    </div>
  );
};
