'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BookOpen, 
  HelpCircle, 
  User, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  ChevronDown,
  Layers
} from 'lucide-react';

interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  examType: string;
  hasAccess: boolean;
  accessType: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Suppress marketing navbar on /app routes (Q-bank app has its own topbar & sidebar)
  if (pathname?.startsWith('/app')) {
    return null;
  }

  const navLinks: { name: string; href: string; badge?: string }[] = [
    { name: 'Home', href: '/' },
    { name: 'Q-Bank', href: '/qbank' },
    { name: 'About Platform', href: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shadow-md shadow-sky-950/20 group-hover:scale-105 transition-transform shrink-0 border border-slate-200">
              <img
                src="/images/logo.png"
                alt="Simple NCLEX Platform Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                  Simple<span className="text-sky-600">NCLEX</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-sky-50 text-sky-700 rounded border border-sky-200">
                  Platform
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 -mt-0.5 hidden md:block font-medium">
                High-Yield RN, PN & Prometric Licensure
              </p>
            </div>
          </Link>

          {/* Tablet & Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative px-2.5 py-1.5 lg:px-3.5 lg:py-2 text-xs lg:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'text-sky-700 bg-sky-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                  {link.badge && (
                    <span className="hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Controls & CTA */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-3">
            {loading ? (
              <div className="w-20 lg:w-24 h-8 bg-slate-100 animate-pulse rounded-lg" />
            ) : user ? (
              <div className="flex items-center gap-1.5 lg:gap-2">

                {/* Admin Button */}
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={`inline-flex items-center gap-1 px-2 lg:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      pathname.startsWith('/admin')
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden lg:inline">Admin Panel</span>
                    <span className="lg:hidden">Admin</span>
                  </Link>
                )}

                {/* Profile Button */}
                <Link
                  href="/profile"
                  className={`inline-flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 text-xs lg:text-sm font-medium rounded-lg transition-colors ${
                    pathname === '/profile'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[80px] lg:max-w-[120px] truncate">{user.firstName}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 lg:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Link
                  href="/login"
                  className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-semibold text-slate-700 hover:text-sky-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm shadow-sky-500/20 transition-all whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Free Trial</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button & Quick Icons */}
          <div className="flex md:hidden items-center gap-1.5">
            {user && (
              <Link
                href="/profile"
                className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold shadow-sm"
                aria-label="Student profile"
              >
                {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 active:scale-95 transition-all"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu & Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top duration-200 shadow-xl">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-base font-medium ${
                pathname === link.href
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{link.name}</span>
                {link.badge && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {link.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}

          <div className="pt-4 border-t border-slate-100 space-y-2">
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-base font-medium text-slate-800 bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-600" />
                    <span>My Student Profile & Scores</span>
                  </span>
                </Link>

                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-indigo-700 bg-indigo-50 border border-indigo-100"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Management Portal</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-rose-600 hover:bg-rose-50 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </>
    )}
    </header>
  );
}
