'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Flag, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Lock, 
  Flame, 
  CheckSquare, 
  Square, 
  HelpCircle, 
  Check, 
  X, 
  Layers, 
  ArrowRight,
  Play,
  Pause,
  Award,
  Target,
  BookOpen,
  Filter,
  CheckCheck,
  AlertTriangle,
  Bookmark,
  RefreshCw
} from 'lucide-react';

interface Question {
  id: number;
  category: string;
  organSystem: string;
  difficulty: string;
  examType: string;
  clientNeed: string;
  statement: string;
  options: string[];
  questionType: 'single' | 'multiple';
  isMultipleResponse?: boolean;
  correctIndices?: number[];
  correctIndex?: number;
  correctRationale?: string;
  clinicalPearl?: string;
  distractors?: string[];
}

interface AttemptResult {
  isCorrect: boolean;
  score: number;
  correctIndices: number[];
  selectedIndices: number[];
  correctRationale: string;
  distractors: string[];
  clinicalPearl: string;
}

const ORGAN_SYSTEMS = [
  { id: 'all', name: 'All Organ Systems', icon: '🫀', count: 60 },
  { id: 'Cardiovascular System', name: 'Cardiovascular System', icon: '❤️', count: 6 },
  { id: 'Respiratory System', name: 'Respiratory System', icon: '🫁', count: 6 },
  { id: 'Neurological & Sensory System', name: 'Neurological & Sensory System', icon: '🧠', count: 6 },
  { id: 'Gastrointestinal & Hepatic System', name: 'Gastrointestinal & Hepatic System', icon: '🩺', count: 6 },
  { id: 'Renal & Urinary System', name: 'Renal & Urinary System', icon: '💧', count: 6 },
  { id: 'Endocrine System', name: 'Endocrine System', icon: '⚡', count: 6 },
  { id: 'Musculoskeletal System', name: 'Musculoskeletal System', icon: '🦴', count: 6 },
  { id: 'Hematologic & Immune System', name: 'Hematologic & Immune System', icon: '🛡️', count: 6 },
  { id: 'Reproductive & Maternal-Newborn', name: 'Reproductive & Maternal-Newborn', icon: '👶', count: 6 },
  { id: 'Mental Health & Psychosocial', name: 'Mental Health & Psychosocial', icon: '🧘', count: 6 },
];

export default function QBankPage() {
  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  const [attemptResults, setAttemptResults] = useState<Record<number, AttemptResult>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  
  // Historical user progress from DB
  const [dbCorrectIds, setDbCorrectIds] = useState<number[]>([]);
  const [dbIncorrectIds, setDbIncorrectIds] = useState<number[]>([]);
  const [dbFlaggedIds, setDbFlaggedIds] = useState<number[]>([]);
  const [dbAttemptedIds, setDbAttemptedIds] = useState<number[]>([]);

  // Access state
  const [hasAccess, setHasAccess] = useState(false);
  const [accessType, setAccessType] = useState('demo');
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [userRole, setUserRole] = useState('guest');
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Filters & Modes
  const [selectedOrganSystem, setSelectedOrganSystem] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unanswered' | 'incorrect' | 'correct' | 'flagged'>('all');
  const [paletteStatusFilter, setPaletteStatusFilter] = useState<'all' | 'unanswered' | 'incorrect' | 'correct' | 'flagged'>('all');
  const [questionFormatFilter, setQuestionFormatFilter] = useState<'mixed' | 'single' | 'multiple'>('mixed');
  const [examMode, setExamMode] = useState(false); // false = Practice Mode (instant rationales), true = Timed Exam Mode
  const [questionLimit, setQuestionLimit] = useState<number | 'all'>('all');

  // Session lifecycle
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Subscription form
  const [subPlan, setSubPlan] = useState<'1m' | '3m' | '6m'>('1m');
  const [whatsapp, setWhatsapp] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState('');

  // Check URL parameters for direct start
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('start') === 'true') {
        setSessionStarted(true);
        setTimerRunning(true);
      }
      if (params.get('mode') === 'exam') {
        setExamMode(true);
      }
      if (params.get('organ')) {
        setSelectedOrganSystem(params.get('organ')!);
      }
      if (params.get('status')) {
        const s = params.get('status') as any;
        if (['all', 'unanswered', 'incorrect', 'correct', 'flagged'].includes(s)) {
          setStatusFilter(s);
        }
      }
    }
  }, []);

  // Fetch access & questions
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Check access status
        const statusRes = await fetch('/api/qbank/status');
        const statusData = await statusRes.json();
        
        if (statusData.success) {
          setHasAccess(statusData.hasAccess);
          setAccessType(statusData.accessType);
          setDaysRemaining(statusData.daysRemaining || 0);
          setUserRole(statusData.role || 'guest');
        }

        // 2. Fetch questions and user progress
        const qRes = await fetch('/api/qbank/questions');
        const qData = await qRes.json();

        if (qData.success && qData.questions) {
          setQuestions(qData.questions);
          if (qData.userProgress) {
            setDbCorrectIds(qData.userProgress.correctIds || []);
            setDbIncorrectIds(qData.userProgress.incorrectIds || []);
            setDbFlaggedIds(qData.userProgress.flaggedIds || []);
            setDbAttemptedIds(qData.userProgress.attemptedIds || []);
          }
        }
      } catch (err) {
        console.error('Error loading QBank:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Timer interval: only runs during active session
  useEffect(() => {
    let interval: any = null;
    if (sessionStarted && timerRunning && !sessionCompleted) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted, timerRunning, sessionCompleted]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper functions for question status
  const getQuestionStatus = (qId: number): 'correct' | 'incorrect' | 'unanswered' => {
    if (attemptResults[qId] !== undefined) {
      return attemptResults[qId].isCorrect ? 'correct' : 'incorrect';
    }
    if (dbCorrectIds.includes(qId)) return 'correct';
    if (dbIncorrectIds.includes(qId)) return 'incorrect';
    return 'unanswered';
  };

  const isQuestionFlagged = (qId: number): boolean => {
    if (flaggedQuestions[qId] !== undefined) {
      return flaggedQuestions[qId];
    }
    return dbFlaggedIds.includes(qId);
  };

  // Live Status Counts across the whole bank or current organ filter
  const liveCounts = useMemo(() => {
    const base = selectedOrganSystem === 'all'
      ? questions
      : questions.filter(q => (q.organSystem || '').toLowerCase().includes(selectedOrganSystem.toLowerCase()));

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let flagged = 0;

    for (const q of base) {
      const st = getQuestionStatus(q.id);
      if (st === 'correct') correct++;
      else if (st === 'incorrect') incorrect++;
      else unanswered++;

      if (isQuestionFlagged(q.id)) flagged++;
    }

    return {
      all: base.length,
      unanswered,
      incorrect,
      correct,
      flagged,
    };
  }, [questions, selectedOrganSystem, attemptResults, flaggedQuestions, dbCorrectIds, dbIncorrectIds, dbFlaggedIds]);

  // Build the active practice session questions:
  // 1. Organ System Filter
  // 2. Status Filter (All, Unanswered, Incorrect, Correct, Flagged)
  // 3. Mixed Question Logic: Smoothly interleave SATA and single MCQs!
  const filteredQuestions = useMemo(() => {
    // Step 1: Organ System
    let pool = questions.filter((q) => {
      if (selectedOrganSystem !== 'all') {
        const qOrgan = (q.organSystem || '').toLowerCase();
        if (!qOrgan.includes(selectedOrganSystem.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    // Step 2: Status Filter (Correct, Incorrect, Flagged, Unanswered)
    if (statusFilter !== 'all') {
      pool = pool.filter((q) => {
        if (statusFilter === 'flagged') {
          return isQuestionFlagged(q.id);
        }
        return getQuestionStatus(q.id) === statusFilter;
      });
    }

    // Step 3: Format Filter & SATA/MCQ Mixing
    if (questionFormatFilter === 'single') {
      pool = pool.filter(q => q.questionType === 'single');
    } else if (questionFormatFilter === 'multiple') {
      pool = pool.filter(q => q.questionType === 'multiple');
    } else {
      // 'mixed': Interleave Single MCQs and SATA (Multiple) items for authentic NCLEX feel!
      const singles = pool.filter(q => q.questionType === 'single');
      const multiples = pool.filter(q => q.questionType === 'multiple');
      const mixed: Question[] = [];
      const maxLen = Math.max(singles.length, multiples.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < singles.length) mixed.push(singles[i]);
        if (i < multiples.length) mixed.push(multiples[i]);
      }
      pool = mixed;
    }

    // Step 4: Batch Size Limit
    return questionLimit === 'all' ? pool : pool.slice(0, questionLimit);
  }, [questions, selectedOrganSystem, statusFilter, questionFormatFilter, questionLimit, attemptResults, flaggedQuestions, dbCorrectIds, dbIncorrectIds, dbFlaggedIds]);

  // Sidebar Question Palette Items (filterable by status during testing)
  const paletteItems = useMemo(() => {
    return filteredQuestions.map((q, idx) => ({ q, originalIndex: idx }))
      .filter(({ q }) => {
        if (paletteStatusFilter === 'all') return true;
        if (paletteStatusFilter === 'flagged') return isQuestionFlagged(q.id);
        return getQuestionStatus(q.id) === paletteStatusFilter;
      });
  }, [filteredQuestions, paletteStatusFilter, attemptResults, flaggedQuestions, dbCorrectIds, dbIncorrectIds, dbFlaggedIds]);

  // Session lifecycle handlers
  const handleStartSession = () => {
    if (filteredQuestions.length === 0) return;
    setCurrentIndex(0);
    setSessionStarted(true);
    setSessionCompleted(false);
    setTimerRunning(true);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('qbankWorkspaceTop');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePauseSession = () => {
    setSessionStarted(false);
    setTimerRunning(false);
  };

  const handleFinishSession = () => {
    setSessionCompleted(true);
    setTimerRunning(false);
  };

  const handleRestartNewSession = () => {
    setSelectedAnswers({});
    setAttemptResults({});
    setFlaggedQuestions({});
    setSecondsElapsed(0);
    setCurrentIndex(0);
    setSessionStarted(false);
    setSessionCompleted(false);
    setTimerRunning(false);
  };

  const currentQ = filteredQuestions[currentIndex] || filteredQuestions[0];
  const currentQId = currentQ?.id;
  const currentSelected = (currentQId && selectedAnswers[currentQId]) || [];
  const currentResult = currentQId ? attemptResults[currentQId] : undefined;
  const isAnswered = currentResult !== undefined;
  const isFlagged = currentQId ? isQuestionFlagged(currentQId) : false;

  // Answer selection handler
  const handleOptionToggle = (optionIndex: number) => {
    if (!currentQ || isAnswered) return;

    if (currentQ.questionType === 'multiple') {
      // SATA: multiple selections allowed
      setSelectedAnswers((prev) => {
        const existing = prev[currentQ.id] || [];
        if (existing.includes(optionIndex)) {
          return { ...prev, [currentQ.id]: existing.filter((i) => i !== optionIndex) };
        } else {
          return { ...prev, [currentQ.id]: [...existing, optionIndex].sort() };
        }
      });
    } else {
      // Single Choice MCQ
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQ.id]: [optionIndex],
      }));
    }
  };

  // Submit Answer to API
  const handleSubmitAnswer = async () => {
    if (!currentQ || currentSelected.length === 0 || isAnswered) return;

    try {
      const res = await fetch('/api/qbank/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          selectedIndices: currentSelected,
          timeSpentSeconds: 30,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAttemptResults((prev) => ({
          ...prev,
          [currentQ.id]: {
            isCorrect: data.isCorrect,
            score: data.score,
            correctIndices: data.correctIndices,
            selectedIndices: currentSelected,
            correctRationale: data.evaluation?.correctRationale || data.correctRationale || '',
            distractors: data.evaluation?.distractors || data.distractors || [],
            clinicalPearl: data.evaluation?.clinicalPearl || data.clinicalPearl || '',
          },
        }));

        // Synchronize in-memory IDs for live counters
        if (data.isCorrect) {
          setDbCorrectIds((prev) => Array.from(new Set([...prev, currentQ.id])));
          setDbIncorrectIds((prev) => prev.filter((id) => id !== currentQ.id));
        } else {
          setDbIncorrectIds((prev) => Array.from(new Set([...prev, currentQ.id])));
          setDbCorrectIds((prev) => prev.filter((id) => id !== currentQ.id));
        }
        setDbAttemptedIds((prev) => Array.from(new Set([...prev, currentQ.id])));
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };

  // Toggle flag with API synchronization
  const handleToggleFlag = async () => {
    if (!currentQId) return;
    const nextState = !isFlagged;

    // Optimistic local update
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQId]: nextState,
    }));

    if (nextState) {
      setDbFlaggedIds((prev) => Array.from(new Set([...prev, currentQId])));
    } else {
      setDbFlaggedIds((prev) => prev.filter((id) => id !== currentQId));
    }

    try {
      await fetch('/api/qbank/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQId }),
      });
    } catch (err) {
      console.warn('Flag API sync notice:', err);
    }
  };

  const handleResetPractice = () => {
    if (confirm('Reset current practice session answers?')) {
      setSelectedAnswers({});
      setAttemptResults({});
      setSecondsElapsed(0);
      setCurrentIndex(0);
    }
  };

  // Calculate score stats for active session
  const answeredKeys = Object.keys(attemptResults);
  const correctCount = answeredKeys.filter((k) => attemptResults[Number(k)]?.isCorrect).length;
  const accuracyPct = answeredKeys.length > 0 ? Math.round((correctCount / answeredKeys.length) * 100) : 0;

  // Handle subscription submit
  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSub(true);
    setSubSuccessMsg('');

    try {
      let screenshotUrl = '';
      if (screenshotFile) {
        const formData = new FormData();
        formData.append('file', screenshotFile);
        const uploadRes = await fetch('/api/enroll', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        screenshotUrl = uploadData.screenshotUrl || '';
      }

      const planMap = {
        '1m': { planName: '1-Month Standard Q-Bank Access', durationDays: 30, price: 3000 },
        '3m': { planName: '3-Month Comprehensive Pass Pack', durationDays: 90, price: 6500 },
        '6m': { planName: '6-Month Mastery & Guarantee Pack', durationDays: 180, price: 11000 },
      };

      const selectedPlan = planMap[subPlan];

      const res = await fetch('/api/qbank/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: selectedPlan.planName,
          durationDays: selectedPlan.durationDays,
          price: selectedPlan.price,
          whatsappNumber: whatsapp,
          paymentScreenshot: screenshotUrl || 'proof_attached',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubSuccessMsg('Your subscription request has been submitted! Our admin team will verify your receipt and activate full access within 2-4 hours.');
      } else {
        alert(data.message || 'Subscription submission failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting request');
    } finally {
      setSubmittingSub(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* ── 1. TOP ACCESS & CONTROLS BAR ── */}
      <section className="bg-slate-900 text-white border-b border-slate-800 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Access Status Pill */}
          <div className="flex items-center gap-3">
            {hasAccess ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Full Q-Bank Access Active ({questions.length} Items across 10 Organ Systems)</span>
                {daysRemaining > 0 && <span className="text-slate-400 font-normal">• {daysRemaining} days remaining</span>}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Free Demo Mode (High-Yield Sample Items)</span>
                </div>
                <button
                  onClick={() => setIsSubModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Unlock All 60 Questions →
                </button>
              </div>
            )}
          </div>

          {/* Practice Session Metrics & Controls */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-300">
            {!sessionStarted && !sessionCompleted ? (
              <button
                onClick={handleStartSession}
                disabled={filteredQuestions.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Questions ({filteredQuestions.length})</span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span className="font-mono font-semibold text-sm text-white">{formatTimer(secondsElapsed)}</span>
                </div>
                <div>
                  Answered:{' '}
                  <span className="font-bold text-white">
                    {answeredKeys.length} / {filteredQuestions.length}
                  </span>
                </div>
                <div>
                  Accuracy:{' '}
                  <span className={`font-bold ${accuracyPct >= 75 ? 'text-emerald-400' : accuracyPct >= 50 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {accuracyPct}%
                  </span>
                </div>
                <button
                  onClick={handlePauseSession}
                  className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Pause session and adjust settings"
                >
                  <Pause className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={handleResetPractice}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Reset current session"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── 2. MAIN WORKSPACE ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1" id="qbankWorkspaceTop">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ── SIDEBAR: FILTERS & QUESTION PALETTE ── */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Start Button Card for Sidebar */}
            <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-500">Practice Session</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${sessionStarted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {sessionStarted ? 'In Progress' : 'Ready'}
                </span>
              </div>

              {!sessionStarted ? (
                <button
                  onClick={handleStartSession}
                  disabled={filteredQuestions.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 p-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Questions ({filteredQuestions.length})</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handlePauseSession}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={handleFinishSession}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finish</span>
                  </button>
                </div>
              )}
            </div>

            {/* Organ System & Format Filter Card */}
            <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Organ System Filter</span>
              </h3>

              {/* Organ System Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>Target Organ Category</span>
                  <span className="text-[11px] text-sky-600 font-bold">{filteredQuestions.length} Items</span>
                </label>
                <select
                  value={selectedOrganSystem}
                  onChange={(e) => {
                    setSelectedOrganSystem(e.target.value);
                    setCurrentIndex(0);
                  }}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {ORGAN_SYSTEMS.map((sys) => (
                    <option key={sys.id} value={sys.id}>
                      {sys.icon} {sys.name} {sys.id !== 'all' ? `(${sys.count})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Format with Mixed as Default */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">Question Format</label>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    SATA + MCQ Mixed
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => { setQuestionFormatFilter('mixed'); setCurrentIndex(0); }}
                    className={`py-1.5 rounded-md transition-colors ${questionFormatFilter === 'mixed' ? 'bg-white font-bold text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    title="Mix Select All That Apply and Single-Choice MCQs"
                  >
                    Mixed
                  </button>
                  <button
                    onClick={() => { setQuestionFormatFilter('single'); setCurrentIndex(0); }}
                    className={`py-1.5 rounded-md transition-colors ${questionFormatFilter === 'single' ? 'bg-white font-bold text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    title="Single-choice MCQs only"
                  >
                    MCQ
                  </button>
                  <button
                    onClick={() => { setQuestionFormatFilter('multiple'); setCurrentIndex(0); }}
                    className={`py-1.5 rounded-md transition-colors ${questionFormatFilter === 'multiple' ? 'bg-white font-bold text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    title="Select All That Apply (SATA) only"
                  >
                    SATA
                  </button>
                </div>
              </div>

              {/* Testing Mode Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800">Exam Mode</div>
                  <div className="text-[11px] text-slate-500">Hide rationales until test end</div>
                </div>
                <button
                  type="button"
                  onClick={() => setExamMode(!examMode)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${examMode ? 'bg-sky-600' : 'bg-slate-300'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${examMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Question Palette Matrix with Status Filter Chips */}
            <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-sky-600" />
                  <span>Question Palette</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {answeredKeys.length} / {filteredQuestions.length} done
                </span>
              </div>

              {/* Palette Status Quick Filter Tabs */}
              <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-100 text-[10px] font-semibold">
                <button
                  onClick={() => setPaletteStatusFilter('all')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  All ({filteredQuestions.length})
                </button>
                <button
                  onClick={() => setPaletteStatusFilter('unanswered')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'unanswered' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Unanswered ({filteredQuestions.filter(q => getQuestionStatus(q.id) === 'unanswered').length})
                </button>
                <button
                  onClick={() => setPaletteStatusFilter('incorrect')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'incorrect' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                >
                  Incorrect ({filteredQuestions.filter(q => getQuestionStatus(q.id) === 'incorrect').length})
                </button>
                <button
                  onClick={() => setPaletteStatusFilter('correct')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'correct' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                  Correct ({filteredQuestions.filter(q => getQuestionStatus(q.id) === 'correct').length})
                </button>
                <button
                  onClick={() => setPaletteStatusFilter('flagged')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'flagged' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                >
                  Flagged ({filteredQuestions.filter(q => isQuestionFlagged(q.id)).length})
                </button>
              </div>

              {/* Palette Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                {paletteItems.map(({ q, originalIndex }) => {
                  const isCurrent = originalIndex === currentIndex;
                  const res = attemptResults[q.id];
                  const qStatus = getQuestionStatus(q.id);
                  const flagged = isQuestionFlagged(q.id);

                  let btnStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';

                  if (res || qStatus !== 'unanswered') {
                    if (qStatus === 'correct') {
                      btnStyle = 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold';
                    } else if (qStatus === 'incorrect') {
                      btnStyle = 'bg-rose-100 border-rose-300 text-rose-800 font-bold';
                    }
                  }
                  
                  if (isCurrent) {
                    btnStyle += ' ring-2 ring-sky-500 border-sky-600';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(originalIndex);
                        if (!sessionStarted) setSessionStarted(true);
                      }}
                      className={`relative h-9 rounded-lg border text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                      title={`Item ${originalIndex + 1}: ${q.organSystem} (${q.questionType === 'multiple' ? 'SATA' : 'MCQ'})`}
                    >
                      <span>{originalIndex + 1}</span>
                      {flagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Palette Legend */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  <span>Correct</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                  <span>Incorrect</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                  <span>Flagged</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200" />
                  <span>Unanswered</span>
                </div>
              </div>
            </div>

            {/* Quick Support Banner */}
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                <span>Need Rationale Clarification?</span>
              </div>
              <p className="text-slate-600">
                Live faculty review sessions take place on Google Meet every Monday & Thursday.
              </p>
              <Link href="/courses" className="text-sky-700 font-semibold hover:underline block pt-1">
                View Class Schedule →
              </Link>
            </div>

          </div>

          {/* ── MAIN TESTING STAGE ── */}
          <div className="lg:col-span-3 space-y-6">
            
            {loading ? (
              <div className="clinical-card bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-600 font-medium">Loading high-yield NCLEX test items across 10 organ systems...</p>
              </div>
            ) : !sessionStarted && !sessionCompleted ? (
              /* ── PRE-SESSION SETUP & START SCREEN ── */
              <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
                
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider">
                      <Target className="w-3.5 h-3.5 text-sky-600" />
                      <span>NextGen NCLEX-RN & SNLE Practice Bank</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Build Your Custom Practice Session
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Filter questions by <strong>Organ Category</strong>, target <strong>Correct/Incorrect/Flagged/Unanswered</strong> items, and experience dynamic <strong>Mixed SATA & MCQ</strong> format.
                    </p>
                  </div>

                  <button
                    onClick={handleStartSession}
                    disabled={filteredQuestions.length === 0}
                    className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.02] active:scale-100 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Questions ({filteredQuestions.length})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. QUESTION STATUS FILTER: Correct, Incorrect, Flagged, Unanswered */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-sky-600" />
                      <span>Filter By Question Status</span>
                    </label>
                    <span className="text-[11px] text-slate-500">Target your weak areas or review mistakes</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {/* All */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'all'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">All Items</span>
                        <Layers className={`w-3.5 h-3.5 ${statusFilter === 'all' ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <div className={`text-lg font-black ${statusFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
                        {liveCounts.all}
                      </div>
                      <div className={`text-[10px] ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Total in system</div>
                    </button>

                    {/* Unanswered */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('unanswered')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'unanswered'
                          ? 'border-sky-600 bg-sky-600 text-white shadow-sm ring-2 ring-sky-600/20'
                          : 'border-slate-200 bg-white hover:border-sky-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">Unanswered</span>
                        <HelpCircle className={`w-3.5 h-3.5 ${statusFilter === 'unanswered' ? 'text-white' : 'text-sky-500'}`} />
                      </div>
                      <div className={`text-lg font-black ${statusFilter === 'unanswered' ? 'text-white' : 'text-sky-700'}`}>
                        {liveCounts.unanswered}
                      </div>
                      <div className={`text-[10px] ${statusFilter === 'unanswered' ? 'text-sky-100' : 'text-slate-500'}`}>Fresh test items</div>
                    </button>

                    {/* Incorrect */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('incorrect')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'incorrect'
                          ? 'border-rose-600 bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/20'
                          : 'border-slate-200 bg-white hover:border-rose-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">Incorrect</span>
                        <XCircle className={`w-3.5 h-3.5 ${statusFilter === 'incorrect' ? 'text-white' : 'text-rose-500'}`} />
                      </div>
                      <div className={`text-lg font-black ${statusFilter === 'incorrect' ? 'text-white' : 'text-rose-600'}`}>
                        {liveCounts.incorrect}
                      </div>
                      <div className={`text-[10px] ${statusFilter === 'incorrect' ? 'text-rose-100' : 'text-slate-500'}`}>Retest mistakes</div>
                    </button>

                    {/* Correct */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('correct')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'correct'
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">Correct</span>
                        <CheckCheck className={`w-3.5 h-3.5 ${statusFilter === 'correct' ? 'text-white' : 'text-emerald-500'}`} />
                      </div>
                      <div className={`text-lg font-black ${statusFilter === 'correct' ? 'text-white' : 'text-emerald-600'}`}>
                        {liveCounts.correct}
                      </div>
                      <div className={`text-[10px] ${statusFilter === 'correct' ? 'text-emerald-100' : 'text-slate-500'}`}>Reinforce mastery</div>
                    </button>

                    {/* Flagged */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('flagged')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'flagged'
                          ? 'border-amber-500 bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:border-amber-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">Flagged</span>
                        <Flag className={`w-3.5 h-3.5 ${statusFilter === 'flagged' ? 'text-white' : 'text-amber-500'}`} />
                      </div>
                      <div className={`text-lg font-black ${statusFilter === 'flagged' ? 'text-white' : 'text-amber-600'}`}>
                        {liveCounts.flagged}
                      </div>
                      <div className={`text-[10px] ${statusFilter === 'flagged' ? 'text-amber-100' : 'text-slate-500'}`}>Bookmarked items</div>
                    </button>
                  </div>
                </div>

                {/* 2. ORGAN CATEGORIES: 10 Systems Grid */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="text-base">🫀</span>
                      <span>Select Organ System Category:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedOrganSystem('all')}
                      className={`text-xs font-semibold hover:underline ${selectedOrganSystem === 'all' ? 'text-sky-600 font-bold' : 'text-slate-500'}`}
                    >
                      Reset to All Systems
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {ORGAN_SYSTEMS.map((sys) => {
                      const isSelected = selectedOrganSystem === sys.id;
                      return (
                        <button
                          key={sys.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrganSystem(sys.id);
                            setCurrentIndex(0);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected 
                              ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-sm' 
                              : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className="text-xl">{sys.icon}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                              {sys.count} items
                            </span>
                          </div>
                          <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-sky-950 font-black' : 'text-slate-800'}`}>
                            {sys.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. QUESTION FORMAT: MIXED SATA + MCQ, Single MCQ, or SATA Only */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Question Format & Type:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setQuestionFormatFilter('mixed')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        questionFormatFilter === 'mixed'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Mixed (MCQ + SATA)</span>
                        </span>
                        <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Smoothly alternates Select All That Apply and single-choice MCQs for true NCLEX simulation.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuestionFormatFilter('single')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        questionFormatFilter === 'single'
                          ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full border border-sky-600 flex items-center justify-center text-[8px] text-sky-600 font-bold">1</span>
                          <span>Single-Choice MCQs</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Traditional 4-option single correct response items with clinical distractor traps.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuestionFormatFilter('multiple')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        questionFormatFilter === 'multiple'
                          ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                          <span>SATA (Select All That Apply)</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        High-difficulty multi-select items testing clinical priority, contraindications, and teaching.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 4. Session Mode Selector (Practice vs Timed Mock) */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Choose Testing Mode:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setExamMode(false)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        !examMode 
                          ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-sky-600" />
                          <span>Practice / Tutor Mode</span>
                        </span>
                        {!examMode && <span className="w-2 h-2 rounded-full bg-sky-600" />}
                      </div>
                      <p className="text-xs text-slate-600">
                        Instant Saunders rationales and clinical pearls display immediately after each question submit.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExamMode(true)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        examMode 
                          ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Timed Mock Exam Mode</span>
                        </span>
                        {examMode && <span className="w-2 h-2 rounded-full bg-sky-600" />}
                      </div>
                      <p className="text-xs text-slate-600">
                        Simulates live CAT exam conditions. Rationales and scores are hidden until the entire test is submitted.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 5. Question Set Size */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    How Many Questions Do You Want In This Session?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { val: 5, label: '5 Questions (Quick Review)' },
                      { val: 10, label: '10 Questions (Standard)' },
                      { val: 25, label: '25 Questions (Intensive)' },
                      { val: 'all', label: `All Available (${filteredQuestions.length})` }
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => setQuestionLimit(opt.val as any)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          questionLimit === opt.val
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button Bar */}
                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    <span>Target: </span>
                    <strong className="text-slate-800">{selectedOrganSystem === 'all' ? 'All 10 Organ Systems' : selectedOrganSystem}</strong>
                    <span> • Status: </span>
                    <strong className="text-slate-800 capitalize">{statusFilter}</strong>
                    <span> • Ready: </span>
                    <strong className="text-sky-600">{filteredQuestions.length} Questions</strong>
                  </div>

                  <button
                    onClick={handleStartSession}
                    disabled={filteredQuestions.length === 0}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.02] active:scale-100 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Questions ({filteredQuestions.length} Items)</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

              </div>
            ) : sessionCompleted ? (
              /* ── SESSION COMPLETED SUMMARY SCREEN ── */
              <div className="clinical-card bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 text-center space-y-6 shadow-sm">
                
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                  <Award className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    Session Complete
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Practice Test Finished!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Review your clinical decision metrics and distractor safety breakdown below.
                  </p>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-left">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 font-semibold uppercase">Final Accuracy</div>
                    <div className={`text-2xl font-black mt-1 ${accuracyPct >= 75 ? 'text-emerald-600' : accuracyPct >= 50 ? 'text-amber-600' : 'text-slate-800'}`}>
                      {accuracyPct}%
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 font-semibold uppercase">Correct Items</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">
                      {correctCount} / {answeredKeys.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 font-semibold uppercase">Time Spent</div>
                    <div className="text-2xl font-black text-sky-600 mt-1">
                      {formatTimer(secondsElapsed)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 font-semibold uppercase">Flagged For Review</div>
                    <div className="text-2xl font-black text-amber-600 mt-1">
                      {Object.values(flaggedQuestions).filter(Boolean).length}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleRestartNewSession}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Another Questions Session</span>
                  </button>

                  <button
                    onClick={() => {
                      setSessionCompleted(false);
                      setSessionStarted(true);
                      setCurrentIndex(0);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <span>Review Questions & Rationales</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ) : currentQ ? (
              <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
                
                {/* Stage Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 text-xs font-bold rounded-md bg-slate-900 text-white">
                      Item {currentIndex + 1} of {filteredQuestions.length}
                    </span>
                    {/* Organ System Badge */}
                    <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                      <span>🫀</span>
                      <span>{currentQ.organSystem || 'General Clinical'}</span>
                    </span>
                    {/* Format Badge: SATA or MCQ */}
                    <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase ${currentQ.questionType === 'multiple' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'}`}>
                      {currentQ.questionType === 'multiple' ? 'SATA (Multi-Select)' : 'MCQ (Single)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleFlag}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        isFlagged 
                          ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                      <span>{isFlagged ? 'Flagged' : 'Flag Item'}</span>
                    </button>

                    <button
                      onClick={handleFinishSession}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Finish session and view results"
                    >
                      Finish Test
                    </button>
                  </div>
                </div>

                {/* SATA Notification Banner if Multiple Response */}
                {currentQ.questionType === 'multiple' && (
                  <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      Select All That Apply (SATA): This item has multiple correct answers. Select all clinical options that apply.
                    </span>
                  </div>
                )}

                {/* Clinical Stem Vignette */}
                <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                  {currentQ.statement}
                </div>

                {/* Option Choices */}
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((optText, optIdx) => {
                    const isSelected = currentSelected.includes(optIdx);
                    const hasResult = currentResult !== undefined;
                    const isCorrect = hasResult && currentResult.correctIndices.includes(optIdx);

                    let itemStyle = 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/20 text-slate-800';
                    let boxIcon = currentQ.questionType === 'multiple' ? (
                      <Square className="w-4 h-4 text-slate-400" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400" />
                    );

                    if (hasResult && !examMode) {
                      if (isCorrect) {
                        itemStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium';
                        boxIcon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                      } else if (isSelected && !isCorrect) {
                        itemStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                        boxIcon = <XCircle className="w-4 h-4 text-rose-500" />;
                      } else {
                        itemStyle = 'border-slate-100 bg-slate-50 text-slate-400 opacity-60';
                      }
                    } else if (isSelected) {
                      itemStyle = 'border-sky-600 bg-sky-50/70 text-sky-950 ring-2 ring-sky-500/20';
                      boxIcon = currentQ.questionType === 'multiple' ? (
                        <CheckSquare className="w-4 h-4 text-sky-600" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-sky-600 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                      );
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleOptionToggle(optIdx)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${itemStyle}`}
                      >
                        <span className="pt-0.5 shrink-0">{boxIcon}</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 shrink-0 pt-0.5">
                          <span>{String.fromCharCode(65 + optIdx)}.</span>
                        </div>
                        <span className="text-sm sm:text-base leading-relaxed">{optText}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Action Buttons: Submit / Prev / Next */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                      disabled={currentIndex === filteredQuestions.length - 1}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {!isAnswered ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={currentSelected.length === 0}
                      className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-all cursor-pointer"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${currentResult?.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {currentResult?.isCorrect ? '✓ Correct Answer' : '✗ Incorrect Response'}
                      </span>
                      {currentIndex === filteredQuestions.length - 1 ? (
                        <button
                          onClick={handleFinishSession}
                          className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Finish & View Score</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentIndex((prev) => prev + 1)}
                          className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer"
                        >
                          Next Question →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Saunders Rationale Section (Practice Mode) */}
                {isAnswered && !examMode && currentResult && (
                  <div className="mt-8 pt-6 border-t border-slate-200 space-y-4 animate-in fade-in-50 duration-200">
                    
                    {/* Correct Rationale Box */}
                    <div className="p-5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Saunders 9th Edition Clinical Rationale</span>
                      </div>
                      <p className="text-sm text-emerald-950 leading-relaxed">
                        {currentResult.correctRationale}
                      </p>
                    </div>

                    {/* Clinical Pearl Box */}
                    {currentResult.clinicalPearl && (
                      <div className="p-5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                          <Flame className="w-4 h-4 text-amber-600" />
                          <span>Clinical Exam Pearl</span>
                        </div>
                        <p className="text-sm text-amber-950 leading-relaxed">
                          {currentResult.clinicalPearl}
                        </p>
                      </div>
                    )}

                    {/* Distractor Analysis */}
                    {currentResult.distractors && currentResult.distractors.length > 0 && (
                      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Distractor Clinical Traps & Patient Safety:
                        </div>
                        <ul className="space-y-2 text-xs text-slate-600">
                          {currentResult.distractors.map((d, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-2.5">
                              <span className="text-rose-500 font-bold mt-0.5">•</span>
                              <span className="leading-relaxed">{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>
                )}

              </div>
            ) : (
              <div className="clinical-card bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="text-slate-600 font-medium">No questions found matching your filter criteria.</p>
                <button
                  onClick={() => { setSelectedOrganSystem('all'); setStatusFilter('all'); setQuestionFormatFilter('mixed'); }}
                  className="px-4 py-2 text-xs font-semibold bg-sky-600 text-white rounded-lg cursor-pointer"
                >
                  Clear Filters & Reset
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ── 3. SUBSCRIPTION / UPGRADE MODAL ── */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Unlock Full Q-Bank Access
                </h3>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subSuccessMsg ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Request Submitted!</h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto">{subSuccessMsg}</p>
                <button
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-lg cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubscribeSubmit} className="space-y-6 pt-4">
                
                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Access Duration
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${subPlan === '1m' ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="plan"
                        value="1m"
                        checked={subPlan === '1m'}
                        onChange={() => setSubPlan('1m')}
                        className="sr-only"
                      />
                      <div className="text-xs font-bold text-slate-900">1 Month</div>
                      <div className="text-sm font-black text-sky-600 mt-1">PKR 3,000</div>
                    </label>

                    <label className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${subPlan === '3m' ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="plan"
                        value="3m"
                        checked={subPlan === '3m'}
                        onChange={() => setSubPlan('3m')}
                        className="sr-only"
                      />
                      <div className="text-xs font-bold text-slate-900">3 Months</div>
                      <div className="text-sm font-black text-sky-600 mt-1">PKR 6,500</div>
                    </label>

                    <label className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${subPlan === '6m' ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="plan"
                        value="6m"
                        checked={subPlan === '6m'}
                        onChange={() => setSubPlan('6m')}
                        className="sr-only"
                      />
                      <div className="text-xs font-bold text-slate-900">6 Months</div>
                      <div className="text-sm font-black text-sky-600 mt-1">PKR 11,000</div>
                    </label>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
                  <div className="font-bold text-slate-900">Bank Transfer / Sadapay / Nayapay:</div>
                  <div className="font-mono bg-white p-2 rounded border border-slate-200 space-y-1">
                    <div>Bank: Sadapay / Meezan Bank</div>
                    <div>Account Title: Simple NCLEX Academy</div>
                    <div>Account / IBAN: PK45SADA0000001234567890</div>
                    <div>JazzCash / EasyPaisa: 0300-1234567</div>
                  </div>
                </div>

                {/* WhatsApp & Proof */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      WhatsApp Number (for instant activation)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+92 300 1234567"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Upload Payment Screenshot / Receipt
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshotFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                    />
                  </div>
                </div>

                {/* Notice for Course Students */}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-900">
                  💡 Note: Enrolled students in any of our Live Courses receive 100% full Q-Bank access for free automatically.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSubModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSub}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {submittingSub ? 'Submitting...' : 'Confirm Subscription Request'}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
