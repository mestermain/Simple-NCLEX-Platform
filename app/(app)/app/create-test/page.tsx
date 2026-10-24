'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  PlusCircle, 
  Play, 
  Clock, 
  HelpCircle, 
  Sparkles, 
  Layers, 
  Sliders, 
  CheckCircle2, 
  ArrowLeft,
  Activity,
  AlertCircle
} from 'lucide-react';
import PracticeSimulator from '@/components/qbank/PracticeSimulator';

const SYSTEMS = [
  'Cardiovascular System',
  'Respiratory System',
  'Neurological & Sensory System',
  'Gastrointestinal & Hepatic System',
  'Renal & Urinary System',
  'Endocrine System',
  'Musculoskeletal System',
  'Hematologic & Immune System',
  'Mental Health & Psychosocial'
];

export default function CreateTestPage() {
  const searchParams = useSearchParams();
  const initialStart = searchParams.get('start') === 'true';
  const paramMode = searchParams.get('mode');
  const paramCount = parseInt(searchParams.get('count') || searchParams.get('limit') || '0', 10);

  const [testMode, setTestMode] = useState<'tutor' | 'timed' | 'cat'>(
    paramMode === 'cat' ? 'cat' : paramMode === 'exam' || paramMode === 'timed' ? 'timed' : 'tutor'
  );
  const [questionCount, setQuestionCount] = useState<number>(paramCount > 0 ? paramCount : 25);
  const [questionStatus, setQuestionStatus] = useState<'all' | 'unused' | 'incorrect' | 'flagged'>('unused');
  const [selectedSystems, setSelectedSystems] = useState<string[]>(['all']);
  const [testStarted, setTestStarted] = useState<boolean>(initialStart);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (initialStart) {
      setTestStarted(true);
    }
  }, [initialStart]);

  const toggleSystem = (sys: string) => {
    if (sys === 'all') {
      setSelectedSystems(['all']);
      return;
    }
    const current = selectedSystems.filter(s => s !== 'all');
    if (current.includes(sys)) {
      const next = current.filter(s => s !== sys);
      setSelectedSystems(next.length === 0 ? ['all'] : next);
    } else {
      setSelectedSystems([...current, sys]);
    }
  };

  const handleLaunchTest = () => {
    setIsLaunching(true);
    setTimeout(() => {
      setIsLaunching(false);
      setTestStarted(true);
    }, 400);
  };

  // ── ACTIVE PEACEFUL MOCK TEST RUNNER ──
  if (testStarted) {
    return (
      <div className="space-y-4">
        {/* Navigation Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTestStarted(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Configure Another Test</span>
          </button>

          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to website</span>
          </Link>
        </div>

        {/* Live Interactive Simulator in Peaceful Exam Mode */}
        <PracticeSimulator
          initialMode={testMode === 'timed' ? 'exam' : testMode}
          initialCount={questionCount}
          initialSystem={selectedSystems[0] !== 'all' ? selectedSystems[0] : undefined}
          initialStatus={questionStatus === 'unused' ? 'unanswered' : questionStatus}
          autoStart={true}
          onExit={() => setTestStarted(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200 mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>Custom Test Generator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Practice Test
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure your custom clinical drill, timed mock exam, or adaptive CAT session.
          </p>
        </div>

        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors self-start sm:self-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Test Creation Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-8">
        {/* Step 1: Mode Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            1. Select Testing Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setTestMode('tutor')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                testMode === 'tutor'
                  ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20 text-sky-950 font-semibold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="font-bold text-sm mb-1">📖 Tutor Mode</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Instant rationales and pearls displayed immediately after each answer.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTestMode('timed')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                testMode === 'timed'
                  ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20 text-sky-950 font-semibold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="font-bold text-sm mb-1">⏱️ Timed Exam Mode</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Standard exam timer. Rationales and scores provided at test completion.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTestMode('cat')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                testMode === 'cat'
                  ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20 text-sky-950 font-semibold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="font-bold text-sm mb-1">🎯 Adaptive CAT Mode</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Variable length (85–150 items) stopping rule with live IRT difficulty.
              </p>
            </button>
          </div>
        </div>

        {/* Step 2: Question Volume */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            2. Question Count
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {[10, 25, 50, 75, 85].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setQuestionCount(cnt)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  questionCount === cnt
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {cnt} Questions
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Question Pool Status */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            3. Question Pool
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'all', label: 'All Questions' },
              { id: 'unused', label: 'Unused Only' },
              { id: 'incorrect', label: 'Incorrect Only' },
              { id: 'flagged', label: 'Flagged Only' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setQuestionStatus(p.id as any)}
                className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                  questionStatus === p.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Organ Systems */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              4. Body & Organ Systems
            </label>
            <span className="text-xs text-slate-500">
              {selectedSystems.includes('all') ? 'All systems selected' : `${selectedSystems.length} systems selected`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => toggleSystem('all')}
              className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                selectedSystems.includes('all')
                  ? 'border-sky-600 bg-sky-50 text-sky-950 font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              🌐 Comprehensive (All Organ Systems)
            </button>
            {SYSTEMS.map((sys) => {
              const selected = selectedSystems.includes(sys);
              return (
                <button
                  key={sys}
                  type="button"
                  onClick={() => toggleSystem(sys)}
                  className={`p-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                    selected
                      ? 'border-sky-600 bg-sky-50 text-sky-950 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {sys}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleLaunchTest}
            disabled={isLaunching}
            className="px-8 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLaunching ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Initializing Mock Test...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Practice Test</span>
              </>
            )}
          </button>

          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to website</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
