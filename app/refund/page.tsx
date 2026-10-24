import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, RefreshCw, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '100% Pass Guarantee & Refund Policy',
  description: 'Policy regarding subscription cancellations, lecture batch refunds, and 100% pass guarantee qualification criteria at Simple NCLEX Academy.',
  alternates: {
    canonical: '/refund',
  },
};

export default function RefundPage() {
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
              This refund document specifies preliminary operating conditions and satisfaction protocols for review prior to commercial launch.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Satisfaction Commitment</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Refund & Guarantee Policy
          </h1>
          <p className="text-xs text-slate-500">
            Last Updated: October 2026 • Version 1.0-draft
          </p>
        </div>

        {/* Policy Content */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Digital Q-Bank Subscriptions</h2>
            <p>
              Due to the immediate digital delivery and instant access to proprietary questions, clinical distractor keys, and rationale databases upon activation:
            </p>
            <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm text-slate-600 pl-2">
              <li><strong>Zero Usage Guarantee:</strong> If you activated a subscription but have attempted fewer than 10 questions and request cancellation within 48 hours of purchase, you are eligible for a 100% full refund.</li>
              <li><strong>Active Usage:</strong> Once more than 10 questions have been solved or a mock exam completed, subscriptions are strictly non-refundable.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Live Lecture Courses & Batches</h2>
            <p>
              For comprehensive live cohort courses (e.g. NCLEX-RN 12-Week Prep, Saudi SNLE Intensive):
            </p>
            <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm text-slate-600 pl-2">
              <li><strong>Before Cohort Start:</strong> Cancellations received at least 72 hours prior to the batch orientation session receive a 100% full refund (less standard bank transfer fees).</li>
              <li><strong>Trial Period:</strong> If you attend the first 2 live classes and feel the teaching methodology does not fit your learning style, you may request a refund prior to Class 3.</li>
              <li><strong>After Class 2:</strong> Course fees become non-refundable as lecture slides, clinical sheets, and faculty seat allocations have been issued.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Pass Guarantee Commitment Policy</h2>
            <p>
              Our pass guarantee represents our confidence in our faculty curriculum and clinical distractor analysis. To qualify for complimentary batch retake access:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Qualification Criteria</span>
              </div>
              <ul className="space-y-1 list-disc list-inside pl-1 text-slate-600">
                <li>Complete 100% of required course assignments and at least 80% of live classes.</li>
                <li>Score an overall diagnostic Q-Bank average of 70% or higher.</li>
                <li>Take the official NCLEX/licensure examination within 60 days of course completion.</li>
                <li>Submit official test score report documentation from Pearson VUE or the state board within 30 days of receipt.</li>
              </ul>
              <p className="pt-2 text-slate-500 italic">
                Qualifying students receive complimentary enrollment in the very next live review cohort until licensure is achieved.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. How to Request a Refund</h2>
            <p>
              To initiate a refund request under the eligible terms above, contact our finance team via email at{' '}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-sky-600 font-semibold hover:underline">
                {siteConfig.contact.email}
              </a>{' '}
              or via WhatsApp at {siteConfig.contact.phone} with your registered student email and original payment transaction ID.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
