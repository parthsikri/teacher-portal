import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, X, Send, Sparkles } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

interface EmailSettingsModalProps {
  onClose: () => void;
  adminEmail?: string;
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({ onClose, adminEmail = 'admin@aew.com' }) => {
  const [testEmail, setTestEmail] = useState(adminEmail);
  const [testType, setTestType] = useState<'topic_assigned' | 'admin_directive' | 'extension_granted' | 'subtopics_reviewed' | 'ppt_ready'>('topic_assigned');
  const [sending, setSending] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim() || !testEmail.includes('@')) {
      setResultMsg({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }

    setSending(true);
    setResultMsg({ type: 'info', text: 'Dispatching test notification via Resend...' });

    try {
      if (testType === 'topic_assigned') {
        await notificationService.notifyTopicAssigned({
          teacherEmail: testEmail.trim(),
          teacherName: 'Dr. Test Faculty',
          subject: 'Physics',
          topicTitle: 'Thermodynamics & Heat Transfer',
          unitNumber: 'UNIT 1',
          notes: 'Please propose detailed subtopics covering Carnot cycle and entropy.',
        });
      } else if (testType === 'admin_directive') {
        await notificationService.notifyDirectivePosted({
          teacherEmail: testEmail.trim(),
          teacherName: 'Dr. Test Faculty',
          lectureTitle: 'Quantum Mechanics Session 04: Wave Equations',
          subject: 'Physics',
          remarkText: 'Ensure the derivation of Schrödinger equation is explained step-by-step.',
          adminName: 'Academic Operations Admin',
        });
      } else if (testType === 'extension_granted') {
        await notificationService.notifyExtensionGranted({
          teacherEmail: testEmail.trim(),
          teacherName: 'Dr. Test Faculty',
          subject: 'Physics',
          allowedMinutes: 90,
          startWindow: 'Today at 08:00 PM',
          endWindow: 'Tomorrow at 11:59 PM',
          topicsCovered: 'Wave Mechanics & Probability Densities',
          adminRemarks: 'Extension granted for laboratory session catchup.',
        });
      } else if (testType === 'subtopics_reviewed') {
        await notificationService.notifySubtopicsReviewed({
          teacherEmail: testEmail.trim(),
          teacherName: 'Dr. Test Faculty',
          subject: 'Physics',
          topicTitle: 'Thermodynamics & Heat Transfer',
          status: 'approved',
          feedback: 'Comprehensive breakdown. Approved for recording.',
        });
      } else if (testType === 'ppt_ready') {
        await notificationService.notifyPptReady({
          teacherEmail: testEmail.trim(),
          teacherName: 'Dr. Test Faculty',
          subject: 'Physics',
          topicTitle: 'Thermodynamics & Heat Transfer',
        });
      }

      setResultMsg({
        type: 'success',
        text: `Test email request sent to ${testEmail.trim()}! Check your inbox or Vercel serverless logs.`,
      });
    } catch (err: any) {
      setResultMsg({
        type: 'error',
        text: err.message || 'Failed to dispatch test email.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Resend Email Notifications
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Resend API
                </span>
              </h3>
              <p className="text-xs text-slate-400">Automated operational notifications (strictly non-deadline)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300">
          {/* Active Notifications Matrix */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Active Notification Triggers
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                <span className="text-base">💬</span>
                <div>
                  <div className="font-bold text-slate-200 text-xs">Directives & Quality Notes</div>
                  <div className="text-[10px] text-slate-400">Admin remarks on lectures & teacher acks</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                <span className="text-base">⏱️</span>
                <div>
                  <div className="font-bold text-slate-200 text-xs">Extension Grants</div>
                  <div className="text-[10px] text-slate-400">Window timeframe, allowed minutes & note</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                <span className="text-base">📑</span>
                <div>
                  <div className="font-bold text-slate-200 text-xs">Syllabus Proposals</div>
                  <div className="text-[10px] text-slate-400">Subtopic submissions, approvals & revisions</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                <span className="text-base">📊</span>
                <div>
                  <div className="font-bold text-slate-200 text-xs">PYQ Slide Decks</div>
                  <div className="text-[10px] text-slate-400">Slide requests & delivery completion alerts</div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
              <span>🛡️</span>
              <span><strong>Policy Confirmed:</strong> Daily upload deadlines and countdown timers are strictly excluded from email dispatches.</span>
            </div>
          </div>

          {/* Test Dispatch Station */}
          <form onSubmit={handleSendTest} className="space-y-4 pt-2 border-t border-slate-800">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Send Sample Test Notification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">Recipient Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="teacher@aew.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">Notification Template</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="topic_assigned">📌 New Topic Assigned</option>
                  <option value="admin_directive">💬 Academic Directive</option>
                  <option value="extension_granted">⏱️ Extension Window Granted</option>
                  <option value="subtopics_reviewed">✅ Subtopics Approved</option>
                  <option value="ppt_ready">🎉 PYQ Slide Deck Ready</option>
                </select>
              </div>
            </div>

            {/* Status Message */}
            {resultMsg && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  resultMsg.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : resultMsg.type === 'error'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
                }`}
              >
                {resultMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{resultMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Dispatching...' : 'Send Test Notification'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
