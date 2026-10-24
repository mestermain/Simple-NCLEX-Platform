'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, PhoneCall, Mail, BookOpen, ExternalLink, Award } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';
import DemoBadge from '@/components/DemoBadge';

export default function Footer() {
  const pathname = usePathname();

  // Suppress marketing footer on /app routes
  if (pathname?.startsWith('/app')) {
    return null;
  }
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Top Banner: Clinical Commitment */}
      <div className="bg-slate-950/60 border-b border-slate-800/80 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-400">
            <Award className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{siteConfig.claims.clinicalBlueprintNote}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            {siteConfig.claims.passGuarantee ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{siteConfig.claims.passGuarantee}</span>
                <DemoBadge label="Sample" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <span>Evidence-Based Preparation</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden shadow-md shrink-0 border border-slate-700">
                <img
                  src="/images/logo.png"
                  alt="Simple NCLEX Platform Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Simple<span className="text-sky-400">NCLEX</span> Platform
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The premier clinical training institute for internationally educated and domestic nurses preparing for NCLEX-RN, NCLEX-PN, HAAD, DHA, and Saudi Prometric licensure exams.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {siteConfig.contact.whatsappUrl && (
                <a
                  href={siteConfig.contact.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>WhatsApp Senior Counselor</span>
                </a>
              )}
              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <span>Faculty Directory</span>
              </Link>
            </div>
          </div>

          {/* Exam Tracks */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Licensure Tracks
            </h4>
            <ul className="space-y-2.5 text-sm">
              {siteConfig.tracks.map((track) => (
                <li key={track.id}>
                  <Link
                    href={`/courses?category=${track.categorySlug}&track=${track.id}`}
                    className="text-slate-400 hover:text-sky-400 transition-colors"
                  >
                    {track.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Testing Engine */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Practice Q-Bank
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/qbank" className="text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1">
                  <span>Interactive Q-Bank</span>
                  <span className="text-[10px] bg-sky-950 text-sky-400 px-1.5 py-0.2 rounded border border-sky-800">
                    Live
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/qbank?mode=sata" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Select All That Apply (SATA)
                </Link>
              </li>
              <li>
                <Link href="/qbank?category=Pharmacology" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Pharmacology Drills
                </Link>
              </li>
              <li>
                <Link href="/qbank?category=Management+of+Care" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Priority & Triage Drills
                </Link>
              </li>
              <li>
                <Link href="/flashcards" className="text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1">
                  <span>Spaced Repetition Flashcards</span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-400 px-1.5 py-0.2 rounded border border-indigo-800">
                    SM-2
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/readiness-estimator" className="text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1">
                  <span>Passing Probability Calculator</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-800">
                    Free
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Score Analytics & Reports
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Platform & Support
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Faculty & Clinicians
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Admissions Advising & Help
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Enrollment Desk
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar with Legal and Regulatory Links */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="text-center md:text-left">
            © {new Date().getFullYear()} Simple NCLEX Platform. All rights reserved. Professional educational preparatory materials.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/refund" className="hover:text-slate-300 transition-colors">
              Refund & Pass Guarantee
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-slate-300 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
