import { notificationService } from './notificationService';
import type {
  DayOffGrant,
  User, UserRole, Lecture, AdminRemark, AssignedTopic, SubjectReference, SubtopicItem, DailyCommitment, PptRequest, LectureExtension, WalletTransaction, TimeWalletInfo, DailyBacklogLog, TeacherDailyLogsInfo, DailyLogStatus, EmailConfig, EmailLogItem,
  PrTask, PrLead, PrMouRequest, PrCollege, PrTier, PrLeadStage, PrMouStatus,
  SalesLead, SalesActivityLog,
  OfferLetter, OfferLetterStatus } from '../types';


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
const EMAIL_CONFIG_KEY = 'aew_email_config';
const EMAIL_LOGS_KEY = 'aew_email_logs_prod_v1';
const PR_TASKS_KEY = 'aew_pr_tasks_prod_v1';
const PR_LEADS_KEY = 'aew_pr_leads_prod_v1';
const PR_MOUS_KEY = 'aew_pr_mous_prod_v1';
const PR_COLLEGES_KEY = 'aew_pr_colleges_prod_v1';
const SALES_LEADS_KEY = 'aew_sales_leads_v1';
const CRM_PERMISSIONS_KEY = 'aew_crm_permissions_v1';
const OFFER_LETTERS_KEY = 'aew_offer_letters_prod_v1';
const PDF_STORE_PREFIX = 'aew_pdf_';
const SESSION_TOKEN_KEY = 'aew_portal_session_token_v2';

export const CANONICAL_SUBJECT_MAP: Record<string, string> = {
  'dsa': 'Data Structures & Algorithms',
  'data structures': 'Data Structures & Algorithms',
  'data structures and algorithms': 'Data Structures & Algorithms',
  'data structure and algorithms': 'Data Structures & Algorithms',
  'data structures & algorithms': 'Data Structures & Algorithms',
  'algorithms': 'Data Structures & Algorithms',
  'daa': 'Data Structures & Algorithms',
  
  'os': 'Operating Systems',
  'operating systems': 'Operating Systems',
  'operating system': 'Operating Systems',
  
  'dbms': 'Database Management Systems',
  'database management systems': 'Database Management Systems',
  'database management system': 'Database Management Systems',
  'database': 'Database Management Systems',
  'databases': 'Database Management Systems',
  'sql': 'Database Management Systems',

  'cn': 'Computer Networks',
  'computer networks': 'Computer Networks',
  'computer networking': 'Computer Networks',
  'networking': 'Computer Networks',

  'thermo': 'Thermodynamics',
  'thermodynamics': 'Thermodynamics',
  'thermal engineering': 'Thermodynamics',

  'fm': 'Fluid Mechanics',
  'fluid mechanics': 'Fluid Mechanics',
  'fluid machinery': 'Fluid Mechanics',

  'signals': 'Signals & Systems',
  'signals and systems': 'Signals & Systems',
  'signals & systems': 'Signals & Systems',
  'signal and system': 'Signals & Systems',
  'ss': 'Signals & Systems',

  'math': 'Engineering Mathematics',
  'maths': 'Engineering Mathematics',
  'mathematics': 'Engineering Mathematics',
  'engineering mathematics': 'Engineering Mathematics',
  'engineering maths': 'Engineering Mathematics',

  'pedagogy': 'Pedagogy & Faculty Development',
  'pedagogy framework': 'Pedagogy & Faculty Development',
  'aew pedagogy': 'Pedagogy & Faculty Development',
  'teaching standards': 'Pedagogy & Faculty Development',
};

export function toCanonicalSubject(subjectName: string): string {
  if (!subjectName) return '';
  const clean = subjectName.trim();
  const normalizedKey = clean
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (CANONICAL_SUBJECT_MAP[normalizedKey]) {
    return CANONICAL_SUBJECT_MAP[normalizedKey];
  }

  if (normalizedKey === 'dsa' || normalizedKey.includes('data structure') || normalizedKey.includes('algorithm')) {
    return 'Data Structures & Algorithms';
  }
  if (normalizedKey === 'os' || normalizedKey.includes('operating system')) {
    return 'Operating Systems';
  }
  if (normalizedKey === 'dbms' || normalizedKey.includes('database')) {
    return 'Database Management Systems';
  }
  if (normalizedKey === 'cn' || normalizedKey.includes('computer network') || normalizedKey.includes('networking')) {
    return 'Computer Networks';
  }
  if (normalizedKey === 'thermo' || normalizedKey.includes('thermodynamic')) {
    return 'Thermodynamics';
  }
  if (normalizedKey === 'fm' || normalizedKey.includes('fluid mechanic')) {
    return 'Fluid Mechanics';
  }
  if (normalizedKey === 'ss' || normalizedKey.includes('signals')) {
    return 'Signals & Systems';
  }
  if (normalizedKey.includes('math') || normalizedKey.includes('calculus') || normalizedKey.includes('algebra')) {
    return 'Engineering Mathematics';
  }

  return clean;
}

export const SEED_SUBJECT_REFERENCES: SubjectReference[] = [];

export const SEED_ASSIGNED_TOPICS: AssignedTopic[] = [];

export const HARDCODED_MOCK_USER_IDS = new Set([
  'u-t101',
  'u-t102',
  'u-t103',
  'u-test-teacher',
  'u-pr101',
  'u-pr102',
  'u-prhead01',
  'u-wdm01',
  'u-dev01',
  'u-dev02',
]);

export const HARDCODED_MOCK_USERNAMES = new Set([
  'teacher_101',
  'teacher_102',
  'teacher_103',
  'pr_intern_1',
  'pr_intern_2',
  'pr_head_1',
  'webdev_manager',
  'developer_aarav',
  'developer_neha',
]);

export const HARDCODED_MOCK_TEACHER_IDS = new Set<string>([]);

export function isHardcodedMockUser(u: { teacherId?: string; id?: string; username?: string } | null | undefined): boolean {
  if (!u) return false;
  const tid = (u.teacherId || '').trim().toUpperCase();
  const uid = (u.id || '').trim();
  const uname = (u.username || '').trim().toLowerCase();

  // EXPLICIT WHITELIST: Primary Super Admin, bhumi, and khushi must NEVER be treated as mock or deleted
  if (
    tid === 'ADMIN-01' ||
    tid === 'ADMIN' ||
    uname === 'admin' ||
    uname === 'bhumi' ||
    uname === 'khushi' ||
    uid === 'u-1787383338021' ||
    uid === 'u-1787387463369'
  ) {
    return false;
  }

  // Any custom account created through onboarding (timestamp ID u-17...) is a real account
  if (uid.startsWith('u-17') && uname !== 'teacher_101' && uname !== 'teacher_102' && uname !== 'teacher_103') {
    return false;
  }

  // Exact mock user ID from old seeds
  if (HARDCODED_MOCK_USER_IDS.has(uid)) {
    return true;
  }

  // Exact mock username from old seeds
  if (HARDCODED_MOCK_USERNAMES.has(uname)) {
    return true;
  }

  // Mock test teacher AEW-T-101 (only if legacy test/seed, preserving any user-created with timestamp ID like u-17...)
  if (tid === 'AEW-T-101' && (uid === 'u-test-teacher' || uid === 'u-t101' || uname === 'teacher_101' || !uid.startsWith('u-17'))) {
    return true;
  }

  return false;
}

// Initial Registered Administrator (Credentials verified server-side only; passwords never stored in frontend bundle)
const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    teacherId: 'ADMIN-01',
    username: 'admin',
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
    const deletedIds = new Set(this.getDeletedIds().map((id) => id.toUpperCase()));

    // 1. Seed with initial admin (excluding any deleted IDs or mock accounts)
    INITIAL_USERS.forEach((u) => {
      if (!deletedIds.has(u.teacherId.toUpperCase()) && !isHardcodedMockUser(u)) {
        userMap.set(u.teacherId.toUpperCase(), { ...u });
      }
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
              if (deletedIds.has(cleanId) || (u.id && deletedIds.has(u.id.toUpperCase())) || isHardcodedMockUser(u)) {
                return;
              }
              const existing: Partial<User> = userMap.get(cleanId) || {};
              userMap.set(cleanId, {
                ...existing,
                ...u,
                id: u.id || existing.id || `u-${Date.now()}`,
                teacherId: cleanId,
                username: (u.username || existing.username || cleanId.toLowerCase()).trim().toLowerCase().replace(/\s+/g, '_'),
                password: (u.password || existing.password || '').trim() || undefined,
                name: (u.name || existing.name || cleanId).trim(),
                role: u.role || existing.role || (cleanId.startsWith('ADMIN') ? 'admin' : cleanId.startsWith('AEW-PRH') ? 'pr_head' : cleanId.startsWith('AEW-PR') ? 'pr_intern' : cleanId.startsWith('AEW-WDM') ? 'web_dev_manager' : cleanId.startsWith('AEW-DEV') ? 'web_developer' : 'teacher'),
                email: (u.email && !String(u.email).endsWith('@aew.com')
                  ? u.email
                  : (existing.email && !String(existing.email).endsWith('@aew.com')
                    ? existing.email
                    : (u.email || existing.email || `${cleanId.toLowerCase()}@aew.com`))).trim(),
                department: u.department || existing.department || (cleanId.startsWith('AEW-PRH') ? 'Public Relations & Strategic Partnerships' : cleanId.startsWith('AEW-PR') ? 'Public Relations & Sponsorship' : cleanId.startsWith('AEW-DEV') || cleanId.startsWith('AEW-WDM') ? 'Web Development' : 'Engineering'),
                subject: u.subject || existing.subject || (cleanId.startsWith('AEW-PRH') ? 'Corporate Brand Sponsorships & Deals' : cleanId.startsWith('AEW-PR') ? 'Corporate Sponsor Outreach' : cleanId.startsWith('AEW-DEV') || cleanId.startsWith('AEW-WDM') ? 'Web Development' : 'Engineering'),
                dailyTargetMinutes: u.dailyTargetMinutes !== undefined ? u.dailyTargetMinutes : (existing.dailyTargetMinutes || 0),
                dailyUploadCutoffTime: u.dailyUploadCutoffTime || existing.dailyUploadCutoffTime,
                hasSetInitialCommitment: u.hasSetInitialCommitment ?? existing.hasSetInitialCommitment ?? false,
                dailyLimit: u.dailyLimit !== undefined ? u.dailyLimit : (existing.dailyLimit || 0),
                joiningDate: u.joiningDate || existing.joiningDate || undefined,
                firstLoginDate: u.firstLoginDate || existing.firstLoginDate,
                createdAt: u.createdAt || existing.createdAt || new Date().toISOString(),
                prTier: u.prTier || existing.prTier || (cleanId.startsWith('AEW-PRH') ? 'Premium' : cleanId.startsWith('AEW-PR') ? 'Silver' : undefined),
                prPoints: u.prPoints !== undefined ? u.prPoints : (existing.prPoints !== undefined ? existing.prPoints : (cleanId.startsWith('AEW-PR') || cleanId.startsWith('AEW-PRH') ? 0 : undefined)),
                prStars: u.prStars !== undefined ? u.prStars : (existing.prStars !== undefined ? existing.prStars : (cleanId.startsWith('AEW-PR') || cleanId.startsWith('AEW-PRH') ? 0 : undefined)),
                totalSponsorshipRevenue: u.totalSponsorshipRevenue !== undefined ? u.totalSponsorshipRevenue : (existing.totalSponsorshipRevenue || 0),
                totalCommissionEarned: u.totalCommissionEarned !== undefined ? u.totalCommissionEarned : (existing.totalCommissionEarned || 0),
                prCustomTierPercentages: u.prCustomTierPercentages || existing.prCustomTierPercentages,
                prCustomCommissionRate: u.prCustomCommissionRate !== undefined ? u.prCustomCommissionRate : existing.prCustomCommissionRate,
                isOffboarded: u.isOffboarded !== undefined ? u.isOffboarded : existing.isOffboarded,
                offboardedAt: u.offboardedAt || existing.offboardedAt,
                offboardReason: u.offboardReason || existing.offboardReason,
                offboardRemarks: u.offboardRemarks || existing.offboardRemarks,
                webDevTitle: u.webDevTitle || existing.webDevTitle,
                webDevLevel: u.webDevLevel !== undefined ? u.webDevLevel : existing.webDevLevel,
                webDevXp: u.webDevXp !== undefined ? u.webDevXp : existing.webDevXp,
                skills: u.skills || existing.skills,
                githubUsername: u.githubUsername || existing.githubUsername,
                avatarUrl: u.avatarUrl || existing.avatarUrl,
              });
            }
          });
        }
      } catch {
        // ignore
      }
    }

    const allUsers = Array.from(userMap.values())
      .filter((u) => !isHardcodedMockUser(u))
      .map((u) => {
        if (u.role === 'web_dev_manager' || u.role === 'web_developer') {
          const isLegacyMockSkills = Array.isArray(u.skills) && 
            u.skills.length === 4 && 
            u.skills.includes('React') && 
            u.skills.includes('Node.js') && 
            u.skills.includes('PostgreSQL') && 
            u.skills.includes('Architecture');
          
          const isLegacyMockXp = (u.role === 'web_dev_manager' && u.webDevXp === 5000 && u.webDevLevel === 5) ||
                                (u.role === 'web_developer' && u.webDevXp === 500 && u.webDevLevel === 2);
          
          if (isLegacyMockXp) {
            u.webDevXp = 0;
            u.webDevLevel = 1;
          }
          if (isLegacyMockSkills) {
            u.skills = [];
          }
          if (u.role === 'web_dev_manager' && (!u.webDevTitle || u.webDevTitle === 'Engineering Manager' || u.webDevTitle === 'Lead Software Architect & Manager')) {
            u.webDevTitle = 'Dev Architect';
          }
        }
        return u;
      });
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
    return allUsers;
  },

  saveUsers(users: User[]): void {
    const cleaned = users.filter((u) => !isHardcodedMockUser(u));
    localStorage.setItem(USERS_KEY, JSON.stringify(cleaned));
    triggerBackgroundCloudSync();
  },

  getTeachers(): User[] {
    return this.getUsers().filter((u) => u.role === 'teacher');
  },

  getNextEmployeeId(role: UserRole): string {
    const users = this.getUsers();
    if (role === 'teacher') {
      const ids = users
        .filter(u => u.role === 'teacher')
        .map(u => {
          const m = u.teacherId.match(/AEW-T-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => n > 0);
      const max = ids.length > 0 ? Math.max(...ids) : 100;
      return `AEW-T-${max + 1}`;
    }
    if (role === 'pr_head') {
      const ids = users
        .filter(u => u.role === 'pr_head')
        .map(u => {
          const m = u.teacherId.match(/AEW-PRH-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => n > 0);
      const max = ids.length > 0 ? Math.max(...ids) : 0;
      return `AEW-PRH-${String(max + 1).padStart(2, '0')}`;
    }
    if (role === 'pr_intern') {
      const ids = users
        .filter(u => u.role === 'pr_intern')
        .map(u => {
          const m = u.teacherId.match(/AEW-PR-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => n > 0);
      const max = ids.length > 0 ? Math.max(...ids) : 0;
      return `AEW-PR-${String(max + 1).padStart(2, '0')}`;
    }
    if (role === 'web_developer') {
      const ids = users
        .filter(u => u.role === 'web_developer')
        .map(u => {
          const m = u.teacherId.match(/AEW-DEV-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => n > 0);
      const max = ids.length > 0 ? Math.max(...ids) : 0;
      return `AEW-DEV-${String(max + 1).padStart(2, '0')}`;
    }
    if (role === 'web_dev_manager') {
      const ids = users
        .filter(u => u.role === 'web_dev_manager')
        .map(u => {
          const m = u.teacherId.match(/AEW-WDM-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => n > 0);
      const max = ids.length > 0 ? Math.max(...ids) : 0;
      return `AEW-WDM-${String(max + 1).padStart(2, '0')}`;
    }
    if (role === 'sales') {
      const ids = users
        .filter(u => u.role === 'sales')
        .map(u => {
          const m = u.teacherId.match(/AEW-SALES-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => n > 0);
      const max = ids.length > 0 ? Math.max(...ids) : 0;
      return `AEW-SALES-${String(max + 1).padStart(2, '0')}`;
    }
    if (role === 'admin') {
      const ids = users
        .filter(u => u.role === 'admin')
        .map(u => {
          const m = u.teacherId.match(/ADMIN-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => n > 0);
      const max = ids.length > 0 ? Math.max(...ids) : 1;
      return `ADMIN-${String(max + 1).padStart(2, '0')}`;
    }
    return `AEW-EMP-${Date.now().toString().slice(-4)}`;
  },

  onboardEmployee(employee: Partial<User> & { name: string; role: UserRole; teacherId: string }): User {
    const users = this.getUsers();
    const cleanId = employee.teacherId.trim().toUpperCase();
    const cleanUsername = (employee.username?.trim().toLowerCase() || cleanId.toLowerCase()).replace(/\s+/g, '_');
    
    // Default password based on role
    const defaultPassword = 
      employee.password?.trim() ||
      (employee.role === 'admin'
        ? 'admin123'
        : employee.role === 'pr_head'
        ? 'head123'
        : employee.role === 'pr_intern'
        ? 'intern123'
        : employee.role === 'web_dev_manager' || employee.role === 'web_developer'
        ? 'dev123'
        : employee.role === 'sales'
        ? 'sales123'
        : 'teach123');

    const filtered = users.filter((u) => u.teacherId.toUpperCase() !== cleanId);
    const todayStr = this.toLocalDateKey(new Date());

    const created: User = {
      id: employee.id || `u-${Date.now()}`,
      teacherId: cleanId,
      username: cleanUsername,
      password: defaultPassword,
      name: employee.name.trim(),
      email: employee.email?.trim() || `${cleanUsername}@aew.com`,
      phone: employee.phone?.trim() || undefined,
      role: employee.role,
      department: employee.department?.trim() || (
        employee.role === 'admin' ? 'Academic Operations' :
        employee.role === 'pr_head' ? 'Public Relations & Strategic Partnerships' :
        employee.role === 'pr_intern' ? 'Public Relations & Sponsorship' :
        employee.role === 'web_developer' || employee.role === 'web_dev_manager' ? 'Engineering & Product' :
        employee.role === 'sales' ? 'Admissions & Growth' :
        'Engineering'
      ),
      subject: employee.subject?.trim() || (
        employee.role === 'admin' ? 'Management' :
        employee.role === 'pr_head' ? 'Corporate Brand Partnerships & Sponsorships' :
        employee.role === 'pr_intern' ? 'Corporate Sponsor Outreach' :
        employee.role === 'web_developer' ? 'Web Development' :
        employee.role === 'web_dev_manager' ? 'Software Architecture' :
        employee.role === 'sales' ? 'Course Admissions' :
        'Engineering'
      ),
      dailyTargetMinutes: employee.role === 'teacher' ? (employee.dailyTargetMinutes || 120) : (employee.dailyTargetMinutes || 0),
      dailyLimit: employee.role === 'teacher' ? (employee.dailyLimit || Math.ceil((employee.dailyTargetMinutes || 120) / 30)) : (employee.dailyLimit || 0),
      joiningDate: employee.joiningDate || todayStr,
      createdAt: employee.createdAt || new Date().toISOString(),
      // Admin specific
      adminTier: employee.role === 'admin' ? (employee.adminTier || 'super_admin') : undefined,
      adminPermissions: employee.role === 'admin' 
        ? (employee.adminPermissions || [
            'manage_faculty',
            'manage_syllabus',
            'manage_lectures',
            'manage_pr',
            'manage_webdev',
            'manage_sales',
            'manage_offer_letters',
            'manage_credentials',
            'manage_leaves',
          ])
        : undefined,
      // Sales specific
      hasCrmAccess: employee.role === 'sales' || employee.role === 'admin' || !!employee.hasCrmAccess,
      crmRole: employee.crmRole || (employee.role === 'sales' ? 'sales_rep' : undefined),
      // PR specific
      prTier: employee.prTier || (employee.role === 'pr_head' ? 'Premium' : employee.role === 'pr_intern' ? 'Silver' : undefined),
      prPoints: employee.prPoints ?? (employee.role === 'pr_head' || employee.role === 'pr_intern' ? 0 : undefined),
      prStars: employee.prStars ?? (employee.role === 'pr_head' || employee.role === 'pr_intern' ? 0 : undefined),
      totalSponsorshipRevenue: employee.totalSponsorshipRevenue || 0,
      totalCommissionEarned: employee.totalCommissionEarned || 0,
      prCustomTierPercentages: employee.prCustomTierPercentages,
      prCustomCommissionRate: employee.prCustomCommissionRate,
      // Web Dev specific
      webDevTitle: employee.webDevTitle || (
        employee.role === 'web_dev_manager' ? 'Dev Architect' :
        employee.role === 'web_developer' ? 'Web Developer' : undefined
      ),
      webDevLevel: employee.webDevLevel !== undefined ? employee.webDevLevel : (
        employee.role === 'web_dev_manager' || employee.role === 'web_developer' ? 1 : undefined
      ),
      webDevXp: employee.webDevXp !== undefined ? employee.webDevXp : (
        employee.role === 'web_dev_manager' || employee.role === 'web_developer' ? 0 : undefined
      ),
      skills: employee.skills || [],
      githubUsername: employee.githubUsername || undefined,
      avatarUrl: employee.avatarUrl || undefined,
      mustChangePassword: employee.mustChangePassword !== undefined ? employee.mustChangePassword : true,
    };

    filtered.push(created);
    this.removeDeletedId(cleanId);
    if (created.id) this.removeDeletedId(created.id);
    this.saveUsers(filtered);
    return created;
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
      joiningDate: newTeacher.joiningDate || todayStr,
      role: 'teacher',
      mustChangePassword: newTeacher.mustChangePassword !== undefined ? newTeacher.mustChangePassword : true,
    };

    filtered.push(created);
    this.removeDeletedId(cleanTeacherId);
    if (created.id) this.removeDeletedId(created.id);
    this.saveUsers(filtered);
    return created;
  },

  getPrInterns(): User[] {
    return this.getUsers().filter((u) => (u.role === 'pr_intern' || u.role === 'pr_head') && !u.isOffboarded);
  },

  addPrIntern(newIntern: Omit<User, 'id' | 'role'>): User {
    const users = this.getUsers();
    const cleanId = newIntern.teacherId.trim().toUpperCase();
    const cleanUsername = (newIntern.username?.trim().toLowerCase() || cleanId.toLowerCase()).replace(/\s+/g, '_');
    const cleanPassword = newIntern.password?.trim() || 'intern123';
    const filtered = users.filter((u) => u.teacherId.toUpperCase() !== cleanId);

    const created: User = {
      ...newIntern,
      id: `u-${Date.now()}`,
      teacherId: cleanId,
      username: cleanUsername,
      password: cleanPassword,
      name: newIntern.name.trim(),
      email: newIntern.email.trim() || `${cleanId.toLowerCase()}@aew.com`,
      department: newIntern.department?.trim() || 'Public Relations & Sponsorship',
      subject: newIntern.subject?.trim() || 'College Sponsorship & Outreach',
      dailyTargetMinutes: 0,
      dailyLimit: 0,
      role: 'pr_intern',
      prTier: newIntern.prTier || 'Silver',
      prPoints: newIntern.prPoints || 0,
      prStars: newIntern.prStars || 0,
      totalSponsorshipRevenue: newIntern.totalSponsorshipRevenue || 0,
      totalCommissionEarned: newIntern.totalCommissionEarned || 0,
      createdAt: new Date().toISOString(),
      mustChangePassword: true,
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
      prTier: updates.prTier !== undefined ? updates.prTier : users[index].prTier,
      prPoints: updates.prPoints !== undefined ? updates.prPoints : users[index].prPoints,
      prStars: updates.prStars !== undefined ? updates.prStars : users[index].prStars,
      totalSponsorshipRevenue: updates.totalSponsorshipRevenue !== undefined ? updates.totalSponsorshipRevenue : users[index].totalSponsorshipRevenue,
      totalCommissionEarned: updates.totalCommissionEarned !== undefined ? updates.totalCommissionEarned : users[index].totalCommissionEarned,
      adminTier: updates.adminTier !== undefined ? updates.adminTier : users[index].adminTier,
      adminPermissions: updates.adminPermissions !== undefined ? updates.adminPermissions : users[index].adminPermissions,
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
    let list: string[] = [];
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    }
    const MOCK_TOMBSTONES = [
      'u-pr101',
      'u-pr102',
      'u-prhead01',
      'u-wdm01',
      'u-dev01',
      'u-dev02',
      'u-test-teacher',
      'u-t101',
    ];
    // Protected accounts that must NEVER be in deletedIds
    const PROTECTED_IDS = new Set([
      'ADMIN-01',
      'ADMIN',
      'U-ADMIN',
      'AEW-T-102',
      'AEW-T-103',
      'U-1787383338021',
      'U-1787387463369',
      'BHUMI',
      'KHUSHI',
    ]);
    return Array.from(new Set([...MOCK_TOMBSTONES, ...list])).filter((id) => !PROTECTED_IDS.has(id.toUpperCase()));
  },

  removeDeletedId(id: string): void {
    if (!id) return;
    const clean = id.trim().toUpperCase();
    const data = localStorage.getItem(DELETED_IDS_KEY);
    let list: string[] = [];
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    }
    const filtered = list.filter((item) => item.toUpperCase() !== clean);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(filtered));
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

  deleteEmployee(identifier: string): { success: boolean; error?: string } {
    const cleanId = (identifier || '').trim().toUpperCase();
    if (cleanId === 'ADMIN-01' || cleanId === 'ADMIN') {
      return { success: false, error: 'Primary Super Administrator account (ADMIN-01) cannot be deleted.' };
    }
    const current = this.getCurrentUser();
    if (current && (current.id.toUpperCase() === cleanId || current.teacherId.toUpperCase() === cleanId)) {
      return { success: false, error: 'You cannot delete your own active session account.' };
    }

    this.addDeletedId(cleanId);
    const users = this.getUsers().filter((u) => u.id !== identifier && u.teacherId.toUpperCase() !== cleanId);
    this.saveUsers(users);
    return { success: true };
  },

  offboardEmployee(identifier: string, reason: string, remarks?: string): { success: boolean; error?: string; user?: User } {
    const cleanId = (identifier || '').trim().toUpperCase();
    if (cleanId === 'ADMIN-01' || cleanId === 'ADMIN') {
      return { success: false, error: 'Primary Super Administrator account (ADMIN-01) cannot be offboarded.' };
    }
    const current = this.getCurrentUser();
    if (current && (current.id.toUpperCase() === cleanId || current.teacherId.toUpperCase() === cleanId)) {
      return { success: false, error: 'You cannot offboard your own active session account.' };
    }

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === identifier || u.teacherId.toUpperCase() === cleanId);
    if (idx === -1) {
      return { success: false, error: 'Employee record not found.' };
    }

    const updated: User = {
      ...users[idx],
      isOffboarded: true,
      offboardedAt: new Date().toISOString(),
      offboardReason: reason.trim() || 'Departure / Left Organization',
      offboardRemarks: remarks?.trim() || undefined,
    };
    users[idx] = updated;
    this.saveUsers(users);
    return { success: true, user: updated };
  },

  reactivateEmployee(identifier: string): { success: boolean; error?: string; user?: User } {
    const cleanId = (identifier || '').trim().toUpperCase();
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === identifier || u.teacherId.toUpperCase() === cleanId);
    if (idx === -1) {
      return { success: false, error: 'Employee record not found.' };
    }

    const updated: User = {
      ...users[idx],
      isOffboarded: false,
      offboardedAt: undefined,
      offboardReason: undefined,
      offboardRemarks: undefined,
    };
    users[idx] = updated;
    this.saveUsers(users);
    return { success: true, user: updated };
  },

  updatePrEmployeeCommissionSettings(
    employeeId: string,
    settings: {
      customTierPercentages?: Record<PrTier, number>;
      customCommissionRate?: number;
    }
  ): User | null {
    const cleanId = employeeId.trim().toUpperCase();
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === employeeId || u.teacherId.toUpperCase() === cleanId);
    if (idx === -1) return null;

    users[idx] = {
      ...users[idx],
      prCustomTierPercentages: settings.customTierPercentages !== undefined ? settings.customTierPercentages : users[idx].prCustomTierPercentages,
      prCustomCommissionRate: settings.customCommissionRate !== undefined ? settings.customCommissionRate : users[idx].prCustomCommissionRate,
    };
    this.saveUsers(users);
    return users[idx];
  },

  removeTeacher(teacherId: string): void {
    this.deleteEmployee(teacherId);
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

  authenticateUser(identifier: string, password: string): { success: boolean; user?: User; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Username and password are required.' };
    }

    const users = this.getUsers();

    // Strict user lookup by registered username, teacher/employee ID, or email address
    const user = users.find(u => {
      const uTeacherId = (u.teacherId || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uTeacherId === cleanId || uUsername === cleanId || uEmail === cleanId;
    });

    if (!user) {
      return { success: false, error: 'Invalid username or password. Please verify your credentials.' };
    }

    // Check if employee has been offboarded / relieved
    if (user.isOffboarded) {
      return {
        success: false,
        error: `Account has been offboarded (${user.offboardReason || 'Departure'}). Access is disabled. Please contact HR administration.`,
      };
    }

    // Determine the user's authentic password (user-defined or default initial assigned password)
    const expectedPassword = (
      user.password ||
      (user.role === 'admin'
        ? 'admin123'
        : user.role === 'pr_head'
        ? 'head123'
        : user.role === 'pr_intern'
        ? 'intern123'
        : user.role === 'sales'
        ? 'sales123'
        : user.role === 'web_developer' || user.role === 'web_dev_manager'
        ? 'dev123'
        : 'teach123')
    ).trim();

    // Strict password match — no weak master passwords or universal bypasses permitted
    if (cleanPass !== expectedPassword) {
      return { success: false, error: 'Invalid username or password. Please verify your credentials.' };
    }

    return { success: true, user };
  },

  /**
   * Change user password with current password verification.
   * Clears mustChangePassword and updates lastPasswordChangedAt.
   */
  async changeUserPassword(
    identifierOrId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanId = (identifierOrId || '').trim().toLowerCase();
    const cleanCurrent = (currentPassword || '').trim();
    const cleanNew = (newPassword || '').trim();

    if (!cleanId) return { success: false, error: 'User identifier is required.' };
    if (!cleanCurrent || !cleanNew) {
      return { success: false, error: 'Both current password and new password are required.' };
    }
    if (cleanNew.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }
    if (cleanCurrent === cleanNew) {
      return { success: false, error: 'New password cannot be identical to your current password.' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(
      (u) =>
        (u.id && u.id.toLowerCase() === cleanId) ||
        (u.teacherId && u.teacherId.toLowerCase() === cleanId) ||
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    );

    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const targetUser = users[userIndex];
    const expectedPassword = (
      targetUser.password ||
      (targetUser.role === 'admin'
        ? 'admin123'
        : targetUser.role === 'pr_head'
        ? 'head123'
        : targetUser.role === 'pr_intern'
        ? 'intern123'
        : targetUser.role === 'sales'
        ? 'sales123'
        : targetUser.role === 'web_developer' || targetUser.role === 'web_dev_manager'
        ? 'dev123'
        : 'teach123')
    ).trim();

    if (cleanCurrent !== expectedPassword) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const nowIso = new Date().toISOString();
    targetUser.password = cleanNew;
    targetUser.mustChangePassword = false;
    targetUser.lastPasswordChangedAt = nowIso;
    users[userIndex] = targetUser;

    this.saveUsers(users);

    const curr = this.getCurrentUser();
    if (curr && (curr.id === targetUser.id || curr.teacherId === targetUser.teacherId)) {
      this.setCurrentUser({
        ...curr,
        password: cleanNew,
        mustChangePassword: false,
        lastPasswordChangedAt: nowIso,
      });
    }

    try {
      const token = this.getSessionToken();
      if (token) {
        await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'change_password',
            currentPassword: cleanCurrent,
            newPassword: cleanNew,
          }),
        }).catch(() => {});
      }
      await this.syncToCloud().catch(() => {});
    } catch {
      // Offline / fallback handled locally
    }

    return { success: true };
  },

  /**
   * Force set a user's password (e.g. on first-login mandatory password change).
   */
  async forceSetUserPassword(
    identifierOrId: string,
    newPassword: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanId = (identifierOrId || '').trim().toLowerCase();
    const cleanNew = (newPassword || '').trim();

    if (!cleanId) return { success: false, error: 'User identifier is required.' };
    if (!cleanNew) return { success: false, error: 'New password is required.' };
    if (cleanNew.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(
      (u) =>
        (u.id && u.id.toLowerCase() === cleanId) ||
        (u.teacherId && u.teacherId.toLowerCase() === cleanId) ||
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    );

    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const targetUser = users[userIndex];
    const nowIso = new Date().toISOString();
    targetUser.password = cleanNew;
    targetUser.mustChangePassword = false;
    targetUser.lastPasswordChangedAt = nowIso;
    users[userIndex] = targetUser;

    this.saveUsers(users);

    const curr = this.getCurrentUser();
    if (curr && (curr.id === targetUser.id || curr.teacherId === targetUser.teacherId)) {
      this.setCurrentUser({
        ...curr,
        password: cleanNew,
        mustChangePassword: false,
        lastPasswordChangedAt: nowIso,
      });
    }

    try {
      await this.syncToCloud().catch(() => {});
    } catch {
      // ignore
    }

    return { success: true, user: targetUser };
  },

  // ─── SUBJECT REFERENCE MATERIALS (WHOLE SUBJECT) ────────────────────────────

  getSubjectReferences(): SubjectReference[] {
    if (typeof localStorage === 'undefined') {
      return [...SEED_SUBJECT_REFERENCES];
    }
    const data = localStorage.getItem(SUBJECT_REFERENCES_KEY);
    if (!data) {
      try {
        localStorage.setItem(SUBJECT_REFERENCES_KEY, JSON.stringify(SEED_SUBJECT_REFERENCES));
      } catch {
        // ignore
      }
      return [...SEED_SUBJECT_REFERENCES];
    }
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      try {
        localStorage.setItem(SUBJECT_REFERENCES_KEY, JSON.stringify(SEED_SUBJECT_REFERENCES));
      } catch {
        // ignore
      }
      return [...SEED_SUBJECT_REFERENCES];
    } catch {
      return [...SEED_SUBJECT_REFERENCES];
    }
  },

  saveSubjectReferences(refs: SubjectReference[]): void {
    localStorage.setItem(SUBJECT_REFERENCES_KEY, JSON.stringify(refs));
    triggerBackgroundCloudSync();
  },

  addOrUpdateSubjectReference(ref: {
    id?: string;
    subjectName: string;
    department?: string;
    title: string;
    referenceUrl: string;
    notes?: string;
  }): SubjectReference {
    const refs = this.getSubjectReferences();
    const cleanSubject = ref.subjectName.trim();
    const cleanDept = ref.department?.trim() || 'General';
    const cleanTitle = ref.title.trim();
    const normSubj = cleanSubject.toLowerCase().replace(/\s+/g, ' ');
    const normDept = cleanDept.toLowerCase().replace(/\s+/g, ' ');
    const normTitle = cleanTitle.toLowerCase();

    // 1. If explicit ID provided, find that exact reference
    let existingIndex = ref.id ? refs.findIndex((r) => r.id === ref.id) : -1;

    // 2. If no explicit ID, match by composite key (department + subject + title)
    // This allows multiple resources per subject & department, but prevents duplicate entries with identical title.
    if (existingIndex === -1 && !ref.id) {
      existingIndex = refs.findIndex(
        (r) =>
          (r.subjectName || '').trim().toLowerCase().replace(/\s+/g, ' ') === normSubj &&
          (r.department || 'General').trim().toLowerCase().replace(/\s+/g, ' ') === normDept &&
          (r.title || '').trim().toLowerCase() === normTitle
      );
    }

    const updatedRef: SubjectReference = {
      id: existingIndex !== -1 ? refs[existingIndex].id : (ref.id || `sref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
      subjectName: cleanSubject,
      department: cleanDept,
      title: cleanTitle,
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

  /**
   * Retrieves all reference resources matching the given subjectName and optional department.
   * Matches canonical subject names (e.g. "DSA" -> "Data Structures & Algorithms")
   * with department compatibility checking.
   */
  getReferencesForSubject(subjectName: string, department?: string): SubjectReference[] {
    if (!subjectName) return [];
    const canonicalTarget = toCanonicalSubject(subjectName);
    const normTargetSubj = canonicalTarget
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const refs = this.getSubjectReferences();

    const areDeptsCompatible = (d1?: string, d2?: string): boolean => {
      if (!d1 || !d2) return true;
      const n1 = d1.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
      const n2 = d2.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
      if (!n1 || !n2 || n1 === 'general' || n1 === 'all' || n2 === 'general' || n2 === 'all') return true;
      if (n1 === n2) return true;
      if (n1.includes(n2) || n2.includes(n1)) return true;
      if ((n1 === 'cse' && n2.includes('computer')) || (n2 === 'cse' && n1.includes('computer'))) return true;
      if ((n1 === 'ece' && n2.includes('electronics')) || (n2 === 'ece' && n1.includes('electronics'))) return true;
      if ((n1 === 'me' && n2.includes('mechanical')) || (n2 === 'me' && n1.includes('mechanical'))) return true;
      if ((n1 === 'ce' && n2.includes('civil')) || (n2 === 'ce' && n1.includes('civil'))) return true;
      return false;
    };

    // 1. Canonical subject match
    const canonicalMatches = refs.filter((r) => {
      const refCanonical = toCanonicalSubject(r.subjectName || '');
      if (refCanonical.toLowerCase() !== canonicalTarget.toLowerCase()) return false;
      return areDeptsCompatible(r.department, department);
    });

    if (canonicalMatches.length > 0) return canonicalMatches;

    // 2. Exact normalized match with compatible department
    const exactMatches = refs.filter((r) => {
      const normRefSubj = (r.subjectName || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (normRefSubj !== normTargetSubj) return false;
      return areDeptsCompatible(r.department, department);
    });

    if (exactMatches.length > 0) return exactMatches;

    // 3. Near-canonical match (e.g. "Data Structures" vs "Data Structures & Algorithms")
    const nearMatches = refs.filter((r) => {
      const normRefSubj = (r.subjectName || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const isNear =
        normRefSubj.length >= 4 &&
        normTargetSubj.length >= 4 &&
        (normRefSubj.includes(normTargetSubj) || normTargetSubj.includes(normRefSubj));
      if (!isNear) return false;
      return areDeptsCompatible(r.department, department);
    });

    return nearMatches;
  },

  /**
   * Resolves the list of all distinct assigned subjects for a teacher.
   * Checks primary subject (including comma/slash separated), subjects array, and assigned topics.
   * Returns canonical subject names.
   */
  getTeacherAssignedSubjects(
    teacher: { subject?: string; subjects?: string[] },
    assignedTopics?: Array<{ subject?: string }>
  ): string[] {
    const subjectsMap = new Map<string, string>(); // canonicalKey -> canonicalSubjectName

    // 1. Teacher primary subject (supports comma/slash/semicolon separation)
    if (teacher?.subject) {
      const parts = teacher.subject.split(/[,/|;]/).map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => {
        const canonical = toCanonicalSubject(p);
        if (canonical) {
          subjectsMap.set(canonical.toLowerCase(), canonical);
        }
      });
    }

    // 2. Teacher multiple subjects array (if present in User object)
    if (Array.isArray(teacher?.subjects)) {
      teacher.subjects.forEach((s) => {
        if (s && typeof s === 'string') {
          const canonical = toCanonicalSubject(s);
          if (canonical) {
            subjectsMap.set(canonical.toLowerCase(), canonical);
          }
        }
      });
    }

    // 3. Topics assigned to this teacher
    if (Array.isArray(assignedTopics)) {
      assignedTopics.forEach((t) => {
        if (t.subject && typeof t.subject === 'string') {
          const canonical = toCanonicalSubject(t.subject);
          if (canonical) {
            subjectsMap.set(canonical.toLowerCase(), canonical);
          }
        }
      });
    }

    return Array.from(subjectsMap.values());
  },

  /**
   * Retrieves all reference resources for a teacher's assigned subjects:
   * - If a teacher is of DSA, returns all resources of DSA.
   * - If of another subject (e.g. Thermodynamics), returns all resources of that subject.
   * - If more than 1 subject is assigned, returns all resources of both (all) assigned subjects.
   * Strictly scopes to assigned subjects so faculty aren't polluted with unassigned departmental materials.
   */
  getAllReferencesForTeacher(
    teacher: { subject?: string; department?: string; subjects?: string[] },
    assignedTopics?: Array<{ subject?: string; topicTitle?: string }>
  ): SubjectReference[] {
    const assignedSubjects = this.getTeacherAssignedSubjects(teacher, assignedTopics);
    const seenIds = new Set<string>();
    const result: SubjectReference[] = [];

    // Identify primary canonical subject(s)
    const primaryCanonicalSet = new Set<string>();
    if (teacher?.subject) {
      const parts = teacher.subject.split(/[,/|;]/).map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => {
        const c = toCanonicalSubject(p);
        if (c) primaryCanonicalSet.add(c.toLowerCase());
      });
    }
    if (Array.isArray(teacher?.subjects)) {
      teacher.subjects.forEach((s) => {
        const c = toCanonicalSubject(s);
        if (c) primaryCanonicalSet.add(c.toLowerCase());
      });
    }

    // For EACH assigned subject, retrieve all its curriculum references
    for (const subj of assignedSubjects) {
      const isPrimary = primaryCanonicalSet.has(subj.toLowerCase());
      const subjectMatches = this.getReferencesForSubject(subj, teacher?.department);

      // Collect any topic titles assigned to this subject
      const linkedTopics = (assignedTopics || []).filter(
        (t) => t.subject && toCanonicalSubject(t.subject).toLowerCase() === subj.toLowerCase()
      );
      const linkedTopicTitles = linkedTopics.map((t) => t.topicTitle).filter(Boolean).join(', ');

      for (const m of subjectMatches) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          result.push({
            ...m,
            subjectName: subj, // Display canonical subject name
            scope: isPrimary ? 'primary_subject' : 'assigned_topic',
            assignedTopicTitle: linkedTopicTitles || m.assignedTopicTitle,
          });
        }
      }
    }

    // Fallback: if teacher has no subjects assigned at all, show departmental resources
    if (assignedSubjects.length === 0) {
      const allRefs = this.getSubjectReferences();
      const normTeacherDept = (teacher?.department || '').trim().toLowerCase();
      for (const r of allRefs) {
        const normRefDept = (r.department || '').trim().toLowerCase();
        const isDeptMatch = normTeacherDept && (normRefDept.includes(normTeacherDept) || normTeacherDept.includes(normRefDept));
        if (isDeptMatch && !seenIds.has(r.id)) {
          seenIds.add(r.id);
          result.push({
            ...r,
            scope: 'departmental',
          });
        }
      }
    }

    return result;
  },

  /**
   * Retrieves all subject reference materials in the portal.
   */
  getAllPortalSubjectReferences(): SubjectReference[] {
    return this.getSubjectReferences();
  },

  /**
   * Backwards-compatible single-reference lookup for a subject.
   */
  getReferenceForSubject(subjectName: string, department?: string): SubjectReference | undefined {
    return this.getReferencesForSubject(subjectName, department)[0];
  },

  // ─── ASSIGNED TOPICS WITH SUBTOPIC DEADLINES ────────────────────────────────
  getAssignedTopics(): AssignedTopic[] {
    const data = localStorage.getItem(ASSIGNED_TOPICS_KEY);
    if (!data) {
      try {
        localStorage.setItem(ASSIGNED_TOPICS_KEY, JSON.stringify(SEED_ASSIGNED_TOPICS));
      } catch {
        // ignore
      }
      return this.sortAssignedTopics([...SEED_ASSIGNED_TOPICS]);
    }
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        try {
          localStorage.setItem(ASSIGNED_TOPICS_KEY, JSON.stringify(SEED_ASSIGNED_TOPICS));
        } catch {
          // ignore
        }
        return this.sortAssignedTopics([...SEED_ASSIGNED_TOPICS]);
      }
      
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

      const deletedIds = new Set(this.getDeletedIds().map((id) => id.toUpperCase()));
      const filtered = topics.filter((t) => {
        if (!t) return false;
        if (t.id === 'at-seed-101-2') return false;
        if (deletedIds.has(t.id?.toUpperCase())) return false;
        if (t.teacherId && deletedIds.has(t.teacherId.trim().toUpperCase())) return false;
        return true;
      });

      return this.sortAssignedTopics(filtered);
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

  reuploadLectureVideo(
    lectureId: string,
    params: {
      videoLinkType: 'youtube' | 'drive';
      videoUrl: string;
      notesUrl?: string;
      durationMinutes?: number;
      reuploadReason?: string;
    }
  ): Lecture | null {
    const lectures = this.getLectures();
    const index = lectures.findIndex((l) => l.id === lectureId);
    if (index === -1) return null;

    const currentLec = lectures[index];
    const prevUrl = currentLec.youtubeUrl || currentLec.driveUrl || '';
    const prevType: 'youtube' | 'drive' = currentLec.youtubeUrl ? 'youtube' : 'drive';

    const youtubeUrl = params.videoLinkType === 'youtube' && params.videoUrl.trim() ? params.videoUrl.trim() : undefined;
    const driveUrl = params.videoLinkType === 'drive' && params.videoUrl.trim() ? params.videoUrl.trim() : undefined;

    const updatedLec: Lecture = {
      ...currentLec,
      youtubeUrl,
      driveUrl,
      notesUrl: params.notesUrl !== undefined ? (params.notesUrl.trim() || undefined) : currentLec.notesUrl,
      durationMinutes: params.durationMinutes && params.durationMinutes > 0 ? params.durationMinutes : currentLec.durationMinutes,
      reuploadedAt: new Date().toISOString(),
      reuploadReason: params.reuploadReason?.trim() || 'Video replaced by teacher',
      reuploadCount: (currentLec.reuploadCount || 0) + 1,
      previousVideoUrl: prevUrl || currentLec.previousVideoUrl,
      previousVideoType: prevType,
    };

    lectures[index] = updatedLec;
    this.saveLectures(lectures);
    this.syncToCloud().catch((err) => console.warn('[CloudSync] Reupload lecture sync error:', err));

    // Operational Email Notification: Notify Admin of Reuploaded Video
    try {
      const adminEmails = this.getUsers().filter((u) => u.role === 'admin').map((u) => u.email).filter(Boolean);
      if (adminEmails.length > 0) {
        notificationService.notifyVideoReuploaded({
          adminEmails,
          teacherName: currentLec.teacherName,
          teacherId: currentLec.teacherId,
          lectureTitle: currentLec.title,
          subject: currentLec.subject,
          newVideoUrl: params.videoUrl,
          videoType: params.videoLinkType,
          reuploadReason: params.reuploadReason || 'Video replaced by faculty',
          durationMinutes: updatedLec.durationMinutes,
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to dispatch video reupload email:', notifyErr);
    }

    return updatedLec;
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
      const stored = localStorage.getItem(EMAIL_CONFIG_KEY);
      return stored ? JSON.parse(stored) : { provider: 'smtp', smtpHost: 'smtp.gmail.com', smtpPort: 465, senderName: 'AEW Academic Operations' };
    } catch {
      return { provider: 'smtp', smtpHost: 'smtp.gmail.com', smtpPort: 465, senderName: 'AEW Academic Operations' };
    }
  },

  saveEmailConfig(config: EmailConfig): void {
    const updated = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(updated));
    triggerBackgroundCloudSync();
  },

  // ─── SENT EMAIL LOGS & CLOUD AUDIT HISTORY ──────────────────────────────
  getEmailLogs(): EmailLogItem[] {
    try {
      const data = localStorage.getItem(EMAIL_LOGS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveEmailLogs(logs: EmailLogItem[]): void {
    try {
      // Keep up to 200 newest logs
      const trimmed = logs
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 200);
      localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(trimmed));
      triggerBackgroundCloudSync();
    } catch {
      // ignore
    }
  },

  addEmailLog(logData: Omit<EmailLogItem, 'id' | 'timestamp'>): EmailLogItem {
    const newLog: EmailLogItem = {
      ...logData,
      id: `elog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    const currentLogs = this.getEmailLogs();
    const updated = [newLog, ...currentLogs.filter((l) => l.id !== newLog.id)];
    this.saveEmailLogs(updated);
    return newLog;
  },

  clearEmailLogs(): void {
    localStorage.removeItem(EMAIL_LOGS_KEY);
    triggerBackgroundCloudSync();
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
    this.syncToCloud().catch((err) => console.warn('[CloudSync] saveDayOffGrants push error:', err));
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
    this.syncToCloud().catch((err) => console.warn('[CloudSync] Immediate grantDayOff push error:', err));

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
    this.addDeletedId(grantId);
    const grants = this.getDayOffGrants().filter((g) => g.id !== grantId);
    this.saveDayOffGrants(grants);
    this.syncToCloud().catch((err) => console.warn('[CloudSync] Immediate revokeDayOff push error:', err));
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

    // 4. Resources: Available materials for this teacher's subject & department
    const teacherUser = this.getUsers().find((u) => u.teacherId.toUpperCase() === cleanId);
    const teacherSubj = (teacherUser?.subject || '').trim();
    const teacherDept = (teacherUser?.department || '').trim();
    const resources = this.getReferencesForSubject(teacherSubj, teacherDept).length;

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

  // ─── PR INTERNS TIER & GAMIFICATION HELPERS ─────────────────────────────────

  getTierCommissionRate(tier: PrTier = 'Silver', user?: User | null): number {
    if (user) {
      if (typeof user.prCustomCommissionRate === 'number' && !isNaN(user.prCustomCommissionRate)) {
        return Number(user.prCustomCommissionRate);
      }
      if (user.prCustomTierPercentages && typeof user.prCustomTierPercentages[tier] === 'number') {
        return Number(user.prCustomTierPercentages[tier]);
      }
    }
    switch (tier) {
      case 'Premium': return 12.0;
      case 'Gold': return 7.0;
      case 'Silver':
      default: return 3.3;
    }
  },

  calculateTierFromPointsAndStars(points: number = 0, stars: number = 0): PrTier {
    if (points >= 300 && stars >= 15) return 'Premium';
    if (points >= 100 && stars >= 5) return 'Gold';
    return 'Silver';
  },

  // ─── PR TASKS ───────────────────────────────────────────────────────────────

  getPrTasks(): PrTask[] {
    const data = localStorage.getItem(PR_TASKS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  savePrTasks(tasks: PrTask[]): void {
    localStorage.setItem(PR_TASKS_KEY, JSON.stringify(tasks));
    triggerBackgroundCloudSync();
  },

  createPrTask(task: Omit<PrTask, 'id' | 'createdAt' | 'status'>): PrTask {
    const tasks = this.getPrTasks();
    const newTask: PrTask = {
      ...task,
      id: `pr-task-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    this.savePrTasks(tasks);
    return newTask;
  },

  submitPrTask(taskId: string, submissionNotes: string, proofUrl?: string): PrTask | null {
    const tasks = this.getPrTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx] = {
      ...tasks[idx],
      status: 'submitted',
      submissionNotes: submissionNotes.trim(),
      submissionProofUrl: proofUrl?.trim(),
      submittedAt: new Date().toISOString(),
    };
    this.savePrTasks(tasks);
    return tasks[idx];
  },

  approvePrTask(
    taskId: string,
    awardedPoints?: number,
    awardedStars?: number,
    remarks?: string
  ): { task: PrTask; intern: User | null; promoted: boolean } | null {
    const tasks = this.getPrTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const task = tasks[idx];
    const finalPoints = awardedPoints !== undefined ? awardedPoints : task.pointsReward;
    const finalStars = awardedStars !== undefined ? awardedStars : task.starsReward;

    tasks[idx] = {
      ...task,
      status: 'approved',
      awardedPoints: finalPoints,
      awardedStars: finalStars,
      adminRemarks: remarks?.trim() || 'Task approved and verified by Academic Operations Admin.',
      reviewedAt: new Date().toISOString(),
    };
    this.savePrTasks(tasks);

    // Update Intern's cumulative points, stars, and evaluate tier promotion
    const users = this.getUsers();
    const internIdx = users.findIndex((u) => u.teacherId.toUpperCase() === task.assignedToInternId.toUpperCase());
    let promoted = false;
    let updatedIntern: User | null = null;

    if (internIdx !== -1) {
      const prev = users[internIdx];
      const newPoints = (prev.prPoints || 0) + finalPoints;
      const newStars = (prev.prStars || 0) + finalStars;
      const newTier = this.calculateTierFromPointsAndStars(newPoints, newStars);
      promoted = prev.prTier !== newTier && (newTier === 'Gold' || newTier === 'Premium');

      users[internIdx] = {
        ...prev,
        prPoints: newPoints,
        prStars: newStars,
        prTier: newTier,
      };
      this.saveUsers(users);
      updatedIntern = users[internIdx];

      // Update current session if the logged in user is this intern
      const current = this.getCurrentUser();
      if (current && current.teacherId.toUpperCase() === prev.teacherId.toUpperCase()) {
        this.setCurrentUser(users[internIdx]);
      }
    }

    return { task: tasks[idx], intern: updatedIntern, promoted };
  },

  rejectPrTask(taskId: string, remarks: string): PrTask | null {
    const tasks = this.getPrTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx] = {
      ...tasks[idx],
      status: 'revision_requested',
      adminRemarks: remarks.trim(),
      reviewedAt: new Date().toISOString(),
    };
    this.savePrTasks(tasks);
    return tasks[idx];
  },

  deletePrTask(taskId: string): void {
    const tasks = this.getPrTasks().filter((t) => t.id !== taskId);
    this.savePrTasks(tasks);
  },

  // ─── PR LEADS (SPONSORSHIP PIPELINE) ───────────────────────────────────────

  getPrLeads(): PrLead[] {
    const data = localStorage.getItem(PR_LEADS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  savePrLeads(leads: PrLead[]): void {
    localStorage.setItem(PR_LEADS_KEY, JSON.stringify(leads));
    triggerBackgroundCloudSync();
  },

  createPrLead(lead: Omit<PrLead, 'id' | 'createdAt' | 'updatedAt'>): PrLead {
    const leads = this.getPrLeads();
    const newLead: PrLead = {
      ...lead,
      id: `pr-lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    leads.unshift(newLead);
    this.savePrLeads(leads);
    return newLead;
  },

  updatePrLead(id: string, updates: Partial<PrLead>): PrLead | null {
    const leads = this.getPrLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    leads[idx] = {
      ...leads[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.savePrLeads(leads);
    return leads[idx];
  },

  updatePrLeadStage(id: string, stage: PrLeadStage, closedAmount?: number): PrLead | null {
    const leads = this.getPrLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    const lead = leads[idx];
    const isClosing = stage === 'closed_won';
    const finalAmount = isClosing ? (closedAmount || lead.expectedSponsorshipAmount) : lead.closedAmount;

    // Determine commission using intern's current tier and custom settings
    const intern = this.getUsers().find((u) => u.teacherId.toUpperCase() === lead.internId.toUpperCase());
    const tier: PrTier = intern?.prTier || lead.internTierAtClosure || 'Silver';
    const rate = this.getTierCommissionRate(tier, intern);
    const commission = isClosing && finalAmount ? Math.round((finalAmount * rate) / 100) : lead.commissionEarned;

    leads[idx] = {
      ...lead,
      stage,
      closedAmount: finalAmount,
      internTierAtClosure: tier,
      commissionRate: rate,
      commissionEarned: commission,
      updatedAt: new Date().toISOString(),
    };
    this.savePrLeads(leads);

    // If closed won, credit intern's lifetime revenue and earnings
    if (isClosing && intern && finalAmount && commission) {
      this.updateUser(intern.id, {
        totalSponsorshipRevenue: (intern.totalSponsorshipRevenue || 0) + finalAmount,
        totalCommissionEarned: (intern.totalCommissionEarned || 0) + commission,
      });
    }

    return leads[idx];
  },

  deletePrLead(id: string): void {
    const leads = this.getPrLeads().filter((l) => l.id !== id);
    this.savePrLeads(leads);
  },

  // ─── PR MOUS (MEMORANDUM OF UNDERSTANDING MAKER) ───────────────────────────

  getPrMous(): PrMouRequest[] {
    const data = localStorage.getItem(PR_MOUS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  savePrMous(mous: PrMouRequest[]): void {
    localStorage.setItem(PR_MOUS_KEY, JSON.stringify(mous));
    triggerBackgroundCloudSync();
  },

  createPrMou(mou: Omit<PrMouRequest, 'id' | 'generatedAt' | 'mouNumber'>): PrMouRequest {
    const list = this.getPrMous();
    const count = list.length + 1;
    const mouNumber = `AEW/MOU/2026/${String(count).padStart(3, '0')}`;
    const newMou: PrMouRequest = {
      ...mou,
      id: `mou-${Date.now()}`,
      mouNumber,
      status: mou.status || 'pending_admin_approval',
      generatedAt: new Date().toISOString(),
    };
    list.unshift(newMou);
    this.savePrMous(list);
    return newMou;
  },

  updatePrMouStatus(id: string, status: PrMouStatus, feedback?: string): PrMouRequest | null {
    const list = this.getPrMous();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      status,
      adminFeedback: feedback?.trim() || list[idx].adminFeedback,
      approvedAt: status === 'approved' ? new Date().toISOString() : list[idx].approvedAt,
      signedAt: status === 'signed' ? new Date().toISOString() : list[idx].signedAt,
    };
    this.savePrMous(list);
    return list[idx];
  },

  deletePrMou(id: string): void {
    const list = this.getPrMous().filter((m) => m.id !== id);
    this.savePrMous(list);
  },

  // ─── PR COLLEGES (CAMPUS DIRECTORY) ────────────────────────────────────────

  getPrColleges(): PrCollege[] {
    const data = localStorage.getItem(PR_COLLEGES_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  savePrColleges(colleges: PrCollege[]): void {
    localStorage.setItem(PR_COLLEGES_KEY, JSON.stringify(colleges));
    triggerBackgroundCloudSync();
  },

  addPrCollege(college: Omit<PrCollege, 'id' | 'createdAt' | 'updatedAt'>): PrCollege {
    const list = this.getPrColleges();
    const newCol: PrCollege = {
      ...college,
      id: `col-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newCol);
    this.savePrColleges(list);
    return newCol;
  },

  updatePrCollege(id: string, updates: Partial<PrCollege>): PrCollege | null {
    const list = this.getPrColleges();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.savePrColleges(list);
    return list[idx];
  },

  deletePrCollege(id: string): void {
    const list = this.getPrColleges().filter((c) => c.id !== id);
    this.savePrColleges(list);
  },

  // ─── SALES CRM (LEADS, CALL LOGGING & EMPLOYEE VISIBILITY) ──────────────────

  getSalesLeads(): SalesLead[] {
    const data = localStorage.getItem(SALES_LEADS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  saveSalesLeads(leads: SalesLead[]): void {
    localStorage.setItem(SALES_LEADS_KEY, JSON.stringify(leads));
    triggerBackgroundCloudSync();
  },

  addSalesLead(leadData: Omit<SalesLead, 'id' | 'createdAt' | 'updatedAt' | 'activityLogs'> & { activityLogs?: SalesActivityLog[] }): SalesLead {
    const list = this.getSalesLeads();
    const now = new Date().toISOString();
    const newLead: SalesLead = {
      ...leadData,
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      activityLogs: leadData.activityLogs || [],
    };
    list.unshift(newLead);
    this.saveSalesLeads(list);
    return newLead;
  },

  updateSalesLead(id: string, updates: Partial<SalesLead>): SalesLead | null {
    const list = this.getSalesLeads();
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveSalesLeads(list);
    return list[idx];
  },

  deleteSalesLead(id: string): void {
    const list = this.getSalesLeads().filter((l) => l.id !== id);
    this.saveSalesLeads(list);
  },

  addSalesActivityLog(leadId: string, logData: Omit<SalesActivityLog, 'id' | 'timestamp'>): SalesActivityLog | null {
    const list = this.getSalesLeads();
    const idx = list.findIndex((l) => l.id === leadId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const newLog: SalesActivityLog = {
      ...logData,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
    };

    const targetLead = list[idx];
    const updatedLogs = [...(targetLead.activityLogs || []), newLog];

    list[idx] = {
      ...targetLead,
      lastContactedAt: now,
      lastCallPicked: newLog.callPicked,
      lastDisposition: typeof newLog.disposition === 'string' ? newLog.disposition : undefined,
      lastFeedback: newLog.feedback,
      nextFollowUpDate: newLog.wantToCallAgain ? (newLog.callbackDate || targetLead.nextFollowUpDate) : targetLead.nextFollowUpDate,
      nextFollowUpTime: newLog.wantToCallAgain ? (newLog.callbackTime || targetLead.nextFollowUpTime) : targetLead.nextFollowUpTime,
      status: newLog.stageAfter || targetLead.status,
      activityLogs: updatedLogs,
      updatedAt: now,
    };

    this.saveSalesLeads(list);
    return newLog;
  },

  bulkAssignSalesLeads(leadIds: string[], employeeId: string, employeeName: string): number {
    const list = this.getSalesLeads();
    const targetSet = new Set(leadIds);
    let count = 0;
    const now = new Date().toISOString();

    list.forEach((lead) => {
      if (targetSet.has(lead.id)) {
        lead.assignedToEmployeeId = employeeId;
        lead.assignedToEmployeeName = employeeName;
        lead.updatedAt = now;
        count++;
      }
    });

    if (count > 0) {
      this.saveSalesLeads(list);
    }
    return count;
  },

  // ─── CRM PERMISSIONS / VISIBILITY ──────────────────────────────────────────

  getCrmPermissions(): Record<string, { hasCrmAccess: boolean; crmRole?: string }> {
    const data = localStorage.getItem(CRM_PERMISSIONS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return {};
  },

  saveCrmPermissions(perms: Record<string, { hasCrmAccess: boolean; crmRole?: string }>): void {
    localStorage.setItem(CRM_PERMISSIONS_KEY, JSON.stringify(perms));
    triggerBackgroundCloudSync();
  },

  setEmployeeCrmAccess(employeeId: string, hasCrmAccess: boolean, crmRole: 'sales_rep' | 'sales_manager' = 'sales_rep'): void {
    const perms = this.getCrmPermissions();
    perms[employeeId] = {
      hasCrmAccess,
      crmRole,
    };
    this.saveCrmPermissions(perms);

    // Also synchronize user in local user roster
    const users = this.getUsers();
    const user = users.find((u) => u.id === employeeId || u.teacherId === employeeId);
    if (user) {
      this.updateUser(user.id, {
        hasCrmAccess,
        crmRole,
      });
    }
  },

  hasUserCrmAccess(user: User | null): boolean {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'sales') return true;
    if (user.hasCrmAccess) return true;

    const perms = this.getCrmPermissions();
    if (perms[user.id]?.hasCrmAccess) return true;
    if (perms[user.teacherId]?.hasCrmAccess) return true;

    // Check if any leads are assigned to this employee
    const myLeads = this.getSalesLeads().some(
      (l) => l.assignedToEmployeeId && (l.assignedToEmployeeId === user.id || l.assignedToEmployeeId === user.teacherId)
    );
    return myLeads;
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
      prTasks: this.getPrTasks(),
      prLeads: this.getPrLeads(),
      prMous: this.getPrMous(),
      prColleges: this.getPrColleges(),
      salesLeads: this.getSalesLeads(),
      crmPermissions: this.getCrmPermissions(),
      emailConfig: this.getEmailConfig(),
      emailLogs: this.getEmailLogs(),
      webDevProjects: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aew_webdev_projects_v2') || '[]') : [],
      webDevMilestones: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aew_webdev_milestones_v2') || '[]') : [],
      webDevTasks: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aew_webdev_tasks_v2') || '[]') : [],
      webDevBounties: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aew_webdev_bounties_v2') || '[]') : [],
      webDevXpLedger: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aew_webdev_xp_ledger_v2') || '[]') : [],
      webDevFulfillments: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aew_webdev_fulfillments_v2') || '[]') : [],
      webDevKudos: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aew_webdev_kudos_v2') || '[]') : [],
      webDevAuditLogs: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aew_webdev_audit_logs_v2') || '[]') : [],
      offerLetters: this.getOfferLetters(),
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

    // Smart merge webDevProjects
    if (Array.isArray(state.webDevProjects)) {
      const localProjRaw = localStorage.getItem('aew_webdev_projects_v2');
      const localProjects: any[] = localProjRaw ? JSON.parse(localProjRaw) : [];
      const projMap = new Map<string, any>();
      localProjects.forEach((p) => {
        if (p && p.id && !deletedIds.has(p.id.toUpperCase())) projMap.set(p.id, p);
      });
      state.webDevProjects.forEach((cloudProj: any) => {
        if (!cloudProj || !cloudProj.id || deletedIds.has(cloudProj.id.toUpperCase())) return;
        const local = projMap.get(cloudProj.id);
        if (!local) {
          projMap.set(cloudProj.id, cloudProj);
        } else {
          const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
          const cloudTime = cloudProj.updatedAt ? new Date(cloudProj.updatedAt).getTime() : 0;
          projMap.set(cloudProj.id, cloudTime >= localTime ? { ...local, ...cloudProj } : { ...cloudProj, ...local });
        }
      });
      localStorage.setItem('aew_webdev_projects_v2', JSON.stringify(Array.from(projMap.values()).filter((p) => !deletedIds.has(p.id.toUpperCase()))));
    }

    // Smart merge webDevMilestones
    if (Array.isArray(state.webDevMilestones)) {
      const localRaw = localStorage.getItem('aew_webdev_milestones_v2');
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      const itemMap = new Map<string, any>();
      localList.forEach((m) => {
        if (m && m.id && !deletedIds.has(m.id.toUpperCase())) itemMap.set(m.id, m);
      });
      state.webDevMilestones.forEach((cloudItem: any) => {
        if (cloudItem && cloudItem.id && !deletedIds.has(cloudItem.id.toUpperCase())) {
          const local = itemMap.get(cloudItem.id);
          if (!local) {
            itemMap.set(cloudItem.id, cloudItem);
          } else {
            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
            itemMap.set(cloudItem.id, cloudTime >= localTime ? { ...local, ...cloudItem } : { ...cloudItem, ...local });
          }
        }
      });
      localStorage.setItem('aew_webdev_milestones_v2', JSON.stringify(Array.from(itemMap.values())));
    }

    // Smart merge webDevTasks (all dev, manager & admin deliverables)
    if (Array.isArray(state.webDevTasks)) {
      const localTasksRaw = localStorage.getItem('aew_webdev_tasks_v2');
      const localTasks: any[] = localTasksRaw ? JSON.parse(localTasksRaw) : [];
      const localMap = new Map<string, any>();
      localTasks.forEach((t) => {
        if (t && t.id && !deletedIds.has(t.id.toUpperCase())) {
          localMap.set(t.id, t);
        }
      });

      state.webDevTasks.forEach((cloudTask: any) => {
        if (!cloudTask || !cloudTask.id || deletedIds.has(cloudTask.id.toUpperCase())) return;
        const local = localMap.get(cloudTask.id);
        if (!local) {
          localMap.set(cloudTask.id, cloudTask);
        } else {
          const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
          const cloudTime = cloudTask.updatedAt ? new Date(cloudTask.updatedAt).getTime() : 0;

          const winner = cloudTime >= localTime ? cloudTask : local;
          const loser = cloudTime >= localTime ? local : cloudTask;

          // Merge subtasks de-duplicating by id
          const subtaskMap = new Map<string, any>();
          (loser.subtasks || []).forEach((s: any) => { if (s && s.id) subtaskMap.set(s.id, s); });
          (winner.subtasks || []).forEach((s: any) => { if (s && s.id) subtaskMap.set(s.id, s); });

          // Merge comments de-duplicating by id
          const commentMap = new Map<string, any>();
          (loser.comments || []).forEach((c: any) => { if (c && c.id) commentMap.set(c.id, c); });
          (winner.comments || []).forEach((c: any) => { if (c && c.id) commentMap.set(c.id, c); });

          const mergedComments = Array.from(commentMap.values()).sort(
            (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          );

          const mergedTask = {
            ...winner,
            subtasks: Array.from(subtaskMap.values()),
            comments: mergedComments,
          };

          localMap.set(cloudTask.id, mergedTask);
        }
      });

      const finalTasks = Array.from(localMap.values()).filter((t) => !deletedIds.has(t.id.toUpperCase()));
      localStorage.setItem('aew_webdev_tasks_v2', JSON.stringify(finalTasks));
    }

    // Smart merge webDevBounties
    if (Array.isArray(state.webDevBounties)) {
      const localRaw = localStorage.getItem('aew_webdev_bounties_v2');
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      const itemMap = new Map<string, any>();
      localList.forEach((b) => {
        if (b && b.id && !deletedIds.has(b.id.toUpperCase())) itemMap.set(b.id, b);
      });
      state.webDevBounties.forEach((cloudItem: any) => {
        if (cloudItem && cloudItem.id && !deletedIds.has(cloudItem.id.toUpperCase())) {
          const local = itemMap.get(cloudItem.id);
          if (!local) itemMap.set(cloudItem.id, cloudItem);
          else {
            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
            itemMap.set(cloudItem.id, cloudTime >= localTime ? { ...local, ...cloudItem } : { ...cloudItem, ...local });
          }
        }
      });
      localStorage.setItem('aew_webdev_bounties_v2', JSON.stringify(Array.from(itemMap.values())));
    }

    // Smart merge webDevXpLedger
    if (Array.isArray(state.webDevXpLedger)) {
      const localRaw = localStorage.getItem('aew_webdev_xp_ledger_v2');
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      const itemMap = new Map<string, any>();
      localList.forEach((x) => { if (x && x.id) itemMap.set(x.id, x); });
      state.webDevXpLedger.forEach((x: any) => { if (x && x.id) itemMap.set(x.id, x); });
      localStorage.setItem('aew_webdev_xp_ledger_v2', JSON.stringify(Array.from(itemMap.values())));
    }

    // Smart merge webDevFulfillments
    if (Array.isArray(state.webDevFulfillments)) {
      const localRaw = localStorage.getItem('aew_webdev_fulfillments_v2');
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      const itemMap = new Map<string, any>();
      localList.forEach((f) => { if (f && f.id && !deletedIds.has(f.id.toUpperCase())) itemMap.set(f.id, f); });
      state.webDevFulfillments.forEach((f: any) => {
        if (f && f.id && !deletedIds.has(f.id.toUpperCase())) itemMap.set(f.id, f);
      });
      localStorage.setItem('aew_webdev_fulfillments_v2', JSON.stringify(Array.from(itemMap.values())));
    }

    // Smart merge webDevKudos
    if (Array.isArray(state.webDevKudos)) {
      const localRaw = localStorage.getItem('aew_webdev_kudos_v2');
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      const itemMap = new Map<string, any>();
      localList.forEach((k) => { if (k && k.id) itemMap.set(k.id, k); });
      state.webDevKudos.forEach((k: any) => { if (k && k.id) itemMap.set(k.id, k); });
      localStorage.setItem('aew_webdev_kudos_v2', JSON.stringify(Array.from(itemMap.values())));
    }

    // Smart merge webDevAuditLogs
    if (Array.isArray(state.webDevAuditLogs)) {
      const localRaw = localStorage.getItem('aew_webdev_audit_logs_v2');
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      const itemMap = new Map<string, any>();
      localList.forEach((a) => { if (a && a.id) itemMap.set(a.id, a); });
      state.webDevAuditLogs.forEach((a: any) => { if (a && a.id) itemMap.set(a.id, a); });
      const sorted = Array.from(itemMap.values())
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 300);
      localStorage.setItem('aew_webdev_audit_logs_v2', JSON.stringify(sorted));
    }

    // Smart merge emailConfig: Never overwrite valid local credentials with empty cloud object
    if (state.emailConfig && typeof state.emailConfig === 'object') {
      const localConfig = this.getEmailConfig();
      const cloudHasCreds = Boolean(state.emailConfig.smtpPass || state.emailConfig.smtpUser || state.emailConfig.resendApiKey);
      const localHasCreds = Boolean(localConfig.smtpPass || localConfig.smtpUser || localConfig.resendApiKey);

      if (cloudHasCreds) {
        localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify({
          ...localConfig,
          ...state.emailConfig,
        }));
      } else if (localHasCreds) {
        triggerBackgroundCloudSync();
      }
    }

    // Smart merge emailLogs: Preserve audit history across devices
    if (Array.isArray(state.emailLogs)) {
      const localLogs = this.getEmailLogs();
      const logMap = new Map<string, EmailLogItem>();
      localLogs.forEach((l) => logMap.set(l.id, l));
      state.emailLogs.forEach((l: EmailLogItem) => {
        if (l && l.id) {
          const existing = logMap.get(l.id);
          logMap.set(l.id, existing ? { ...existing, ...l } : l);
        }
      });
      const mergedLogs = Array.from(logMap.values())
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 200);
      localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(mergedLogs));
    }

    if (Array.isArray(state.users) && state.users.length > 0) {
      const existingUsers = this.getUsers();
      const userMap = new Map<string, User>();
      existingUsers.forEach((u) => {
        if (!deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase()) && !isHardcodedMockUser(u)) {
          userMap.set(u.teacherId.toUpperCase(), u);
        }
      });
      state.users.forEach((u: User) => {
        if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && (!u.id || !deletedIds.has(u.id.toUpperCase())) && !isHardcodedMockUser(u)) {
          const existing = userMap.get(u.teacherId.toUpperCase());
          const isExistingReal = Boolean(existing?.email && !String(existing.email).endsWith('@aew.com'));
          const isCloudReal = Boolean(u?.email && !String(u.email).endsWith('@aew.com'));
          const resolvedEmail: string = (isCloudReal ? u.email : (isExistingReal ? existing?.email : (u.email || existing?.email || `${u.teacherId.toLowerCase()}@aew.com`))) || `${u.teacherId.toLowerCase()}@aew.com`;

          userMap.set(u.teacherId.toUpperCase(), {
            ...existing,
            ...u,
            email: resolvedEmail,
          });
        }
      });
      const cleanUsers = Array.from(userMap.values()).filter((u) => !isHardcodedMockUser(u));
      localStorage.setItem(USERS_KEY, JSON.stringify(cleanUsers));
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
      const localRefs = this.getSubjectReferences();
      const refMap = new Map<string, SubjectReference>();
      localRefs.forEach((r) => {
        if (!deletedIds.has(r.id.toUpperCase())) refMap.set(r.id, r);
      });
      state.subjectReferences.forEach((cloudRef: SubjectReference) => {
        if (cloudRef && cloudRef.id && !deletedIds.has(cloudRef.id.toUpperCase())) {
          const local = refMap.get(cloudRef.id);
          if (!local) {
            refMap.set(cloudRef.id, cloudRef);
          } else {
            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            const cloudTime = cloudRef.updatedAt ? new Date(cloudRef.updatedAt).getTime() : 0;
            refMap.set(cloudRef.id, cloudTime >= localTime ? { ...local, ...cloudRef } : { ...cloudRef, ...local });
          }
        }
      });
      localStorage.setItem(SUBJECT_REFERENCES_KEY, JSON.stringify(Array.from(refMap.values())));
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

    // Smart merge PR Tasks
    if (Array.isArray(state.prTasks)) {
      const localTasks = this.getPrTasks();
      const prMap = new Map<string, PrTask>();
      localTasks.forEach((t) => {
        if (!deletedIds.has(t.id.toUpperCase())) prMap.set(t.id, t);
      });
      state.prTasks.forEach((cloudTask: PrTask) => {
        if (cloudTask && cloudTask.id && !deletedIds.has(cloudTask.id.toUpperCase())) {
          const local = prMap.get(cloudTask.id);
          if (!local) {
            prMap.set(cloudTask.id, cloudTask);
          } else {
            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            const cloudTime = cloudTask.updatedAt ? new Date(cloudTask.updatedAt).getTime() : 0;
            prMap.set(cloudTask.id, cloudTime >= localTime ? { ...local, ...cloudTask } : { ...cloudTask, ...local });
          }
        }
      });
      localStorage.setItem(PR_TASKS_KEY, JSON.stringify(Array.from(prMap.values())));
    }

    if (Array.isArray(state.prLeads)) {
      localStorage.setItem(PR_LEADS_KEY, JSON.stringify(state.prLeads));
    }

    if (Array.isArray(state.prMous)) {
      localStorage.setItem(PR_MOUS_KEY, JSON.stringify(state.prMous));
    }

    if (Array.isArray(state.prColleges)) {
      localStorage.setItem(PR_COLLEGES_KEY, JSON.stringify(state.prColleges));
    }

    // Smart merge Sales Leads
    if (Array.isArray(state.salesLeads)) {
      const localLeads = this.getSalesLeads();
      const leadMap = new Map<string, SalesLead>();
      localLeads.forEach((l) => {
        if (!deletedIds.has(l.id.toUpperCase())) leadMap.set(l.id, l);
      });
      state.salesLeads.forEach((cloudLead: SalesLead) => {
        if (cloudLead && cloudLead.id && !deletedIds.has(cloudLead.id.toUpperCase())) {
          const local = leadMap.get(cloudLead.id);
          if (!local) {
            leadMap.set(cloudLead.id, cloudLead);
          } else {
            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            const cloudTime = cloudLead.updatedAt ? new Date(cloudLead.updatedAt).getTime() : 0;
            leadMap.set(cloudLead.id, cloudTime >= localTime ? { ...local, ...cloudLead } : { ...cloudLead, ...local });
          }
        }
      });
      localStorage.setItem(SALES_LEADS_KEY, JSON.stringify(Array.from(leadMap.values())));
    }

    // Smart merge Offer Letters
    if (Array.isArray(state.offerLetters)) {
      const localOffers = this.getOfferLetters();
      const offerMap = new Map<string, OfferLetter>();
      localOffers.forEach((o) => {
        if (!deletedIds.has(o.id.toUpperCase())) offerMap.set(o.id, o);
      });
      state.offerLetters.forEach((cloudOffer: OfferLetter) => {
        if (cloudOffer && cloudOffer.id && !deletedIds.has(cloudOffer.id.toUpperCase())) {
          const local = offerMap.get(cloudOffer.id);
          if (!local) {
            offerMap.set(cloudOffer.id, cloudOffer);
          } else {
            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            const cloudTime = cloudOffer.updatedAt ? new Date(cloudOffer.updatedAt).getTime() : 0;
            offerMap.set(cloudOffer.id, cloudTime >= localTime ? { ...local, ...cloudOffer } : { ...cloudOffer, ...local });
          }
        }
      });
      localStorage.setItem(OFFER_LETTERS_KEY, JSON.stringify(Array.from(offerMap.values())));
    }

    if (state.crmPermissions && typeof state.crmPermissions === 'object') {
      localStorage.setItem(CRM_PERMISSIONS_KEY, JSON.stringify(state.crmPermissions));
    }

    // Dispatch global broadcast event so open pages/tabs/components refresh without needing full reload
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aew_webdev_tasks_synced'));
      window.dispatchEvent(new CustomEvent('aew_cloud_data_synced'));
      window.dispatchEvent(new Event('storage'));
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

  getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SESSION_TOKEN_KEY);
  },

  setSessionToken(token: string | null): void {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  },

  clearSessionToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_TOKEN_KEY);
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getSessionToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },

  async syncFromCloud(): Promise<boolean> {
    // Only perform cloud sync if user has an active authenticated session
    const authHeaders = this.getAuthHeaders();
    if (!authHeaders.Authorization) {
      return false;
    }

    try {
      const res = await fetch('/api/cloud-sync', {
        headers: {
          Accept: 'application/json',
          ...authHeaders,
        },
      });

      if (res.status === 401) {
        // Token invalid or expired
        return false;
      }

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
    const authHeaders = this.getAuthHeaders();
    if (!authHeaders.Authorization) {
      return false;
    }

    const payload = this.exportMasterState();

    try {
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ data: payload }),
      });

      if (res.status === 401) {
        return false;
      }

      return res.ok;
    } catch (err) {
      console.warn('[CloudSync] Sync push error:', err);
      return false;
    }
  },

  triggerBackgroundCloudSync(): void {
    triggerBackgroundCloudSync();
  },

  initCloudSync(onUpdate?: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    // Initial fetch on mount (only runs if session token is present)
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

  // ==========================================
  // OFFER LETTER GENERATOR REPOSITORY & CRUD
  // ==========================================
  getOfferLetters(): OfferLetter[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(OFFER_LETTERS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[Storage] Error reading offer letters:', e);
    }
    return [];
  },

  saveOfferLetter(offer: OfferLetter): OfferLetter {
    const list = this.getOfferLetters();
    const existingIdx = list.findIndex(l => l.id === offer.id);
    const updatedOffer: OfferLetter = {
      ...offer,
      updatedAt: new Date().toISOString(),
    };

    let nextList: OfferLetter[];
    if (existingIdx >= 0) {
      nextList = [...list];
      nextList[existingIdx] = updatedOffer;
    } else {
      nextList = [updatedOffer, ...list];
    }

    try {
      localStorage.setItem(OFFER_LETTERS_KEY, JSON.stringify(nextList));
    } catch (e) {
      console.error('[Storage] Error saving offer letter:', e);
    }
    return updatedOffer;
  },

  deleteOfferLetter(id: string): void {
    const list = this.getOfferLetters();
    const nextList = list.filter(l => l.id !== id);
    try {
      localStorage.setItem(OFFER_LETTERS_KEY, JSON.stringify(nextList));
    } catch (e) {
      console.error('[Storage] Error deleting offer letter:', e);
    }
  },

  updateOfferLetterStatus(id: string, status: OfferLetterStatus): void {
    const list = this.getOfferLetters();
    const letter = list.find(l => l.id === id);
    if (letter) {
      letter.status = status;
      letter.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(OFFER_LETTERS_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('[Storage] Error updating offer letter status:', e);
      }
    }
  },
};
