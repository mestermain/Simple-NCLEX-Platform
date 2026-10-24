import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Lock, CheckCircle2, Eye, Server, UserCheck } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy & Student Data Protection',
  description: 'How Simple NCLEX Academy collects, encrypts, and protects nursing student records, test performance analytics, and payment verifications.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
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
              This Privacy Policy reflects our preliminary data handling protocols and will undergo formal regulatory compliance review prior to commercial operations.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Data Protection</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500">
            Last Updated: October 2026 • Version 1.0-draft
          </p>
        </div>

        {/* Policy Content */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Information We Collect</h2>
            <p>
              When you use {siteConfig.name}, we collect minimal necessary information to deliver high-yield study features and manage your enrollment:
            </p>
            <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm text-slate-600 pl-2">
              <li><strong>Account Credentials:</strong> First name, last name, email address, phone/WhatsApp number, and cryptographic password hash (we never store plain text passwords).</li>
              <li><strong>Academic Track:</strong> Target examination track (e.g., NCLEX-RN, NCLEX-PN, Saudi SNLE, or DHA).</li>
              <li><strong>Performance Analytics:</strong> Timestamps of question attempts, selected options, flag states, notes, time taken per vignette, and aggregate accuracy by body system and client-needs category.</li>
              <li><strong>Payment Proofs:</strong> Transaction reference IDs and uploaded bank transfer/Easypaisa payment receipt screenshots for manual verification.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. How We Use Your Data</h2>
            <p>
              We process your data strictly to:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>Personalized Analytics</span>
                </div>
                <p className="text-xs text-slate-500">
                  Compute your diagnostic accuracy, identify weak clinical areas, and generate targeted study recommendations.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span>Account Management</span>
                </div>
                <p className="text-xs text-slate-500">
                  Verify enrollment status, authorize Q-Bank access periods, and deliver live batch scheduling notices.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Zero Third-Party Data Selling</h2>
            <p>
              We do not sell, rent, monetize, or trade student personal records or examination analytics to recruiters, third-party advertisers, or pharmaceutical marketing agencies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Data Retention & Account Deletion</h2>
            <p>
              You maintain full control of your educational records. To request an export or permanent erasure of your test session attempts and personal profile, send an email from your registered address to{' '}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-sky-600 font-semibold hover:underline">
                {siteConfig.contact.email}
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Contact Our Privacy Officer</h2>
            <p>
              If you have inquiries regarding privacy compliance or student record protection, contact our administrative team via email at{' '}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-sky-600 font-semibold hover:underline">
                {siteConfig.contact.email}
              </a>.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
