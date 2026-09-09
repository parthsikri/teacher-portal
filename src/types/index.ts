export type UserRole = 'teacher' | 'admin' | 'pr_intern' | 'web_dev_manager' | 'web_developer';

export type PrTier = 'Silver' | 'Gold' | 'Premium';

export interface User {
  id: string;
  teacherId: string;
  username?: string;
  password?: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  subject: string;
  dailyTargetMinutes: number;    // Minimum required lecture recording time per day in minutes (e.g. 120 min)
  maxDailyMinutes?: number;      // Admin-configurable maximum daily recording limit (e.g. 240 min)
  dailyUploadCutoffTime?: string; // Standard fixed daily upload cutoff time (e.g. "20:00" / "08:00 PM") set once upon first login
  hasSetInitialCommitment?: boolean; // Set to true once the teacher sets their initial commitment time
  dailyLimit?: number;           // Backwards compatibility
  joiningDate?: string;          // Official faculty onboarding / joining date (YYYY-MM-DD) for backlog calculation origin
  firstLoginDate?: string;       // Date when faculty first logged in (YYYY-MM-DD)
  createdAt?: string;            // Account creation timestamp
  phone?: string;
  // PR Intern specific fields
  prTier?: PrTier;
  prPoints?: number;
  prStars?: number;
  totalSponsorshipRevenue?: number;
  totalCommissionEarned?: number;
  // Web Development specific fields
  webDevTitle?: string;
  webDevLevel?: number;
  webDevXp?: number;
  skills?: string[];
  githubUsername?: string;
  avatarUrl?: string;
}

export interface DailyCommitment {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;            // YYYY-MM-DD
  promisedTime: string;    // e.g. "18:00" or "06:00 PM"
  note?: string;           // Optional note e.g. "Will record and upload by 8 PM"
  isDeliveryDay?: boolean; // Explicit daily work commitment; initial cutoff setup is not one
  targetMinutes?: number;  // Target snapshot when an explicit delivery day is created
  updatedAt: string;
}

export interface AdminRemark {
  id: string;
  lectureId: string;
  adminName: string;
  remarkText: string;
  createdAt: string;
  isAcknowledged?: boolean;         // true when teacher acknowledges this remark
  acknowledgedAt?: string;          // ISO timestamp when acknowledged
  acknowledgedByName?: string;      // Name of the teacher who acknowledged
  isNewAckForAdmin?: boolean;       // Notification badge flag for Admin
}

export type SubtopicApprovalState = 
  | 'pending_teacher_input'   // Topic assigned by Admin, waiting for Teacher to propose subtopics
  | 'pending_admin_approval'  // Teacher proposed subtopics, waiting for Admin approval
  | 'approved'                // Admin approved subtopics, ready for lecture delivery
  | 'revision_requested';     // Admin requested changes with feedback

export interface SubtopicItem {
  id: string;
  name: string;
  deadlineDate?: string;       // Optional legacy support
  status?: 'pending' | 'completed';
  isApproved?: boolean;        // True if approved by Admin
}

export interface SubjectReference {
  id: string;
  subjectName: string;
  department: string;
  title: string;              // e.g. "Master Course Syllabus & Standard Textbook PDF"
  referenceUrl: string;       // Google Drive folder/file or reference doc URL
  notes?: string;             // Course guidelines, textbook recommendations
  updatedAt: string;
  isNewFromAdmin?: boolean;   // Notification flag
}

export interface AssignedTopic {
  id: string;
  teacherId: string;
  subject: string;
  unitNumber?: string;                  // e.g. "UNIT 1", "UNIT 2", "UNIT 3"
  topicTitle: string;
  subtopics: string[];                  // Subtopic names list
  subtopicItems?: SubtopicItem[];       // Detailed subtopics with individual deadlines
  proposedSubtopics?: string[];         // Subtopics proposed by the teacher
  subtopicsApprovalState: SubtopicApprovalState;
  adminFeedback?: string;               // Admin revision remark
  adminApprovalComment?: string;        // Optional guidelines or remarks from Admin upon approving subtopics
  assignedBy: string;
  deadlineDate?: string;                 // Optional legacy module deadline
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'normal';
  durationMinutes?: number;             // Estimated lecture recording duration in minutes (default 45 min)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  isNewFromAdmin?: boolean;             // Notification flag
  displayOrder?: number;                // Curriculum order within unit
}

export interface Lecture {
  id: string;
  teacherId: string;
  teacherName: string;
  department: string;
  subject: string;
  title: string;
  primaryTopic: string;
  subtopics: string[];
  durationMinutes: number;    // Lecture duration recorded in minutes (e.g. 45, 60, 90)
  targetMinutesAtSubmission?: number; // Immutable daily-target snapshot for historical calculations
  deadlineDate?: string;       // Optional legacy date
  status: 'on_time' | 'late' | 'overdue' | 'extended';
  youtubeUrl?: string;
  driveUrl?: string;
  notesUrl?: string;
  dppUrl?: string;
  localFileUrl?: string;
  fileName?: string;
  assignedTopicId?: string;
  unitNumber?: string;        // e.g. "UNIT 1", "UNIT 2", "UNIT 3"
  adminRemarks: AdminRemark[];
  createdAt: string;
  reuploadedAt?: string;      // ISO timestamp of latest video replacement
  reuploadReason?: string;    // Reason specified by teacher for reuploading
  reuploadCount?: number;     // Total number of times video was replaced (e.g. 1 for v2)
  previousVideoUrl?: string;  // Preserved previous link for audit/reference
  previousVideoType?: 'youtube' | 'drive';
}

export interface DayOffGrant {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;               // YYYY-MM-DD
  endDate?: string;           // Optional multi-day leave end YYYY-MM-DD
  reason: string;             // e.g. "Medical Leave", "Official Conference Duty", "Approved Personal Day"
  grantedBy: string;          // Admin name
  grantedAt: string;          // ISO timestamp
  notes?: string;
}

export type PptRequestStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export interface PptRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  unitNumber: string;         // e.g. "UNIT 1", "UNIT 2"
  topicTitle: string;         // e.g. "Dynamic Programming on Trees"
  targetExam?: string;        // e.g. "University End-Term", "GATE", "Semester Exams"
  yearRange?: string;         // e.g. "2019-2024 (Last 5 Years)"
  lectureDate: string;        // Scheduled lecture recording date (YYYY-MM-DD)
  estimatedQuestions?: number;
  referenceUrl?: string;      // Drive link, question sheet, syllabus link
  specialInstructions?: string; // Notes for the slide design team
  status: PptRequestStatus;
  completedPptUrl?: string;   // Link to finalized .pptx
  completedPdfUrl?: string;   // Link to finalized .pdf
  adminRemarks?: string;      // Note from design team
  isNewForTeacher?: boolean;  // Notification badge indicator
  createdAt: string;
  updatedAt: string;
}

export interface LectureExtension {
  id: string;
  teacherId: string;
  assignedTopicIds: string[];  // Late/missed topics allowed for this extension
  startWindow: string;        // ISO start time, e.g. "2026-08-25T10:00:00.000Z"
  endWindow: string;          // ISO end time, e.g. "2026-08-25T22:00:00.000Z"
  allowedMinutes: number;     // Additional allowed minutes for this extension
  usedMinutes: number;        // Track extension usage separately
  notes?: string;             // Admin reason/notes
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType = 'deposit_surplus' | 'apply_to_backlog' | 'manual_adjustment';

export interface WalletTransaction {
  id: string;
  teacherId: string;
  type: WalletTransactionType;
  amount: number;             // Minutes deposited or withdrawn (positive number)
  date: string;               // YYYY-MM-DD
  referenceLectureId?: string;// Optional lecture ID that earned the surplus
  referenceDate?: string;     // Date of the backlog/surplus
  note?: string;              // Reason or description e.g. "Transferred 15m to offset Aug 22 shortfall"
  appliedBy?: string;         // Teacher name or 'Admin'
  createdAt: string;          // ISO timestamp
}

export interface TimeWalletInfo {
  balance: number;                  // Current available banked surplus minutes
  totalSurplusEarned: number;       // Lifetime surplus earned from recording beyond daily targets
  totalAppliedToBacklog: number;    // Lifetime wallet minutes explicitly applied to offset backlog
  transactions: WalletTransaction[]; // Audit history
}

export type DailyLogStatus = 'surplus' | 'completed' | 'shortfall' | 'leave' | 'in_progress';

export interface DailyBacklogLog {
  date: string;                   // YYYY-MM-DD
  dayOfWeek: string;              // e.g. "Monday", "Tuesday"
  formattedDate: string;          // e.g. "Aug 31, 2026"
  isToday: boolean;
  isYesterday: boolean;
  dailyTarget: number;            // Quota in minutes (0 if approved leave)
  recordedMinutes: number;        // Total minutes recorded from lectures on this date
  shortfall: number;              // Raw deficit for this date Math.max(0, dailyTarget - recordedMinutes)
  surplus: number;                // Surplus earned Math.max(0, recordedMinutes - dailyTarget)
  isDayOff: boolean;              // True if official approved leave
  dayOffReason?: string;          // Reason e.g. "Medical Leave"
  status: DailyLogStatus;         // surplus | completed | shortfall | leave | in_progress
  lectures: Lecture[];            // Complete list of lectures uploaded on this date
  lectureCount: number;
  walletAppliedMinutes?: number;  // If wallet minutes were applied to offset
  notes?: string;
}

export interface TeacherDailyLogsInfo {
  teacherId: string;
  totalHistoricalShortfall: number;
  totalSurplusEarned: number;
  walletMinutesApplied: number;
  remainingBacklogMinutes: number;
  totalDaysLogged: number;
  shortfallDaysCount: number;
  surplusDaysCount: number;
  completedDaysCount: number;
  leaveDaysCount: number;
  joiningDate?: string;            // Faculty joining date / tracking origin (YYYY-MM-DD)
  effectiveStartDate?: string;      // Effective date backlog calculations start from
  logs: DailyBacklogLog[];         // Sorted newest to oldest
}

export interface EmailConfig {
  provider: 'smtp' | 'resend';
  smtpUser?: string;
  smtpPass?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  senderName?: string;
  resendApiKey?: string;
  fromEmail?: string;
  lastTestedAt?: string;
  updatedAt?: string;
}

export interface EmailLogItem {
  id: string;
  to: string | string[];
  type: string;
  subject: string;
  status: 'delivered' | 'failed' | 'simulated';
  provider?: 'smtp' | 'resend' | 'simulated';
  messageId?: string;
  errorMessage?: string;
  timestamp: string;
  dataSummary?: string;
}

// ─── PR INTERNS DOMAIN TYPES ────────────────────────────────────────────────

export type PrTaskStatus = 'pending' | 'submitted' | 'approved' | 'revision_requested';
export type PrTaskPriority = 'urgent' | 'high' | 'medium' | 'normal';
export type PrTaskCategory = 'college_sponsorship' | 'fest_mou' | 'influencer_collab' | 'campus_ambassador' | 'content_promo';

export interface PrTask {
  id: string;
  title: string;
  description: string;
  category?: PrTaskCategory;
  assignedToInternId: string;
  assignedToInternName: string;
  assignedByAdminName?: string;
  deadline: string;
  pointsReward: number;     // e.g. 25 points
  starsReward: number;      // e.g. 2 stars
  priority: PrTaskPriority;
  status: PrTaskStatus;
  submissionNotes?: string;
  submissionProofUrl?: string; // e.g. Drive doc, event link, social post link
  submittedAt?: string;
  reviewedAt?: string;
  adminRemarks?: string;
  awardedPoints?: number;
  awardedStars?: number;
  createdAt: string;
}

export type PrLeadStage = 
  | 'lead' 
  | 'contacted' 
  | 'pitch_deck_sent' 
  | 'negotiation' 
  | 'mou_drafted' 
  | 'closed_won' 
  | 'closed_lost';

export type PrLeadType = 
  | 'college_sponsorship' 
  | 'event_partner' 
  | 'brand_sponsor' 
  | 'campus_ambassador_lead';

export interface PrLead {
  id: string;
  internId: string;
  internName: string;
  type: PrLeadType;
  organizationName: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  expectedSponsorshipAmount: number;
  closedAmount?: number;
  stage: PrLeadStage;
  internTierAtClosure?: PrTier;
  commissionRate?: number; // 3.3, 7.0, or 12.0 (%)
  commissionEarned?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PrMouStatus = 'draft' | 'pending_admin_approval' | 'approved' | 'signed' | 'rejected';

export interface PrMouRequest {
  id: string;
  mouNumber: string; // e.g. "AEW/MOU/2026/018"
  internId: string;
  internName: string;
  partnerOrganization: string;
  partnerSignatory: string;
  partnerDesignation: string;
  partnerAddress: string;
  purpose: string;
  terms: string[];
  sponsorshipAmount?: number;
  startDate: string;
  endDate: string;
  status: PrMouStatus;
  adminFeedback?: string;
  generatedAt: string;
  approvedAt?: string;
  signedAt?: string;
}

export interface PrCollege {
  id: string;
  name: string;
  university?: string;
  state: string;
  city: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  status: 'lead' | 'contacted' | 'meeting_scheduled' | 'partner' | 'inactive';
  studentCount?: number;
  notes?: string;
  assignedInternId?: string;
  assignedInternName?: string;
  lastContactedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrDailyWorklog {
  id: string;
  internId: string;
  internName: string;
  date: string; // YYYY-MM-DD
  callsMade: number;
  emailsSent: number;
  collegesContacted: number;
  leadsGenerated: number;
  tasksCompleted: string;
  keyBlockers?: string;
  planForTomorrow?: string;
  createdAt: string;
  reviewedByAdmin?: boolean;
}

// ─── WEB DEVELOPMENT MANAGEMENT & RECOGNITION MODULE ─────────────────────────

export type WebDevProjectStatus = 'planning' | 'active' | 'in_progress' | 'at_risk' | 'paused' | 'completed' | 'archived';
export type WebDevProjectHealth = 'healthy' | 'at_risk' | 'critical' | 'completed';

export interface WebDevProject {
  id: string;
  key?: string;
  name?: string;
  title?: string;
  description: string;
  repositoryUrl?: string;
  liveUrl?: string;
  liveDeploymentUrl?: string;
  techStack: string[];
  status: WebDevProjectStatus | string;
  health?: WebDevProjectHealth;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  managerId: string;
  managerName: string;
  leadDeveloperId?: string;
  leadDeveloperName?: string;
  developerIds?: string[];
  progressPercentage?: number;
  progress?: number; // 0 - 100%
  startDate: string;
  targetDate?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export type WebDevMilestoneStatus = 'pending' | 'in_progress' | 'completed';

export interface WebDevMilestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  targetDate?: string;
  deadline?: string;
  order?: number;
  orderIndex?: number;
  status: WebDevMilestoneStatus | string;
  progress?: number;
  progressPercentage?: number;
  createdAt: string;
}

export type WebDevTaskType = 
  | 'development'
  | 'feature'
  | 'bugfix'
  | 'bug_fix'
  | 'ui_ux'
  | 'optimization'
  | 'maintenance'
  | 'refactoring'
  | 'refactor'
  | 'performance'
  | 'devops'
  | 'testing'
  | 'documentation'
  | 'critical_production_issue';

export type WebDevTaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type WebDevTaskStatus = 
  | 'todo'
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'review_requested'
  | 'changes_requested'
  | 'completed'
  | 'blocked'
  | 'approved';

export type WebDevDeadlineCategory = 'on_track' | 'due_soon' | 'at_risk' | 'overdue';

export type WebDevBlockerReason = 
  | 'waiting_for_design'
  | 'waiting_for_api'
  | 'waiting_for_approval'
  | 'technical_issue'
  | 'external_dependency'
  | 'other'
  | string;

export interface WebDevSubtask {
  id: string;
  taskId: string;
  title: string;
  completed?: boolean;
  isCompleted?: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface WebDevSubmission {
  id: string;
  taskId: string;
  developerId: string;
  developerName: string;
  summary?: string;
  notes?: string;
  githubPrUrl?: string;
  pullRequestUrl?: string;
  liveUrl?: string;
  liveDeploymentUrl?: string;
  repositoryUrl?: string;
  screenshots?: string[];
  submittedAt: string;
  status?: 'pending' | 'approved' | 'changes_requested' | 'rejected' | string;
  reviewStatus?: 'pending' | 'approved' | 'changes_requested' | 'rejected' | string;
  managerFeedback?: string;
  reviewNotes?: string;
  bonusXpAwarded?: number;
  reviewedBy?: string;
  reviewedByManagerId?: string;
  reviewedByManagerName?: string;
  reviewedAt?: string;
  reviewCycle?: number;
}

export interface WebDevTask {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  assigneeId?: string;
  assigneeName?: string;
  assignedDeveloperId?: string;
  assignedDeveloperName?: string;
  assignedDeveloperAvatar?: string;
  reviewerId?: string;
  reviewerName?: string;
  createdByManagerId?: string;
  createdByManagerName?: string;
  type?: WebDevTaskType | string;
  taskType?: WebDevTaskType | string;
  priority: WebDevTaskPriority;
  status: WebDevTaskStatus | string;
  progress?: number;
  estimatedHours?: number;
  actualHours?: number;
  estimatedEffort?: string;
  xpReward?: number;
  points?: number;
  bountyPoints?: number;
  isBlocked: boolean;
  blockerReason?: WebDevBlockerReason;
  blockerNote?: string;
  tags?: string[];
  subtasks?: WebDevSubtask[];
  githubBranch?: string;
  githubPrUrl?: string;
  liveDemoUrl?: string;
  dueDate?: string;
  deadline?: string;
  completedAt?: string;
  submission?: WebDevSubmission;
  currentSubmission?: WebDevSubmission;
  comments?: WebDevComment[];
  attachments?: { name: string; url: string; size?: string }[];
  links?: { title: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface WebDevComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export type WebDevBountyType = 'assigned' | 'open';
export type WebDevBountyStatus = 'open' | 'assigned' | 'claimed' | 'submitted' | 'under_review' | 'approved' | 'completed' | 'cancelled';

export interface WebDevBounty {
  id: string;
  title: string;
  description: string;
  type?: WebDevBountyType;
  projectId?: string;
  projectName?: string;
  assignedDeveloperId?: string;
  assignedDeveloperName?: string;
  xpReward?: number;
  rewardXp?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  status: WebDevBountyStatus | string;
  category?: 'feature' | 'bugfix' | 'optimization' | 'security' | 'testing' | string;
  claimedById?: string;
  claimedByName?: string;
  claimedByDeveloperId?: string;
  claimedByDeveloperName?: string;
  claimedAt?: string;
  submissionUrl?: string;
  submittedAt?: string;
  submission?: WebDevSubmission;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  feedback?: string;
  expiresAt?: string;
  deadline?: string;
  requirements?: string[];
  eligibilityLevel?: number;
  createdByManagerName?: string;
  createdAt: string;
}

export type WebDevXPSource = 
  | 'task_approved'
  | 'bounty_approved'
  | 'achievement_unlocked'
  | 'manager_bonus'
  | 'kudos_received'
  | 'team_challenge'
  | 'challenge_completed'
  | 'admin_adjustment'
  | string;

export interface WebDevXPTransaction {
  id: string;
  userId?: string;
  userName?: string;
  developerId?: string;
  developerName?: string;
  amount?: number;
  points?: number;
  type?: WebDevXPSource;
  source?: WebDevXPSource;
  sourceId?: string;
  referenceId?: string;
  referenceTitle?: string;
  description?: string;
  reason?: string;
  awardedById?: string;
  awardedByName?: string;
  awardedBy?: string;
  createdAt?: string;
  timestamp?: string;
}

export interface WebDevAchievement {
  id: string;
  key?: string;
  code?: string;
  title?: string;
  name?: string;
  description: string;
  icon: string;
  badgeColor: string;
  xpBonus?: number;
  rewardXpBonus?: number;
  criteriaDescription?: string;
  criteriaType?: 'tasks_count' | 'speed_ahead_of_deadline' | 'consecutive_days' | 'bugs_fixed' | 'bounties_won' | 'perfect_week' | 'top_rank' | string;
  criteriaThreshold?: number;
  isCustom?: boolean;
}

export interface WebDevUserAchievement {
  id: string;
  userId?: string;
  developerId?: string;
  achievementId: string;
  achievementName?: string;
  achievementCode?: string;
  unlockedAt: string;
  progress?: number;
  isCompleted?: boolean;
}

export type WebDevRewardType = 
  | 'certificate'
  | 'digital_badge'
  | 'linkedin_mention'
  | 'linkedin_shoutout'
  | 'merchandise'
  | 'mentorship'
  | 'developer_of_month'
  | 'developer_of_quarter'
  | 'special_recognition'
  | 'internal_award'
  | 'team_recognition'
  | string;

export type WebDevFulfillmentStatus = 
  | 'locked'
  | 'eligible'
  | 'pending'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'fulfillment_pending'
  | 'fulfilled'
  | string;

export interface WebDevReward {
  id: string;
  title: string;
  description: string;
  type?: WebDevRewardType;
  rewardType?: WebDevRewardType;
  xpThreshold: number;
  icon?: string;
  badgeIcon?: string;
  certificateTemplateId?: string;
  approvalRequired?: boolean;
  isActive?: boolean;
  status?: 'active' | 'inactive' | string;
  createdAt?: string;
}

export interface WebDevRewardFulfillment {
  id: string;
  rewardId: string;
  rewardTitle?: string;
  rewardType?: WebDevRewardType;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userTitle?: string;
  developerId?: string;
  developerName?: string;
  developerEmail?: string;
  xpAtUnlock?: number;
  status: WebDevFulfillmentStatus;
  requestedAt?: string;
  unlockedAt?: string;
  fulfilledAt?: string;
  fulfilledBy?: string;
  approvedByManagerId?: string;
  approvedByManagerName?: string;
  approvedAt?: string;
  certificateId?: string;
  verificationCode?: string;
  issueDate?: string;
  publicUrl?: string;
  linkedInPostUrl?: string;
  fulfillmentNotes?: string;
}

export interface WebDevTeamChallenge {
  id: string;
  title: string;
  description: string;
  goalXp?: number;
  currentXp?: number;
  targetCount?: number;
  currentCount?: number;
  bonusXp?: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'expired';
  rewardDescription?: string;
  contributors?: { developerId: string; developerName: string; count: number }[];
}

export interface WebDevKudos {
  id: string;
  fromUserId?: string;
  fromUserName?: string;
  toUserId?: string;
  toUserName?: string;
  developerId?: string;
  developerName?: string;
  fromManagerId?: string;
  fromManagerName?: string;
  message: string;
  xpAmount?: number;
  badge?: string;
  createdAt: string;
}

export interface WebDevAuditLog {
  id: string;
  action: string;
  details: string;
  actorId?: string;
  actorName?: string;
  actorRole?: UserRole;
  performedByUserId?: string;
  performedByUserName?: string;
  entityType: 'task' | 'project' | 'bounty' | 'reward' | 'user' | 'xp' | string;
  entityId?: string;
  timestamp: string;
}

export interface WebDevNotification {
  id: string;
  userId?: string;
  recipientId?: string;
  title: string;
  message: string;
  type: 
    | 'task_assigned'
    | 'task_submitted'
    | 'task_approved'
    | 'changes_requested'
    | 'bounty_available'
    | 'xp_awarded'
    | 'reward_unlocked'
    | 'achievement_unlocked'
    | 'blocker_alert'
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | string;
  read?: boolean;
  isRead?: boolean;
  link?: string;
  actionUrl?: string;
  createdAt: string;
}





