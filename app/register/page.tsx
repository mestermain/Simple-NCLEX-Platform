'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Lock, Mail, User, Phone, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [examType, setExamType] = useState('NCLEX-RN');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          examType,
          password,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Auto-login
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (loginData.success) {
          router.push('/profile');
        } else {
          router.push('/login');
        }
      } else {
        setErrorMsg(data.message || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
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
          Create Student Account
        </h2>
        <p className="text-sm text-slate-500">
          Start practicing high-yield NCLEX clinical scenarios and track your readiness
        </p>
      </div>

      {/* Registration Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="clinical-card bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  First Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Fatima"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-sm pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Zahra"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Phone / WhatsApp */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                WhatsApp / Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Exam Track */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Target Licensure Track
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="NCLEX-RN">NCLEX-RN (NextGen)</option>
                <option value="NCLEX-PN">NCLEX-PN Practical Nurse</option>
                <option value="SNLE">Saudi SNLE (SCFHS)</option>
                <option value="DHA">Dubai DHA Licensure</option>
                <option value="HAAD">Abu Dhabi HAAD / DoH</option>
                <option value="Prometric">Gulf Prometric (MOH, Qatar, Oman)</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Create Password
              </label>
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
              <p className="text-[11px] text-slate-400 mt-1">
                Minimum 6 characters. Use letters and numbers.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Creating Account...' : 'Complete Free Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Trust Banner */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>NCSBN Test Plan Aligned Student Account</span>
          </div>

        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Already registered with Simple NCLEX?{' '}
          <Link href="/login" className="font-bold text-sky-600 hover:text-sky-700 hover:underline">
            Log In Here
          </Link>
        </p>

      </div>
    </div>
  );
}
