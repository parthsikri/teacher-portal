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
} from '../types';
import { StorageService } from './storage';

// ─── LOCAL STORAGE KEYS ────────────────────────────────────────────────────────
const PROJECTS_KEY = 'aew_webdev_projects_v1';
const MILESTONES_KEY = 'aew_webdev_milestones_v1';
const TASKS_KEY = 'aew_webdev_tasks_v1';
const BOUNTIES_KEY = 'aew_webdev_bounties_v1';
const XP_LEDGER_KEY = 'aew_webdev_xp_ledger_v1';
const ACHIEVEMENTS_KEY = 'aew_webdev_achievements_v1';
const USER_ACHIEVEMENTS_KEY = 'aew_webdev_user_achievements_v1';
const REWARDS_KEY = 'aew_webdev_rewards_v1';
const FULFILLMENTS_KEY = 'aew_webdev_fulfillments_v1';
const CHALLENGES_KEY = 'aew_webdev_challenges_v1';
const KUDOS_KEY = 'aew_webdev_kudos_v1';
const AUDIT_LOGS_KEY = 'aew_webdev_audit_logs_v1';
const NOTIFICATIONS_KEY = 'aew_webdev_notifications_v1';

// ─── DEFAULT SEED DATA (CLEAN FOR PRODUCTION) ──────────────────────────────────
const SEED_PROJECTS: WebDevProject[] = [];
const SEED_MILESTONES: WebDevMilestone[] = [];

const SEED_TASKS: WebDevTask[] = [];

const SEED_BOUNTIES: WebDevBounty[] = [];

const SEED_ACHIEVEMENTS: WebDevAchievement[] = [];
const SEED_USER_ACHIEVEMENTS: WebDevUserAchievement[] = [];

const SEED_REWARDS: WebDevReward[] = [];

const SEED_FULFILLMENTS: WebDevRewardFulfillment[] = [];

const SEED_XP_LEDGER: WebDevXPTransaction[] = [];
const SEED_CHALLENGES: WebDevTeamChallenge[] = [];
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
    return this._load<WebDevProject>(PROJECTS_KEY, SEED_PROJECTS);
  },

  getProjectById(id: string): WebDevProject | undefined {
    return this.getProjects().find((p) => p.id === id);
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
          orderIndex: m.orderIndex || idx + 1,
          status: m.status || 'pending',
        });
      });
    }

    return updated;
  },

  deleteProject(id: string, performedBy?: { id: string; name: string }): boolean {
    const list = this.getProjects();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      this._save(PROJECTS_KEY, filtered);
      this.logAudit({
        action: 'PROJECT_DELETED',
        entityType: 'project',
        entityId: id,
        performedByUserId: performedBy?.id || 'SYSTEM',
        performedByUserName: performedBy?.name || 'System',
        details: `Deleted project: ${id}`,
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
    let list = this._load<WebDevTask>(TASKS_KEY, SEED_TASKS);
    if (filter?.projectId) list = list.filter((t) => t.projectId === filter.projectId);
    if (filter?.assigneeId) list = list.filter((t) => t.assigneeId === filter.assigneeId);
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

  deleteTask(id: string, performedBy?: { id: string; name: string }): boolean {
    const list = this.getTasks();
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length !== list.length) {
      this._save(TASKS_KEY, filtered);
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

  // Developer resolves blocker
  resolveTaskBlocker(taskId: string, resolvedBy: { id: string; name: string }): WebDevTask | null {
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
      authorRole: 'web_dev_manager',
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
    reviewer: { id: string; name: string },
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

    // Add manager review comment
    const comm: WebDevComment = {
      id: `comm-appr-${Date.now()}`,
      taskId,
      authorId: reviewer.id,
      authorName: reviewer.name,
      authorRole: 'web_dev_manager',
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

    return { task, totalXpAwarded: totalAwarded };
  },

  // Manager or Admin requests changes
  requestChangesTaskSubmission(
    taskId: string,
    reviewer: { id: string; name: string },
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

    const comm: WebDevComment = {
      id: `comm-cr-${Date.now()}`,
      taskId,
      authorId: reviewer.id,
      authorName: reviewer.name,
      authorRole: 'web_dev_manager',
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
    reviewer: { id: string; name: string },
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

    const comm: WebDevComment = {
      id: `comm-rej-${Date.now()}`,
      taskId,
      authorId: reviewer.id,
      authorName: reviewer.name,
      authorRole: 'web_dev_manager',
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

  // ─── BOUNTIES ──────────────────────────────────────────────────────────────
  getBounties(): WebDevBounty[] {
    return this._load<WebDevBounty>(BOUNTIES_KEY, SEED_BOUNTIES);
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
    if (!bounty || bounty.claimedById !== developer.id) return null;

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

  // ─── XP & LEDGER ───────────────────────────────────────────────────────────
  getXPLedger(userId?: string): WebDevXPTransaction[] {
    const all = this._load<WebDevXPTransaction>(XP_LEDGER_KEY, SEED_XP_LEDGER);
    if (userId) return all.filter((tx) => tx.userId === userId);
    return all.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  awardXP(tx: {
    userId: string;
    userName: string;
    amount: number;
    type: 'task_approved' | 'bounty_approved' | 'achievement_unlocked' | 'manager_bonus' | 'kudos_received' | 'challenge_completed';
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
    const user = users.find((u) => u.teacherId.toUpperCase() === tx.userId.toUpperCase() || u.id === tx.userId);
    if (user) {
      const currentXp = (user.webDevXp || 0) + tx.amount;
      const levelInfo = calculateLevelFromXp(currentXp);
      user.webDevXp = currentXp;
      user.webDevLevel = levelInfo.level;
      user.webDevTitle = levelInfo.title;
      StorageService.saveUsers(users);
    }

    return newTx;
  },

  getUserTotalXP(userId: string): number {
    const txs = this.getXPLedger(userId);
    return txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
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

    // Count completed tasks and bounties for devs
    allTasks.forEach((t) => {
      if (t.status === 'completed' && t.assigneeId) {
        const stat = entriesMap.get(t.assigneeId.toUpperCase());
        if (stat) {
          stat.tasksCompleted = (stat.tasksCompleted || 0) + 1;
        }
      }
    });

    allBounties.forEach((b) => {
      if (b.status === 'completed' && b.claimedById) {
        const stat = entriesMap.get(b.claimedById.toUpperCase());
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

    const totalXp = this.getUserTotalXP(user.teacherId);
    if (totalXp < reward.xpThreshold) {
      return { error: `Insufficient XP. You have ${totalXp} XP, but this reward requires ${reward.xpThreshold} XP.` };
    }

    const fulfillments = this.getRewardFulfillments();
    const existing = fulfillments.find(
      (f) => f.rewardId === rewardId && (f.userId || '').toUpperCase() === user.teacherId.toUpperCase()
    );
    if (existing && existing.status !== 'rejected') {
      return { error: 'You have already requested or received this reward.' };
    }

    const newFulfillment: WebDevRewardFulfillment = {
      id: `FUL-${Date.now().toString().slice(-6)}`,
      rewardId,
      userId: user.teacherId,
      userName: user.name,
      userEmail: user.email || `${user.teacherId.toLowerCase()}@aew.com`,
      userTitle: user.webDevTitle || 'Web Developer',
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    fulfillments.push(newFulfillment);
    this._save(FULFILLMENTS_KEY, fulfillments);

    this.createNotification({
      userId: this.getManagerId(),
      title: `Reward Requested: ${reward.title}`,
      message: `${user.name} (${totalXp} XP) requested "${reward.title}".`,
      type: 'info',
    });

    return newFulfillment;
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
    },
    manager: { id: string; name: string }
  ): User {
    const allUsers = StorageService.getUsers();
    const cleanId = `AEW-DEV-${Date.now().toString().slice(-4)}`;
    const cleanUsername = (devData.username || devData.email.split('@')[0] || `dev_${Date.now().toString().slice(-4)}`).toLowerCase().replace(/\s+/g, '_');
    
    const newDev: User = {
      id: `u-${cleanId.toLowerCase()}`,
      teacherId: cleanId,
      name: devData.name.trim(),
      email: devData.email.trim(),
      username: cleanUsername,
      password: devData.password || 'code123',
      role: devData.role || 'web_developer',
      department: 'Web Development',
      subject: devData.webDevTitle?.trim() || 'Frontend Web Development',
      dailyTargetMinutes: 0,
      dailyLimit: 0,
      webDevTitle: devData.webDevTitle?.trim() || 'Frontend Developer',
      webDevXp: 0,
      webDevLevel: 1,
      skills: devData.skills && devData.skills.length > 0 ? devData.skills : ['React', 'TypeScript', 'Frontend'],
      createdAt: new Date().toISOString(),
    };

    allUsers.push(newDev);
    StorageService.saveUsers(allUsers);

    this.logAudit({
      action: 'DEVELOPER_ADDED',
      entityType: 'user',
      entityId: cleanId,
      performedByUserId: manager.id,
      performedByUserName: manager.name,
      details: `Added new developer ${devData.name} (${cleanUsername}) with title "${newDev.webDevTitle}" to the team`,
    });

    return newDev;
  },

  removeDeveloperFromTeam(
    developerId: string,
    manager: { id: string; name: string }
  ): { success: boolean; error?: string } {
    if (developerId === manager.id) {
      return { success: false, error: 'You cannot remove yourself from the engineering squad.' };
    }

    const allUsers = StorageService.getUsers();
    const targetDev = allUsers.find((u) => u.teacherId === developerId);
    if (!targetDev) {
      return { success: false, error: 'Developer not found.' };
    }

    const updatedUsers = allUsers.filter((u) => u.teacherId !== developerId);
    StorageService.saveUsers(updatedUsers);

    // Unassign tasks assigned to this developer so tasks aren't orphaned
    const allTasks = this.getTasks();
    let unassignedCount = 0;
    allTasks.forEach((t) => {
      if (t.assigneeId === developerId) {
        t.assigneeId = undefined;
        t.assigneeName = undefined;
        if (t.status === 'in_progress') {
          t.status = 'todo';
        }
        unassignedCount++;
      }
    });
    if (unassignedCount > 0) {
      this._save(TASKS_KEY, allTasks);
    }

    this.logAudit({
      action: 'DEVELOPER_REMOVED',
      entityType: 'user',
      entityId: developerId,
      performedByUserId: manager.id,
      performedByUserName: manager.name,
      details: `Removed developer ${targetDev.name} (${targetDev.email}) from squad. ${unassignedCount} active tasks unassigned.`,
    });

    return { success: true };
  },
};
