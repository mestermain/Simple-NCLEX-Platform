'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Award, 
  BookOpen, 
  Users, 
  ChevronRight,
  Flame,
  Check,
  Zap,
  Star,
  Play,
  Target
} from 'lucide-react';

interface DemoMCQ {
  id: number;
  category: string;
  difficulty: string;
  clientNeed: string;
  statement: string;
  options: string[];
  correctIndex: number;
  correctRationale: string;
  distractors: string[];
  clinicalPearl: string;
}

export default function HomePage() {
  const [demoMcqs, setDemoMcqs] = useState<DemoMCQ[]>([]);
  const [loadingMcqs, setLoadingMcqs] = useState(true);
  const [demoStarted, setDemoStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    async function loadDemo() {
      try {
        const res = await fetch('/api/demo-mcqs');
        const data = await res.json();
        if (data.success && data.mcqs?.length > 0) {
          setDemoMcqs(data.mcqs);
        }
      } catch (err) {
        console.error('Failed to load demo questions:', err);
      } finally {
        setLoadingMcqs(false);
      }
    }
    loadDemo();
  }, []);

  const currentQ = demoMcqs[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (isSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setCurrentIdx((prev) => (prev + 1) % demoMcqs.length);
  };

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* ── 1. HERO SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-16 pb-20 lg:pt-24 lg:pb-32">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-sky-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute -bottom-20 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            
            {/* Blueprint Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-slate-300 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>2026 NCSBN NextGen, DHA & Saudi SNLE Blueprint Aligned</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Pass Your Nursing Licensure Exam With{' '}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                Clinical Precision
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
              Master Next-Gen Clinical Judgment scenarios, multi-choice Select All That Apply (SATA) questions, and Saunders 9th Edition distractor analyses built specifically for future RNs.
            </p>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/qbank"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-lg shadow-sky-600/25 transition-all group"
              >
                <span>Launch Interactive Q-Bank</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/courses"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 rounded-xl transition-all"
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Explore Live Classes</span>
              </Link>
            </div>

            {/* Clinical Trust Metrics */}
            <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-800/80 text-left">
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-bold text-sky-400">99.2%</div>
                <div className="text-xs text-slate-400">First-Time Pass Rate</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-bold text-indigo-400">60+ High-Yield</div>
                <div className="text-xs text-slate-400">Clinical MCQs & SATA</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-bold text-emerald-400">Saunders 9th</div>
                <div className="text-xs text-slate-400">Evidence-Based Rationales</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-bold text-amber-400">4,800+</div>
                <div className="text-xs text-slate-400">Licensed Alumni</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. INTERACTIVE DEMO MCQ ENGINE (FEATURED IN VIGNETTE) ── */}
      <section className="py-16 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Interactive Clinical Simulator
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Test Your Clinical Judgment Right Now
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
              Experience the actual NextGen Saunders clinical rationales and distractor breakdowns our students use daily.
            </p>
          </div>

          {/* Interactive Question Card */}
          <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
            {loadingMcqs ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Loading high-yield NCLEX vignette...</p>
              </div>
            ) : !demoStarted ? (
              <div className="text-center py-10 sm:py-12 px-4 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto shadow-sm">
                  <Target className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider">
                    Interactive Clinical Simulator
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Practice High-Yield NCLEX Questions
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Test your pharmacology and physiological adaptation knowledge on 5 real examination vignettes with full Saunders 9th Edition distractor analyses.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setDemoStarted(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Questions (Sample Vignette)</span>
                  </button>

                  <Link
                    href="/qbank?start=true"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                  >
                    <span>Launch Full 60+ Q-Bank</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : currentQ ? (
              <div className="space-y-6">
                
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-slate-100 text-slate-700">
                      Sample Question {currentIdx + 1} of {demoMcqs.length}
                    </span>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                      {currentQ.category}
                    </span>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                      {currentQ.difficulty}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {currentQ.clientNeed}
                  </span>
                </div>

                {/* Question Stem */}
                <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                  {currentQ.statement}
                </div>

                {/* Choices */}
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt, oIdx) => {
                    const isSelected = selectedOption === oIdx;
                    const isCorrect = oIdx === currentQ.correctIndex;
                    
                    let itemStyle = 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/30 text-slate-800';
                    let letterBadge = 'bg-slate-100 text-slate-600 border-slate-200';

                    if (isSubmitted) {
                      if (isCorrect) {
                        itemStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium';
                        letterBadge = 'bg-emerald-600 text-white border-emerald-600';
                      } else if (isSelected && !isCorrect) {
                        itemStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                        letterBadge = 'bg-rose-500 text-white border-rose-500';
                      } else {
                        itemStyle = 'border-slate-100 bg-slate-50 text-slate-400 opacity-60';
                      }
                    } else if (isSelected) {
                      itemStyle = 'border-sky-600 bg-sky-50/80 text-sky-950 ring-2 ring-sky-600/20';
                      letterBadge = 'bg-sky-600 text-white border-sky-600';
                    }

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectOption(oIdx)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${itemStyle}`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${letterBadge}`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="text-sm sm:text-base pt-0.5">{opt}</span>
                        {isSubmitted && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto shrink-0 mt-0.5" />
                        )}
                        {isSubmitted && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-500 ml-auto shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Submit & Next Actions */}
                <div className="pt-2 flex items-center justify-between">
                  {!isSubmitted ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={selectedOption === null}
                      className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-all"
                    >
                      Check Saunders Rationale
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
                    >
                      <span>Try Next Practice Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-xs text-slate-500">
                    Clinical Judgment Measurement Model (CJMM)
                  </span>
                </div>

                {/* Saunders Rationale & Distractor Box (Displayed upon submit) */}
                {isSubmitted && (
                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-4 animate-in fade-in-50 duration-300">
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Saunders 9th Edition Clinical Rationale:</span>
                      </div>
                      <p className="text-sm text-emerald-900 leading-relaxed">
                        {currentQ.correctRationale}
                      </p>
                    </div>

                    {currentQ.clinicalPearl && (
                      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1">
                          <Flame className="w-4 h-4 text-amber-600" />
                          <span>Clinical Exam Pearl:</span>
                        </div>
                        <p className="text-sm text-amber-900 leading-relaxed">
                          {currentQ.clinicalPearl}
                        </p>
                      </div>
                    )}

                    {currentQ.distractors && currentQ.distractors.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                          Distractor Clinical Analysis:
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {currentQ.distractors.map((dist, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-2">
                              <span className="text-slate-400 font-mono">•</span>
                              <span>{dist}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Demo question unavailable.</p>
            )}
          </div>

          {/* Upgrade Banner for Q-Bank */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-900">
                  Ready for the full 60+ question bank with Select All That Apply (SATA)?
                </h4>
                <p className="text-xs text-slate-600">
                  Approved students receive 100% unrestricted access to all pharmacology, med-surg, and priority triaging drills.
                </p>
              </div>
            </div>
            <Link
              href="/qbank"
              className="shrink-0 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
            >
              Open Full Q-Bank
            </Link>
          </div>

        </div>
      </section>

      {/* ── 3. CLINICAL FRAMEWORK FEATURES ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Designed For High-Stakes Nursing Licensure
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              We eliminated memorization fluff and focused 100% on clinical decision-making, patient safety guidelines, and Saunders rationale mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                NextGen Case Scenarios & SATA
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Practice both single-choice MCQs and multi-choice Select All That Apply (SATA) questions modeled after the actual computerized adaptive testing (CAT) interface.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Saunders & ATI Distractor Breakdown
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every question explains not just why the correct option is right, but why each distractor is clinically hazardous, training your intuition to eliminate traps.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Live Google Meet Classes & Mentorship
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Connect directly with practicing senior nurse educators for system-by-system physiology lectures, pharmacology mnemonics, and live doubt-solving.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. FEATURED PREPARATORY TRACKS ── */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Official Curriculum</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Comprehensive Licensure Courses
              </h2>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700"
            >
              <span>View All Courses & Syllabi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Track 1: NCLEX-RN */}
            <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                    Most Popular
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>4.9 (18k+ nurses)</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  NCLEX-RN Complete Prep 2026
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Full 12-week comprehensive program covering Med-Surg, Pharmacology, Maternal-Newborn, Pediatric Nursing, and Leadership. Includes 2,500+ questions.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Live Google Meet Lectures 4x / week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Full Access to 60+ Question Bank & SATA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Saunders 9th Edition PDF lecture notes</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-slate-900">PKR 15,000</div>
                  <div className="text-xs text-slate-500">One-time enrollment fee</div>
                </div>
                <Link
                  href="/courses/10"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
                >
                  Enroll Now
                </Link>
              </div>
            </div>

            {/* Track 2: SNLE */}
            <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Saudi SCFHS
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>4.9 (9.8k+ nurses)</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  Saudi Nursing Licensure (SNLE)
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Tailored for nurses taking the Saudi Commission for Health Specialties (SCFHS) exam. High-yield recall bank with verified clinical keys.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>2,000+ Saudi SNLE Recalls & Drills</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Dataflow & Mumaris+ Verification Guide</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Direct WhatsApp Senior Mentor Support</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-slate-900">PKR 18,000</div>
                  <div className="text-xs text-slate-500">One-time enrollment fee</div>
                </div>
                <Link
                  href="/courses/11"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
                >
                  Enroll Now
                </Link>
              </div>
            </div>

            {/* Track 3: Prometric */}
            <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Gulf Region
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>4.8 (12k+ nurses)</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  Prometric (DHA, MOH, Qatar, Oman)
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Targeted preparation for Gulf medical health authorities. Focus on infection control, cardiac triage, and pharmacology safety.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>DHA / HAAD / MOH Blueprint Specific</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Clinical Pearls & Rapid Review Sheets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Timed Mock Exams with Instant Scoring</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-slate-900">PKR 16,000</div>
                  <div className="text-xs text-slate-500">One-time enrollment fee</div>
                </div>
                <Link
                  href="/courses/12"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
                >
                  Enroll Now
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. TESTIMONIALS & CLINICAL PASS GUARANTEE ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Student Voices</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Trusted by 4,800+ Registered Nurses
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "The Select All That Apply (SATA) drills with Saunders rationales made all the difference. I stopped second-guessing my answers on the CAT exam and finished in 85 questions!"
              </p>
              <div className="pt-2 border-t border-slate-200">
                <div className="font-bold text-sm text-slate-900">Fatima Zahra, BSN, RN</div>
                <div className="text-xs text-slate-500">Passed NCLEX-RN (New York Board of Nursing)</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "Simple NCLEX's distractor analysis is superior to UWorld. You actually understand why the other 3 choices would cause adverse patient outcomes instead of just memorizing facts."
              </p>
              <div className="pt-2 border-t border-slate-200">
                <div className="font-bold text-sm text-slate-900">Ahmed Al-Mansoor, RN</div>
                <div className="text-xs text-slate-500">Passed Saudi SNLE with 86% Score</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "Passed my Dubai DHA nursing exam on my first attempt. The live classes and faculty WhatsApp support whenever I got stuck on heparin protocols were incredible."
              </p>
              <div className="pt-2 border-t border-slate-200">
                <div className="font-bold text-sm text-slate-900">Priya Nair, Staff Nurse</div>
                <div className="text-xs text-slate-500">Licensed Dubai Health Authority (DHA)</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 6. FINAL CALL TO ACTION ── */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Start Your Path To Licensure Today
          </h2>
          <p className="text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join thousands of practicing registered nurses. Start practicing high-yield clinical vignettes or enroll in our upcoming live review batch.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-md transition-all"
            >
              Create Free Student Account
            </Link>
            <Link
              href="/qbank"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition-all"
            >
              Open Interactive Q-Bank
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
