import type { User, Lecture, AdminRemark, AssignedTopic, SubjectReference, SubtopicItem, DailyCommitment, PptRequest } from '../types';

const LECTURES_KEY = 'aew_portal_lectures_master';
const USERS_KEY = 'aew_portal_users_master';
const CURRENT_USER_KEY = 'aew_portal_session_master';
const ASSIGNED_TOPICS_KEY = 'aew_portal_assigned_topics_master';
const SUBJECT_REFERENCES_KEY = 'aew_portal_subject_references_master';
const DAILY_COMMITMENTS_KEY = 'aew_daily_commitments_master';
const PPT_REQUESTS_KEY = 'aew_ppt_requests_master';
const PDF_STORE_PREFIX = 'aew_pdf_';

// Initial Seed PPT Requests
const INITIAL_PPT_REQUESTS: PptRequest[] = [
  {
    id: 'req-101',
    teacherId: 'AEW-T-101',
    teacherName: 'Dr. Harish Mehta',
    subject: 'Data Structures & Algorithms',
    unitNumber: 'UNIT 2',
    topicTitle: 'Advanced Graph Algorithms & Dijkstra Shortest Path',
    lectureDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    estimatedQuestions: 8,
    referenceUrl: 'https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    specialInstructions: 'Please include 4 GATE & university exam PYQs with step-by-step trace tables in Dark Tech theme.',
    status: 'completed',
    completedPptUrl: 'https://drive.google.com/file/d/1Dijkstra_Algorithm_Lecture_Deck/view',
    completedPdfUrl: 'https://drive.google.com/file/d/1Dijkstra_Algorithm_Lecture_Deck_PDF/view',
    adminRemarks: 'Deck prepared and verified by AEW Content Studio. Includes 8 high-contrast 16:9 slides.',
    isNewForTeacher: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'req-102',
    teacherId: 'AEW-T-101',
    teacherName: 'Dr. Harish Mehta',
    subject: 'Data Structures & Algorithms',
    unitNumber: 'UNIT 3',
    topicTitle: 'Dynamic Programming on Trees & Rerooting',
    lectureDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    estimatedQuestions: 6,
    referenceUrl: '',
    specialInstructions: 'Need 6 problem statement slides for tree rerooting techniques.',
    status: 'in_progress',
    adminRemarks: 'Design team currently assembling topic divider slides and question cards.',
    isNewForTeacher: false,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'req-103',
    teacherId: 'AEW-T-102',
    teacherName: 'Prof. Sneha Sharma',
    subject: 'Signals & Systems',
    unitNumber: 'UNIT 1',
    topicTitle: 'Continuous-Time Fourier Series & Dirichlet Conditions',
    lectureDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    estimatedQuestions: 5,
    referenceUrl: '',
    specialInstructions: 'Include waveform comparison diagram slides.',
    status: 'pending',
    isNewForTeacher: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Initial Registered Faculty & Admin Roster with Daily Recording Target Minutes
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
    dailyTargetMinutes: 9999,
    dailyLimit: 999,
  },
  {
    id: 'u-101',
    teacherId: 'AEW-T-101',
    username: 'harish_mehta',
    password: 'teach123',
    name: 'Dr. Harish Mehta',
    email: 'harish.cs@aew.com',
    role: 'teacher',
    department: 'Computer Science & Engg',
    subject: 'Data Structures & Algorithms',
    dailyTargetMinutes: 120, // 2 Hours required daily
    dailyLimit: 4,
  },
  {
    id: 'u-102',
    teacherId: 'AEW-T-102',
    username: 'sneha_sharma',
    password: 'teach123',
    name: 'Prof. Sneha Sharma',
    email: 'sneha.ece@aew.com',
    role: 'teacher',
    department: 'Electronics & Comm Engg',
    subject: 'Signals & Systems',
    dailyTargetMinutes: 90, // 1.5 Hours required daily
    dailyLimit: 4,
  },
  {
    id: 'u-103',
    teacherId: 'AEW-T-103',
    username: 'rajesh_kulkarni',
    password: 'teach123',
    name: 'Dr. Rajesh Kulkarni',
    email: 'rajesh.mech@aew.com',
    role: 'teacher',
    department: 'Mechanical Engineering',
    subject: 'Thermodynamics',
    dailyTargetMinutes: 120, // 2 Hours required daily
    dailyLimit: 4,
  },
  {
    id: 'u-104',
    teacherId: 'AEW-T-104',
    username: 'ananya_iyer',
    password: 'teach123',
    name: 'Prof. Ananya Iyer',
    email: 'ananya.ee@aew.com',
    role: 'teacher',
    department: 'Electrical Engineering',
    subject: 'Power Systems',
    dailyTargetMinutes: 90,
    dailyLimit: 4,
  },
  {
    id: 'u-105',
    teacherId: 'AEW-T-105',
    username: 'vikram_malhotra',
    password: 'teach123',
    name: 'Dr. Vikram Malhotra',
    email: 'vikram.civil@aew.com',
    role: 'teacher',
    department: 'Civil Engineering',
    subject: 'Structural Analysis',
    dailyTargetMinutes: 120,
    dailyLimit: 4,
  },
];

// Initial Subject References
const INITIAL_SUBJECT_REFERENCES: SubjectReference[] = [
  {
    id: 'sref-1',
    subjectName: 'Data Structures & Algorithms',
    department: 'Computer Science & Engg',
    title: 'Master DSA Curriculum & Standard Reference Notes',
    referenceUrl: 'https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    notes: 'Follow CLRS 4th Edition Chapters 1-12 and standard AEW lecture slides.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sref-2',
    subjectName: 'Signals & Systems',
    department: 'Electronics & Comm Engg',
    title: 'Signals & Systems Lecture Reference Drive',
    referenceUrl: 'https://drive.google.com/drive/folders/1bCdEfGhIjKlMnOpQrStUvWxYz',
    notes: 'Oppenheim & Willsky standard syllabus reference and Fourier transform problem sets.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sref-3',
    subjectName: 'Thermodynamics',
    department: 'Mechanical Engineering',
    title: 'Thermodynamics Master Drive Material',
    referenceUrl: 'https://drive.google.com/drive/folders/1cDeFgHiJkLmNoPqRsTuVwXyZa',
    notes: 'Cengel & Boles Engineering Thermodynamics 9th Edition reference formulas.',
    updatedAt: new Date().toISOString(),
  }
];

// Initial Assigned Syllabus Topics
const INITIAL_ASSIGNED_TOPICS: AssignedTopic[] = [
  {
    id: 'at-101',
    teacherId: 'AEW-T-101',
    subject: 'Data Structures & Algorithms',
    topicTitle: 'Advanced Graph Algorithms & Shortest Path',
    subtopics: ['Dijkstra Algorithm', 'Bellman-Ford', 'Floyd-Warshall'],
    subtopicItems: [
      { id: 'sub-1', name: 'Dijkstra Algorithm', deadlineDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], status: 'pending' },
      { id: 'sub-2', name: 'Bellman-Ford', deadlineDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0], status: 'pending' },
      { id: 'sub-3', name: 'Floyd-Warshall', deadlineDate: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0], status: 'pending' }
    ],
    proposedSubtopics: [],
    subtopicsApprovalState: 'approved',
    assignedBy: 'Admin',
    deadlineDate: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
    status: 'pending',
    priority: 'high',
    notes: 'Please cover time complexity analysis with Fibonacci Heaps.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'at-102',
    teacherId: 'AEW-T-101',
    subject: 'Data Structures & Algorithms',
    topicTitle: 'Dynamic Programming on Trees',
    subtopics: [],
    subtopicItems: [],
    proposedSubtopics: ['Tree Rerooting DP', 'Subtree Sums & Heights', 'Binary Lifting for LCA'],
    subtopicsApprovalState: 'pending_admin_approval',
    assignedBy: 'Admin',
    deadlineDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    status: 'pending',
    priority: 'high',
    notes: 'Include minimum 2 competitive programming problems.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'at-103',
    teacherId: 'AEW-T-102',
    subject: 'Signals & Systems',
    topicTitle: 'Continuous-Time Fourier Series & Transforms',
    subtopics: ['Dirichlet Conditions', 'Frequency Response', 'Parseval Relation'],
    subtopicItems: [
      { id: 'sub-4', name: 'Dirichlet Conditions', deadlineDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], status: 'pending' },
      { id: 'sub-5', name: 'Frequency Response', deadlineDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], status: 'pending' },
      { id: 'sub-6', name: 'Parseval Relation', deadlineDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], status: 'pending' }
    ],
    proposedSubtopics: [],
    subtopicsApprovalState: 'approved',
    assignedBy: 'Admin',
    deadlineDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    status: 'pending',
    priority: 'high',
    notes: 'Solve numericals on duality property.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'at-104',
    teacherId: 'AEW-T-103',
    subject: 'Thermodynamics',
    topicTitle: 'Second Law of Thermodynamics & Entropy',
    subtopics: [],
    subtopicItems: [],
    proposedSubtopics: [],
    subtopicsApprovalState: 'pending_teacher_input',
    assignedBy: 'Admin',
    deadlineDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    status: 'pending',
    priority: 'normal',
    notes: 'Please propose subtopics for admin approval.',
    createdAt: new Date().toISOString(),
  }
];

export const StorageService = {
  // Collects all registered users (seeded with full initial roster)
  getUsers(): User[] {
    const userMap = new Map<string, User>();

    // 1. Seed with initial registered faculty & admin
    INITIAL_USERS.forEach((u) => {
      userMap.set(u.teacherId.toUpperCase(), { ...u });
    });

    // 2. Collect from localStorage overrides
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
                  dailyTargetMinutes: u.dailyTargetMinutes || existing.dailyTargetMinutes || (u.dailyLimit ? u.dailyLimit * 30 : 120),
                  dailyUploadCutoffTime: u.dailyUploadCutoffTime || existing.dailyUploadCutoffTime,
                  hasSetInitialCommitment: u.hasSetInitialCommitment ?? existing.hasSetInitialCommitment ?? false,
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
      dailyTargetMinutes: newTeacher.dailyTargetMinutes || 120,
      dailyLimit: newTeacher.dailyLimit || Math.ceil((newTeacher.dailyTargetMinutes || 120) / 30),
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
      dailyTargetMinutes: updates.dailyTargetMinutes !== undefined ? updates.dailyTargetMinutes : users[index].dailyTargetMinutes,
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

  updateTeacherTargetMinutes(teacherId: string, targetMinutes: number): void {
    const cleanId = teacherId.trim().toUpperCase();
    const users = this.getUsers();
    const index = users.findIndex((u) => u.teacherId.toUpperCase() === cleanId);
    if (index !== -1) {
      users[index].dailyTargetMinutes = Math.max(15, targetMinutes);
      this.saveUsers(users);
    }
  },

  // Backwards compatibility
  updateTeacherLimit(teacherId: string, limit: number): void {
    this.updateTeacherTargetMinutes(teacherId, limit * 30);
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
    if (!data) {
      this.saveSubjectReferences(INITIAL_SUBJECT_REFERENCES);
      return INITIAL_SUBJECT_REFERENCES;
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SUBJECT_REFERENCES;
    } catch {
      return INITIAL_SUBJECT_REFERENCES;
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

    // 1. Seed with initial assigned topics
    INITIAL_ASSIGNED_TOPICS.forEach((t) => {
      topicMap.set(t.id, { ...t });
    });

    // 2. Collect from localStorage
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
              if (t && t.id) {
                const subtopicStrings = Array.isArray(t.subtopics) ? t.subtopics : [];
                
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
              if (l && l.id) {
                lecMap.set(l.id, { 
                  ...lecMap.get(l.id), 
                  ...l,
                  durationMinutes: l.durationMinutes || 45, // default 45 min
                });
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
      durationMinutes: lecture.durationMinutes || 45,
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

  // Total recording minutes completed today by the teacher
  getMinutesRecordedToday(teacherId: string): number {
    const lectures = this.getLectures();
    const today = new Date().toISOString().split('T')[0];
    const todayLectures = lectures.filter(
      (l) => l.teacherId.toUpperCase() === teacherId.toUpperCase() && l.createdAt.startsWith(today)
    );
    return todayLectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
  },

  getUploadsToday(teacherId: string): number {
    const lectures = this.getLectures();
    const today = new Date().toISOString().split('T')[0];
    return lectures.filter((l) => l.teacherId.toUpperCase() === teacherId.toUpperCase() && l.createdAt.startsWith(today)).length;
  },

  // ─── DAILY UPLOAD TIME COMMITMENT (PROMISED DELIVERY TIME) ─────────────────
  getDailyCommitments(): DailyCommitment[] {
    const data = localStorage.getItem(DAILY_COMMITMENTS_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveDailyCommitments(commitments: DailyCommitment[]): void {
    localStorage.setItem(DAILY_COMMITMENTS_KEY, JSON.stringify(commitments));
  },

  getDailyCommitment(teacherId: string, date?: string): DailyCommitment | null {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const list = this.getDailyCommitments();
    return list.find(
      (c) => c.teacherId.toUpperCase() === teacherId.toUpperCase() && c.date === targetDate
    ) || null;
  },

  saveDailyCommitment(
    teacherId: string, 
    teacherName: string, 
    promisedTime: string, 
    note?: string
  ): DailyCommitment {
    const targetDate = new Date().toISOString().split('T')[0];
    const list = this.getDailyCommitments();
    const existingIndex = list.findIndex(
      (c) => c.teacherId.toUpperCase() === teacherId.toUpperCase() && c.date === targetDate
    );

    const commitment: DailyCommitment = {
      id: existingIndex !== -1 ? list[existingIndex].id : `comm-${Date.now()}`,
      teacherId: teacherId.trim().toUpperCase(),
      teacherName: teacherName.trim(),
      date: targetDate,
      promisedTime: promisedTime.trim(),
      note: note?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      list[existingIndex] = commitment;
    } else {
      list.unshift(commitment);
    }

    this.saveDailyCommitments(list);
    return commitment;
  },

  // Updates permanent daily upload cutoff time (configured once upon first login)
  updateTeacherCutoffTime(teacherId: string, cutoffTime: string): User | null {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.teacherId.toUpperCase() === teacherId.toUpperCase());
    if (index === -1) return null;

    users[index].dailyUploadCutoffTime = cutoffTime.trim();
    users[index].hasSetInitialCommitment = true;
    this.saveUsers(users);

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.teacherId.toUpperCase() === teacherId.toUpperCase()) {
      this.setCurrentUser({ 
        ...currentUser, 
        dailyUploadCutoffTime: cutoffTime.trim(), 
        hasSetInitialCommitment: true 
      });
    }

    return users[index];
  },

  // Verifies if an upload right now is on time (checks both topic deadline and the teacher's standard daily cutoff time)
  isUploadOnTime(teacherId: string, topicDeadlineDate: string): boolean {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Check topic deadline date
    if (topicDeadlineDate < todayStr) {
      return false;
    }

    // 2. Check teacher's permanent daily upload cutoff time (set once on first login)
    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === teacherId.toUpperCase());
    const cutoffTime = teacher?.dailyUploadCutoffTime;

    if (cutoffTime) {
      const [hours, minutes] = cutoffTime.split(':').map(Number);
      const deadlineDateObj = new Date();
      deadlineDateObj.setHours(hours, minutes, 59, 999);

      if (now > deadlineDateObj) {
        return false; // Missed standard daily upload cutoff time!
      }
    }

    return true;
  },

  // Checks if a teacher's permanent daily cutoff time has passed today
  isDailyDeadlineMissed(teacherId: string): boolean {
    const now = new Date();
    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === teacherId.toUpperCase());
    const cutoffTime = teacher?.dailyUploadCutoffTime;
    if (!cutoffTime) return false;

    const [hours, minutes] = cutoffTime.split(':').map(Number);
    const deadlineDateObj = new Date();
    deadlineDateObj.setHours(hours, minutes, 59, 999);

    return now > deadlineDateObj;
  },

  // ─── PPT REQUESTS (TEACHER REQUESTS -> ADMIN PRODUCES DECK) ────────────────
  getPptRequests(): PptRequest[] {
    const data = localStorage.getItem(PPT_REQUESTS_KEY);
    if (!data) {
      this.savePptRequests(INITIAL_PPT_REQUESTS);
      return INITIAL_PPT_REQUESTS;
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PPT_REQUESTS;
    } catch {
      return INITIAL_PPT_REQUESTS;
    }
  },

  savePptRequests(requests: PptRequest[]): void {
    localStorage.setItem(PPT_REQUESTS_KEY, JSON.stringify(requests));
  },

  getTeacherPptRequests(teacherId: string): PptRequest[] {
    const list = this.getPptRequests();
    return list.filter((r) => r.teacherId.toUpperCase() === teacherId.toUpperCase());
  },

  addPptRequest(request: {
    teacherId: string;
    teacherName: string;
    subject: string;
    unitNumber: string;
    topicTitle: string;
    lectureDate: string;
    estimatedQuestions?: number;
    referenceUrl?: string;
    specialInstructions?: string;
  }): PptRequest {
    const list = this.getPptRequests();
    const newReq: PptRequest = {
      ...request,
      id: `req-${Date.now()}`,
      status: 'pending',
      isNewForTeacher: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newReq);
    this.savePptRequests(list);
    return newReq;
  },

  updatePptRequest(id: string, updates: Partial<PptRequest>): PptRequest | null {
    const list = this.getPptRequests();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated: PptRequest = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // If status changed to completed, mark as new for teacher so they get a notification mark
    if (updates.status === 'completed' && list[index].status !== 'completed') {
      updated.isNewForTeacher = true;
    }

    list[index] = updated;
    this.savePptRequests(list);
    return updated;
  },

  markPptRequestSeen(id: string): void {
    const list = this.getPptRequests();
    const index = list.findIndex((r) => r.id === id);
    if (index !== -1 && list[index].isNewForTeacher) {
      list[index].isNewForTeacher = false;
      this.savePptRequests(list);
    }
  },

  deletePptRequest(id: string): void {
    const list = this.getPptRequests().filter((r) => r.id !== id);
    this.savePptRequests(list);
  },

  // ─── TEACHER ON-TIME SUBMISSION PERCENTAGE & METRICS ─────────────────────────
  getOnTimeSubmissionStats(teacherId: string): {
    totalLectures: number;
    onTimeLectures: number;
    delayedLectures: number;
    onTimePercentage: number;
  } {
    const lectures = this.getLectures().filter(
      (l) => l.teacherId.toUpperCase() === teacherId.toUpperCase()
    );
    const totalLectures = lectures.length;
    const onTimeLectures = lectures.filter((l) => l.status === 'on_time').length;
    const delayedLectures = totalLectures - onTimeLectures;
    const onTimePercentage = totalLectures > 0 ? Math.round((onTimeLectures / totalLectures) * 100) : 100;

    return {
      totalLectures,
      onTimeLectures,
      delayedLectures,
      onTimePercentage,
    };
  },

  // ─── TIME REMAINING TO SUBMIT TODAY'S LECTURE ─────────────────────────────────
  getTodayTimeRemaining(teacherId: string): {
    hours: number;
    minutes: number;
    seconds: number;
    totalSecondsRemaining: number;
    isPassed: boolean;
    cutoffDisplay: string;
    isTargetMet: boolean;
    minutesRecordedToday: number;
    targetMinutes: number;
  } {
    const now = new Date();
    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === teacherId.toUpperCase());
    const commitment = this.getDailyCommitment(teacherId);
    const cutoffTime = teacher?.dailyUploadCutoffTime || commitment?.promisedTime || '20:00';

    const targetMinutes = teacher?.dailyTargetMinutes || 120;
    const minutesRecordedToday = this.getMinutesRecordedToday(teacherId);
    const isTargetMet = minutesRecordedToday >= targetMinutes;

    const [hours, minutes] = cutoffTime.split(':').map(Number);
    const deadlineObj = new Date();
    deadlineObj.setHours(hours, minutes, 0, 0);

    const diffMs = deadlineObj.getTime() - now.getTime();
    const totalSecondsRemaining = Math.max(0, Math.floor(diffMs / 1000));
    const isPassed = diffMs <= 0;

    const remHours = Math.floor(totalSecondsRemaining / 3600);
    const remMinutes = Math.floor((totalSecondsRemaining % 3600) / 60);
    const remSeconds = totalSecondsRemaining % 60;

    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const cutoffDisplay = `${formattedHours}:${formattedMinutes} ${period}`;

    return {
      hours: remHours,
      minutes: remMinutes,
      seconds: remSeconds,
      totalSecondsRemaining,
      isPassed,
      cutoffDisplay,
      isTargetMet,
      minutesRecordedToday,
      targetMinutes,
    };
  },

  // ─── ADMIN NOTIFICATION BADGES FOR TEACHER ───────────────────────────────────
  getTeacherAdminNotificationCounts(teacherId: string): {
    syllabus: number;
    directives: number;
    resources: number;
    ppt: number;
    total: number;
  } {
    const cleanId = teacherId.toUpperCase();
    
    // 1. Syllabus: Needs Action (Admin assigned topics or requested revisions)
    const assignedTopics = this.getAssignedTopics().filter(
      (t) => t.teacherId.toUpperCase() === cleanId &&
             t.status !== 'completed' &&
             (t.subtopicsApprovalState === 'pending_teacher_input' || t.subtopicsApprovalState === 'revision_requested')
    );
    const syllabus = assignedTopics.length;

    // 2. Directives: Unread/New remarks from admin on teacher's lectures
    const lectures = this.getLectures().filter((l) => l.teacherId.toUpperCase() === cleanId);
    let directives = 0;
    lectures.forEach((lec) => {
      directives += lec.adminRemarks?.length || 0;
    });

    // 3. PPT: Ready completed PPTs waiting for download
    const pptRequests = this.getTeacherPptRequests(cleanId).filter(
      (r) => r.status === 'completed' && r.isNewForTeacher
    );
    const ppt = pptRequests.length;

    // 4. Resources: Available materials
    const resources = this.getSubjectReferences().length > 0 ? 0 : 0;

    return {
      syllabus,
      directives,
      resources,
      ppt,
      total: syllabus + (ppt > 0 ? ppt : 0) + (directives > 0 ? 1 : 0),
    };
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
