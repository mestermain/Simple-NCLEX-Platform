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
  ExternalLink
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
  };
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    accuracyPct: number;
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
    category: string;
    status: string;
    enrolledAt: string;
    progress: number;
  }[];
  subscriptions: {
    id: number;
    planName: string;
    durationDays: number;
    price: number;
    status: string;
    enrolledAt: string;
    expiresAt: string;
  }[];
  notifications: Notification[];
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

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
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
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
                <div className="text-sm text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                  <span>{user.email}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">{user.examType || 'NCLEX-RN Candidate'}</span>
                  <span>•</span>
                  <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Access Status & Upgrade CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {access.hasAccess ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-left">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Full Platform Access Active</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {access.accessType === 'admin' && 'Administrator Unrestricted Access'}
                    {access.accessType === 'course' && 'Enrolled Course Student Access'}
                    {access.accessType === 'subscription' && `${access.daysRemaining} days remaining on Q-Bank pass`}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
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
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
                  >
                    Unlock Full →
                  </Link>
                </div>
              )}

              <Link
                href="/qbank"
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Resume Practice</span>
              </Link>
            </div>

          </div>
        </div>

        {/* ── 2. PERFORMANCE KPIS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Overall Accuracy
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{stats.accuracyPct}%</span>
              <span className="text-xs text-slate-500">
                ({stats.correctAttempts} / {stats.totalAttempts} correct)
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${stats.accuracyPct >= 75 ? 'bg-emerald-500' : stats.accuracyPct >= 55 ? 'bg-amber-500' : 'bg-sky-500'}`}
                style={{ width: `${Math.min(100, stats.accuracyPct)}%` }}
              />
            </div>
          </div>

          <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Total Questions Solved
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{stats.totalAttempts}</div>
            <p className="text-xs text-slate-500 mt-2">
              Clinical scenarios attempted across all subjects
            </p>
          </div>

          <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Licensure Readiness
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${stats.accuracyPct >= 70 ? 'text-emerald-600' : stats.totalAttempts < 10 ? 'text-slate-400' : 'text-amber-600'}`}>
                {stats.totalAttempts < 5 ? 'Calibrating...' : stats.accuracyPct >= 75 ? 'Very High (Passing)' : stats.accuracyPct >= 60 ? 'Borderline' : 'Needs Review'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Based on NCSBN NextGen passing threshold
            </p>
          </div>

          <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Active Courses
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {enrollments.filter((e) => e.status === 'approved').length}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Live batch lecture enrollments verified
            </p>
          </div>

        </div>

        {/* ── 3. CATEGORY MASTERY & NOTIFICATIONS ── */}
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
              <span className="text-xs text-slate-500">Benchmark: 75% Passing</span>
            </div>

            {categories.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm space-y-2">
                <p>No practice attempts recorded yet.</p>
                <Link href="/qbank" className="text-xs font-bold text-sky-600 hover:underline">
                  Start answering questions in the Q-Bank →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((c, idx) => (
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
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50"
                >
                  Mark read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
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

        {/* ── 4. MY ENROLLMENTS & SUBSCRIPTIONS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Enrolled Courses */}
          <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">
                  My Enrolled Courses ({enrollments.length})
                </h3>
              </div>
              <Link href="/courses" className="text-xs font-semibold text-sky-600 hover:underline">
                Browse Catalog →
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <p>You haven't enrolled in any live lecture series yet.</p>
                <Link href="/courses" className="text-sky-600 font-bold hover:underline">
                  Explore NCLEX-RN, SNLE & Prometric batches →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {enrollments.map((e) => (
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
                  Q-Bank Subscriptions ({subscriptions.length})
                </h3>
              </div>
              <Link href="/qbank" className="text-xs font-semibold text-sky-600 hover:underline">
                Practice Q-Bank →
              </Link>
            </div>

            {subscriptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <p>No standalone Q-Bank subscriptions found.</p>
                <Link href="/qbank" className="text-sky-600 font-bold hover:underline">
                  Subscribe to full 60+ question bank →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((s) => (
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

      </div>
    </div>
  );
}
