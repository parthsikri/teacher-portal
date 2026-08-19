export type UserRole = 'teacher' | 'admin';

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
  dailyTargetMinutes: number; // Minimum required lecture recording time per day in minutes (e.g. 120 min)
  dailyLimit?: number;        // Backwards compatibility
}

export interface AdminRemark {
  id: string;
  lectureId: string;
  adminName: string;
  remarkText: string;
  createdAt: string;
}

export type SubtopicApprovalState = 
  | 'pending_teacher_input'   // Topic assigned by Admin, waiting for Teacher to propose subtopics
  | 'pending_admin_approval'  // Teacher proposed subtopics, waiting for Admin approval
  | 'approved'                // Admin approved subtopics, ready for lecture delivery
  | 'revision_requested';     // Admin requested changes with feedback

export interface SubtopicItem {
  id: string;
  name: string;
  deadlineDate: string;       // Individual submission deadline (YYYY-MM-DD)
  status?: 'pending' | 'completed';
}

export interface SubjectReference {
  id: string;
  subjectName: string;
  department: string;
  title: string;              // e.g. "Master Course Syllabus & Standard Textbook PDF"
  referenceUrl: string;       // Google Drive folder/file or reference doc URL
  notes?: string;             // Course guidelines, textbook recommendations
  updatedAt: string;
}

export interface AssignedTopic {
  id: string;
  teacherId: string;
  subject: string;
  topicTitle: string;
  subtopics: string[];                  // Subtopic names list
  subtopicItems?: SubtopicItem[];       // Detailed subtopics with individual deadlines
  proposedSubtopics?: string[];         // Subtopics proposed by the teacher
  subtopicsApprovalState: SubtopicApprovalState;
  adminFeedback?: string;               // Admin revision remark
  assignedBy: string;
  deadlineDate: string;                 // Overall Topic Deadline (YYYY-MM-DD)
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'normal';
  notes?: string;
  createdAt: string;
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
  deadlineDate: string;       // YYYY-MM-DD
  status: 'on_time' | 'overdue';
  youtubeUrl?: string;
  driveUrl?: string;
  notesUrl?: string;
  dppUrl?: string;
  localFileUrl?: string;
  fileName?: string;
  assignedTopicId?: string;
  adminRemarks: AdminRemark[];
  createdAt: string;
}
