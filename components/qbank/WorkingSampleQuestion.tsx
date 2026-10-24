'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  RotateCcw, 
  Sparkles, 
  AlertTriangle, 
  Activity,
  ArrowRight
} from 'lucide-react';

interface Option {
  id: number;
  letter: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

const SAMPLE_QUESTION = {
  category: 'Physiological Adaptation & Pharmacological Therapies',
  examTrack: 'NextGen NCLEX-RN / PN',
  difficulty: 'Hard · High-Yield Clinical Priority',
  scenario: `A 68-year-old client with chronic systolic heart failure is admitted to the step-down unit reporting nausea, anorexia, and seeing yellowish-green halos around room lights. Vital signs: BP 102/64 mm Hg, HR 48 beats/min (irregular), RR 18 breaths/min, SpO₂ 96% on room air. Morning laboratory values indicate a serum potassium of 3.1 mEq/L (3.1 mmol/L) and a serum digoxin level of 2.6 ng/mL.`,
  question: 'Which nursing action is the highest immediate priority?',
  options: [
    {
      id: 0,
      letter: 'A',
      text: 'Administer the morning scheduled dose of furosemide 40 mg IV push to reduce fluid overload.',
      isCorrect: false,
      explanation: 'Loop diuretics promote renal potassium wasting. Administering furosemide in the presence of hypokalemia (3.1 mEq/L) dangerously potentiates digoxin toxicity and precipitates fatal ventricular arrhythmias.'
    },
    {
      id: 1,
      letter: 'B',
      text: 'Withhold digoxin, initiate continuous electrocardiogram (ECG) monitoring, and notify the health care provider immediately.',
      isCorrect: true,
      explanation: 'Therapeutic digoxin levels range from 0.5–2.0 ng/mL (often 0.5–0.9 ng/mL for heart failure). A level of 2.6 ng/mL, coupled with gastrointestinal distress, visual disturbances, and symptomatic bradycardia (HR 48 bpm), indicates acute digoxin toxicity. Withholding the drug, putting the client on continuous cardiac telemetry, and notifying the provider for potential digoxin immune Fab (DigiFab) is the urgent life-saving priority.'
    },
    {
      id: 2,
      letter: 'C',
      text: 'Offer the client 8 ounces of orange juice to orally replenish serum potassium before rechecking labs.',
      isCorrect: false,
      explanation: 'Oral intake is insufficient for acute, symptomatic toxicity with cardiac manifestations. Furthermore, orange juice alone cannot rapidly reverse dangerous hypokalemia or treat life-threatening bradyarrhythmias.'
    },
    {
      id: 3,
      letter: 'D',
      text: 'Document the manifestations as expected, self-limiting side effects of chronic cardiac glycoside therapy.',
      isCorrect: false,
      explanation: 'Visual halos and severe bradycardia are pathognomonic signs of life-threatening toxicity, never expected or acceptable side effects.'
    }
  ],
  clinicalPearl: 'NCSBN Clinical Judgment Rule: Always auscultate the apical pulse for 1 full minute before administering digoxin. Withhold and notify the provider if HR < 60 bpm in adults. Hypokalemia drastically enhances digoxin binding to myocardial Na+/K+ ATPase, dramatically increasing toxicity risk even at borderline doses.'
};

export default function WorkingSampleQuestion({ launchUrl }: { launchUrl: string }) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (idx: number) => {
    if (!submitted) {
      setSelectedOption(idx);
    }
  };

  const handleSubmit = () => {
    if (selectedOption !== null) {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setSubmitted(false);
  };

  const isCorrect = selectedOption !== null && SAMPLE_QUESTION.options[selectedOption].isCorrect;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden transition-all">
      {/* Question Header Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
            Interactive Sample Question
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">|</span>
          <span className="text-xs text-slate-300 hidden sm:inline">{SAMPLE_QUESTION.category}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {SAMPLE_QUESTION.examTrack}
          </span>
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {SAMPLE_QUESTION.difficulty}
          </span>
        </div>
      </div>

      {/* Clinical Scenario Box */}
      <div className="p-4 sm:p-6 sm:pb-4 space-y-4">
        <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm sm:text-base leading-relaxed">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wide mb-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <span>Clinical Client Scenario</span>
          </div>
          <p>{SAMPLE_QUESTION.scenario}</p>
        </div>

        <p className="text-base sm:text-lg font-bold text-slate-900 pt-1">
          {SAMPLE_QUESTION.question}
        </p>

        {/* Options */}
        <div className="space-y-3 pt-1">
          {SAMPLE_QUESTION.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            let style = 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/30 text-slate-800';

            if (submitted) {
              if (option.isCorrect) {
                style = 'border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20 font-medium';
              } else if (isSelected && !option.isCorrect) {
                style = 'border-rose-400 bg-rose-50 text-rose-950 ring-2 ring-rose-400/20';
              } else {
                style = 'border-slate-200 bg-slate-50 text-slate-400 opacity-60';
              }
            } else if (isSelected) {
              style = 'border-sky-600 bg-sky-50/80 text-sky-950 ring-2 ring-sky-500/20 font-medium';
            }

            return (
              <button
                key={option.id}
                onClick={() => handleSelect(idx)}
                disabled={submitted}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer text-sm sm:text-base ${style}`}
              >
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {submitted && option.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : submitted && isSelected && !option.isCorrect ? (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  ) : (
                    option.letter
                  )}
                </span>
                <span className="flex-1 leading-relaxed">{option.text}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 ${
                selectedOption !== null
                  ? 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer hover:shadow-sky-600/25'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Submit Answer</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <Link
                href={launchUrl}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all"
              >
                <span>Practice 3,500+ More in Q-Bank</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          <span className="text-xs text-slate-500">
            {submitted ? 'Full explanation provided below' : 'Select an option to test your clinical judgment'}
          </span>
        </div>
      </div>

      {/* Submitted Result & Rationales */}
      {submitted && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-5 animate-in fade-in duration-300">
          {/* Result Banner */}
          <div
            className={`p-4 rounded-xl flex items-start gap-3 border ${
              isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base">
                {isCorrect ? 'Correct! High-Yield Clinical Priority Recognized' : 'Incorrect — Review Critical Clinical Priority'}
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed">
                {isCorrect
                  ? 'Excellent clinical judgment. Withholding digoxin and immediate cardiac telemetry takes precedence over all other nursing actions in acute toxicity.'
                  : 'In suspected digitalis toxicity with severe bradycardia, administering potassium-depleting loop diuretics or delaying telemetry puts the client at imminent risk of lethal cardiac arrest.'}
              </p>
            </div>
          </div>

          {/* Option-by-Option Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-sky-600" />
              <span>Option-by-Option Clinical Rationales</span>
            </h4>
            <div className="space-y-2.5">
              {SAMPLE_QUESTION.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                    opt.isCorrect
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-medium'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                      Option {opt.letter}
                    </span>
                    <span className={opt.isCorrect ? 'text-emerald-700' : 'text-slate-600'}>
                      {opt.isCorrect ? 'Correct Answer' : 'Incorrect Distractor'}
                    </span>
                  </div>
                  <p>{opt.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Pearl Box */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-900 block">High-Yield Clinical Pearl</span>
              <p>{SAMPLE_QUESTION.clinicalPearl}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
