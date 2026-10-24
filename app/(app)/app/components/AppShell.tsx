'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  ArrowLeft, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  GraduationCap, 
  Sparkles,
  BookOpen,
  User,
  Layers
} from 'lucide-react';
import type { UserSession } from '@/lib/auth';

interface AppShellProps {
  user: UserSession;
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/app',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'Create Test',
      href: '/app/create-test',
      icon: PlusCircle,
      exact: false,
    },
    {
      name: 'Test Sessions',
      href: '/app/sessions',
      icon: History,
      exact: false,
    },
  ];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 select-none">
        {/* Brand / Logo */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full overflow-hidden shadow-md border border-slate-700 shrink-0">
              <img
                src="/images/logo.png"
                alt="Simple NCLEX Platform Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-white tracking-tight">
                  Simple<span className="text-sky-400">NCLEX</span>
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase">
                  Q-Bank
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Candidate Portal</p>
            </div>
          </Link>
        </div>

        {/* Candidate Badge */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Active Track:</span>
            <span className="font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800 text-[11px]">
              {user.examType || 'NCLEX-RN'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Study Engine
          </div>
          {navItems.map((item) => {
            const active = isLinkActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Quick links to extra tools */}
          <div className="pt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Quick Navigation
          </div>
          <Link
            href="/flashcards"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Spaced Flashcards</span>
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Student Profile</span>
          </Link>

          {/* "Back to website" Link in sidebar */}
          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <Link
              href="/"
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border border-sky-500/20 transition-all group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to website</span>
            </Link>
          </div>
        </nav>

        {/* User Footer in Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              {user.firstName ? user.firstName[0].toUpperCase() : 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── TOPBAR ── */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
          {/* Left: Mobile Toggle & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                NCLEX Q-Bank
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Live Simulator
              </span>
            </div>
          </div>

          {/* Right: "Back to website" Link + User Info */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-sky-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-200 hover:bg-sky-50/50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to website</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-500">Candidate:</span>
              <span className="font-bold text-slate-800">{user.firstName}</span>
            </div>

            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── MOBILE DRAWER OVERLAY ── */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-slate-300 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">Simple NCLEX</span>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-bold">
                    Q-Bank
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 flex-1">
                {navItems.map((item) => {
                  const active = isLinkActive(item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                <div className="pt-4 border-t border-slate-800">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to website</span>
                  </Link>
                </div>
              </nav>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{user.firstName} {user.lastName}</p>
                  <p className="text-[10px] text-slate-400">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
