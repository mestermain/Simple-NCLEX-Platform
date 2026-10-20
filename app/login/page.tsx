'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.user?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/profile');
        }
      } else {
        setErrorMsg(data.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg('An error occurred during sign-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-sky-600/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Student & Faculty Portal
        </h2>
        <p className="text-sm text-slate-500">
          Sign in to access your NCLEX Q-Bank, score reports, and lecture schedule
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="clinical-card bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="nurse@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In To Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Review Credentials:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@simplenclex.com', 'Admin123!')}
                className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-left transition-colors"
              >
                <div className="font-bold">Faculty Admin</div>
                <div className="text-[10px] text-indigo-600 truncate">admin@simplenclex.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('student@example.com', 'Student123!')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-left transition-colors"
              >
                <div className="font-bold">Nurse Student</div>
                <div className="text-[10px] text-slate-500 truncate">student@example.com</div>
              </button>
            </div>
          </div>

          {/* Trust Banner */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>256-Bit SSL Secure Nursing Licensure Portal</span>
          </div>

        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an academy account yet?{' '}
          <Link href="/register" className="font-bold text-sky-600 hover:text-sky-700 hover:underline">
            Register Free Here
          </Link>
        </p>

      </div>
    </div>
  );
}
