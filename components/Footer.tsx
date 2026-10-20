import React from 'react';
import Link from 'next/link';
import { GraduationCap, ShieldCheck, PhoneCall, Mail, BookOpen, ExternalLink, Award } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Top Banner: Clinical Commitment */}
      <div className="bg-slate-950/60 border-b border-slate-800/80 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Award className="w-4 h-4 text-sky-400" />
            <span>Aligned with Saunders Comprehensive Review 9th Ed., NCSBN NGN Clinical Judgment Model, & ATI Nursing Standards</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              99.2% First-Time Pass Guarantee
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Simple<span className="text-sky-400">NCLEX</span> Academy
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The premier clinical training institute for internationally educated and domestic nurses preparing for NCLEX-RN, NCLEX-PN, HAAD, DHA, and Saudi Prometric licensure exams.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/923000000000"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>WhatsApp Senior Counselor</span>
              </a>
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
              <li>
                <Link href="/courses?track=NCLEX-RN" className="text-slate-400 hover:text-sky-400 transition-colors">
                  NCLEX-RN (Next Gen)
                </Link>
              </li>
              <li>
                <Link href="/courses?track=NCLEX-PN" className="text-slate-400 hover:text-sky-400 transition-colors">
                  NCLEX-PN Practical Nurse
                </Link>
              </li>
              <li>
                <Link href="/courses?track=DHA" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Dubai DHA Licensure
                </Link>
              </li>
              <li>
                <Link href="/courses?track=HAAD" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Abu Dhabi DoH / HAAD
                </Link>
              </li>
              <li>
                <Link href="/courses?track=SNLE" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Saudi SNLE & Prometric
                </Link>
              </li>
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
                <Link href="/profile" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Score Analytics & Reports
                </Link>
              </li>
            </ul>
          </div>

          {/* Academy & Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Academy & Verification
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Faculty & Clinicians
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
              <li>
                <Link href="/admin" className="text-slate-400 hover:text-sky-400 transition-colors">
                  Faculty Admin Login
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} Simple NCLEX Platform. All rights reserved. Professional educational preparatory materials.
          </p>
          <div className="flex items-center gap-6">
            <span>256-Bit SSL Encrypted Verification</span>
            <span>•</span>
            <span>NCSBN NGN Methodology Aligned</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
