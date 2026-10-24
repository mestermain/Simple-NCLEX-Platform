'use client';

import React from 'react';
import { Target, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

interface CatSimulationProps {
  totalAnswered: number;
  currentDifficulty: string; // 'easy' | 'medium' | 'hard'
  thetaEstimate: number; // e.g. -2.0 to +2.0 scale (0 = passing threshold)
  confidenceMargin: number; // e.g. 0.8 decreasing down to 0.15
  minQuestions?: number;
  maxQuestions?: number;
}

export default function CatSimulationBanner({
  totalAnswered,
  currentDifficulty,
  thetaEstimate,
  confidenceMargin,
  minQuestions = 75,
  maxQuestions = 145,
}: CatSimulationProps) {
  // Ability relative to passing line (theta = 0 is passing standard)
  const isAboveStandard = thetaEstimate > 0;
  const lowerBound = thetaEstimate - confidenceMargin;
  const upperBound = thetaEstimate + confidenceMargin;
  const isConfidentPass = lowerBound > 0.05 && totalAnswered >= minQuestions;

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-2.5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold uppercase tracking-wider text-sky-400">
            NCSBN CAT Simulation Engine Active
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Target Window: <strong>{minQuestions} to {maxQuestions} Questions</strong>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <span className="text-[10px] text-slate-400 uppercase block">Items Completed</span>
          <span className="font-mono font-bold text-white text-sm">
            {totalAnswered} / {maxQuestions}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <span className="text-[10px] text-slate-400 uppercase block">Next Item Difficulty</span>
          <span className={`font-bold text-sm uppercase ${
            currentDifficulty === 'hard' ? 'text-rose-400' : currentDifficulty === 'medium' ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {currentDifficulty}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <span className="text-[10px] text-slate-400 uppercase block">Ability Level (θ)</span>
          <span className={`font-mono font-bold text-sm ${isAboveStandard ? 'text-emerald-400' : 'text-amber-400'}`}>
            {thetaEstimate > 0 ? `+${thetaEstimate.toFixed(2)}` : thetaEstimate.toFixed(2)}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <span className="text-[10px] text-slate-400 uppercase block">95% CI Status</span>
          <span className={`font-bold text-xs ${isConfidentPass ? 'text-emerald-400' : 'text-slate-300'}`}>
            {isConfidentPass ? 'Above Standard' : 'Calibrating'} (±{confidenceMargin.toFixed(2)})
          </span>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 leading-tight">
        ℹ️ The Computerized Adaptive Testing algorithm dynamically matches question difficulty to candidate ability using Item Response Theory. Minimum 75 questions required before early stopping rule applies.
      </div>
    </div>
  );
}
