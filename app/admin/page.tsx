'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileCode, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Search, 
  Filter, 
  Eye, 
  X, 
  Check, 
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  Settings,
  CreditCard,
  Target,
  LayoutDashboard,
  ExternalLink,
  Save,
  UserCheck,
  UserX
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalQuestions: number;
  pendingEnrollments: number;
  approvedEnrollments: number;
  pendingSubscriptions: number;
  approvedSubscriptions: number;
}

interface QBankItem {
  id: number;
  category: string;
  organSystem?: string;
  difficulty: string;
  examType: string;
  clientNeed: string;
  statement: string;
  options: string[];
  questionType: 'single' | 'multiple';
  correctIndex: number;
  correctIndices: number[];
  correctRationale: string;
  clinicalPearl: string;
  distractors: string[];
  isDemo: boolean;
  sortOrder: number;
}

interface RegistrationItem {
  id: number;
  userId: number;
  courseId: number;
  studentName: string;
  email: string;
  phone: string;
  courseTitle: string;
  examType: string;
  price: number;
  status: string;
  enrolledAt: string;
  paymentScreenshot: string;
  transactionId: string;
  notes: string;
}

interface SubscriptionItem {
  id: number;
  userId: number;
  studentName: string;
  email: string;
  phone: string;
  planName: string;
  durationDays: number;
  price: number;
  status: string;
  enrolledAt: string;
  expiresAt: string;
  paymentScreenshot: string;
  notes: string;
}

interface CourseItem {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number;
  durationHours: number;
  questionsCount: number;
  level: string;
  badgeText: string;
  emoji: string;
  imageUrl: string;
}

interface UserItem {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  examType: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  phone: string;
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const normalizeTab = (raw: string | null): string => {
    if (!raw) return 'overview';
    const clean = raw.toLowerCase().replace('view', '').trim();
    if (clean.includes('reg') || clean.includes('enroll')) return 'registrations';
    if (clean.includes('sub')) return 'subscriptions';
    if (clean.includes('question') || (clean.includes('mcq') && !clean.includes('demo'))) return 'questions';
    if (clean.includes('import') || clean.includes('bulk')) return 'bulk-import';
    if (clean.includes('course') || clean.includes('curric')) return 'courses';
    if (clean.includes('demo')) return 'demo-mcqs';
    if (clean.includes('user') || clean.includes('student')) return 'users';
    if (clean.includes('setting')) return 'settings';
    if (clean.includes('over') || clean.includes('dash')) return 'overview';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<string>('overview');

  // Synchronous, foolproof tab switching
  const switchTab = (tabId: string) => {
    const clean = normalizeTab(tabId);
    setActiveTab(clean);
    if (typeof window !== 'undefined') {
      const newUrl = `/admin?tab=${clean}`;
      window.history.pushState({ tab: clean }, '', newUrl);
    }
  };

  // Sync tab on mount from window.location or searchParams
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') || window.location.hash.replace('#', '');
      if (tabParam) {
        setActiveTab(normalizeTab(tabParam));
      }
    }
  }, []);

  // Sync tab if searchParams changes externally
  useEffect(() => {
    const rawTab = searchParams.get('tab');
    if (rawTab) {
      setActiveTab(normalizeTab(rawTab));
    }
  }, [searchParams]);

  // Handle browser back and forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        setActiveTab(normalizeTab(params.get('tab')));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Questions tab state
  const [questions, setQuestions] = useState<QBankItem[]>([]);
  const [qSearch, setQSearch] = useState('');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<QBankItem>>({
    category: 'Pharmacology & Parenteral Therapies',
    difficulty: 'High Yield',
    examType: 'NCLEX-RN',
    statement: '',
    options: ['', '', '', ''],
    questionType: 'single',
    correctIndices: [0],
    correctIndex: 0,
    correctRationale: '',
    clinicalPearl: '',
  });

  // Bulk import state
  const [jsonCode, setJsonCode] = useState('');
  const [importDefaultCat, setImportDefaultCat] = useState('Pharmacology & Parenteral Therapies');
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  // Registrations state
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [regFilter, setRegFilter] = useState('all');

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [subFilter, setSubFilter] = useState('all');

  // Courses state
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [editingCourse, setEditingCourse] = useState<Partial<CourseItem> | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  // Demo MCQs state
  const [demoMcqs, setDemoMcqs] = useState<any[]>([]);

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Settings state
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Preview screenshot modal
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.status === 403 || res.status === 401) {
          router.push('/login');
          return;
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [router]);

  // Tab change fetcher
  useEffect(() => {
    if (activeTab === 'questions') fetchQuestions();
    else if (activeTab === 'registrations') fetchRegistrations();
    else if (activeTab === 'subscriptions') fetchSubscriptions();
    else if (activeTab === 'courses') fetchCourses();
    else if (activeTab === 'demo-mcqs') fetchDemoMcqs();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'settings') fetchSettings();
  }, [activeTab, regFilter, subFilter]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/admin/qbank/questions');
      const data = await res.json();
      if (data.success) setQuestions(data.questions);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const res = await fetch(`/api/admin/registrations?status=${regFilter}`);
      const data = await res.json();
      if (data.success) setRegistrations(data.registrations);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`/api/admin/subscriptions?status=${subFilter}`);
      const data = await res.json();
      if (data.success) setSubscriptions(data.subscriptions);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses');
      const data = await res.json();
      if (data.success) setCourses(data.courses);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDemoMcqs = async () => {
    try {
      const res = await fetch('/api/admin/demo-mcqs');
      const data = await res.json();
      if (data.success) setDemoMcqs(data.mcqs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch (err) {
      console.error(err);
    }
  };

  // Actions for registrations
  const handleUpdateRegistration = async (id: number, status: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to mark this registration as ${status.toUpperCase()}?`)) return;
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRegistrations();
        const sRes = await fetch('/api/admin/stats');
        const sData = await sRes.json();
        if (sData.success) setStats(sData.stats);
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Actions for subscriptions
  const handleUpdateSubscription = async (id: number, status: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to mark this subscription as ${status.toUpperCase()}?`)) return;
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSubscriptions();
        const sRes = await fetch('/api/admin/stats');
        const sData = await sRes.json();
        if (sData.success) setStats(sData.stats);
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Bulk import handler
  const handleExecuteBulkImport = async () => {
    if (!jsonCode.trim()) {
      alert('Please paste valid JSON questions code.');
      return;
    }
    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/admin/qbank/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonCode,
          defaultCategory: importDefaultCat,
          defaultExamType: 'NCLEX-RN',
        }),
      });

      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        fetchQuestions();
      }
    } catch (err: any) {
      setImportResult({ success: false, message: err.message });
    } finally {
      setImporting(false);
    }
  };

  const handleInsertSampleJson = () => {
    const sample = [
      {
        category: "Pharmacology & Parenteral Therapies",
        question_type: "multiple",
        statement: "A client with acute decompensated heart failure is prescribed continuous IV furosemide and oral spironolactone. Which clinical findings indicate to the nurse that medication therapy is effective and safe? (Select All That Apply)",
        options: [
          "Weight loss of 1.8 kg (4 lbs) in 24 hours",
          "Serum potassium of 4.2 mEq/L (4.2 mmol/L)",
          "Bilateral 3+ pitting pedal edema",
          "Reduction in bibasilar pulmonary crackles",
          "Blood pressure decrease from 168/96 to 124/78 mm Hg"
        ],
        correct_indices: [0, 1, 3, 4],
        correct_rationale: "Effective diuresis in heart failure is evidenced by weight reduction (1 kg ≈ 1 L of fluid), decreased pulmonary congestion (crackles resolving), and normalized blood pressure. Maintaining potassium within normal limits (3.5-5.0 mEq/L) confirms safety with combination loop and potassium-sparing diuretics.",
        clinical_pearl: "Daily morning weights at the same time and scale is the single most sensitive indicator of volume status in heart failure.",
        distractors: [
          "3+ pitting pedal edema indicates persistent fluid overload rather than successful resolution."
        ],
        difficulty: "High Yield",
        exam_type: "NCLEX-RN"
      },
      {
        category: "Management of Care & Priority",
        question_type: "single",
        statement: "The nurse has received change-of-shift report for four clients. Which client requires immediate assessment first?",
        options: [
          "A client with COPD with an oxygen saturation of 90% on 2 L nasal cannula",
          "A client 2 days postoperative cholecystectomy reporting 6/10 incisional pain",
          "A client with a tracheostomy who has developed sudden stridor and restlessness",
          "A client with type 2 diabetes with a fasting blood glucose of 165 mg/dL"
        ],
        correct_index: 2,
        correct_rationale: "Stridor and restlessness indicate acute upper airway compromise and severe hypoxemia. Under ABC priority triaging, airway is life-threatening and supersedes all stable post-op pain or expected COPD findings.",
        clinical_pearl: "Stridor is a medical emergency requiring immediate intervention and airway patency verification.",
        distractors: [
          "An SpO2 of 90% is an acceptable target in chronic COPD.",
          "Post-op 6/10 pain is expected and managed after airway emergencies.",
          "Blood glucose of 165 mg/dL requires monitoring but is not immediately life-threatening."
        ],
        difficulty: "High Yield",
        exam_type: "NCLEX-RN"
      }
    ];
    setJsonCode(JSON.stringify(sample, null, 2));
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/admin/qbank/questions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      const method = editingCourse.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/courses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCourse),
      });
      const data = await res.json();
      if (data.success) {
        setIsCourseModalOpen(false);
        fetchCourses();
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCourses((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleUserRole = async (user: UserItem) => {
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    if (!confirm(`Change ${user.name}'s role to ${newRole.toUpperCase()}?`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, role: newRole }),
      });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleUserStatus = async (user: UserItem) => {
    const newStatus = !user.isActive;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: newStatus }),
      });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMsg('Site settings updated successfully!');
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const navItems = [
    { id: 'overview', name: 'Dashboard Overview', icon: LayoutDashboard },
    { 
      id: 'registrations', 
      name: 'Enrollments & Payments', 
      icon: CreditCard,
      badge: stats?.pendingEnrollments ? `${stats.pendingEnrollments} Pending` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { 
      id: 'subscriptions', 
      name: 'Q-Bank Subscriptions', 
      icon: Sparkles,
      badge: stats?.pendingSubscriptions ? `${stats.pendingSubscriptions} Pending` : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    { 
      id: 'questions', 
      name: 'Question Bank (All MCQs)', 
      icon: Target,
      badge: stats?.totalQuestions ? `${stats.totalQuestions}` : undefined,
      badgeColor: 'bg-slate-100 text-slate-700'
    },
    { id: 'bulk-import', name: 'Bulk JSON Importer (MSQ/MCQ)', icon: FileCode },
    { id: 'courses', name: 'Courses & Curriculum', icon: BookOpen },
    { id: 'demo-mcqs', name: 'Homepage Demo MCQs', icon: Layers },
    { id: 'users', name: 'Students & Users', icon: Users },
    { id: 'settings', name: 'Site & Payment Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      
      {/* ── TOP ADMIN HEADER ── */}
      <header className="bg-slate-900 text-white border-b border-slate-800 py-4 px-4 sm:px-6 lg:px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Simple NCLEX Administration</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Full Control
                </span>
              </h1>
              <p className="text-xs text-slate-400 -mt-0.5">
                Faculty Portal • Q-Bank, Subscriptions, Users & Curriculum
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/qbank"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <span>Test Q-Bank</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── MOBILE / TABLET TOP HORIZONTAL NAVIGATION BAR ── */}
      <div className="bg-white border-b border-slate-200 lg:hidden overflow-x-auto custom-scrollbar px-4 py-2.5 sticky top-16 z-40 shadow-xs">
        <div className="flex space-x-2 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => switchTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${isActive ? 'bg-white/20 text-white' : item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── WORKSPACE: SIDEBAR + MAIN VIEW ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ── LEFT SIDEBAR TABS ── */}
          <aside className="lg:col-span-1 clinical-card bg-white rounded-2xl border border-slate-200 p-3 space-y-1 shadow-sm sticky top-20">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
              Admin Navigation ({navItems.length} Tabs)
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* ── RIGHT MAIN CONTENT AREA ── */}
          <main className="lg:col-span-3 space-y-6">
            
            {/* ── TAB 1: OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold uppercase text-slate-400">Total Registered Users</div>
                    <div className="text-3xl font-black text-slate-900 mt-2">{stats ? stats.totalUsers : '...'}</div>
                    <div className="text-xs text-slate-500 mt-1">{stats ? stats.totalStudents : 0} enrolled students</div>
                  </div>

                  <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold uppercase text-slate-400">Questions in Bank</div>
                    <div className="text-3xl font-black text-sky-600 mt-2">{stats ? stats.totalQuestions : '...'}</div>
                    <div className="text-xs text-slate-500 mt-1">Single Choice & SATA items</div>
                  </div>

                  <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold uppercase text-amber-600">Pending Course Registrations</div>
                    <div className="text-3xl font-black text-amber-600 mt-2">{stats ? stats.pendingEnrollments : '0'}</div>
                    <button
                      type="button"
                      onClick={() => switchTab('registrations')}
                      className="text-xs font-bold text-sky-600 hover:underline mt-1 block text-left cursor-pointer"
                    >
                      Review approval queue →
                    </button>
                  </div>

                  <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold uppercase text-indigo-600">Pending Subscriptions</div>
                    <div className="text-3xl font-black text-indigo-600 mt-2">{stats ? stats.pendingSubscriptions : '0'}</div>
                    <button
                      type="button"
                      onClick={() => switchTab('subscriptions')}
                      className="text-xs font-bold text-sky-600 hover:underline mt-1 block text-left cursor-pointer"
                    >
                      Review subscriptions →
                    </button>
                  </div>
                </div>

                {/* Quick Action Cards */}
                <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Quick Operational Shortcuts
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => switchTab('bulk-import')}
                      className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-left transition-all space-y-1 block cursor-pointer w-full"
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                        <FileCode className="w-4 h-4 text-sky-600" />
                        <span>Bulk Paste JSON Questions</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Add dozens of MCQs & SATA MSQs with automatic key detection.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => switchTab('registrations')}
                      className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all space-y-1 block cursor-pointer w-full"
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Course Enrollments</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Verify student payment proofs and activate full Q-Bank access.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => switchTab('subscriptions')}
                      className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all space-y-1 block cursor-pointer w-full"
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Q-Bank Subscriptions</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Review standalone 1, 3, or 6-month question bank access requests.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: COURSE ENROLLMENTS ── */}
            {activeTab === 'registrations' && (
              <div className="space-y-4">
                <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Course Registration Approval Queue</h3>
                    <p className="text-xs text-slate-500">Review student payment receipts and grant full course access</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['all', 'pending', 'approved', 'rejected'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setRegFilter(f)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors ${
                          regFilter === f
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5">ID</th>
                          <th className="p-3.5">Student</th>
                          <th className="p-3.5">Course</th>
                          <th className="p-3.5">Price</th>
                          <th className="p-3.5">WhatsApp</th>
                          <th className="p-3.5">Proof</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Approval Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {registrations.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                              No registrations found under this filter.
                            </td>
                          </tr>
                        ) : (
                          registrations.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 font-mono text-slate-500">#{r.id}</td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{r.studentName}</div>
                                <div className="text-[11px] text-slate-400">{r.email}</div>
                              </td>
                              <td className="p-3.5 font-medium">{r.courseTitle}</td>
                              <td className="p-3.5 font-bold">PKR {r.price?.toLocaleString()}</td>
                              <td className="p-3.5 text-slate-600">{r.phone || 'N/A'}</td>
                              <td className="p-3.5">
                                {r.paymentScreenshot ? (
                                  <button
                                    onClick={() => setPreviewScreenshot(r.paymentScreenshot)}
                                    className="px-2 py-1 text-[11px] font-semibold rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View Proof</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400">None</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {r.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                {r.status === 'pending' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleUpdateRegistration(r.id, 'approved')}
                                      className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleUpdateRegistration(r.id, 'rejected')}
                                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Reviewed</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: Q-BANK SUBSCRIPTIONS ── */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-4">
                <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Standalone Q-Bank Subscriptions</h3>
                    <p className="text-xs text-slate-500">Approve standalone 1, 3, or 6 month Q-Bank subscriptions</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['all', 'pending', 'approved', 'rejected'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setSubFilter(f)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors ${
                          subFilter === f
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5">ID</th>
                          <th className="p-3.5">Student</th>
                          <th className="p-3.5">Plan</th>
                          <th className="p-3.5">Price</th>
                          <th className="p-3.5">WhatsApp</th>
                          <th className="p-3.5">Expiry Date</th>
                          <th className="p-3.5">Proof</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Approval Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {subscriptions.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-400">
                              No subscriptions found under this filter.
                            </td>
                          </tr>
                        ) : (
                          subscriptions.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 font-mono text-slate-500">#{s.id}</td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{s.studentName}</div>
                                <div className="text-[11px] text-slate-400">{s.email}</div>
                              </td>
                              <td className="p-3.5 font-medium">{s.planName}</td>
                              <td className="p-3.5 font-bold">PKR {s.price?.toLocaleString()}</td>
                              <td className="p-3.5 text-slate-600">{s.phone || 'N/A'}</td>
                              <td className="p-3.5 text-slate-400 whitespace-nowrap">
                                {s.expiresAt ? s.expiresAt.split(' ')[0] : `${s.durationDays} days`}
                              </td>
                              <td className="p-3.5">
                                {s.paymentScreenshot ? (
                                  <button
                                    onClick={() => setPreviewScreenshot(s.paymentScreenshot)}
                                    className="px-2 py-1 text-[11px] font-semibold rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View Proof</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400">None</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : s.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {s.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                {s.status === 'pending' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleUpdateSubscription(s.id, 'approved')}
                                      className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleUpdateSubscription(s.id, 'rejected')}
                                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Reviewed</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: QUESTION BANK ── */}
            {activeTab === 'questions' && (
              <div className="space-y-4">
                <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search questions or rationales..."
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => switchTab('bulk-import')}
                    className="px-4 py-2 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCode className="w-4 h-4" />
                    <span>Bulk Paste JSON</span>
                  </button>
                </div>

                <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5">ID</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Statement</th>
                          <th className="p-3.5">Organ System & Category</th>
                          <th className="p-3.5">Correct Answer(s)</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {questions
                          .filter((q) => !qSearch || q.statement.toLowerCase().includes(qSearch.toLowerCase()) || q.category.toLowerCase().includes(qSearch.toLowerCase()) || (q.organSystem && q.organSystem.toLowerCase().includes(qSearch.toLowerCase())))
                          .map((q) => (
                            <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 font-mono text-slate-500 font-bold">#{q.id}</td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  q.questionType === 'multiple'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                                }`}>
                                  {q.questionType === 'multiple' ? 'SATA (MSQ)' : 'MCQ (Single)'}
                                </span>
                              </td>
                              <td className="p-3.5 max-w-md font-medium text-slate-900 truncate" title={q.statement}>
                                {q.statement}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="font-semibold text-slate-800">{q.organSystem || 'Clinical'}</div>
                                <div className="text-[10px] text-slate-400">{q.category}</div>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-emerald-700">
                                  {q.questionType === 'multiple'
                                    ? q.correctIndices.map((i) => String.fromCharCode(65 + i)).join(', ')
                                    : String.fromCharCode(65 + (q.correctIndex || 0))}
                                </span>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete Question"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: BULK JSON IMPORTER ── */}
            {activeTab === 'bulk-import' && (
              <div className="space-y-6">
                <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Bulk JSON Question Importer (with Automatic MSQ / MCQ Type Detection)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Paste any JSON question array. The engine automatically detects whether each item has single or multiple correct options.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleInsertSampleJson}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Load Sample Template
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Default Category (fallback if not in JSON item)
                      </label>
                      <input
                        type="text"
                        value={importDefaultCat}
                        onChange={(e) => setImportDefaultCat(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      JSON Code Array:
                    </label>
                    <textarea
                      rows={14}
                      value={jsonCode}
                      onChange={(e) => setJsonCode(e.target.value)}
                      placeholder={`[\n  {\n    "question_type": "multiple",\n    "statement": "Which clinical findings indicate...",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "correct_indices": [0, 1, 3],\n    "correct_rationale": "Saunders rationale...",\n    "clinical_pearl": "Key takeaway..."\n  }\n]`}
                      className="w-full font-mono text-xs p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 custom-scrollbar leading-relaxed"
                    />
                  </div>

                  {importResult && (
                    <div className={`p-4 rounded-xl border text-xs ${importResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                      <div className="font-bold">{importResult.success ? '✓ Import Succeeded' : '✗ Import Failed'}</div>
                      <p className="mt-1">{importResult.message}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleExecuteBulkImport}
                      disabled={importing || !jsonCode.trim()}
                      className="px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                    >
                      {importing ? 'Validating & Importing...' : 'Import Questions Now'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 6: COURSES & CURRICULUM ── */}
            {activeTab === 'courses' && (
              <div className="space-y-4">
                <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Courses & Curriculum Manager</h3>
                    <p className="text-xs text-slate-500">Manage course titles, pricing, hours, and catalog details</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCourse({
                        title: '',
                        description: '',
                        category: 'nclex-rn',
                        price: 15000,
                        originalPrice: 20000,
                        durationHours: 40,
                        questionsCount: 2000,
                        level: 'Comprehensive Review',
                        badgeText: 'NextGen 2026',
                        emoji: '📚',
                      });
                      setIsCourseModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Course</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((c) => (
                    <div key={c.id} className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-sky-50 text-sky-700 border border-sky-200">
                            {c.category}
                          </span>
                          <span className="text-xs font-bold text-slate-900">PKR {c.price.toLocaleString()}</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900">{c.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">{c.durationHours} Hours • {c.questionsCount} Questions</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCourse(c);
                              setIsCourseModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-sky-600 rounded"
                            title="Edit Course"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded"
                            title="Delete Course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 7: DEMO MCQS ── */}
            {activeTab === 'demo-mcqs' && (
              <div className="space-y-4">
                <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Homepage Demo MCQs Simulator</h3>
                  <p className="text-xs text-slate-500">
                    These 4 to 5 high-yield questions are loaded on the main landing page for unregistered prospective students.
                  </p>
                </div>

                <div className="space-y-4">
                  {demoMcqs.map((q, idx) => (
                    <div key={q.id} className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-sky-700">Demo Question #{idx + 1} ({q.category})</span>
                        <span className="font-semibold text-emerald-700">Correct: Option {String.fromCharCode(65 + q.correctIndex)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{q.statement}</p>
                      <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-950">
                        <span className="font-bold">Saunders Rationale: </span>{q.correctRationale}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 8: STUDENTS & USERS ── */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Student & User Accounts ({users.length})</h3>
                    <p className="text-xs text-slate-500">Manage user roles, admin privileges, and account activations</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search by name, email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5">ID</th>
                          <th className="p-3.5">Name</th>
                          <th className="p-3.5">Email</th>
                          <th className="p-3.5">Phone</th>
                          <th className="p-3.5">Track</th>
                          <th className="p-3.5">Role</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {users
                          .filter((u) => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                          .map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 font-mono text-slate-500">#{u.id}</td>
                              <td className="p-3.5 font-bold text-slate-900">{u.name}</td>
                              <td className="p-3.5 text-slate-600">{u.email}</td>
                              <td className="p-3.5 text-slate-600">{u.phone || 'N/A'}</td>
                              <td className="p-3.5">{u.examType || 'NCLEX-RN'}</td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {u.isActive ? 'Active' : 'Suspended'}
                                </span>
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleToggleUserRole(u)}
                                    className="px-2 py-1 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    title="Toggle Role"
                                  >
                                    {u.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserStatus(u)}
                                    className={`px-2 py-1 text-[10px] font-semibold rounded ${
                                      u.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {u.isActive ? 'Suspend' : 'Activate'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 9: SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <form onSubmit={handleSaveSettings} className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Site & Payment Account Settings</h3>
                      <p className="text-xs text-slate-500">Configure bank accounts, contact numbers, and WhatsApp links</p>
                    </div>
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                  </div>

                  {settingsMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                      ✓ {settingsMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Support Contact Email</label>
                      <input
                        type="email"
                        value={settings['contact_email'] || ''}
                        onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Support WhatsApp Phone</label>
                      <input
                        type="text"
                        value={settings['contact_whatsapp'] || ''}
                        onChange={(e) => setSettings({ ...settings, contact_whatsapp: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Easypaisa / Sadapay Account Name</label>
                      <input
                        type="text"
                        value={settings['payment_easypaisa_name'] || ''}
                        onChange={(e) => setSettings({ ...settings, payment_easypaisa_name: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Easypaisa / Sadapay Account Number</label>
                      <input
                        type="text"
                        value={settings['payment_easypaisa_number'] || ''}
                        onChange={(e) => setSettings({ ...settings, payment_easypaisa_number: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={settings['payment_bank_name'] || ''}
                        onChange={(e) => setSettings({ ...settings, payment_bank_name: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Bank IBAN Number</label>
                      <input
                        type="text"
                        value={settings['payment_bank_iban'] || ''}
                        onChange={(e) => setSettings({ ...settings, payment_bank_iban: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">WhatsApp Live Class Group Link</label>
                      <input
                        type="text"
                        value={settings['payment_whatsapp_group_link'] || ''}
                        onChange={(e) => setSettings({ ...settings, payment_whatsapp_group_link: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Student Payment Instructions</label>
                      <textarea
                        rows={3}
                        value={settings['payment_instructions'] || ''}
                        onChange={(e) => setSettings({ ...settings, payment_instructions: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>
                </form>
              </div>
            )}

          </main>

        </div>
      </div>

      {/* ── COURSE MODAL ── */}
      {isCourseModalOpen && editingCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCourse.id ? 'Edit Course' : 'Create New Course'}
              </h3>
              <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={editingCourse.title || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Category / Exam Track</label>
                <select
                  value={editingCourse.category || 'nclex-rn'}
                  onChange={(e) => setEditingCourse({ ...editingCourse, category: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                >
                  <option value="nclex-rn">NCLEX-RN (NextGen)</option>
                  <option value="snle">Saudi SNLE</option>
                  <option value="prometric">Gulf Prometric (DHA/MOH)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (PKR)</label>
                  <input
                    type="number"
                    required
                    value={editingCourse.price || 0}
                    onChange={(e) => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Original Price (PKR)</label>
                  <input
                    type="number"
                    value={editingCourse.originalPrice || 0}
                    onChange={(e) => setEditingCourse({ ...editingCourse, originalPrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Course Description</label>
                <textarea
                  rows={3}
                  value={editingCourse.description || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SCREENSHOT PREVIEW MODAL ── */}
      {previewScreenshot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Payment Screenshot Preview</h4>
              <button onClick={() => setPreviewScreenshot(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-96 flex items-center justify-center">
              {previewScreenshot.startsWith('data:') || previewScreenshot.startsWith('http') || previewScreenshot.startsWith('/') ? (
                <img src={previewScreenshot} alt="Payment Receipt" className="max-h-96 object-contain" />
              ) : (
                <div className="p-8 text-xs font-mono text-slate-600">
                  Receipt File Reference: {previewScreenshot}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading admin portal...</p>
        </div>
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
