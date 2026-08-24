import type { User, Lecture, AdminRemark, AssignedTopic, SubjectReference, SubtopicItem, DailyCommitment, PptRequest } from '../types';

const LECTURES_KEY = 'aew_portal_lectures_prod_v2';
const USERS_KEY = 'aew_portal_users_prod_v2';
const CURRENT_USER_KEY = 'aew_portal_session_prod_v2';
const ASSIGNED_TOPICS_KEY = 'aew_portal_assigned_topics_prod_v2';
const SUBJECT_REFERENCES_KEY = 'aew_portal_subject_references_prod_v2';
const DAILY_COMMITMENTS_KEY = 'aew_daily_commitments_prod_v2';
const PPT_REQUESTS_KEY = 'aew_ppt_requests_prod_v2';
const DELETED_IDS_KEY = 'aew_deleted_ids_prod_v2';
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

    // 1. Seed with initial admin
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
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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

    const newTopic: AssignedTopic = {
      id: `at-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      teacherId: topic.teacherId.trim().toUpperCase(),
      subject: topic.subject.trim(),
      unitNumber: topic.unitNumber?.trim() || 'UNIT 1',
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
    };
    topics.push(newTopic);
    this.saveAssignedTopics(topics);
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

    cleanTitles.forEach((title, idx) => {
      const newTopic: AssignedTopic = {
        id: `at-${now + idx}-${Math.floor(Math.random() * 1000)}`,
        teacherId: commonProps.teacherId.trim().toUpperCase(),
        subject: commonProps.subject.trim(),
        unitNumber: commonProps.unitNumber?.trim() || 'UNIT 1',
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
      };
      topics.push(newTopic);
      createdList.push(newTopic);
    });

    this.saveAssignedTopics(topics);
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
      updatedAt: new Date().toISOString(),
    };
    this.saveAssignedTopics(topics);
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
      ? customItems.filter((c) => c.name.trim().length > 0)
      : finalNames.map((name, idx) => ({
          id: `sub-${idx}-${Date.now()}`,
          name,
          status: 'pending',
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
    return topics[index];
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
    const topic = lecture.assignedTopicId ? this.getAssignedTopics().find(t => t.id === lecture.assignedTopicId) : null;
    const unitNumber = lecture.unitNumber || topic?.unitNumber || undefined;

    const newLec: Lecture = {
      ...lecture,
      unitNumber,
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

  // Total recording minutes completed today by the teacher (Timezone aware)
  getMinutesRecordedToday(teacherId: string): number {
    const lectures = this.getLectures();
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayIso = now.toISOString().split('T')[0];

    const todayLectures = lectures.filter((l) => {
      if (l.teacherId.toUpperCase() !== teacherId.toUpperCase()) return false;
      if (!l.createdAt) return false;
      const lDate = new Date(l.createdAt);
      const lDateLocal = `${lDate.getFullYear()}-${String(lDate.getMonth() + 1).padStart(2, '0')}-${String(lDate.getDate()).padStart(2, '0')}`;
      return lDateLocal === todayLocal || l.createdAt.startsWith(todayLocal) || l.createdAt.startsWith(todayIso);
    });

    return todayLectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
  },

  getUploadsToday(teacherId: string): number {
    const lectures = this.getLectures();
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayIso = now.toISOString().split('T')[0];

    return lectures.filter((l) => {
      if (l.teacherId.toUpperCase() !== teacherId.toUpperCase()) return false;
      if (!l.createdAt) return false;
      const lDate = new Date(l.createdAt);
      const lDateLocal = `${lDate.getFullYear()}-${String(lDate.getMonth() + 1).padStart(2, '0')}-${String(lDate.getDate()).padStart(2, '0')}`;
      return lDateLocal === todayLocal || l.createdAt.startsWith(todayLocal) || l.createdAt.startsWith(todayIso);
    }).length;
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
  isUploadOnTime(teacherId: string, _topicDeadlineDate?: string): boolean {
    const now = new Date();

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
    this.addDeletedId(id);
    const list = this.getPptRequests().filter((r) => r.id !== id);
    this.savePptRequests(list);
  },

  // ─── TEACHER ON-TIME SUBMISSION PERCENTAGE & METRICS (ACCURATE MULTI-DAY & MINUTE-WEIGHTED) ──
  getOnTimeSubmissionStats(teacherId: string): {
    totalLectures: number;
    onTimeLectures: number;
    delayedLectures: number;
    totalDeliveredMinutes: number;
    totalMinutes: number;
    onTimeMinutes: number;
    lateMinutes: number;
    pendingLateMinutesToday: number;
    onTimePercentage: number;
  } {
    const teacherLectures = this.getLectures().filter(
      (l) => l.teacherId.toUpperCase() === teacherId.toUpperCase()
    );
    const totalLectures = teacherLectures.length;
    const onTimeLectures = teacherLectures.filter((l) => l.status === 'on_time').length;
    const delayedLectures = totalLectures - onTimeLectures;

    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === teacherId.toUpperCase());
    const dailyTarget = teacher?.dailyTargetMinutes || 120;
    const cutoffTime = teacher?.dailyUploadCutoffTime || '20:00';

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [cutoffH, cutoffM] = cutoffTime.split(':').map(Number);
    const cutoffDateObj = new Date();
    cutoffDateObj.setHours(cutoffH || 20, cutoffM || 0, 59, 999);
    const isTodayCutoffPassed = now > cutoffDateObj;

    const toLocalDateStr = (isoString?: string): string => {
      if (!isoString) return '';
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Collect all active calendar dates for this teacher
    const dateSet = new Set<string>();
    dateSet.add(todayStr);

    teacherLectures.forEach((l) => {
      const dStr = toLocalDateStr(l.createdAt);
      if (dStr) dateSet.add(dStr);
    });

    const assignedTopics = this.getAssignedTopics().filter(
      (t) => t.teacherId.toUpperCase() === teacherId.toUpperCase()
    );
    assignedTopics.forEach((t) => {
      const dStr = toLocalDateStr(t.createdAt);
      if (dStr) dateSet.add(dStr);
    });

    const commitments = this.getDailyCommitments().filter(
      (c) => c.teacherId.toUpperCase() === teacherId.toUpperCase()
    );
    commitments.forEach((c) => {
      if (c.date) dateSet.add(c.date);
    });

    // Sort dates in ascending chronological order
    const rawDates = Array.from(dateSet).sort();

    // If teacher has activity spanning across multiple calendar days, fill continuous timeline
    if (rawDates.length > 0) {
      const earliestParts = rawDates[0].split('-').map(Number);
      const earliestDate = new Date(earliestParts[0], earliestParts[1] - 1, earliestParts[2]);
      const todayParts = todayStr.split('-').map(Number);
      const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);

      const cur = new Date(earliestDate);
      while (cur < todayDate) {
        cur.setDate(cur.getDate() + 1);
        const dStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        dateSet.add(dStr);
      }
    }

    const sortedDates = Array.from(dateSet).sort();

    // Group lectures by local date
    const lecturesByDate = new Map<string, Lecture[]>();
    teacherLectures.forEach((l) => {
      const dStr = toLocalDateStr(l.createdAt);
      if (!lecturesByDate.has(dStr)) {
        lecturesByDate.set(dStr, []);
      }
      lecturesByDate.get(dStr)!.push(l);
    });

    let totalOnTimeMinutes = 0;
    let totalLateMinutes = 0;
    let pendingLateMinutesToday = 0;

    sortedDates.forEach((dateStr) => {
      const dayLectures = lecturesByDate.get(dateStr) || [];
      const onTimeMins = dayLectures
        .filter((l) => l.status === 'on_time')
        .reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
      const lateMins = dayLectures
        .filter((l) => l.status === 'overdue')
        .reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
      const recordedDayMins = onTimeMins + lateMins;

      if (dateStr < todayStr) {
        // Concluded past day:
        // Any portion of dailyTarget not recorded is marked as unfulfilled/late on that day.
        const unfulfilledPortion = Math.max(0, dailyTarget - recordedDayMins);
        totalOnTimeMinutes += onTimeMins;
        totalLateMinutes += lateMins + unfulfilledPortion;
      } else if (dateStr === todayStr) {
        // Current day (Today):
        totalOnTimeMinutes += onTimeMins;
        totalLateMinutes += lateMins;

        if (isTodayCutoffPassed && recordedDayMins < dailyTarget) {
          const unfulfilledToday = Math.max(0, dailyTarget - recordedDayMins);
          pendingLateMinutesToday = unfulfilledToday;
          totalLateMinutes += unfulfilledToday;
        }
      }
    });

    const totalConsideredMinutes = totalOnTimeMinutes + totalLateMinutes;

    let onTimePercentage = 100;
    if (totalConsideredMinutes > 0) {
      onTimePercentage = Math.max(0, Math.min(100, Math.round((totalOnTimeMinutes / totalConsideredMinutes) * 100)));
    } else if (isTodayCutoffPassed) {
      onTimePercentage = 0;
    }

    const totalDeliveredMinutes = teacherLectures.reduce((sum, l) => sum + (l.durationMinutes || 45), 0);

    return {
      totalLectures,
      onTimeLectures,
      delayedLectures,
      totalDeliveredMinutes,
      totalMinutes: totalConsideredMinutes,
      onTimeMinutes: totalOnTimeMinutes,
      lateMinutes: totalLateMinutes,
      pendingLateMinutesToday,
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

  // Total recording minutes completed on a specific date (YYYY-MM-DD)
  getMinutesRecordedOnDate(teacherId: string, targetDateStr: string): number {
    const lectures = this.getLectures();
    return lectures
      .filter((l) => {
        if (l.teacherId.toUpperCase() !== teacherId.toUpperCase()) return false;
        if (!l.createdAt) return false;
        const lDate = new Date(l.createdAt);
        const lDateLocal = `${lDate.getFullYear()}-${String(lDate.getMonth() + 1).padStart(2, '0')}-${String(lDate.getDate()).padStart(2, '0')}`;
        return lDateLocal === targetDateStr || l.createdAt.startsWith(targetDateStr);
      })
      .reduce((sum, l) => sum + (l.durationMinutes || 45), 0);
  },

  // Calculate unfulfilled lecture minutes from previous day(s) that must be fulfilled before target reset
  getPreviousDayBacklog(teacherId: string): {
    yesterdayDateStr: string;
    yesterdayRecorded: number;
    yesterdayTarget: number;
    yesterdayUnfulfilledMinutes: number;
    isYesterdayFulfilled: boolean;
    minutesRecordedToday: number;
    todayTarget: number;
    remainingMinutesToday: number;
    isTodayTargetMet: boolean;
  } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === teacherId.toUpperCase());
    const dailyTarget = teacher?.dailyTargetMinutes || 120;

    const yesterdayRecorded = this.getMinutesRecordedOnDate(teacherId, yesterdayDateStr);
    
    // Check if teacher had past assignments/activity on or before yesterday
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hasPastHistory = this.getLectures().some(l => l.teacherId.toUpperCase() === teacherId.toUpperCase() && !l.createdAt.startsWith(todayLocal)) ||
      this.getAssignedTopics().some(t => t.teacherId.toUpperCase() === teacherId.toUpperCase() && !t.createdAt.startsWith(todayLocal));

    const yesterdayUnfulfilledMinutes = hasPastHistory ? Math.max(0, dailyTarget - yesterdayRecorded) : 0;
    const isYesterdayFulfilled = yesterdayUnfulfilledMinutes === 0;

    const minutesRecordedToday = this.getMinutesRecordedToday(teacherId);
    const remainingMinutesToday = Math.max(0, dailyTarget - minutesRecordedToday);
    const isTodayTargetMet = minutesRecordedToday >= dailyTarget;

    return {
      yesterdayDateStr,
      yesterdayRecorded,
      yesterdayTarget: dailyTarget,
      yesterdayUnfulfilledMinutes,
      isYesterdayFulfilled,
      minutesRecordedToday,
      todayTarget: dailyTarget,
      remainingMinutesToday,
      isTodayTargetMet,
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
    remainingMinutesToday: number;
    yesterdayUnfulfilledMinutes: number;
    isYesterdayFulfilled: boolean;
  } {
    const now = new Date();
    const users = this.getUsers();
    const teacher = users.find((u) => u.teacherId.toUpperCase() === teacherId.toUpperCase());
    const commitment = this.getDailyCommitment(teacherId);
    const cutoffTime = teacher?.dailyUploadCutoffTime || commitment?.promisedTime || '20:00';

    const backlogInfo = this.getPreviousDayBacklog(teacherId);
    const targetMinutes = teacher?.dailyTargetMinutes || 120;
    const minutesRecordedToday = this.getMinutesRecordedToday(teacherId);
    const isTargetMet = minutesRecordedToday >= targetMinutes;
    const remainingMinutesToday = Math.max(0, targetMinutes - minutesRecordedToday);

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
      remainingMinutesToday,
      yesterdayUnfulfilledMinutes: backlogInfo.yesterdayUnfulfilledMinutes,
      isYesterdayFulfilled: backlogInfo.isYesterdayFulfilled,
    };
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

    // 4. Resources: Available materials
    const resources = this.getSubjectReferences().length > 0 ? 0 : 0;

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
            subtopics: (cloudTopic.subtopics && cloudTopic.subtopics.length > 0)
              ? cloudTopic.subtopics
              : (localTopic.subtopics || []),
            subtopicItems: (cloudTopic.subtopicItems && cloudTopic.subtopicItems.length > 0)
              ? cloudTopic.subtopicItems
              : (localTopic.subtopicItems || []),
            proposedSubtopics: (cloudTopic.proposedSubtopics && cloudTopic.proposedSubtopics.length > 0)
              ? cloudTopic.proposedSubtopics
              : (localTopic.proposedSubtopics || []),
            subtopicsApprovalState: (cloudTopic.subtopicsApprovalState === 'approved' || localTopic.subtopicsApprovalState === 'approved')
              ? 'approved'
              : (cloudTopic.subtopicsApprovalState || localTopic.subtopicsApprovalState || 'pending_teacher_input'),
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
