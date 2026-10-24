'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  History, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ArrowLeft, 
  ArrowRight,
  Filter,
  BarChart3,
  Search
} from 'lucide-react';

interface MockSession {
  id: number;
  title: string;
  mode: 'Tutor Mode' | 'Timed Exam' | 'Adaptive CAT';
  track: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeSpent: string;
  completedAt: string;
  status: 'completed' | 'in_progress';
}

const SAMPLE_SESSIONS: MockSession[] = [
  {
    id: 104,
    title: 'Pharmacological & Parenteral Therapies Drill',
    mode: 'Tutor Mode',
    track: 'NCLEX-RN',
    score: 80,
    totalQuestions: 20,
    correctCount: 16,
    timeSpent: '28m 40s',
    completedAt: 'Today, 11:30 AM',
    status: 'completed',
  },
  {
    id: 103,
    title: 'NextGen Unfolding Case Study Simulation',
    mode: 'Timed Exam',
    track: 'NCLEX-RN',
    score: 73,
    totalQuestions: 15,
    correctCount: 11,
    timeSpent: '22m 15s',
    completedAt: 'Yesterday, 4:15 PM',
    status: 'completed',
  },
  {
    id: 102,
    title: 'Physiological Adaptation & Med-Surg Systems',
    mode: 'Tutor Mode',
    track: 'NCLEX-RN',
    score: 84,
    totalQuestions: 25,
    correctCount: 21,
    timeSpent: '35m 10s',
    completedAt: 'Oct 22, 2026',
    status: 'completed',
  },
  {
    id: 101,
    title: 'Comprehensive Diagnostic Benchmark CAT Exam',
    mode: 'Adaptive CAT',
    track: 'NCLEX-RN',
    score: 79,
    totalQuestions: 85,
    correctCount: 67,
    timeSpent: '1h 45m',
    completedAt: 'Oct 19, 2026',
    status: 'completed',
  },
];

export default function SessionsPage() {
  const [filterMode, setFilterMode] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = SAMPLE_SESSIONS.filter((s) => {
    if (filterMode === 'tutor' && s.mode !== 'Tutor Mode') return false;
    if (filterMode === 'timed' && s.mode !== 'Timed Exam') return false;
    if (filterMode === 'cat' && s.mode !== 'Adaptive CAT') return false;
    if (searchTerm.trim()) {
      return s.title.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200 mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Practice History & Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Test Sessions
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review past test performance, question rationales, and clinical decision trends.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/create-test"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Test</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Website</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Sessions' },
            { id: 'tutor', label: 'Tutor Mode' },
            { id: 'timed', label: 'Timed Exam' },
            { id: 'cat', label: 'Adaptive CAT' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search test topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filtered.length > 0 ? (
          filtered.map((s) => (
            <div
              key={s.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    #{s.id}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                    {s.mode}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">{s.completedAt}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {s.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{s.correctCount} of {s.totalQuestions} Correct</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.timeSpent}</span>
                  </span>
                  <span>•</span>
                  <span>{s.track}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-900">{s.score}%</div>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Passing Grade
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Reviewing session #${s.id}: ${s.title}`)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
                >
                  Review
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-base">No Sessions Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No sessions match the selected filter. Create a new practice test to start tracking your performance.
            </p>
            <div className="pt-2">
              <Link
                href="/app/create-test"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Launch New Test</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
