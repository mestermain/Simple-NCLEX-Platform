'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  Flame, 
  CheckSquare, 
  Square, 
  HelpCircle,
  Upload,
  Check,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';

interface Question {
  id: number;
  category: string;
  difficulty: string;
  examType: string;
  clientNeed: string;
  statement: string;
  options: string[];
  questionType: 'single' | 'multiple';
  isMultipleResponse: boolean;
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

export default function QBankPage() {
  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  const [attemptResults, setAttemptResults] = useState<Record<number, AttemptResult>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  
  // Access state
  const [hasAccess, setHasAccess] = useState(false);
  const [accessType, setAccessType] = useState('demo');
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [userRole, setUserRole] = useState('guest');
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Filters & Modes
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'single' | 'multiple'>('all');
  const [examMode, setExamMode] = useState(false); // false = Practice Mode (instant feedback), true = Exam Mode

  // Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Subscription form
  const [subPlan, setSubPlan] = useState<'1m' | '3m' | '6m'>('1m');
  const [whatsapp, setWhatsapp] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState('');

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

        // 2. Fetch questions
        const qRes = await fetch('/api/qbank/questions');
        const qData = await qRes.json();

        if (qData.success && qData.questions) {
          setQuestions(qData.questions);
        }
      } catch (err) {
        console.error('Error loading QBank:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered questions
  const filteredQuestions = questions.filter((q) => {
    if (selectedCategory !== 'all' && !q.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }
    if (questionTypeFilter === 'single' && q.questionType !== 'single') return false;
    if (questionTypeFilter === 'multiple' && q.questionType !== 'multiple') return false;
    return true;
  });

  const currentQ = filteredQuestions[currentIndex] || filteredQuestions[0];
  const currentQId = currentQ?.id;
  const currentSelected = (currentQId && selectedAnswers[currentQId]) || [];
  const currentResult = currentQId ? attemptResults[currentQId] : undefined;
  const isAnswered = currentResult !== undefined;
  const isFlagged = currentQId ? !!flaggedQuestions[currentQId] : false;

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
            correctRationale: data.evaluation?.correctRationale || '',
            distractors: data.evaluation?.distractors || [],
            clinicalPearl: data.evaluation?.clinicalPearl || '',
          },
        }));
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };

  const handleToggleFlag = () => {
    if (!currentQId) return;
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQId]: !prev[currentQId],
    }));
  };

  const handleResetPractice = () => {
    if (confirm('Reset current practice session answers?')) {
      setSelectedAnswers({});
      setAttemptResults({});
      setFlaggedQuestions({});
      setSecondsElapsed(0);
      setCurrentIndex(0);
    }
  };

  // Calculate score stats
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

  const categories = [
    { id: 'all', name: 'All Specialties' },
    { id: 'pharmacology', name: 'Pharmacology' },
    { id: 'management', name: 'Management of Care & Priority' },
    { id: 'physiological', name: 'Physiological Adaptation & Med-Surg' },
    { id: 'reduction', name: 'Reduction of Risk Potential' },
    { id: 'infection', name: 'Safety & Infection Control' },
  ];

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
                <span>Full Q-Bank Access Active ({questions.length} Items)</span>
                {daysRemaining > 0 && <span className="text-slate-400 font-normal">• {daysRemaining} days remaining</span>}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Free Demo Mode (5 High-Yield Sample Items)</span>
                </div>
                <button
                  onClick={() => setIsSubModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shadow-sm"
                >
                  Unlock All 60+ Questions →
                </button>
              </div>
            )}
          </div>

          {/* Practice Session Metrics */}
          <div className="flex items-center gap-6 text-xs text-slate-300">
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
              onClick={handleResetPractice}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              title="Reset current session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

        </div>
      </section>

      {/* ── 2. MAIN WORKSPACE ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ── SIDEBAR: FILTERS & QUESTION PALETTE ── */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Filter Card */}
            <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Practice Filters</span>
              </h3>

              {/* Specialty Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Clinical Specialty</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentIndex(0);
                  }}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Question Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Question Format</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => { setQuestionTypeFilter('all'); setCurrentIndex(0); }}
                    className={`py-1.5 rounded-md transition-colors ${questionTypeFilter === 'all' ? 'bg-white font-bold text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => { setQuestionTypeFilter('single'); setCurrentIndex(0); }}
                    className={`py-1.5 rounded-md transition-colors ${questionTypeFilter === 'single' ? 'bg-white font-bold text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    MCQ
                  </button>
                  <button
                    onClick={() => { setQuestionTypeFilter('multiple'); setCurrentIndex(0); }}
                    className={`py-1.5 rounded-md transition-colors ${questionTypeFilter === 'multiple' ? 'bg-white font-bold text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    SATA
                  </button>
                </div>
              </div>

              {/* Mode Toggle */}
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

            {/* Question Palette Matrix */}
            <div className="clinical-card bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Question Palette ({filteredQuestions.length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  {answeredKeys.length} completed
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                {filteredQuestions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const res = attemptResults[q.id];
                  const flagged = flaggedQuestions[q.id];

                  let btnStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';

                  if (res) {
                    if (res.isCorrect) {
                      btnStyle = 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold';
                    } else {
                      btnStyle = 'bg-rose-100 border-rose-300 text-rose-800 font-bold';
                    }
                  } else if (isCurrent) {
                    btnStyle = 'border-sky-600 bg-sky-50 text-sky-700 font-bold ring-2 ring-sky-500/30';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative h-9 rounded-lg border text-xs font-medium flex items-center justify-center transition-all ${btnStyle}`}
                    >
                      <span>{idx + 1}</span>
                      {flagged && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
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
                <p className="text-sm text-slate-600 font-medium">Loading high-yield NCLEX test items...</p>
              </div>
            ) : currentQ ? (
              <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
                
                {/* Stage Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-bold rounded-md bg-slate-900 text-white">
                      Item {currentIndex + 1} of {filteredQuestions.length}
                    </span>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                      {currentQ.category}
                    </span>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                      {currentQ.examType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleFlag}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        isFlagged 
                          ? 'bg-amber-50 text-amber-800 border-amber-300' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                      <span>{isFlagged ? 'Flagged' : 'Flag Item'}</span>
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
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${itemStyle}`}
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
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                      disabled={currentIndex === filteredQuestions.length - 1}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {!isAnswered ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={currentSelected.length === 0}
                      className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-all"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${currentResult?.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {currentResult?.isCorrect ? '✓ Correct Answer' : '✗ Incorrect Response'}
                      </span>
                      {currentIndex < filteredQuestions.length - 1 && (
                        <button
                          onClick={() => setCurrentIndex((prev) => prev + 1)}
                          className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
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
                  onClick={() => { setSelectedCategory('all'); setQuestionTypeFilter('all'); }}
                  className="px-4 py-2 text-xs font-semibold bg-sky-600 text-white rounded-lg"
                >
                  Clear Filters
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
                className="text-slate-400 hover:text-slate-600 p-1"
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
                  className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-lg"
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
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSub}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm disabled:opacity-50"
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
