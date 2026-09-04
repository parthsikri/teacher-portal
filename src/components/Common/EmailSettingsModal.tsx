import React, { useState, useEffect } from 'react';
import { 
  Mail, CheckCircle2, AlertCircle, X, Send, Sparkles, Key, Server, Save, Check,
  History, RefreshCw, Trash2, Cloud, ExternalLink, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { StorageService } from '../../services/storage';
import type { EmailConfig, EmailLogItem } from '../../types';

interface EmailSettingsModalProps {
  onClose: () => void;
  adminEmail?: string;
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({ onClose, adminEmail = 'admin@aew.com' }) => {
  const currentConfig = StorageService.getEmailConfig();

  // Navigation Tabs: 'config' | 'logs' | 'test'
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'test'>('config');

  // Configuration State
  const [provider, setProvider] = useState<'smtp' | 'resend'>(currentConfig.provider || 'smtp');
  const [smtpUser, setSmtpUser] = useState(currentConfig.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(currentConfig.smtpPass || '');
  const [smtpHost, setSmtpHost] = useState(currentConfig.smtpHost || 'smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<number>(currentConfig.smtpPort || 465);
  const [senderName, setSenderName] = useState(currentConfig.senderName || 'AEW Academic Operations');
  const [resendApiKey, setResendApiKey] = useState(currentConfig.resendApiKey || '');
  const [showAdvancedSmtp, setShowAdvancedSmtp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Connection Verification State
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Audit Logs State
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>(StorageService.getEmailLogs());
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Test Dispatch State
  const [testEmail, setTestEmail] = useState(adminEmail);
  const [testType, setTestType] = useState<'test_dispatch' | 'topic_assigned' | 'admin_directive' | 'extension_granted' | 'subtopics_reviewed' | 'ppt_ready'>('test_dispatch');
  const [sending, setSending] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const refreshLogs = () => {
    setEmailLogs(StorageService.getEmailLogs());
  };

  useEffect(() => {
    refreshLogs();
  }, [activeTab]);

  const handleSaveConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPass = smtpPass.trim().replace(/\s+/g, '');
    const newConfig: EmailConfig = {
      provider,
      smtpUser: smtpUser.trim(),
      smtpPass: cleanPass,
      smtpHost: smtpHost.trim() || 'smtp.gmail.com',
      smtpPort: Number(smtpPort) || 465,
      senderName: senderName.trim() || 'AEW Academic Operations',
      resendApiKey: resendApiKey.trim(),
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveEmailConfig(newConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
    return newConfig;
  };

  const handleVerifyConnection = async () => {
    if (provider === 'smtp' && (!smtpUser.trim() || !smtpPass.trim())) {
      setVerificationResult({
        success: false,
        message: 'Please enter both your Gmail address and 16-character Google App Password first.',
      });
      return;
    }
    if (provider === 'resend' && !resendApiKey.trim()) {
      setVerificationResult({
        success: false,
        message: 'Please enter your Resend API Key first.',
      });
      return;
    }

    // Save first so dispatch picks up latest values
    handleSaveConfig();

    setVerifying(true);
    setVerificationResult(null);

    const targetRecipient = smtpUser.trim() || adminEmail || 'admin@aew.com';
    try {
      const result = await notificationService.sendTestEmail(targetRecipient);
      refreshLogs();

      if (result.success && result.status === 'delivered') {
        setVerificationResult({
          success: true,
          message: `✓ Connection Verified! A test email was delivered to ${targetRecipient}. Credentials are active and synced to cloud.`,
        });
      } else if (result.status === 'simulated') {
        setVerificationResult({
          success: false,
          message: 'Delivery was simulated because credentials are incomplete. Please ensure you entered your 16-character Google App Password.',
        });
      } else {
        setVerificationResult({
          success: false,
          message: result.error || 'Connection verification failed. Please verify your credentials.',
        });
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: err.message || 'Verification failed. Please check network connection.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRetryEmail = async (log: EmailLogItem) => {
    setRetryingLogId(log.id);
    try {
      await notificationService.retryEmail(log.id);
      refreshLogs();
    } catch (err: any) {
      console.warn('Retry error:', err);
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear the sent mail audit history?')) {
      StorageService.clearEmailLogs();
      setEmailLogs([]);
    }
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
      if (testType === 'test_dispatch') {
        await notificationService.sendTestEmail(testEmail.trim());
      } else if (testType === 'topic_assigned') {
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

      refreshLogs();
      setResultMsg({
        type: 'success',
        text: `Email dispatched to ${testEmail.trim()}! Check Sent Mails tab for real-time delivery status.`,
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

  const deliveredCount = emailLogs.filter((l) => l.status === 'delivered').length;
  const failedCount = emailLogs.filter((l) => l.status === 'failed').length;
  const simulatedCount = emailLogs.filter((l) => l.status === 'simulated').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Mailing System &amp; Cloud Persistence
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

        {/* Cloud Persistence Banner */}
        <div className="bg-indigo-950/40 border-b border-indigo-500/20 px-6 py-2 flex items-center justify-between text-[11px] text-indigo-300">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span><strong>Cloud Database:</strong> All credentials &amp; sent mail logs are synced to Supabase (survives code updates)</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
            ACTIVE SYNC
          </span>
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
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Sent Mails &amp; Cloud Logs</span>
            {emailLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                {emailLogs.length}
              </span>
            )}
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

        {/* Tab Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300">
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">Email Delivery Pipeline</label>
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
                      <span>Gmail / Google Workspace (Recommended)</span>
                      {provider === 'smtp' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-1 font-semibold">
                      ✓ Free • Zero domain verification needed
                    </div>
                    <div className="text-[10px] text-slate-500">Sends directly to any email address</div>
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
                      Requires API Key &amp; Verified Domain
                    </div>
                    <div className="text-[10px] text-slate-500">Transactional REST API</div>
                  </button>
                </div>
              </div>

              {provider === 'smtp' ? (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-300 font-semibold text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Gmail App Password Setup</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSmtp(!showAdvancedSmtp)}
                      className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      {showAdvancedSmtp ? 'Hide Custom Host/Port ▲' : 'Custom Host / Port ▼'}
                    </button>
                  </div>

                  {/* Google Guide Box */}
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] space-y-1.5">
                    <div className="font-bold text-indigo-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>How to get your 16-Character Google App Password:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                      <li>Enable <strong>2-Step Verification</strong> on your Google Account.</li>
                      <li>Visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">Google App Passwords <ExternalLink className="w-2.5 h-2.5" /></a>.</li>
                      <li>Select App name e.g. <em>Teacher Portal</em> and copy the generated 16-character code.</li>
                      <li>Paste the 16 characters below (spaces are stripped automatically).</li>
                    </ol>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your Gmail Address</label>
                      <input
                        type="email"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="e.g. operations@gmail.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        16-Character Google App Password
                      </label>
                      <input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="e.g. abcd efgh ijkl mnop"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
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

                    {showAdvancedSmtp && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">SMTP Host</label>
                          <input
                            type="text"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            placeholder="smtp.gmail.com"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">SMTP Port (465 SSL / 587 TLS)</label>
                          <input
                            type="number"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(parseInt(e.target.value, 10))}
                            placeholder="465"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
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
              )}

              {/* Status alerts */}
              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Email credentials saved and synchronized to cloud database!</span>
                </div>
              )}

              {verificationResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    verificationResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {verificationResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{verificationResult.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleVerifyConnection}
                  disabled={verifying}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {verifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying SMTP...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Test &amp; Verify Connection</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save to Cloud</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SENT MAILS & CLOUD AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Audit History:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                    ✓ {deliveredCount} Delivered
                  </span>
                  {failedCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[11px] font-bold">
                      ✕ {failedCount} Failed
                    </span>
                  )}
                  {simulatedCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
                      ℹ️ {simulatedCount} Simulated
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={refreshLogs}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
                    title="Refresh logs from cloud"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  {emailLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearLogs}
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 cursor-pointer"
                      title="Clear logs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Logs List */}
              {emailLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-2">
                  <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-xs font-semibold text-slate-300">No Emails Dispatched Yet</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    When notifications are sent for topic assignments, directives, extensions, or test emails, their delivery status will appear here and sync to the cloud.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {emailLogs.map((log) => {
                    const isDelivered = log.status === 'delivered';
                    const isFailed = log.status === 'failed';
                    const recipientsStr = Array.isArray(log.to) ? log.to.join(', ') : log.to;

                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl border space-y-2 transition-colors ${
                          isDelivered
                            ? 'bg-slate-950/80 border-slate-800/90'
                            : isFailed
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : 'bg-amber-950/10 border-amber-500/20'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                isDelivered
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isFailed
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isDelivered ? '✓ DELIVERED' : isFailed ? '✕ FAILED' : 'ℹ️ SIMULATED'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              {log.type.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </span>

                            {isFailed && (
                              <button
                                type="button"
                                onClick={() => handleRetryEmail(log)}
                                disabled={retryingLogId === log.id}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <RefreshCw className={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
                                <span>Retry</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-slate-100">
                          {log.subject}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          <div>
                            To: <strong className="text-slate-300 font-mono">{recipientsStr}</strong>
                          </div>
                          {log.dataSummary && (
                            <div>• {log.dataSummary}</div>
                          )}
                        </div>

                        {log.errorMessage && (
                          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/20 text-[11px] text-rose-300 leading-relaxed font-mono">
                            ⚠️ {log.errorMessage}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEST DISPATCH STATION */}
          {activeTab === 'test' && (
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
                      <div className="font-bold text-slate-200 text-xs">Directives &amp; Feedback</div>
                      <div className="text-[10px] text-slate-400">Admin remarks on lectures &amp; teacher acks</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                    <span className="text-base">⏱️</span>
                    <div>
                      <div className="font-bold text-slate-200 text-xs">Extension Grants</div>
                      <div className="text-[10px] text-slate-400">Window timeframe &amp; extra allowed minutes</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                    <span className="text-base">📊</span>
                    <div>
                      <div className="font-bold text-slate-200 text-xs">PYQ Slide Decks</div>
                      <div className="text-[10px] text-slate-400">Requests &amp; delivery completion alerts</div>
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
                      <option value="test_dispatch">✅ Connection Test &amp; Verification</option>
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
