import type { NotificationEventType } from '../../api/send-email';
import { StorageService } from './storage';

interface EmailDispatchOptions {
  to: string | string[];
  type: NotificationEventType;
  data: Record<string, any>;
}

/**
 * Client-side asynchronous notification service.
 * Dispatches operational notification emails via the Vercel serverless / Express /api/send-email route.
 * Non-blocking, fire-and-forget.
 */
class NotificationService {
  public async dispatch(options: EmailDispatchOptions): Promise<{
    success: boolean;
    status: 'delivered' | 'failed' | 'simulated';
    error?: string;
    messageId?: string;
    subject?: string;
  }> {
    const config = StorageService.getEmailConfig();
    let status: 'delivered' | 'failed' | 'simulated' = 'failed';
    let errorMessage: string | undefined;
    let messageId: string | undefined;
    let subject = options.data?.subject || `AEW Notification: ${options.type}`;

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...StorageService.getAuthHeaders(),
        },
        body: JSON.stringify({
          ...options,
          config,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (result.subject) subject = result.subject;

      if (!response.ok) {
        status = 'failed';
        errorMessage = result.error || `HTTP ${response.status}: Failed to dispatch email.`;
        console.warn('[NotificationService] Email dispatch failed:', errorMessage);
      } else {
        status = result.simulated ? 'simulated' : 'delivered';
        messageId = result.messageId || result.id;
        console.log('[NotificationService] Email dispatch result:', result);
      }
    } catch (err: any) {
      status = 'failed';
      errorMessage = err?.message || 'Network error while attempting to dispatch email.';
      console.warn('[NotificationService] Failed to dispatch email notification:', err);
    }

    // Persist into audit history and sync to cloud
    try {
      const summaryParts = [];
      if (options.data?.topicTitle) summaryParts.push(`Topic: ${options.data.topicTitle}`);
      if (options.data?.teacherName) summaryParts.push(`Teacher: ${options.data.teacherName}`);
      if (options.data?.lectureTitle) summaryParts.push(`Lecture: ${options.data.lectureTitle}`);

      StorageService.addEmailLog({
        to: options.to,
        type: options.type,
        subject,
        status,
        provider: config.provider || 'smtp',
        messageId,
        errorMessage,
        dataSummary: summaryParts.join(' • ') || undefined,
      });
    } catch (logErr) {
      console.warn('[NotificationService] Error recording email log:', logErr);
    }

    return {
      success: status !== 'failed',
      status,
      error: errorMessage,
      messageId,
      subject,
    };
  }

  /**
   * Retry sending a previously recorded email log
   */
  async retryEmail(logId: string): Promise<{ success: boolean; status: string; error?: string }> {
    const logs = StorageService.getEmailLogs();
    const target = logs.find((l) => l.id === logId);
    if (!target) return { success: false, status: 'failed', error: 'Log entry not found' };

    return this.dispatch({
      to: target.to,
      type: target.type as any,
      data: { subject: target.subject },
    });
  }

  /**
   * Send an immediate test dispatch to verify credentials
   */
  async sendTestEmail(recipientEmail: string): Promise<{ success: boolean; status: string; error?: string }> {
    return this.dispatch({
      to: recipientEmail,
      type: 'test_dispatch',
      data: {
        provider: StorageService.getEmailConfig().provider === 'resend' ? 'Resend API' : 'Gmail / SMTP',
      },
    });
  }

  /**
   * 0. 📌 Admin assigns a new curriculum topic -> Email to Teacher
   */
  async notifyTopicAssigned(params: {
    teacherEmail: string;
    teacherName: string;
    subject?: string;
    topicTitle: string;
    unitNumber?: string;
    notes?: string;
    [key: string]: any;
  }): Promise<any> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'topic_assigned',
      data: params,
    });
  }

  /**
   * 1. 💬 Admin posts a directive on a lecture -> Email to Teacher
   */
  async notifyDirectivePosted(params: {
    teacherEmail: string;
    teacherName: string;
    lectureTitle: string;
    subject?: string;
    remarkText: string;
    adminName: string;
    [key: string]: any;
  }): Promise<any> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'admin_directive',
      data: params,
    });
  }

  /**
   * 2. ✓ Teacher acknowledges an admin directive -> Email to Admin
   */
  async notifyDirectiveAcknowledged(params: {
    adminEmails: string | string[];
    teacherName: string;
    teacherId: string;
    lectureTitle: string;
    subject?: string;
    remarkText: string;
    [key: string]: any;
  }): Promise<any> {
    if (!params.adminEmails) return;
    return this.dispatch({
      to: params.adminEmails,
      type: 'directive_acknowledged',
      data: params,
    });
  }

  /**
   * 3. ⏱️ Admin grants an extension window -> Email to Teacher
   */
  async notifyExtensionGranted(params: {
    teacherEmail: string;
    teacherName: string;
    allowedMinutes: number;
    endWindow: string;
    topics?: string;
    topicsCovered?: string;
    notes?: string;
    adminRemarks?: string;
    [key: string]: any;
  }): Promise<any> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'extension_granted',
      data: params,
    });
  }

  /**
   * 4. 📝 Teacher submits proposed subtopics -> Email to Admin
   */
  async notifySubtopicsSubmitted(params: {
    adminEmails: string | string[];
    teacherName: string;
    teacherId: string;
    topicTitle: string;
    unitNumber?: string;
    subtopics?: string[];
    [key: string]: any;
  }): Promise<any> {
    if (!params.adminEmails) return;
    return this.dispatch({
      to: params.adminEmails,
      type: 'subtopics_submitted',
      data: params,
    });
  }

  /**
   * 5. ✅/🔄 Admin reviews subtopics (approved or revision requested) -> Email to Teacher
   */
  async notifySubtopicsReviewed(params: {
    teacherEmail: string;
    teacherName: string;
    topicTitle: string;
    unitNumber?: string;
    status: 'approved' | 'revision_requested';
    adminFeedback?: string;
    feedback?: string;
    [key: string]: any;
  }): Promise<any> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'subtopics_reviewed',
      data: params,
    });
  }

  /**
   * 6. 📊 Teacher requests PYQ slide deck -> Email to Admin
   */
  async notifyPptRequested(params: {
    adminEmails: string | string[];
    teacherName: string;
    teacherId: string;
    topicTitle: string;
    subject?: string;
    targetExam?: string;
    lectureDate?: string;
    [key: string]: any;
  }): Promise<any> {
    if (!params.adminEmails) return;
    return this.dispatch({
      to: params.adminEmails,
      type: 'ppt_requested',
      data: params,
    });
  }

  /**
   * 7. 🎁 Admin completes PPT and delivers download link -> Email to Teacher
   */
  async notifyPptReady(params: {
    teacherEmail: string;
    teacherName: string;
    topicTitle: string;
    completedPptUrl?: string;
    completedPdfUrl?: string;
    adminRemarks?: string;
    [key: string]: any;
  }): Promise<any> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'ppt_ready',
      data: params,
    });
  }

  /**
   * 8. 🏖️ Admin grants day off / leave -> Email to Teacher
   */
  async notifyDayOffGranted(params: {
    teacherEmail: string;
    teacherName: string;
    teacherId: string;
    date: string;
    endDate?: string;
    reason: string;
    grantedBy: string;
    [key: string]: any;
  }): Promise<any> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'day_off_granted',
      data: params,
    });
  }

  /**
   * 9. 🔄 Teacher replaces / reuploads video -> Email to Admin
   */
  async notifyVideoReuploaded(params: {
    adminEmails: string | string[];
    teacherName: string;
    teacherId: string;
    lectureTitle: string;
    subject?: string;
    newVideoUrl: string;
    videoType: 'youtube' | 'drive';
    reuploadReason?: string;
    durationMinutes?: number;
    [key: string]: any;
  }): Promise<any> {
    if (!params.adminEmails) return;
    return this.dispatch({
      to: params.adminEmails,
      type: 'video_reuploaded',
      data: params,
    });
  }
}

export const notificationService = new NotificationService();
