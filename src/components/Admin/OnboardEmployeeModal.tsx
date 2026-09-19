import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Key,
  GraduationCap,
  Award,
  Code2,
  PhoneCall,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Building,
  CheckCircle2,
  User as UserIcon,
  Layers,
  Copy,
  Check,
  Shield,
  Mail,
  Send,
  Loader2,
  Crown,
} from 'lucide-react';
import type { User, UserRole, PrTier, AdminRoleTier, AdminPermissionKey } from '../../types';
import { StorageService } from '../../services/storage';
import { AVAILABLE_SME_SUBJECTS } from '../../services/offerLetterService';
import { notificationService } from '../../services/notificationService';

export interface AdminPermissionOption {
  key: AdminPermissionKey;
  label: string;
  desc: string;
  category: string;
}

export const ALL_ADMIN_PERMISSIONS: AdminPermissionOption[] = [
  { key: 'manage_faculty', label: 'Faculty & Staff Roster', desc: 'Quota limits, daily targets, credentials & roster', category: 'Staff' },
  { key: 'manage_syllabus', label: 'Syllabus & Deadlines', desc: 'Approve topic lists, subtopics, formula sheets & revisions', category: 'Academic' },
  { key: 'manage_lectures', label: 'Lecture Quality Audits', desc: 'Audit uploaded lectures, leave feedback remarks & inspect quality', category: 'Academic' },
  { key: 'manage_pr', label: 'PR & Ambassador Desk', desc: 'College sponsorships, MoU generation & ambassador leaderboards', category: 'Growth' },
  { key: 'manage_webdev', label: 'Web Dev War Room', desc: 'Developer squads, bounty allocation & GitHub pull approvals', category: 'Tech' },
  { key: 'manage_sales', label: 'Sales CRM & Leads Desk', desc: 'Admissions counseling, student leads & phone call tracking', category: 'Growth' },
  { key: 'manage_offer_letters', label: 'Offer Letter Studio', desc: 'Draft, preview, export PDF offers & onboard candidate hires', category: 'HR' },
  { key: 'manage_credentials', label: 'Credentials & Passwords', desc: 'Override usernames, reset passwords & maintain security keys', category: 'System' },
  { key: 'manage_leaves', label: 'Leaves & Day-Off Grants', desc: 'Approve day-off requests, excused leaves & deadline extensions', category: 'HR' },
];

export const ADMIN_TIER_PRESETS: { id: AdminRoleTier; name: string; desc: string; permissions: AdminPermissionKey[] }[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    desc: 'Unrestricted master access across all 9 portal modules & systems',
    permissions: [
      'manage_faculty',
      'manage_syllabus',
      'manage_lectures',
      'manage_pr',
      'manage_webdev',
      'manage_sales',
      'manage_offer_letters',
      'manage_credentials',
      'manage_leaves',
    ],
  },
  {
    id: 'academic_admin',
    name: 'Academic Ops Admin',
    desc: 'Faculty supervision, syllabus timelines, topic approvals & lecture audits',
    permissions: ['manage_faculty', 'manage_syllabus', 'manage_lectures', 'manage_leaves'],
  },
  {
    id: 'hr_admin',
    name: 'HR & Talent Admin',
    desc: 'Candidate offer letters, employee onboarding, credentials & leave management',
    permissions: ['manage_faculty', 'manage_offer_letters', 'manage_credentials', 'manage_leaves'],
  },
  {
    id: 'growth_admin',
    name: 'PR & Growth Admin',
    desc: 'College ambassador MoUs, fest sponsorships, course sales CRM & student calls',
    permissions: ['manage_pr', 'manage_sales', 'manage_offer_letters'],
  },
  {
    id: 'tech_admin',
    name: 'Tech Ops Admin',
    desc: 'Engineering sprint tracking, developer squad management & portal credentials',
    permissions: ['manage_webdev', 'manage_faculty', 'manage_credentials'],
  },
];

interface OnboardEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialData?: Partial<User>;
}

export const OnboardEmployeeModal: React.FC<OnboardEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialData?.role || 'teacher');
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [subject, setSubject] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Teacher specific
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(120);
  const [maxDailyMinutes, setMaxDailyMinutes] = useState(240);

  // PR specific
  const [prTier, setPrTier] = useState<PrTier>('Silver');
  const [prPoints, setPrPoints] = useState(0);
  const [prStars, setPrStars] = useState(0);

  // Web dev specific
  const [webDevTitle, setWebDevTitle] = useState('Frontend React Developer');
  const [webDevLevel, setWebDevLevel] = useState(2);
  const [webDevXp, setWebDevXp] = useState(500);
  const [skills, setSkills] = useState('React, TypeScript, TailwindCSS');
  const [githubUsername, setGithubUsername] = useState('');

  // Sales specific
  const [crmRole, setCrmRole] = useState<'sales_rep' | 'sales_manager'>('sales_rep');

  // Admin specific access & permissions
  const [adminTier, setAdminTier] = useState<AdminRoleTier>('super_admin');
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissionKey[]>([
    'manage_faculty',
    'manage_syllabus',
    'manage_lectures',
    'manage_pr',
    'manage_webdev',
    'manage_sales',
    'manage_offer_letters',
    'manage_credentials',
    'manage_leaves',
  ]);

  // Post-onboard credential modal state
  const [createdUserSuccess, setCreatedUserSuccess] = useState<User | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'syncing' | 'synced' | 'error' | null>(null);
  const [emailDispatchResult, setEmailDispatchResult] = useState<{
    success: boolean;
    status: string;
    error?: string;
    messageId?: string;
  } | null>(null);

  // Auto-generate defaults whenever selectedRole changes or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    const roleToUse = initialData?.role || selectedRole;
    if (initialData?.role && initialData.role !== selectedRole) {
      setSelectedRole(initialData.role);
    }

    const nextId = StorageService.getNextEmployeeId(roleToUse);
    setEmployeeId(initialData?.teacherId || nextId);

    if (initialData?.name) setName(initialData.name);
    if (initialData?.email) setEmail(initialData.email);
    if (initialData?.phone) setPhone(initialData.phone);
    if (initialData?.department) setDepartment(initialData.department);
    if (initialData?.subject) setSubject(initialData.subject);
    if (initialData?.joiningDate) setJoiningDate(initialData.joiningDate);
    if (initialData?.username) setUsername(initialData.username);

    // Default passwords per role
    const defaultPasswords: Record<UserRole, string> = {
      teacher: 'teach123',
      pr_intern: 'intern123',
      pr_head: 'head123',
      web_developer: 'dev123',
      web_dev_manager: 'dev123',
      sales: 'sales123',
      admin: 'admin123',
    };
    setPassword(initialData?.password || defaultPasswords[roleToUse]);

    // Role-specific defaults if not prefilled
    if (!initialData?.department) {
      if (roleToUse === 'teacher') setDepartment('Engineering');
      else if (roleToUse === 'pr_head') setDepartment('Public Relations & Strategic Partnerships');
      else if (roleToUse === 'pr_intern') setDepartment('Public Relations & Sponsorship');
      else if (roleToUse === 'web_developer' || roleToUse === 'web_dev_manager') setDepartment('Engineering & Product');
      else if (roleToUse === 'sales') setDepartment('Admissions & Student Growth');
      else if (roleToUse === 'admin') setDepartment('Academic Operations');
    }

    if (!initialData?.subject) {
      if (roleToUse === 'teacher') setSubject('Engineering Mathematics');
      else if (roleToUse === 'pr_head') setSubject('Corporate Brand Partnerships & Sponsorships');
      else if (roleToUse === 'pr_intern') setSubject('Corporate Sponsor Outreach');
      else if (roleToUse === 'web_developer') setSubject('Web Development');
      else if (roleToUse === 'web_dev_manager') setSubject('Software Architecture');
      else if (roleToUse === 'sales') setSubject('Course Admissions');
      else if (roleToUse === 'admin') setSubject('Management');
    }

    if (roleToUse === 'pr_head') {
      setPrTier('Premium');
      setPrPoints(250);
      setPrStars(10);
    }

    if (roleToUse === 'web_developer') {
      setWebDevTitle(initialData?.webDevTitle || 'Web Developer');
      setWebDevLevel(initialData?.webDevLevel ?? 1);
      setWebDevXp(initialData?.webDevXp ?? 0);
      setSkills(initialData?.skills ? (Array.isArray(initialData.skills) ? initialData.skills.join(', ') : initialData.skills) : '');
    } else if (roleToUse === 'web_dev_manager') {
      setWebDevTitle(initialData?.webDevTitle || 'Dev Architect');
      setWebDevLevel(initialData?.webDevLevel ?? 1);
      setWebDevXp(initialData?.webDevXp ?? 0);
      setSkills(initialData?.skills ? (Array.isArray(initialData.skills) ? initialData.skills.join(', ') : initialData.skills) : '');
    }

    if (roleToUse === 'admin') {
      if (initialData?.adminTier) setAdminTier(initialData.adminTier);
      if (initialData?.adminPermissions) setAdminPermissions(initialData.adminPermissions);
    }
  }, [selectedRole, isOpen, initialData]);

  // Auto-suggest username from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!username || username === name.toLowerCase().replace(/[^a-z0-9]/g, '_')) {
      const suggested = val.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      setUsername(suggested);
      if (!email || email.includes('@aew.com')) {
        setEmail(`${suggested}@aew.com`);
      }
    }
  };

  const handleRegenerateId = () => {
    setEmployeeId(StorageService.getNextEmployeeId(selectedRole));
  };

  const handleSelectAdminTier = (tierId: AdminRoleTier) => {
    setAdminTier(tierId);
    const preset = ADMIN_TIER_PRESETS.find((p) => p.id === tierId);
    if (preset) {
      setAdminPermissions([...preset.permissions]);
    }
  };

  const togglePermission = (key: AdminPermissionKey) => {
    setAdminPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllPermissions = () => {
    setAdminPermissions(ALL_ADMIN_PERMISSIONS.map((p) => p.key));
  };

  const handleClearPermissions = () => {
    setAdminPermissions([]);
  };

  const sendWelcomeEmail = async (user: User, plainPassword?: string) => {
    const targetEmail = (user.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailDispatchResult({
        success: false,
        status: 'failed',
        error: 'No valid email address provided for this employee profile.',
      });
      return;
    }

    setEmailSending(true);
    try {
      const res = await notificationService.notifyEmployeeWelcome({
        employeeEmail: targetEmail,
        employeeName: user.name,
        employeeId: user.teacherId,
        role: user.role,
        department: user.department,
        subject: user.subject,
        username: user.username || user.teacherId.toLowerCase(),
        password: plainPassword || user.password,
        joiningDate: user.joiningDate,
        adminTier: user.adminTier,
        adminPermissions: user.adminPermissions,
        webDevTitle: user.webDevTitle,
        crmRole: user.crmRole,
        prTier: user.prTier,
      });
      setEmailDispatchResult(res);
    } catch (err: any) {
      setEmailDispatchResult({
        success: false,
        status: 'failed',
        error: err?.message || 'Error communicating with notification server',
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !employeeId.trim()) return;

    const cleanSkills = skills.split(',').map((s) => s.trim()).filter(Boolean);

    const createdUser = StorageService.onboardEmployee({
      teacherId: employeeId.trim().toUpperCase(),
      name: name.trim(),
      username: (username.trim().toLowerCase() || employeeId.trim().toLowerCase()).replace(/\s+/g, '_'),
      password: password.trim(),
      email: email.trim() || `${username.trim().toLowerCase()}@aew.com`,
      phone: phone.trim() || undefined,
      role: selectedRole,
      department: department.trim(),
      subject: subject.trim(),
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      dailyTargetMinutes: selectedRole === 'teacher' ? dailyTargetMinutes : 0,
      maxDailyMinutes: selectedRole === 'teacher' ? maxDailyMinutes : 0,
      prTier: (selectedRole === 'pr_intern' || selectedRole === 'pr_head') ? prTier : undefined,
      prPoints: (selectedRole === 'pr_intern' || selectedRole === 'pr_head') ? prPoints : undefined,
      prStars: (selectedRole === 'pr_intern' || selectedRole === 'pr_head') ? prStars : undefined,
      webDevTitle: selectedRole === 'web_developer' || selectedRole === 'web_dev_manager' ? webDevTitle : undefined,
      webDevLevel: selectedRole === 'web_developer' || selectedRole === 'web_dev_manager' ? webDevLevel : undefined,
      webDevXp: selectedRole === 'web_developer' || selectedRole === 'web_dev_manager' ? webDevXp : undefined,
      skills: selectedRole === 'web_developer' || selectedRole === 'web_dev_manager' ? cleanSkills : undefined,
      githubUsername: selectedRole === 'web_developer' || selectedRole === 'web_dev_manager' ? githubUsername : undefined,
      crmRole: selectedRole === 'sales' ? crmRole : undefined,
      hasCrmAccess: selectedRole === 'sales' || selectedRole === 'admin',
      adminTier: selectedRole === 'admin' ? adminTier : undefined,
      adminPermissions: selectedRole === 'admin' ? adminPermissions : undefined,
    });

    onSuccess(createdUser);
    setCreatedUserSuccess(createdUser);

    // Automatically dispatch welcome email with credentials
    sendWelcomeEmail(createdUser, password.trim());

    // Explicit cloud sync
    setCloudSyncStatus('syncing');
    StorageService.syncToCloud()
      .then((ok) => {
        setCloudSyncStatus(ok ? 'synced' : 'error');
      })
      .catch(() => {
        setCloudSyncStatus('error');
      });
  };

  const handleCopyCredentials = () => {
    if (!createdUserSuccess) return;
    const text = `AEW Portal Login Credentials:
Name: ${createdUserSuccess.name}
Role: ${createdUserSuccess.role.toUpperCase()} (${createdUserSuccess.department})
Employee ID: ${createdUserSuccess.teacherId}
Username: ${createdUserSuccess.username}
Password: ${createdUserSuccess.password}
Portal URL: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  const handleCloseAll = () => {
    setCreatedUserSuccess(null);
    setEmailDispatchResult(null);
    setEmailSending(false);
    setCloudSyncStatus(null);
    onClose();
  };

  if (!isOpen) return null;

  const rolesList: { role: UserRole; label: string; icon: React.ComponentType<{ className?: string }>; color: string; desc: string }[] = [
    {
      role: 'teacher',
      label: 'Faculty / SME',
      icon: GraduationCap,
      color: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
      desc: 'Lecture recordings, syllabus topics & formula decks',
    },
    {
      role: 'pr_head',
      label: 'PR Head',
      icon: Crown,
      color: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
      desc: 'Corporate sponsors, brand alliances & PR squad management',
    },
    {
      role: 'pr_intern',
      label: 'PR Representative',
      icon: Award,
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
      desc: 'Corporate sponsor lead generation & brand pitch decks',
    },
    {
      role: 'web_developer',
      label: 'Web Developer',
      icon: Code2,
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      desc: 'React, TypeScript, frontend/backend engineering tasks',
    },
    {
      role: 'web_dev_manager',
      label: 'Dev Lead / Architect',
      icon: Layers,
      color: 'border-sky-500/40 text-sky-400 bg-sky-500/10',
      desc: 'Code review, PR approvals, squad bounties',
    },
    {
      role: 'sales',
      label: 'Sales Representative',
      icon: PhoneCall,
      color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
      desc: 'Course admissions, student counseling & CRM calls',
    },
    {
      role: 'admin',
      label: 'Operations Admin',
      icon: ShieldCheck,
      color: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
      desc: 'Platform supervision, faculty quotas & system governance',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* SUCCESS MODAL OVERLAY IF USER ONBOARDED */}
        {createdUserSuccess ? (
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-100">Employee Successfully Onboarded!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                <span className="text-indigo-400 font-bold">{createdUserSuccess.name}</span> has been provisioned as{' '}
                <span className="text-slate-200 font-bold uppercase">{createdUserSuccess.role}</span> in{' '}
                <span className="text-slate-200 font-bold">{createdUserSuccess.department}</span>.
              </p>
            </div>

            {/* Credential summary card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-3 font-mono text-xs max-w-md mx-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400 font-sans font-bold uppercase tracking-wider">
                <span>Official Login Credentials</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                  {createdUserSuccess.teacherId}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Username:</span>
                <span className="col-span-2 text-indigo-300 font-bold select-all">{createdUserSuccess.username}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Password:</span>
                <span className="col-span-2 text-emerald-300 font-bold select-all">{createdUserSuccess.password}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Department:</span>
                <span className="col-span-2 text-slate-300 truncate">{createdUserSuccess.department}</span>
              </div>
              {createdUserSuccess.role === 'admin' && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-slate-500">Admin Scope:</span>
                  <span className="col-span-2 text-rose-300 font-sans font-bold text-[11px]">
                    {createdUserSuccess.adminTier?.replace('_', ' ').toUpperCase()} ({createdUserSuccess.adminPermissions?.length || 0} Modules)
                  </span>
                </div>
              )}
            </div>

            {/* Welcome Email Dispatch Status Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> Welcome Email Dispatch
                </span>
                {createdUserSuccess.email && (
                  <span className="text-indigo-300/80 font-mono text-[10px] truncate max-w-[180px]">
                    {createdUserSuccess.email}
                  </span>
                )}
              </div>

              {emailSending ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                  <span>Dispatching official welcome email with login credentials...</span>
                </div>
              ) : emailDispatchResult?.success ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {emailDispatchResult.status === 'simulated'
                        ? 'Welcome email logged in audit pipeline (Simulated mode)'
                        : 'Welcome email with login credentials delivered!'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => sendWelcomeEmail(createdUserSuccess, createdUserSuccess.password)}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-200 underline ml-2 shrink-0 cursor-pointer"
                  >
                    Resend
                  </button>
                </div>
              ) : emailDispatchResult && !emailDispatchResult.success ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      ⚠️ Dispatch Notice:
                    </span>
                    <button
                      type="button"
                      onClick={() => sendWelcomeEmail(createdUserSuccess, createdUserSuccess.password)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Retry Email
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    {emailDispatchResult.error || 'Check SMTP configuration or recipient address.'}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                  <span>Ready to dispatch welcome email</span>
                  <button
                    type="button"
                    onClick={() => sendWelcomeEmail(createdUserSuccess, createdUserSuccess.password)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Send className="w-3 h-3" /> Send Welcome Mail
                  </button>
                </div>
              )}
            </div>

            {/* Cloud Database Persistence Status */}
            <div className="max-w-md mx-auto">
              {cloudSyncStatus === 'syncing' ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                  <span>Syncing employee profile to Supabase Cloud Database...</span>
                </div>
              ) : cloudSyncStatus === 'synced' ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Profile stored & synchronized with Supabase Cloud DB ✓</span>
                </div>
              ) : cloudSyncStatus === 'error' ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <span>⚠️ Cloud sync pending (persisted in local state)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCloudSyncStatus('syncing');
                      StorageService.syncToCloud().then((ok) => setCloudSyncStatus(ok ? 'synced' : 'error'));
                    }}
                    className="underline text-[10px] font-bold text-amber-300 hover:text-amber-100 cursor-pointer"
                  >
                    Retry Sync
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-400" /> Copy Credentials
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCloseAll}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Done & View Roster
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold tracking-wider">
                  <Sparkles className="w-3 h-3" /> OFFICIAL ONBOARDING SUITE
                </div>
                <h3 className="text-xl font-black text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-400" /> Onboard New Employee
                </h3>
                <p className="text-xs text-slate-400">
                  Provision employee accounts, assign department roles, set access scopes, and issue credentials.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              
              {/* 1. SELECT EMPLOYEE ROLE */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Choose Employee Designation / Role</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {rolesList.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedRole === item.role;
                    return (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setSelectedRole(item.role)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-slate-100 ring-2 ring-indigo-500/50 shadow-lg'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`p-1.5 rounded-lg border text-xs ${item.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-100">{item.label}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. EMPLOYEE IDENTIFICATION */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4 text-emerald-400" /> 2. Profile & Identification
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">System ID</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-400">Employee ID *</label>
                      <button
                        type="button"
                        onClick={handleRegenerateId}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Auto-Gen
                      </button>
                    </div>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-indigo-300 font-mono font-bold uppercase focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Harish Mehta, Rohan Verma"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. employee@aew.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Contact Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. LOGIN CREDENTIALS CONFIGURATION */}
              <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-indigo-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" /> 3. Portal Credentials Configuration
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">Secure Access</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Login Username *</label>
                    <input
                      type="text"
                      placeholder="e.g. harish_mehta"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Login Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. ROLE-SPECIFIC PARAMETERS */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-purple-400" /> 4. Role Specific Parameters
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono uppercase">{selectedRole}</span>
                </div>

                {/* General Department & Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      {selectedRole === 'teacher' ? 'Primary Subject / Specialization' : 'Focus Area / Subject'}
                    </label>
                    {selectedRole === 'teacher' ? (
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {AVAILABLE_SME_SUBJECTS.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                        <option value="General Engineering">General Engineering</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>
                </div>

                {/* TEACHER SPECIFIC */}
                {selectedRole === 'teacher' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Daily Target (Min)</label>
                      <input
                        type="number"
                        min={15}
                        max={480}
                        step={15}
                        value={dailyTargetMinutes}
                        onChange={(e) => setDailyTargetMinutes(parseInt(e.target.value) || 120)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Max Daily Limit (Min)</label>
                      <input
                        type="number"
                        min={60}
                        max={600}
                        step={30}
                        value={maxDailyMinutes}
                        onChange={(e) => setMaxDailyMinutes(parseInt(e.target.value) || 240)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Official Joining Date</label>
                      <input
                        type="date"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* PR INTERN & PR HEAD SPECIFIC */}
                {(selectedRole === 'pr_intern' || selectedRole === 'pr_head') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Initial PR Tier</label>
                      <select
                        value={prTier}
                        onChange={(e) => setPrTier(e.target.value as PrTier)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none cursor-pointer"
                      >
                        <option value="Silver">Silver Tier</option>
                        <option value="Gold">Gold Tier</option>
                        <option value="Premium">Premium Tier</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Starting PR Points</label>
                      <input
                        type="number"
                        min={0}
                        value={prPoints}
                        onChange={(e) => setPrPoints(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">PR Stars</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={prStars}
                        onChange={(e) => setPrStars(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* WEB DEVELOPER / MANAGER SPECIFIC */}
                {(selectedRole === 'web_developer' || selectedRole === 'web_dev_manager') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Engineering Job Title</label>
                      <input
                        type="text"
                        value={webDevTitle}
                        onChange={(e) => setWebDevTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">GitHub Handle</label>
                      <input
                        type="text"
                        placeholder="e.g. rohan-dev"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Skills (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. React, TypeScript, TailwindCSS, Express"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* SALES SPECIFIC */}
                {selectedRole === 'sales' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">CRM Role Level</label>
                      <select
                        value={crmRole}
                        onChange={(e) => setCrmRole(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none cursor-pointer"
                      >
                        <option value="sales_rep">Sales Representative / Counselor</option>
                        <option value="sales_manager">Sales Desk Manager</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Joining Date</label>
                      <input
                        type="date"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* ADMIN ROLE & ACCESS PERMISSIONS CONFIGURATION */}
                {selectedRole === 'admin' && (
                  <div className="space-y-4 pt-3 border-t border-slate-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-rose-400" /> Admin Role Tier & Access Scope
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Define which portal modules, audits, and management features this administrator can access.
                        </p>
                      </div>
                      <span className="self-start sm:self-auto text-[10px] font-mono px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                        {adminPermissions.length} of {ALL_ADMIN_PERMISSIONS.length} Permissions Active
                      </span>
                    </div>

                    {/* Tier Presets */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Quick Preset Tiers
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ADMIN_TIER_PRESETS.map((preset) => {
                          const isTierSelected = adminTier === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleSelectAdminTier(preset.id)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isTierSelected
                                  ? 'bg-rose-500/20 border-rose-500 text-slate-100 ring-1 ring-rose-500/50 shadow-md'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold text-xs text-slate-200">
                                <span>{preset.name}</span>
                                {isTierSelected && <Check className="w-3.5 h-3.5 text-rose-400" />}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 leading-tight line-clamp-2">
                                {preset.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fine-grained Permission Checkboxes */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span className="text-slate-300 font-bold">Access Permissions Checklist</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllPermissions}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={handleClearPermissions}
                            className="text-[10px] text-slate-400 hover:text-slate-300 underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ALL_ADMIN_PERMISSIONS.map((perm) => {
                          const isChecked = adminPermissions.includes(perm.key);
                          return (
                            <div
                              key={perm.key}
                              onClick={() => togglePermission(perm.key)}
                              className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-slate-900/90 border-indigo-500/50 text-slate-100 shadow-sm'
                                  : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:bg-slate-900/60 hover:text-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent onClick
                                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer pointer-events-none"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                                  <span>{perm.label}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                    {perm.category}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                  {perm.desc}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  <UserPlus className="w-4 h-4" /> Onboard Employee & Save Credentials
                </button>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  );
};
