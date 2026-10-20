'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  GraduationCap, 
  BookOpen, 
  HelpCircle, 
  User, 
  ShieldCheck, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Lock,
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          // Fetch notifications count
          try {
            const notifRes = await fetch('/api/student/profile');
            const profileData = await notifRes.json();
            if (profileData.success && profileData.notifications) {
              const unread = profileData.notifications.filter((n: any) => !n.isRead).length;
              setUnreadNotifications(unread);
            }
          } catch (_) {}
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

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'NCLEX Q-Bank', href: '/qbank', badge: '60+ SATA & MCQs' },
    { name: 'Live Courses', href: '/courses' },
    { name: 'About Academy', href: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                  Simple<span className="text-sky-600">NCLEX</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-sky-50 text-sky-700 rounded border border-sky-200">
                  Academy
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block font-medium">
                High-Yield RN, PN & Prometric Prep
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'text-sky-700 bg-sky-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                  {link.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Controls & CTA */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-24 h-9 bg-slate-100 animate-pulse rounded-lg" />
            ) : user ? (
              <div className="flex items-center gap-2">
                
                {/* Platform Access Badge */}
                {user.hasAccess ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200/80" title="Full Unrestricted Q-Bank Access Active">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Full Access</span>
                  </span>
                ) : (
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 rounded-full border border-amber-200/80 hover:bg-amber-100 transition-colors"
                    title="You currently have 5 demo questions. Enroll in a course or subscribe for 100% full Q-Bank access."
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Demo Mode (Upgrade)</span>
                  </Link>
                )}

                {/* Notifications Link */}
                <Link
                  href="/profile#notifications"
                  className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </Link>

                {/* Admin Button */}
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      pathname.startsWith('/admin')
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                {/* Profile Button */}
                <Link
                  href="/profile"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    pathname === '/profile'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold">
                    {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[120px] truncate">{user.firstName}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-sky-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm shadow-sky-500/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Free Trial</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link
                href="/profile"
                className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold"
              >
                {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
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
                  {user.hasAccess ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Full Access
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                      Demo Mode
                    </span>
                  )}
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
      )}
    </header>
  );
}
