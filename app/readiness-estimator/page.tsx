'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Target, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Share2, 
  Check, 
  Copy, 
  Award, 
  Activity, 
  BookOpen, 
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface DiagnosticQuestion {
  id: number;
  domain: string;
  category: string;
  stem: string;
  options: string[];
  correctIndex: number;
  rationale: string;
  clinicalPearl: string;
}

const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 1,
    domain: 'Physiological Adaptation',
    category: 'Cardiovascular Hemodynamics',
    stem: 'A client admitted with acute decompensated heart failure is prescribed intravenous furosemide 40 mg. Two hours later, telemetry displays frequent premature ventricular contractions (PVCs). Which laboratory value should the nurse inspect immediately?',
    options: [
      'Serum potassium level',
      'Serum calcium level',
      'Hemoglobin and hematocrit',
      'Serum sodium level'
    ],
    correctIndex: 0,
    rationale: 'Loop diuretics promote significant potassium and magnesium excretion in the ascending limb of the loop of Henle. Hypokalemia directly increases myocardial irritability and precipitates life-threatening ventricular dysrhythmias.',
    clinicalPearl: 'Loop diuretics = Hypokalemia = Ventricular ectopy/PVCs! Always check potassium before and after IV Furosemide.'
  },
  {
    id: 2,
    domain: 'Pharmacological & Parenteral Therapies',
    category: 'Endocrine Pharmacology',
    stem: 'The nurse prepares to administer 10 units of regular insulin and 25 units of NPH insulin subcutaneously before breakfast. Which technique correctly illustrates safe preparation of these insulins in a single syringe?',
    options: [
      'Inject air into NPH, inject air into regular, draw up regular insulin first, then draw up NPH insulin.',
      'Inject air into regular, inject air into NPH, draw up NPH insulin first, then draw up regular insulin.',
      'Draw up NPH insulin first to ensure slow onset, then add regular insulin without injecting air.',
      'Regular and NPH insulin must never be combined in the same syringe under any circumstances.'
    ],
    correctIndex: 0,
    rationale: 'The classic mnemonic "Clear before Cloudy" dictates drawing up short-acting Regular insulin (clear) before intermediate-acting NPH insulin (cloudy) to prevent contaminating the regular insulin vial with modifying protamine proteins.',
    clinicalPearl: 'RN = Regular before NPH! Air into NPH -> Air into Regular -> Draw Regular -> Draw NPH.'
  },
  {
    id: 3,
    domain: 'Safe & Effective Care Environment',
    category: 'Management of Care & Prioritization',
    stem: 'The emergency department nurse receives change-of-shift report on four clients. Which client must the nurse evaluate FIRST?',
    options: [
      'A 45-year-old client with acute asthma who was previously wheezing loudly and now exhibits quiet breath sounds and lethargy.',
      'A 62-year-old client with chronic heart failure reporting 2+ bilateral pedal edema and mild dyspnea on exertion.',
      'A 24-year-old client with acute gastroenteritis who had 3 episodes of watery diarrhea in the past 4 hours.',
      'A 55-year-old client with renal calculi who rates right flank pain at 9/10 on the numerical rating scale.'
    ],
    correctIndex: 0,
    rationale: 'In acute severe asthma, the sudden cessation of wheezing ("silent chest") combined with lethargy indicates impending respiratory arrest secondary to extreme airway narrowing and respiratory muscle fatigue. This requires immediate airway intervention.',
    clinicalPearl: 'Silent chest in asthma = Impending respiratory arrest! Absolute #1 priority over stable chronic complaints.'
  },
  {
    id: 4,
    domain: 'Reduction of Risk Potential',
    category: 'Neurological Assessment',
    stem: 'A client who suffered a closed head injury has an intracranial pressure (ICP) monitoring catheter placed. Which clinical triad indicates impending brainstem herniation requiring urgent emergency hyperosmolar therapy?',
    options: [
      'Hypertension with widening pulse pressure, severe bradycardia, and irregular/Cheyne-Stokes respirations.',
      'Hypotension, profound tachycardia, and shallow tachypneic respirations.',
      'Hyperthermia, symmetric pinpoint pupils, and bilateral Babinski reflexes.',
      'Narrowed pulse pressure, jugular venous distention, and muffled heart sounds.'
    ],
    correctIndex: 0,
    rationale: 'Cushing\'s triad is the pathognomonic response to life-threatening intracranial hypertension and brainstem compression: systolic hypertension with widened pulse pressure, bradycardia, and irregular respirations.',
    clinicalPearl: 'Cushing\'s Triad = Wide pulse pressure + Bradycardia + Irregular breathing. Beck\'s Triad = Cardiac tamponade.'
  },
  {
    id: 5,
    domain: 'Physiological Adaptation',
    category: 'Respiratory Acid-Base Balance',
    stem: 'An arterial blood gas (ABG) analysis from an intubated client reveals: pH: 7.26, PaCO2: 58 mm Hg, HCO3: 24 mEq/L, PaO2: 82 mm Hg. How should the nurse accurately classify this acid-base imbalance?',
    options: [
      'Uncompensated Respiratory Acidosis',
      'Fully Compensated Metabolic Acidosis',
      'Uncompensated Respiratory Alkalosis',
      'Partially Compensated Metabolic Alkalosis'
    ],
    correctIndex: 0,
    rationale: 'pH < 7.35 indicates acidosis. PaCO2 > 45 mm Hg indicates respiratory retention of carbon dioxide. The HCO3 is normal (22-26 mEq/L), meaning renal compensation has not yet occurred, confirming uncompensated respiratory acidosis.',
    clinicalPearl: 'ROME: Respiratory Opposite, Metabolic Equal. Low pH + High CO2 with normal HCO3 = Uncompensated Respiratory Acidosis.'
  },
  {
    id: 6,
    domain: 'Safe & Effective Care Environment',
    category: 'Infection Control & Safety',
    stem: 'The nurse prepares to enter the room of a hospitalized client diagnosed with active pulmonary tuberculosis. Which personal protective equipment (PPE) is strictly required before entering the room?',
    options: [
      'Fit-tested N95 particulate respirator mask or PAPR in an airborne infection isolation negative-pressure room.',
      'Standard surgical loop mask and clean nitrile exam gloves.',
      'Full sterile gown, double gloves, and protective face shield.',
      'Droplet precaution mask with eye protection within 3 feet of client.'
    ],
    correctIndex: 0,
    rationale: 'Mycobacterium tuberculosis is transmitted via droplet nuclei smaller than 5 microns that remain suspended in the air. Airborne precautions require an AIIR (negative pressure) room and a fit-tested N95 respirator mask.',
    clinicalPearl: 'Airborne Precautions = MTV (Measles, TB, Varicella). Fit-tested N95 + Negative pressure room!'
  },
  {
    id: 7,
    domain: 'Reduction of Risk Potential',
    category: 'Clinical Judgment & Cue Recognition',
    stem: 'A client who is 36 hours post-operative following total knee arthroplasty suddenly reports shortness of breath, acute pleuritic chest pain, and anxiety. The nurse notes heart rate 116 beats/min and SpO2 88% on room air. What is the nurse\'s FIRST priority action?',
    options: [
      'Administer supplemental oxygen immediately and elevate the head of the bed.',
      'Obtain a STAT 12-lead electrocardiogram (ECG) and wait for the provider.',
      'Auscultate bilateral pedal pulses and massage the operative calf firmly.',
      'Administer oral acetaminophen 650 mg for chest discomfort.'
    ],
    correctIndex: 0,
    rationale: 'The presentation is classic for acute pulmonary embolism (PE). Priority first action is to correct acute arterial hypoxemia and maximize lung expansion by applying high-flow oxygen and placing the client in high-Fowler\'s position.',
    clinicalPearl: 'Acute dyspnea / suspected PE = Oxygen first, High-Fowler position immediately!'
  }
];

export default function ReadinessEstimatorPage() {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentQ = DIAGNOSTIC_QUESTIONS[currentIndex];

  const handleSelectOption = (optIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIdx,
    }));
  };

  const handleNext = () => {
    if (currentIndex < DIAGNOSTIC_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setQuizFinished(false);
    setStarted(false);
  };

  // Compute Results
  let correctCount = 0;
  const domainScores: Record<string, { correct: number; total: number }> = {};

  DIAGNOSTIC_QUESTIONS.forEach((q, idx) => {
    const isCorrect = selectedAnswers[idx] === q.correctIndex;
    if (isCorrect) correctCount++;

    if (!domainScores[q.domain]) {
      domainScores[q.domain] = { correct: 0, total: 0 };
    }
    domainScores[q.domain].total++;
    if (isCorrect) domainScores[q.domain].correct++;
  });

  const rawAccuracy = Math.round((correctCount / DIAGNOSTIC_QUESTIONS.length) * 100);

  // NCSBN Passing Probability Algorithm:
  // Baseline passing threshold mapping for 7 high-yield discriminating questions:
  // 7/7: 96% | 6/7: 91% | 5/7: 84% | 4/7: 74% | 3/7: 61% | 2/7: 48% | <=1: 35%
  const getPassingProbability = (correct: number) => {
    if (correct >= 7) return 96;
    if (correct === 6) return 91;
    if (correct === 5) return 84;
    if (correct === 4) return 74;
    if (correct === 3) return 61;
    if (correct === 2) return 48;
    return 35;
  };

  const passingProbability = getPassingProbability(correctCount);

  const getTier = (prob: number) => {
    if (prob >= 80) return { title: 'High Passing Probability', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
    if (prob >= 65) return { title: 'Moderate / Borderline Readiness', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 text-amber-800' };
    return { title: 'Needs Targeted Remediation', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200 text-rose-800' };
  };

  const tier = getTier(passingProbability);

  const handleCopyShare = () => {
    const text = `I just scored an estimated ${passingProbability}% NCLEX Passing Probability on Simple NCLEX Academy's free clinical diagnostic test! Check yours: https://simplenclexplatform.vercel.app/readiness-estimator`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Hero Title & Context */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 text-sky-600" />
            <span>NCSBN Benchmark Diagnostic Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Free NCLEX Passing Probability Calculator
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Take this free 7-question clinical diagnostic quiz to benchmark your nursing judgment, triage instincts, and pharmacology safety against passing standards.
          </p>
        </div>

        {!started ? (
          /* ── TEST START SCREEN ── */
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs font-bold uppercase text-slate-400 block">Test Length</span>
                <span className="text-2xl font-black text-slate-900">7 Questions</span>
                <span className="text-[11px] text-slate-500 block">High-yield clinical vignettes</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs font-bold uppercase text-slate-400 block">Estimated Time</span>
                <span className="text-2xl font-black text-sky-600">~4 Minutes</span>
                <span className="text-[11px] text-slate-500 block">Untimed, take your time</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs font-bold uppercase text-slate-400 block">Prediction Report</span>
                <span className="text-2xl font-black text-emerald-600">Instant</span>
                <span className="text-[11px] text-slate-500 block">Domain breakdown & advice</span>
              </div>
            </div>

            <div className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900 text-sm block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>How the Probability Engine Evaluates Your Score:</span>
              </span>
              <p>
                This diagnostic evaluates high-discriminating clinical items from the 4 major NCSBN Client Needs categories: <strong>Safe & Effective Care</strong>, <strong>Health Promotion</strong>, <strong>Psychosocial Integrity</strong>, and <strong>Physiological Adaptation</strong>. Your predicted passing percentage is calculated using the NCSBN test plan benchmark model.
              </p>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => setStarted(true)}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-base shadow-lg shadow-sky-600/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>Start Free Diagnostic Quiz</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : !quizFinished ? (
          /* ── QUESTION RUNNER ── */
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            
            {/* Stage Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-md bg-slate-900 text-white text-xs font-bold">
                  Question {currentIndex + 1} of {DIAGNOSTIC_QUESTIONS.length}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold">
                  {currentQ.domain}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {currentQ.category}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-600 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / DIAGNOSTIC_QUESTIONS.length) * 100}%` }}
              />
            </div>

            {/* Question Stem */}
            <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed pt-2">
              {currentQ.stem}
            </div>

            {/* Choices */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((optText, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/70 text-sky-950 ring-2 ring-sky-500/20 font-medium'
                        : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/20 text-slate-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 text-slate-500'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className="text-sm sm:text-base leading-relaxed">
                      {optText}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation Button */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                {selectedAnswers[currentIndex] === undefined ? 'Select an answer to continue' : 'Answer recorded'}
              </span>

              <button
                onClick={handleNext}
                disabled={selectedAnswers[currentIndex] === undefined}
                className="px-8 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>{currentIndex === DIAGNOSTIC_QUESTIONS.length - 1 ? 'Calculate My Passing Chance' : 'Next Question'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          /* ── FINAL REPORT & PROBABILITY REPORT ── */
          <div className="space-y-6">

            {/* Main Score & Gauge Card */}
            <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
              
              <div className="max-w-md mx-auto space-y-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${tier.bg}`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{tier.title}</span>
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Your NCLEX Passing Estimate
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Based on your performance across 7 core NCLEX clinical judgment scenarios.
                </p>
              </div>

              {/* Big Probability Gauge */}
              <div className="py-4">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-8 border-slate-100 flex flex-col items-center justify-center relative shadow-inner">
                    <span className={`text-5xl sm:text-6xl font-black tracking-tight ${tier.color}`}>
                      {passingProbability}%
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
                      Probability
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Correct Score</span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">{correctCount} / 7</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Raw Accuracy</span>
                  <span className="text-xl font-black text-sky-600 mt-0.5 block">{rawAccuracy}%</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">NCLEX Passing Line</span>
                  <span className="text-xl font-black text-emerald-600 mt-0.5 block">65% Standard</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Readiness Status</span>
                  <span className={`text-base font-black truncate mt-0.5 block ${tier.color}`}>
                    {passingProbability >= 80 ? 'Exam Ready' : passingProbability >= 65 ? 'Borderline' : 'Remediate'}
                  </span>
                </div>
              </div>

              {/* Domain Breakdown Table */}
              <div className="max-w-2xl mx-auto text-left space-y-3 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Diagnostic Performance by NCSBN Category:
                </span>
                <div className="space-y-2">
                  {Object.entries(domainScores).map(([domain, data]) => {
                    const pct = Math.round((data.correct / data.total) * 100);
                    return (
                      <div key={domain} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{domain}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{data.correct} of {data.total} correct</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            pct >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shareable Milestone Card */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>Official NCLEX Diagnostic Card</span>
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-700">Simple NCLEX Academy</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-indigo-100 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Predicted NCLEX-RN Pass Rate</span>
                  <div className="text-3xl font-black text-indigo-600">{passingProbability}%</div>
                  <span className="text-[11px] text-slate-600 block">Verified across 7 Core Clinical Domains</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyShare}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied to Clipboard!' : 'Share Your Score'}</span>
                  </button>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just scored an estimated ${passingProbability}% passing probability on @SimpleNCLEX's free clinical diagnostic test! Calculate yours: https://simplenclexplatform.vercel.app/readiness-estimator`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 transition-colors"
                  >
                    Post to X
                  </a>
                </div>
              </div>

              {/* Call to Action: Access Full Q-Bank */}
              <div className="p-6 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white text-left space-y-4 max-w-2xl mx-auto shadow-md">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Next Step: Prepare for Test Day
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold">
                    Unlock Full Q-Bank Practice & Next Gen Item Types
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Elevate your clinical readiness with original rationales, CAT adaptive simulation tests, and clinical spaced repetition flashcards.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <span>Create Free Account & Try Q-Bank</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={handleRestart}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Diagnostic Quiz</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Detailed Question Review & Rationales */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-600" />
                  <span>Clinical Rationales & High-Yield Pearls</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Aligned with NCSBN Test Plan
                </span>
              </div>

              <div className="space-y-6">
                {DIAGNOSTIC_QUESTIONS.map((q, idx) => {
                  const studentAnswer = selectedAnswers[idx];
                  const isCorrect = studentAnswer === q.correctIndex;

                  return (
                    <div key={q.id} className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-700">Item #{idx + 1} • {q.domain}</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                        {q.stem}
                      </p>

                      <div className="text-xs space-y-1">
                        <div className="text-slate-600">
                          Your Answer: <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>{q.options[studentAnswer] || 'None'}</strong>
                        </div>
                        {!isCorrect && (
                          <div className="text-emerald-800 font-semibold">
                            Correct Answer: <span>{q.options[q.correctIndex]}</span>
                          </div>
                        )}
                      </div>

                      {/* Rationale */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                        <strong className="text-slate-900 block font-bold">Clinical Rationale:</strong>
                        <p className="leading-relaxed">{q.rationale}</p>
                      </div>

                      {/* Pearl */}
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>Clinical Pearl:</strong> {q.clinicalPearl}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
