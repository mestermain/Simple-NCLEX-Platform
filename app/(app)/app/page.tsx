import React from 'react';
import Link from 'next/link';
import { 
  Play, 
  PlusCircle, 
  History, 
  Activity, 
  Award, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  Target, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  BookOpen, 
  Flame,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export default function QBankDashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('nclex_token')?.value || cookieStore.get('token')?.value || '';
  const user = token ? verifyToken(token) : null;

  const candidateName = user?.firstName || 'Candidate';
  const examTrack = user?.examType || 'NCLEX-RN';

  const stats = [
    {
      label: 'Q-Bank Accuracy',
      value: '74%',
      subtext: '+4% from last week',
      icon: Target,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    {
      label: 'Questions Attempted',
      value: '185',
      subtext: 'of 3,500+ questions',
      icon: Activity,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      label: 'CAT Passing Readiness',
      value: '88%',
      subtext: 'High probability of passing',
      icon: Award,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Practice Sessions',
      value: '12',
      subtext: '4 timed · 8 tutor mode',
      icon: History,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
  ];

  const recentSessions = [
    {
      id: 104,
      title: 'Pharmacological & Parenteral Therapies Drill',
      mode: 'Tutor Mode',
      score: '80%',
      questions: '20 questions',
      date: 'Today, 11:30 AM',
      status: 'Completed',
    },
    {
      id: 103,
      title: 'NextGen Unfolding Case Study Simulation',
      mode: 'Timed Exam',
      score: '72%',
      questions: '15 questions',
      date: 'Yesterday',
      status: 'Completed',
    },
    {
      id: 102,
      title: 'Physiological Adaptation & Medical-Surgical',
      mode: 'Tutor Mode',
      score: '85%',
      questions: '25 questions',
      date: 'Oct 22, 2026',
      status: 'Completed',
    },
  ];

  const clientNeedsBreakdown = [
    { name: 'Management of Care / Safe Environment', progress: 78, questions: 50 },
    { name: 'Pharmacological & Parenteral Therapies', progress: 68, questions: 45 },
    { name: 'Physiological Adaptation & Med-Surg', progress: 82, questions: 55 },
    { name: 'Reduction of Risk Potential', progress: 74, questions: 35 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── WELCOME BANNER ── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white p-6 sm:p-8 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-400/30">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>{examTrack} Candidate Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {candidateName}!
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Continue your clinical judgment training. Build a customized practice quiz or review past session rationales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/create-test"
              className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Practice Test</span>
            </Link>
            <Link
              href="/"
              className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to website</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── QUICK STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-xl border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {stat.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">{stat.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ACTION SHORTCUTS & RECENT SESSIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">Recent Test Sessions</h2>
            </div>
            <Link
              href="/app/sessions"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
            >
              <span>View All Sessions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      #{session.id}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                      {session.mode}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {session.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {session.questions} · Completed on {session.date}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-extrabold text-slate-900">
                      {session.score}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3" />
                      Passed
                    </span>
                  </div>
                  <Link
                    href={`/app/sessions`}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: NCSBN Client Needs & Quick Generator */}
        <div className="space-y-6">
          {/* Quick Launch Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Quick Test Launcher</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Launch a pre-configured practice test to build muscle memory under exam conditions.
            </p>
            <div className="space-y-2.5 pt-1">
              <Link
                href="/app/create-test?mode=tutor&count=10"
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors block"
              >
                <span>⚡ 10-Question Quick Drill (Tutor)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href="/app/create-test?mode=exam&count=75"
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors block"
              >
                <span>⏱️ Full Timed Mock Exam (75 Items)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href="/app/create-test?mode=cat"
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors block"
              >
                <span>🎯 Adaptive CAT Simulation</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Client Needs Breakdown */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <span>Client Needs Mastery</span>
              </span>
            </div>
            <div className="space-y-3 pt-1">
              {clientNeedsBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 truncate max-w-[200px]">{item.name}</span>
                    <span className="font-bold text-slate-900">{item.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-600 transition-all duration-500"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
