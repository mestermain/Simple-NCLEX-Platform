'use client';

import React from 'react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface MatrixQuestionProps {
  options: {
    rows: string[];
    columns: string[];
  };
  value: Record<string, number>;
  onChange: (newValue: Record<string, number>) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
  correctAnswers?: Record<string, number>;
  rationalePerOption?: Record<string, string>;
}

export default function MatrixQuestion({
  options,
  value = {},
  onChange,
  disabled = false,
  isSubmitted = false,
  correctAnswers,
  rationalePerOption,
}: MatrixQuestionProps) {
  const rows = options?.rows || [];
  const columns = options?.columns || [];

  const handleSelect = (rowIdx: number, colIdx: number) => {
    if (disabled || isSubmitted) return;
    onChange({
      ...value,
      [String(rowIdx)]: colIdx,
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <th className="p-3 sm:p-4 font-bold uppercase tracking-wider text-[11px] sm:text-xs text-slate-500 w-1/2 min-w-[200px]">
                Clinical Finding / Assessment
              </th>
              {columns.map((col, cIdx) => (
                <th
                  key={cIdx}
                  className="p-3 sm:p-4 text-center font-bold text-slate-900 border-l border-slate-200 min-w-[120px]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((rowText, rIdx) => {
              const selectedCol = value[String(rIdx)];
              const expectedCol = correctAnswers ? Number(correctAnswers[String(rIdx)]) : undefined;
              const isRowAnswered = selectedCol !== undefined;
              const isRowCorrect = isSubmitted && expectedCol !== undefined && selectedCol === expectedCol;

              return (
                <React.Fragment key={rIdx}>
                  <tr
                    className={`transition-colors ${
                      isSubmitted
                        ? isRowCorrect
                          ? 'bg-emerald-50/30'
                          : isRowAnswered
                          ? 'bg-rose-50/30'
                          : 'bg-white'
                        : rIdx % 2 === 0
                        ? 'bg-white'
                        : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="p-3.5 sm:p-4 text-slate-800 font-medium leading-relaxed align-middle">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-slate-400 text-xs mt-0.5">
                          {rIdx + 1}.
                        </span>
                        <span>{rowText}</span>
                      </div>
                    </td>

                    {columns.map((_, cIdx) => {
                      const isSelected = selectedCol === cIdx;
                      const isExpected = isSubmitted && expectedCol === cIdx;
                      const isWrongPick = isSubmitted && isSelected && !isExpected;

                      return (
                        <td
                          key={cIdx}
                          onClick={() => handleSelect(rIdx, cIdx)}
                          className={`p-3 sm:p-4 text-center border-l border-slate-100 align-middle transition-colors ${
                            !disabled && !isSubmitted ? 'cursor-pointer hover:bg-sky-50/40' : ''
                          } ${
                            isExpected
                              ? 'bg-emerald-100/60 font-bold'
                              : isWrongPick
                              ? 'bg-rose-100/60'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            <input
                              type="radio"
                              name={`matrix_row_${rIdx}`}
                              checked={isSelected}
                              onChange={() => handleSelect(rIdx, cIdx)}
                              disabled={disabled || isSubmitted}
                              className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                              aria-label={`${rowText} - ${columns[cIdx]}`}
                            />
                          </div>
                          {isSubmitted && isExpected && (
                            <span className="text-[10px] text-emerald-800 font-extrabold block mt-1">
                              ✓ Correct
                            </span>
                          )}
                          {isSubmitted && isWrongPick && (
                            <span className="text-[10px] text-rose-700 font-extrabold block mt-1">
                              ✗ Selected
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Individual Row Rationale in Tutor Mode */}
                  {isSubmitted && rationalePerOption && rationalePerOption[String(rIdx)] && (
                    <tr className="bg-slate-50/80 text-xs border-b border-slate-200">
                      <td colSpan={columns.length + 1} className="px-4 py-2 text-slate-600 italic">
                        <span className="font-semibold text-slate-800 not-italic">Clinical Rationale: </span>
                        {rationalePerOption[String(rIdx)]}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>NCSBN Matrix Rule: Select one clinical classification for each row. Partial credit is awarded for every correct row match.</span>
      </div>
    </div>
  );
}
