import type { User, Lecture, AdminRemark, AssignedTopic, SubjectReference, SubtopicItem } from '../types';

const LECTURES_KEY = 'aew_portal_lectures_master';
const USERS_KEY = 'aew_portal_users_master';
const CURRENT_USER_KEY = 'aew_portal_session_master';
const ASSIGNED_TOPICS_KEY = 'aew_portal_assigned_topics_master';
const SUBJECT_REFERENCES_KEY = 'aew_portal_subject_references_master';
const PDF_STORE_PREFIX = 'aew_pdf_';

// Initial Admin User ONLY
const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    teacherId: 'ADMIN-01',
    username: 'admin',
    password: 'admin123',
    name: 'Academic Operations Admin',
    email: 'admin@aew.com',
    role: 'admin',
    department: 'Academic Operations',
    subject: 'Management',
    dailyLimit: 999,
  },
];

// Demo IDs to filter out if previously seeded
const DEMO_IDS = new Set(['u-101', 'u-102', 'u-103', 'AEW-T-101', 'AEW-T-102', 'AEW-T-103', 'lec-1', 'at-101', 'at-102', 'at-103']);

export const StorageService = {
  // Collects real users (filtering out demo accounts)
  getUsers(): User[] {
    const userMap = new Map<string, User>();

    // 1. Seed with initial Admin
    INITIAL_USERS.forEach((u) => {
      userMap.set(u.teacherId.toUpperCase(), { ...u });
    });

    // 2. Collect from localStorage
    const keysToCheck = [
      'aew_portal_users_v4',
      'aew_portal_users_v5',
      'aew_portal_users_v6',
      USERS_KEY,
    ];

    keysToCheck.forEach((k) => {
      const data = localStorage.getItem(k);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            parsed.forEach((u: User) => {
              if (u && u.teacherId) {
                const cleanId = u.teacherId.trim().toUpperCase();
                if (DEMO_IDS.has(cleanId) || DEMO_IDS.has(u.id)) {
                  return;
                }
                const existing: Partial<User> = userMap.get(cleanId) || {};
                userMap.set(cleanId, {
                  ...existing,
                  ...u,
                  id: u.id || existing.id || `u-${Date.now()}`,
                  teacherId: cleanId,
                  username: (u.username || existing.username || cleanId.toLowerCase()).trim().toLowerCase().replace(/\s+/g, '_'),
                  password: (u.password || existing.password || (u.role === 'admin' ? 'admin123' : 'teach123')).trim(),
                  name: (u.name || existing.name || cleanId).trim(),
                  role: u.role || existing.role || (cleanId.startsWith('ADMIN') ? 'admin' : 'teacher'),
                  email: (u.email || existing.email || `${cleanId.toLowerCase()}@aew.com`).trim(),
                  department: u.department || existing.department || 'Engineering',
                  subject: u.subject || existing.subject || 'Engineering',
                  dailyLimit: u.dailyLimit || existing.dailyLimit || 4,
                });
              }
            });
          }
        } catch {
          // ignore
        }
      }
    });

    const allUsers = Array.from(userMap.values());
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
    return allUsers;
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getTeachers(): User[] {
    return this.getUsers().filter((u) => u.role === 'teacher');
  },

  addTeacher(newTeacher: Omit<User, 'id' | 'role'>): User {
    const users = this.getUsers();
    const cleanTeacherId = newTeacher.teacherId.trim().toUpperCase();
    const cleanUsername = (newTeacher.username?.trim().toLowerCase() || cleanTeacherId.toLowerCase()).replace(/\s+/g, '_');
    const cleanPassword = newTeacher.password?.trim() || 'teach123';

    const filtered = users.filter((u) => u.teacherId.toUpperCase() !== cleanTeacherId);

    const created: User = {
      ...newTeacher,
      id: `u-${Date.now()}`,
      teacherId: cleanTeacherId,
      username: cleanUsername,
      password: cleanPassword,
      name: newTeacher.name.trim(),
      email: newTeacher.email.trim() || `${cleanTeacherId.toLowerCase()}@aew.com`,
      department: newTeacher.department.trim() || 'Engineering',
      subject: newTeacher.subject.trim() || 'Engineering',
      dailyLimit: newTeacher.dailyLimit || 4,
      role: 'teacher',
    };
    filtered.push(created);
    this.saveUsers(filtered);
    return created;
  },

  updateUser(userId: string, updates: Partial<User>): User | null {
    const users = this.getUsers();
    const cleanLookup = userId.trim().toUpperCase();
    const index = users.findIndex((u) => u.id === userId || u.teacherId.toUpperCase() === cleanLookup);
    if (index === -1) return null;

    const updatedUser: User = {
      ...users[index],
      ...updates,
      teacherId: updates.teacherId ? updates.teacherId.trim().toUpperCase() : users[index].teacherId,
      username: updates.username ? updates.username.trim().toLowerCase().replace(/\s+/g, '_') : users[index].username,
      password: updates.password ? updates.password.trim() : users[index].password,
    };
    users[index] = updatedUser;
    this.saveUsers(users);

    const current = this.getCurrentUser();
    if (current && (current.id === updatedUser.id || current.teacherId.toUpperCase() === updatedUser.teacherId.toUpperCase())) {
      this.setCurrentUser(updatedUser);
    }

    return updatedUser;
  },

  removeTeacher(teacherId: string): void {
    const cleanId = teacherId.trim().toUpperCase();
    const users = this.getUsers().filter((u) => u.teacherId.toUpperCase() !== cleanId);
    this.saveUsers(users);
  },

  updateTeacherLimit(teacherId: string, limit: number): void {
    const cleanId = teacherId.trim().toUpperCase();
    const users = this.getUsers();
    const index = users.findIndex((u) => u.teacherId.toUpperCase() === cleanId);
    if (index !== -1) {
      users[index].dailyLimit = limit;
      this.saveUsers(users);
    }
  },

  getCurrentUser(): User | null {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    if (!data) return null;
    return JSON.parse(data);
  },

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  // ─── SUBJECT REFERENCE MATERIALS (WHOLE SUBJECT) ────────────────────────────
  getSubjectReferences(): SubjectReference[] {
    const data = localStorage.getItem(SUBJECT_REFERENCES_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveSubjectReferences(refs: SubjectReference[]): void {
    localStorage.setItem(SUBJECT_REFERENCES_KEY, JSON.stringify(refs));
  },

  addOrUpdateSubjectReference(ref: {
    subjectName: string;
    department?: string;
    title: string;
    referenceUrl: string;
    notes?: string;
  }): SubjectReference {
    const refs = this.getSubjectReferences();
    const cleanSubject = ref.subjectName.trim();
    const existingIndex = refs.findIndex(
      (r) => r.subjectName.toLowerCase() === cleanSubject.toLowerCase()
    );

    const updatedRef: SubjectReference = {
      id: existingIndex !== -1 ? refs[existingIndex].id : `sref-${Date.now()}`,
      subjectName: cleanSubject,
      department: ref.department?.trim() || (existingIndex !== -1 ? refs[existingIndex].department : 'Engineering'),
      title: ref.title.trim(),
      referenceUrl: ref.referenceUrl.trim(),
      notes: ref.notes?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      refs[existingIndex] = updatedRef;
    } else {
      refs.unshift(updatedRef);
    }

    this.saveSubjectReferences(refs);
    return updatedRef;
  },

  removeSubjectReference(id: string): void {
    const refs = this.getSubjectReferences().filter((r) => r.id !== id);
    this.saveSubjectReferences(refs);
  },

  getReferenceForSubject(subjectName: string): SubjectReference | undefined {
    if (!subjectName) return undefined;
    const clean = subjectName.trim().toLowerCase();
    const refs = this.getSubjectReferences();
    return refs.find(
      (r) => r.subjectName.toLowerCase() === clean || clean.includes(r.subjectName.toLowerCase()) || r.subjectName.toLowerCase().includes(clean)
    );
  },

  // ─── ASSIGNED TOPICS WITH SUBTOPIC DEADLINES ────────────────────────────────
  getAssignedTopics(): AssignedTopic[] {
    const topicMap = new Map<string, AssignedTopic>();

    const keysToCheck = [
      'aew_portal_assigned_topics_v5',
      'aew_portal_assigned_topics_v6',
      ASSIGNED_TOPICS_KEY,
    ];

    keysToCheck.forEach((k) => {
      const data = localStorage.getItem(k);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            parsed.forEach((t: AssignedTopic) => {
              if (t && t.id && !DEMO_IDS.has(t.id)) {
                const subtopicStrings = Array.isArray(t.subtopics) ? t.subtopics : [];
                
                // Construct or normalize subtopicItems with individual deadlines
                let items: SubtopicItem[] = Array.isArray(t.subtopicItems) && t.subtopicItems.length > 0
                  ? t.subtopicItems
                  : subtopicStrings.map((name, idx) => ({
                      id: `sub-${idx}-${Date.now()}`,
                      name,
                      deadlineDate: t.deadlineDate || new Date().toISOString().split('T')[0],
                      status: t.status === 'completed' ? 'completed' : 'pending',
                    }));

                topicMap.set(t.id, {
                  ...t,
                  subtopics: subtopicStrings,
                  subtopicItems: items,
                  proposedSubtopics: Array.isArray(t.proposedSubtopics) ? t.proposedSubtopics : [],
                  subtopicsApprovalState: t.subtopicsApprovalState || (subtopicStrings.length > 0 ? 'approved' : 'pending_teacher_input'),
                });
              }
            });
          }
        } catch {
          // ignore
        }
      }
    });

    const allTopics = Array.from(topicMap.values());
    localStorage.setItem(ASSIGNED_TOPICS_KEY, JSON.stringify(allTopics));
    return allTopics;
  },

  saveAssignedTopics(topics: AssignedTopic[]): void {
    localStorage.setItem(ASSIGNED_TOPICS_KEY, JSON.stringify(topics));
  },

  addAssignedTopic(topic: {
    teacherId: string;
    subject: string;
    topicTitle: string;
    subtopics?: string[];
    subtopicItems?: SubtopicItem[];
    assignedBy?: string;
    deadlineDate: string;
    priority?: 'high' | 'medium' | 'normal';
    notes?: string;
  }): AssignedTopic {
    const topics = this.getAssignedTopics();
    const hasInitialSubtopics = topic.subtopics && topic.subtopics.length > 0;
    const subtopicNames = topic.subtopics || [];

    const items: SubtopicItem[] = topic.subtopicItems && topic.subtopicItems.length > 0
      ? topic.subtopicItems
      : subtopicNames.map((name, idx) => ({
          id: `sub-${idx}-${Date.now()}`,
          name,
          deadlineDate: topic.deadlineDate,
          status: 'pending',
        }));

    const newTopic: AssignedTopic = {
      id: `at-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      teacherId: topic.teacherId.trim().toUpperCase(),
      subject: topic.subject.trim(),
      topicTitle: topic.topicTitle.trim(),
      subtopics: subtopicNames,
      subtopicItems: items,
      proposedSubtopics: [],
      subtopicsApprovalState: hasInitialSubtopics ? 'approved' : 'pending_teacher_input',
      assignedBy: topic.assignedBy || 'Admin',
      deadlineDate: topic.deadlineDate,
      status: 'pending',
      priority: topic.priority || 'high',
      notes: topic.notes,
      createdAt: new Date().toISOString(),
    };
    topics.unshift(newTopic);
    this.saveAssignedTopics(topics);
    return newTopic;
  },

  // Bulk add topics separated by commas or lines
  addMultipleAssignedTopics(
    titles: string[],
    commonProps: {
      teacherId: string;
      subject: string;
      deadlineDate: string;
      priority?: 'high' | 'medium' | 'normal';
      notes?: string;
    }
  ): AssignedTopic[] {
    const createdList: AssignedTopic[] = [];
    const cleanTitles = titles.map((t) => t.trim()).filter((t) => t.length > 0);

    cleanTitles.forEach((title) => {
      const newTopic = this.addAssignedTopic({
        ...commonProps,
        topicTitle: title,
      });
      createdList.push(newTopic);
    });

    return createdList;
  },

  // Teacher submits proposed subtopics for admin review
  proposeSubtopics(topicId: string, proposedSubtopics: string[]): AssignedTopic | null {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return null;

    topics[index] = {
      ...topics[index],
      proposedSubtopics,
      subtopicsApprovalState: 'pending_admin_approval',
      adminFeedback: undefined,
    };
    this.saveAssignedTopics(topics);
    return topics[index];
  },

  // Admin approves proposed subtopics with custom individual deadlines
  approveSubtopics(
    topicId: string, 
    approvedSubtopics?: string[],
    customItems?: SubtopicItem[]
  ): AssignedTopic | null {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return null;

    const topic = topics[index];
    const finalNames = approvedSubtopics && approvedSubtopics.length > 0
      ? approvedSubtopics
      : topic.proposedSubtopics && topic.proposedSubtopics.length > 0
      ? topic.proposedSubtopics
      : topic.subtopics;

    const finalItems: SubtopicItem[] = customItems && customItems.length > 0
      ? customItems
      : finalNames.map((name, idx) => {
          const existingItem = topic.subtopicItems?.find((item) => item.name.toLowerCase() === name.toLowerCase());
          return {
            id: existingItem?.id || `sub-${idx}-${Date.now()}`,
            name,
            deadlineDate: existingItem?.deadlineDate || topic.deadlineDate,
            status: existingItem?.status || 'pending',
          };
        });

    topics[index] = {
      ...topics[index],
      subtopics: finalNames,
      subtopicItems: finalItems,
      subtopicsApprovalState: 'approved',
      adminFeedback: undefined,
    };
    this.saveAssignedTopics(topics);
    return topics[index];
  },

  // Admin directly updates deadline of a specific subtopic
  updateSubtopicDeadline(
    topicId: string, 
    subtopicIdOrName: string, 
    newDeadline: string
  ): AssignedTopic | null {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return null;

    const topic = topics[index];
    const items = topic.subtopicItems || topic.subtopics.map((name, i) => ({
      id: `sub-${i}-${Date.now()}`,
      name,
      deadlineDate: topic.deadlineDate,
      status: 'pending' as const,
    }));

    const updatedItems = items.map((st) => {
      if (st.id === subtopicIdOrName || st.name.toLowerCase() === subtopicIdOrName.toLowerCase()) {
        return { ...st, deadlineDate: newDeadline };
      }
      return st;
    });

    topics[index] = {
      ...topics[index],
      subtopicItems: updatedItems,
    };
    this.saveAssignedTopics(topics);
    return topics[index];
  },

  // Admin updates all subtopic items and their individual deadlines at once
  updateAllSubtopicDeadlines(
    topicId: string, 
    subtopicItems: SubtopicItem[]
  ): AssignedTopic | null {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return null;

    topics[index] = {
      ...topics[index],
      subtopics: subtopicItems.map((s) => s.name),
      subtopicItems,
    };
    this.saveAssignedTopics(topics);
    return topics[index];
  },

  // Admin requests revision on proposed subtopics with feedback
  requestSubtopicsRevision(topicId: string, feedback: string): AssignedTopic | null {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return null;

    topics[index] = {
      ...topics[index],
      subtopicsApprovalState: 'revision_requested',
      adminFeedback: feedback.trim(),
    };
    this.saveAssignedTopics(topics);
    return topics[index];
  },

  updateAssignedTopicStatus(topicId: string, status: 'pending' | 'in_progress' | 'completed'): void {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index !== -1) {
      topics[index].status = status;
      this.saveAssignedTopics(topics);
    }
  },

  removeAssignedTopic(topicId: string): void {
    const topics = this.getAssignedTopics().filter((t) => t.id !== topicId);
    this.saveAssignedTopics(topics);
  },

  // ─── LECTURES ──────────────────────────────────────────────────────────────
  getLectures(): Lecture[] {
    const lecMap = new Map<string, Lecture>();

    const keysToCheck = [
      'aew_portal_lectures_v4',
      'aew_portal_lectures_v5',
      'aew_portal_lectures_v6',
      LECTURES_KEY,
    ];

    keysToCheck.forEach((k) => {
      const data = localStorage.getItem(k);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            parsed.forEach((l: Lecture) => {
              if (l && l.id && !DEMO_IDS.has(l.id)) {
                lecMap.set(l.id, { ...lecMap.get(l.id), ...l });
              }
            });
          }
        } catch {
          // ignore
        }
      }
    });

    const allLectures = Array.from(lecMap.values());
    localStorage.setItem(LECTURES_KEY, JSON.stringify(allLectures));
    return allLectures;
  },

  saveLectures(lectures: Lecture[]): void {
    localStorage.setItem(LECTURES_KEY, JSON.stringify(lectures));
  },

  addLecture(lecture: Omit<Lecture, 'id' | 'createdAt' | 'adminRemarks'>): Lecture {
    const lectures = this.getLectures();
    const newLec: Lecture = {
      ...lecture,
      id: `lec-${Date.now()}`,
      adminRemarks: [],
      createdAt: new Date().toISOString(),
    };
    lectures.unshift(newLec);
    this.saveLectures(lectures);

    if (lecture.assignedTopicId) {
      this.updateAssignedTopicStatus(lecture.assignedTopicId, 'completed');
    }

    return newLec;
  },

  addAdminRemark(lectureId: string, remarkText: string, adminName: string = 'Admin'): AdminRemark {
    const lectures = this.getLectures();
    const index = lectures.findIndex((l) => l.id === lectureId);
    if (index === -1) throw new Error('Lecture not found');

    const newRemark: AdminRemark = {
      id: `rem-${Date.now()}`,
      lectureId,
      adminName,
      remarkText,
      createdAt: new Date().toISOString(),
    };

    lectures[index].adminRemarks.unshift(newRemark);
    this.saveLectures(lectures);
    return newRemark;
  },

  getUploadsToday(teacherId: string): number {
    const lectures = this.getLectures();
    const today = new Date().toISOString().split('T')[0];
    return lectures.filter((l) => l.teacherId.toUpperCase() === teacherId.toUpperCase() && l.createdAt.startsWith(today)).length;
  },

  // ─── PDF Storage ─────────────────────────────────────────────────────────────
  savePdfFile(lectureId: string, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        try {
          localStorage.setItem(`${PDF_STORE_PREFIX}${lectureId}`, base64);
          resolve(base64);
        } catch (err) {
          reject(new Error('PDF file is too large to store locally. Please use a Google Drive link instead.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read the PDF file.'));
      reader.readAsDataURL(file);
    });
  },

  getPdfDataUri(lectureId: string): string | null {
    return localStorage.getItem(`${PDF_STORE_PREFIX}${lectureId}`);
  },

  removePdf(lectureId: string): void {
    localStorage.removeItem(`${PDF_STORE_PREFIX}${lectureId}`);
  },
};
