'use client';

import React from 'react';
import { HelpCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ClozeQuestionProps {
  options: {
    text: string;
    dropdowns: Record<string, string[]>;
  };
  value: Record<string, string>;
  onChange: (newValue: Record<string, string>) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
  correctAnswers?: Record<string, string>;
  rationalePerOption?: Record<string, string>;
}

export default function ClozeQuestion({
  options,
  value = {},
  onChange,
  disabled = false,
  isSubmitted = false,
  correctAnswers,
  rationalePerOption,
}: ClozeQuestionProps) {
  const text = options?.text || '';
  const dropdowns = options?.dropdowns || {};

  const handleSelect = (dropKey: string, val: string) => {
    if (disabled || isSubmitted) return;
    onChange({
      ...value,
      [dropKey]: val,
    });
  };

  // Split text by [dropdown_X] patterns
  const tokens = React.useMemo(() => {
    const regex = /(\[dropdown_\w+\])/g;
    return text.split(regex);
  }, [text]);

  return (
    <div className="space-y-5">
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 text-slate-800 text-base leading-loose shadow-2xs font-normal">
        {tokens.map((token, idx) => {
          if (token.startsWith('[dropdown_') && token.endsWith(']')) {
            const dropKey = token.slice(1, -1);
            const choices = dropdowns[dropKey] || [];
            const selectedVal = value[dropKey] || '';
            const expectedVal = correctAnswers ? correctAnswers[dropKey] : undefined;
            const isMatch = isSubmitted && expectedVal && selectedVal.trim().toLowerCase() === expectedVal.trim().toLowerCase();
            const isWrong = isSubmitted && expectedVal && !isMatch;

            return (
              <span key={idx} className="inline-block mx-1.5 my-1 align-middle">
                <span className="relative inline-flex items-center">
                  <select
                    value={selectedVal}
                    onChange={(e) => handleSelect(dropKey, e.target.value)}
                    disabled={disabled || isSubmitted}
                    className={`text-xs sm:text-sm font-semibold py-2 px-3 pr-8 rounded-lg border shadow-2xs appearance-none transition-all cursor-pointer ${
                      isSubmitted
                        ? isMatch
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                          : isWrong
                          ? 'border-rose-400 bg-rose-50 text-rose-950 ring-2 ring-rose-400/20'
                          : 'border-slate-300 bg-white text-slate-800'
                        : selectedVal
                        ? 'border-sky-600 bg-sky-50/80 text-sky-950 ring-2 ring-sky-500/20'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <option value="">-- Select Clinical Option --</option>
                    {choices.map((choice, cIdx) => (
                      <option key={cIdx} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </span>
                </span>

                {/* Tutor Mode Result Feedback Pill */}
                {isSubmitted && isWrong && expectedVal && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Correct: &ldquo;{expectedVal}&rdquo;
                  </span>
                )}
              </span>
            );
          }
          return <span key={idx}>{token}</span>;
        })}
      </div>

      {/* Rationales Breakdown per Dropdown */}
      {isSubmitted && rationalePerOption && Object.keys(rationalePerOption).length > 0 && (
        <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2 text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-700">
            Dropdown Clinical Rationales:
          </div>
          <ul className="space-y-1.5 text-slate-600">
            {Object.entries(rationalePerOption).map(([k, rat]) => (
              <li key={k} className="flex items-start gap-2">
                <span className="font-bold text-sky-700 uppercase shrink-0">
                  {k.replace('_', ' ')}:
                </span>
                <span>{rat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>NCSBN Cloze (Dropdown) Rule: Complete the clinical narrative by selecting the correct choice for each dropdown. Partial credit is awarded for each correct selection.</span>
      </div>
    </div>
  );
}
