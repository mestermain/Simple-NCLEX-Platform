'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cookie, X, ShieldCheck } from 'lucide-react';

export default function CookieNotice() {
  const pathname = usePathname();
  const [acknowledged, setAcknowledged] = useState(true);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('simplenclex_cookie_consent');
      if (!consent) {
        setAcknowledged(false);
      }
    } catch (_) {}
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('simplenclex_cookie_consent', 'true');
    } catch (_) {}
    setAcknowledged(true);
  };

  if (pathname?.startsWith('/app') || acknowledged) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
          <Cookie className="w-4 h-4" />
        </div>
        <div className="space-y-2 text-xs">
          <div className="font-bold text-slate-100 flex items-center gap-1.5">
            <span>Privacy & Cookie Preferences</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            We use essential local cookies to keep you signed in and preserve your diagnostic quiz progress. Review our{' '}
            <Link href="/privacy" className="text-sky-400 underline hover:text-sky-300">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] transition-colors"
            >
              Accept Essential Cookies
            </button>
            <button
              onClick={handleAccept}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleAccept}
          className="text-slate-400 hover:text-white p-1 rounded-lg"
          aria-label="Close cookie banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
