import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, X, Send, Sparkles, Key, Server, Save, Check } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { StorageService } from '../../services/storage';
import type { EmailConfig } from '../../types';

interface EmailSettingsModalProps {
  onClose: () => void;
  adminEmail?: string;
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({ onClose, adminEmail = 'admin@aew.com' }) => {
  const currentConfig = StorageService.getEmailConfig();

  // Configuration State
  const [provider, setProvider] = useState<'smtp' | 'resend'>(currentConfig.provider || 'smtp');
  const [smtpUser, setSmtpUser] = useState(currentConfig.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(currentConfig.smtpPass || '');
  const [senderName, setSenderName] = useState(currentConfig.senderName || 'AEW Academic Operations');
  const [resendApiKey, setResendApiKey] = useState(currentConfig.resendApiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test Dispatch State
  const [activeTab, setActiveTab] = useState<'config' | 'test'>('config');
  const [testEmail, setTestEmail] = useState(adminEmail);
  const [testType, setTestType] = useState<'topic_assigned' | 'admin_directive' | 'extension_granted' | 'subtopics_reviewed' | 'ppt_ready'>('topic_assigned');
  const [sending, setSending] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: EmailConfig = {
      provider,
      smtpUser: smtpUser.trim(),
      smtpPass: smtpPass.trim().replace(/\s+/g, ''),
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      senderName: senderName.trim() || 'AEW Academic Operations',
      resendApiKey: resendApiKey.trim(),
    };

    StorageService.saveEmailConfig(newConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim() || !testEmail.includes('@')) {
      setResultMsg({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }

    setSending(true);
    setResultMsg({ type: 'info', text: 'Dispatching live test email...' });

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
        text: `Email dispatched successfully to ${testEmail.trim()}! Please check your inbox.`,
      });
    } catch (err: any) {
      setResultMsg({
        type: 'error',
        text: err.message || 'Failed to dispatch email.',
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
                Email Notifications Setup
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'config'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Email Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'test'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Dispatch Station</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300">
          {activeTab === 'config' ? (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">Email Delivery Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProvider('smtp')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      provider === 'smtp'
                        ? 'bg-indigo-950/50 border-indigo-500 text-slate-100 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Gmail / Google Workspace</span>
                      {provider === 'smtp' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-1 font-semibold">
                      ✓ No custom domain needed
                    </div>
                    <div className="text-[10px] text-slate-500">Sends to any email address</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProvider('resend')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      provider === 'resend'
                        ? 'bg-indigo-950/50 border-indigo-500 text-slate-100 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Resend API</span>
                      {provider === 'resend' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[10px] text-amber-400 mt-1 font-semibold">
                      Requires API Key / Domain
                    </div>
                    <div className="text-[10px] text-slate-500">Transactional REST API</div>
                  </button>
                </div>
              </div>

              {provider === 'smtp' ? (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gmail App Password Setup</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your Gmail Address</label>
                      <input
                        type="email"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="e.g. yourname@gmail.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-400">16-Character Google App Password</label>
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-400 hover:underline"
                        >
                          Generate on Google →
                        </a>
                      </div>
                      <input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="e.g. abcd efgh ijkl mnop"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Go to your Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords &gt; Create "Teacher Portal".
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sender Display Name</label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="AEW Academic Operations"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Resend API Key</label>
                    <input
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder="re_123456789..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Email credentials saved and synchronized to cloud database!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Email Credentials</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Active Notifications Matrix */}
              <div className="space-y-2">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Active Operational Notification Triggers
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                    <span className="text-base">📌</span>
                    <div>
                      <div className="font-bold text-slate-200 text-xs">Topic Assignments</div>
                      <div className="text-[10px] text-slate-400">Admin assigns syllabus topic to faculty</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                    <span className="text-base">💬</span>
                    <div>
                      <div className="font-bold text-slate-200 text-xs">Directives & Feedback</div>
                      <div className="text-[10px] text-slate-400">Admin remarks on lectures & teacher acks</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                    <span className="text-base">⏱️</span>
                    <div>
                      <div className="font-bold text-slate-200 text-xs">Extension Grants</div>
                      <div className="text-[10px] text-slate-400">Window timeframe & extra allowed minutes</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                    <span className="text-base">📊</span>
                    <div>
                      <div className="font-bold text-slate-200 text-xs">PYQ Slide Decks</div>
                      <div className="text-[10px] text-slate-400">Requests & delivery completion alerts</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                  <span>🛡️</span>
                  <span><strong>Policy Confirmed:</strong> Daily upload deadlines and countdown timers are strictly excluded from email dispatches.</span>
                </div>
              </div>

              {/* Test Dispatch Form */}
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
                    type="submit"
                    disabled={sending}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? 'Dispatching...' : 'Send Test Notification'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
