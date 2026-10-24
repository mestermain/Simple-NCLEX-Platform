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
  Target,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Layers,
  PhoneCall
} from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';
import DemoBadge from '@/components/DemoBadge';

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

export default function HomeClient() {
  const [demoMcqs, setDemoMcqs] = useState<DemoMCQ[]>([]);
  const [loadingMcqs, setLoadingMcqs] = useState(true);
  const [demoStarted, setDemoStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
              Master Next-Gen Clinical Judgment scenarios, multi-choice Select All That Apply (SATA) questions, and evidence-based distractor analyses built specifically for future RNs.
            </p>

            {/* Action Buttons - Clear Single Primary CTA */}
            <div className="pt-4 flex flex-col items-center justify-center gap-3">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                <Link
                  href="/qbank"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-xl shadow-sky-600/30 transition-all group scale-100 hover:scale-[1.02]"
                >
                  <Sparkles className="w-5 h-5 text-sky-200" />
                  <span>Launch Free Interactive Q-Bank</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/courses"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 rounded-xl transition-all"
                >
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  <span>Browse Live Classes</span>
                </Link>
                <Link
                  href="/readiness-estimator"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-700/60 rounded-xl transition-all"
                >
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Free Passing Calculator</span>
                </Link>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Instant trial access • No credit card required • Spaced repetition & NGN case studies included</span>
              </p>
            </div>

            {/* Clinical Trust Metrics */}
            <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-800/80 text-left">
              {siteConfig.stats.passRate ? (
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 relative">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-sky-400">{siteConfig.stats.passRate}</div>
                    <DemoBadge label="Demo" />
                  </div>
                  <div className="text-xs text-slate-400">Target Pass Rate</div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-2xl font-bold text-sky-400">NextGen</div>
                  <div className="text-xs text-slate-400">NGN Clinical Focus</div>
                </div>
              )}
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-bold text-indigo-400">High-Yield</div>
                <div className="text-xs text-slate-400">Clinical MCQs & SATA</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-bold text-emerald-400">Evidence-Based</div>
                <div className="text-xs text-slate-400">Distractor Rationales</div>
              </div>
              {siteConfig.stats.alumniCount ? (
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 relative">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-amber-400">{siteConfig.stats.alumniCount}</div>
                    <DemoBadge label="Demo" />
                  </div>
                  <div className="text-xs text-slate-400">Alumni Community</div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-2xl font-bold text-amber-400">Live Support</div>
                  <div className="text-xs text-slate-400">Senior Faculty Mentorship</div>
                </div>
              )}
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
              Experience the actual NextGen clinical rationales and distractor breakdowns our students use daily.
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
                    Test your pharmacology and physiological adaptation knowledge on 5 real examination vignettes with full distractor analyses.
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
                    <span>Launch Full Q-Bank</span>
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
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {!isSubmitted ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={selectedOption === null}
                      className="w-full sm:w-auto text-center justify-center px-6 py-3 sm:py-2.5 text-sm font-bold rounded-xl sm:rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-all cursor-pointer"
                    >
                      Check Clinical Rationale
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 sm:py-2.5 text-sm font-bold rounded-xl sm:rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all cursor-pointer"
                    >
                      <span>Try Next Practice Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-right">
                    Clinical Judgment Measurement Model (CJMM)
                  </span>
                </div>

                {/* Evidence-Based Clinical Rationale & Distractor Box (Displayed upon submit) */}
                {isSubmitted && (
                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-4 animate-in fade-in-50 duration-300">
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Evidence-Based Clinical Rationale:</span>
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
                  Ready for the full question bank with Select All That Apply (SATA)?
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

      {/* ── 3. HOW IT WORKS (3 STEPS) ── */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              The Path To Passing
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How Simple NCLEX Works in 3 Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              A systematic, clinical-judgment-first study system engineered to get you licensed on your very first attempt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Step 1 */}
            <div className="relative p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-sky-300 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-sky-600/20">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Diagnose & Practice
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Start practicing immediately with high-yield clinical vignettes, SATA drills, and prioritization scenarios. Pinpoint your weak client-needs areas and physiological systems.
                </p>
              </div>
              <div className="pt-2 text-xs font-semibold text-sky-700 flex items-center gap-1">
                <span>Free instant access available</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/20">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Master Distractor Analysis
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Stop rote memorization. Study evidence-based clinical rationales that break down exactly why each incorrect distractor poses adverse risks to patient safety.
                </p>
              </div>
              <div className="pt-2 text-xs font-semibold text-indigo-700 flex items-center gap-1">
                <span>NextGen clinical judgment focus</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/20">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Pass With High Confidence
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Simulate computerized adaptive testing (CAT) pacing, or join our live Google Meet review cohorts with 1-on-1 faculty mentorship until licensure is achieved.
                </p>
              </div>
              <div className="pt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <span>First-time pass commitment</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. CLINICAL FRAMEWORK FEATURES ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Designed For High-Stakes Nursing Licensure
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              We eliminated memorization fluff and focused 100% on clinical decision-making, patient safety guidelines, and evidence-based rationale mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            
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
                In-Depth Distractor Rationales & Clinical Pearls
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Track 1: NCLEX-RN */}
            <div className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                    Comprehensive Track
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Global RN Prep</span>
                    <DemoBadge label="Demo" />
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
                    <span>Full Access to NCLEX Question Bank & SATA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Evidence-based clinical lecture notes</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-black text-slate-900">PKR 15,000</span>
                    <DemoBadge label="Demo Fee" />
                  </div>
                  <div className="text-xs text-slate-500">Sample enrollment fee</div>
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
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Licensure Track</span>
                    <DemoBadge label="Demo" />
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
                    <span>Saudi SNLE Recalls & Drills</span>
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-black text-slate-900">PKR 18,000</span>
                    <DemoBadge label="Demo Fee" />
                  </div>
                  <div className="text-xs text-slate-500">Sample enrollment fee</div>
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
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Prometric Prep</span>
                    <DemoBadge label="Demo" />
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-black text-slate-900">PKR 16,000</span>
                    <DemoBadge label="Demo Fee" />
                  </div>
                  <div className="text-xs text-slate-500">Sample enrollment fee</div>
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

      {/* ── 5. TRANSPARENT PRICING PREVIEW ── */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Flexible Plans</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Invest In Your Licensure Success
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Clear, upfront pricing with no hidden charges. Choose a self-paced Q-Bank subscription or join a live cohort.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {siteConfig.qbankPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
                  plan.id === 'plan-90'
                    ? 'bg-white border-sky-500 shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/20'
                    : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-sm">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500">{plan.description}</p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                        PKR {plan.pricePkr.toLocaleString()}
                      </span>
                      {plan.originalPricePkr > plan.pricePkr && (
                        <span className="text-sm text-slate-400 line-through">
                          PKR {plan.originalPricePkr.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <span>One-time fee for {plan.durationDays} days full access</span>
                      <DemoBadge label="Sample Fee" />
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Link
                    href={`/qbank?subscribe=${plan.id}`}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      plan.id === 'plan-90'
                        ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>Subscribe To {plan.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Live Course Alternative Banner */}
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-sky-900 to-indigo-950 text-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Prefer Live Instruction?</span>
              <h3 className="text-lg font-bold">Enroll in a 12-Week Comprehensive Live Batch</h3>
              <p className="text-xs text-slate-300 max-w-xl">
                Includes full Q-Bank access, 4x weekly live Google Meet lectures, and direct WhatsApp faculty mentoring.
              </p>
            </div>
            <Link
              href="/courses"
              className="shrink-0 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors shadow-sm"
            >
              Explore Live Courses
            </Link>
          </div>

        </div>
      </section>

      {/* ── 6. TESTIMONIALS & CLINICAL PASS GUARANTEE ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Student Voices</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {siteConfig.stats.alumniCount ? `Trusted by ${siteConfig.stats.alumniCount} Nurses` : 'Trusted by Registered Nurses Worldwide'}
            </h2>
            {siteConfig.claims.passGuarantee && (
              <p className="text-sm text-slate-600 flex items-center justify-center gap-2">
                <span>{siteConfig.claims.passGuarantee}</span>
                <DemoBadge label="Demo Policy" />
              </p>
            )}
          </div>

          {siteConfig.testimonials && siteConfig.testimonials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {siteConfig.testimonials.map((t) => (
                <div key={t.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    {t.isDemo && <DemoBadge label="Demo Story" />}
                  </div>
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="pt-2 border-t border-slate-200">
                    <div className="font-bold text-sm text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.examTrack}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-6 rounded-2xl bg-slate-50 border border-slate-200 max-w-xl mx-auto">
              <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Verified Student Reviews</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Testimonials from recent examination cycles are currently undergoing verification and will appear here shortly.
              </p>
            </div>
          )}

        </div>
      </section>

      {/* ── 7. FREQUENTLY ASKED QUESTIONS (FAQ) ── */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Everything You Need To Know
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
              Answers to common questions about questions, computerized testing, and enrollment.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How does the interactive NCLEX Q-Bank reflect the Next Generation NCLEX (NGN) format?',
                a: 'Our question bank incorporates NGN clinical judgment measurement models, including multi-choice Select All That Apply (SATA), case scenarios, priority triaging drills, and detailed rationales for every option explaining clinical safety implications.',
              },
              {
                q: 'Can I study seamlessly on mobile phones, tablets, and laptops?',
                a: 'Yes! The entire Simple NCLEX Platform is built mobile-first and fully responsive across smartphones, tablets, and desktop computers. Your test progress and question flags synchronize automatically with your account.',
              },
              {
                q: 'What is included in the live cohort review courses?',
                a: 'Enrolled students receive 4x weekly live Google Meet lectures with screen-sharing, complete slide decks and pharmacology review PDFs, full unrestricted access to the complete Question Bank, and 1-on-1 WhatsApp mentoring with senior faculty.',
              },
              {
                q: 'What payment options are accepted for subscriptions and tuition?',
                a: 'We accept domestic bank transfers (via IBAN/Raast), Easypaisa, and JazzCash. Upon uploading your payment screenshot, our administration desk verifies and activates your full access within a few hours.',
              },
              {
                q: 'How does the First-Time Pass Commitment policy work?',
                a: 'Students who complete 100% of their enrolled batch assignments and achieve a 70%+ score on diagnostic readiness assessments are eligible for complimentary batch review access until official licensure is achieved.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm hover:text-sky-600 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="p-1 rounded-md bg-slate-100 text-slate-600 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-slate-500">
              Have another question? Reach out to our admissions counselor via{' '}
              <Link href="/contact" className="text-sky-600 font-semibold underline hover:text-sky-700">
                Contact Page
              </Link>
              {siteConfig.contact.whatsappUrl ? (
                <>
                  {' '}or chat instantly on{' '}
                  <a href={siteConfig.contact.whatsappUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold underline hover:text-emerald-700">
                    WhatsApp
                  </a>.
                </>
              ) : (
                '.'
              )}
            </p>
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
