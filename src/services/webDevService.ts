import type {
  WebDevProject,
  WebDevMilestone,
  WebDevTask,
  WebDevSubtask,
  WebDevSubmission,
  WebDevComment,
  WebDevBounty,
  WebDevXPTransaction,
  WebDevAchievement,
  WebDevUserAchievement,
  WebDevReward,
  WebDevRewardFulfillment,
  WebDevTeamChallenge,
  WebDevKudos,
  WebDevAuditLog,
  WebDevNotification,
  WebDevLeaderboardEntry,
  User,
  UserRole,
} from '../types';
import { StorageService } from './storage';

// ─── LOCAL STORAGE KEYS (V2 CLEAN) ───────────────────────────────────────────
const PROJECTS_KEY = 'aew_webdev_projects_v2';
const MILESTONES_KEY = 'aew_webdev_milestones_v2';
const TASKS_KEY = 'aew_webdev_tasks_v2';
const BOUNTIES_KEY = 'aew_webdev_bounties_v2';
const XP_LEDGER_KEY = 'aew_webdev_xp_ledger_v2';
const ACHIEVEMENTS_KEY = 'aew_webdev_achievements_v2';
const USER_ACHIEVEMENTS_KEY = 'aew_webdev_user_achievements_v2';
const REWARDS_KEY = 'aew_webdev_rewards_v2';
const FULFILLMENTS_KEY = 'aew_webdev_fulfillments_v2';
const CHALLENGES_KEY = 'aew_webdev_challenges_v2';
const KUDOS_KEY = 'aew_webdev_kudos_v2';
const AUDIT_LOGS_KEY = 'aew_webdev_audit_logs_v2';
const NOTIFICATIONS_KEY = 'aew_webdev_notifications_v2';

const OLD_V1_KEYS = [
  'aew_webdev_projects_v1',
  'aew_webdev_milestones_v1',
  'aew_webdev_tasks_v1',
  'aew_webdev_bounties_v1',
  'aew_webdev_xp_ledger_v1',
  'aew_webdev_achievements_v1',
  'aew_webdev_user_achievements_v1',
  'aew_webdev_rewards_v1',
  'aew_webdev_fulfillments_v1',
  'aew_webdev_challenges_v1',
  'aew_webdev_kudos_v1',
  'aew_webdev_audit_logs_v1',
  'aew_webdev_notifications_v1',
];

// ─── DEFAULT SEED DATA (CLEAN FOR PRODUCTION) ──────────────────────────────────
const SEED_PROJECTS: WebDevProject[] = [];
const SEED_MILESTONES: WebDevMilestone[] = [];
const SEED_TASKS: WebDevTask[] = [];
const SEED_BOUNTIES: WebDevBounty[] = [];

const SEED_ACHIEVEMENTS: WebDevAchievement[] = [
  {
    id: 'ACH-FIRST-PR',
    key: 'FIRST_PR',
    title: 'First Pull Request',
    description: 'Submit your first engineering solution or PR for review',
    iconName: 'GitPullRequest',
    xpBonus: 50,
    category: 'sprint',
  },
  {
    id: 'ACH-BUG-SLAYER',
    key: 'BUG_SLAYER',
    title: 'Bug Slayer',
    description: 'Successfully resolve and close 3 bugfix tasks with zero regressions',
    iconName: 'ShieldCheck',
    xpBonus: 100,
    category: 'quality',
  },
  {
    id: 'ACH-BOUNTY-HUNTER',
    key: 'BOUNTY_HUNTER',
    title: 'Bounty Hunter',
    description: 'Claim, solve, and complete 2 open engineering bounties',
    iconName: 'Target',
    xpBonus: 150,
    category: 'bounty',
  },
  {
    id: 'ACH-SPRINT-LEGEND',
    key: 'SPRINT_LEGEND',
    title: 'Sprint Legend',
    description: 'Accumulate over 1,500 total XP through high-velocity deliveries',
    iconName: 'Trophy',
    xpBonus: 250,
    category: 'leadership',
  },
];

const SEED_USER_ACHIEVEMENTS: WebDevUserAchievement[] = [];

const SEED_REWARDS: WebDevReward[] = [
  {
    id: 'REW-CERT-LVL1',
    title: 'Junior Web Developer Certificate',
    description: 'Official credential verifying foundational competence in frontend UI development, task delivery, and Git workflow.',
    type: 'certificate',
    category: 'certificate',
    xpThreshold: 500,
    icon: 'Award',
    iconName: 'Award',
    isActive: true,
    status: 'active',
    approvalRequired: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'REW-CERT-LVL2',
    title: 'Full Stack Developer Credential',
    description: 'Conferred for demonstrable mastery of full-stack engineering, clean APIs, resilient state management, and reliable delivery.',
    type: 'certificate',
    category: 'certificate',
    xpThreshold: 1200,
    icon: 'ShieldCheck',
    iconName: 'ShieldCheck',
    isActive: true,
    status: 'active',
    approvalRequired: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'REW-CERT-LVL3',
    title: 'Senior Web Architect Fellowship',
    description: 'Prestigious fellowship recognition for leading complex modules, zero-defect refactoring, and outstanding mentorship.',
    type: 'certificate',
    category: 'certificate',
    xpThreshold: 2200,
    icon: 'Crown',
    iconName: 'Crown',
    isActive: true,
    status: 'active',
    approvalRequired: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'REW-SWAG-PACK',
    title: 'AEW Engineering Swag & Hoodie Pack',
    description: 'Exclusive custom embroidered Apna Engineering Wallah Developer Hoodie, mechanical keyboard accessories, and tech stickers.',
    type: 'swag',
    category: 'swag',
    xpThreshold: 3000,
    icon: 'Gift',
    iconName: 'Gift',
    isActive: true,
    status: 'active',
    approvalRequired: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'REW-CERT-LVL4',
    title: 'Principal Staff Engineer Laureate',
    description: 'Highest honor in the AEW Engineering Division awarded for organizational-wide system architecture and transformative engineering impact.',
    type: 'certificate',
    category: 'certificate',
    xpThreshold: 3500,
    icon: 'Trophy',
    iconName: 'Trophy',
    isActive: true,
    status: 'active',
    approvalRequired: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const SEED_FULFILLMENTS: WebDevRewardFulfillment[] = [];
const SEED_XP_LEDGER: WebDevXPTransaction[] = [];

const SEED_CHALLENGES: WebDevTeamChallenge[] = [
  {
    id: 'CHAL-SPRINT-01',
    title: 'Sprint 1: Zero-Defect Architecture & Platform Velocity',
    description: 'Combined engineering goal for the squad to deliver core platform modules, squash open bugs, and close technical debt with automated tests.',
    goalXp: 3000,
    currentXp: 0,
    startDate: '2026-09-01',
    endDate: '2026-10-15',
    rewardDescription: 'Team Engineering Excellence Trophy + Leadership Dinner & Swag Kits',
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

const SEED_KUDOS: WebDevKudos[] = [];
const SEED_AUDIT_LOGS: WebDevAuditLog[] = [];

// Helper to calculate Level from XP
// Level 1: 0 - 499
// Level 2: 500 - 1,199
// Level 3: 1,200 - 2,199
// Level 4: 2,200 - 3,499
// Level 5: 3,500+
export function calculateLevelFromXp(xp: number): { level: number; title: string; nextLevelXp: number; progressPercent: number } {
  const cleanXp = Math.max(0, xp || 0);
  if (cleanXp < 500) {
    return {
      level: 1,
      title: 'Junior Web Developer',
      nextLevelXp: 500,
      progressPercent: Math.round((cleanXp / 500) * 100),
    };
  } else if (cleanXp < 1200) {
    return {
      level: 2,
      title: 'Intermediate Web Developer',
      nextLevelXp: 1200,
      progressPercent: Math.round(((cleanXp - 500) / (1200 - 500)) * 100),
    };
  } else if (cleanXp < 2200) {
    return {
      level: 3,
      title: 'Full Stack Developer',
      nextLevelXp: 2200,
      progressPercent: Math.round(((cleanXp - 1200) / (2200 - 1200)) * 100),
    };
  } else if (cleanXp < 3500) {
    return {
      level: 4,
      title: 'Senior Web Developer',
      nextLevelXp: 3500,
      progressPercent: Math.round(((cleanXp - 2200) / (3500 - 2200)) * 100),
    };
  } else {
    return {
      level: 5,
      title: 'Principal Web Architect',
      nextLevelXp: 5000,
      progressPercent: Math.min(100, Math.round(((cleanXp - 3500) / (5000 - 3500)) * 100)),
    };
  }
}

// ─── MOCK DETECTION HELPERS (Targeted only at legacy hardcoded test strings) ──────────────────────
export function isMockBounty(b: any): boolean {
  if (!b) return false;
  const id = String(b.id || '').toUpperCase();
  const claimedByName = String(b.claimedByName || '').toLowerCase();

  // Only filter explicitly prefixed legacy test items
  if (id.startsWith('PREV-BOUNTY-') || id === 'MOCK-BOUNTY-01') return true;
  if (claimedByName.includes('aarav sharma test') || claimedByName.includes('neha gupta test')) return true;
  return false;
}

export function isMockTask(t: any): boolean {
  if (!t) return false;
  const id = String(t.id || '').toUpperCase();
  const title = String(t.title || '').toLowerCase();
  const assigneeName = String(t.assigneeName || '').toLowerCase();

  // Only filter explicitly prefixed legacy test items
  if (id.startsWith('PREV-TASK-') || id === 'MOCK-TASK-01') return true;
  if (assigneeName === 'aarav sharma test' || assigneeName === 'neha gupta test') return true;
  if (title === 'legacy database indexing mock test 2025') return true;
  return false;
}

export function isMockProject(p: any): boolean {
  if (!p) return false;
  const id = String(p.id || '').toUpperCase();
  const title = String(p.title || '').toLowerCase();

  // Only filter explicitly prefixed legacy test items
  if (id.startsWith('PREV-PROJ-') || id === 'MOCK-PROJ-01') return true;
  if (title === 'legacy test project 2025') return true;
  return false;
}

// ─── LEGACY MOCK DATA PURGE HELPER (One-time migration guard) ──────────────────────────
let hasPurgedOnce = false;
export function purgeLegacyWebDevMockData(): void {
  if (typeof window === 'undefined' || hasPurgedOnce) return;
  hasPurgedOnce = true;
  try {
    // 1. Wipe all old _v1 mock storage keys from user's browser
    OLD_V1_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });

    // Also scan localStorage and remove any key starting with 'aew_webdev_' that is not '_v2'
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('aew_webdev_') && !k.endsWith('_v2')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

// Safely invoke one-time legacy cleanup
purgeLegacyWebDevMockData();

// ─── SERVICE IMPLEMENTATION ───────────────────────────────────────────────────
export const WebDevService = {
  // ─── STORAGE HELPERS ───────────────────────────────────────────────────────
  _load<T>(key: string, seed: T[]): T[] {
    if (typeof window === 'undefined') return seed;
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return seed;
    } catch {
      return seed;
    }
  },

  _save<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
    StorageService.triggerBackgroundCloudSync();
    window.dispatchEvent(new CustomEvent('aew_webdev_tasks_synced'));
  },

  getManagerId(): string {
    try {
      const users = StorageService.getUsers();
      const manager = users.find((u) => u.role === 'web_dev_manager' && !u.isOffboarded);
      return manager?.teacherId || manager?.id || 'ADMIN-01';
    } catch {
      return 'ADMIN-01';
    }
  },

  // ─── PROJECTS ──────────────────────────────────────────────────────────────
  getProjects(): WebDevProject[] {
    return this._load<WebDevProject>(PROJECTS_KEY, SEED_PROJECTS).filter((p) => !isMockProject(p));
  },

  getProjectById(id: string): WebDevProject | undefined {
    return this.getProjects().find((p) => p.id === id);
  },

  calculateProjectProgress(projectId: string): number {
    const tasks = this.getTasks({ projectId });
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  },

  recalculateProjectAndMilestoneProgress(projectId: string, milestoneId?: string): void {
    if (projectId) {
      const proj = this.getProjectById(projectId);
      if (proj) {
        const pct = this.calculateProjectProgress(projectId);
        proj.progressPercentage = pct;
        if (pct === 100 && proj.status !== 'completed') {
          proj.status = 'completed';
        } else if (pct > 0 && proj.status === 'planning') {
          proj.status = 'in_progress';
        }
        const list = this.getProjects();
        const idx = list.findIndex((p) => p.id === projectId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], progressPercentage: pct, status: proj.status, updatedAt: new Date().toISOString() };
          this._save(PROJECTS_KEY, list);
        }
      }
    }

    if (milestoneId) {
      const milestones = this.getMilestones();
      const milestone = milestones.find((m) => m.id === milestoneId);
      if (milestone) {
        const milestoneTasks = this.getTasks().filter((t) => t.milestoneId === milestoneId);
        if (milestoneTasks.length > 0) {
          const completedCount = milestoneTasks.filter((t) => t.status === 'completed').length;
          milestone.progressPercentage = Math.round((completedCount / milestoneTasks.length) * 100);
          if (completedCount === milestoneTasks.length) {
            milestone.status = 'completed';
          } else if (completedCount > 0) {
            milestone.status = 'in_progress';
          }
          this.saveMilestone(milestone);
        }
      }
    }
  },

  saveProject(project: WebDevProject, performedBy?: { id: string; name: string }): WebDevProject {
    const list = this.getProjects();
    const idx = list.findIndex((p) => p.id === project.id);
    const now = new Date().toISOString();
    let updated: WebDevProject;

    if (idx >= 0) {
      updated = { ...list[idx], ...project, updatedAt: now };
      list[idx] = updated;
      this.logAudit({
        action: 'PROJECT_UPDATED',
        entityType: 'project',
        entityId: project.id,
        performedByUserId: performedBy?.id || 'SYSTEM',
        performedByUserName: performedBy?.name || 'System',
        details: `Updated project: ${project.title} (${project.status}, ${project.progressPercentage}%)`,
      });
    } else {
      updated = {
        ...project,
        id: project.id || `PROJ-${Date.now().toString().slice(-4)}`,
        createdAt: now,
        updatedAt: now,
      };
      list.push(updated);
      this.logAudit({
        action: 'PROJECT_CREATED',
        entityType: 'project',
        entityId: updated.id,
        performedByUserId: performedBy?.id || 'SYSTEM',
        performedByUserName: performedBy?.name || 'System',
        details: `Created new project: ${project.title}`,
      });
    }

    this._save(PROJECTS_KEY, list);

    if (project.milestones && Array.isArray(project.milestones) && project.milestones.length > 0) {
      project.milestones.forEach((m, idx) => {
        this.saveMilestone({
          ...m,
          projectId: updated.id,
          order: m.order !== undefined ? m.order : idx + 1,
        });
      });
    }

    return updated;
  },

  deleteProject(id: string, performedBy?: { id: string; name: string }): boolean {
    const list = this.getProjects();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      StorageService.addDeletedId(id);
      this._save(PROJECTS_KEY, filtered);

      // Clean up and tombstone all milestones associated with this project
      const milestones = this.getMilestones();
      const remainingMilestones = milestones.filter((m) => {
        if (m.projectId === id) {
          StorageService.addDeletedId(m.id);
          return false;
        }
        return true;
      });
      if (remainingMilestones.length !== milestones.length) {
        this._save(MILESTONES_KEY, remainingMilestones);
      }

      this.logAudit({
        action: 'PROJECT_DELETED',
        entityType: 'project',
        entityId: id,
        performedByUserId: performedBy?.id || 'SYSTEM',
        performedByUserName: performedBy?.name || 'System',
        details: `Deleted project: ${id} and cleaned up associated milestones`,
      });
      return true;
    }
    return false;
  },

  // ─── MILESTONES ────────────────────────────────────────────────────────────
  getMilestones(projectId?: string): WebDevMilestone[] {
    const all = this._load<WebDevMilestone>(MILESTONES_KEY, SEED_MILESTONES);
    if (projectId) return all.filter((m) => m.projectId === projectId);
    return all;
  },

  saveMilestone(milestone: WebDevMilestone): WebDevMilestone {
    const list = this.getMilestones();
    const idx = list.findIndex((m) => m.id === milestone.id);
    let updated: WebDevMilestone;
    if (idx >= 0) {
      updated = { ...list[idx], ...milestone };
      list[idx] = updated;
    } else {
      updated = {
        ...milestone,
        id: milestone.id || `MS-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
      };
      list.push(updated);
    }
    this._save(MILESTONES_KEY, list);
    return updated;
  },

  deleteMilestone(id: string): boolean {
    const list = this.getMilestones();
    const filtered = list.filter((m) => m.id !== id);
    if (filtered.length !== list.length) {
      StorageService.addDeletedId(id);
      this._save(MILESTONES_KEY, filtered);
      return true;
    }
    return false;
  },

  // ─── TASKS ─────────────────────────────────────────────────────────────────
  getTasks(filter?: {
    projectId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
  }): WebDevTask[] {
    let list = this._load<WebDevTask>(TASKS_KEY, SEED_TASKS).filter((t) => !isMockTask(t));
    if (filter?.projectId) list = list.filter((t) => t.projectId === filter.projectId);
    if (filter?.assigneeId) {
      const cleanFilterId = filter.assigneeId.trim().toUpperCase();
      const matchedUser = StorageService.getUsers().find(
        (u) => u.teacherId.toUpperCase() === cleanFilterId || (u.id && u.id.toUpperCase() === cleanFilterId)
      );
      const validIds = new Set<string>([cleanFilterId]);
      if (matchedUser) {
        validIds.add(matchedUser.teacherId.toUpperCase());
        if (matchedUser.id) validIds.add(matchedUser.id.toUpperCase());
      }
      list = list.filter((t) => {
        const cleanAssigneeId = (t.assigneeId || '').trim().toUpperCase();
        return validIds.has(cleanAssigneeId);
      });
    }
    if (filter?.status) list = list.filter((t) => t.status === filter.status);
    if (filter?.priority) list = list.filter((t) => t.priority === filter.priority);
    return list;
  },

  getTaskById(id: string): WebDevTask | undefined {
    return this.getTasks().find((t) => t.id === id);
  },

  saveTask(task: WebDevTask, performedBy?: { id: string; name: string }): WebDevTask {
    const list = this.getTasks();
    const idx = list.findIndex((t) => t.id === task.id);
    const now = new Date().toISOString();
    let updated: WebDevTask;

    if (idx >= 0) {
      updated = { ...list[idx], ...task, updatedAt: now };
      list[idx] = updated;
      this.logAudit({
        action: 'TASK_UPDATED',
        entityType: 'task',
        entityId: task.id,
        performedByUserId: performedBy?.id || 'SYSTEM',
        performedByUserName: performedBy?.name || 'System',
        details: `Updated task: ${task.title} (Status: ${task.status})`,
      });
    } else {
      updated = {
        ...task,
        id: task.id || `DEV-TASK-${Date.now().toString().slice(-4)}`,
        createdAt: now,
        updatedAt: now,
      };
      list.push(updated);
      this.logAudit({
        action: 'TASK_CREATED',
        entityType: 'task',
        entityId: updated.id,
        performedByUserId: performedBy?.id || 'SYSTEM',
        performedByUserName: performedBy?.name || 'System',
        details: `Created new task: ${task.title} (XP: ${task.xpReward}, Assignee: ${task.assigneeName || 'Unassigned'})`,
      });
    }

    this._save(TASKS_KEY, list);
    return updated;
  },

  updateTask(taskId: string, updates: Partial<WebDevTask>, performedBy?: { id: string; name: string }): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    const updated: WebDevTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.saveTask(updated, performedBy);
  },

  deleteTask(id: string, performedBy?: { id: string; name: string }): boolean {
    const list = this.getTasks();
    const taskToDelete = list.find((t) => t.id === id);
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length !== list.length) {
      StorageService.addDeletedId(id);
      this._save(TASKS_KEY, filtered);
      if (taskToDelete?.projectId) {
        this.recalculateProjectAndMilestoneProgress(taskToDelete.projectId);
      }
      this.logAudit({
        action: 'TASK_DELETED',
        entityType: 'task',
        entityId: id,
        performedByUserId: performedBy?.id || 'SYSTEM',
        performedByUserName: performedBy?.name || 'System',
        details: `Deleted task: ${id}`,
      });
      return true;
    }
    return false;
  },

  // Developer reports blocker on a task
  reportTaskBlocker(taskId: string, reason: string, developer: { id: string; name: string }): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    task.isBlocked = true;
    task.blockerReason = reason;
    task.status = 'blocked';
    const comment: WebDevComment = {
      id: `comm-blk-${Date.now()}`,
      taskId,
      authorId: developer.id,
      authorName: developer.name,
      authorRole: 'web_developer',
      content: `🛑 Blocked: ${reason}`,
      createdAt: new Date().toISOString(),
    };
    task.comments = [...(task.comments || []), comment];

    this.saveTask(task, developer);
    this.createNotification({
      userId: task.reviewerId || this.getManagerId(),
      title: `Task Blocked: ${task.title}`,
      message: `${developer.name} reported a blocker: "${reason}"`,
      type: 'warning',
      link: `/tasks/${task.id}`,
    });

    return task;
  },

  // Developer or manager resolves blocker
  resolveTaskBlocker(taskId: string, resolvedBy: { id: string; name: string; role?: string }): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    task.isBlocked = false;
    task.blockerReason = undefined;
    task.status = 'in_progress';
    const comment: WebDevComment = {
      id: `comm-res-${Date.now()}`,
      taskId,
      authorId: resolvedBy.id,
      authorName: resolvedBy.name,
      authorRole: (resolvedBy.role as any) || 'web_developer',
      content: `✅ Blocker resolved by ${resolvedBy.name}. Resuming work.`,
      createdAt: new Date().toISOString(),
    };
    task.comments = [...(task.comments || []), comment];
    this.saveTask(task, resolvedBy);
    return task;
  },

  // Toggle subtask completion
  toggleSubtask(taskId: string, subtaskId: string, completed: boolean): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task || !task.subtasks) return null;
    const sub = task.subtasks.find((s) => s.id === subtaskId);
    if (sub) {
      sub.completed = completed;
      sub.completedAt = completed ? new Date().toISOString() : undefined;
      this.saveTask(task);
    }
    return task;
  },

  // Add a subtask to task
  addSubtask(taskId: string, title: string): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    const newSub: WebDevSubtask = {
      id: `sub-${Date.now().toString().slice(-6)}`,
      taskId,
      title,
      completed: false,
    };
    task.subtasks = [...(task.subtasks || []), newSub];
    return this.saveTask(task);
  },

  // Add a comment to task
  addTaskComment(
    taskId: string,
    comment: { authorId: string; authorName: string; authorRole: string; content: string }
  ): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    const newComm: WebDevComment = {
      id: `comm-${Date.now().toString().slice(-6)}`,
      taskId,
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorRole: comment.authorRole as any,
      content: comment.content,
      createdAt: new Date().toISOString(),
    };
    task.comments = [...(task.comments || []), newComm];
    return this.saveTask(task);
  },

  // Developer submits work for review
  submitTaskForReview(
    taskId: string,
    submission: {
      developerId: string;
      developerName: string;
      summary: string;
      githubPrUrl?: string;
      liveUrl?: string;
      notes?: string;
    }
  ): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const subRecord: WebDevSubmission = {
      id: `subm-${Date.now().toString().slice(-6)}`,
      taskId,
      developerId: submission.developerId,
      developerName: submission.developerName,
      summary: submission.summary,
      githubPrUrl: submission.githubPrUrl,
      liveUrl: submission.liveUrl,
      notes: submission.notes,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    task.submission = subRecord;
    task.status = 'review_requested';
    if (submission.githubPrUrl) task.githubPrUrl = submission.githubPrUrl;
    if (submission.liveUrl) task.liveDemoUrl = submission.liveUrl;

    const comm: WebDevComment = {
      id: `comm-sub-${Date.now()}`,
      taskId,
      authorId: submission.developerId,
      authorName: submission.developerName,
      authorRole: 'web_developer',
      content: `🚀 Submitted work for review:\n${submission.summary}${submission.githubPrUrl ? `\nPR: ${submission.githubPrUrl}` : ''}${submission.liveUrl ? `\nLive Demo: ${submission.liveUrl}` : ''}`,
      createdAt: new Date().toISOString(),
    };
    task.comments = [...(task.comments || []), comm];

    this.saveTask(task, { id: submission.developerId, name: submission.developerName });

    // Notify reviewer / manager
    this.createNotification({
      userId: task.reviewerId || this.getManagerId(),
      title: `Review Requested: ${task.title}`,
      message: `${submission.developerName} submitted work for "${task.title}".`,
      type: 'info',
      link: `/review?taskId=${task.id}`,
    });

    return task;
  },

  // Manager or Admin reviews task: Approve (with bonus XP)
  approveTaskSubmission(
    taskId: string,
    reviewer: { id: string; name: string; role?: string },
    feedback: string,
    bonusXp: number = 0
  ): { task: WebDevTask; totalXpAwarded: number } | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    const baseReward = task.xpReward || 100;
    const cleanBonus = Math.max(0, bonusXp || 0);
    const totalAwarded = baseReward + cleanBonus;

    if (task.submission) {
      task.submission.status = 'approved';
      task.submission.managerFeedback = feedback;
      task.submission.bonusXpAwarded = cleanBonus;
      task.submission.reviewedBy = reviewer.id;
      task.submission.reviewedAt = now;
    }

    task.status = 'completed';
    task.completedAt = now;

    // Resolve reviewer role (admin vs web_dev_manager)
    const reviewerUser = StorageService.getUsers().find(
      (u) => (u.teacherId && u.teacherId.toUpperCase() === (reviewer.id || '').toUpperCase()) ||
             (u.id && u.id.toUpperCase() === (reviewer.id || '').toUpperCase())
    );
    const resolvedRole = (reviewer.role || reviewerUser?.role || 'web_dev_manager') as UserRole;

    // Add review comment
    const comm: WebDevComment = {
      id: `comm-appr-${Date.now()}`,
      taskId,
      authorId: reviewer.id,
      authorName: reviewer.name,
      authorRole: resolvedRole,
      content: `🎉 Submission Approved!\nFeedback: ${feedback}\nAwarded: ${baseReward} XP${cleanBonus > 0 ? ` + ${cleanBonus} Bonus XP` : ''}`,
      createdAt: now,
    };
    task.comments = [...(task.comments || []), comm];

    this.saveTask(task, reviewer);

    // Award XP to developer in XP Ledger
    if (task.assigneeId) {
      this.awardXP({
        userId: task.assigneeId,
        userName: task.assigneeName || task.assigneeId,
        amount: baseReward,
        type: 'task_approved',
        sourceId: task.id,
        description: `Approved Task: ${task.title}`,
        awardedById: reviewer.id,
        awardedByName: reviewer.name,
      });

      if (cleanBonus > 0) {
        this.awardXP({
          userId: task.assigneeId,
          userName: task.assigneeName || task.assigneeId,
          amount: cleanBonus,
          type: 'manager_bonus',
          sourceId: task.id,
          description: `Manager Excellence Bonus for: ${task.title}`,
          awardedById: reviewer.id,
          awardedByName: reviewer.name,
        });
      }

      this.createNotification({
        userId: task.assigneeId,
        title: `Task Approved (+${totalAwarded} XP)`,
        message: `Your work on "${task.title}" was approved by ${reviewer.name}. Feedback: "${feedback}"`,
        type: 'success',
        link: `/tasks/${task.id}`,
      });

      // Check for automatic achievement unlocks
      this.checkAndUnlockAchievements(task.assigneeId);
    }

    this.logAudit({
      action: 'TASK_APPROVED',
      entityType: 'task',
      entityId: task.id,
      performedByUserId: reviewer.id,
      performedByUserName: reviewer.name,
      details: `Approved "${task.title}" for ${task.assigneeName || 'developer'}. Base: ${baseReward} XP, Bonus: ${cleanBonus} XP`,
    });

    // Recalculate project and milestone progress
    if (task.projectId) {
      this.recalculateProjectAndMilestoneProgress(task.projectId, task.milestoneId);
    }

    return { task, totalXpAwarded: totalAwarded };
  },

  // Manager or Admin requests changes
  requestChangesTaskSubmission(
    taskId: string,
    reviewer: { id: string; name: string; role?: string },
    feedback: string
  ): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    if (task.submission) {
      task.submission.status = 'changes_requested';
      task.submission.managerFeedback = feedback;
      task.submission.reviewedBy = reviewer.id;
      task.submission.reviewedAt = now;
    }

    task.status = 'changes_requested';

    const reviewerUser = StorageService.getUsers().find(
      (u) => (u.teacherId && u.teacherId.toUpperCase() === (reviewer.id || '').toUpperCase()) ||
             (u.id && u.id.toUpperCase() === (reviewer.id || '').toUpperCase())
    );
    const resolvedRole = (reviewer.role || reviewerUser?.role || 'web_dev_manager') as UserRole;

    const comm: WebDevComment = {
      id: `comm-cr-${Date.now()}`,
      taskId,
      authorId: reviewer.id,
      authorName: reviewer.name,
      authorRole: resolvedRole,
      content: `📝 Changes Requested:\n${feedback}`,
      createdAt: now,
    };
    task.comments = [...(task.comments || []), comm];

    this.saveTask(task, reviewer);

    if (task.assigneeId) {
      this.createNotification({
        userId: task.assigneeId,
        title: `Changes Requested: ${task.title}`,
        message: `${reviewer.name} requested modifications on "${task.title}". Feedback: "${feedback}"`,
        type: 'warning',
        link: `/tasks/${task.id}`,
      });
    }

    this.logAudit({
      action: 'CHANGES_REQUESTED',
      entityType: 'task',
      entityId: task.id,
      performedByUserId: reviewer.id,
      performedByUserName: reviewer.name,
      details: `Requested revisions on "${task.title}". Feedback: "${feedback}"`,
    });

    return task;
  },

  // Manager or Admin rejects submission
  rejectTaskSubmission(
    taskId: string,
    reviewer: { id: string; name: string; role?: string },
    feedback: string
  ): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    if (task.submission) {
      task.submission.status = 'rejected';
      task.submission.managerFeedback = feedback;
      task.submission.reviewedBy = reviewer.id;
      task.submission.reviewedAt = now;
    }

    task.status = 'in_progress';

    const reviewerUser = StorageService.getUsers().find(
      (u) => (u.teacherId && u.teacherId.toUpperCase() === (reviewer.id || '').toUpperCase()) ||
             (u.id && u.id.toUpperCase() === (reviewer.id || '').toUpperCase())
    );
    const resolvedRole = (reviewer.role || reviewerUser?.role || 'web_dev_manager') as UserRole;

    const comm: WebDevComment = {
      id: `comm-rej-${Date.now()}`,
      taskId,
      authorId: reviewer.id,
      authorName: reviewer.name,
      authorRole: resolvedRole,
      content: `❌ Submission Rejected:\n${feedback}`,
      createdAt: now,
    };
    task.comments = [...(task.comments || []), comm];

    this.saveTask(task, reviewer);

    if (task.assigneeId) {
      this.createNotification({
        userId: task.assigneeId,
        title: `Submission Rejected: ${task.title}`,
        message: `Submission rejected by ${reviewer.name}. Please review feedback and resubmit.`,
        type: 'error',
        link: `/tasks/${task.id}`,
      });
    }

    return task;
  },

  // Mark Task with Time-Based Completion (Done On-Time, Done Late, or Not Done)
  markTaskTimeBasedStatus(
    taskId: string,
    params: {
      status: 'on_time' | 'late' | 'not_done';
      xpAwarded: number;
      notes?: string;
      evaluator: { id: string; name: string; role: string };
    }
  ): WebDevTask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    const cleanXp = Math.max(0, Number(params.xpAwarded) || 0);

    task.completionStatus = params.status;
    task.timeMarkedBy = params.evaluator.id;
    task.timeMarkedByName = params.evaluator.name;
    task.timeMarkedAt = now;
    task.timeMarkedNote = params.notes?.trim() || undefined;
    task.actualXpAwarded = params.status === 'not_done' ? 0 : cleanXp;
    task.updatedAt = now;

    if (params.status === 'on_time') {
      task.status = 'completed';
      task.completedAt = now;
    } else if (params.status === 'late') {
      task.status = 'completed';
      task.completedAt = now;
    } else {
      task.status = 'not_done';
    }

    if (task.submission) {
      task.submission.status = params.status === 'not_done' ? 'rejected' : 'approved';
      task.submission.reviewedBy = params.evaluator.id;
      task.submission.reviewedAt = now;
      task.submission.managerFeedback = params.notes;
    }

    const statusLabel = 
      params.status === 'on_time' ? '✅ Completed On-Time' :
      params.status === 'late' ? '⏰ Completed Late / Overdue' :
      '❌ Marked Not Done (Missed Deadline)';

    const comm: WebDevComment = {
      id: `comm-time-${Date.now()}`,
      taskId,
      authorId: params.evaluator.id,
      authorName: params.evaluator.name,
      authorRole: params.evaluator.role as any,
      content: `⏱️ Time-Based Evaluation: ${statusLabel}\nXP Awarded: +${task.actualXpAwarded} XP${params.notes ? `\nNotes: ${params.notes}` : ''}`,
      createdAt: now,
    };
    task.comments = [...(task.comments || []), comm];

    this.saveTask(task, { id: params.evaluator.id, name: params.evaluator.name });

    // Award XP to assignee if positive
    if (task.assigneeId && task.actualXpAwarded > 0) {
      this.awardXP({
        userId: task.assigneeId,
        userName: task.assigneeName || task.assigneeId,
        amount: task.actualXpAwarded,
        type: params.status === 'on_time' ? 'task_approved' : 'admin_adjustment',
        sourceId: task.id,
        description: `Time-Based Evaluation (${params.status === 'on_time' ? 'On-Time' : 'Late'}): ${task.title}`,
        awardedById: params.evaluator.id,
        awardedByName: params.evaluator.name,
      });

      this.checkAndUnlockAchievements(task.assigneeId);
    }

    if (task.assigneeId) {
      this.createNotification({
        userId: task.assigneeId,
        title: `Task Time Evaluation: ${statusLabel}`,
        message: `Task "${task.title}" was evaluated as ${statusLabel} by ${params.evaluator.name}. Awarded: +${task.actualXpAwarded} XP.`,
        type: params.status === 'not_done' ? 'error' : (params.status === 'on_time' ? 'success' : 'warning'),
        link: `/tasks/${task.id}`,
      });
    }

    this.logAudit({
      action: params.status === 'on_time' ? 'TASK_TIME_EVALUATED_ON_TIME' : (params.status === 'late' ? 'TASK_TIME_EVALUATED_LATE' : 'TASK_TIME_EVALUATED_MISSED'),
      entityType: 'task',
      entityId: task.id,
      performedByUserId: params.evaluator.id,
      performedByUserName: params.evaluator.name,
      details: `${statusLabel} for "${task.title}" (${task.assigneeName || 'developer'}). Awarded: +${task.actualXpAwarded} XP`,
    });

    // Recalculate project and milestone progress
    if (task.projectId) {
      this.recalculateProjectAndMilestoneProgress(task.projectId, task.milestoneId);
    }

    return task;
  },

  // ─── BOUNTIES ──────────────────────────────────────────────────────────────
  getBounties(): WebDevBounty[] {
    return this._load<WebDevBounty>(BOUNTIES_KEY, SEED_BOUNTIES).filter((b) => !isMockBounty(b));
  },

  saveBounty(bounty: WebDevBounty, performedBy?: { id: string; name: string }): WebDevBounty {
    const list = this.getBounties();
    const idx = list.findIndex((b) => b.id === bounty.id);
    let updated: WebDevBounty;
    if (idx >= 0) {
      updated = { ...list[idx], ...bounty };
      list[idx] = updated;
    } else {
      updated = {
        ...bounty,
        id: bounty.id || `BOUNTY-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
      };
      list.push(updated);
    }
    this._save(BOUNTIES_KEY, list);
    this.logAudit({
      action: idx >= 0 ? 'BOUNTY_UPDATED' : 'BOUNTY_CREATED',
      entityType: 'bounty',
      entityId: updated.id,
      performedByUserId: performedBy?.id || 'SYSTEM',
      performedByUserName: performedBy?.name || 'System',
      details: `Bounty: ${updated.title} (Status: ${updated.status}, XP: ${updated.xpReward})`,
    });
    return updated;
  },

  deleteBounty(id: string): boolean {
    const list = this.getBounties();
    const filtered = list.filter((b) => b.id !== id);
    if (filtered.length !== list.length) {
      StorageService.addDeletedId(id);
      this._save(BOUNTIES_KEY, filtered);
      return true;
    }
    return false;
  },

  claimBounty(bountyId: string, developer: { id: string; name: string }): WebDevBounty | null {
    const list = this.getBounties();
    const bounty = list.find((b) => b.id === bountyId);
    if (!bounty || bounty.status !== 'open') return null;

    bounty.status = 'assigned';
    bounty.claimedById = developer.id;
    bounty.claimedByName = developer.name;
    bounty.claimedAt = new Date().toISOString();
    this._save(BOUNTIES_KEY, list);

    this.createNotification({
      userId: this.getManagerId(),
      title: `Bounty Claimed: ${bounty.title}`,
      message: `${developer.name} claimed bounty for ${bounty.xpReward} XP.`,
      type: 'info',
    });

    return bounty;
  },

  submitBounty(bountyId: string, developer: { id: string; name: string }, submissionUrl: string): WebDevBounty | null {
    const list = this.getBounties();
    const bounty = list.find((b) => b.id === bountyId);
    if (!bounty) return null;

    // Resilient ID match against claimedById (checking teacherId and id case-insensitively)
    const cleanClaimed = (bounty.claimedById || '').trim().toUpperCase();
    const cleanDev = (developer.id || '').trim().toUpperCase();
    const matchedUser = StorageService.getUsers().find(
      (u) =>
        (u.teacherId && u.teacherId.toUpperCase() === cleanDev) ||
        (u.id && u.id.toUpperCase() === cleanDev)
    );
    const validDevIds = new Set<string>([cleanDev]);
    if (matchedUser) {
      if (matchedUser.teacherId) validDevIds.add(matchedUser.teacherId.toUpperCase());
      if (matchedUser.id) validDevIds.add(matchedUser.id.toUpperCase());
    }

    if (!cleanClaimed || !validDevIds.has(cleanClaimed)) return null;

    bounty.status = 'submitted';
    bounty.submissionUrl = submissionUrl;
    bounty.submittedAt = new Date().toISOString();
    this._save(BOUNTIES_KEY, list);

    this.createNotification({
      userId: this.getManagerId(),
      title: `Bounty Submitted: ${bounty.title}`,
      message: `${developer.name} submitted solution: ${submissionUrl}`,
      type: 'info',
    });

    return bounty;
  },

  approveBounty(
    bountyId: string,
    reviewer: { id: string; name: string },
    feedback: string
  ): WebDevBounty | null {
    const list = this.getBounties();
    const bounty = list.find((b) => b.id === bountyId);
    if (!bounty || !bounty.claimedById) return null;

    const now = new Date().toISOString();
    bounty.status = 'completed';
    bounty.reviewedById = reviewer.id;
    bounty.reviewedByName = reviewer.name;
    bounty.reviewedAt = now;
    bounty.feedback = feedback;
    this._save(BOUNTIES_KEY, list);

    // Award XP
    this.awardXP({
      userId: bounty.claimedById,
      userName: bounty.claimedByName || bounty.claimedById,
      amount: bounty.xpReward || 100,
      type: 'bounty_approved',
      sourceId: bounty.id,
      description: `Completed Bounty: ${bounty.title}`,
      awardedById: reviewer.id,
      awardedByName: reviewer.name,
    });

    this.createNotification({
      userId: bounty.claimedById,
      title: `Bounty Approved (+${bounty.xpReward || 100} XP)`,
      message: `Your bounty submission for "${bounty.title}" was approved by ${reviewer.name}!`,
      type: 'success',
    });

    this.checkAndUnlockAchievements(bounty.claimedById);

    return bounty;
  },

  rejectBounty(
    bountyId: string,
    reviewer: { id: string; name: string },
    feedback: string,
    reopenForAnyone: boolean = false
  ): WebDevBounty | null {
    const list = this.getBounties();
    const bounty = list.find((b) => b.id === bountyId);
    if (!bounty) return null;

    const previousClaimantId = bounty.claimedById;
    const previousClaimantName = bounty.claimedByName;
    const now = new Date().toISOString();

    if (reopenForAnyone) {
      bounty.status = 'open';
      bounty.claimedById = undefined;
      bounty.claimedByName = undefined;
      bounty.claimedAt = undefined;
      bounty.submissionUrl = undefined;
      bounty.submittedAt = undefined;
    } else {
      bounty.status = 'assigned';
    }

    bounty.reviewedById = reviewer.id;
    bounty.reviewedByName = reviewer.name;
    bounty.reviewedAt = now;
    bounty.feedback = feedback;
    this._save(BOUNTIES_KEY, list);

    if (previousClaimantId) {
      this.createNotification({
        userId: previousClaimantId,
        title: `Bounty Rework Requested: ${bounty.title}`,
        message: `${reviewer.name} reviewed your submission for "${bounty.title}": "${feedback}". ${reopenForAnyone ? 'The bounty has been reopened for the team.' : 'Please update your solution and resubmit.'}`,
        type: 'warning',
      });
    }

    this.logAudit({
      action: 'BOUNTY_REJECTED',
      entityType: 'bounty',
      entityId: bounty.id,
      performedByUserId: reviewer.id,
      performedByUserName: reviewer.name,
      details: `Requested revisions/rejected submission for "${bounty.title}" by ${previousClaimantName || previousClaimantId || 'developer'}. Feedback: "${feedback}". Reopened: ${reopenForAnyone}`,
    });

    return bounty;
  },

  // ─── XP & LEDGER ───────────────────────────────────────────────────────────
  getXPLedger(userId?: string): WebDevXPTransaction[] {
    const all = this._load<WebDevXPTransaction>(XP_LEDGER_KEY, SEED_XP_LEDGER);
    if (userId) {
      const clean = userId.trim().toUpperCase();
      const matched = StorageService.getUsers().find(
        (u) => u.teacherId.toUpperCase() === clean || (u.id && u.id.toUpperCase() === clean)
      );
      const validIds = new Set<string>([clean]);
      if (matched) {
        validIds.add(matched.teacherId.toUpperCase());
        if (matched.id) validIds.add(matched.id.toUpperCase());
      }
      return all.filter((tx) => validIds.has((tx.userId || '').trim().toUpperCase()));
    }
    return all.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  awardXP(tx: {
    userId: string;
    userName: string;
    amount: number;
    type: 'task_approved' | 'bounty_approved' | 'achievement_unlocked' | 'manager_bonus' | 'kudos_received' | 'challenge_completed' | 'admin_adjustment' | string;
    sourceId?: string;
    description: string;
    awardedById?: string;
    awardedByName?: string;
  }): WebDevXPTransaction {
    const list = this._load<WebDevXPTransaction>(XP_LEDGER_KEY, SEED_XP_LEDGER);
    const newTx: WebDevXPTransaction = {
      id: `TX-${Date.now().toString().slice(-6)}`,
      userId: tx.userId,
      userName: tx.userName,
      amount: tx.amount,
      type: tx.type,
      sourceId: tx.sourceId,
      description: tx.description,
      awardedById: tx.awardedById,
      awardedByName: tx.awardedByName,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newTx);
    this._save(XP_LEDGER_KEY, list);

    // Synchronize user in StorageService
    const users = StorageService.getUsers();
    const cleanUserId = (tx.userId || '').trim().toUpperCase();
    const user = users.find(
      (u) => u.teacherId.toUpperCase() === cleanUserId || (u.id && u.id.toUpperCase() === cleanUserId)
    );
    if (user) {
      const currentXp = (user.webDevXp || 0) + tx.amount;
      const levelInfo = calculateLevelFromXp(currentXp);
      user.webDevXp = currentXp;
      user.webDevLevel = levelInfo.level;
      user.webDevTitle = levelInfo.title;
      StorageService.saveUsers(users);

      // CRITICAL: Update CURRENT_USER_KEY if currently logged-in user so UI updates immediately
      const currentUser = StorageService.getCurrentUser();
      if (
        currentUser &&
        (currentUser.id === user.id ||
          currentUser.teacherId.toUpperCase() === user.teacherId.toUpperCase())
      ) {
        StorageService.setCurrentUser({
          ...currentUser,
          webDevXp: currentXp,
          webDevLevel: levelInfo.level,
          webDevTitle: levelInfo.title,
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aew_webdev_tasks_synced'));
        window.dispatchEvent(new CustomEvent('aew_cloud_data_synced'));
        window.dispatchEvent(new Event('storage'));
      }
    }

    // Automatically advance active team sprint challenges
    try {
      const challenges = this.getChallenges();
      let challengesUpdated = false;
      const nowIso = new Date().toISOString().split('T')[0];

      challenges.forEach((ch) => {
        const isNotExpired = !ch.endDate || ch.endDate >= nowIso;
        if (ch.status !== 'completed' && isNotExpired) {
          const currentXp = Number(ch.currentXp || 0);
          const goalXp = Number(ch.goalXp || 1);
          const newXp = currentXp + tx.amount;
          ch.currentXp = newXp;
          challengesUpdated = true;

          if (newXp >= goalXp) {
            ch.status = 'completed';
            this.createNotification({
              userId: this.getManagerId(),
              title: `🎉 Team Sprint Challenge Completed: ${ch.title}`,
              message: `The squad reached ${goalXp.toLocaleString()} XP! Reward: ${ch.rewardDescription || 'Sprint Glory'}`,
              type: 'success',
            });
          }
        }
      });

      if (challengesUpdated) {
        this._save(CHALLENGES_KEY, challenges);
      }
    } catch (err) {
      console.warn('Could not auto-advance challenges:', err);
    }

    return newTx;
  },

  getUserTotalXP(userId: string): number {
    const txs = this.getXPLedger(userId);
    const ledgerTotal = txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const clean = (userId || '').trim().toUpperCase();
    const user = StorageService.getUsers().find(
      (u) => u.teacherId.toUpperCase() === clean || (u.id && u.id.toUpperCase() === clean)
    );
    return Math.max(ledgerTotal, user?.webDevXp || 0);
  },

  // ─── LEADERBOARDS ──────────────────────────────────────────────────────────
  getLeaderboard(
    period: 'weekly' | 'monthly' | 'all_time' = 'all_time',
    deptFilter: 'all' | 'engineering' | 'faculty' | 'pr' | 'leadership' = 'all'
  ): WebDevLeaderboardEntry[] {
    const now = new Date();
    const nowMs = now.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    let cutoffMs = 0;

    if (period === 'weekly') {
      cutoffMs = nowMs - 7 * dayMs;
    } else if (period === 'monthly') {
      cutoffMs = nowMs - 30 * dayMs;
    }

    const txs = this.getXPLedger();
    const relevantTxs = cutoffMs > 0 ? txs.filter((t) => new Date(t.createdAt || 0).getTime() >= cutoffMs) : txs;

    const allUsers = StorageService.getUsers();
    const allTasks = this.getTasks();
    const allBounties = this.getBounties();
    const allLectures = StorageService.getLectures();
    const allAssignedTopics = StorageService.getAssignedTopics();

    const entriesMap = new Map<string, WebDevLeaderboardEntry>();

    allUsers.forEach((u) => {
      const cleanId = u.teacherId.toUpperCase();
      const role = u.role;
      let department = 'General';
      let userTitle = u.webDevTitle || 'Team Member';
      let userLevel = 1;
      let totalPoints = 0;
      let highlights = '';

      if (role === 'web_developer' || role === 'web_dev_manager') {
        department = 'Engineering';
        const lvl = calculateLevelFromXp(u.webDevXp || 0);
        userLevel = u.webDevLevel || lvl.level;
        userTitle = u.webDevTitle || (role === 'web_dev_manager' ? 'Engineering Lead' : lvl.title);
        totalPoints = period === 'all_time' ? u.webDevXp || 0 : 0;
      } else if (role === 'teacher') {
        department = 'Academic Faculty';
        const teacherLectures = allLectures.filter((l) => (l.teacherId || '').toUpperCase() === cleanId);
        const mins = teacherLectures.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
        const doneTopics = allAssignedTopics.filter(
          (t) => (t.teacherId || '').toUpperCase() === cleanId && t.status === 'completed'
        ).length;
        userTitle = u.department || u.subject || 'Faculty Professor';
        const baseFactor = period === 'all_time' ? 450 : period === 'monthly' ? 200 : 80;
        totalPoints = mins + doneTopics * 120 + baseFactor;
        userLevel = Math.max(1, Math.min(10, Math.floor(totalPoints / 400) + 1));
        highlights = `${mins} mins recorded • ${doneTopics} topics completed`;
      } else if (role === 'pr_intern') {
        department = 'Growth & PR';
        userTitle = 'PR & Outreach Intern';
        const starPoints = (u.prStars || 0) * 150;
        const commPoints = Math.round((u.totalSponsorshipRevenue || 0) / 100);
        const basePr = period === 'all_time' ? u.prPoints || 0 : period === 'monthly' ? 50 : 20;
        totalPoints = starPoints + commPoints + basePr;
        userLevel = u.prTier === 'Premium' ? 4 : u.prTier === 'Gold' ? 3 : 2;
        highlights = `Tier: ${u.prTier || 'Silver'} • ₹${(u.totalSponsorshipRevenue || 0).toLocaleString()} Sponsorship`;
      } else if (role === 'admin') {
        department = 'Leadership';
        userTitle = 'Academic & Ops Director';
        totalPoints = period === 'all_time' ? 2900 : period === 'monthly' ? 850 : 300;
        userLevel = 5;
        highlights = 'War Room Overseer & Organization Leadership';
      }

      entriesMap.set(cleanId, {
        userId: u.teacherId,
        userName: u.name,
        userTitle,
        userLevel,
        avatarUrl: u.avatarUrl,
        role: u.role,
        department,
        totalXp: totalPoints,
        tasksCompleted: 0,
        bountiesCompleted: 0,
        highlights,
        rank: 0,
      });
    });

    // Sum period XP for devs from ledger
    relevantTxs.forEach((tx) => {
      const cleanId = (tx.userId || '').toUpperCase();
      if (!cleanId) return;
      const stat = entriesMap.get(cleanId);
      if (stat && (stat.role === 'web_developer' || stat.role === 'web_dev_manager')) {
        if (period !== 'all_time') {
          stat.totalXp += tx.amount || 0;
        }
      }
    });

    // Count completed tasks and bounties for devs with resilient ID lookup
    const userIdToTeacherIdMap = new Map<string, string>();
    allUsers.forEach((u) => {
      const tid = u.teacherId.toUpperCase();
      userIdToTeacherIdMap.set(tid, tid);
      if (u.id) userIdToTeacherIdMap.set(u.id.toUpperCase(), tid);
    });

    allTasks.forEach((t) => {
      if (t.status === 'completed' && t.assigneeId) {
        const canonicalId = userIdToTeacherIdMap.get(t.assigneeId.toUpperCase()) || t.assigneeId.toUpperCase();
        const stat = entriesMap.get(canonicalId);
        if (stat) {
          stat.tasksCompleted = (stat.tasksCompleted || 0) + 1;
        }
      }
    });

    allBounties.forEach((b) => {
      if (b.status === 'completed' && b.claimedById) {
        const canonicalId = userIdToTeacherIdMap.get(b.claimedById.toUpperCase()) || b.claimedById.toUpperCase();
        const stat = entriesMap.get(canonicalId);
        if (stat) {
          stat.bountiesCompleted = (stat.bountiesCompleted || 0) + 1;
        }
      }
    });

    // Populate dev highlights
    entriesMap.forEach((entry) => {
      if (entry.role === 'web_developer' || entry.role === 'web_dev_manager') {
        entry.highlights = `${entry.tasksCompleted || 0} Tasks • ${entry.bountiesCompleted || 0} Bounties Solved`;
      }
    });

    // Filter by department
    let entries = Array.from(entriesMap.values());
    if (deptFilter === 'engineering') {
      entries = entries.filter((e) => e.department === 'Engineering');
    } else if (deptFilter === 'faculty') {
      entries = entries.filter((e) => e.department === 'Academic Faculty');
    } else if (deptFilter === 'pr') {
      entries = entries.filter((e) => e.department === 'Growth & PR');
    } else if (deptFilter === 'leadership') {
      entries = entries.filter((e) => e.department === 'Leadership');
    }

    // Sort descending by total points/XP
    entries.sort((a, b) => b.totalXp - a.totalXp);

    // Assign overall rank and departmentRank
    const deptRankCounters: Record<string, number> = {};
    return entries.map((item, index) => {
      const currentDeptRank = (deptRankCounters[item.department] || 0) + 1;
      deptRankCounters[item.department] = currentDeptRank;
      return {
        ...item,
        rank: index + 1,
        departmentRank: currentDeptRank,
      };
    });
  },

  // ─── ACHIEVEMENTS ──────────────────────────────────────────────────────────
  getAchievements(): WebDevAchievement[] {
    return this._load<WebDevAchievement>(ACHIEVEMENTS_KEY, SEED_ACHIEVEMENTS);
  },

  getUserAchievements(userId: string): { achievement: WebDevAchievement; unlockedAt: string }[] {
    const allUserAch = this._load<WebDevUserAchievement>(USER_ACHIEVEMENTS_KEY, SEED_USER_ACHIEVEMENTS);
    const achievements = this.getAchievements();
    const userMap = new Map<string, string>();

    allUserAch
      .filter((ua) => (ua.userId || '').toUpperCase() === userId.toUpperCase())
      .forEach((ua) => userMap.set(ua.achievementId, ua.unlockedAt));

    return achievements
      .filter((a) => userMap.has(a.id))
      .map((a) => ({
        achievement: a,
        unlockedAt: userMap.get(a.id)!,
      }));
  },

  checkAndUnlockAchievements(userId: string): WebDevAchievement[] {
    const userAchList = this._load<WebDevUserAchievement>(USER_ACHIEVEMENTS_KEY, SEED_USER_ACHIEVEMENTS);
    const alreadyUnlockedIds = new Set(
      userAchList
        .filter((ua) => (ua.userId || '').toUpperCase() === userId.toUpperCase())
        .map((ua) => ua.achievementId)
    );

    const userTasks = this.getTasks({ assigneeId: userId });
    const userTxs = this.getXPLedger(userId);
    const userBounties = this.getBounties().filter((b) => b.claimedById === userId && b.status === 'completed');
    const totalXp = userTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const completedTasks = userTasks.filter((t) => t.status === 'completed');
    const bugfixTasks = completedTasks.filter((t) => t.type === 'bugfix');

    const unlockedNow: WebDevAchievement[] = [];
    const achievements = this.getAchievements();

    achievements.forEach((ach) => {
      if (alreadyUnlockedIds.has(ach.id)) return;

      let qualify = false;
      if (ach.key === 'FIRST_PR' && (userTasks.some((t) => Boolean(t.submission)) || completedTasks.length > 0)) {
        qualify = true;
      } else if (ach.key === 'BUG_SLAYER' && bugfixTasks.length >= 3) {
        qualify = true;
      } else if (ach.key === 'BOUNTY_HUNTER' && userBounties.length >= 2) {
        qualify = true;
      } else if (ach.key === 'SPRINT_LEGEND' && totalXp >= 1500) {
        qualify = true;
      }

      if (qualify) {
        const now = new Date().toISOString();
        const record: WebDevUserAchievement = {
          id: `UA-${Date.now().toString().slice(-6)}`,
          userId,
          achievementId: ach.id,
          unlockedAt: now,
        };
        userAchList.push(record);
        unlockedNow.push(ach);

        // Award achievement bonus XP
        this.awardXP({
          userId,
          userName: userId,
          amount: ach.xpBonus || 50,
          type: 'achievement_unlocked',
          sourceId: ach.id,
          description: `Unlocked Achievement: ${ach.title}`,
        });

        this.createNotification({
          userId,
          title: `Achievement Unlocked: ${ach.title} (+${ach.xpBonus || 50} XP)`,
          message: `${ach.description}`,
          type: 'success',
        });
      }
    });

    if (unlockedNow.length > 0) {
      this._save(USER_ACHIEVEMENTS_KEY, userAchList);
    }

    return unlockedNow;
  },

  // ─── REWARDS & CERTIFICATES ────────────────────────────────────────────────
  getRewards(): WebDevReward[] {
    return this._load<WebDevReward>(REWARDS_KEY, SEED_REWARDS);
  },

  saveReward(
    rewardData: Partial<WebDevReward> & { title: string; xpThreshold: number },
    manager: { id: string; name: string }
  ): WebDevReward {
    const list = this.getRewards();
    const now = new Date().toISOString();
    const existingIndex = rewardData.id ? list.findIndex((r) => r.id === rewardData.id) : -1;

    let savedReward: WebDevReward;
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      savedReward = {
        ...existing,
        ...rewardData,
        updatedAt: now,
      };
      list[existingIndex] = savedReward;
      this.logAudit({
        action: 'REWARD_UPDATED',
        entityType: 'reward',
        entityId: savedReward.id,
        performedByUserId: manager.id,
        performedByUserName: manager.name,
        details: `Updated award "${savedReward.title}" threshold to ${savedReward.xpThreshold} XP (${savedReward.category || 'certificate'}).`,
      });
    } else {
      savedReward = {
        id: rewardData.id || `REW-${Date.now().toString().slice(-4)}`,
        title: rewardData.title,
        description: rewardData.description || '',
        type: rewardData.type || 'certificate',
        category: rewardData.category || 'certificate',
        xpThreshold: Number(rewardData.xpThreshold) || 500,
        icon: rewardData.icon || 'Award',
        iconName: rewardData.iconName || 'Award',
        isActive: rewardData.isActive !== false,
        status: 'active',
        approvalRequired: true,
        createdAt: now,
        updatedAt: now,
      };
      list.push(savedReward);
      this.logAudit({
        action: 'REWARD_CREATED',
        entityType: 'reward',
        entityId: savedReward.id,
        performedByUserId: manager.id,
        performedByUserName: manager.name,
        details: `Created new award "${savedReward.title}" requiring ${savedReward.xpThreshold} XP.`,
      });
    }

    this._save(REWARDS_KEY, list);
    return savedReward;
  },

  deleteReward(rewardId: string, manager: { id: string; name: string }): boolean {
    let list = this.getRewards();
    const target = list.find((r) => r.id === rewardId);
    if (!target) return false;

    StorageService.addDeletedId(rewardId);
    list = list.filter((r) => r.id !== rewardId);
    this._save(REWARDS_KEY, list);

    this.logAudit({
      action: 'REWARD_DELETED',
      entityType: 'reward',
      entityId: rewardId,
      performedByUserId: manager.id,
      performedByUserName: manager.name,
      details: `Deleted award "${target.title}" (was ${target.xpThreshold} XP).`,
    });

    return true;
  },

  getRewardFulfillments(filter?: { userId?: string; status?: string }): WebDevRewardFulfillment[] {
    let list = this._load<WebDevRewardFulfillment>(FULFILLMENTS_KEY, SEED_FULFILLMENTS);
    if (filter?.userId) list = list.filter((f) => (f.userId || '').toUpperCase() === filter.userId?.toUpperCase());
    if (filter?.status) list = list.filter((f) => f.status === filter.status);
    return list;
  },

  requestReward(rewardId: string, user: User): WebDevRewardFulfillment | { error: string } {
    const rewards = this.getRewards();
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return { error: 'Reward not found' };

    const totalXp = this.getUserTotalXP(user.teacherId || user.id || '');
    if (totalXp < reward.xpThreshold) {
      return { error: `Insufficient XP. You have ${totalXp} XP, but this reward requires ${reward.xpThreshold} XP.` };
    }

    const fulfillments = this.getRewardFulfillments();
    const cleanUserId = (user.teacherId || user.id || '').toUpperCase();
    const existing = fulfillments.find(
      (f) => f.rewardId === rewardId && (f.userId || '').toUpperCase() === cleanUserId
    );
    if (existing && existing.status !== 'rejected') {
      return { error: 'You have already requested or received this reward.' };
    }

    let resultFulfillment: WebDevRewardFulfillment;
    if (existing && existing.status === 'rejected') {
      existing.status = 'pending';
      existing.requestedAt = new Date().toISOString();
      existing.rejectionReason = undefined;
      existing.rejectedAt = undefined;
      existing.rejectedBy = undefined;
      existing.fulfilledAt = undefined;
      existing.fulfilledBy = undefined;
      resultFulfillment = existing;
    } else {
      resultFulfillment = {
        id: `FUL-${Date.now().toString().slice(-6)}`,
        rewardId,
        rewardTitle: reward.title,
        rewardType: reward.type as any,
        userId: user.teacherId || user.id || '',
        userName: user.name,
        userEmail: user.email || `${(user.teacherId || user.id || 'dev').toLowerCase()}@aew.com`,
        userTitle: user.webDevTitle || 'Web Developer',
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };
      fulfillments.push(resultFulfillment);
    }

    this._save(FULFILLMENTS_KEY, fulfillments);

    this.createNotification({
      userId: this.getManagerId(),
      title: `Reward Requested: ${reward.title}`,
      message: `${user.name} (${totalXp} XP) requested "${reward.title}".`,
      type: 'info',
    });

    return resultFulfillment;
  },

  fulfillReward(
    fulfillmentId: string,
    manager: { id: string; name: string }
  ): WebDevRewardFulfillment | null {
    const list = this.getRewardFulfillments();
    const ful = list.find((f) => f.id === fulfillmentId);
    if (!ful) return null;

    const reward = this.getRewards().find((r) => r.id === ful.rewardId);
    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = now.toISOString().split('T')[0];

    ful.status = 'fulfilled';
    ful.fulfilledAt = nowIso;
    ful.fulfilledBy = manager.id;

    if (reward?.type === 'certificate') {
      const randomCode = Math.floor(10000 + Math.random() * 90000);
      ful.certificateId = `CERT-WD-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      ful.verificationCode = `WD-${now.getFullYear()}-${randomCode}`;
      ful.issueDate = dateStr;
    }

    this._save(FULFILLMENTS_KEY, list);

    this.createNotification({
      userId: ful.userId || '',
      title: `Reward Fulfilled: ${reward?.title || 'Reward'}`,
      message: `Your reward has been approved and issued by ${manager.name}!${ful.verificationCode ? ` Verification ID: ${ful.verificationCode}` : ''}`,
      type: 'success',
      link: `/rewards`,
    });

    this.logAudit({
      action: 'REWARD_FULFILLED',
      entityType: 'reward',
      entityId: ful.id,
      performedByUserId: manager.id,
      performedByUserName: manager.name,
      details: `Fulfilled reward "${reward?.title}" for ${ful.userName} (${ful.userId})${ful.verificationCode ? ` [Code: ${ful.verificationCode}]` : ''}`,
    });

    return ful;
  },

  rejectRewardFulfillment(
    fulfillmentId: string,
    manager: { id: string; name: string },
    reason?: string
  ): WebDevRewardFulfillment | null {
    const list = this.getRewardFulfillments();
    const ful = list.find((f) => f.id === fulfillmentId);
    if (!ful) return null;

    const reward = this.getRewards().find((r) => r.id === ful.rewardId);
    const nowIso = new Date().toISOString();

    ful.status = 'rejected';
    ful.rejectionReason = reason || 'Requirements not verified or threshold conditions pending.';
    ful.rejectedAt = nowIso;
    ful.rejectedBy = manager.id;

    this._save(FULFILLMENTS_KEY, list);

    if (ful.userId) {
      this.createNotification({
        userId: ful.userId,
        title: `Reward Request Rejected: ${reward?.title || 'Reward'}`,
        message: `Your request for "${reward?.title || 'Reward'}" was rejected by ${manager.name}. Reason: "${ful.rejectionReason}"`,
        type: 'warning',
        link: '/rewards',
      });
    }

    this.logAudit({
      action: 'REWARD_REJECTED',
      entityType: 'reward',
      entityId: ful.id,
      performedByUserId: manager.id,
      performedByUserName: manager.name,
      details: `Rejected reward request "${reward?.title}" for ${ful.userName} (${ful.userId}). Reason: "${ful.rejectionReason}"`,
    });

    return ful;
  },

  verifyCertificate(verificationCode: string): {
    valid: boolean;
    fulfillment?: WebDevRewardFulfillment;
    reward?: WebDevReward;
    recipientName?: string;
    issueDate?: string;
  } {
    const cleanCode = (verificationCode || '').trim().toUpperCase();
    const fulfillments = this.getRewardFulfillments({ status: 'fulfilled' });
    const match = fulfillments.find(
      (f) =>
        (f.verificationCode && f.verificationCode.toUpperCase() === cleanCode) ||
        (f.certificateId && f.certificateId.toUpperCase() === cleanCode)
    );

    if (!match) return { valid: false };

    const reward = this.getRewards().find((r) => r.id === match.rewardId);
    return {
      valid: true,
      fulfillment: match,
      reward,
      recipientName: match.userName,
      issueDate: match.issueDate,
    };
  },

  // ─── TEAM CHALLENGES & KUDOS ───────────────────────────────────────────────
  getChallenges(): WebDevTeamChallenge[] {
    return this._load<WebDevTeamChallenge>(CHALLENGES_KEY, SEED_CHALLENGES);
  },

  saveChallenge(challenge: WebDevTeamChallenge): WebDevTeamChallenge {
    const list = this.getChallenges();
    const idx = list.findIndex((c) => c.id === challenge.id);
    let updated: WebDevTeamChallenge;
    if (idx >= 0) {
      updated = { ...list[idx], ...challenge };
      list[idx] = updated;
    } else {
      updated = {
        ...challenge,
        id: challenge.id || `CHAL-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
      };
      list.push(updated);
    }
    this._save(CHALLENGES_KEY, list);
    return updated;
  },

  deleteChallenge(id: string): boolean {
    const list = this.getChallenges();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length !== list.length) {
      StorageService.addDeletedId(id);
      this._save(CHALLENGES_KEY, filtered);
      return true;
    }
    return false;
  },

  getKudos(): WebDevKudos[] {
    return this._load<WebDevKudos>(KUDOS_KEY, SEED_KUDOS);
  },

  sendKudos(kudos: {
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    message: string;
    xpAmount?: number;
  }): WebDevKudos {
    const cleanFrom = (kudos.fromUserId || '').trim().toUpperCase();
    const cleanTo = (kudos.toUserId || '').trim().toUpperCase();
    if (!cleanTo) {
      throw new Error('Please select a recipient for kudos.');
    }
    if (cleanFrom && cleanTo && cleanFrom === cleanTo) {
      throw new Error('You cannot send kudos to yourself.');
    }

    const allUsers = StorageService.getUsers();
    const fromUser = allUsers.find(
      (u) =>
        (u.teacherId && u.teacherId.toUpperCase() === cleanFrom) ||
        (u.id && u.id.toUpperCase() === cleanFrom)
    );
    const toUser = allUsers.find(
      (u) =>
        (u.teacherId && u.teacherId.toUpperCase() === cleanTo) ||
        (u.id && u.id.toUpperCase() === cleanTo)
    );
    if (
      fromUser &&
      toUser &&
      (fromUser.id === toUser.id ||
        (fromUser.teacherId &&
          toUser.teacherId &&
          fromUser.teacherId.toUpperCase() === toUser.teacherId.toUpperCase()))
    ) {
      throw new Error('You cannot send kudos to yourself.');
    }

    const list = this.getKudos();
    const xp = kudos.xpAmount || 25;
    const newKudos: WebDevKudos = {
      id: `KUDOS-${Date.now().toString().slice(-6)}`,
      fromUserId: kudos.fromUserId,
      fromUserName: kudos.fromUserName,
      toUserId: kudos.toUserId,
      toUserName: kudos.toUserName,
      message: kudos.message,
      xpAmount: xp,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newKudos);
    this._save(KUDOS_KEY, list);

    // Award XP to recipient
    this.awardXP({
      userId: kudos.toUserId,
      userName: kudos.toUserName,
      amount: xp,
      type: 'kudos_received',
      sourceId: newKudos.id,
      description: `Peer recognition from ${kudos.fromUserName}: "${kudos.message}"`,
      awardedById: kudos.fromUserId,
      awardedByName: kudos.fromUserName,
    });

    this.createNotification({
      userId: kudos.toUserId,
      title: `Kudos from ${kudos.fromUserName} (+${xp} XP)`,
      message: `"${kudos.message}"`,
      type: 'success',
    });

    return newKudos;
  },

  // ─── AUDIT LOGS ────────────────────────────────────────────────────────────
  getAuditLogs(): WebDevAuditLog[] {
    return this._load<WebDevAuditLog>(AUDIT_LOGS_KEY, SEED_AUDIT_LOGS).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  logAudit(entry: {
    action: string;
    entityType: string;
    entityId: string;
    performedByUserId: string;
    performedByUserName: string;
    details: string;
  }): WebDevAuditLog {
    const list = this._load<WebDevAuditLog>(AUDIT_LOGS_KEY, SEED_AUDIT_LOGS);
    const newEntry: WebDevAuditLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      performedByUserId: entry.performedByUserId,
      performedByUserName: entry.performedByUserName,
      details: entry.details,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newEntry);
    this._save(AUDIT_LOGS_KEY, list.slice(0, 500)); // cap at 500
    return newEntry;
  },

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  getNotifications(userId: string): WebDevNotification[] {
    const all = this._load<WebDevNotification>(NOTIFICATIONS_KEY, []);
    return all
      .filter((n) => (n.userId || '').toUpperCase() === userId.toUpperCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createNotification(notif: {
    userId: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    link?: string;
  }): WebDevNotification {
    const list = this._load<WebDevNotification>(NOTIFICATIONS_KEY, []);
    const newNotif: WebDevNotification = {
      id: `NOTIF-${Date.now().toString().slice(-6)}`,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info',
      read: false,
      link: notif.link,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newNotif);
    this._save(NOTIFICATIONS_KEY, list.slice(0, 100));
    return newNotif;
  },

  markNotificationAsRead(id: string): void {
    const list = this._load<WebDevNotification>(NOTIFICATIONS_KEY, []);
    const match = list.find((n) => n.id === id);
    if (match) {
      match.read = true;
      this._save(NOTIFICATIONS_KEY, list);
    }
  },

  markAllNotificationsAsRead(userId: string): void {
    const list = this._load<WebDevNotification>(NOTIFICATIONS_KEY, []);
    list.forEach((n) => {
      if ((n.userId || '').toUpperCase() === userId.toUpperCase()) {
        n.read = true;
      }
    });
    this._save(NOTIFICATIONS_KEY, list);
  },

  // ─── TEAM MANAGEMENT (ADD & REMOVE DEVELOPERS) ───────────────────────────
  addDeveloperToTeam(
    devData: {
      name: string;
      email: string;
      username?: string;
      password?: string;
      webDevTitle?: string;
      skills?: string[];
      role?: 'web_developer' | 'web_dev_manager';
      phone?: string;
    },
    manager: { id: string; name: string }
  ): User {
    const role = devData.role || 'web_developer';
    const cleanId = StorageService.getNextEmployeeId(role);
    const cleanUsername = (devData.username || devData.email.split('@')[0] || cleanId.toLowerCase()).toLowerCase().replace(/\s+/g, '_');
    
    const newDev = StorageService.onboardEmployee({
      name: devData.name.trim(),
      email: devData.email.trim(),
      username: cleanUsername,
      password: devData.password || 'dev123',
      role,
      teacherId: cleanId,
      department: 'Engineering & Product',
      subject: devData.webDevTitle?.trim() || (role === 'web_dev_manager' ? 'Software Architecture' : 'Web Development'),
      webDevTitle: devData.webDevTitle?.trim() || (role === 'web_dev_manager' ? 'Dev Architect' : 'Web Developer'),
      webDevXp: 0,
      webDevLevel: 1,
      skills: devData.skills && devData.skills.length > 0 ? devData.skills : [],
      phone: devData.phone?.trim() || undefined,
    });

    this.logAudit({
      action: 'DEVELOPER_ADDED',
      entityType: 'user',
      entityId: cleanId,
      performedByUserId: manager.id,
      performedByUserName: manager.name,
      details: `Added new developer ${devData.name} (${cleanUsername}) with title "${newDev.webDevTitle}" to the team`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aew_users_updated', { detail: { user: newDev } }));
      window.dispatchEvent(new CustomEvent('aew_webdev_tasks_synced'));
      window.dispatchEvent(new CustomEvent('aew_cloud_data_synced'));
      window.dispatchEvent(new Event('storage'));
    }

    return newDev;
  },

  removeDeveloperFromTeam(
    developerId: string,
    manager: { id: string; name: string }
  ): { success: boolean; error?: string } {
    const cleanDevId = (developerId || '').trim();
    const cleanDevUpper = cleanDevId.toUpperCase();
    const cleanMgrId = (manager.id || '').trim().toUpperCase();

    const allUsers = StorageService.getUsers();
    const targetDev = allUsers.find(
      (u) =>
        (u.teacherId && u.teacherId.trim().toUpperCase() === cleanDevUpper) ||
        (u.id && u.id.trim().toUpperCase() === cleanDevUpper) ||
        (u.username && u.username.trim().toLowerCase() === cleanDevId.toLowerCase())
    );

    if (!targetDev) {
      return { success: false, error: 'Developer not found.' };
    }

    if (targetDev.role === 'admin' || targetDev.teacherId.toUpperCase().startsWith('ADMIN')) {
      return { success: false, error: 'Primary Administrator account cannot be deleted.' };
    }

    // Check if manager is attempting to remove themselves
    const current = StorageService.getCurrentUser();
    const isSelf =
      (current && (current.teacherId.toUpperCase() === targetDev.teacherId.toUpperCase() || (current.id && targetDev.id && current.id.toUpperCase() === targetDev.id.toUpperCase()))) ||
      (cleanMgrId && (targetDev.teacherId.toUpperCase() === cleanMgrId || (targetDev.id && targetDev.id.toUpperCase() === cleanMgrId)));

    if (isSelf) {
      return { success: false, error: 'You cannot remove yourself from the engineering squad.' };
    }

    // Perform removal via StorageService.deleteEmployee (handles tombstones, cloud sync & roster update)
    const deleteRes = StorageService.deleteEmployee(targetDev.teacherId);
    if (!deleteRes.success) {
      return deleteRes;
    }

    // Unassign tasks assigned to this developer so tasks aren't orphaned
    const targetTeacherId = targetDev.teacherId.toUpperCase();
    const targetUid = targetDev.id ? targetDev.id.toUpperCase() : '';
    const targetUsername = targetDev.username ? targetDev.username.toLowerCase() : '';

    const allTasks = this.getTasks();
    let unassignedCount = 0;
    allTasks.forEach((t) => {
      const assigneeUpper = (t.assigneeId || '').trim().toUpperCase();
      const assigneeLower = (t.assigneeName || '').trim().toLowerCase();
      if (
        assigneeUpper === targetTeacherId ||
        (targetUid && assigneeUpper === targetUid) ||
        assigneeUpper === cleanDevUpper ||
        (targetUsername && assigneeLower === targetUsername)
      ) {
        t.assigneeId = undefined;
        t.assigneeName = undefined;
        t.assigneeRole = undefined;
        if (t.status !== 'completed') {
          t.status = 'todo';
          t.isBlocked = false;
        }
        unassignedCount++;
      }
    });

    if (unassignedCount > 0) {
      this._save(TASKS_KEY, allTasks);
    }

    // Release any bounties claimed by this developer back to open
    const allBounties = this.getBounties();
    let releasedBountiesCount = 0;
    allBounties.forEach((b) => {
      const claimedUpper = (b.claimedById || '').trim().toUpperCase();
      if (
        b.status === 'claimed' &&
        (claimedUpper === targetTeacherId || (targetUid && claimedUpper === targetUid) || claimedUpper === cleanDevUpper)
      ) {
        b.claimedById = undefined;
        b.claimedByName = undefined;
        b.claimedAt = undefined;
        b.status = 'open';
        releasedBountiesCount++;
      }
    });
    if (releasedBountiesCount > 0) {
      this._save(BOUNTIES_KEY, allBounties);
    }

    this.logAudit({
      action: 'DEVELOPER_REMOVED',
      entityType: 'user',
      entityId: targetDev.teacherId,
      performedByUserId: manager.id,
      performedByUserName: manager.name,
      details: `Removed developer ${targetDev.name} (${targetDev.email || targetDev.teacherId}) from squad. ${unassignedCount} active tasks unassigned, ${releasedBountiesCount} claimed bounties reopened.`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aew_users_updated'));
      window.dispatchEvent(new CustomEvent('aew_webdev_tasks_synced'));
      window.dispatchEvent(new CustomEvent('aew_cloud_data_synced'));
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true };
  },

  createMilestone(milestoneData: Partial<WebDevMilestone> & { projectId: string; title: string }): WebDevMilestone {
    const list = this.getMilestones();
    const targetDateStr = milestoneData.targetDate || milestoneData.deadline || milestoneData.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const newMilestone: WebDevMilestone = {
      id: `MS-${Date.now().toString().slice(-6)}`,
      projectId: milestoneData.projectId,
      title: milestoneData.title.trim(),
      description: milestoneData.description?.trim() || '',
      status: milestoneData.status || 'pending',
      progress: milestoneData.status === 'completed' ? 100 : (milestoneData.progress || 0),
      progressPercentage: milestoneData.status === 'completed' ? 100 : (milestoneData.progressPercentage || 0),
      targetDate: targetDateStr,
      deadline: targetDateStr,
      dueDate: targetDateStr,
      deliverables: milestoneData.deliverables || [],
      tasksTotal: 0,
      tasksCompleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push(newMilestone);
    this._save(MILESTONES_KEY, list);
    this.recalculateProjectAndMilestoneProgress(milestoneData.projectId);

    return newMilestone;
  },

  toggleMilestoneStatus(milestoneId: string): WebDevMilestone | null {
    const list = this.getMilestones();
    const milestone = list.find((m) => m.id === milestoneId);
    if (!milestone) return null;

    const nextStatus = milestone.status === 'completed' ? 'in_progress' : 'completed';
    milestone.status = nextStatus;
    milestone.progress = nextStatus === 'completed' ? 100 : 50;
    milestone.progressPercentage = nextStatus === 'completed' ? 100 : 50;
    milestone.updatedAt = new Date().toISOString();

    this._save(MILESTONES_KEY, list);
    if (milestone.projectId) {
      this.recalculateProjectAndMilestoneProgress(milestone.projectId);
    }

    return milestone;
  },
};
