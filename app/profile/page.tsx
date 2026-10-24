'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Award, 
  Bell, 
  BookOpen, 
  Lock, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  BarChart3, 
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Settings,
  KeyRound,
  Phone,
  Mail,
  Save,
  CheckCircle
} from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}

interface ProfileData {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    examType: string;
    phone: string;
    role: string;
    createdAt: string;
  };
  access: {
    hasAccess: boolean;
    accessType: string;
    daysRemaining: number;
    planName?: string;
  };
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    accuracyPct: number;
    avgSecondsPerQuestion?: number;
    streakDays?: number;
    readinessScore?: number | null;
    readinessLevel?: string;
    readinessDisclaimer?: string;
  };
  analytics?: {
    systemsList?: Array<{ system: string; total: number; correct: number; accuracy: number }>;
    categoriesList?: Array<{ category: string; attempts: number; correct: number; accuracy: number }>;
    weakTopics?: Array<{ system: string; total: number; correct: number; accuracy: number }>;
    recentSessions?: Array<{
      id: number;
      title: string;
      mode: string;
      exam_track: string;
      score_percentage: number;
      total_questions: number;
      correct_count: number;
      time_spent_seconds: number;
      completed_at?: string;
      created_at: string;
    }>;
  };
  categories: {
    category: string;
    attempts: number;
    correct: number;
    accuracy: number;
  }[];
  enrollments: {
    id: number;
    courseId: number;
    courseTitle: string;
    courseCategory?: string;
    courseEmoji?: string;
    status: string;
    enrolledAt: string;
  }[];
  subscriptions: {
    id: number;
    planName: string;
    durationDays: number;
    price: number;
    status: string;
    enrolledAt: string;
    expiresAt?: string;
  }[];
  notifications: Notification[];
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'enrollments' | 'settings'>('overview');

  // Account settings form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [examType, setExamType] = useState('NCLEX-RN');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/student/profile');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const json = await res.json();
        if (json.success) {
          setData(json);
          if (json.user) {
            setFirstName(json.user.firstName || '');
            setLastName(json.user.lastName || '');
            setPhone(json.user.phone || '');
            setExamType(json.user.examType || 'NCLEX-RN');
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  const handleMarkAllNotificationsRead = async () => {
    setMarkingRead(true);
    try {
      await fetch('/api/student/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (data) {
        setData({
          ...data,
          notifications: data.notifications.map((n) => ({ ...n, isRead: true })),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsFeedback(null);

    if (newPassword) {
      if (!currentPassword) {
        setSettingsFeedback({ type: 'error', message: 'Current password is required to set a new password.' });
        return;
      }
      if (newPassword.length < 6) {
        setSettingsFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setSettingsFeedback({ type: 'error', message: 'New passwords do not match.' });
        return;
      }
    }

    setSavingSettings(true);
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          examType,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSettingsFeedback({ type: 'success', message: 'Account settings updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (data && json.user) {
          setData({
            ...data,
            user: {
              ...data.user,
              firstName: json.user.firstName,
              lastName: json.user.lastName,
              phone: json.user.phone,
              examType: json.user.examType,
            },
          });
        }
      } else {
        setSettingsFeedback({ type: 'error', message: json.message || 'Failed to update settings.' });
      }
    } catch (err: any) {
      setSettingsFeedback({ type: 'error', message: err.message || 'Connection error. Please try again.' });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading student portal & analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-slate-600 text-sm">Please log in to view your student portal.</p>
          <Link href="/login" className="px-6 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-semibold">
            Log In Now
          </Link>
        </div>
      </div>
    );
  }

  const { user, access, stats, categories, enrollments, subscriptions, notifications } = data;
  const unreadCount = notifications ? notifications.filter((n) => !n.isRead).length : 0;
  const safeStats = stats || { totalAttempts: 0, correctAttempts: 0, accuracyPct: 0 };
  const safeAccess = access || { hasAccess: false, accessType: 'demo', daysRemaining: 0 };
  const safeCategories = categories || [];
  const safeEnrollments = enrollments || [];
  const safeSubscriptions = subscriptions || [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* ── 1. HEADER PROFILE CARD ── */}
        <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-sky-600/20">
                {user.firstName ? user.firstName[0].toUpperCase() : 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {user.firstName} {user.lastName}
                  </h1>
                  {user.role === 'admin' && (
                    <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Faculty Admin
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                  <span>{user.email}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">{user.examType || 'NCLEX-RN Candidate'}</span>
                  <span>•</span>
                  <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Access Status & Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {safeAccess.hasAccess ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-left">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Full Platform Access Active</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {safeAccess.accessType === 'admin' && 'Administrator Unrestricted Access'}
                    {safeAccess.accessType === 'course' && 'Enrolled Course Student Access'}
                    {safeAccess.accessType === 'subscription' && `${safeAccess.daysRemaining} days remaining on Q-Bank pass`}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold uppercase tracking-wider">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Free Demo Account</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Limited to 5 sample items.
                    </div>
                  </div>
                  <Link
                    href="/qbank"
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm whitespace-nowrap"
                  >
                    Unlock Full →
                  </Link>
                </div>
              )}

              <Link
                href="/qbank"
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Resume Practice</span>
              </Link>
            </div>

          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mt-8 gap-4 sm:gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview & Scores</span>
            </button>
            <button
              onClick={() => setActiveTab('enrollments')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'enrollments'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>My Courses & Passes ({safeEnrollments.length + safeSubscriptions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Account Settings</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW & SCORES ── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* PERFORMANCE KPIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Overall Accuracy
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">{safeStats.accuracyPct}%</span>
                  <span className="text-xs text-slate-500">
                    ({safeStats.correctAttempts} / {safeStats.totalAttempts} correct)
                  </span>
                </div>
                <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${safeStats.accuracyPct >= 75 ? 'bg-emerald-500' : safeStats.accuracyPct >= 55 ? 'bg-amber-500' : 'bg-sky-500'}`}
                    style={{ width: `${Math.min(100, safeStats.accuracyPct)}%` }}
                  />
                </div>
              </div>

              <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Total Questions Solved
                </div>
                <div className="text-3xl font-extrabold text-slate-900">{safeStats.totalAttempts}</div>
                <p className="text-xs text-slate-500 mt-2">
                  Clinical scenarios attempted across all subjects
                </p>
              </div>

              {/* Licensure Readiness & Streak */}
              <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Licensure Readiness
                  </div>
                  {stats?.streakDays !== undefined && stats.streakDays > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      🔥 {stats.streakDays} Day Streak
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${
                    (stats?.readinessScore || safeStats.accuracyPct) >= 75
                      ? 'text-emerald-600'
                      : (stats?.readinessScore || safeStats.accuracyPct) >= 60
                      ? 'text-sky-600'
                      : 'text-amber-600'
                  }`}>
                    {stats?.readinessScore ? `${stats.readinessScore}%` : safeStats.totalAttempts < 5 ? 'Calibrating...' : `${safeStats.accuracyPct}%`}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {stats?.readinessLevel || (safeStats.accuracyPct >= 75 ? 'Passing Range' : 'Borderline')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {stats?.readinessDisclaimer || 'Estimated NCLEX Readiness Score — Formulated from practice diagnostics. Not a guarantee of licensure.'}
                </p>
              </div>

              <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Avg Pace / Question
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {stats?.avgSecondsPerQuestion || 48}s
                  </span>
                  <span className="text-xs text-slate-500">
                    (Target: ~72s)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {stats?.avgSecondsPerQuestion && stats.avgSecondsPerQuestion <= 72 ? '✓ Optimal test pace' : 'Takes time to deliberate'}
                </p>
              </div>

            </div>

            {/* WEAK TOPICS REMEDIATION BANNER */}
            {data?.analytics?.weakTopics && data.analytics.weakTopics.length > 0 && (
              <div className="clinical-card bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-6 rounded-2xl border border-amber-200/80 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Targeted Weakness Remediation Recommended</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      Focus Practice on Your High-Risk Clinical Areas
                    </h3>
                    <p className="text-xs text-slate-600">
                      You are currently scoring below 65% in:{' '}
                      <strong className="text-slate-800">
                        {data.analytics.weakTopics.map(w => w.system).join(', ')}
                      </strong>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/qbank?start=true&source=incorrect&organ=${encodeURIComponent(data.analytics.weakTopics[0].system)}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all shrink-0"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Practice Weak Topics ({data.analytics.weakTopics[0].system})</span>
                    </Link>
                    <Link
                      href="/app/create-test?start=true&mode=exam"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs transition-colors shrink-0"
                    >
                      <span>Take Practice Drill →</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* STUDY ENGINES & GROWTH TOOLS SHOWCASE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link 
                href="/app/create-test"
                className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      Adaptive CAT Simulator
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                      NextGen 2026
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Practice with computerized adaptive testing, NGN case studies, and timed full-length NCLEX simulations.
                  </p>
                </div>
              </Link>

              <Link 
                href="/readiness-estimator"
                className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      Passing Probability Calculator
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                      Free Quiz
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Benchmark your clinical judgment against official NCSBN standards and generate a shareable milestone passing badge.
                  </p>
                </div>
              </Link>
            </div>

            {/* CATEGORY MASTERY & NOTIFICATIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Category Mastery Progress Bars */}
              <div className="lg:col-span-2 clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-sky-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Client Needs & Subject Mastery
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">Passing Benchmark: 75%</span>
                </div>

                {safeCategories.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm space-y-2">
                    <p>No practice attempts recorded yet.</p>
                    <Link href="/qbank" className="text-xs font-bold text-sky-600 hover:underline">
                      Start answering questions in the Q-Bank →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {safeCategories.map((c, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{c.category}</span>
                          <span className="font-bold text-slate-600">
                            {c.accuracy}% ({c.correct}/{c.attempts})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${c.accuracy >= 75 ? 'bg-emerald-500' : c.accuracy >= 55 ? 'bg-amber-500' : 'bg-rose-400'}`}
                            style={{ width: `${Math.min(100, c.accuracy)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Notifications Inbox */}
              <div id="notifications" className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Notification Inbox
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      disabled={markingRead}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50 cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>

                {!notifications || notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications right now.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-colors ${n.isRead ? 'bg-slate-50/60 border-slate-100 text-slate-600' : 'bg-sky-50/50 border-sky-200 text-slate-800'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{n.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{n.message}</p>
                        {n.link && (
                          <Link href={n.link} className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline pt-1">
                            <span>View Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── TAB 2: MY COURSES & PASSES ── */}
        {activeTab === 'enrollments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Enrolled Courses */}
            <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    My Enrolled Courses ({safeEnrollments.length})
                  </h3>
                </div>
                <Link href="/courses" className="text-xs font-semibold text-sky-600 hover:underline">
                  Browse Catalog →
                </Link>
              </div>

              {safeEnrollments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                  <p>You haven't enrolled in any live lecture series yet.</p>
                  <Link href="/courses" className="text-sky-600 font-bold hover:underline">
                    Explore NCLEX-RN, SNLE & Prometric batches →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {safeEnrollments.map((e) => (
                    <div key={e.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">{e.courseTitle}</div>
                        <div className="text-xs text-slate-500">
                          Enrolled: {new Date(e.enrolledAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${
                          e.status === 'approved' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : e.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {e.status === 'approved' ? '✓ Approved' : e.status === 'pending' ? '⏳ Under Review' : 'Rejected'}
                        </span>
                        {e.status === 'approved' && (
                          <Link href={`/courses/${e.courseId}`} className="block text-[11px] text-sky-600 font-semibold hover:underline mt-1">
                            Access Syllabus →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Q-Bank Subscriptions */}
            <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Q-Bank Subscriptions ({safeSubscriptions.length})
                  </h3>
                </div>
                <Link href="/qbank" className="text-xs font-semibold text-sky-600 hover:underline">
                  Practice Q-Bank →
                </Link>
              </div>

              {safeSubscriptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                  <p>No standalone Q-Bank subscriptions found.</p>
                  <Link href="/qbank" className="text-sky-600 font-bold hover:underline">
                    Subscribe to full question bank →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {safeSubscriptions.map((s) => (
                    <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">{s.planName}</div>
                        <div className="text-xs text-slate-500">
                          {s.expiresAt ? `Valid until: ${s.expiresAt.split(' ')[0]}` : `Duration: ${s.durationDays} days`}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${
                          s.status === 'approved' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : s.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {s.status === 'approved' ? '✓ Active' : s.status === 'pending' ? '⏳ Pending Review' : 'Expired'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── TAB 3: ACCOUNT & SECURITY SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
              
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Student Profile & Security Settings</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Update your contact information, target licensure exam, and secure account password.
                </p>
              </div>

              {settingsFeedback && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${
                  settingsFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {settingsFeedback.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{settingsFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Personal Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Personal Information
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Email Address (Primary Login)
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Email address is linked to your licensure records and cannot be modified directly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92 300 1234567"
                        className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Target Exam Track
                      </label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="NCLEX-RN">NCLEX-RN (NextGen Registered Nurse)</option>
                        <option value="NCLEX-PN">NCLEX-PN (Practical Nurse)</option>
                        <option value="SNLE">Saudi SNLE (SCFHS Licensure)</option>
                        <option value="DHA">Dubai DHA Registered Nurse</option>
                        <option value="HAAD">Abu Dhabi HAAD / DoH</option>
                        <option value="Prometric">Gulf Prometric (MOH, Qatar, Oman)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Password Change */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-sky-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Security & Password (Optional)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Leave blank if you do not want to change your password.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-sm rounded-xl shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingSettings ? 'Saving Changes...' : 'Save Account Settings'}</span>
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
