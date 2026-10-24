import React from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowLeft, BookOpen, GraduationCap, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
        
        {/* Clinical Icon */}
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100 shadow-inner">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-sky-600">
            Error 404 • Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Clinical Vignette Not Located
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            The page, question bank drill, or course syllabus you requested may have been moved, updated, or does not exist.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>

          <Link
            href="/qbank"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
          >
            <BookOpen className="w-4 h-4 text-sky-600" />
            <span>Open Practice Q-Bank</span>
          </Link>
        </div>

        <p className="text-[11px] text-slate-400">
          Need assistance finding a specific course or lecture? Reach out via{' '}
          <Link href="/contact" className="text-sky-600 hover:underline">
            Admissions Desk
          </Link>
          .
        </p>

      </div>
    </div>
  );
}
