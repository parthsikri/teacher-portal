import { notificationService } from './notificationService';
import type {
  DayOffGrant,
  User, Lecture, AdminRemark, AssignedTopic, SubjectReference, SubtopicItem, DailyCommitment, PptRequest, LectureExtension, WalletTransaction, TimeWalletInfo, DailyBacklogLog, TeacherDailyLogsInfo, DailyLogStatus, EmailConfig } from '../types';


const LECTURES_KEY = 'aew_portal_lectures_prod_v2';
const USERS_KEY = 'aew_portal_users_prod_v2';
const CURRENT_USER_KEY = 'aew_portal_session_prod_v2';
const ASSIGNED_TOPICS_KEY = 'aew_portal_assigned_topics_prod_v2';
const SUBJECT_REFERENCES_KEY = 'aew_portal_subject_references_prod_v2';
const DAILY_COMMITMENTS_KEY = 'aew_daily_commitments_prod_v2';
const PPT_REQUESTS_KEY = 'aew_ppt_requests_prod_v2';
const DELETED_IDS_KEY = 'aew_deleted_ids_prod_v2';
const EXTENSIONS_KEY = 'tp_lecture_extensions';
const WALLET_TRANSACTIONS_KEY = 'tp_time_wallet_transactions_prod_v1';
const DAY_OFF_GRANTS_KEY = 'tp_day_off_grants_prod_v1';
const PDF_STORE_PREFIX = 'aew_pdf_';

// Initial Registered Administrator (Portal starts completely clean for new teachers)
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
    id: 'u-t101',
    teacherId: 'AEW-T-101',
    username: 'teacher_101',
    password: 'teach123',
    name: 'Dr. Ananya Sharma',
    email: 'ananya@aew.com',
    role: 'teacher',
    department: 'Computer Science',
    subject: 'Data Structures & Algorithms',
    dailyTargetMinutes: 120,
    dailyLimit: 240,
    joiningDate: '2026-08-25',
    firstLoginDate: '2026-08-25',
  },
  {
    id: 'u-t102',
    teacherId: 'AEW-T-102',
    username: 'teacher_102',
    password: 'teach123',
    name: 'Prof. Rajesh Verma',
    email: 'rajesh@aew.com',
    role: 'teacher',
    department: 'Mechanical Engineering',
    subject: 'Thermodynamics',
    dailyTargetMinutes: 120,
    dailyLimit: 240,
    joiningDate: '2026-08-25',
    firstLoginDate: '2026-08-25',
  },
  {
    id: 'u-t103',
    teacherId: 'AEW-T-103',
    username: 'teacher_103',
    password: 'teach123',
    name: 'Dr. Vikram Malhotra',
    email: 'vikram@aew.com',
    role: 'teacher',
    department: 'Electronics & Communication',
    subject: 'Signals & Systems',
    dailyTargetMinutes: 120,
    dailyLimit: 240,
    joiningDate: '2026-08-25',
    firstLoginDate: '2026-08-25',
  },
];

let syncDebounceTimer: any = null;

function triggerBackgroundCloudSync() {
  if (typeof window === 'undefined') return;
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    StorageService.syncToCloud().catch((err) => {
      console.warn('[CloudSync] Background push error:', err);
    });
  }, 400);
}

export const StorageService = {
  // Collects all registered users
  getUsers(): User[] {
    const userMap = new Map<string, User>();

    // 1. Seed with initial admin & mock teachers
    INITIAL_USERS.forEach((u) => {
      userMap.set(u.teacherId.toUpperCase(), { ...u });
    });

    // 2. Read registered users from storage
    const data = localStorage.getItem(USERS_KEY);
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
                dailyTargetMinutes: u.dailyTargetMinutes || existing.dailyTargetMinutes || 120,
                dailyUploadCutoffTime: u.dailyUploadCutoffTime || existing.dailyUploadCutoffTime,
                hasSetInitialCommitment: u.hasSetInitialCommitment ?? existing.hasSetInitialCommitment ?? false,
                dailyLimit: u.dailyLimit || existing.dailyLimit || 4,
                joiningDate: u.joiningDate || existing.joiningDate || (cleanId.startsWith('ADMIN') ? undefined : '2026-08-25'),
                firstLoginDate: u.firstLoginDate || existing.firstLoginDate,
                createdAt: u.createdAt || existing.createdAt || new Date().toISOString(),
              });
            }
          });
        }
      } catch {
        // ignore
      }
    }

    const allUsers = Array.from(userMap.values());
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
    return allUsers;
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    triggerBackgroundCloudSync();
  },

  getTeachers(): User[] {
    return this.getUsers().filter((u) => u.role === 'teacher');
  },

  addTeacher(newTeacher: Omit<User, 'id' | 'role'>): User {
    const users = this.getUsers();
    const cleanTeacherId = newTeacher.teacherId.trim().toUpperCase();
    const cleanUsername = (newTeacher.username?.trim().toLowerCase() || cleanTeacherId.toLowerCase()).replace(/\s+/g, '_');
    const cleanPassword = newTeacher.password?.trim() || 'teach123';
    const todayStr = this.toLocalDateKey(new Date());

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
      joiningDate: (newTeacher.joiningDate || todayStr).trim(),
      createdAt: new Date().toISOString(),
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
      joiningDate: updates.joiningDate !== undefined ? updates.joiningDate : users[index].joiningDate,
      firstLoginDate: updates.firstLoginDate !== undefined ? updates.firstLoginDate : users[index].firstLoginDate,
    };
    users[index] = updatedUser;
    this.saveUsers(users);

    const current = this.getCurrentUser();
    if (current && (current.id === updatedUser.id || current.teacherId.toUpperCase() === updatedUser.teacherId.toUpperCase())) {
      this.setCurrentUser(updatedUser);
    }

    return updatedUser;
  },

  // Record faculty login date automatically upon successful login
  recordTeacherLogin(teacherId: string): void {
    const cleanId = (teacherId || '').trim().toUpperCase();
    if (!cleanId || cleanId.startsWith('ADMIN')) return;
    const users = this.getUsers();
    const index = users.findIndex((u) => u.teacherId.toUpperCase() === cleanId);
    if (index === -1) return;

    const todayStr = this.toLocalDateKey(new Date());
    const user = users[index];
    let changed = false;

    if (!user.firstLoginDate) {
      user.firstLoginDate = todayStr;
      changed = true;
    }
    if (!user.joiningDate) {
      user.joiningDate = todayStr;
      changed = true;
    }

    if (changed) {
      users[index] = { ...user };
      this.saveUsers(users);
    }
  },

  // Get effective start date for backlog tracking (joining date or first login date)
  getTeacherEffectiveStartDate(teacherId: string): string {
    const cleanId = (teacherId || '').trim().toUpperCase();
    const user = this.getUsers().find((u) => u.teacherId.toUpperCase() === cleanId);
    const todayStr = this.toLocalDateKey(new Date());

    if (user?.joiningDate) {
      return user.joiningDate;
    }
    if (user?.firstLoginDate) {
      return user.firstLoginDate;
    }

    // Fallback to earliest recorded activity
    const lectures = this.getLectures().filter((l) => l.teacherId.toUpperCase() === cleanId);
    const commitments = this.getDailyCommitments().filter((c) => c.teacherId.toUpperCase() === cleanId);
    const dayOffs = this.getDayOffGrants().filter((g) => g.teacherId.toUpperCase() === cleanId);

    const dates: string[] = [];
    lectures.forEach((l) => {
      const d = this.toLocalDateKey(l.createdAt);
      if (d) dates.push(d);
    });
    commitments.forEach((c) => {
      if (c.date) dates.push(c.date);
    });
    dayOffs.forEach((g) => {
      if (g.date) dates.push(g.date);
    });

    if (dates.length > 0) {
      dates.sort();
      return dates[0];
    }

    return todayStr;
  },

  updateAdminCredentials(data: {
    username?: string;
    password?: string;
    name?: string;
    email?: string;
  }): User | null {
    const users = this.getUsers();
    const adminIndex = users.findIndex((u) => u.role === 'admin' || u.teacherId.toUpperCase().startsWith('ADMIN'));
    if (adminIndex === -1) return null;

    const updatedAdmin: User = {
      ...users[adminIndex],
      username: data.username ? data.username.trim().toLowerCase().replace(/\s+/g, '_') : users[adminIndex].username,
      password: data.password ? data.password.trim() : users[adminIndex].password,
      name: data.name ? data.name.trim() : users[adminIndex].name,
      email: data.email ? data.email.trim() : users[adminIndex].email,
    };

    users[adminIndex] = updatedAdmin;
    this.saveUsers(users);

    const current = this.getCurrentUser();
    if (current && (current.role === 'admin' || current.id === updatedAdmin.id)) {
      this.setCurrentUser(updatedAdmin);
    }

    return updatedAdmin;
  },

  getDeletedIds(): string[] {
    const data = localStorage.getItem(DELETED_IDS_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addDeletedId(id: string): void {
    if (!id) return;
    const clean = id.trim().toUpperCase();
    const list = this.getDeletedIds();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(list));
      triggerBackgroundCloudSync();
    }
  },

  removeTeacher(teacherId: string): void {
    const cleanId = teacherId.trim().toUpperCase();
    this.addDeletedId(cleanId);
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
    triggerBackgroundCloudSync();
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
    this.addDeletedId(id);
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
    const data = localStorage.getItem(ASSIGNED_TOPICS_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      
      const topics = parsed as AssignedTopic[];
      let needsMigration = false;
      for (const t of topics) {
        if (t.displayOrder === undefined) {
          needsMigration = true;
          break;
        }
      }

      if (needsMigration) {
        const unitGroups: Record<string, AssignedTopic[]> = {};
        topics.forEach((t) => {
          const unit = (t.unitNumber || 'UNIT 1').trim().toUpperCase();
          if (!unitGroups[unit]) {
            unitGroups[unit] = [];
          }
          unitGroups[unit].push(t);
        });

        Object.keys(unitGroups).forEach((unit) => {
          unitGroups[unit].forEach((t, index) => {
            t.displayOrder = index + 1;
            t.updatedAt = new Date().toISOString();
          });
        });
        
        localStorage.setItem(ASSIGNED_TOPICS_KEY, JSON.stringify(topics));
        this.syncToCloud().catch(() => {});
      }

      return this.sortAssignedTopics(topics);
    } catch {
      return [];
    }
  },

  sortAssignedTopics(topics: AssignedTopic[]): AssignedTopic[] {
    const parseUnitNum = (unitStr?: string): number => {
      if (!unitStr) return 999999;
      const match = unitStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : 999999;
    };

    return [...topics].sort((a, b) => {
      const uA = parseUnitNum(a.unitNumber);
      const uB = parseUnitNum(b.unitNumber);
      if (uA !== uB) return uA - uB;

      const orderA = a.displayOrder !== undefined ? a.displayOrder : 999999;
      const orderB = b.displayOrder !== undefined ? b.displayOrder : 999999;
      return orderA - orderB;
    });
  },


  saveAssignedTopics(topics: AssignedTopic[]): void {
    localStorage.setItem(ASSIGNED_TOPICS_KEY, JSON.stringify(topics));
    triggerBackgroundCloudSync();
  },

  addAssignedTopic(topic: {
    teacherId: string;
    subject: string;
    unitNumber?: string;
    topicTitle: string;
    subtopics?: string[];
    subtopicItems?: SubtopicItem[];
    assignedBy?: string;
    deadlineDate?: string;
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
          status: 'pending',
        }));

    const unitStr = topic.unitNumber?.trim() || 'UNIT 1';
    const sameUnitTopics = topics.filter(
      (t) => (t.unitNumber || 'UNIT 1').trim().toUpperCase() === unitStr.trim().toUpperCase()
    );
    const maxOrder = sameUnitTopics.reduce((max, t) => Math.max(max, t.displayOrder || 0), 0);

    const newTopic: AssignedTopic = {
      id: `at-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      teacherId: topic.teacherId.trim().toUpperCase(),
      subject: topic.subject.trim(),
      unitNumber: unitStr,
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
      updatedAt: new Date().toISOString(),
      displayOrder: maxOrder + 1,
    };
    topics.push(newTopic);
    this.saveAssignedTopics(topics);

    // Operational Email Notification: Notify Teacher of New Topic Assignment
    try {
      const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === topic.teacherId.trim().toUpperCase());
      if (teacherObj?.email) {
        notificationService.notifyTopicAssigned({
          teacherEmail: teacherObj.email,
          teacherName: teacherObj.name || topic.teacherId,
          subject: topic.subject,
          topicTitle: topic.topicTitle,
          unitNumber: unitStr,
          notes: topic.notes,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch topic assigned email:', notifyErr);
    }

    return newTopic;
  },

  // Bulk add topics separated by commas or lines (preserves exact forward order)
  addMultipleAssignedTopics(
    titles: string[],
    commonProps: {
      teacherId: string;
      subject: string;
      unitNumber?: string;
      deadlineDate?: string;
      priority?: 'high' | 'medium' | 'normal';
      notes?: string;
    }
  ): AssignedTopic[] {
    const topics = this.getAssignedTopics();
    const createdList: AssignedTopic[] = [];
    const cleanTitles = titles.map((t) => t.trim()).filter((t) => t.length > 0);
    const now = Date.now();

    const unitStr = commonProps.unitNumber?.trim() || 'UNIT 1';
    const sameUnitTopics = topics.filter(
      (t) => (t.unitNumber || 'UNIT 1').trim().toUpperCase() === unitStr.trim().toUpperCase()
    );
    const maxOrder = sameUnitTopics.reduce((max, t) => Math.max(max, t.displayOrder || 0), 0);

    cleanTitles.forEach((title, idx) => {
      const newTopic: AssignedTopic = {
        id: `at-${now + idx}-${Math.floor(Math.random() * 1000)}`,
        teacherId: commonProps.teacherId.trim().toUpperCase(),
        subject: commonProps.subject.trim(),
        unitNumber: unitStr,
        topicTitle: title,
        subtopics: [],
        subtopicItems: [],
        proposedSubtopics: [],
        subtopicsApprovalState: 'pending_teacher_input',
        assignedBy: 'Admin',
        deadlineDate: commonProps.deadlineDate,
        status: 'pending',
        priority: commonProps.priority || 'high',
        notes: commonProps.notes,
        createdAt: new Date(now + idx * 1000).toISOString(),
        updatedAt: new Date(now + idx * 1000).toISOString(),
        displayOrder: maxOrder + idx + 1,
      };
      topics.push(newTopic);
      createdList.push(newTopic);
    });

    this.saveAssignedTopics(topics);

    // Operational Email Notification: Notify Teacher of New Topic Assignment
    try {
      const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === commonProps.teacherId.trim().toUpperCase());
      if (teacherObj?.email && cleanTitles.length > 0) {
        const titleText = cleanTitles.length === 1 ? cleanTitles[0] : `${cleanTitles[0]} (+${cleanTitles.length - 1} more topics)`;
        notificationService.notifyTopicAssigned({
          teacherEmail: teacherObj.email,
          teacherName: teacherObj.name || commonProps.teacherId,
          subject: commonProps.subject,
          topicTitle: titleText,
          unitNumber: unitStr,
          notes: commonProps.notes,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch bulk topic assigned email:', notifyErr);
    }

    return createdList;
  },

  swapTopicOrders(topicIdA: string, topicIdB: string): void {
    const topics = this.getAssignedTopics();
    const idxA = topics.findIndex((t) => t.id === topicIdA);
    const idxB = topics.findIndex((t) => t.id === topicIdB);
    if (idxA === -1 || idxB === -1) return;

    // Swap displayOrder values
    const tempOrder = topics[idxA].displayOrder;
    topics[idxA].displayOrder = topics[idxB].displayOrder;
    topics[idxB].displayOrder = tempOrder;

    topics[idxA].updatedAt = new Date().toISOString();
    topics[idxB].updatedAt = new Date().toISOString();

    this.saveAssignedTopics(topics);
  },

  // Teacher submits proposed subtopics for admin review and confirms the shared write.
  async proposeSubtopics(topicId: string, proposedSubtopics: string[]): Promise<AssignedTopic> {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) throw new Error('This topic is no longer available. Refresh and try again.');
    if (topics[index].status === 'completed') throw new Error('Completed topics cannot be resubmitted.');
    const cleanSubtopics = proposedSubtopics.map((item) => item.trim()).filter(Boolean);
    if (cleanSubtopics.length === 0) throw new Error('Add at least one subtopic before sending.');

    topics[index] = {
      ...topics[index],
      proposedSubtopics: cleanSubtopics,
      subtopicsApprovalState: 'pending_admin_approval',
      adminFeedback: undefined,
      updatedAt: new Date().toISOString(),
    };
    this.saveAssignedTopics(topics);

    const synced = await this.syncToCloud();
    if (!synced) {
      throw new Error('Your proposal was saved on this device but could not be shared. Check your connection and submit again.');
    }

    // Operational Email Notification: Notify Admin
    try {
      const adminEmails = this.getUsers().filter((u) => u.role === 'admin').map((u) => u.email).filter(Boolean);
      const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === topics[index].teacherId.toUpperCase());
      if (adminEmails.length > 0) {
        notificationService.notifySubtopicsSubmitted({
          adminEmails,
          teacherName: teacherObj?.name || topics[index].teacherId,
          teacherId: topics[index].teacherId,
          subject: topics[index].subject,
          topicTitle: topics[index].topicTitle,
          unitNumber: topics[index].unitNumber,
          subtopicsCount: cleanSubtopics.length,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch subtopics submitted email:', notifyErr);
    }

    return topics[index];
  },

  // Admin approves proposed subtopics with optional guidelines / comment
  approveSubtopics(
    topicId: string, 
    approvedSubtopics?: string[],
    customItems?: SubtopicItem[],
    adminApprovalComment?: string,
    newTopicTitle?: string
  ): AssignedTopic | null {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return null;

    const topic = topics[index];
    const finalNames = customItems !== undefined
      ? customItems.map((c) => c.name.trim()).filter((n) => n.length > 0)
      : approvedSubtopics && approvedSubtopics.length > 0
      ? approvedSubtopics.map((s) => s.trim()).filter((s) => s.length > 0)
      : topic.proposedSubtopics && topic.proposedSubtopics.length > 0
      ? topic.proposedSubtopics
      : topic.subtopics;

    const finalItems: SubtopicItem[] = customItems !== undefined
      ? customItems.filter((c) => c.name.trim().length > 0).map(item => ({
          ...item,
          isApproved: true,
        }))
      : finalNames.map((name, idx) => ({
          id: `sub-${idx}-${Date.now()}`,
          name,
          status: 'pending',
          isApproved: true,
        }));

    topics[index] = {
      ...topics[index],
      topicTitle: newTopicTitle ? newTopicTitle.trim() : topic.topicTitle,
      subtopics: finalNames,
      subtopicItems: finalItems,
      proposedSubtopics: finalNames,
      subtopicsApprovalState: 'approved',
      adminFeedback: undefined,
      adminApprovalComment: adminApprovalComment !== undefined ? (adminApprovalComment.trim() || undefined) : topic.adminApprovalComment,
      updatedAt: new Date().toISOString(),
    };
    this.saveAssignedTopics(topics);
    this.syncToCloud().catch((err) => console.warn('[CloudSync] Immediate subtopics approval push error:', err));

    // Operational Email Notification: Notify Teacher of Approval
    try {
      const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === topics[index].teacherId.toUpperCase());
      if (teacherObj?.email) {
        notificationService.notifySubtopicsReviewed({
          teacherEmail: teacherObj.email,
          teacherName: teacherObj.name || topics[index].teacherId,
          subject: topics[index].subject,
          topicTitle: topics[index].topicTitle,
          status: 'approved',
          feedback: adminApprovalComment,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch subtopics approved email:', notifyErr);
    }

    return topics[index];
  },

  updateTopicAndSubtopics(
    topicId: string,
    newTitle: string,
    newSubtopicItems: SubtopicItem[],
    adminApprovalComment?: string
  ): AssignedTopic | null {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return null;

    const topic = topics[index];
    const oldItems = topic.subtopicItems || [];
    const oldItemsMap = new Map<string, SubtopicItem>();
    oldItems.forEach((item) => oldItemsMap.set(item.id, item));

    const finalItems: SubtopicItem[] = newSubtopicItems.map((item) => {
      const oldItem = oldItemsMap.get(item.id);
      if (!oldItem) {
        return {
          ...item,
          status: 'pending',
          isApproved: false,
        };
      }

      if (oldItem.name.trim().toLowerCase() !== item.name.trim().toLowerCase()) {
        return {
          ...item,
          status: 'pending',
          isApproved: false,
        };
      }

      return {
        ...item,
        status: oldItem.status || 'pending',
        isApproved: oldItem.isApproved ?? true,
      };
    });

    const finalNames = finalItems.map((item) => item.name.trim()).filter((n) => n.length > 0);

    topics[index] = {
      ...topics[index],
      topicTitle: newTitle.trim(),
      subtopics: finalNames,
      subtopicItems: finalItems,
      adminApprovalComment: adminApprovalComment !== undefined ? (adminApprovalComment.trim() || undefined) : topic.adminApprovalComment,
      updatedAt: new Date().toISOString(),
    };

    this.saveAssignedTopics(topics);
    this.syncToCloud().catch((err) => console.warn('[CloudSync] Topic update sync error:', err));
    return topics[index];
  },

  resetSubtopicsApprovalState(topicId: string): void {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index !== -1) {
      topics[index].subtopicsApprovalState = 'pending_teacher_input';
      topics[index].subtopics = [];
      topics[index].subtopicItems = [];
      topics[index].proposedSubtopics = [];
      topics[index].updatedAt = new Date().toISOString();
      this.saveAssignedTopics(topics);
    }
  },

  // Admin updates subtopic list
  updateSubtopicsList(
    topicId: string, 
    subtopics: string[]
  ): AssignedTopic | null {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return null;

    const cleanNames = subtopics.map((s) => s.trim()).filter((s) => s.length > 0);
    const subtopicItems: SubtopicItem[] = cleanNames.map((name, idx) => ({
      id: `sub-${idx}-${Date.now()}`,
      name,
      status: 'pending',
    }));

    topics[index] = {
      ...topics[index],
      subtopics: cleanNames,
      subtopicItems,
      proposedSubtopics: cleanNames,
      updatedAt: new Date().toISOString(),
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
      isNewFromAdmin: true,
      updatedAt: new Date().toISOString(),
    };
    this.saveAssignedTopics(topics);

    // Operational Email Notification: Notify Teacher of Revision Request
    try {
      const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === topics[index].teacherId.toUpperCase());
      if (teacherObj?.email) {
        notificationService.notifySubtopicsReviewed({
          teacherEmail: teacherObj.email,
          teacherName: teacherObj.name || topics[index].teacherId,
          subject: topics[index].subject,
          topicTitle: topics[index].topicTitle,
          status: 'revision_requested',
          feedback,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch subtopics revision email:', notifyErr);
    }

    return topics[index];
  },

  updateAssignedTopicStatus(topicId: string, status: 'pending' | 'in_progress' | 'completed'): void {
    const topics = this.getAssignedTopics();
    const index = topics.findIndex((t) => t.id === topicId);
    if (index !== -1) {
      topics[index].status = status;
      topics[index].updatedAt = new Date().toISOString();
      this.saveAssignedTopics(topics);
    }
  },

  removeAssignedTopic(topicId: string): void {
    this.addDeletedId(topicId);
    const topics = this.getAssignedTopics().filter((t) => t.id !== topicId);
    this.saveAssignedTopics(topics);
  },

  // ─── LECTURES ──────────────────────────────────────────────────────────────
  getLectures(): Lecture[] {
    const data = localStorage.getItem(LECTURES_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveLectures(lectures: Lecture[]): void {
    localStorage.setItem(LECTURES_KEY, JSON.stringify(lectures));
    triggerBackgroundCloudSync();
  },

  addLecture(lecture: Omit<Lecture, 'id' | 'createdAt' | 'adminRemarks'>): Lecture {
    const lectures = this.getLectures();
    const teacherTarget = this.getUsers().find((user) => user.teacherId.toUpperCase() === lecture.teacherId.toUpperCase())?.dailyTargetMinutes || 120;
    const topic = lecture.assignedTopicId ? this.getAssignedTopics().find(t => t.id === lecture.assignedTopicId) : null;
    const unitNumber = lecture.unitNumber || topic?.unitNumber || undefined;

    const existingIndex = lecture.assignedTopicId 
      ? lectures.findIndex((l) => l.assignedTopicId === lecture.assignedTopicId) 
      : -1;

    if (existingIndex !== -1) {
      // Edit / Update existing lecture
      const existingLec = lectures[existingIndex];
      const diffDuration = (lecture.durationMinutes || 45) - (existingLec.durationMinutes || 45);

      const updatedLec: Lecture = {
        ...existingLec,
        ...lecture,
        unitNumber,
        durationMinutes: lecture.durationMinutes || 45,
      };
      lectures[existingIndex] = updatedLec;
      this.saveLectures(lectures);

      if (lecture.assignedTopicId) {
        this.updateAssignedTopicStatus(lecture.assignedTopicId, 'completed');
      }

      const activeExt = this.getActiveExtensionForTopic(lecture.teacherId, lecture.assignedTopicId);
      if (activeExt && diffDuration > 0) {
        this.addExtensionMinutesUsed(activeExt.id, diffDuration);
      }
      return updatedLec;
    } else {
      // New upload
      const newLec: Lecture = {
        ...lecture,
        unitNumber,
        durationMinutes: lecture.durationMinutes || 45,
        targetMinutesAtSubmission: lecture.targetMinutesAtSubmission || teacherTarget,
        id: `lec-${Date.now()}`,
        adminRemarks: [],
        createdAt: new Date().toISOString(),
      };
      lectures.unshift(newLec);
      this.saveLectures(lectures);

      if (lecture.assignedTopicId) {
        this.updateAssignedTopicStatus(lecture.assignedTopicId, 'completed');
      }
      const activeExt = this.getActiveExtensionForTopic(lecture.teacherId, lecture.assignedTopicId);
      if (activeExt) {
        this.addExtensionMinutesUsed(activeExt.id, newLec.durationMinutes);
      }

      return newLec;
    }
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

    // Operational Email Notification: Notify Teacher of Directive
    try {
      const targetLec = lectures[index];
      const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === targetLec.teacherId.toUpperCase());
      if (teacherObj?.email) {
        notificationService.notifyDirectivePosted({
          teacherEmail: teacherObj.email,
          teacherName: teacherObj.name || targetLec.teacherName,
          lectureTitle: targetLec.title,
          subject: targetLec.subject,
          remarkText,
          adminName,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch directive posted email:', notifyErr);
    }

    return newRemark;
  },

  // Teacher acknowledges an admin directive / remark on a lecture
  acknowledgeAdminRemark(_lectureId: string, remarkId: string, teacherName: string): boolean {
    const lectures = this.getLectures();
    let found = false;

    for (const lec of lectures) {
      if (!lec.adminRemarks) continue;
      const remark = lec.adminRemarks.find((r) => r.id === remarkId);
      if (remark) {
        remark.isAcknowledged = true;
        remark.acknowledgedAt = new Date().toISOString();
        remark.acknowledgedByName = teacherName;
        remark.isNewAckForAdmin = true;
        found = true;
        break;
      }
    }

    if (found) {
      this.saveLectures(lectures);
      this.syncToCloud().catch((err) => console.warn('[CloudSync] Immediate ack push error:', err));

      // Operational Email Notification: Notify Admins of Acknowledgment
      try {
        const adminEmails = this.getUsers().filter((u) => u.role === 'admin').map((u) => u.email).filter(Boolean);
        const ackedLec = lectures.find((l) => l.id === _lectureId || l.adminRemarks?.some((r) => r.id === remarkId));
        const targetRemark = ackedLec?.adminRemarks?.find((r) => r.id === remarkId);
        if (adminEmails.length > 0 && ackedLec) {
          notificationService.notifyDirectiveAcknowledged({
            adminEmails,
            teacherName,
            teacherId: ackedLec.teacherId,
            lectureTitle: ackedLec.title,
            subject: ackedLec.subject,
            remarkText: targetRemark?.remarkText || '',
          });
        }
      } catch (notifyErr) {
        console.warn('[Notification] Failed to dispatch directive acknowledged email:', notifyErr);
      }
    }
    return found;
  },

  // Teacher reverts or untoggles acknowledgment (if needed)
  unacknowledgeAdminRemark(_lectureId: string, remarkId: string): boolean {
    const lectures = this.getLectures();
    let found = false;

    for (const lec of lectures) {
      if (!lec.adminRemarks) continue;
      const remark = lec.adminRemarks.find((r) => r.id === remarkId);
      if (remark) {
        remark.isAcknowledged = false;
        remark.acknowledgedAt = undefined;
        remark.acknowledgedByName = undefined;
        remark.isNewAckForAdmin = false;
        found = true;
        break;
      }
    }

    if (found) {
      this.saveLectures(lectures);
      this.syncToCloud().catch((err) => console.warn('[CloudSync] Immediate unack push error:', err));
    }
    return found;
  },

  // Admin counts for directive acknowledgments
  getAdminRemarkAckStats(): {
    total: number;
    acknowledged: number;
    pending: number;
    newAcks: number;
  } {
    const lectures = this.getLectures();
    let total = 0;
    let acknowledged = 0;
    let pending = 0;
    let newAcks = 0;

    lectures.forEach((lec) => {
      lec.adminRemarks?.forEach((rem) => {
        total++;
        if (rem.isAcknowledged) {
          acknowledged++;
          if (rem.isNewAckForAdmin) {
            newAcks++;
          }
        } else {
          pending++;
        }
      });
    });

    return { total, acknowledged, pending, newAcks };
  },

  // Admin marks new directive acknowledgments as viewed
  markAdminAcksAsRead(): void {
    const lectures = this.getLectures();
    let changed = false;

    lectures.forEach((lec) => {
      lec.adminRemarks?.forEach((rem) => {
        if (rem.isNewAckForAdmin) {
          rem.isNewAckForAdmin = false;
          changed = true;
        }
      });
    });

    if (changed) {
      this.saveLectures(lectures);
    }
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
    triggerBackgroundCloudSync();
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
      // This method is currently used for first-time cutoff setup. It must not
      // manufacture a historical delivery obligation.
      isDeliveryDay: false,
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

  // Verifies if an upload right now is on time (checks teacher's standard daily cutoff time)
  isUploadOnTime(teacherId: string, topicDeadlineDate?: string): boolean {
    const now = new Date();

    // A recording cannot be on time for a topic whose due date has already passed.
    // Use local dates so the result is consistent with the rest of the daily counters.
    if (topicDeadlineDate) {
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (topicDeadlineDate < today) return false;
    }


    // Check teacher's permanent daily upload cutoff time (set once on first login)
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
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  savePptRequests(requests: PptRequest[]): void {
    localStorage.setItem(PPT_REQUESTS_KEY, JSON.stringify(requests));
    triggerBackgroundCloudSync();
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
    targetExam?: string;
    yearRange?: string;
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

    // Operational Email Notification: Notify Admins of PYQ Slide Deck Request
    try {
      const adminEmails = this.getUsers().filter((u) => u.role === 'admin').map((u) => u.email).filter(Boolean);
      if (adminEmails.length > 0) {
        notificationService.notifyPptRequested({
          adminEmails,
          teacherName: request.teacherName,
          teacherId: request.teacherId,
          subject: request.subject,
          topicTitle: request.topicTitle,
          unitNumber: request.unitNumber,
          specialInstructions: request.specialInstructions,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch PPT requested email:', notifyErr);
    }

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
    const justCompleted = updates.status === 'completed' && list[index].status !== 'completed';
    if (justCompleted) {
      updated.isNewForTeacher = true;
    }

    list[index] = updated;
    this.savePptRequests(list);

    // Operational Email Notification: Notify Teacher that PPT is ready
    if (justCompleted) {
      try {
        const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === list[index].teacherId.toUpperCase());
        if (teacherObj?.email) {
          notificationService.notifyPptReady({
            teacherEmail: teacherObj.email,
            teacherName: teacherObj.name || list[index].teacherName,
            subject: list[index].subject,
            topicTitle: list[index].topicTitle,
          });
        }
      } catch (notifyErr) {
        console.warn('[Notification] Failed to dispatch PPT ready email:', notifyErr);
      }
    }

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
    this.addDeletedId(id);
    const list = this.getPptRequests().filter((r) => r.id !== id);
    this.savePptRequests(list);
  },

  // ─── EMAIL CREDENTIALS & SENDER CONFIGURATION ───────────────────────────
  getEmailConfig(): EmailConfig {
    try {
      const stored = localStorage.getItem('aew_email_config');
      return stored ? JSON.parse(stored) : { provider: 'smtp', smtpHost: 'smtp.gmail.com', smtpPort: 465, senderName: 'AEW Academic Operations' };
    } catch {
      return { provider: 'smtp', smtpHost: 'smtp.gmail.com', smtpPort: 465, senderName: 'AEW Academic Operations' };
    }
  },

  saveEmailConfig(config: EmailConfig): void {
    localStorage.setItem('aew_email_config', JSON.stringify(config));
    this.syncToCloud().catch((err) => console.warn('[CloudSync] Email config sync error:', err));
  },

  // ─── TEACHER ON-TIME SUBMISSION PERCENTAGE & METRICS (ACCURATE MULTI-DAY & MINUTE-WEIGHTED) ──
  getOnTimeSubmissionStats(teacherId: string): {
    totalLectures: number;
    onTimeLectures: number;
    delayedLectures: number;
    extendedLectures: number;
    totalDeliveredMinutes: number;
    totalMinutes: number;
    onTimeMinutes: number;
    extendedMinutes: number;
    overdueDeliveredMinutes: number;
    unfulfilledTargetMinutes: number;
    lateMinutes: number;
    pendingLateMinutesToday: number;
    flexibleBalanceMinutes: number;
    onTimePercentage: number;
  } {
    const cleanId = (teacherId || '').toUpperCase();
    const teacherLectures = this.getLectures().filter(
      (l) => l.teacherId.toUpperCase() === cleanId
    );
    const totalLectures = teacherLectures.length;
    const onTimeLectures = teacherLectures.filter((l) => l.status === 'on_time').length;
    const extendedLectures = teacherLectures.filter((l) => l.status === 'extended').length;
    const delayedLectures = teacherLectures.filter((l) => l.status === 'overdue' || l.status === 'late' || l.status === 'extended').length;

    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === cleanId);
    const dailyTarget = teacher?.dailyTargetMinutes || 120;

    let totalOnTimeMinutes = 0;
    let totalExtendedMinutes = 0;
    let totalOverdueDeliveredMinutes = 0;

    teacherLectures.forEach((l) => {
      const duration = l.durationMinutes || 45;
      if (l.status === 'on_time') {
        totalOnTimeMinutes += duration;
      } else if (l.status === 'extended') {
        totalExtendedMinutes += duration;
      } else {
        totalOverdueDeliveredMinutes += duration;
      }
    });

    const totalDeliveredMinutes = totalOnTimeMinutes + totalExtendedMinutes + totalOverdueDeliveredMinutes;

    // Accurate true unfulfilled deficit
    const breakdown = this.getTeacherExtensionBreakdown(cleanId);
    const totalUnfulfilledMinutes = breakdown.totalUndeliveredMinutes;
    const pendingLateMinutesToday = breakdown.todayOverdueDeficit;
    const flexibleBalanceMinutes = breakdown.cumulativePoolMinutes;

    // Total active workload evaluated
    const totalLateMinutes = totalOverdueDeliveredMinutes + totalExtendedMinutes + totalUnfulfilledMinutes;
    const totalWorkloadMinutes = Math.max(totalDeliveredMinutes + totalUnfulfilledMinutes, dailyTarget);

    let onTimePercentage = 100;
    const accountableBase = totalOnTimeMinutes + totalLateMinutes;
    if (accountableBase > 0) {
      onTimePercentage = Math.max(0, Math.min(100, Math.round((totalOnTimeMinutes / accountableBase) * 100)));
    }

    return {
      totalLectures,
      onTimeLectures,
      delayedLectures,
      extendedLectures,
      totalDeliveredMinutes,
      totalMinutes: totalWorkloadMinutes,
      onTimeMinutes: totalOnTimeMinutes,
      extendedMinutes: totalExtendedMinutes,
      overdueDeliveredMinutes: totalOverdueDeliveredMinutes,
      unfulfilledTargetMinutes: totalUnfulfilledMinutes,
      lateMinutes: totalLateMinutes,
      pendingLateMinutesToday,
      flexibleBalanceMinutes,
      onTimePercentage,
    };
  },

  // Total recording minutes completed across all lectures
  getTotalRecordedMinutes(teacherId?: string): number {
    const lectures = this.getLectures();
    const filtered = teacherId 
      ? lectures.filter((l) => l.teacherId.toUpperCase() === teacherId.toUpperCase())
      : lectures;
    return filtered.reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
  },

  // Returns all administrative directives attached to lectures, with live acknowledgment statuses
  getAllDirectivesWithLectures(): Array<{
    remark: AdminRemark;
    lectureId: string;
    lectureTitle: string;
    teacherId: string;
    teacherName: string;
    subject: string;
    unitNumber?: string;
  }> {
    const lectures = this.getLectures();
    const list: Array<{
      remark: AdminRemark;
      lectureId: string;
      lectureTitle: string;
      teacherId: string;
      teacherName: string;
      subject: string;
      unitNumber?: string;
    }> = [];

    lectures.forEach((lec) => {
      lec.adminRemarks?.forEach((rem) => {
        list.push({
          remark: rem,
          lectureId: lec.id,
          lectureTitle: lec.title,
          teacherId: lec.teacherId,
          teacherName: lec.teacherName,
          subject: lec.subject,
          unitNumber: lec.unitNumber,
        });
      });
    });

    // Sort: unread/new acks first, then by timestamp desc
    return list.sort((a, b) => {
      if (a.remark.isNewAckForAdmin && !b.remark.isNewAckForAdmin) return -1;
      if (!a.remark.isNewAckForAdmin && b.remark.isNewAckForAdmin) return 1;
      const timeA = a.remark.acknowledgedAt || a.remark.createdAt || '';
      const timeB = b.remark.acknowledgedAt || b.remark.createdAt || '';
      return timeB.localeCompare(timeA);
    });
  },

  // Helper to get local date string YYYY-MM-DD from an ISO date or Date object
  toLocalDateKey(isoStringOrDate?: string | Date): string {
    if (!isoStringOrDate) return '';
    if (typeof isoStringOrDate === 'string') {
      const trimmed = isoStringOrDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
    }
    const d = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // Total recording minutes completed today by the teacher (Timezone aware)
  getMinutesRecordedToday(teacherId: string): number {
    const cleanId = (teacherId || '').toUpperCase();
    const lectures = this.getLectures();
    const todayLocal = this.toLocalDateKey(new Date());

    const todayLectures = lectures.filter((l) => {
      if (l.teacherId.toUpperCase() !== cleanId) return false;
      return this.toLocalDateKey(l.createdAt) === todayLocal;
    });

    return todayLectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
  },

  getUploadsToday(teacherId: string): number {
    const cleanId = (teacherId || '').toUpperCase();
    const lectures = this.getLectures();
    const todayLocal = this.toLocalDateKey(new Date());

    return lectures.filter((l) => {
      if (l.teacherId.toUpperCase() !== cleanId) return false;
      return this.toLocalDateKey(l.createdAt) === todayLocal;
    }).length;
  },

  // Total recording minutes completed on a specific date (YYYY-MM-DD)
  getMinutesRecordedOnDate(teacherId: string, targetDateStr: string): number {
    const cleanId = (teacherId || '').toUpperCase();
    const lectures = this.getLectures();
    return lectures
      .filter((l) => {
        if (l.teacherId.toUpperCase() !== cleanId) return false;
        return this.toLocalDateKey(l.createdAt) === targetDateStr;
      })
      .reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
  },

  getHistoricalTargetForDate(
    teacherId: string,
    date: string,
    lecturesForDate: Lecture[],
    commitments: DailyCommitment[]
  ): number {
    const cleanId = (teacherId || '').toUpperCase();

    // Dates prior to the teacher's official joining / first login date are NOT subject to quotas
    const startDate = this.getTeacherEffectiveStartDate(cleanId);
    if (date < startDate) {
      return 0;
    }

    // If faculty was granted an approved Day Off / Leave on this date, target is 0 min (excused)
    if (this.isDayOff(cleanId, date)) {
      return 0;
    }

    const lectureTarget = lecturesForDate.find(
      (l) => Number.isFinite(l.targetMinutesAtSubmission) && (l.targetMinutesAtSubmission || 0) > 0
    )?.targetMinutesAtSubmission;

    if (lectureTarget) return lectureTarget;

    const commitment = commitments.find(
      (c) => c.date === date && c.teacherId.toUpperCase() === cleanId
    );

    if (commitment && commitment.isDeliveryDay !== false) {
      if (commitment.targetMinutes && commitment.targetMinutes > 0) {
        return commitment.targetMinutes;
      }
      const anyLectureSnapshot = this.getLectures().find(
        (l) => l.teacherId.toUpperCase() === cleanId && Number.isFinite(l.targetMinutesAtSubmission) && (l.targetMinutesAtSubmission || 0) > 0
      )?.targetMinutesAtSubmission;
      if (anyLectureSnapshot) return anyLectureSnapshot;
    }

    // Default required quota for active working days: only permitted leaves and pre-joining dates are excused.
    const user = this.getUsers().find((u) => u.teacherId.toUpperCase() === cleanId);
    return user?.dailyTargetMinutes || 120;
  },

  getDailyTargetForDate(teacherId: string, date: string, dayLectures?: Lecture[]): number {
    const cleanId = (teacherId || '').toUpperCase();
    const lectures = dayLectures || this.getLectures().filter(
      (lecture) => lecture.teacherId.toUpperCase() === cleanId && this.toLocalDateKey(lecture.createdAt) === date
    );
    const commitments = this.getDailyCommitments().filter((c) => c.teacherId.toUpperCase() === cleanId);
    return this.getHistoricalTargetForDate(cleanId, date, lectures, commitments);
  },

  // ─── TIME WALLET (PIGGY BANK) & LATE BACKLOG DECOUPLED SYSTEMS ────────────

  getWalletTransactions(teacherId?: string): WalletTransaction[] {
    const data = localStorage.getItem(WALLET_TRANSACTIONS_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      if (!teacherId) return parsed;
      const cleanId = teacherId.trim().toUpperCase();
      return parsed.filter((tx: WalletTransaction) => tx.teacherId.toUpperCase() === cleanId);
    } catch {
      return [];
    }
  },

  saveWalletTransactions(transactions: WalletTransaction[]): void {
    localStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(transactions));
    triggerBackgroundCloudSync();
  },

  // Synchronize/ensure all eligible lecture surplus deposits are generated idempotently
  syncLectureSurplusDeposits(teacherId: string): void {
    const cleanId = (teacherId || '').trim().toUpperCase();
    if (!cleanId) return;

    const teacherLectures = this.getLectures().filter((l) => l.teacherId.toUpperCase() === cleanId);
    const commitments = this.getDailyCommitments().filter((c) => c.teacherId.toUpperCase() === cleanId);

    // Group lectures by date
    const lecturesByDate = new Map<string, Lecture[]>();
    teacherLectures.forEach((l) => {
      const dStr = this.toLocalDateKey(l.createdAt);
      if (dStr) {
        if (!lecturesByDate.has(dStr)) lecturesByDate.set(dStr, []);
        lecturesByDate.get(dStr)!.push(l);
      }
    });

    let existingTxs = this.getWalletTransactions();
    const existingDepositMap = new Map<string, WalletTransaction>();
    existingTxs.forEach((tx) => {
      if (tx.teacherId.toUpperCase() === cleanId && tx.type === 'deposit_surplus' && tx.referenceLectureId) {
        existingDepositMap.set(tx.referenceLectureId, tx);
      }
    });

    let hasNew = false;
    lecturesByDate.forEach((dayLectures, dateStr) => {
      const dayTarget = this.getHistoricalTargetForDate(cleanId, dateStr, dayLectures, commitments);
      let cumulativeRecorded = 0;

      // Sort lectures on that day in strict chronological order
      const sortedDayLectures = dayLectures.slice().sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      sortedDayLectures.forEach((lecture) => {
        const prevRecorded = cumulativeRecorded;
        const dur = lecture.durationMinutes || 45;
        cumulativeRecorded += dur;

        // Any duration portion that pushes cumulative total past the day's target is surplus!
        let surplusEarned = 0;
        if (cumulativeRecorded > dayTarget) {
          const effectiveStart = Math.max(prevRecorded, dayTarget);
          surplusEarned = cumulativeRecorded - effectiveStart;
        }

        const existing = existingDepositMap.get(lecture.id);

        if (surplusEarned > 0) {
          const depositId = `wtx-deposit-${lecture.id}`;
          if (!existing) {
            existingTxs.push({
              id: depositId,
              teacherId: cleanId,
              type: 'deposit_surplus',
              amount: surplusEarned,
              date: dateStr,
              referenceLectureId: lecture.id,
              note: `Earned +${surplusEarned}m surplus on ${dateStr} (exceeded ${dayTarget}m target)`,
              appliedBy: 'System',
              createdAt: lecture.createdAt || new Date().toISOString(),
            });
            hasNew = true;
          } else if (existing.amount !== surplusEarned) {
            existing.amount = surplusEarned;
            hasNew = true;
          }
        } else if (existing) {
          // Clean up stale surplus deposit if duration was reduced below target
          existingTxs = existingTxs.filter((tx) => tx.id !== existing.id);
          existingDepositMap.delete(lecture.id);
          hasNew = true;
        }
      });
    });

    if (hasNew) {
      this.saveWalletTransactions(existingTxs);
    }
  },

  getTimeWalletInfo(teacherId: string): TimeWalletInfo {
    const cleanId = (teacherId || '').trim().toUpperCase();
    if (!cleanId) {
      return { balance: 0, totalSurplusEarned: 0, totalAppliedToBacklog: 0, transactions: [] };
    }

    this.syncLectureSurplusDeposits(cleanId);

    const txs = this.getWalletTransactions(cleanId);
    let totalSurplusEarned = 0;
    let totalAppliedToBacklog = 0;
    let manualAdjustments = 0;

    txs.forEach((tx) => {
      if (tx.type === 'deposit_surplus') {
        totalSurplusEarned += (tx.amount || 0);
      } else if (tx.type === 'apply_to_backlog') {
        totalAppliedToBacklog += (tx.amount || 0);
      } else if (tx.type === 'manual_adjustment') {
        manualAdjustments += (tx.amount || 0);
      }
    });

    const balance = Math.max(0, totalSurplusEarned + manualAdjustments - totalAppliedToBacklog);
    return {
      balance,
      totalSurplusEarned,
      totalAppliedToBacklog,
      transactions: txs.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    };
  },

  getTeacherDailyLogs(teacherId: string): TeacherDailyLogsInfo {
    const cleanId = (teacherId || '').trim().toUpperCase();
    const now = new Date();
    const todayStr = this.toLocalDateKey(now);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = this.toLocalDateKey(yesterday);

    const teacher = this.getUsers().find((u) => u.teacherId.toUpperCase() === cleanId);
    const standardDailyTarget = teacher?.dailyTargetMinutes || 120;

    const teacherLectures = this.getLectures().filter((l) => l.teacherId.toUpperCase() === cleanId);
    const commitments = this.getDailyCommitments().filter((c) => c.teacherId.toUpperCase() === cleanId);
    const dayOffGrants = this.getDayOffGrants().filter((g) => g.teacherId.toUpperCase() === cleanId);

    // Backlog tracking begins from the official joining date or first login date
    const startDateStr = this.getTeacherEffectiveStartDate(cleanId);

    // Generate EVERY single continuous calendar date from startDateStr up to todayStr
    const allDates = new Set<string>();
    const iterDate = new Date(startDateStr + 'T12:00:00');
    const todayDateObj = new Date(todayStr + 'T12:00:00');

    // Ensure today and yesterday are included
    allDates.add(todayStr);
    allDates.add(yesterdayStr);

    // If teacher recorded lectures before startDateStr, include those dates as well
    teacherLectures.forEach((l) => {
      const d = this.toLocalDateKey(l.createdAt);
      if (d) allDates.add(d);
    });

    let safetyCount = 180;
    while (iterDate <= todayDateObj && safetyCount > 0) {
      allDates.add(this.toLocalDateKey(iterDate));
      iterDate.setDate(iterDate.getDate() + 1);
      safetyCount--;
    }

    const lecturesByDate = new Map<string, Lecture[]>();
    teacherLectures.forEach((l) => {
      const d = this.toLocalDateKey(l.createdAt);
      if (d) {
        if (!lecturesByDate.has(d)) lecturesByDate.set(d, []);
        lecturesByDate.get(d)!.push(l);
      }
    });

    let totalHistoricalShortfall = 0;
    let shortfallDaysCount = 0;
    let surplusDaysCount = 0;
    let completedDaysCount = 0;
    let leaveDaysCount = 0;

    // Sort descending (newest first: Today -> Yesterday -> Older)
    const sortedDatesDesc = Array.from(allDates).sort((a, b) => b.localeCompare(a));

    const logs: DailyBacklogLog[] = sortedDatesDesc.map((date) => {
      const isToday = date === todayStr;
      const isYesterday = date === yesterdayStr;
      const dayLectures = lecturesByDate.get(date) || [];
      const recordedMinutes = dayLectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
      
      const isDayOff = this.isDayOff(cleanId, date);
      const dayOffGrant = dayOffGrants.find((g) => {
        if (g.date === date) return true;
        if (g.endDate && g.date <= date && date <= g.endDate) return true;
        return false;
      });
      const dayOffReason = dayOffGrant?.reason || (isDayOff ? 'Approved Leave' : undefined);

      let dailyTarget = 0;
      if (isDayOff) {
        dailyTarget = 0;
      } else if (isToday) {
        dailyTarget = standardDailyTarget;
      } else {
        dailyTarget = this.getHistoricalTargetForDate(cleanId, date, dayLectures, commitments);
      }

      const shortfall = Math.max(0, dailyTarget - recordedMinutes);
      const surplus = Math.max(0, recordedMinutes - dailyTarget);

      if (!isToday && shortfall > 0) {
        totalHistoricalShortfall += shortfall;
        shortfallDaysCount += 1;
      }
      if (surplus > 0) {
        surplusDaysCount += 1;
      } else if (!isDayOff && dailyTarget > 0 && recordedMinutes >= dailyTarget) {
        completedDaysCount += 1;
      }
      if (isDayOff) {
        leaveDaysCount += 1;
      }

      let status: DailyLogStatus = 'completed';
      if (isToday) {
        status = (recordedMinutes >= dailyTarget && dailyTarget > 0)
          ? (surplus > 0 ? 'surplus' : 'completed')
          : 'in_progress';
      } else if (isDayOff) {
        status = 'leave';
      } else if (shortfall > 0) {
        status = 'shortfall';
      } else if (surplus > 0) {
        status = 'surplus';
      } else {
        status = 'completed';
      }

      const dObj = new Date(date + 'T12:00:00');
      const dayOfWeek = isNaN(dObj.getTime())
        ? ''
        : dObj.toLocaleDateString(undefined, { weekday: 'long' });
      const formattedDate = isNaN(dObj.getTime())
        ? date
        : dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

      return {
        date,
        dayOfWeek,
        formattedDate,
        isToday,
        isYesterday,
        dailyTarget,
        recordedMinutes,
        shortfall,
        surplus,
        isDayOff,
        dayOffReason,
        status,
        lectures: dayLectures,
        lectureCount: dayLectures.length,
      };
    });

    const walletInfo = this.getTimeWalletInfo(cleanId);
    const walletMinutesApplied = walletInfo.totalAppliedToBacklog;
    const remainingBacklogMinutes = Math.max(0, totalHistoricalShortfall - walletMinutesApplied);

    return {
      teacherId: cleanId,
      joiningDate: teacher?.joiningDate || startDateStr,
      effectiveStartDate: startDateStr,
      totalHistoricalShortfall,
      totalSurplusEarned: walletInfo.totalSurplusEarned,
      walletMinutesApplied,
      remainingBacklogMinutes,
      totalDaysLogged: logs.length,
      shortfallDaysCount,
      surplusDaysCount,
      completedDaysCount,
      leaveDaysCount,
      logs,
    };
  },

  getLateBacklogInfo(teacherId: string): {
    rawHistoricalShortfall: number;
    walletMinutesApplied: number;
    remainingBacklogMinutes: number;
    pastSessionsMissedCount: number;
    history: Array<DailyBacklogLog>;
  } {
    const cleanId = (teacherId || '').trim().toUpperCase();
    const dailyLogs = this.getTeacherDailyLogs(cleanId);

    // Historical past days only (sorted ascending for backwards compatibility with chart views)
    const pastLogs = dailyLogs.logs
      .filter((l) => !l.isToday)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      rawHistoricalShortfall: dailyLogs.totalHistoricalShortfall,
      walletMinutesApplied: dailyLogs.walletMinutesApplied,
      remainingBacklogMinutes: dailyLogs.remainingBacklogMinutes,
      pastSessionsMissedCount: dailyLogs.shortfallDaysCount,
      history: pastLogs,
    };
  },


  applyWalletToBacklog(
    teacherId: string,
    minutesToApply: number,
    appliedBy: string = 'Teacher',
    note?: string
  ): {
    success: boolean;
    appliedMinutes: number;
    newWalletBalance: number;
    remainingBacklog: number;
    message: string;
  } {
    const cleanId = (teacherId || '').trim().toUpperCase();
    const walletInfo = this.getTimeWalletInfo(cleanId);
    const backlogInfo = this.getLateBacklogInfo(cleanId);

    if (walletInfo.balance <= 0) {
      return {
        success: false,
        appliedMinutes: 0,
        newWalletBalance: 0,
        remainingBacklog: backlogInfo.remainingBacklogMinutes,
        message: 'Time Wallet balance is 0. No surplus available to apply.',
      };
    }

    if (backlogInfo.remainingBacklogMinutes <= 0) {
      return {
        success: false,
        appliedMinutes: 0,
        newWalletBalance: walletInfo.balance,
        remainingBacklog: 0,
        message: 'No outstanding late backlog to offset.',
      };
    }

    const actualToApply = Math.min(minutesToApply, walletInfo.balance, backlogInfo.remainingBacklogMinutes);
    if (actualToApply <= 0) {
      return {
        success: false,
        appliedMinutes: 0,
        newWalletBalance: walletInfo.balance,
        remainingBacklog: backlogInfo.remainingBacklogMinutes,
        message: 'Invalid minutes amount specified.',
      };
    }

    const tx: WalletTransaction = {
      id: `wtx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      teacherId: cleanId,
      type: 'apply_to_backlog',
      amount: actualToApply,
      date: this.toLocalDateKey(new Date()),
      note: note || `Applied ${actualToApply}m from Time Wallet to offset historical late backlog`,
      appliedBy,
      createdAt: new Date().toISOString(),
    };

    const list = this.getWalletTransactions();
    list.unshift(tx);
    this.saveWalletTransactions(list);

    const updatedWallet = this.getTimeWalletInfo(cleanId);
    const updatedBacklog = this.getLateBacklogInfo(cleanId);

    return {
      success: true,
      appliedMinutes: actualToApply,
      newWalletBalance: updatedWallet.balance,
      remainingBacklog: updatedBacklog.remainingBacklogMinutes,
      message: `Successfully transferred ${actualToApply}m from Time Wallet to offset late backlog!`,
    };
  },

  // Backwards-compatible Cumulative Pool adapter (uses Time Wallet and Decoupled Backlog)
  getTeacherCumulativePool(teacherId: string): {
    bankedMinutes: number;           // Current available flexible balance
    totalSurplusEarned: number;      // Lifetime extra minutes recorded beyond daily targets
    totalDeficitCompensated: number; // Deficit minutes compensated for lighter/missed days
    yesterdayCompensated: number;    // How many minutes of yesterday's deficit were covered by pool
    todayCompensated: number;        // How many minutes of today's deficit were covered by pool
    historicalBacklogMinutes: number; // Pure historical time deficit before today
    rawHistoricalShortfall: number;
    timeWalletBalance: number;
    history: Array<{
      date: string;
      recordedMinutes: number;
      dailyTarget: number;
      surplusGenerated: number;
      shortfall: number;
      poolUsed: number;
      poolBalanceAfter: number;
      debtBalanceAfter: number;
    }>;
  } {
    const cleanId = (teacherId || '').toUpperCase();
    const walletInfo = this.getTimeWalletInfo(cleanId);
    const backlogInfo = this.getLateBacklogInfo(cleanId);

    const history = backlogInfo.history.map((h) => ({
      date: h.date,
      recordedMinutes: h.recordedMinutes,
      dailyTarget: h.dailyTarget,
      surplusGenerated: h.surplus,
      shortfall: h.shortfall,
      poolUsed: 0,
      poolBalanceAfter: walletInfo.balance,
      debtBalanceAfter: backlogInfo.remainingBacklogMinutes,
    }));

    return {
      bankedMinutes: walletInfo.balance,
      timeWalletBalance: walletInfo.balance,
      totalSurplusEarned: walletInfo.totalSurplusEarned,
      totalDeficitCompensated: walletInfo.totalAppliedToBacklog,
      yesterdayCompensated: 0,
      todayCompensated: 0,
      historicalBacklogMinutes: backlogInfo.remainingBacklogMinutes,
      rawHistoricalShortfall: backlogInfo.rawHistoricalShortfall,
      history,
    };
  },

    // Calculate unfulfilled lecture minutes from previous day(s) that must be fulfilled before target reset
  getPreviousDayBacklog(teacherId: string): {
    yesterdayDateStr: string;
    yesterdayRecorded: number;
    yesterdayTarget: number;
    yesterdayUnfulfilledMinutes: number;
    yesterdayPoolCompensated: number;
    isYesterdayFulfilled: boolean;
    minutesRecordedToday: number;
    todayTarget: number;
    remainingMinutesToday: number;
    isTodayTargetMet: boolean;
    cumulativePoolMinutes: number;
    timeWalletBalance: number;
    historicalBacklogMinutes: number;
    rawHistoricalShortfall: number;
  } {
    const cleanId = (teacherId || '').toUpperCase();
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayDateStr = this.toLocalDateKey(yesterday);

    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === cleanId);
    const dailyTarget = teacher?.dailyTargetMinutes || 120;

    const walletInfo = this.getTimeWalletInfo(cleanId);
    const backlogInfo = this.getLateBacklogInfo(cleanId);

    const yesterdayLectures = this.getLectures().filter(
      (lecture) => lecture.teacherId.toUpperCase() === cleanId && this.toLocalDateKey(lecture.createdAt) === yesterdayDateStr
    );
    const yesterdayRecorded = yesterdayLectures.reduce((sum, lecture) => sum + (lecture.durationMinutes || 45), 0);
    const commitments = this.getDailyCommitments().filter((c) => c.teacherId.toUpperCase() === cleanId);
    const yesterdayTarget = this.getHistoricalTargetForDate(cleanId, yesterdayDateStr, yesterdayLectures, commitments);

    const rawShortfall = Math.max(0, yesterdayTarget - yesterdayRecorded);
    // Net shortfall after factoring in teacher's total remaining backlog
    const yesterdayUnfulfilledMinutes = Math.min(rawShortfall, backlogInfo.remainingBacklogMinutes);
    const isYesterdayFulfilled = yesterdayUnfulfilledMinutes === 0;

    const minutesRecordedToday = this.getMinutesRecordedToday(cleanId);
    const remainingMinutesToday = Math.max(0, dailyTarget - minutesRecordedToday);
    const isTodayTargetMet = minutesRecordedToday >= dailyTarget;

    return {
      yesterdayDateStr,
      yesterdayRecorded,
      yesterdayTarget,
      yesterdayUnfulfilledMinutes,
      yesterdayPoolCompensated: walletInfo.totalAppliedToBacklog,
      isYesterdayFulfilled,
      minutesRecordedToday,
      todayTarget: dailyTarget,
      remainingMinutesToday,
      isTodayTargetMet,
      cumulativePoolMinutes: walletInfo.balance,
      timeWalletBalance: walletInfo.balance,
      historicalBacklogMinutes: backlogInfo.remainingBacklogMinutes,
      rawHistoricalShortfall: backlogInfo.rawHistoricalShortfall,
    };
  },

    // ─── TIME REMAINING TO SUBMIT TODAY'S LECTURE & STATUS ───────────────────────
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
    maxDailyMinutes: number;
    extraMinutesRecorded: number;
    remainingMaxMinutes: number;
    remainingMinutesToday: number;
    yesterdayUnfulfilledMinutes: number;
    isYesterdayFulfilled: boolean;
    cumulativePoolMinutes: number;
  } {
    const now = new Date();
    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === teacherId.toUpperCase());
    const commitment = this.getDailyCommitment(teacherId);
    const cutoffTime = teacher?.dailyUploadCutoffTime || commitment?.promisedTime || '20:00';

    const backlogInfo = this.getPreviousDayBacklog(teacherId);
    const todayDateKey = this.toLocalDateKey(now);
    const isTodayDayOff = this.isDayOff(teacherId, todayDateKey);
    const startDateStr = this.getTeacherEffectiveStartDate(teacherId);
    const isPreJoining = todayDateKey < startDateStr;
    const targetMinutes = (isTodayDayOff || isPreJoining) ? 0 : (teacher?.dailyTargetMinutes || 120);
    const maxDailyMinutes = teacher?.maxDailyMinutes || (targetMinutes * 2 || 240);
    const minutesRecordedToday = this.getMinutesRecordedToday(teacherId);
    const isTargetMet = (isTodayDayOff || isPreJoining) || (minutesRecordedToday >= targetMinutes);
    const remainingMinutesToday = Math.max(0, targetMinutes - minutesRecordedToday);
    const extraMinutesRecorded = Math.max(0, minutesRecordedToday - targetMinutes);
    const remainingMaxMinutes = Math.max(0, maxDailyMinutes - minutesRecordedToday);

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
      maxDailyMinutes,
      extraMinutesRecorded,
      remainingMaxMinutes,
      remainingMinutesToday,
      yesterdayUnfulfilledMinutes: backlogInfo.yesterdayUnfulfilledMinutes,
      isYesterdayFulfilled: backlogInfo.isYesterdayFulfilled,
      cumulativePoolMinutes: backlogInfo.cumulativePoolMinutes,
    };
  },

  // ─── DAY OFF / APPROVED LEAVE MANAGEMENT ─────────────────────────────────────
  getDayOffGrants(): DayOffGrant[] {
    const data = localStorage.getItem(DAY_OFF_GRANTS_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveDayOffGrants(grants: DayOffGrant[]): void {
    localStorage.setItem(DAY_OFF_GRANTS_KEY, JSON.stringify(grants));
    triggerBackgroundCloudSync();
  },

  getTeacherDayOffs(teacherId: string): DayOffGrant[] {
    const cleanId = (teacherId || '').toUpperCase();
    return this.getDayOffGrants().filter((g) => g.teacherId.toUpperCase() === cleanId);
  },

  getDayOffForDate(teacherId: string, targetDateStr: string): DayOffGrant | undefined {
    const cleanId = (teacherId || '').toUpperCase();
    const cleanTarget = this.toLocalDateKey(targetDateStr);
    const grants = this.getDayOffGrants();

    return grants.find((g) => {
      if (g.teacherId.toUpperCase() !== cleanId) return false;
      const gStart = this.toLocalDateKey(g.date);
      const gEnd = g.endDate ? this.toLocalDateKey(g.endDate) : gStart;
      return cleanTarget >= gStart && cleanTarget <= gEnd;
    });
  },

  isDayOff(teacherId: string, targetDateStr: string): boolean {
    return !!this.getDayOffForDate(teacherId, targetDateStr);
  },

  grantDayOff(params: {
    teacherId: string;
    teacherName: string;
    date: string;
    endDate?: string;
    reason: string;
    grantedBy?: string;
    notes?: string;
  }): DayOffGrant {
    const cleanDate = this.toLocalDateKey(params.date);
    const cleanEndDate = params.endDate ? this.toLocalDateKey(params.endDate) : undefined;
    const grants = this.getDayOffGrants();

    // Check if an existing grant covers this exact date/teacher to avoid duplicates
    const existingIndex = grants.findIndex(
      (g) => g.teacherId.toUpperCase() === params.teacherId.toUpperCase() && this.toLocalDateKey(g.date) === cleanDate
    );

    const newGrant: DayOffGrant = {
      id: existingIndex !== -1 ? grants[existingIndex].id : `leave-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      teacherId: params.teacherId.toUpperCase(),
      teacherName: params.teacherName,
      date: cleanDate,
      endDate: cleanEndDate,
      reason: params.reason,
      grantedBy: params.grantedBy || 'Academic Operations',
      grantedAt: new Date().toISOString(),
      notes: params.notes,
    };

    if (existingIndex !== -1) {
      grants[existingIndex] = newGrant;
    } else {
      grants.unshift(newGrant);
    }

    this.saveDayOffGrants(grants);

    // Operational Notification: Notify Teacher of Granted Leave
    try {
      const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === params.teacherId.toUpperCase());
      if (teacherObj?.email) {
        notificationService.notifyDayOffGranted({
          teacherEmail: teacherObj.email,
          teacherName: teacherObj.name || params.teacherName,
          teacherId: params.teacherId,
          date: cleanDate,
          endDate: cleanEndDate,
          reason: params.reason,
          grantedBy: params.grantedBy || 'Academic Operations',
        }).catch(() => {});
      }
    } catch {
      // non-blocking
    }

    return newGrant;
  },

  revokeDayOff(grantId: string): void {
    const grants = this.getDayOffGrants().filter((g) => g.id !== grantId);
    this.saveDayOffGrants(grants);
  },

  // ─── ADMIN NOTIFICATION BADGES FOR TEACHER ───────────────────────────────────
  getTeacherAdminNotificationCounts(teacherId: string): {
    syllabus: number;
    revisions: number;
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

    // Specifically count revision requests
    const revisionTopics = this.getAssignedTopics().filter(
      (t) => t.teacherId.toUpperCase() === cleanId &&
             t.status !== 'completed' &&
             t.subtopicsApprovalState === 'revision_requested'
    );
    const revisions = revisionTopics.length;

    // 2. Directives: Unacknowledged remarks from admin on teacher's lectures
    const lectures = this.getLectures().filter((l) => l.teacherId.toUpperCase() === cleanId);
    let directives = 0;
    lectures.forEach((lec) => {
      directives += lec.adminRemarks?.filter((r) => !r.isAcknowledged).length || 0;
    });

    // 3. PPT: Ready completed PPTs waiting for download
    const pptRequests = this.getTeacherPptRequests(cleanId).filter(
      (r) => r.status === 'completed' && r.isNewForTeacher
    );
    const ppt = pptRequests.length;

    // 4. Resources: Available materials for this teacher's subject
    const teacherUser = this.getUsers().find((u) => u.teacherId.toUpperCase() === cleanId);
    const teacherSubj = (teacherUser?.subject || '').toLowerCase().trim();
    const resources = this.getSubjectReferences().filter((r) => {
      const s = r.subjectName.toLowerCase().trim();
      return r.isNewFromAdmin || (teacherSubj && (s.includes(teacherSubj) || teacherSubj.includes(s)));
    }).length;

    return {
      syllabus,
      revisions,
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
        } catch {
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

  // ─── MASTER CLOUD PERSISTENCE & MULTI-DEVICE SYNC ───────────────────────────
  exportMasterState() {
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      deletedIds: this.getDeletedIds(),
      users: this.getUsers(),
      assignedTopics: this.getAssignedTopics(),
      lectures: this.getLectures(),
      subjectReferences: this.getSubjectReferences(),
      dailyCommitments: this.getDailyCommitments(),
      pptRequests: this.getPptRequests(),
      extensions: this.getExtensions(),
      walletTransactions: this.getWalletTransactions(),
      dayOffGrants: this.getDayOffGrants(),
      emailConfig: this.getEmailConfig(),
    };
  },

  importMasterState(state: any): void {
    if (!state || typeof state !== 'object') return;

    const deletedIds = new Set<string>([
      ...this.getDeletedIds(),
      ...(Array.isArray(state.deletedIds) ? state.deletedIds.map((id: string) => id.toUpperCase()) : []),
    ]);

    if (deletedIds.size > 0) {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deletedIds)));
    }

    if (state.emailConfig && typeof state.emailConfig === 'object') {
      localStorage.setItem('aew_email_config', JSON.stringify(state.emailConfig));
    }

    if (Array.isArray(state.users) && state.users.length > 0) {
      const existingUsers = this.getUsers();
      const userMap = new Map<string, User>();
      existingUsers.forEach((u) => {
        if (!deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase())) {
          userMap.set(u.teacherId.toUpperCase(), u);
        }
      });
      state.users.forEach((u: User) => {
        if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase())) {
          userMap.set(u.teacherId.toUpperCase(), u);
        }
      });
      localStorage.setItem(USERS_KEY, JSON.stringify(Array.from(userMap.values())));
    }

    if (Array.isArray(state.assignedTopics)) {
      const localTopics = this.getAssignedTopics();
      const localMap = new Map<string, AssignedTopic>();
      localTopics.forEach((t) => localMap.set(t.id, t));

      const mergedTopics = state.assignedTopics
        .filter((t: AssignedTopic) => !deletedIds.has(t.id.toUpperCase()))
        .map((cloudTopic: AssignedTopic) => {
          const localTopic = localMap.get(cloudTopic.id);
          if (!localTopic) return cloudTopic;

          const localTime = localTopic.updatedAt ? new Date(localTopic.updatedAt).getTime() : 0;
          const cloudTime = cloudTopic.updatedAt ? new Date(cloudTopic.updatedAt).getTime() : 0;

          if (localTime >= cloudTime) {
            return localTopic;
          }

          return {
            ...cloudTopic,
            displayOrder: cloudTopic.displayOrder !== undefined ? cloudTopic.displayOrder : localTopic.displayOrder,
            subtopics: (cloudTopic.subtopics && cloudTopic.subtopics.length > 0)
              ? cloudTopic.subtopics
              : (localTopic.subtopics || []),
            subtopicItems: (cloudTopic.subtopicItems && cloudTopic.subtopicItems.length > 0)
              ? cloudTopic.subtopicItems
              : (localTopic.subtopicItems || []),
            proposedSubtopics: (cloudTopic.proposedSubtopics && cloudTopic.proposedSubtopics.length > 0)
              ? cloudTopic.proposedSubtopics
              : (localTopic.proposedSubtopics || []),
            // The cloud record won on updatedAt, so preserve its workflow state.
            subtopicsApprovalState: cloudTopic.subtopicsApprovalState || localTopic.subtopicsApprovalState || 'pending_teacher_input',
          };
        });

      localTopics.forEach((locTopic) => {
        if (!deletedIds.has(locTopic.id.toUpperCase()) && !mergedTopics.some((mt: AssignedTopic) => mt.id === locTopic.id)) {
          mergedTopics.unshift(locTopic);
        }
      });

      localStorage.setItem(ASSIGNED_TOPICS_KEY, JSON.stringify(mergedTopics));
    }

    if (Array.isArray(state.lectures)) {
      const localLectures = this.getLectures();
      const localMap = new Map<string, Lecture>();
      localLectures.forEach((l) => localMap.set(l.id, l));

      const mergedLectures = state.lectures
        .filter((l: Lecture) => !deletedIds.has(l.id.toUpperCase()))
        .map((cloudLec: Lecture) => {
          const localLec = localMap.get(cloudLec.id);
          if (!localLec) return cloudLec;

          const localRemarksMap = new Map<string, AdminRemark>();
          (localLec.adminRemarks || []).forEach((r) => localRemarksMap.set(r.id, r));

          const mergedRemarks = (cloudLec.adminRemarks || []).map((cloudRem) => {
            const localRem = localRemarksMap.get(cloudRem.id);
            if (!localRem) return cloudRem;
            const isAck = Boolean(localRem.isAcknowledged || cloudRem.isAcknowledged);
            return {
              ...cloudRem,
              ...localRem,
              isAcknowledged: isAck,
              acknowledgedAt: isAck ? (localRem.acknowledgedAt || cloudRem.acknowledgedAt || new Date().toISOString()) : undefined,
              acknowledgedByName: isAck ? (localRem.acknowledgedByName || cloudRem.acknowledgedByName) : undefined,
              isNewAckForAdmin: isAck ? (localRem.isNewAckForAdmin ?? cloudRem.isNewAckForAdmin ?? true) : false,
            };
          });

          (localLec.adminRemarks || []).forEach((lr) => {
            if (!mergedRemarks.some((mr) => mr.id === lr.id)) {
              mergedRemarks.push(lr);
            }
          });

          return {
            ...cloudLec,
            ...localLec,
            adminRemarks: mergedRemarks,
          };
        });

      localLectures.forEach((locLec) => {
        if (!deletedIds.has(locLec.id.toUpperCase()) && !mergedLectures.some((ml: Lecture) => ml.id === locLec.id)) {
          mergedLectures.unshift(locLec);
        }
      });

      localStorage.setItem(LECTURES_KEY, JSON.stringify(mergedLectures));
    }

    if (Array.isArray(state.subjectReferences)) {
      const filtered = state.subjectReferences.filter((r: SubjectReference) => !deletedIds.has(r.id.toUpperCase()));
      localStorage.setItem(SUBJECT_REFERENCES_KEY, JSON.stringify(filtered));
    }

    if (Array.isArray(state.dailyCommitments)) {
      localStorage.setItem(DAILY_COMMITMENTS_KEY, JSON.stringify(state.dailyCommitments));
    }

    if (Array.isArray(state.pptRequests)) {
      const filtered = state.pptRequests.filter((p: PptRequest) => !deletedIds.has(p.id.toUpperCase()));
      localStorage.setItem(PPT_REQUESTS_KEY, JSON.stringify(filtered));
    }

    if (Array.isArray(state.extensions)) {
      const localExts = this.getExtensions();
      const localMap = new Map<string, LectureExtension>();
      localExts.forEach((e) => localMap.set(e.id, e));

      const mergedExtensions: LectureExtension[] = (state.extensions as LectureExtension[])
        .filter((e: LectureExtension) => !deletedIds.has(e.id.toUpperCase()))
        .map((cloudExt: LectureExtension): LectureExtension => {
          const localExt = localMap.get(cloudExt.id);
          if (!localExt) return cloudExt;

          const localTime = localExt.updatedAt ? new Date(localExt.updatedAt).getTime() : 0;
          const cloudTime = cloudExt.updatedAt ? new Date(cloudExt.updatedAt).getTime() : 0;

          if (localTime > cloudTime) {
            return localExt;
          }
          return {
            ...cloudExt,
            usedMinutes: Math.max(cloudExt.usedMinutes || 0, localExt.usedMinutes || 0),
          };
        });

      localExts.forEach((locExt: LectureExtension) => {
        if (!deletedIds.has(locExt.id.toUpperCase()) && !mergedExtensions.some((me: LectureExtension) => me.id === locExt.id)) {
          mergedExtensions.unshift(locExt);
        }
      });

      localStorage.setItem(EXTENSIONS_KEY, JSON.stringify(mergedExtensions));
    }

    if (Array.isArray(state.walletTransactions)) {
      const localTxs = this.getWalletTransactions();
      const localMap = new Map<string, WalletTransaction>();
      localTxs.forEach((w) => localMap.set(w.id, w));

      const mergedTxs: WalletTransaction[] = (state.walletTransactions as WalletTransaction[])
        .filter((w: WalletTransaction) => !deletedIds.has(w.id.toUpperCase()))
        .map((cloudTx: WalletTransaction): WalletTransaction => {
          const localTx = localMap.get(cloudTx.id);
          if (!localTx) return cloudTx;
          return {
            ...cloudTx,
            ...localTx,
          };
        });

      localTxs.forEach((locTx: WalletTransaction) => {
        if (!deletedIds.has(locTx.id.toUpperCase()) && !mergedTxs.some((mt: WalletTransaction) => mt.id === locTx.id)) {
          mergedTxs.unshift(locTx);
        }
      });

      localStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(mergedTxs));
    }

    if (Array.isArray(state.dayOffGrants)) {
      const localGrants = this.getDayOffGrants();
      const localMap = new Map<string, DayOffGrant>();
      localGrants.forEach((g) => localMap.set(g.id, g));

      const mergedGrants: DayOffGrant[] = (state.dayOffGrants as DayOffGrant[])
        .filter((g: DayOffGrant) => !deletedIds.has(g.id.toUpperCase()))
        .map((cloudGrant: DayOffGrant): DayOffGrant => {
          const localGrant = localMap.get(cloudGrant.id);
          if (!localGrant) return cloudGrant;
          return {
            ...cloudGrant,
            ...localGrant,
          };
        });

      localGrants.forEach((locG: DayOffGrant) => {
        if (!deletedIds.has(locG.id.toUpperCase()) && !mergedGrants.some((mg: DayOffGrant) => mg.id === locG.id)) {
          mergedGrants.unshift(locG);
        }
      });

      localStorage.setItem(DAY_OFF_GRANTS_KEY, JSON.stringify(mergedGrants));
    }
  },

  getExtensions(): LectureExtension[] {
    const data = localStorage.getItem(EXTENSIONS_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveExtensions(list: LectureExtension[]): void {
    localStorage.setItem(EXTENSIONS_KEY, JSON.stringify(list));
    triggerBackgroundCloudSync();
  },

  addExtension(ext: Omit<LectureExtension, 'id' | 'usedMinutes' | 'createdAt' | 'updatedAt'>): LectureExtension {
    const startsAt = new Date(ext.startWindow).getTime();
    const endsAt = new Date(ext.endWindow).getTime();
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
      throw new Error('The extension end time must be later than its start time.');
    }
    if (!Number.isFinite(ext.allowedMinutes) || ext.allowedMinutes <= 0) {
      throw new Error('Extension minutes must be greater than zero.');
    }
    const list = this.getExtensions();
    const newExt: LectureExtension = {
      ...ext,
      id: `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      usedMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newExt);
    this.saveExtensions(list);

    // Operational Email Notification: Notify Teacher of Extension Grant
    try {
      const teacherObj = this.getUsers().find((u) => u.teacherId.toUpperCase() === ext.teacherId.toUpperCase());
      if (teacherObj?.email) {
        const topicTitles = ext.assignedTopicIds && ext.assignedTopicIds.length > 0
          ? this.getAssignedTopics().filter((t) => ext.assignedTopicIds.includes(t.id)).map((t) => t.topicTitle).join(', ')
          : undefined;

        notificationService.notifyExtensionGranted({
          teacherEmail: teacherObj.email,
          teacherName: teacherObj.name || ext.teacherId,
          subject: teacherObj.subject || teacherObj.department || 'Academic Work',
          allowedMinutes: ext.allowedMinutes,
          startWindow: ext.startWindow,
          endWindow: ext.endWindow,
          topicsCovered: topicTitles,
          adminRemarks: ext.notes,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch extension granted email:', notifyErr);
    }

    return newExt;
  },

  deleteExtension(id: string): void {
    this.addDeletedId(id);
    const list = this.getExtensions().filter((e) => e.id !== id);
    this.saveExtensions(list);
  },

  getTotalLateBacklogMinutes(teacherId: string): number {
    const cleanId = (teacherId || '').toUpperCase();
    const breakdown = this.getTeacherExtensionBreakdown(cleanId);
    return breakdown.totalTimeBacklogMinutes;
  },

  // Calculate detailed breakdown of undelivered lectures and missing minutes for extensions
  getTeacherExtensionBreakdown(teacherId: string): {
    teacherId: string;
    teacherName: string;
    dailyTargetMinutes: number;
    maxDailyMinutes: number;
    cutoffTime: string;
    cutoffDisplay: string;
    isPassedCutoff: boolean;
    totalAssignedTopicsCount: number;
    completedTopicsCount: number;
    undeliveredTopicsCount: number;
    undeliveredTopics: AssignedTopic[];
    undeliveredTopicsMinutes: number;   // SYLLABUS WORKFLOW ONLY
    minutesRecordedToday: number;
    todayTargetMinutes: number;
    todayUndeliveredMinutes: number;   // Today's remaining target in progress
    todayOverdueDeficit: number;       // Today's overdue deficit (only if cutoff passed)
    todayOverdueMinutes: number;       // Semantic alias
    isTodayTargetMet: boolean;
    pastSessionsMissedCount: number;
    pastUndeliveredMinutes: number;    // Net historical time debt after manual wallet transfers (e.g. 92m)
    historicalBacklogMinutes: number;  // Semantic alias
    rawHistoricalShortfall: number;    // Raw uncompensated shortfall before transfers (e.g. 106m)
    walletMinutesApplied: number;      // Total wallet minutes transferred to offset shortfall (e.g. 14m)
    timeWalletBalance: number;         // Banked surplus in wallet (e.g. 0m after transfer)
    cumulativePoolMinutes: number;     // Backwards-compatible alias for timeWalletBalance
    totalTimeBacklogMinutes: number;   // TIME DEBT ONLY: historicalBacklog + todayOverdueDeficit
    totalUndeliveredMinutes: number;   // Alias for totalTimeBacklogMinutes
    suggestedExtensionMinutes: number; // Pure time debt extension recommendation
    calculationSummary: string;
  } {
    const cleanId = (teacherId || '').toUpperCase();
    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === cleanId);
    const teacherName = teacher?.name || teacherId;
    const dailyTargetMinutes = teacher?.dailyTargetMinutes || 120;
    const maxDailyMinutes = teacher?.maxDailyMinutes || (dailyTargetMinutes * 2);

    const commitment = this.getDailyCommitment(cleanId);
    const cutoffTime = teacher?.dailyUploadCutoffTime || commitment?.promisedTime || '20:00';
    const [cutoffHours, cutoffMins] = cutoffTime.split(':').map(Number);
    const deadlineObj = new Date();
    deadlineObj.setHours(cutoffHours || 20, cutoffMins || 0, 59, 999);
    const now = new Date();
    const isPassedCutoff = now.getTime() >= deadlineObj.getTime();

    const period = (cutoffHours || 20) >= 12 ? 'PM' : 'AM';
    const formattedHours = (cutoffHours || 20) % 12 || 12;
    const formattedMinutes = String(cutoffMins || 0).padStart(2, '0');
    const cutoffDisplay = `${formattedHours}:${formattedMinutes} ${period}`;

    // 1. SYLLABUS WORKFLOW ONLY: Topic-based Undelivered Lectures
    const teacherLectures = this.getLectures().filter(
      (l) => l.teacherId.toUpperCase() === cleanId
    );
    const deliveredTopicIds = new Set<string>();
    teacherLectures.forEach((l) => {
      if (l.assignedTopicId) deliveredTopicIds.add(l.assignedTopicId);
    });

    const allAssignedTopics = this.getAssignedTopics().filter(
      (t) => t.teacherId.toUpperCase() === cleanId
    );
    const completedTopics = allAssignedTopics.filter((t) => t.status === 'completed' || deliveredTopicIds.has(t.id));
    const undeliveredTopics = allAssignedTopics.filter((t) => t.status !== 'completed' && !deliveredTopicIds.has(t.id));
    const totalAssignedTopicsCount = allAssignedTopics.length;
    const completedTopicsCount = completedTopics.length;
    const undeliveredTopicsCount = undeliveredTopics.length;
    const undeliveredTopicsMinutes = undeliveredTopics.reduce((sum, t) => sum + (t.durationMinutes || 45), 0);

    // 2. TODAY'S WORK & CUTOFF STATUS (Respects Approved Leaves and Joining Date)
    const todayDateKey = this.toLocalDateKey(now);
    const isTodayDayOff = this.isDayOff(cleanId, todayDateKey);
    const startDateStr = this.getTeacherEffectiveStartDate(cleanId);
    const isPreJoining = todayDateKey < startDateStr;
    const effectiveTodayTarget = (isTodayDayOff || isPreJoining) ? 0 : dailyTargetMinutes;

    const minutesRecordedToday = this.getMinutesRecordedToday(cleanId);
    const isTodayTargetMet = (isTodayDayOff || isPreJoining) || (minutesRecordedToday >= effectiveTodayTarget);
    const todayPendingMinutes = Math.max(0, effectiveTodayTarget - minutesRecordedToday);
    const todayOverdueDeficit = isPassedCutoff ? todayPendingMinutes : 0;

    // 3. DECOUPLED TIME WALLET & LATE BACKLOG (Surplus does NOT auto-cancel backlog!)
    const walletInfo = this.getTimeWalletInfo(cleanId);
    const backlogInfo = this.getLateBacklogInfo(cleanId);
    const historicalBacklogMinutes = backlogInfo.remainingBacklogMinutes;

    // 4. TOTAL TIME DEBT ONLY (Never contaminated with syllabus topic estimates!)
    const totalTimeBacklogMinutes = historicalBacklogMinutes + todayOverdueDeficit;
    const totalUndeliveredMinutes = totalTimeBacklogMinutes;

    // 5. SUGGESTED EXTENSION MINUTES (Matches exact required time debt, fallback to topics or 60)
    let suggestedExtensionMinutes = 60;
    if (totalTimeBacklogMinutes > 0) {
      suggestedExtensionMinutes = totalTimeBacklogMinutes;
    } else if (undeliveredTopicsCount > 0) {
      suggestedExtensionMinutes = undeliveredTopicsMinutes;
    } else {
      suggestedExtensionMinutes = 60;
    }

    // 6. Descriptive calculation summary
    const parts: string[] = [];
    if (historicalBacklogMinutes > 0) {
      parts.push(`${historicalBacklogMinutes}m historical backlog`);
    }
    if (todayPendingMinutes > 0) {
      parts.push(`${todayPendingMinutes}m today ${isPassedCutoff ? '(overdue)' : '(active)'}`);
    }
    if (undeliveredTopicsCount > 0) {
      parts.push(`${undeliveredTopicsCount} topic${undeliveredTopicsCount > 1 ? 's' : ''} queued (${undeliveredTopicsMinutes}m)`);
    }
    if (walletInfo.balance > 0) {
      parts.push(`+${walletInfo.balance}m in Time Wallet`);
    }
    const calculationSummary = parts.length > 0 ? parts.join(' • ') : 'All daily targets & curriculum obligations fulfilled';

    return {
      teacherId,
      teacherName,
      dailyTargetMinutes,
      maxDailyMinutes,
      cutoffTime,
      cutoffDisplay,
      isPassedCutoff,
      totalAssignedTopicsCount,
      completedTopicsCount,
      undeliveredTopicsCount,
      undeliveredTopics,
      undeliveredTopicsMinutes,
      minutesRecordedToday,
      todayTargetMinutes: dailyTargetMinutes,
      todayUndeliveredMinutes: todayPendingMinutes,
      todayOverdueDeficit,
      todayOverdueMinutes: todayOverdueDeficit,
      isTodayTargetMet,
      pastSessionsMissedCount: backlogInfo.pastSessionsMissedCount,
      pastUndeliveredMinutes: historicalBacklogMinutes,
      historicalBacklogMinutes,
      rawHistoricalShortfall: backlogInfo.rawHistoricalShortfall,
      walletMinutesApplied: backlogInfo.walletMinutesApplied,
      timeWalletBalance: walletInfo.balance,
      cumulativePoolMinutes: walletInfo.balance,
      totalTimeBacklogMinutes,
      totalUndeliveredMinutes,
      suggestedExtensionMinutes,
      calculationSummary,
    };
  },

    getActiveExtensions(teacherId?: string): LectureExtension[] {
    const nowMs = Date.now();
    const extensions = this.getExtensions();
    return extensions.filter((e) => {
      if (teacherId && e.teacherId.toUpperCase() !== teacherId.toUpperCase()) return false;
      const startMs = new Date(e.startWindow).getTime();
      const endMs = new Date(e.endWindow).getTime();
      const inWindow = Number.isFinite(startMs) && Number.isFinite(endMs) && nowMs >= startMs && nowMs <= endMs;
      const hasMinutesLeft = (e.usedMinutes || 0) < (e.allowedMinutes || 0);
      return inWindow && hasMinutesLeft;
    });
  },

  getActiveExtensionForTopic(teacherId: string, topicId?: string): LectureExtension | null {
    const activeList = this.getActiveExtensions(teacherId);
    if (activeList.length === 0) return null;

    if (topicId) {
      const specific = activeList.find((e) => e.assignedTopicIds && e.assignedTopicIds.includes(topicId));
      if (specific) return specific;
    }

    const general = activeList.find((e) => !e.assignedTopicIds || e.assignedTopicIds.length === 0);
    if (general) return general;

    if (!topicId && activeList.length > 0) {
      return activeList[0];
    }

    return null;
  },

  addExtensionMinutesUsed(extId: string, minutes: number): void {
    if (!minutes || minutes <= 0) return;
    const list = this.getExtensions();
    const index = list.findIndex((e) => e.id === extId);
    if (index !== -1) {
      list[index].usedMinutes = Math.max(0, Math.min(list[index].allowedMinutes, (list[index].usedMinutes || 0) + minutes));
      list[index].updatedAt = new Date().toISOString();
      this.saveExtensions(list);
    }
  },

  async syncFromCloud(): Promise<boolean> {
    // All sync goes through the secure Vercel serverless API.
    // The API handler talks to Supabase server-side - no credentials in the browser.
    try {
      const res = await fetch('/api/cloud-sync', {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json && json.data) {
        this.importMasterState(json.data);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[CloudSync] Sync pull error:', err);
      return false;
    }
  },

  async syncToCloud(): Promise<boolean> {
    const payload = this.exportMasterState();

    // All sync goes through the secure Vercel serverless API.
    // The API handler talks to Supabase server-side - no credentials in the browser.
    try {
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      return res.ok;
    } catch (err) {
      console.warn('[CloudSync] Sync push error:', err);
      return false;
    }
  },

  initCloudSync(onUpdate?: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    // Initial fetch on mount
    this.syncFromCloud().then((success) => {
      if (success && onUpdate) onUpdate();
    });

    // Periodic sync every 15 seconds
    const interval = setInterval(() => {
      this.syncFromCloud().then((success) => {
        if (success && onUpdate) onUpdate();
      });
    }, 15000);

    // Sync on tab focus
    const handleFocus = () => {
      this.syncFromCloud().then((success) => {
        if (success && onUpdate) onUpdate();
      });
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  },
};
