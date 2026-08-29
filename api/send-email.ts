import nodemailer from 'nodemailer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Type definitions for notification email payloads
export type NotificationEventType =
  | 'topic_assigned'
  | 'admin_directive'
  | 'directive_acknowledged'
  | 'extension_granted'
  | 'subtopics_submitted'
  | 'subtopics_reviewed'
  | 'ppt_requested'
  | 'ppt_ready'
  | 'day_off_granted';

export interface EmailRequestBody {
  to: string | string[];
  type: NotificationEventType;
  data: Record<string, any>;
}

// Portal Base URL (for email action button links)
const PORTAL_URL = process.env.PORTAL_URL || 'https://teacher-portal-mu-nine.vercel.app';

// 1. SMTP Credentials (e.g. Gmail / Google Workspace / Office 365) — Works without any custom domain!
const SMTP_USER = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').trim().replace(/\s+/g, '');
const SMTP_HOST = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);

// 2. Resend Credentials (Alternative API provider)
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const RESEND_FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'Academic Operations <onboarding@resend.dev>').trim();

/**
 * Generate formatted HTML email template based on notification event type
 */
function buildEmailTemplate(type: NotificationEventType, data: Record<string, any>): { subject: string; html: string } {
  const brandHeader = `
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; font-family: sans-serif; letter-spacing: -0.5px;">
        🎓 AEW Academic Studio
      </h1>
      <p style="color: #c7d2fe; margin: 4px 0 0 0; font-size: 12px; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px;">
        Teacher & Operations Portal
      </p>
    </div>
  `;

  const brandFooter = `
    <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #1e293b;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0; font-family: sans-serif;">
        This is an automated operational notification from the AEW Teacher Portal.
      </p>
      <p style="color: #64748b; font-size: 10px; margin: 6px 0 0 0; font-family: sans-serif;">
        Strictly operational updates • No spam • Confidential
      </p>
    </div>
  `;

  const wrapContent = (bodyHtml: string, actionButtonHtml?: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          ${brandHeader}
          <div style="padding: 28px 24px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
            ${bodyHtml}
            ${actionButtonHtml ? `<div style="margin-top: 28px; text-align: center;">${actionButtonHtml}</div>` : ''}
          </div>
          ${brandFooter}
        </div>
      </body>
    </html>
  `;

  switch (type) {
    case 'topic_assigned': {
      const subject = `📌 New Syllabus Topic Assigned: "${data.topicTitle}" (${data.subject || 'Subject'})`;
      const html = wrapContent(
        `
        <div style="background-color: #1e1b4b; border: 1px solid #4f46e5; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: #c7d2fe; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">New Curriculum Topic Assignment</span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Hello <strong>${data.teacherName || 'Faculty Member'}</strong>,
        </p>
        <p>
          A new curriculum topic has been assigned to your course schedule by Academic Operations:
        </p>
        <div style="background-color: #1e293b; border-left: 4px solid #6366f1; padding: 14px 16px; border-radius: 4px; margin: 18px 0;">
          <div style="font-size: 14px; font-weight: 700; color: #f8fafc;">${data.topicTitle}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Subject: <strong>${data.subject || 'Academic Subject'}</strong> • Unit: <strong>${data.unitNumber || 'UNIT 1'}</strong></div>
          ${data.notes ? `<div style="font-size: 12px; color: #cbd5e1; margin-top: 8px; font-style: italic;">Guidelines: "${data.notes}"</div>` : ''}
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          Please log into the Teacher Portal to review this topic and propose your subtopic breakdown for lecture recording.
        </p>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);">
          Propose Subtopics in Portal →
        </a>`
      );
      return { subject, html };
    }

    case 'admin_directive': {
      const subject = `💬 Quality Directive: Feedback on "${data.lectureTitle || 'Delivered Lecture'}"`;
      const html = wrapContent(
        `
        <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: #a5b4fc; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Academic Directive & Feedback</span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Hello <strong>${data.teacherName || 'Faculty Member'}</strong>,
        </p>
        <p>
          The Academic Operations Team (<strong>${data.adminName || 'Admin'}</strong>) has posted a quality guideline / directive regarding your lecture session:
        </p>
        <div style="background-color: #1e293b; border-left: 4px solid #6366f1; padding: 14px 16px; border-radius: 4px; margin: 18px 0;">
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Lecture: <strong style="color: #f1f5f9;">${data.lectureTitle}</strong> (${data.subject || 'Subject'})</div>
          <div style="font-size: 14px; color: #e2e8f0; font-style: italic; margin-top: 8px;">"${data.remarkText}"</div>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          Please review this feedback and confirm compliance by clicking <strong>Acknowledge</strong> on your dashboard.
        </p>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);">
          View Lecture & Acknowledge Directive →
        </a>`
      );
      return { subject, html };
    }

    case 'directive_acknowledged': {
      const subject = `✓ Directive Acknowledged: ${data.teacherName} (${data.teacherId})`;
      const html = wrapContent(
        `
        <div style="background-color: #064e3b; border: 1px solid #059669; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: #6ee7b7; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Directive Acknowledged</span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Academic Operations Update,
        </p>
        <p>
          Faculty member <strong>${data.teacherName}</strong> (<code>${data.teacherId}</code>) has acknowledged the administrative directive on lecture session:
        </p>
        <div style="background-color: #1e293b; border-left: 4px solid #10b981; padding: 14px 16px; border-radius: 4px; margin: 18px 0;">
          <div style="font-size: 12px; color: #94a3b8;">Lecture: <strong style="color: #f1f5f9;">${data.lectureTitle}</strong> (${data.subject || 'Subject'})</div>
          <div style="font-size: 13px; color: #cbd5e1; margin-top: 6px;">Directive Note: "${data.remarkText}"</div>
          <div style="font-size: 11px; color: #34d399; margin-top: 8px; font-weight: 600;">Status: Formally Acknowledged ✓</div>
        </div>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px;">
          Open Admin Center →
        </a>`
      );
      return { subject, html };
    }

    case 'extension_granted': {
      const subject = `⏱️ Extension Window Granted: ${data.subject || 'Academic Work'} (${data.allowedMinutes} min)`;
      const html = wrapContent(
        `
        <div style="background-color: #3b0764; border: 1px solid #7e22ce; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: #d8b4fe; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Extension Window Active</span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Hello <strong>${data.teacherName || 'Faculty Member'}</strong>,
        </p>
        <p>
          An official lecture recording extension window has been granted for your account:
        </p>
        <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 18px 0; border: 1px solid #334155;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Subject:</td>
              <td style="color: #f8fafc; font-weight: 700; padding: 6px 0;">${data.subject || 'Assigned Subject'}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Allowed Recording:</td>
              <td style="color: #a855f7; font-weight: 700; font-family: monospace; font-size: 14px; padding: 6px 0;">${data.allowedMinutes} Minutes</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Valid From:</td>
              <td style="color: #cbd5e1; padding: 6px 0;">${data.startWindow || 'Immediate'}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Valid Until:</td>
              <td style="color: #fbbf24; font-weight: 700; padding: 6px 0;">${data.endWindow || 'Specified Window'}</td>
            </tr>
            ${data.topicsCovered ? `
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Topic Scope:</td>
              <td style="color: #cbd5e1; padding: 6px 0;">${data.topicsCovered}</td>
            </tr>` : ''}
            ${data.adminRemarks ? `
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Admin Note:</td>
              <td style="color: #e2e8f0; font-style: italic; padding: 6px 0;">"${data.adminRemarks}"</td>
            </tr>` : ''}
          </table>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          Lectures uploaded within this window will be classified under approved extension without penalty.
        </p>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background-color: #7e22ce; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(126, 34, 206, 0.4);">
          Upload Lecture Now →
        </a>`
      );
      return { subject, html };
    }

    case 'subtopics_submitted': {
      const subject = `📑 Subtopics Proposed: ${data.teacherName} — "${data.topicTitle}"`;
      const html = wrapContent(
        `
        <div style="background-color: #172554; border: 1px solid #1d4ed8; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: #93c5fd; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Syllabus Proposal Awaiting Review</span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Academic Operations Review Alert,
        </p>
        <p>
          Faculty member <strong>${data.teacherName}</strong> (<code>${data.teacherId}</code>) has submitted a proposed subtopic breakdown for:
        </p>
        <div style="background-color: #1e293b; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; margin: 18px 0;">
          <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${data.topicTitle}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Subject: ${data.subject || 'Academic Subject'} • Unit: ${data.unitNumber || 'Unit'}</div>
          <div style="font-size: 12px; color: #60a5fa; margin-top: 6px; font-weight: 600;">Proposed Subtopics: ${data.subtopicsCount || 'Multiple'} parts</div>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          Please review the proposals and approve or request revisions with delivery deadlines.
        </p>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px;">
          Review Subtopics in Syllabus Manager →
        </a>`
      );
      return { subject, html };
    }

    case 'subtopics_reviewed': {
      const isApproved = data.status === 'approved';
      const subject = isApproved
        ? `✅ Subtopics Approved: "${data.topicTitle}" (${data.subject})`
        : `⚠️ Revision Requested: "${data.topicTitle}" (${data.subject})`;
      const html = wrapContent(
        `
        <div style="background-color: ${isApproved ? '#064e3b' : '#451a03'}; border: 1px solid ${isApproved ? '#059669' : '#d97706'}; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: ${isApproved ? '#6ee7b7' : '#fcd34d'}; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${isApproved ? 'Syllabus Approved' : 'Action Required: Revision Requested'}
          </span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Hello <strong>${data.teacherName || 'Faculty Member'}</strong>,
        </p>
        <p>
          Your proposed subtopic breakdown for <strong>${data.topicTitle}</strong> has been reviewed by Academic Operations:
        </p>
        <div style="background-color: #1e293b; border-left: 4px solid ${isApproved ? '#10b981' : '#f59e0b'}; padding: 14px 16px; border-radius: 4px; margin: 18px 0;">
          <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${data.topicTitle} (${data.subject})</div>
          <div style="font-size: 12px; color: ${isApproved ? '#34d399' : '#fbbf24'}; margin-top: 6px; font-weight: 700;">
            Status: ${isApproved ? 'Approved for Recording ✓' : 'Revision Requested ⚠️'}
          </div>
          ${data.feedback ? `
          <div style="font-size: 13px; color: #e2e8f0; font-style: italic; margin-top: 8px; border-top: 1px solid #334155; pt-2;">
            Feedback: "${data.feedback}"
          </div>` : ''}
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          ${isApproved ? 'You may now commence lecture recording for these approved subtopics.' : 'Please adjust your subtopic breakdown in the Syllabus tab and resubmit for approval.'}
        </p>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background-color: ${isApproved ? '#059669' : '#d97706'}; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px;">
          ${isApproved ? 'Open Recording Studio →' : 'Update Subtopics →'}
        </a>`
      );
      return { subject, html };
    }

    case 'ppt_requested': {
      const subject = `📊 PYQ PPT Requested: ${data.teacherName} — "${data.topicTitle}"`;
      const html = wrapContent(
        `
        <div style="background-color: #14532d; border: 1px solid #16a34a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: #86efac; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">PYQ Presentation Deck Request</span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Slide Deck Request Received,
        </p>
        <p>
          Faculty member <strong>${data.teacherName}</strong> (<code>${data.teacherId}</code>) has requested formatted PYQ presentation slides:
        </p>
        <div style="background-color: #1e293b; border-left: 4px solid #22c55e; padding: 14px 16px; border-radius: 4px; margin: 18px 0;">
          <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${data.topicTitle}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Subject: ${data.subject || 'Subject'} • Unit: ${data.unitNumber || 'Unit'}</div>
          ${data.specialInstructions ? `
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 6px; font-style: italic;">Notes: "${data.specialInstructions}"</div>` : ''}
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          Standard 2-day turnaround expected. Generate slides via the PYQ PPT Generator or upload ready deck.
        </p>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px;">
          Open PYQ PPT Generator →
        </a>`
      );
      return { subject, html };
    }

    

    case 'day_off_granted': {
      const subject = `🏖️ Approved Day Off / Leave Granted: ${data.date}`;
      const html = wrapContent(
        `
        <div style="background-color: #064e3b; border: 1px solid #059669; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: #6ee7b7; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Official Leave Confirmation</span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Hello <strong>${data.teacherName || 'Faculty Member'}</strong>,
        </p>
        <p>
          Academic Operations has officially granted you an approved <strong>Day Off / Leave</strong> for <strong>${data.date}</strong>${data.endDate ? ` to <strong>${data.endDate}</strong>` : ''}.
        </p>
        <div style="background-color: #1e293b; border-left: 4px solid #10b981; padding: 14px 16px; border-radius: 4px; margin: 18px 0;">
          <div style="font-size: 13px; color: #94a3b8;">Faculty: <strong>${data.teacherName}</strong> (${data.teacherId})</div>
          <div style="font-size: 14px; font-weight: 700; color: #a7f3d0; margin-top: 4px;">🏖️ Approved Date: ${data.date}${data.endDate ? ` - ${data.endDate}` : ''}</div>
          <div style="font-size: 13px; color: #f1f5f9; margin-top: 6px;">Reason: <strong>${data.reason || 'Approved Leave / Official Duty'}</strong></div>
          <div style="font-size: 12px; color: #6ee7b7; margin-top: 8px;">Quota Requirement: <strong>0 min (Excused · No Backlog)</strong></div>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          Your required recording target is excused for this date with zero shortfall or backlog penalties.
        </p>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);">Open Teacher Portal →</a>`
      );
      return { subject, html };
    }

    case 'ppt_ready': {
      const subject = `🎉 PYQ Deck Ready: "${data.topicTitle}" (${data.subject})`;
      const html = wrapContent(
        `
        <div style="background-color: #064e3b; border: 1px solid #059669; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="color: #6ee7b7; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Presentation Deck Ready</span>
        </div>
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
          Hello <strong>${data.teacherName || 'Faculty Member'}</strong>,
        </p>
        <p>
          The PYQ Presentation Slide Deck for <strong>${data.topicTitle}</strong> has been completed and is ready for use in your lecture recording:
        </p>
        <div style="background-color: #1e293b; border-left: 4px solid #10b981; padding: 14px 16px; border-radius: 4px; margin: 18px 0;">
          <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${data.topicTitle}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Subject: ${data.subject} • Format: PPTX Slide Deck</div>
          <div style="font-size: 12px; color: #34d399; margin-top: 6px; font-weight: 600;">Status: Ready for Download ✓</div>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          You can download the slide deck directly from the PYQ Slide Decks portal.
        </p>
        `,
        `<a href="${PORTAL_URL}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.4);">
          Download Presentation Deck →
        </a>`
      );
      return { subject, html };
    }

    default: {
      const subject = `AEW Portal Operational Notification: ${type}`;
      const html = wrapContent(`<p>New update in Teacher Portal regarding your academic activities.</p>`);
      return { subject, html };
    }
  }
}

/**
 * Serverless Handler for Sending Operational Notification Emails via Resend
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { to, type, data } = (req.body || {}) as EmailRequestBody;

  if (!to || !type) {
    return res.status(400).json({ error: 'Missing required parameters: "to" and "type".' });
  }

  const recipientList = Array.isArray(to) ? to : [to];
  const validRecipients = recipientList.filter((email) => typeof email === 'string' && email.includes('@'));

  if (validRecipients.length === 0) {
    return res.status(400).json({ error: 'No valid recipient email addresses provided.' });
  }

  const { subject, html } = buildEmailTemplate(type, data || {});

    const bodyConfig = (req.body?.config || {}) as Record<string, any>;
  const activeSmtpUser = (bodyConfig.smtpUser || SMTP_USER).trim();
  const activeSmtpPass = (bodyConfig.smtpPass ? String(bodyConfig.smtpPass).trim().replace(/\s+/g, '') : SMTP_PASS);
  const activeSmtpHost = (bodyConfig.smtpHost || SMTP_HOST || 'smtp.gmail.com').trim();
  const activeSmtpPort = parseInt(bodyConfig.smtpPort || SMTP_PORT || '465', 10);
  const activeSenderName = (bodyConfig.senderName || 'AEW Academic Operations').trim();
  const activeSmtpFrom = (bodyConfig.smtpFrom || `${activeSenderName} <${activeSmtpUser}>`).trim();
  const activeResendKey = (bodyConfig.resendApiKey || RESEND_API_KEY).trim();
  const activeResendFrom = (bodyConfig.fromEmail || RESEND_FROM_EMAIL).trim();

  // ─── A. Dispatch via SMTP (Gmail / Custom Mail Server) ─────────────────────
  if (activeSmtpUser && activeSmtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: activeSmtpHost,
        port: activeSmtpPort,
        secure: activeSmtpPort === 465,
        auth: {
          user: activeSmtpUser,
          pass: activeSmtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: activeSmtpFrom || activeSmtpUser,
        to: validRecipients.join(', '),
        subject,
        html,
      });

      console.log(`[SendEmail] SMTP delivered "${type}" email to ${validRecipients.join(', ')}. MessageId:`, info.messageId);
      return res.status(200).json({
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
        recipients: validRecipients,
        type,
      });
    } catch (smtpErr: any) {
      console.error('[SendEmail] SMTP Error:', smtpErr);
      return res.status(500).json({
        success: false,
        error: smtpErr.message || 'Failed to dispatch email via SMTP.',
        provider: 'smtp',
      });
    }
  }

  // ─── B. Dispatch via Resend API ───────────────────────────────────────────
  if (activeResendKey) {
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeResendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: activeResendFrom,
          to: validRecipients,
          subject,
          html,
        }),
      });

      const resendResult = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error('[SendEmail] Resend API Error:', resendResult);
        return res.status(resendResponse.status).json({
          success: false,
          error: resendResult.message || 'Failed to dispatch email via Resend API.',
          details: resendResult,
          provider: 'resend',
        });
      }

      console.log(`[SendEmail] Resend delivered "${type}" email to ${validRecipients.join(', ')}. ID:`, resendResult.id);
      return res.status(200).json({
        success: true,
        id: resendResult.id,
        provider: 'resend',
        recipients: validRecipients,
        type,
      });
    } catch (resendErr: any) {
      console.error('[SendEmail] Resend error:', resendErr);
      return res.status(500).json({
        success: false,
        error: resendErr.message || 'Internal server error while processing Resend dispatch.',
        provider: 'resend',
      });
    }
  }
  // ─── C. Simulated Fallback (No Credentials Configured) ───────────────────
  console.warn(`[SendEmail] Neither SMTP (Gmail) nor RESEND_API_KEY is configured. Simulated "${type}" email to:`, validRecipients);
  return res.status(200).json({
    success: true,
    simulated: true,
    message: 'No email credentials (SMTP_USER/SMTP_PASS or RESEND_API_KEY) found. Email logged to console.',
    recipients: validRecipients,
    type,
  });
}