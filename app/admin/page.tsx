'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ArrowRight
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

export default function AdminPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'bulk-import' | 'registrations' | 'subscriptions' | 'demo-mcqs'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Questions tab state
  const [questions, setQuestions] = useState<QBankItem[]>([]);
  const [qSearch, setQSearch] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<QBankItem | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

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

  // Demo MCQs state
  const [demoMcqs, setDemoMcqs] = useState<any[]>([]);

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
    if (activeTab === 'questions') {
      fetchQuestions();
    } else if (activeTab === 'registrations') {
      fetchRegistrations();
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptions();
    } else if (activeTab === 'demo-mcqs') {
      fetchDemoMcqs();
    }
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

  const fetchDemoMcqs = async () => {
    try {
      const res = await fetch('/api/admin/demo-mcqs');
      const data = await res.json();
      if (data.success) setDemoMcqs(data.mcqs);
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
        // Refresh stats
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

  // Delete question
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* ── TOP ADMIN HEADER ── */}
      <section className="bg-slate-900 text-white border-b border-slate-800 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Faculty & Platform Administration
              </h1>
              <p className="text-xs text-slate-400">
                Manage Question Bank, Approvals, Subscriptions, and Bulk JSON Importers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/qbank"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              View Q-Bank As Student →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TAB NAVIGATION BAR ── */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto custom-scrollbar py-2 text-xs font-bold uppercase tracking-wider">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'questions', name: `Question Bank (${questions.length || '...'})` },
              { id: 'bulk-import', name: 'Bulk JSON Importer (MSQ & MCQ)' },
              { id: 'registrations', name: `Course Enrollments (${stats?.pendingEnrollments || 0} Pending)` },
              { id: 'subscriptions', name: `Q-Bank Subscriptions (${stats?.pendingSubscriptions || 0} Pending)` },
              { id: 'demo-mcqs', name: 'Homepage Demo MCQs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-sky-50 text-sky-700 font-extrabold border border-sky-200/80'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── TAB CONTENTS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold uppercase text-slate-400">Total Registered Users</div>
                <div className="text-3xl font-black text-slate-900 mt-2">{stats.totalUsers}</div>
                <div className="text-xs text-slate-500 mt-1">{stats.totalStudents} enrolled students</div>
              </div>

              <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold uppercase text-slate-400">Questions in Bank</div>
                <div className="text-3xl font-black text-sky-600 mt-2">{stats.totalQuestions}</div>
                <div className="text-xs text-slate-500 mt-1">Single Choice & SATA items</div>
              </div>

              <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold uppercase text-amber-600">Pending Course Registrations</div>
                <div className="text-3xl font-black text-amber-600 mt-2">{stats.pendingEnrollments}</div>
                <button
                  onClick={() => setActiveTab('registrations')}
                  className="text-xs font-bold text-sky-600 hover:underline mt-1 block"
                >
                  Review approval queue →
                </button>
              </div>

              <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold uppercase text-indigo-600">Pending Subscriptions</div>
                <div className="text-3xl font-black text-indigo-600 mt-2">{stats.pendingSubscriptions}</div>
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className="text-xs font-bold text-sky-600 hover:underline mt-1 block"
                >
                  Review subscriptions →
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Quick Administrative Tasks
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('bulk-import')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-left transition-all space-y-1"
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <FileCode className="w-4 h-4 text-sky-600" />
                    <span>Bulk Paste JSON Questions</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Import dozens of MCQs & SATA MSQs simultaneously with automatic key parsing.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('registrations')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all space-y-1"
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approve Course Students</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Verify bank screenshots and unlock 100% full Q-Bank access for students.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('demo-mcqs')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all space-y-1"
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Manage Homepage Demo Questions</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Update the interactive test questions displayed on the landing page simulator.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: QUESTION BANK ── */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('bulk-import')}
                  className="px-4 py-2 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Bulk Import JSON</span>
                </button>
              </div>
            </div>

            <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Statement</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Correct Answer(s)</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {questions
                      .filter((q) => !qSearch || q.statement.toLowerCase().includes(qSearch.toLowerCase()) || q.category.toLowerCase().includes(qSearch.toLowerCase()))
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
                          <td className="p-3.5 text-slate-500 whitespace-nowrap">{q.category}</td>
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

        {/* ── TAB 3: BULK JSON IMPORTER (MSQ & MCQ) ── */}
        {activeTab === 'bulk-import' && (
          <div className="space-y-6">
            <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-5">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bulk JSON Question Importer
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paste raw JSON code with questions. The engine automatically detects MSQ (Select All That Apply) vs single-choice MCQ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInsertSampleJson}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Load Sample JSON Template
                </button>
              </div>

              {/* Import Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Default Category (if not specified in JSON items)
                  </label>
                  <input
                    type="text"
                    value={importDefaultCat}
                    onChange={(e) => setImportDefaultCat(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* JSON Code Textarea */}
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

              {/* Result Notification */}
              {importResult && (
                <div className={`p-4 rounded-xl border text-xs ${importResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                  <div className="font-bold">{importResult.success ? '✓ Import Succeeded' : '✗ Import Failed'}</div>
                  <p className="mt-1">{importResult.message}</p>
                </div>
              )}

              {/* Submit CTA */}
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

        {/* ── TAB 4: COURSE REGISTRATIONS (ENROLLMENTS) ── */}
        {activeTab === 'registrations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setRegFilter(f)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors ${
                      regFilter === f
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
                      <th className="p-3.5">WhatsApp / Phone</th>
                      <th className="p-3.5">Enrolled Date</th>
                      <th className="p-3.5">Receipt</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {registrations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
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
                          <td className="p-3.5 text-slate-400 whitespace-nowrap">
                            {new Date(r.enrolledAt).toLocaleDateString()}
                          </td>
                          <td className="p-3.5">
                            {r.paymentScreenshot ? (
                              <button
                                onClick={() => setPreviewScreenshot(r.paymentScreenshot)}
                                className="px-2 py-1 text-[11px] font-semibold rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Receipt</span>
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

        {/* ── TAB 5: Q-BANK SUBSCRIPTIONS ── */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setSubFilter(f)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors ${
                      subFilter === f
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
                      <th className="p-3.5">Expires</th>
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
                                <span>View Receipt</span>
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

        {/* ── TAB 6: HOMEPAGE DEMO MCQS ── */}
        {activeTab === 'demo-mcqs' && (
          <div className="space-y-6">
            <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Landing Page Demo Questions
                  </h3>
                  <p className="text-xs text-slate-500">
                    These questions are loaded on the homepage interactive test simulator for prospective students.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {demoMcqs.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-700">Demo Question #{idx + 1} ({q.category})</span>
                      <span className="font-semibold text-emerald-700">Correct: Choice {String.fromCharCode(65 + q.correctIndex)}</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-900">{q.statement}</p>
                    <p className="text-xs text-slate-600 italic">Rationale: {q.correctRationale}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Receipt Modal */}
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
