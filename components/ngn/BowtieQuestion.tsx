'use client';

import React from 'react';
import { CheckCircle2, XCircle, ArrowRight, Activity, Stethoscope, AlertTriangle, HelpCircle } from 'lucide-react';

interface BowtieOptions {
  actionsToTake: string[];
  potentialConditions: string[];
  parametersToMonitor: string[];
}

interface BowtieValue {
  actionsToTake?: number[]; // pick 2
  potentialCondition?: number; // pick 1
  parametersToMonitor?: number[]; // pick 2
}

interface BowtieQuestionProps {
  options: BowtieOptions;
  value: BowtieValue;
  onChange: (newValue: BowtieValue) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
  correctAnswers?: {
    actionsToTake?: number[];
    potentialCondition?: number;
    parametersToMonitor?: number[];
  };
  rationalePerOption?: Record<string, string>;
}

export default function BowtieQuestion({
  options,
  value = {},
  onChange,
  disabled = false,
  isSubmitted = false,
  correctAnswers,
  rationalePerOption,
}: BowtieQuestionProps) {
  const actionsList = options?.actionsToTake || [];
  const conditionsList = options?.potentialConditions || [];
  const paramsList = options?.parametersToMonitor || [];

  const selectedActions = value?.actionsToTake || [];
  const selectedCondition = value?.potentialCondition;
  const selectedParams = value?.parametersToMonitor || [];

  const toggleAction = (idx: number) => {
    if (disabled || isSubmitted) return;
    let next: number[];
    if (selectedActions.includes(idx)) {
      next = selectedActions.filter((i) => i !== idx);
    } else {
      if (selectedActions.length >= 2) {
        next = [selectedActions[1], idx]; // Shift out oldest
      } else {
        next = [...selectedActions, idx];
      }
    }
    onChange({ ...value, actionsToTake: next });
  };

  const selectCondition = (idx: number) => {
    if (disabled || isSubmitted) return;
    onChange({ ...value, potentialCondition: idx });
  };

  const toggleParam = (idx: number) => {
    if (disabled || isSubmitted) return;
    let next: number[];
    if (selectedParams.includes(idx)) {
      next = selectedParams.filter((i) => i !== idx);
    } else {
      if (selectedParams.length >= 2) {
        next = [selectedParams[1], idx];
      } else {
        next = [...selectedParams, idx];
      }
    }
    onChange({ ...value, parametersToMonitor: next });
  };

  return (
    <div className="space-y-6">
      {/* Visual Instruction Banner */}
      <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-sky-950 text-xs sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>NCSBN Bow-Tie: Complete the clinical diagram by selecting <strong>2 Actions to Take</strong>, <strong>1 Potential Condition</strong>, and <strong>2 Parameters to Monitor</strong>.</span>
        <span className="text-[11px] text-sky-700 bg-white px-2 py-0.5 rounded-md border border-sky-300 w-fit shrink-0">
          5 Total Points (Partial Credit)
        </span>
      </div>

      {/* 3-Column Bowtie Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        
        {/* LEFT COLUMN: Actions to Take (Pick 2) */}
        <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900">
              <Stethoscope className="w-4 h-4 text-sky-600" />
              <span>Actions to Take</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              selectedActions.length === 2 ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {selectedActions.length}/2 Picked
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {actionsList.map((actionText, aIdx) => {
              const isSelected = selectedActions.includes(aIdx);
              const isExpected = isSubmitted && correctAnswers?.actionsToTake?.includes(aIdx);
              const isWrong = isSubmitted && isSelected && !isExpected;

              return (
                <button
                  key={aIdx}
                  type="button"
                  onClick={() => toggleAction(aIdx)}
                  disabled={disabled || isSubmitted}
                  className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSubmitted
                      ? isExpected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium'
                        : isWrong
                        ? 'border-rose-400 bg-rose-50 text-rose-950'
                        : 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60'
                      : isSelected
                      ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-500/20 font-semibold shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-sky-300 text-slate-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                    isSelected ? 'bg-sky-600 text-white border-sky-600 font-bold' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className="leading-relaxed">{actionText}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Potential Condition (Pick 1) */}
        <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-indigo-50/40 border-2 border-indigo-200 shadow-xs space-y-3 relative">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-indigo-950">
              <AlertTriangle className="w-4 h-4 text-indigo-600" />
              <span>Potential Condition</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              selectedCondition !== undefined ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-200 text-slate-600'
            }`}>
              {selectedCondition !== undefined ? '1/1 Selected' : 'Select 1'}
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {conditionsList.map((condText, cIdx) => {
              const isSelected = selectedCondition === cIdx;
              const isExpected = isSubmitted && correctAnswers?.potentialCondition === cIdx;
              const isWrong = isSubmitted && isSelected && !isExpected;

              return (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => selectCondition(cIdx)}
                  disabled={disabled || isSubmitted}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSubmitted
                      ? isExpected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                        : isWrong
                        ? 'border-rose-400 bg-rose-50 text-rose-950'
                        : 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60'
                      : isSelected
                      ? 'border-indigo-600 bg-indigo-100 text-indigo-950 ring-2 ring-indigo-500/20 font-bold shadow-2xs'
                      : 'border-indigo-100 bg-white hover:border-indigo-300 text-slate-800'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                    isSelected ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected ? '●' : ''}
                  </span>
                  <span className="leading-relaxed">{condText}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Parameters to Monitor (Pick 2) */}
        <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Parameters to Monitor</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              selectedParams.length === 2 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {selectedParams.length}/2 Picked
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {paramsList.map((paramText, pIdx) => {
              const isSelected = selectedParams.includes(pIdx);
              const isExpected = isSubmitted && correctAnswers?.parametersToMonitor?.includes(pIdx);
              const isWrong = isSubmitted && isSelected && !isExpected;

              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => toggleParam(pIdx)}
                  disabled={disabled || isSubmitted}
                  className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSubmitted
                      ? isExpected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium'
                        : isWrong
                        ? 'border-rose-400 bg-rose-50 text-rose-950'
                        : 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60'
                      : isSelected
                      ? 'border-teal-600 bg-teal-50 text-teal-950 ring-2 ring-teal-500/20 font-semibold shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-teal-300 text-slate-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                    isSelected ? 'bg-teal-600 text-white border-teal-600 font-bold' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className="leading-relaxed">{paramText}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Rationale breakdown */}
      {isSubmitted && rationalePerOption && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-700">
            Bow-Tie Clinical Rationale Breakdown:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600">
            {rationalePerOption.actions && (
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-sky-800 block mb-1">Actions Rationale:</span>
                <span className="leading-relaxed">{rationalePerOption.actions}</span>
              </div>
            )}
            {rationalePerOption.condition && (
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-indigo-800 block mb-1">Condition Rationale:</span>
                <span className="leading-relaxed">{rationalePerOption.condition}</span>
              </div>
            )}
            {rationalePerOption.parameters && (
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-teal-800 block mb-1">Parameters Rationale:</span>
                <span className="leading-relaxed">{rationalePerOption.parameters}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>NCSBN Bow-Tie Rule: Each correct item earns 1 point (up to 5 points total). Selecting incorrect items receives 0 points without deducting from other correct sections.</span>
      </div>
    </div>
  );
}
