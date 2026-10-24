import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions governing candidate enrollment, intellectual property, and platform usage at Simple NCLEX Academy.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Breadcrumb / Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Legal Review Alert */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold uppercase tracking-wide">Notice: Draft Policy Under Legal Review</span>
            <p className="text-amber-800 leading-relaxed">
              These terms are a working operational draft for the platform development stage. Final enforceable legal terms and conditions will be ratified prior to commercial launch.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500">
            Last Updated: October 2026 • Version 1.0-draft
          </p>
        </div>

        {/* Policy Content */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing or using {siteConfig.name} (&quot;the Platform&quot;), including our interactive Next-Gen Question Bank, live lecture batches, study guides, and clinical discussion forums, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, you must not access the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Educational Preparatory Purpose Only</h2>
            <p>
              All materials provided on this platform—including clinical case studies, SATA questions, distractor analyses, and pharmacology review sheets—are strictly for licensure examination preparation.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-600">
              <div className="flex items-start gap-2 font-semibold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>No Medical Advice or Patient Care Decisions</span>
              </div>
              <p>
                The platform does not provide medical diagnoses, treatment prescriptions, or definitive patient care protocols. Healthcare practitioners must always exercise independent clinical judgment and consult institutional policies when managing real patients.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Non-Affiliation and Trademarks</h2>
            <p>
              NCLEX-RN®, NCLEX-PN®, and NCSBN® are registered trademarks of the National Council of State Boards of Nursing, Inc. Prometric®, SCFHS®, DHA, and HAAD are registered marks of their respective credentialing authorities. {siteConfig.name} is an independent test-prep resource and is not affiliated with, endorsed by, or sponsored by NCSBN or any official licensing agency.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. User Accounts and Security</h2>
            <p>
              Access to licensed questions and enrolled live batches is granted on an individual, non-transferable basis. You are solely responsible for maintaining the confidentiality of your login credentials. Account sharing, automated scraping, or unauthorized distribution of test bank items will result in immediate permanent account termination without refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Subscriptions and Access Periods</h2>
            <p>
              Access to question bank packages is active for the specific duration selected upon subscription (e.g., 30, 90, or 180 days). Enrolled course batches provide access for the duration of the scheduled cohort and active exam season.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. Intellectual Property</h2>
            <p>
              All custom clinical scenarios, rationales, proprietary question structures, and course slide decks are intellectual property of {siteConfig.name}. You may not reproduce, screenshot for commercial resale, reverse engineer, or publish any platform content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">7. Contact Information</h2>
            <p>
              For legal inquiries regarding terms of service, reach out to our administration at{' '}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-sky-600 font-semibold hover:underline">
                {siteConfig.contact.email}
              </a>{' '}
              or message via WhatsApp at {siteConfig.contact.phone}.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
