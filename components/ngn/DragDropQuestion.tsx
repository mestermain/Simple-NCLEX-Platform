'use client';

import React, { useState } from 'react';
import { ArrowUp, ArrowDown, GripVertical, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface DragDropQuestionProps {
  options: string[]; // List of available steps
  value: number[]; // Ordered array of step original indices, e.g. [0, 1, 2, 3, 4]
  onChange: (newOrder: number[]) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
  correctAnswers?: number[];
  rationalePerOption?: string[] | Record<string, string>;
}

export default function DragDropQuestion({
  options = [],
  value = [],
  onChange,
  disabled = false,
  isSubmitted = false,
  correctAnswers,
  rationalePerOption,
}: DragDropQuestionProps) {
  // Ensure we have an initial sequence matching options length
  const currentSequence = React.useMemo(() => {
    if (value && value.length === options.length) {
      return value;
    }
    return options.map((_, i) => i);
  }, [value, options]);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (disabled || isSubmitted) return;
    if (toIndex < 0 || toIndex >= currentSequence.length) return;

    const next = [...currentSequence];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (disabled || isSubmitted) return;
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    moveItem(draggedIdx, targetIndex);
    setDraggedIdx(null);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center justify-between">
        <span>Order Priority: Arrange the following clinical actions in order from Highest Priority (Step 1) to Lowest Priority.</span>
        <span className="text-[10px] text-sky-700 hidden sm:inline">Use buttons or drag items to reorder</span>
      </div>

      <div className="space-y-2.5">
        {currentSequence.map((origIdx, posIdx) => {
          const stepText = options[origIdx];
          const isExpectedMatch = isSubmitted && correctAnswers && correctAnswers[posIdx] === origIdx;
          const isWrongPos = isSubmitted && correctAnswers && correctAnswers[posIdx] !== origIdx;

          return (
            <div
              key={origIdx}
              draggable={!disabled && !isSubmitted}
              onDragStart={(e) => handleDragStart(e, posIdx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, posIdx)}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isSubmitted
                  ? isExpectedMatch
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950'
                    : 'border-rose-300 bg-rose-50/60 text-rose-950'
                  : 'border-slate-200 bg-white hover:border-sky-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  {!disabled && !isSubmitted && (
                    <span className="cursor-grab text-slate-400 hover:text-slate-600 hidden sm:inline" title="Drag to reorder">
                      <GripVertical className="w-4 h-4" />
                    </span>
                  )}
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                    isSubmitted
                      ? isExpectedMatch
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-500 text-white'
                      : 'bg-slate-900 text-white'
                  }`}>
                    {posIdx + 1}
                  </span>
                </div>

                <span className="text-xs sm:text-sm font-medium leading-relaxed">
                  {stepText}
                </span>
              </div>

              {/* Position adjustment buttons for touch / accessibility */}
              {!isSubmitted ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveItem(posIdx, posIdx - 1)}
                    disabled={disabled || posIdx === 0}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                    title="Move Step Up"
                    aria-label={`Move Step ${posIdx + 1} Up`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(posIdx, posIdx + 1)}
                    disabled={disabled || posIdx === currentSequence.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                    title="Move Step Down"
                    aria-label={`Move Step ${posIdx + 1} Down`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="shrink-0 text-right">
                  {isExpectedMatch ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Correct Step {posIdx + 1}</span>
                    </span>
                  ) : (
                    <div className="text-[11px] font-bold text-rose-700 space-y-0.5">
                      <div className="flex items-center gap-1 justify-end">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>Incorrect Placement</span>
                      </div>
                      <div className="text-slate-500 font-normal">
                        Expected: {options[correctAnswers![posIdx]]?.slice(0, 30)}...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rationale breakdown */}
      {isSubmitted && rationalePerOption && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-700">
            Clinical Priority Rationale Sequence:
          </div>
          <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
            {Array.isArray(rationalePerOption)
              ? rationalePerOption.map((r, i) => (
                  <li key={i} className="leading-relaxed">
                    {r}
                  </li>
                ))
              : Object.values(rationalePerOption).map((r, i) => (
                  <li key={i} className="leading-relaxed">
                    {r}
                  </li>
                ))}
          </ol>
        </div>
      )}

      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>NCSBN Drag-and-Drop Rule: Place every action in order of clinical priority. Partial credit is given for each step correctly situated.</span>
      </div>
    </div>
  );
}
