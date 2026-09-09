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

// ─── DEFAULT SEED DATA ────────────────────────────────────────────────────────
const SEED_PROJECTS: WebDevProject[] = [
  {
    id: 'PROJ-01',
    key: 'PORTAL',
    title: 'AEW Student Portal 2.0',
    description: 'Next-generation learning dashboard with high-speed video streaming, live quizzes, and real-time community forums.',
    repositoryUrl: 'https://github.com/apna-engineering-wallah/student-portal-v2',
    liveUrl: 'https://student.apnaengineeringwallah.com',
    techStack: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'Supabase', 'PostgreSQL'],
    status: 'in_progress',
    priority: 'high',
    managerId: 'AEW-WDM-01',
    managerName: 'Vikramaditya Sen',
    leadDeveloperId: 'AEW-DEV-01',
    leadDeveloperName: 'Aarav Sharma',
    progressPercentage: 68,
    startDate: '2026-08-01',
    targetDate: '2026-10-15',
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-09-08T14:30:00Z',
  },
  {
    id: 'PROJ-02',
    key: 'MOBILE',
    title: 'Mobile LMS Companion App',
    description: 'Cross-platform React Native app with offline video caching, attendance tracking, and instant push notification delivery.',
    repositoryUrl: 'https://github.com/apna-engineering-wallah/mobile-companion',
    techStack: ['React Native', 'Expo', 'TypeScript', 'Redux Toolkit', 'SQLite'],
    status: 'planning',
    priority: 'medium',
    managerId: 'AEW-WDM-01',
    managerName: 'Vikramaditya Sen',
    leadDeveloperId: 'AEW-DEV-02',
    leadDeveloperName: 'Neha Verma',
    progressPercentage: 25,
    startDate: '2026-08-20',
    targetDate: '2026-11-30',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-09-07T11:00:00Z',
  },
  {
    id: 'PROJ-03',
    key: 'AI-PIPE',
    title: 'AI Lecture Auto-Captioning & Search Pipeline',
    description: 'Automated asynchronous ingestion pipeline that transcribes raw faculty videos, generates multilingual subtitles, and indexes key concepts for semantic vector search.',
    repositoryUrl: 'https://github.com/apna-engineering-wallah/ai-captioning-pipeline',
    techStack: ['Python', 'FastAPI', 'Whisper AI', 'AWS S3', 'Qdrant Vector DB'],
    status: 'in_progress',
    priority: 'critical',
    managerId: 'AEW-WDM-01',
    managerName: 'Vikramaditya Sen',
    leadDeveloperId: 'AEW-DEV-01',
    leadDeveloperName: 'Aarav Sharma',
    progressPercentage: 45,
    startDate: '2026-08-15',
    targetDate: '2026-10-01',
    createdAt: '2026-08-15T08:00:00Z',
    updatedAt: '2026-09-08T18:00:00Z',
  },
];

const SEED_MILESTONES: WebDevMilestone[] = [
  {
    id: 'MS-01',
    projectId: 'PROJ-01',
    title: 'Auth & Multi-Tenant Role Isolation',
    description: 'Transition auth to stateless signed JWT with strict student vs educator schema separation.',
    targetDate: '2026-08-25',
    status: 'completed',
    orderIndex: 1,
    progressPercentage: 100,
    createdAt: '2026-08-01T09:00:00Z',
  },
  {
    id: 'MS-02',
    projectId: 'PROJ-01',
    title: 'Interactive Player & Sync Engine',
    description: 'Integrate video playback with timestamped annotations, speed control, and bookmarks.',
    targetDate: '2026-09-20',
    status: 'in_progress',
    orderIndex: 2,
    progressPercentage: 70,
    createdAt: '2026-08-01T09:00:00Z',
  },
  {
    id: 'MS-03',
    projectId: 'PROJ-01',
    title: 'Lighthouse 95+ & PWA Offline Mode',
    description: 'Audit bundle size, implement service workers, dynamic code splitting, and edge caching.',
    targetDate: '2026-10-15',
    status: 'pending',
    orderIndex: 3,
    progressPercentage: 15,
    createdAt: '2026-08-01T09:00:00Z',
  },
  {
    id: 'MS-04',
    projectId: 'PROJ-02',
    title: 'Offline Video Cache & Background Sync',
    description: 'Local encrypted file storage with resumable chunked downloads.',
    targetDate: '2026-10-10',
    status: 'in_progress',
    orderIndex: 1,
    progressPercentage: 30,
    createdAt: '2026-08-20T10:00:00Z',
  },
];

const SEED_TASKS: WebDevTask[] = [
  {
    id: 'DEV-TASK-101',
    projectId: 'PROJ-01',
    milestoneId: 'MS-02',
    title: 'Implement Real-time Lecture Chat with WebSocket fallback',
    description: 'Build a durable chat component that establishes a WebSocket connection with heartbeat and falls back gracefully to HTTP long polling on unstable 3G networks.',
    type: 'feature',
    priority: 'high',
    status: 'review_requested',
    estimatedHours: 16,
    actualHours: 14,
    xpReward: 250,
    assigneeId: 'AEW-DEV-01',
    assigneeName: 'Aarav Sharma',
    reviewerId: 'AEW-WDM-01',
    reviewerName: 'Vikramaditya Sen',
    isBlocked: false,
    tags: ['Frontend', 'WebSocket', 'React'],
    githubBranch: 'feat/lecture-chat-ws',
    githubPrUrl: 'https://github.com/apna-engineering-wallah/student-portal-v2/pull/42',
    liveDemoUrl: 'https://preview-42.aew-portal.dev/lecture/live-chat',
    dueDate: '2026-09-10',
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-08T16:00:00Z',
    subtasks: [
      { id: 'sub-101-1', taskId: 'DEV-TASK-101', title: 'Setup WebSocket hook with reconnection backoff', completed: true, completedAt: '2026-09-04T12:00:00Z' },
      { id: 'sub-101-2', taskId: 'DEV-TASK-101', title: 'Build virtualized chat message list for 5000+ messages', completed: true, completedAt: '2026-09-06T15:00:00Z' },
      { id: 'sub-101-3', taskId: 'DEV-TASK-101', title: 'Add profanity filter & rate limiting on client side', completed: true, completedAt: '2026-09-08T11:00:00Z' },
    ],
    submission: {
      id: 'subm-101',
      taskId: 'DEV-TASK-101',
      developerId: 'AEW-DEV-01',
      developerName: 'Aarav Sharma',
      summary: 'Completed end-to-end WebSocket client with automatic exponential backoff retry. Virtualized list handles 10,000+ rapid messages without frame drops.',
      githubPrUrl: 'https://github.com/apna-engineering-wallah/student-portal-v2/pull/42',
      liveUrl: 'https://preview-42.aew-portal.dev/lecture/live-chat',
      notes: 'Please test on simulated Slow 3G network profile in Chrome DevTools to see fallback.',
      submittedAt: '2026-09-08T16:00:00Z',
      status: 'pending',
    },
    comments: [
      {
        id: 'comm-101-1',
        taskId: 'DEV-TASK-101',
        authorId: 'AEW-DEV-01',
        authorName: 'Aarav Sharma',
        authorRole: 'web_developer',
        content: 'Ready for review! Verified across Safari, Firefox, and Chromium engines.',
        createdAt: '2026-09-08T16:05:00Z',
      },
    ],
  },
  {
    id: 'DEV-TASK-102',
    projectId: 'PROJ-01',
    milestoneId: 'MS-02',
    title: 'Fix canvas memory leak in Video Canvas annotation overlay',
    description: 'Faculty report Chrome tab crashing after 40 minutes of drawing whiteboard notes over lecture video stream. Memory profiler shows un-garbage-collected ImageData buffers.',
    type: 'bugfix',
    priority: 'critical',
    status: 'in_progress',
    estimatedHours: 8,
    actualHours: 5,
    xpReward: 180,
    assigneeId: 'AEW-DEV-01',
    assigneeName: 'Aarav Sharma',
    reviewerId: 'AEW-WDM-01',
    reviewerName: 'Vikramaditya Sen',
    isBlocked: false,
    tags: ['Canvas', 'MemoryLeak', 'Performance'],
    githubBranch: 'fix/canvas-memory-cleanup',
    dueDate: '2026-09-11',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-08T12:00:00Z',
    subtasks: [
      { id: 'sub-102-1', taskId: 'DEV-TASK-102', title: 'Reproduce leak in Chromium Heap Profiler', completed: true, completedAt: '2026-09-07T14:00:00Z' },
      { id: 'sub-102-2', taskId: 'DEV-TASK-102', title: 'Implement OffscreenCanvas pooling & explicit buffer dispose', completed: false },
      { id: 'sub-102-3', taskId: 'DEV-TASK-102', title: 'Validate 2-hour continuous drawing benchmark', completed: false },
    ],
    comments: [
      {
        id: 'comm-102-1',
        taskId: 'DEV-TASK-102',
        authorId: 'AEW-DEV-01',
        authorName: 'Aarav Sharma',
        authorRole: 'web_developer',
        content: 'Found the root cause: event listeners on drawing points were retaining the entire closure scope on each mousemove.',
        createdAt: '2026-09-07T14:30:00Z',
      },
    ],
  },
  {
    id: 'DEV-TASK-103',
    projectId: 'PROJ-01',
    milestoneId: 'MS-01',
    title: 'Database indexing for high-concurrency quiz submissions',
    description: 'PostgreSQL queries on student_responses table spike to 12s latency during 10,000 student simultaneous Sunday mock exams.',
    type: 'performance',
    priority: 'high',
    status: 'changes_requested',
    estimatedHours: 12,
    actualHours: 10,
    xpReward: 220,
    assigneeId: 'AEW-DEV-02',
    assigneeName: 'Neha Verma',
    reviewerId: 'AEW-WDM-01',
    reviewerName: 'Vikramaditya Sen',
    isBlocked: false,
    tags: ['PostgreSQL', 'Database', 'Indexing'],
    githubBranch: 'perf/quiz-composite-indexes',
    githubPrUrl: 'https://github.com/apna-engineering-wallah/student-portal-v2/pull/39',
    dueDate: '2026-09-09',
    createdAt: '2026-09-03T11:00:00Z',
    updatedAt: '2026-09-08T15:00:00Z',
    subtasks: [
      { id: 'sub-103-1', taskId: 'DEV-TASK-103', title: 'Analyze EXPLAIN ANALYZE on query plans', completed: true, completedAt: '2026-09-04T16:00:00Z' },
      { id: 'sub-103-2', taskId: 'DEV-TASK-103', title: 'Add composite index on (quiz_id, user_id, submitted_at)', completed: true, completedAt: '2026-09-06T10:00:00Z' },
      { id: 'sub-103-3', taskId: 'DEV-TASK-103', title: 'Partition historical tables by month range', completed: false },
    ],
    submission: {
      id: 'subm-103',
      taskId: 'DEV-TASK-103',
      developerId: 'AEW-DEV-02',
      developerName: 'Neha Verma',
      summary: 'Added B-Tree composite indices and partial indexes for active quiz attempts. Reduced scan time by 82%.',
      githubPrUrl: 'https://github.com/apna-engineering-wallah/student-portal-v2/pull/39',
      submittedAt: '2026-09-07T12:00:00Z',
      status: 'changes_requested',
      managerFeedback: 'Good index design, but running CREATE INDEX directly without CONCURRENTLY will lock the production table during migration. Please update the migration script with CONCURRENTLY and verify zero downtime.',
      reviewedBy: 'AEW-WDM-01',
      reviewedAt: '2026-09-08T15:00:00Z',
    },
    comments: [
      {
        id: 'comm-103-1',
        taskId: 'DEV-TASK-103',
        authorId: 'AEW-WDM-01',
        authorName: 'Vikramaditya Sen',
        authorRole: 'web_dev_manager',
        content: 'Please check the review feedback: need CONCURRENTLY keyword in PostgreSQL migration to prevent table locks.',
        createdAt: '2026-09-08T15:05:00Z',
      },
    ],
  },
  {
    id: 'DEV-TASK-104',
    projectId: 'PROJ-01',
    milestoneId: 'MS-02',
    title: 'Integrate Cloudflare Stream webhook for adaptive bitrate transcoding',
    description: 'Listen to video ready webhooks from Cloudflare Stream and update lecture video status with HLS/DASH manifest URLs.',
    type: 'feature',
    priority: 'medium',
    status: 'in_progress',
    estimatedHours: 10,
    actualHours: 4,
    xpReward: 200,
    assigneeId: 'AEW-DEV-02',
    assigneeName: 'Neha Verma',
    reviewerId: 'AEW-WDM-01',
    reviewerName: 'Vikramaditya Sen',
    isBlocked: false,
    tags: ['Backend', 'Webhooks', 'Cloudflare'],
    githubBranch: 'feat/cloudflare-stream-webhooks',
    dueDate: '2026-09-14',
    createdAt: '2026-09-06T10:00:00Z',
    updatedAt: '2026-09-08T11:00:00Z',
    subtasks: [
      { id: 'sub-104-1', taskId: 'DEV-TASK-104', title: 'Verify HMAC-SHA256 signature on incoming webhooks', completed: true, completedAt: '2026-09-07T11:00:00Z' },
      { id: 'sub-104-2', taskId: 'DEV-TASK-104', title: 'Handle retry semantics with idempotency keys', completed: false },
    ],
  },
  {
    id: 'DEV-TASK-105',
    projectId: 'PROJ-01',
    milestoneId: 'MS-01',
    title: 'Refactor Global State Management with Zustand & Local Sync',
    description: 'Migrate legacy Redux boilerplate to lightweight Zustand stores with optimistic UI updates and IndexedDB persistence.',
    type: 'refactor',
    priority: 'high',
    status: 'completed',
    estimatedHours: 20,
    actualHours: 18,
    xpReward: 350,
    assigneeId: 'AEW-DEV-01',
    assigneeName: 'Aarav Sharma',
    reviewerId: 'AEW-WDM-01',
    reviewerName: 'Vikramaditya Sen',
    isBlocked: false,
    tags: ['Architecture', 'Zustand', 'TypeScript'],
    githubBranch: 'refactor/zustand-migration',
    githubPrUrl: 'https://github.com/apna-engineering-wallah/student-portal-v2/pull/35',
    completedAt: '2026-09-01T17:00:00Z',
    createdAt: '2026-08-22T09:00:00Z',
    updatedAt: '2026-09-01T17:00:00Z',
    subtasks: [
      { id: 'sub-105-1', taskId: 'DEV-TASK-105', title: 'Create typed auth & session slice', completed: true, completedAt: '2026-08-25T14:00:00Z' },
      { id: 'sub-105-2', taskId: 'DEV-TASK-105', title: 'Migrate video player state machine', completed: true, completedAt: '2026-08-28T16:00:00Z' },
      { id: 'sub-105-3', taskId: 'DEV-TASK-105', title: 'Unit test Zustand selectors with Jest', completed: true, completedAt: '2026-08-31T11:00:00Z' },
    ],
    submission: {
      id: 'subm-105',
      taskId: 'DEV-TASK-105',
      developerId: 'AEW-DEV-01',
      developerName: 'Aarav Sharma',
      summary: 'Replaced 42 boilerplate files with 4 modular Zustand stores. Bundle size dropped by 44KB gzipped.',
      githubPrUrl: 'https://github.com/apna-engineering-wallah/student-portal-v2/pull/35',
      submittedAt: '2026-08-31T12:00:00Z',
      status: 'approved',
      managerFeedback: 'Outstanding architectural refactoring. Code is exceptionally clean, well-tested, and load times improved noticeably. Awarding +50 XP bonus!',
      bonusXpAwarded: 50,
      reviewedBy: 'AEW-WDM-01',
      reviewedAt: '2026-09-01T17:00:00Z',
    },
  },
  {
    id: 'DEV-TASK-106',
    projectId: 'PROJ-03',
    title: 'Setup Sentry Error Alerting & Release Health Monitoring',
    description: 'Configure source map upload in CI/CD pipeline, filter noise from browser extensions, and route critical 5xx errors to Slack channel.',
    type: 'devops',
    priority: 'medium',
    status: 'todo',
    estimatedHours: 6,
    xpReward: 120,
    isBlocked: false,
    tags: ['DevOps', 'Sentry', 'Monitoring'],
    dueDate: '2026-09-18',
    createdAt: '2026-09-07T14:00:00Z',
    updatedAt: '2026-09-07T14:00:00Z',
    subtasks: [
      { id: 'sub-106-1', taskId: 'DEV-TASK-106', title: 'Install Sentry Next.js SDK', completed: false },
      { id: 'sub-106-2', taskId: 'DEV-TASK-106', title: 'Configure GitHub Actions source map upload', completed: false },
    ],
  },
  {
    id: 'DEV-TASK-107',
    projectId: 'PROJ-01',
    milestoneId: 'MS-03',
    title: 'Design Dark Mode Accessibility Contrast Compliance (WCAG AAA)',
    description: 'Ensure color tokens in Dark Mode meet WCAG 2.1 AAA minimum contrast ratio of 7:1 for normal text and 4.5:1 for large text.',
    type: 'feature',
    priority: 'low',
    status: 'blocked',
    estimatedHours: 8,
    actualHours: 2,
    xpReward: 140,
    assigneeId: 'AEW-DEV-02',
    assigneeName: 'Neha Verma',
    reviewerId: 'AEW-WDM-01',
    reviewerName: 'Vikramaditya Sen',
    isBlocked: true,
    blockerReason: 'Awaiting updated brand hex palette tokens from Design UI team lead before updating Tailwind CSS variables.',
    tags: ['UI/UX', 'Accessibility', 'CSS'],
    dueDate: '2026-09-16',
    createdAt: '2026-09-04T14:00:00Z',
    updatedAt: '2026-09-08T10:00:00Z',
    subtasks: [
      { id: 'sub-107-1', taskId: 'DEV-TASK-107', title: 'Run axe-core automated audit on main pages', completed: true, completedAt: '2026-09-05T16:00:00Z' },
      { id: 'sub-107-2', taskId: 'DEV-TASK-107', title: 'Update tailwind.config with AAA color pairings', completed: false },
    ],
  },
];

const SEED_BOUNTIES: WebDevBounty[] = [
  {
    id: 'BOUNTY-01',
    title: 'Critical: Optimize bundle size by lazy loading Monaco Editor',
    description: 'Monaco editor currently adds 2.8MB to initial vendor bundle chunk on code quiz pages. Refactor to dynamic import with skeleton loader.',
    xpReward: 400,
    difficulty: 'hard',
    status: 'open',
    category: 'optimization',
    expiresAt: '2026-09-25T23:59:59Z',
    createdAt: '2026-09-05T10:00:00Z',
  },
  {
    id: 'BOUNTY-02',
    title: 'Write E2E Playwright tests for Checkout & Student Enrollment Flow',
    description: 'Provide automated end-to-end browser test script covering coupon application, mock Razorpay payment confirmation, and course unlock confirmation.',
    xpReward: 250,
    difficulty: 'medium',
    status: 'assigned',
    category: 'testing',
    claimedById: 'AEW-DEV-01',
    claimedByName: 'Aarav Sharma',
    claimedAt: '2026-09-07T14:00:00Z',
    expiresAt: '2026-09-18T23:59:59Z',
    createdAt: '2026-09-04T09:00:00Z',
  },
  {
    id: 'BOUNTY-03',
    title: 'Security Audit: Sanitize Markdown user input against XSS vectors',
    description: 'Audit DOMPurify configuration in discussion forum preview. Ensure all HTML entities, inline javascript:, and data URI attributes are safely stripped.',
    xpReward: 350,
    difficulty: 'hard',
    status: 'open',
    category: 'security',
    expiresAt: '2026-09-30T23:59:59Z',
    createdAt: '2026-09-06T15:00:00Z',
  },
  {
    id: 'BOUNTY-04',
    title: 'Feature: Implement keyboard shortcuts (J/K/L) for Lecture Video Player',
    description: 'Add YouTube-like keyboard navigation: J (rewind 10s), K (play/pause), L (fast-forward 10s), F (fullscreen toggle), M (mute toggle).',
    xpReward: 150,
    difficulty: 'easy',
    status: 'open',
    category: 'feature',
    expiresAt: '2026-09-22T23:59:59Z',
    createdAt: '2026-09-07T18:00:00Z',
  },
];

const SEED_ACHIEVEMENTS: WebDevAchievement[] = [
  {
    id: 'ACH-01',
    key: 'FIRST_PR',
    title: 'First Code in Orbit',
    description: 'Submit your first Pull Request and get it reviewed.',
    icon: '🚀',
    badgeColor: 'blue',
    xpBonus: 50,
    criteriaDescription: '1 pull request submitted for review',
  },
  {
    id: 'ACH-02',
    key: 'BUG_SLAYER',
    title: 'Bug Slayer',
    description: 'Resolve 3 critical bug fixes verified by QA or Manager.',
    icon: '🐛',
    badgeColor: 'red',
    xpBonus: 100,
    criteriaDescription: '3 bugfix tasks marked completed',
  },
  {
    id: 'ACH-03',
    key: 'CLEAN_CODER',
    title: 'Clean Code Champion',
    description: 'Receive manager approval without any changes requested 5 times.',
    icon: '💎',
    badgeColor: 'purple',
    xpBonus: 150,
    criteriaDescription: '5 zero-revision task approvals',
  },
  {
    id: 'ACH-04',
    key: 'BOUNTY_HUNTER',
    title: 'Master Bounty Hunter',
    description: 'Claim and complete at least 2 open bounties.',
    icon: '🎯',
    badgeColor: 'amber',
    xpBonus: 200,
    criteriaDescription: '2 completed bounties',
  },
  {
    id: 'ACH-05',
    key: 'SPRINT_LEGEND',
    title: 'Sprint Legend',
    description: 'Accumulate over 1,500 XP across all development initiatives.',
    icon: '👑',
    badgeColor: 'emerald',
    xpBonus: 250,
    criteriaDescription: 'Reach 1,500 total earned XP',
  },
  {
    id: 'ACH-06',
    key: 'TEAM_PILLAR',
    title: 'Team Pillar',
    description: 'Send or receive peer recognition kudos 3 times.',
    icon: '🤝',
    badgeColor: 'pink',
    xpBonus: 75,
    criteriaDescription: '3 kudos exchanged',
  },
];

const SEED_USER_ACHIEVEMENTS: WebDevUserAchievement[] = [
  { id: 'UA-01', userId: 'AEW-DEV-01', achievementId: 'ACH-01', unlockedAt: '2026-08-10T12:00:00Z' },
  { id: 'UA-02', userId: 'AEW-DEV-01', achievementId: 'ACH-03', unlockedAt: '2026-08-25T16:00:00Z' },
  { id: 'UA-03', userId: 'AEW-DEV-01', achievementId: 'ACH-05', unlockedAt: '2026-09-01T17:00:00Z' },
  { id: 'UA-04', userId: 'AEW-DEV-02', achievementId: 'ACH-01', unlockedAt: '2026-08-28T14:00:00Z' },
];

const SEED_REWARDS: WebDevReward[] = [
  {
    id: 'REW-01',
    title: 'Junior Web Developer Certificate of Excellence',
    description: 'Official digital verified certificate recognizing foundational engineering contributions and coding standards.',
    type: 'certificate',
    xpThreshold: 500,
    icon: '📜',
    certificateTemplateId: 'cert_silver',
    status: 'active',
  },
  {
    id: 'REW-02',
    title: 'Official AEW Engineering Hoodie & Swag Kit',
    description: 'Custom embroidered Apna Engineering Wallah Tech Team zip hoodie, water bottle, and sticker collection.',
    type: 'merchandise',
    xpThreshold: 1000,
    icon: '👕',
    status: 'active',
  },
  {
    id: 'REW-03',
    title: 'Senior Web Developer Certificate of Distinction',
    description: 'Prestigious engineering award signed by Leadership, featuring unique QR code verification and permanent credential ID.',
    type: 'certificate',
    xpThreshold: 1500,
    icon: '🏆',
    certificateTemplateId: 'cert_gold',
    status: 'active',
  },
  {
    id: 'REW-04',
    title: 'LinkedIn Spotlight & Letter of Recommendation',
    description: 'Executive recommendation from AEW Engineering Leadership highlighting key architectural contributions.',
    type: 'linkedin_shoutout',
    xpThreshold: 2200,
    icon: '⭐',
    status: 'active',
  },
  {
    id: 'REW-05',
    title: '1-on-1 CTO Architecture Mentorship Session',
    description: 'Exclusive 60-minute deep dive session on distributed systems architecture, career progression, and open-source strategy.',
    type: 'mentorship',
    xpThreshold: 3000,
    icon: '🧠',
    status: 'active',
  },
];

const SEED_FULFILLMENTS: WebDevRewardFulfillment[] = [
  {
    id: 'FUL-01',
    rewardId: 'REW-01',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    userEmail: 'aarav.dev@aew.com',
    userTitle: 'Full Stack Developer',
    status: 'fulfilled',
    requestedAt: '2026-08-15T10:00:00Z',
    fulfilledAt: '2026-08-16T11:00:00Z',
    fulfilledBy: 'AEW-WDM-01',
    certificateId: 'CERT-WD-2026-001',
    verificationCode: 'WD-2026-88192',
    issueDate: '2026-08-16',
  },
  {
    id: 'FUL-02',
    rewardId: 'REW-02',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    userEmail: 'aarav.dev@aew.com',
    userTitle: 'Full Stack Developer',
    status: 'fulfilled',
    requestedAt: '2026-08-28T09:00:00Z',
    fulfilledAt: '2026-08-30T14:00:00Z',
    fulfilledBy: 'AEW-WDM-01',
  },
  {
    id: 'FUL-03',
    rewardId: 'REW-03',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    userEmail: 'aarav.dev@aew.com',
    userTitle: 'Full Stack Developer',
    status: 'fulfilled',
    requestedAt: '2026-09-02T10:00:00Z',
    fulfilledAt: '2026-09-03T12:00:00Z',
    fulfilledBy: 'AEW-WDM-01',
    certificateId: 'CERT-WD-2026-002',
    verificationCode: 'WD-2026-99431',
    issueDate: '2026-09-03',
  },
  {
    id: 'FUL-04',
    rewardId: 'REW-01',
    userId: 'AEW-DEV-02',
    userName: 'Neha Verma',
    userEmail: 'neha.dev@aew.com',
    userTitle: 'Backend Developer',
    status: 'fulfilled',
    requestedAt: '2026-09-04T11:00:00Z',
    fulfilledAt: '2026-09-05T09:00:00Z',
    fulfilledBy: 'AEW-WDM-01',
    certificateId: 'CERT-WD-2026-003',
    verificationCode: 'WD-2026-55124',
    issueDate: '2026-09-05',
  },
];

const SEED_XP_LEDGER: WebDevXPTransaction[] = [
  {
    id: 'TX-01',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    amount: 500,
    type: 'task_approved',
    sourceId: 'PREV-TASK-01',
    description: 'Completed Student Authentication & JWT Session Engine',
    awardedById: 'AEW-WDM-01',
    awardedByName: 'Vikramaditya Sen',
    createdAt: '2026-08-12T14:00:00Z',
  },
  {
    id: 'TX-02',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    amount: 400,
    type: 'task_approved',
    sourceId: 'PREV-TASK-02',
    description: 'Built Course Catalog and Search Index with Debounce',
    awardedById: 'AEW-WDM-01',
    awardedByName: 'Vikramaditya Sen',
    createdAt: '2026-08-20T16:00:00Z',
  },
  {
    id: 'TX-03',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    amount: 350,
    type: 'task_approved',
    sourceId: 'DEV-TASK-105',
    description: 'Completed Zustand State Management Refactor',
    awardedById: 'AEW-WDM-01',
    awardedByName: 'Vikramaditya Sen',
    createdAt: '2026-09-01T17:00:00Z',
  },
  {
    id: 'TX-04',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    amount: 50,
    type: 'manager_bonus',
    sourceId: 'DEV-TASK-105',
    description: 'Manager Excellence Bonus for Exceptional Code Cleanliness',
    awardedById: 'AEW-WDM-01',
    awardedByName: 'Vikramaditya Sen',
    createdAt: '2026-09-01T17:00:00Z',
  },
  {
    id: 'TX-05',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    amount: 300,
    type: 'bounty_approved',
    sourceId: 'PREV-BOUNTY-01',
    description: 'Completed Bounty: Docker Compose local multi-service orchestration',
    awardedById: 'AEW-WDM-01',
    awardedByName: 'Vikramaditya Sen',
    createdAt: '2026-08-27T18:00:00Z',
  },
  {
    id: 'TX-06',
    userId: 'AEW-DEV-01',
    userName: 'Aarav Sharma',
    amount: 250,
    type: 'achievement_unlocked',
    sourceId: 'ACH-05',
    description: 'Unlocked Sprint Legend Achievement Bonus',
    createdAt: '2026-09-01T17:05:00Z',
  },
  {
    id: 'TX-07',
    userId: 'AEW-DEV-02',
    userName: 'Neha Verma',
    amount: 400,
    type: 'task_approved',
    sourceId: 'PREV-TASK-03',
    description: 'Built REST API endpoints for Student Attendance Reports',
    awardedById: 'AEW-WDM-01',
    awardedByName: 'Vikramaditya Sen',
    createdAt: '2026-08-28T14:00:00Z',
  },
  {
    id: 'TX-08',
    userId: 'AEW-DEV-02',
    userName: 'Neha Verma',
    amount: 200,
    type: 'task_approved',
    sourceId: 'PREV-TASK-04',
    description: 'Migrated file upload handlers to S3 Presigned URLs',
    awardedById: 'AEW-WDM-01',
    awardedByName: 'Vikramaditya Sen',
    createdAt: '2026-09-03T11:00:00Z',
  },
  {
    id: 'TX-09',
    userId: 'AEW-DEV-02',
    userName: 'Neha Verma',
    amount: 50,
    type: 'achievement_unlocked',
    sourceId: 'ACH-01',
    description: 'Unlocked First Code in Orbit Achievement Bonus',
    createdAt: '2026-08-28T14:05:00Z',
  },
  {
    id: 'TX-10',
    userId: 'AEW-DEV-02',
    userName: 'Neha Verma',
    amount: 30,
    type: 'kudos_received',
    sourceId: 'KUDOS-01',
    description: 'Peer Kudos received from Aarav Sharma for helping on API docs',
    createdAt: '2026-09-04T16:00:00Z',
  },
];

const SEED_CHALLENGES: WebDevTeamChallenge[] = [
  {
    id: 'CHAL-01',
    title: 'September Technical Debt Blitz',
    description: 'Collaborate to close at least 25 refactoring and bugfix issues across all repositories.',
    goalXp: 4000,
    currentXp: 2530,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    status: 'active',
    rewardDescription: 'Team celebration dinner + exclusive Team Pioneer digital badge',
  },
];

const SEED_KUDOS: WebDevKudos[] = [
  {
    id: 'KUDOS-01',
    fromUserId: 'AEW-DEV-01',
    fromUserName: 'Aarav Sharma',
    toUserId: 'AEW-DEV-02',
    toUserName: 'Neha Verma',
    message: 'Huge thanks for rapidly updating the OpenAPI specs for attendance endpoints! Made frontend integration painless.',
    xpAmount: 30,
    createdAt: '2026-09-04T16:00:00Z',
  },
];

const SEED_AUDIT_LOGS: WebDevAuditLog[] = [
  {
    id: 'AUD-01',
    action: 'TASK_APPROVED',
    entityType: 'task',
    entityId: 'DEV-TASK-105',
    performedByUserId: 'AEW-WDM-01',
    performedByUserName: 'Vikramaditya Sen',
    details: 'Approved task "Refactor Global State Management" and awarded 350 XP + 50 bonus XP.',
    timestamp: '2026-09-01T17:00:00Z',
  },
  {
    id: 'AUD-02',
    action: 'REWARD_FULFILLED',
    entityType: 'reward',
    entityId: 'REW-03',
    performedByUserId: 'AEW-WDM-01',
    performedByUserName: 'Vikramaditya Sen',
    details: 'Issued Senior Web Developer Certificate of Distinction to Aarav Sharma (Code: WD-2026-99431).',
    timestamp: '2026-09-03T12:00:00Z',
  },
  {
    id: 'AUD-03',
    action: 'CHANGES_REQUESTED',
    entityType: 'task',
    entityId: 'DEV-TASK-103',
    performedByUserId: 'AEW-WDM-01',
    performedByUserName: 'Vikramaditya Sen',
    details: 'Requested changes on task "Database indexing for high-concurrency quiz submissions": Add CONCURRENTLY to migration.',
    timestamp: '2026-09-08T15:00:00Z',
  },
];

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
      userId: task.reviewerId || 'AEW-WDM-01',
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
      userId: task.reviewerId || 'AEW-WDM-01',
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
      userId: 'AEW-WDM-01',
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
      userId: 'AEW-WDM-01',
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
  getLeaderboard(period: 'weekly' | 'monthly' | 'all_time' = 'all_time'): {
    rank: number;
    userId: string;
    userName: string;
    userTitle: string;
    userLevel: number;
    avatarUrl?: string;
    totalXp: number;
    tasksCompleted: number;
    bountiesCompleted: number;
  }[] {
    const now = new Date();
    const nowMs = now.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    let cutoffMs = 0;

    if (period === 'weekly') {
      cutoffMs = nowMs - (7 * dayMs);
    } else if (period === 'monthly') {
      cutoffMs = nowMs - (30 * dayMs);
    }

    const txs = this.getXPLedger();
    const relevantTxs = cutoffMs > 0 ? txs.filter((t) => new Date(t.createdAt || 0).getTime() >= cutoffMs) : txs;

    // Collect all developers
    const users = StorageService.getUsers().filter((u) => u.role === 'web_developer' || u.role === 'web_dev_manager');
    const allTasks = this.getTasks();
    const allBounties = this.getBounties();

    const devStatsMap = new Map<string, {
      userId: string;
      userName: string;
      userTitle: string;
      userLevel: number;
      avatarUrl?: string;
      totalXp: number;
      tasksCompleted: number;
      bountiesCompleted: number;
    }>();

    users.forEach((u) => {
      const uXp = period === 'all_time' ? (u.webDevXp || 0) : 0;
      const lvl = calculateLevelFromXp(u.webDevXp || 0);
      devStatsMap.set(u.teacherId.toUpperCase(), {
        userId: u.teacherId,
        userName: u.name,
        userTitle: u.webDevTitle || lvl.title,
        userLevel: u.webDevLevel || lvl.level,
        avatarUrl: u.avatarUrl,
        totalXp: uXp,
        tasksCompleted: 0,
        bountiesCompleted: 0,
      });
    });

    // Sum period XP
    relevantTxs.forEach((tx) => {
      const cleanId = (tx.userId || '').toUpperCase();
      if (!cleanId) return;
      let stat = devStatsMap.get(cleanId);
      if (!stat) {
        stat = {
          userId: tx.userId || cleanId,
          userName: tx.userName || cleanId,
          userTitle: 'Developer',
          userLevel: 1,
          totalXp: 0,
          tasksCompleted: 0,
          bountiesCompleted: 0,
        };
        devStatsMap.set(cleanId, stat);
      }
      if (period !== 'all_time') {
        stat.totalXp += tx.amount || 0;
      }
    });

    // Count completed tasks and bounties
    allTasks.forEach((t) => {
      if (t.status === 'completed' && t.assigneeId) {
        const stat = devStatsMap.get(t.assigneeId.toUpperCase());
        if (stat) stat.tasksCompleted += 1;
      }
    });

    allBounties.forEach((b) => {
      if (b.status === 'completed' && b.claimedById) {
        const stat = devStatsMap.get(b.claimedById.toUpperCase());
        if (stat) stat.bountiesCompleted += 1;
      }
    });

    const sorted = Array.from(devStatsMap.values())
      .filter((s) => s.totalXp > 0 || s.tasksCompleted > 0)
      .sort((a, b) => b.totalXp - a.totalXp);

    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
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
      userId: 'AEW-WDM-01',
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
};
