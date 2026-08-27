import type { NotificationEventType } from '../../api/send-email';

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
  private async dispatch(options: EmailDispatchOptions): Promise<void> {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[NotificationService] Dispatch response not OK:', response.status, errorText);
      } else {
        const result = await response.json();
        console.log('[NotificationService] Email dispatch successful:', result);
      }
    } catch (err) {
      console.warn('[NotificationService] Failed to dispatch email notification (non-blocking):', err);
    }
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
  }): Promise<void> {
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
  }): Promise<void> {
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
    subject: string;
    allowedMinutes: number;
    startWindow: string;
    endWindow: string;
    topicsCovered?: string;
    adminRemarks?: string;
  }): Promise<void> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'extension_granted',
      data: params,
    });
  }

  /**
   * 4. 📑 Teacher submits proposed subtopics -> Email to Admin
   */
  async notifySubtopicsSubmitted(params: {
    adminEmails: string | string[];
    teacherName: string;
    teacherId: string;
    subject: string;
    topicTitle: string;
    unitNumber?: string;
    subtopicsCount: number;
  }): Promise<void> {
    if (!params.adminEmails) return;
    return this.dispatch({
      to: params.adminEmails,
      type: 'subtopics_submitted',
      data: params,
    });
  }

  /**
   * 5. 📑 Admin reviews subtopics (approved or revision requested) -> Email to Teacher
   */
  async notifySubtopicsReviewed(params: {
    teacherEmail: string;
    teacherName: string;
    subject: string;
    topicTitle: string;
    status: 'approved' | 'revision_requested';
    feedback?: string;
  }): Promise<void> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'subtopics_reviewed',
      data: params,
    });
  }

  /**
   * 6. 📊 Teacher requests PYQ PPT presentation deck -> Email to Admin
   */
  async notifyPptRequested(params: {
    adminEmails: string | string[];
    teacherName: string;
    teacherId: string;
    subject: string;
    topicTitle: string;
    unitNumber?: string;
    specialInstructions?: string;
  }): Promise<void> {
    if (!params.adminEmails) return;
    return this.dispatch({
      to: params.adminEmails,
      type: 'ppt_requested',
      data: params,
    });
  }

  /**
   * 7. 🎉 Admin marks PYQ PPT deck as ready -> Email to Teacher
   */
  async notifyPptReady(params: {
    teacherEmail: string;
    teacherName: string;
    subject: string;
    topicTitle: string;
  }): Promise<void> {
    if (!params.teacherEmail) return;
    return this.dispatch({
      to: params.teacherEmail,
      type: 'ppt_ready',
      data: params,
    });
  }
}

export const notificationService = new NotificationService();
