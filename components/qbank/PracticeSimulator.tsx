'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  RefreshCw,
  Calculator,
  Highlighter,
  Strikethrough,
  FileText,
  AlertCircle
} from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';
import DemoBadge from '@/components/DemoBadge';
import CalculatorModal from '@/components/CalculatorModal';
import ReportProblemModal from '@/components/ReportProblemModal';
import MatrixQuestion from '@/components/ngn/MatrixQuestion';
import ClozeQuestion from '@/components/ngn/ClozeQuestion';
import DragDropQuestion from '@/components/ngn/DragDropQuestion';
import BowtieQuestion from '@/components/ngn/BowtieQuestion';
import CaseStudyQuestion from '@/components/ngn/CaseStudyQuestion';
import CatSimulationBanner from '@/components/ngn/CatSimulationBanner';
import SubscriptionModal from '@/components/qbank/SubscriptionModal';

interface Question {
  id: number;
  category: string;
  organSystem: string;
  bodySystem?: string;
  difficulty: string;
  examType: string;
  clientNeed: string;
  statement: string;
  stem?: string;
  options: any;
  questionType: 'single' | 'multiple';
  type?: 'MCQ' | 'SATA' | 'MATRIX' | 'CLOZE' | 'DRAG_DROP' | 'BOWTIE' | 'CASE_STUDY';
  isMultipleResponse?: boolean;
  correctIndices?: number[];
  correctIndex?: number;
  correctAnswers?: any;
  correctRationale?: string;
  clinicalPearl?: string;
  distractors?: any;
  rationalePerOption?: any;
  caseStudyData?: any;
}

interface AttemptResult {
  isCorrect: boolean;
  score: number;
  correctIndices: number[];
  selectedIndices: any;
  correctAnswers?: any;
  correctRationale: string;
  distractors: any;
  rationalePerOption?: any;
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

export interface PracticeSimulatorProps {
  initialMode?: 'tutor' | 'exam' | 'cat';
  initialCount?: number;
  initialSystem?: string;
  initialStatus?: string;
  autoStart?: boolean;
  onExit?: () => void;
}

export default function PracticeSimulator({
  initialMode,
  initialCount,
  initialSystem,
  initialStatus,
  autoStart = false,
  onExit,
}: PracticeSimulatorProps = {}) {
  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
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
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  // Phase 6 Exam Tools & State
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportQuestionTarget, setReportQuestionTarget] = useState<{ id: number; stem: string } | null>(null);
  const [strikethroughMode, setStrikethroughMode] = useState(false);
  const [struckOptions, setStruckOptions] = useState<Record<number, number[]>>({});
  const [highlighterMode, setHighlighterMode] = useState(false);
  const [highlightedQuestions, setHighlightedQuestions] = useState<Record<number, boolean>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteToast, setNoteToast] = useState('');
  const [flashcardToast, setFlashcardToast] = useState('');

  // Active DB Session (for resume & autosave)
  const [activeDbSession, setActiveDbSession] = useState<any>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Filters & Modes
  const [selectedTrack, setSelectedTrack] = useState<string>('all'); // 'all' | 'RN' | 'PN' | 'DHA' | 'HAAD' | 'SNLE'
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all'); // 'all' | 'easy' | 'medium' | 'hard'
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('all');
  const [selectedOrganSystem, setSelectedOrganSystem] = useState<string>(initialSystem || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unanswered' | 'incorrect' | 'correct' | 'flagged'>((initialStatus as any) || 'all');
  const [paletteStatusFilter, setPaletteStatusFilter] = useState<'all' | 'unanswered' | 'incorrect' | 'correct' | 'flagged'>('all');
  const [questionFormatFilter, setQuestionFormatFilter] = useState<'mixed' | 'single' | 'multiple'>('mixed');
  const [examMode, setExamMode] = useState(initialMode === 'exam' || initialMode === 'cat'); // false = Practice Mode (instant rationales), true = Timed Exam Mode
  const [questionLimit, setQuestionLimit] = useState<number | 'all'>(initialCount || 'all');

  // Phase 7: CAT (Computerized Adaptive Testing) Simulation State
  const [isCatMode, setIsCatMode] = useState(initialMode === 'cat');
  const [catTheta, setCatTheta] = useState(0.0);
  const [catConfidenceMargin, setCatConfidenceMargin] = useState(0.80);
  const [catEarlyPassed, setCatEarlyPassed] = useState(false);

  // Session lifecycle
  const [sessionStarted, setSessionStarted] = useState(autoStart);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(autoStart);

  // Subscription form
  const [subPlan, setSubPlan] = useState<'1m' | '3m' | '6m'>('1m');
  const [whatsapp, setWhatsapp] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState('');

  // Check URL parameters for direct start, category, mode, or subscription modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('start') === 'true') {
        setSessionStarted(true);
        setTimerRunning(true);
      }
      if (params.get('mode') === 'exam') {
        setExamMode(true);
      } else if (params.get('mode') === 'cat') {
        setIsCatMode(true);
        setExamMode(true);
      } else if (params.get('mode') === 'sata') {
        setQuestionFormatFilter('multiple');
      }
      if (params.get('count') || params.get('limit')) {
        const cnt = parseInt(params.get('count') || params.get('limit') || '0', 10);
        if (cnt > 0) setQuestionLimit(cnt);
      }
      if (params.get('track')) {
        setSelectedTrack(params.get('track')!);
      }
      if (params.get('category')) {
        setSelectedCategory(params.get('category')!);
      }
      if (params.get('organ')) {
        setSelectedOrganSystem(params.get('organ')!);
      }
      if (params.get('subscribe') === 'true' || params.get('subscribe')) {
        setIsSubModalOpen(true);
      }
      if (params.get('status')) {
        const s = params.get('status') as any;
        if (['all', 'unanswered', 'incorrect', 'correct', 'flagged'].includes(s)) {
          setStatusFilter(s);
        }
      }
    }
  }, []);

  // Fetch access, questions & active session check
  const loadData = useCallback(async () => {
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

      // 2. Check for active in-progress session
      try {
        const activeRes = await fetch('/api/qbank/sessions?active=true');
        const activeData = await activeRes.json();
        if (activeData.success && activeData.session) {
          setActiveDbSession(activeData.session);
        }
      } catch (_) {}

      // 3. Fetch questions and user progress
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Live Status Counts across the whole bank or current organ/category filter
  const liveCounts = useMemo(() => {
    let base = questions;
    if (selectedCategory !== 'all') {
      const target = selectedCategory.toLowerCase();
      base = base.filter(q => (q.category || '').toLowerCase().includes(target) || (q.clientNeed || '').toLowerCase().includes(target));
    }
    if (selectedOrganSystem !== 'all') {
      base = base.filter(q => (q.organSystem || '').toLowerCase().includes(selectedOrganSystem.toLowerCase()));
    }

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
  }, [questions, selectedOrganSystem, selectedCategory, attemptResults, flaggedQuestions, dbCorrectIds, dbIncorrectIds, dbFlaggedIds]);

  // Build the active practice session questions:
  // 1. Category / Client Needs Filter
  // 2. Organ System Filter
  // 3. Status Filter (All, Unanswered, Incorrect, Correct, Flagged)
  // 4. Mixed Question Logic: Smoothly interleave SATA and single MCQs!
  const filteredQuestions = useMemo(() => {
    let pool = questions.filter((q: any) => {
      // Exam Track Filter
      if (selectedTrack !== 'all') {
        const tr = (q.examTrack || q.examType || '').toUpperCase();
        if (!tr.includes(selectedTrack.toUpperCase())) return false;
      }

      // Difficulty Filter
      if (selectedDifficulty !== 'all') {
        const diff = (q.difficulty || '').toLowerCase();
        if (diff !== selectedDifficulty.toLowerCase()) return false;
      }

      // Question Type Filter
      if (selectedQuestionType !== 'all') {
        const qType = (q.type || q.questionType || '').toUpperCase();
        if (selectedQuestionType === 'MCQ' && qType !== 'MCQ' && qType !== 'SINGLE') return false;
        if (selectedQuestionType === 'SATA' && qType !== 'SATA' && qType !== 'MULTIPLE') return false;
        if (selectedQuestionType !== 'MCQ' && selectedQuestionType !== 'SATA' && qType !== selectedQuestionType) return false;
      }

      // Category & Client Needs
      if (selectedCategory !== 'all') {
        const qCat = (q.category || '').toLowerCase();
        const qNeed = (q.clientNeed || q.clientNeedsCategory || '').toLowerCase();
        const target = selectedCategory.toLowerCase();
        if (!qCat.includes(target) && !qNeed.includes(target)) {
          return false;
        }
      }

      // Organ System
      if (selectedOrganSystem !== 'all') {
        const qOrgan = (q.organSystem || q.bodySystem || '').toLowerCase();
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
  }, [questions, selectedTrack, selectedDifficulty, selectedQuestionType, selectedOrganSystem, selectedCategory, statusFilter, questionFormatFilter, questionLimit, attemptResults, flaggedQuestions, dbCorrectIds, dbIncorrectIds, dbFlaggedIds]);

  // Sidebar Question Palette Items
  const paletteItems = useMemo(() => {
    return filteredQuestions.map((q, idx) => ({ q, originalIndex: idx }))
      .filter(({ q }) => {
        if (paletteStatusFilter === 'all') return true;
        if (paletteStatusFilter === 'flagged') return isQuestionFlagged(q.id);
        return getQuestionStatus(q.id) === paletteStatusFilter;
      });
  }, [filteredQuestions, paletteStatusFilter, attemptResults, flaggedQuestions, dbCorrectIds, dbIncorrectIds, dbFlaggedIds]);

  // Session lifecycle handlers
  const handleStartSession = async () => {
    if (filteredQuestions.length === 0) return;
    setCurrentIndex(0);
    setSessionStarted(true);
    setSessionCompleted(false);
    setTimerRunning(true);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('qbankWorkspaceTop');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    try {
      const res = await fetch('/api/qbank/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${selectedTrack !== 'all' ? selectedTrack : 'NCLEX'} Practice Test`,
          mode: examMode ? 'timed' : 'tutor',
          examTrack: selectedTrack !== 'all' ? selectedTrack : 'RN',
          questionIds: filteredQuestions.map(q => q.id),
          filters: {
            track: selectedTrack,
            organSystem: selectedOrganSystem,
            category: selectedCategory,
            format: questionFormatFilter,
          },
          timeLimitSeconds: examMode ? filteredQuestions.length * 90 : 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (_) {}
  };

  const handleResumeActiveSession = () => {
    if (!activeDbSession) return;
    const qIds = activeDbSession.questionIds || [];
    if (qIds.length > 0) {
      const matched = questions.filter(q => qIds.includes(q.id));
      if (matched.length > 0) {
        setSessionId(activeDbSession.id);
        setCurrentIndex(Math.min(activeDbSession.current_question_index || 0, matched.length - 1));
        setSecondsElapsed(activeDbSession.time_spent_seconds || 0);
        setSessionStarted(true);
        setSessionCompleted(false);
        setTimerRunning(true);
        setActiveDbSession(null);
      }
    }
  };

  const handleNavigateQuestion = (newIndex: number) => {
    setCurrentIndex(newIndex);
    if (sessionId) {
      fetch('/api/qbank/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          currentIndex: newIndex,
          timeSpentSeconds: secondsElapsed,
          status: 'in_progress',
        }),
      }).catch(() => {});
    }
  };

  const handlePauseSession = () => {
    setSessionStarted(false);
    setTimerRunning(false);
    if (sessionId) {
      fetch('/api/qbank/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          currentIndex,
          timeSpentSeconds: secondsElapsed,
          status: 'in_progress',
        }),
      }).catch(() => {});
    }
  };

  const handleFinishSession = () => {
    setSessionCompleted(true);
    setTimerRunning(false);
    if (sessionId) {
      const answeredKeys = Object.keys(attemptResults);
      const correct = answeredKeys.filter((k) => attemptResults[Number(k)]?.isCorrect).length;
      const pct = answeredKeys.length > 0 ? Math.round((correct / answeredKeys.length) * 100) : 0;
      fetch('/api/qbank/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          status: 'completed',
          scorePercentage: pct,
          correctCount: correct,
          timeSpentSeconds: secondsElapsed,
        }),
      }).catch(() => {});
    }
  };

  const handleRestartNewSession = () => {
    setSelectedAnswers({});
    setAttemptResults({});
    setFlaggedQuestions({});
    setStruckOptions({});
    setSecondsElapsed(0);
    setCurrentIndex(0);
    setSessionStarted(false);
    setSessionCompleted(false);
    setTimerRunning(false);
    setSessionId(null);
  };

  const currentQ = filteredQuestions[currentIndex] || filteredQuestions[0];
  const currentQId = currentQ?.id;
  const currentSelected = currentQId && selectedAnswers[currentQId] !== undefined ? selectedAnswers[currentQId] : (currentQ?.type === 'MATRIX' || currentQ?.type === 'CLOZE' || currentQ?.type === 'BOWTIE' ? {} : []);
  const currentResult = currentQId ? attemptResults[currentQId] : undefined;
  const isAnswered = currentResult !== undefined;
  const isFlagged = currentQId ? isQuestionFlagged(currentQId) : false;

  const hasAnswerSelected = useMemo(() => {
    if (currentSelected === undefined || currentSelected === null) return false;
    if (currentQ?.type === 'DRAG_DROP') {
      return Array.isArray(currentQ.options) && currentQ.options.length > 0;
    }
    if (Array.isArray(currentSelected)) return currentSelected.length > 0;
    if (typeof currentSelected === 'object') {
      if (currentQ?.type === 'BOWTIE') {
        return Boolean(
          (currentSelected.actionsToTake?.length || 0) > 0 &&
          currentSelected.potentialCondition !== undefined &&
          (currentSelected.parametersToMonitor?.length || 0) > 0
        );
      }
      if (currentQ?.type === 'MATRIX') {
        const rows = currentQ.options?.rows || [];
        return rows.length > 0 && Object.keys(currentSelected).length === rows.length;
      }
      if (currentQ?.type === 'CLOZE') {
        const drops = Object.keys(currentQ.options?.dropdowns || {});
        return drops.length > 0 && Object.keys(currentSelected).length === drops.length;
      }
      return Object.keys(currentSelected).length > 0;
    }
    return Boolean(currentSelected);
  }, [currentSelected, currentQ]);

  // Strikethrough & Answer selection handler
  const handleOptionClick = (optionIndex: number) => {
    if (!currentQ || isAnswered) return;

    if (strikethroughMode) {
      // Toggle strikethrough on this option
      setStruckOptions((prev) => {
        const existing = prev[currentQ.id] || [];
        if (existing.includes(optionIndex)) {
          return { ...prev, [currentQ.id]: existing.filter(i => i !== optionIndex) };
        } else {
          return { ...prev, [currentQ.id]: [...existing, optionIndex] };
        }
      });
      return;
    }

    if (currentQ.questionType === 'multiple' || currentQ.type === 'SATA') {
      setSelectedAnswers((prev) => {
        const existing = Array.isArray(prev[currentQ.id]) ? prev[currentQ.id] : [];
        if (existing.includes(optionIndex)) {
          return { ...prev, [currentQ.id]: existing.filter((i: number) => i !== optionIndex) };
        } else {
          return { ...prev, [currentQ.id]: [...existing, optionIndex].sort() };
        }
      });
    } else {
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQ.id]: [optionIndex],
      }));
    }
  };

  // Standard MCQ / SATA option buttons renderer
  const renderStandardOptions = () => {
    if (!currentQ || !Array.isArray(currentQ.options)) return null;
    const selectedArr = Array.isArray(currentSelected) ? currentSelected : [];

    return (
      <div className="space-y-3 pt-2">
        {currentQ.options.map((optText: string, optIdx: number) => {
          const isSelected = selectedArr.includes(optIdx);
          const hasResult = currentResult !== undefined;
          const isCorrect = hasResult && currentResult.correctIndices.includes(optIdx);
          const isStruck = currentQ && (struckOptions[currentQ.id] || []).includes(optIdx);

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
              onClick={() => handleOptionClick(optIdx)}
              disabled={isAnswered && !strikethroughMode}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                isStruck ? 'line-through opacity-45 decoration-slate-400 bg-slate-50 border-slate-200 text-slate-400' : itemStyle
              }`}
            >
              <span className="pt-0.5 shrink-0">{boxIcon}</span>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 shrink-0 pt-0.5">
                <span>{String.fromCharCode(65 + optIdx)}.</span>
              </div>
              <span className={`text-sm sm:text-base leading-relaxed ${isStruck ? 'line-through decoration-slate-400' : ''}`}>
                {optText}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!sessionStarted || sessionCompleted) return;
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setIsCalcOpen(prev => !prev);
      } else if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleToggleFlag();
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        if (currentIndex < filteredQuestions.length - 1) {
          handleNavigateQuestion(currentIndex + 1);
        }
      } else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (currentIndex > 0) {
          handleNavigateQuestion(currentIndex - 1);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionStarted, sessionCompleted, currentIndex, filteredQuestions.length]);

  // Notes API handlers
  const handleOpenNotes = async () => {
    setNotesOpen(prev => !prev);
    if (!notesOpen && currentQId) {
      try {
        const res = await fetch(`/api/qbank/notes?questionId=${currentQId}`);
        const data = await res.json();
        if (data.success) {
          setCurrentNote(data.note || '');
        }
      } catch (_) {}
    }
  };

  const handleSaveNote = async () => {
    if (!currentQId) return;
    setSavingNote(true);
    try {
      const res = await fetch('/api/qbank/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQId, content: currentNote }),
      });
      const data = await res.json();
      if (data.success) {
        setNoteToast('Note saved!');
        setTimeout(() => setNoteToast(''), 2000);
      }
    } catch (_) {}
    finally {
      setSavingNote(false);
    }
  };

  // Flashcard API handler
  const handleCreateFlashcard = async (q: Question) => {
    try {
      const res = await fetch('/api/qbank/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: q.id,
          clinicalPearl: q.clinicalPearl || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFlashcardToast('Added to your Spaced Repetition deck! (Review in 24h)');
        setTimeout(() => setFlashcardToast(''), 3000);
      } else {
        alert(data.message || 'Could not save flashcard. Please make sure you are logged in.');
      }
    } catch (_) {
      alert('Error saving flashcard.');
    }
  };

  // Submit Answer to API
  const handleSubmitAnswer = async () => {
    if (!currentQ || !hasAnswerSelected || isAnswered) return;

    try {
      const answersToSend = currentQ.type === 'DRAG_DROP' && (!currentSelected || (Array.isArray(currentSelected) && currentSelected.length === 0))
        ? (Array.isArray(currentQ.options) ? currentQ.options.map((_, i) => i) : [])
        : currentSelected;

      const res = await fetch('/api/qbank/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          selectedIndices: Array.isArray(answersToSend) ? answersToSend : undefined,
          userAnswers: answersToSend,
          timeSpentSeconds: 30,
          sessionId: sessionId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAttemptResults((prev) => ({
          ...prev,
          [currentQ.id]: {
            isCorrect: data.isCorrect,
            score: data.score !== undefined ? data.score : (data.isCorrect ? 1.0 : 0.0),
            correctIndices: data.correctIndices || [],
            selectedIndices: answersToSend,
            correctAnswers: data.correctAnswers,
            correctRationale: data.evaluation?.correctRationale || data.correctRationale || '',
            distractors: data.evaluation?.distractors || data.distractors || [],
            clinicalPearl: data.evaluation?.clinicalPearl || data.clinicalPearl || '',
            rationalePerOption: data.rationalePerOption,
          },
        }));

        if (data.isCorrect) {
          setDbCorrectIds((prev) => Array.from(new Set([...prev, currentQ.id])));
          setDbIncorrectIds((prev) => prev.filter((id) => id !== currentQ.id));
        } else {
          setDbIncorrectIds((prev) => Array.from(new Set([...prev, currentQ.id])));
          setDbCorrectIds((prev) => prev.filter((id) => id !== currentQ.id));
        }
        setDbAttemptedIds((prev) => Array.from(new Set([...prev, currentQ.id])));

        // Phase 7: CAT Adaptive Engine Theta Adjustment & 95% Stopping Rule
        if (isCatMode) {
          const scoreVal = data.score !== undefined ? data.score : (data.isCorrect ? 1.0 : 0.0);
          const nextTheta = scoreVal >= 0.7
            ? Math.min(2.5, catTheta + 0.35 * scoreVal)
            : Math.max(-2.5, catTheta - 0.35 * (1 - scoreVal));
          const nextMargin = Math.max(0.15, catConfidenceMargin - 0.015);
          setCatTheta(nextTheta);
          setCatConfidenceMargin(nextMargin);

          const totalSolved = Object.keys(attemptResults).length + 1;
          // NCSBN 95% Confidence Interval Stopping Rule (Minimum 75 questions)
          if (totalSolved >= 75 && (nextTheta - nextMargin) > 0.05) {
            setCatEarlyPassed(true);
            handleFinishSession();
          }
        }
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
      
      {/* ── 1. TOP ACCESS & EXAM ENVIRONMENT BAR ── */}
      {sessionStarted && !sessionCompleted ? (
        <section className="bg-slate-900 text-white border-b border-slate-800 py-2.5 px-3 sm:px-6 lg:px-8 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left: Exam Mode & Progress */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  {isCatMode ? 'Adaptive CAT Simulation' : examMode ? 'Timed Mock Exam' : 'Clinical Practice Drill'}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-700 hidden sm:block" />
              <div className="text-xs text-slate-300 font-medium">
                Item <strong className="text-white font-bold">{currentIndex + 1}</strong> of {filteredQuestions.length}
                <span className="text-slate-400 text-[11px] ml-1.5 hidden sm:inline">
                  ({answeredKeys.length} solved)
                </span>
              </div>
            </div>

            {/* Center: Peaceful Timer */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700/80">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono font-bold text-xs sm:text-sm text-white tracking-wider">
                {formatTimer(secondsElapsed)}
              </span>
              <button
                onClick={handlePauseSession}
                className="text-slate-400 hover:text-white ml-1 p-0.5 cursor-pointer"
                title="Pause Exam"
              >
                <Pause className="w-3 h-3" />
              </button>
            </div>

            {/* Right: Peaceful Exam Toolbar & Prominent Calculator */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end">
              {/* PROMINENT CALCULATOR BUTTON */}
              <button
                type="button"
                onClick={() => setIsCalcOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer ring-1 ring-sky-400/30"
                title="NCLEX Clinical Calculator (Alt+C)"
              >
                <Calculator className="w-4 h-4 text-white shrink-0" />
                <span>Calculator</span>
                <kbd className="hidden lg:inline-block px-1 py-0.2 text-[9px] bg-sky-700 rounded font-mono">Alt+C</kbd>
              </button>

              {/* Strikethrough Distractors */}
              <button
                type="button"
                onClick={() => setStrikethroughMode((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  strikethroughMode
                    ? 'bg-amber-500 text-slate-900 border-amber-400 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Strikethrough Distractors"
              >
                <Strikethrough className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Strike</span>
              </button>

              {/* Flag Question */}
              <button
                type="button"
                onClick={handleToggleFlag}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isFlagged
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Flag for Review (Alt+F)"
              >
                <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{isFlagged ? 'Flagged' : 'Flag'}</span>
              </button>

              {/* Palette / Jump */}
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Question Grid & Jump"
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">Grid</span>
              </button>

              {/* Finish Test */}
              <button
                type="button"
                onClick={handleFinishSession}
                className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                title="Finish Test and view score"
              >
                Finish
              </button>
            </div>
          </div>
          {/* Subtle Progress Bar */}
          <div className="w-full bg-slate-800 h-1 mt-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-sky-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.round(((currentIndex + 1) / Math.max(filteredQuestions.length, 1)) * 100)}%` }}
            />
          </div>
        </section>
      ) : (
        <section className="bg-slate-900 text-white border-b border-slate-800 py-3 sm:py-4 px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            
            {/* Access Status Pill */}
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2">
              {hasAccess ? (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] sm:text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Full Access ({questions.length} Items)</span>
                  {daysRemaining > 0 && <span className="text-slate-400 font-normal hidden sm:inline">• {daysRemaining}d left</span>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Free Demo</span>
                  </div>
                  <button
                    onClick={() => setIsSubModalOpen(true)}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    Unlock All Access →
                  </button>
                </div>
              )}
            </div>

            {/* Pre-Session Start Button */}
            <div className="w-full md:w-auto flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-4 text-xs text-slate-300 border-t border-slate-800/80 pt-2 md:pt-0 md:border-0">
              <button
                onClick={handleStartSession}
                disabled={filteredQuestions.length === 0 || loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Practice Drill ({filteredQuestions.length})</span>
              </button>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Exit Generator
                </button>
              )}
            </div>

          </div>
        </section>
      )}

      {/* ── 2. MAIN WORKSPACE ── */}
      <div className={`mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 w-full flex-1 ${sessionStarted && !sessionCompleted ? 'max-w-4xl' : 'max-w-7xl'}`} id="qbankWorkspaceTop">
        
        {/* Mobile Quick Palette & Calculator Trigger during active test */}
        {sessionStarted && !sessionCompleted && (
          <div className="lg:hidden flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                Item {currentIndex + 1} of {filteredQuestions.length}
              </span>
              <span className="text-[11px] text-slate-500">
                ({answeredKeys.length} solved)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCalcOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-all cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-sky-600" />
                <span>Calc</span>
              </button>
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 ${sessionStarted && !sessionCompleted ? '' : 'lg:grid-cols-4 gap-6 lg:gap-8'}`}>
          
          {/* ── SIDEBAR: FILTERS & QUESTION PALETTE (Hidden during active test for peaceful exam mode) ── */}
          {(!sessionStarted || sessionCompleted) && (
            <div className="space-y-6 lg:col-span-1 block">
            
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
                  All ({loading ? '...' : filteredQuestions.length})
                </button>
                <button
                  onClick={() => setPaletteStatusFilter('unanswered')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'unanswered' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Unanswered ({loading ? '...' : filteredQuestions.filter(q => getQuestionStatus(q.id) === 'unanswered').length})
                </button>
                <button
                  onClick={() => setPaletteStatusFilter('incorrect')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'incorrect' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                >
                  Incorrect ({loading ? '...' : filteredQuestions.filter(q => getQuestionStatus(q.id) === 'incorrect').length})
                </button>
                <button
                  onClick={() => setPaletteStatusFilter('correct')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'correct' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                  Correct ({loading ? '...' : filteredQuestions.filter(q => getQuestionStatus(q.id) === 'correct').length})
                </button>
                <button
                  onClick={() => setPaletteStatusFilter('flagged')}
                  className={`px-2 py-1 rounded transition-colors ${paletteStatusFilter === 'flagged' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                >
                  Flagged ({loading ? '...' : filteredQuestions.filter(q => isQuestionFlagged(q.id)).length})
                </button>
              </div>

              {/* Palette Grid with Skeleton Loader */}
              {loading ? (
                <div className="grid grid-cols-5 gap-2 p-1">
                  {[...Array(15)].map((_, i) => (
                    <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse border border-slate-200" />
                  ))}
                </div>
              ) : (
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
              )}

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
          )}

          {/* ── MAIN TESTING STAGE ── */}
          <div className={`${sessionStarted && !sessionCompleted ? 'w-full space-y-6' : 'lg:col-span-3 space-y-6'}`}>
            
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
                    disabled={filteredQuestions.length === 0 || loading}
                    className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.02] active:scale-100 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{loading ? 'Loading Bank...' : `Start Questions (${filteredQuestions.length})`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* In-Progress Session Resume Banner */}
                {activeDbSession && !sessionStarted && (
                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>In-Progress Practice Session Detected</span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {activeDbSession.title} • Item {Math.min((activeDbSession.current_question_index || 0) + 1, activeDbSession.total_questions || 1)} of {activeDbSession.total_questions} ({formatTimer(activeDbSession.time_spent_seconds || 0)} elapsed)
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleResumeActiveSession}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer text-center"
                      >
                        Resume Session →
                      </button>
                      <button
                        onClick={() => setActiveDbSession(null)}
                        className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Track & Difficulty Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-sky-600" />
                      <span>Target Exam Track</span>
                    </label>
                    <select
                      value={selectedTrack}
                      onChange={(e) => { setSelectedTrack(e.target.value); setCurrentIndex(0); }}
                      className="w-full text-xs font-medium p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="all">All Tracks (Global NCLEX Pool)</option>
                      <option value="RN">NCLEX-RN (Registered Nurse)</option>
                      <option value="PN">NCLEX-PN (Practical Nurse)</option>
                      <option value="DHA">DHA (Dubai Health Authority)</option>
                      <option value="HAAD">HAAD / DOH (Abu Dhabi)</option>
                      <option value="SNLE">SNLE (Saudi Nursing Licensing)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-sky-600" />
                      <span>Clinical Difficulty Level</span>
                    </label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => { setSelectedDifficulty(e.target.value); setCurrentIndex(0); }}
                      className="w-full text-xs font-medium p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="all">All Difficulties (Adaptive Mix)</option>
                      <option value="easy">Easy (Recall & Foundational)</option>
                      <option value="medium">Medium (Application & Clinical judgment)</option>
                      <option value="hard">Hard (Priority & Multi-system complex)</option>
                    </select>
                  </div>
                </div>

                {/* Active Category Filter Banner (from footer / URL links) */}
                {selectedCategory !== 'all' && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>
                        Active Topic Filter: <strong className="font-bold uppercase tracking-wider">{selectedCategory}</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-sky-300 text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
                    >
                      Clear Category Filter
                    </button>
                  </div>
                )}

                {/* 1. QUESTION STATUS FILTER: Correct, Incorrect, Flagged, Unanswered */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-sky-600" />
                      <span>Filter By Question Status</span>
                    </label>
                    <span className="text-[11px] text-slate-500">Target your weak areas or review mistakes</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
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
                      {loading ? (
                        <div className="h-6 w-12 bg-slate-200 animate-pulse rounded my-0.5" />
                      ) : (
                        <div className={`text-lg font-black ${statusFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
                          {liveCounts.all}
                        </div>
                      )}
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
                      {loading ? (
                        <div className="h-6 w-12 bg-slate-200 animate-pulse rounded my-0.5" />
                      ) : (
                        <div className={`text-lg font-black ${statusFilter === 'unanswered' ? 'text-white' : 'text-sky-700'}`}>
                          {liveCounts.unanswered}
                        </div>
                      )}
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
                      {loading ? (
                        <div className="h-6 w-12 bg-slate-200 animate-pulse rounded my-0.5" />
                      ) : (
                        <div className={`text-lg font-black ${statusFilter === 'incorrect' ? 'text-white' : 'text-rose-600'}`}>
                          {liveCounts.incorrect}
                        </div>
                      )}
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
                      {loading ? (
                        <div className="h-6 w-12 bg-slate-200 animate-pulse rounded my-0.5" />
                      ) : (
                        <div className={`text-lg font-black ${statusFilter === 'correct' ? 'text-white' : 'text-emerald-600'}`}>
                          {liveCounts.correct}
                        </div>
                      )}
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
                      {loading ? (
                        <div className="h-6 w-12 bg-slate-200 animate-pulse rounded my-0.5" />
                      ) : (
                        <div className={`text-lg font-black ${statusFilter === 'flagged' ? 'text-white' : 'text-amber-600'}`}>
                          {liveCounts.flagged}
                        </div>
                      )}
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

                {/* 3. QUESTION FORMAT & NEXT-GEN ITEM TYPE FILTER */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      Next-Gen NCLEX (NGN) Item Types & Format:
                    </label>
                    <select
                      value={selectedQuestionType}
                      onChange={(e) => { setSelectedQuestionType(e.target.value); setCurrentIndex(0); }}
                      className="text-xs font-semibold p-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-auto"
                    >
                      <option value="all">All Item Formats (Comprehensive Pool)</option>
                      <option value="MCQ">Traditional Single-Choice MCQ</option>
                      <option value="SATA">Extended Multiple Response (SATA)</option>
                      <option value="MATRIX">Next-Gen Matrix / Grid Table</option>
                      <option value="CLOZE">Next-Gen Cloze (Dropdown) Vignette</option>
                      <option value="DRAG_DROP">Next-Gen Drag & Drop Priority Order</option>
                      <option value="BOWTIE">Next-Gen Bow-Tie Clinical Diagram</option>
                      <option value="CASE_STUDY">Next-Gen 6-Question Unfolding Case Study</option>
                    </select>
                  </div>

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
                          <span>Mixed (MCQ + Next-Gen)</span>
                        </span>
                        <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Smoothly alternates Select All That Apply, Matrix, Bow-Tie, and single MCQs for true NCLEX simulation.
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

                {/* 4. Session Mode Selector: Practice, Timed Exam, or CAT Simulation */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Choose Testing Mode:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => { setExamMode(false); setIsCatMode(false); }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        !examMode && !isCatMode
                          ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20 shadow-2xs' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-sky-600" />
                          <span>Practice / Tutor</span>
                        </span>
                        {!examMode && !isCatMode && <span className="w-2 h-2 rounded-full bg-sky-600" />}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Instant original rationales and clinical pearls display immediately after submitting each question.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setExamMode(true); setIsCatMode(false); }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        examMode && !isCatMode
                          ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-2xs' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Timed Mock Exam</span>
                        </span>
                        {examMode && !isCatMode && <span className="w-2 h-2 rounded-full bg-amber-600" />}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Simulates live exam conditions. Rationales and scores are hidden until the entire test is submitted.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setExamMode(true); setIsCatMode(true); setQuestionLimit(75); }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isCatMode
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-2xs' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs sm:text-sm text-indigo-950 flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-indigo-600" />
                          <span>CAT Simulation</span>
                        </span>
                        {isCatMode && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Computerized Adaptive Testing: 75 to 145 items dynamically adjust difficulty with a 95% confidence rule.
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
                      { val: 10, label: '10 Questions (Quick Review)' },
                      { val: 25, label: '25 Questions (Focused Block)' },
                      { val: 50, label: '50 Questions (Comprehensive)' },
                      { val: 75, label: '75 Questions (Full CAT Simulation)' },
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

                {/* Empty State Banner if 0 questions match */}
                {filteredQuestions.length === 0 && !loading && (
                  <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-3 animate-in fade-in">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-900">No Questions Match These Criteria</h4>
                      <p className="text-xs text-amber-800 max-w-md mx-auto">
                        No items match {selectedCategory !== 'all' ? `topic "${selectedCategory}" ` : ''}{selectedOrganSystem !== 'all' ? `in ${selectedOrganSystem} ` : ''}with status &quot;{statusFilter}&quot;.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedOrganSystem('all');
                        setStatusFilter('all');
                        setQuestionFormatFilter('mixed');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-colors cursor-pointer shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset All Filters</span>
                    </button>
                  </div>
                )}

                {/* Primary Action Button Bar */}
                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    <span>Target: </span>
                    <strong className="text-slate-800">{selectedOrganSystem === 'all' ? 'All 10 Organ Systems' : selectedOrganSystem}</strong>
                    <span> • Status: </span>
                    <strong className="text-slate-800 capitalize">{statusFilter}</strong>
                    <span> • Ready: </span>
                    <strong className="text-sky-600">{loading ? '...' : `${filteredQuestions.length} Questions`}</strong>
                  </div>

                  <button
                    onClick={handleStartSession}
                    disabled={filteredQuestions.length === 0 || loading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.02] active:scale-100 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>{loading ? 'Loading Bank...' : `Start Questions (${filteredQuestions.length} Items)`}</span>
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

                {/* CAT Simulation Performance Banner if in CAT mode */}
                {isCatMode && (
                  <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white text-left space-y-4 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${catTheta > 0.05 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        <span className="font-extrabold uppercase tracking-wider text-xs text-sky-400">
                          NCSBN CAT Simulation Decision Engine
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        catTheta > 0.05
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {catTheta > 0.05 ? 'Predicted Pass (Above Standard)' : 'Needs Remediation (Below Standard)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/50">
                        <span className="text-[11px] text-slate-400 uppercase block">Estimated Ability (θ)</span>
                        <span className={`text-xl font-black ${catTheta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {catTheta >= 0 ? `+${catTheta.toFixed(2)}` : catTheta.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/50">
                        <span className="text-[11px] text-slate-400 uppercase block">95% Confidence Band</span>
                        <span className="text-xl font-black text-sky-300 font-mono">
                          ±{catConfidenceMargin.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/50 col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-slate-400 uppercase block">Passing Standard</span>
                        <span className="text-xl font-black text-white font-mono">
                          θ = 0.00
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                      {catEarlyPassed 
                        ? '✓ 95% Confidence Interval Stopping Rule Triggered: Candidate ability is with 95% statistical certainty above the passing standard at or beyond 75 items.'
                        : `CAT session concluded after ${answeredKeys.length} items. In the authentic NCSBN CAT NCLEX-RN exam, testing ceases once the 95% confidence interval cleanly clears the passing line, or upon reaching the maximum item limit (145 items).`}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleRestartNewSession}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start New Session</span>
                  </button>

                  {answeredKeys.some(k => !attemptResults[Number(k)]?.isCorrect) && (
                    <button
                      onClick={() => {
                        setStatusFilter('incorrect');
                        handleRestartNewSession();
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-sm transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                      <span>Practice Weak Topics ({answeredKeys.filter(k => !attemptResults[Number(k)]?.isCorrect).length} Missed)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSessionCompleted(false);
                      setSessionStarted(true);
                      setCurrentIndex(0);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <span>Review Questions & Rationales</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <Link
                    href="/profile"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                  >
                    <Award className="w-4 h-4 text-sky-600" />
                    <span>View Analytics on Profile</span>
                  </Link>
                </div>

              </div>
            ) : currentQ ? (
              <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
                
                {/* Stage Header */}
                <div className="flex flex-col gap-3 pb-4 border-b border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 text-xs font-bold rounded-md bg-slate-900 text-white">
                        Item {currentIndex + 1} of {filteredQuestions.length}
                      </span>
                      {/* Organ System Badge */}
                      <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                        <span>🫀</span>
                        <span>{currentQ.organSystem || 'General Clinical'}</span>
                      </span>
                      {/* Format Badge: NGN Type or SATA or MCQ */}
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase ${
                        currentQ.type === 'MATRIX' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        currentQ.type === 'CLOZE' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                        currentQ.type === 'DRAG_DROP' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        currentQ.type === 'BOWTIE' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        currentQ.type === 'CASE_STUDY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        currentQ.questionType === 'multiple' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {
                          currentQ.type === 'MATRIX' ? 'NGN Matrix / Grid' :
                          currentQ.type === 'CLOZE' ? 'NGN Cloze (Dropdown)' :
                          currentQ.type === 'DRAG_DROP' ? 'NGN Ordered Priority' :
                          currentQ.type === 'BOWTIE' ? 'NGN Bow-Tie Item' :
                          currentQ.type === 'CASE_STUDY' ? 'NGN Unfolding Case Study' :
                          currentQ.questionType === 'multiple' ? 'SATA (Multi-Select)' : 'MCQ (Single)'
                        }
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
                        title="Flag Item (Alt+F)"
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

                  {/* Clinical Exam Action Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100/80">
                    <button
                      type="button"
                      onClick={() => setIsCalcOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                      title="Digital Dosage Calculator (Alt+C)"
                    >
                      <Calculator className="w-3.5 h-3.5 text-sky-600" />
                      <span>Calculator</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrikethroughMode((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                        strikethroughMode
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="Strikeout Mode (Toggle to cross out distractors)"
                    >
                      <Strikethrough className="w-3.5 h-3.5 text-amber-700" />
                      <span>{strikethroughMode ? 'Strikeout: ON' : 'Strikeout'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHighlightedQuestions((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                        highlightedQuestions[currentQ.id]
                          ? 'bg-amber-200 text-amber-950 border-amber-400 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="Highlight Question Stem"
                    >
                      <Highlighter className="w-3.5 h-3.5 text-amber-600" />
                      <span>Highlight</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenNotes}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                        notesOpen
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="Clinical Notes (Alt+N)"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Notes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReportQuestionTarget({ id: currentQ.id, stem: currentQ.statement });
                        setIsReportModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer ml-auto shadow-2xs"
                      title="Report an issue with this question"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden sm:inline">Report Item</span>
                    </button>
                  </div>
                </div>

                {/* CAT Adaptive Simulation Status Banner */}
                {isCatMode && (
                  <CatSimulationBanner 
                    totalAnswered={Object.keys(attemptResults).length}
                    currentDifficulty={currentQ.difficulty || 'medium'}
                    thetaEstimate={catTheta}
                    confidenceMargin={catConfidenceMargin}
                    minQuestions={75}
                    maxQuestions={145}
                  />
                )}

                {/* Notes Drawer */}
                {notesOpen && (
                  <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Private Clinical Notes for Item #{currentQ.id}</span>
                      </span>
                      {noteToast && <span className="text-emerald-700 text-xs font-bold animate-pulse">{noteToast}</span>}
                    </div>
                    <textarea
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      placeholder="Record clinical concepts, drug dosages, or rationale notes for this question..."
                      rows={3}
                      className="w-full text-xs p-3 rounded-lg border border-indigo-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-indigo-700">Notes are saved to your account and synced across sessions.</span>
                      <button
                        onClick={handleSaveNote}
                        disabled={savingNote}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                )}

                {/* NGN & Standard Question View Renderer */}
                {currentQ.type === 'CASE_STUDY' ? (
                  <CaseStudyQuestion
                    caseStudyData={currentQ.caseStudyData}
                    stem={currentQ.statement}
                  >
                    {renderStandardOptions()}
                  </CaseStudyQuestion>
                ) : currentQ.type === 'MATRIX' ? (
                  <div className="space-y-4">
                    <div className={`text-base sm:text-lg font-medium leading-relaxed p-3 rounded-xl transition-all ${
                      highlightedQuestions[currentQ.id]
                        ? 'bg-amber-100/80 text-amber-950 border border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                        : 'text-slate-900 bg-transparent'
                    }`}>
                      {currentQ.statement}
                    </div>
                    <MatrixQuestion
                      options={currentQ.options}
                      value={currentSelected || {}}
                      onChange={(val) => setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: val }))}
                      disabled={isAnswered}
                      isSubmitted={isAnswered}
                      correctAnswers={currentResult?.correctAnswers || currentQ.correctAnswers}
                      rationalePerOption={currentResult?.rationalePerOption || currentQ.rationalePerOption}
                    />
                  </div>
                ) : currentQ.type === 'CLOZE' ? (
                  <div className="space-y-4">
                    <div className={`text-base sm:text-lg font-medium leading-relaxed p-3 rounded-xl transition-all ${
                      highlightedQuestions[currentQ.id]
                        ? 'bg-amber-100/80 text-amber-950 border border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                        : 'text-slate-900 bg-transparent'
                    }`}>
                      {currentQ.statement}
                    </div>
                    <ClozeQuestion
                      options={currentQ.options}
                      value={currentSelected || {}}
                      onChange={(val) => setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: val }))}
                      disabled={isAnswered}
                      isSubmitted={isAnswered}
                      correctAnswers={currentResult?.correctAnswers || currentQ.correctAnswers}
                      rationalePerOption={currentResult?.rationalePerOption || currentQ.rationalePerOption}
                    />
                  </div>
                ) : currentQ.type === 'DRAG_DROP' ? (
                  <div className="space-y-4">
                    <div className={`text-base sm:text-lg font-medium leading-relaxed p-3 rounded-xl transition-all ${
                      highlightedQuestions[currentQ.id]
                        ? 'bg-amber-100/80 text-amber-950 border border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                        : 'text-slate-900 bg-transparent'
                    }`}>
                      {currentQ.statement}
                    </div>
                    <DragDropQuestion
                      options={Array.isArray(currentQ.options) ? currentQ.options : []}
                      value={Array.isArray(currentSelected) && currentSelected.length > 0 ? currentSelected : (Array.isArray(currentQ.options) ? currentQ.options.map((_, i) => i) : [])}
                      onChange={(val) => setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: val }))}
                      disabled={isAnswered}
                      isSubmitted={isAnswered}
                      correctAnswers={currentResult?.correctAnswers || currentQ.correctAnswers}
                      rationalePerOption={currentResult?.rationalePerOption || currentQ.rationalePerOption}
                    />
                  </div>
                ) : currentQ.type === 'BOWTIE' ? (
                  <div className="space-y-4">
                    <div className={`text-base sm:text-lg font-medium leading-relaxed p-3 rounded-xl transition-all ${
                      highlightedQuestions[currentQ.id]
                        ? 'bg-amber-100/80 text-amber-950 border border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                        : 'text-slate-900 bg-transparent'
                    }`}>
                      {currentQ.statement}
                    </div>
                    <BowtieQuestion
                      options={currentQ.options}
                      value={currentSelected || {}}
                      onChange={(val) => setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: val }))}
                      disabled={isAnswered}
                      isSubmitted={isAnswered}
                      correctAnswers={currentResult?.correctAnswers || currentQ.correctAnswers}
                      rationalePerOption={currentResult?.rationalePerOption || currentQ.rationalePerOption}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* SATA Notification Banner if Multiple Response */}
                    {currentQ.questionType === 'multiple' && (
                      <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          Select All That Apply (SATA): This item has multiple correct answers. Select all clinical options that apply.
                        </span>
                      </div>
                    )}

                    {/* Clinical Stem Vignette with Highlighter Effect */}
                    <div className={`text-base sm:text-lg font-medium leading-relaxed p-3 rounded-xl transition-all ${
                      highlightedQuestions[currentQ.id]
                        ? 'bg-amber-100/80 text-amber-950 border border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                        : 'text-slate-900 bg-transparent'
                    }`}>
                      {currentQ.statement}
                    </div>

                    {renderStandardOptions()}
                  </div>
                )}

                {/* Action Buttons: Submit / Prev / Next */}
                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => handleNavigateQuestion(Math.min(filteredQuestions.length - 1, currentIndex + 1))}
                      disabled={currentIndex === filteredQuestions.length - 1}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 cursor-pointer transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {!isAnswered ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!hasAnswerSelected}
                      className="w-full sm:w-auto px-7 py-3 sm:py-2.5 text-sm font-bold rounded-xl sm:rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-all cursor-pointer text-center"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                      <span className={`text-xs font-bold px-3 py-2 rounded-lg text-center ${currentResult?.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {currentResult?.isCorrect ? '✓ Correct Answer' : '✗ Incorrect Response'}
                      </span>
                      {currentIndex === filteredQuestions.length - 1 ? (
                        <button
                          onClick={handleFinishSession}
                          className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Finish & View Score</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleNavigateQuestion(currentIndex + 1)}
                          className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer text-center"
                        >
                          Next Question →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Clinical Rationale Section (Practice Mode) */}
                {isAnswered && !examMode && currentResult && (
                  <div className="mt-8 pt-6 border-t border-slate-200 space-y-4 animate-in fade-in-50 duration-200">
                    
                    {/* Flashcard & Problem Report Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCreateFlashcard(currentQ)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>+ Add to Spaced Repetition Decks</span>
                        </button>
                        {flashcardToast && (
                          <span className="text-emerald-700 text-xs font-semibold animate-pulse">
                            {flashcardToast}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setReportQuestionTarget({ id: currentQ.id, stem: currentQ.statement });
                          setIsReportModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Report a problem with this rationale</span>
                      </button>
                    </div>

                    {/* Correct Rationale Box */}
                    <div className="p-5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Evidence-Based Clinical Rationale</span>
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

      {/* ── MOBILE / TABLET QUESTION PALETTE BOTTOM SHEET MODAL ── */}
      {mobilePaletteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden">
          <div
            className="fixed inset-0 bg-transparent"
            onClick={() => setMobilePaletteOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Question Palette ({filteredQuestions.length} Items)
                </h3>
              </div>
              <button
                onClick={() => setMobilePaletteOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                aria-label="Close palette"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
              <button
                onClick={() => setPaletteStatusFilter('all')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${paletteStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                All ({filteredQuestions.length})
              </button>
              <button
                onClick={() => setPaletteStatusFilter('unanswered')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${paletteStatusFilter === 'unanswered' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Unanswered ({filteredQuestions.filter(q => getQuestionStatus(q.id) === 'unanswered').length})
              </button>
              <button
                onClick={() => setPaletteStatusFilter('incorrect')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${paletteStatusFilter === 'incorrect' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
              >
                Incorrect ({filteredQuestions.filter(q => getQuestionStatus(q.id) === 'incorrect').length})
              </button>
              <button
                onClick={() => setPaletteStatusFilter('correct')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${paletteStatusFilter === 'correct' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
              >
                Correct ({filteredQuestions.filter(q => getQuestionStatus(q.id) === 'correct').length})
              </button>
              <button
                onClick={() => setPaletteStatusFilter('flagged')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${paletteStatusFilter === 'flagged' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
              >
                Flagged ({filteredQuestions.filter(q => isQuestionFlagged(q.id)).length})
              </button>
            </div>

            {/* Palette Numbers Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
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
                  btnStyle += ' ring-2 ring-sky-500 border-sky-600 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(originalIndex);
                      setMobilePaletteOpen(false);
                    }}
                    className={`relative h-10 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                  >
                    <span>{originalIndex + 1}</span>
                    {flagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Session Controls within Mobile Palette */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setMobilePaletteOpen(false);
                  handlePauseSession();
                }}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-2 rounded-lg font-medium cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 text-slate-500" />
                <span>Pause Test</span>
              </button>
              <button
                onClick={() => {
                  setMobilePaletteOpen(false);
                  handleFinishSession();
                }}
                className="flex items-center gap-1 text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-lg font-bold cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finish & Score</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 3. SUBSCRIPTION / UPGRADE MODAL ── */}
      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onSuccess={loadData}
      />

      {/* ── 3. PHASE 6 CLINICAL EXAM MODALS ── */}
      {/* Dosage Calculator Modal */}
      <CalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
      />

      {/* Report Problem / Typo Modal */}
      <ReportProblemModal
        isOpen={isReportModalOpen}
        questionId={reportQuestionTarget?.id || currentQ?.id || 0}
        questionStem={reportQuestionTarget?.stem || currentQ?.statement || ''}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportQuestionTarget(null);
        }}
      />

      {/* Floating Quick Calculator Trigger in Peaceful Exam Mode */}
      {sessionStarted && !sessionCompleted && (
        <button
          type="button"
          onClick={() => setIsCalcOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/90 hover:bg-sky-600 text-white shadow-xl border border-slate-700/80 backdrop-blur-sm text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Open Dosage Calculator (Alt+C)"
        >
          <Calculator className="w-4 h-4 text-sky-400" />
          <span>Calculator</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-slate-800 rounded text-slate-300 font-mono">Alt+C</kbd>
        </button>
      )}

    </div>
  );
}
