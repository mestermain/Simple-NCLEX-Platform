'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  RotateCw, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Award, 
  Layers, 
  Clock, 
  Flame, 
  PlusCircle, 
  HelpCircle,
  BookOpen,
  Filter,
  Check,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface Flashcard {
  id: number;
  deck_id: number;
  deck_title?: string;
  question_id?: number;
  front: string;
  back: string;
  clinical_pearl?: string;
  box_level: number;
  interval_days: number;
  ease_factor: number;
  repetition_count: number;
  next_review_at?: string;
}

interface Deck {
  id: number;
  title: string;
  description: string;
  category: string;
  card_count: number;
}

interface Stats {
  totalCards: number;
  dueToday: number;
  masteredCount: number;
  boxDistribution: Record<number, number>;
}

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCards: 0,
    dueToday: 0,
    masteredCount: 0,
    boxDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [selectedBox, setSelectedBox] = useState<string>('all');
  const [dueOnly, setDueOnly] = useState(false);

  // Review state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionReviews, setSessionReviews] = useState<{ cardId: number; rating: number }[]>([]);
  const [ratingToast, setRatingToast] = useState('');
  const [remediationLoading, setRemediationLoading] = useState(false);
  const [remediationToast, setRemediationToast] = useState('');

  // Fetch cards
  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDeckId !== 'all') params.set('deck_id', selectedDeckId);
      if (selectedBox !== 'all') params.set('box_level', selectedBox);
      if (dueOnly) params.set('due_only', 'true');

      const res = await fetch(`/api/qbank/flashcards?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCards(data.cards || []);
        setDecks(data.decks || []);
        if (data.stats) setStats(data.stats);
        setCurrentIndex(0);
        setIsFlipped(false);
        setSessionCompleted(false);
      }
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDeckId, selectedBox, dueOnly]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const currentCard = cards[currentIndex];

  // Submit Review (Again: 1, Hard: 2, Good: 3, Easy: 4)
  const handleRateCard = async (rating: number) => {
    if (!currentCard) return;

    try {
      const res = await fetch('/api/qbank/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRatingToast(data.message);
        setTimeout(() => setRatingToast(''), 2500);

        setSessionReviews((prev) => [...prev, { cardId: currentCard.id, rating }]);

        if (currentIndex < cards.length - 1) {
          setIsFlipped(false);
          setCurrentIndex((prev) => prev + 1);
        } else {
          setSessionCompleted(true);
        }
      }
    } catch (err) {
      console.error('Error submitting card review:', err);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionCompleted || cards.length === 0) return;

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') {
          e.preventDefault();
          handleRateCard(1);
        } else if (e.key === '2') {
          e.preventDefault();
          handleRateCard(2);
        } else if (e.key === '3') {
          e.preventDefault();
          handleRateCard(3);
        } else if (e.key === '4') {
          e.preventDefault();
          handleRateCard(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, cards.length, sessionCompleted]);

  // Generate remediation deck from missed questions
  const handleGenerateRemediation = async () => {
    setRemediationLoading(true);
    setRemediationToast('');
    try {
      const res = await fetch('/api/qbank/flashcards/remediation', {
        method: 'POST',
      });
      const data = await res.json();
      setRemediationToast(data.message);
      if (data.success) {
        fetchCards();
      }
      setTimeout(() => setRemediationToast(''), 4500);
    } catch (err) {
      setRemediationToast('Error generating remediation cards. Please make sure you are logged in.');
      setTimeout(() => setRemediationToast(''), 4500);
    } finally {
      setRemediationLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header & Back Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link 
                href="/qbank" 
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Q-Bank</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Clinical Flashcards</span>
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Spaced Repetition
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Reinforce high-yield nursing pharmacology, triage pearls, and diagnostic criteria using Leitner 5-Box & SM-2 algorithms.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateRemediation}
              disabled={remediationLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
              title="Automatically turn your missed Q-Bank questions into spaced repetition cards"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{remediationLoading ? 'Building Deck...' : 'Sync Missed Items'}</span>
            </button>
          </div>
        </div>

        {/* Remediation Feedback Toast */}
        {remediationToast && (
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{remediationToast}</span>
          </div>
        )}

        {/* Leitner 5-Box Statistics Dashboard */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Leitner 5-Box Memory Retention Matrix
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                Total Cards: <strong className="text-slate-900 font-bold">{stats.totalCards}</strong>
              </span>
              <span className="text-slate-500">
                Due Today: <strong className="text-amber-600 font-bold">{stats.dueToday}</strong>
              </span>
              <span className="text-slate-500">
                Mastered: <strong className="text-emerald-600 font-bold">{stats.masteredCount}</strong>
              </span>
            </div>
          </div>

          {/* 5-Box Flow Grid */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 text-center">
            {[
              { box: 1, label: 'Box 1', interval: 'Every 24h', color: 'border-rose-200 bg-rose-50/60 text-rose-900', count: stats.boxDistribution[1] || 0 },
              { box: 2, label: 'Box 2', interval: '3 Days', color: 'border-amber-200 bg-amber-50/60 text-amber-900', count: stats.boxDistribution[2] || 0 },
              { box: 3, label: 'Box 3', interval: '7 Days', color: 'border-sky-200 bg-sky-50/60 text-sky-900', count: stats.boxDistribution[3] || 0 },
              { box: 4, label: 'Box 4', interval: '14 Days', color: 'border-indigo-200 bg-indigo-50/60 text-indigo-900', count: stats.boxDistribution[4] || 0 },
              { box: 5, label: 'Box 5', interval: '30 Days (Mastered)', color: 'border-emerald-200 bg-emerald-50/60 text-emerald-900', count: stats.boxDistribution[5] || 0 },
            ].map((b) => (
              <button
                key={b.box}
                onClick={() => setSelectedBox(selectedBox === String(b.box) ? 'all' : String(b.box))}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer text-left ${b.color} ${
                  selectedBox === String(b.box) ? 'ring-2 ring-sky-500 shadow-xs' : 'hover:opacity-90'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold opacity-75">
                  <span>{b.label}</span>
                  <span className="hidden sm:inline">{b.interval}</span>
                </div>
                <div className="text-lg sm:text-2xl font-black mt-1">
                  {b.count}
                </div>
                <div className="text-[10px] text-slate-500 truncate sm:hidden mt-0.5">
                  {b.interval}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Deck:</span>
            </span>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Available Decks ({decks.length})</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.card_count} cards)
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={dueOnly}
                onChange={(e) => setDueOnly(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <span className="font-semibold text-slate-700">Due For Review Today</span>
            </label>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Keyboard Shortcuts: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Space</kbd> Flip • <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">1-4</kbd> Rate
          </div>
        </div>

        {/* Rating Success Toast */}
        {ratingToast && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold text-center animate-in fade-in">
            {ratingToast}
          </div>
        )}

        {/* ── CARD REVIEW STAGE ── */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
            <RotateCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading your spaced repetition cards...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
            <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-bold text-slate-900">No Cards In This Filter</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                You have reviewed all due cards in this selection, or no flashcards have been created yet.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => { setSelectedBox('all'); setDueOnly(false); }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors"
              >
                Review All Available Cards
              </button>
              <button
                onClick={handleGenerateRemediation}
                disabled={remediationLoading}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sync Missed Q-Bank Items
              </button>
            </div>
          </div>
        ) : sessionCompleted ? (
          /* Completion Celebration State */
          <div className="p-10 sm:p-14 text-center bg-white rounded-2xl border border-slate-200 space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Award className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold uppercase">
                Session Complete
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Daily Spaced Repetition Complete!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                You successfully reviewed {sessionReviews.length} clinical cards. The SM-2 scheduling engine has updated your retention intervals.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setSessionCompleted(false);
                  setSessionReviews([]);
                }}
                className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Review Deck Again
              </button>
              <Link
                href="/qbank"
                className="px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
              >
                Practice Questions in Q-Bank →
              </Link>
            </div>
          </div>
        ) : currentCard ? (
          /* Active Flashcard Viewer */
          <div className="space-y-4">
            
            {/* Card Progress Header */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  Card {currentIndex + 1} of {cards.length}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                  Box {currentCard.box_level} ({currentCard.interval_days}d interval)
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                SM-2 Ease Factor: {currentCard.ease_factor}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-600 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>

            {/* 3D Flip Card Container */}
            <div 
              onClick={() => setIsFlipped((prev) => !prev)}
              className="relative min-h-[320px] sm:min-h-[380px] bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm cursor-pointer hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              
              {/* Card Meta Header */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                <span className="px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-bold uppercase tracking-wider text-[10px]">
                  {isFlipped ? 'Clinical Rationale & Pearls (Back)' : 'Clinical Question & Concept (Front)'}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Click or press Space to flip</span>
                </span>
              </div>

              {/* Main Card Content */}
              <div className="py-6 sm:py-8 space-y-4">
                {!isFlipped ? (
                  /* FRONT OF CARD */
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                      Clinical Focus:
                    </span>
                    <h3 className="text-lg sm:text-2xl font-bold text-slate-900 leading-relaxed">
                      {currentCard.front}
                    </h3>
                  </div>
                ) : (
                  /* BACK OF CARD */
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                        Core Nursing Rationale:
                      </span>
                      <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-sans">
                        {currentCard.back}
                      </p>
                    </div>

                    {currentCard.clinical_pearl && (
                      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Evidence-Based Clinical Pearl</span>
                        </span>
                        <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                          {currentCard.clinical_pearl}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Bottom Hint / Rating Controls */}
              <div className="border-t border-slate-100 pt-4" onClick={(e) => e.stopPropagation()}>
                {!isFlipped ? (
                  <div className="text-center text-xs font-semibold text-sky-700 hover:text-sky-800">
                    Reveal Answer & Clinical Pearls (Space) →
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Rate Your Recall Quality (SM-2 Interval Scheduling):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => handleRateCard(1)}
                        className="p-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 transition-colors cursor-pointer text-center"
                      >
                        <span className="block text-xs font-black uppercase text-rose-700">1. Again</span>
                        <span className="text-[10px] text-rose-600 block mt-0.5">Box 1 (Today)</span>
                      </button>

                      <button
                        onClick={() => handleRateCard(2)}
                        className="p-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer text-center"
                      >
                        <span className="block text-xs font-black uppercase text-amber-700">2. Hard</span>
                        <span className="text-[10px] text-amber-600 block mt-0.5">Same Box (~1.2x)</span>
                      </button>

                      <button
                        onClick={() => handleRateCard(3)}
                        className="p-3 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-900 transition-colors cursor-pointer text-center"
                      >
                        <span className="block text-xs font-black uppercase text-sky-700">3. Good</span>
                        <span className="text-[10px] text-sky-600 block mt-0.5">+1 Box (Standard)</span>
                      </button>

                      <button
                        onClick={() => handleRateCard(4)}
                        className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors cursor-pointer text-center"
                      >
                        <span className="block text-xs font-black uppercase text-emerald-700">4. Easy</span>
                        <span className="text-[10px] text-emerald-600 block mt-0.5">+1 Box (+35% Bonus)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
              <button
                onClick={() => {
                  if (currentIndex > 0) {
                    setIsFlipped(false);
                    setCurrentIndex((prev) => prev - 1);
                  }
                }}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Card</span>
              </button>

              <button
                onClick={() => {
                  if (currentIndex < cards.length - 1) {
                    setIsFlipped(false);
                    setCurrentIndex((prev) => prev + 1);
                  } else {
                    setSessionCompleted(true);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
              >
                <span>Skip / Next Card</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
