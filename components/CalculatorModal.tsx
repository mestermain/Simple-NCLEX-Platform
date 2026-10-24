'use client';

import React, { useState, useEffect } from 'react';
import { X, Delete } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key >= '0' && e.key <= '9') {
        inputDigit(e.key);
      } else if (e.key === '.') {
        inputDecimal();
      } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        performOperation(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        performEquals();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay(String(-val));
    }
  };

  const inputPercent = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay(String(val / 100));
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;
      if (operator === '+') newValue = currentValue + inputValue;
      else if (operator === '-') newValue = currentValue - inputValue;
      else if (operator === '*' || operator === '×') newValue = currentValue * inputValue;
      else if (operator === '/' || operator === '÷') newValue = inputValue !== 0 ? currentValue / inputValue : 0;

      setPrevValue(newValue);
      setDisplay(String(Math.round(newValue * 10000) / 10000));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const performEquals = () => {
    const inputValue = parseFloat(display);
    if (operator && prevValue !== null) {
      let newValue = prevValue;
      if (operator === '+') newValue = prevValue + inputValue;
      else if (operator === '-') newValue = prevValue - inputValue;
      else if (operator === '*' || operator === '×') newValue = prevValue * inputValue;
      else if (operator === '/' || operator === '÷') newValue = inputValue !== 0 ? prevValue / inputValue : 0;

      setDisplay(String(Math.round(newValue * 10000) / 10000));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        role="dialog"
        aria-label="Clinical Dosage Calculator"
        className="w-full max-w-xs bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 border-b border-slate-700/70 text-white">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <h3 className="text-xs font-bold tracking-wide uppercase text-slate-300">
              NCLEX Clinical Calculator
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Calculator"
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 text-right">
          <div className="text-xs font-mono text-slate-500 h-4">
            {prevValue !== null && operator ? `${prevValue} ${operator}` : ''}
          </div>
          <div 
            className="text-2xl font-mono font-bold text-white tracking-wider truncate"
            title={display}
          >
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-slate-900">
          <button
            onClick={clearAll}
            className="p-3 text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 rounded-xl transition-colors"
          >
            C
          </button>
          <button
            onClick={toggleSign}
            className="p-3 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            ±
          </button>
          <button
            onClick={inputPercent}
            className="p-3 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            %
          </button>
          <button
            onClick={() => performOperation('/')}
            className={`p-3 text-sm font-bold rounded-xl transition-colors ${
              operator === '/' ? 'bg-sky-600 text-white' : 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/20'
            }`}
          >
            ÷
          </button>

          {['7', '8', '9'].map(d => (
            <button
              key={d}
              onClick={() => inputDigit(d)}
              className="p-3 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => performOperation('*')}
            className={`p-3 text-sm font-bold rounded-xl transition-colors ${
              operator === '*' ? 'bg-sky-600 text-white' : 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/20'
            }`}
          >
            ×
          </button>

          {['4', '5', '6'].map(d => (
            <button
              key={d}
              onClick={() => inputDigit(d)}
              className="p-3 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => performOperation('-')}
            className={`p-3 text-sm font-bold rounded-xl transition-colors ${
              operator === '-' ? 'bg-sky-600 text-white' : 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/20'
            }`}
          >
            −
          </button>

          {['1', '2', '3'].map(d => (
            <button
              key={d}
              onClick={() => inputDigit(d)}
              className="p-3 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => performOperation('+')}
            className={`p-3 text-sm font-bold rounded-xl transition-colors ${
              operator === '+' ? 'bg-sky-600 text-white' : 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/20'
            }`}
          >
            +
          </button>

          <button
            onClick={() => inputDigit('0')}
            className="col-span-2 p-3 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-center"
          >
            0
          </button>
          <button
            onClick={inputDecimal}
            className="p-3 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            .
          </button>
          <button
            onClick={performEquals}
            className="p-3 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-lg shadow-sky-600/30"
          >
            =
          </button>
        </div>

        {/* Footer tip */}
        <div className="px-4 py-2 bg-slate-950/80 text-[11px] text-slate-500 text-center border-t border-slate-800/80">
          Press Esc to close • Alt+C to toggle
        </div>
      </div>
    </div>
  );
}
