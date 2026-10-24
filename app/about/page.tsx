import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { GraduationCap, Award, ShieldCheck, HeartHandshake, BookOpen, Users, PhoneCall, CheckCircle2, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';
import DemoBadge from '@/components/DemoBadge';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'About Our Clinical Faculty & NextGen Mission',
  description: 'Learn about Simple NCLEX Platform clinical educators, our evidence-based clinical judgment model, and our commitment to international nurse licensure.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Simple NCLEX Platform | Clinical Faculty & Mission',
    description: 'Dedicated to empowering future Registered Nurses and Practical Nurses worldwide with clinical judgment frameworks.',
    url: 'https://simplenclexplatform.vercel.app/about',
  },
};

export default function AboutPage() {
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Simple NCLEX Platform',
    description: 'Our educational philosophy, clinical faculty, and NextGen test preparation methodology.',
    url: 'https://simplenclexplatform.vercel.app/about',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <JsonLd data={aboutSchema} />
      
      {/* ── 1. HERO ── */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-xs font-semibold text-sky-400">
            <GraduationCap className="w-4 h-4" />
            <span>Dedicated Exclusively to Nursing Excellence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            About Simple NCLEX Platform
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Founded by clinical educators to empower internationally educated and domestic nurses with evidence-based NextGen frameworks.
          </p>
        </div>
      </section>

      {/* ── 2. PHILOSOPHY & VALUES ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Our Educational Mission
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Transforming Rote Memorization Into Instinctive Clinical Judgment
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Most candidates struggle not from a lack of nursing knowledge, but from unfamiliarity with how computerized adaptive tests (CAT) evaluate decision-making. 
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              At Simple NCLEX, every question stem, distractor breakdown, and live lecture trains you to prioritize the ABCs (Airway, Breathing, Circulation), apply Maslow's hierarchy of needs, and anticipate medical hazards before they compromise patient outcomes.
            </p>
            <div className="pt-2 flex items-center gap-4">
              <Link
                href="/qbank"
                className="px-6 py-3 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>Try Practice Engine</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {siteConfig.stats.passRate ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-extrabold text-sky-600">{siteConfig.stats.passRate}</div>
                  <DemoBadge label="Sample" />
                </div>
                <div className="text-xs font-bold uppercase text-slate-800">Pass Rate</div>
                <p className="text-xs text-slate-500">First-time passing percentage benchmark for preparatory batches.</p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="text-3xl font-extrabold text-sky-600">NGN</div>
                <div className="text-xs font-bold uppercase text-slate-800">Test Plan</div>
                <p className="text-xs text-slate-500">Structured around the NCSBN Clinical Judgment Measurement Model.</p>
              </div>
            )}

            {siteConfig.stats.alumniCount ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-extrabold text-emerald-600">{siteConfig.stats.alumniCount}</div>
                  <DemoBadge label="Sample" />
                </div>
                <div className="text-xs font-bold uppercase text-slate-800">Enrolled Nurses</div>
                <p className="text-xs text-slate-500">Nurses preparing for US, Canadian, and Gulf licensure exams.</p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="text-3xl font-extrabold text-emerald-600">6 Tracks</div>
                <div className="text-xs font-bold uppercase text-slate-800">Licensure Paths</div>
                <p className="text-xs text-slate-500">NCLEX-RN, PN, Saudi SNLE, and Gulf Prometric licensing exams.</p>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="text-3xl font-extrabold text-indigo-600">Clinical</div>
              <div className="text-xs font-bold uppercase text-slate-800">Rationale Model</div>
              <p className="text-xs text-slate-500">Detailed distractor analysis for every single response choice.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="text-3xl font-extrabold text-amber-600">1-on-1</div>
              <div className="text-xs font-bold uppercase text-slate-800">Mentorship</div>
              <p className="text-xs text-slate-500">Direct WhatsApp guidance and live doubt clearing for enrolled students.</p>
            </div>
          </div>
        </div>

        {/* ── 3. FACULTY LEADERSHIP ── */}
        <div className="space-y-8 pt-8 border-t border-slate-200">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Expert Instruction</span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Clinical Faculty & Educators
            </h2>
            <p className="text-sm text-slate-600">
              Our faculty members are nurse clinicians with acute care and licensing experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {siteConfig.faculty.map((member) => (
              <div key={member.id} className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4">
                <div className="relative inline-block mx-auto">
                  <div className="w-20 h-20 rounded-full bg-sky-100 text-sky-700 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-inner">
                    {member.initials}
                  </div>
                  {member.isDemo && (
                    <div className="mt-1">
                      <DemoBadge label="Demo Bio" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {member.name}, {member.credentials}
                  </h4>
                  <div className="text-xs text-sky-600 font-semibold">{member.title}</div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. CONTACT & COUNSELOR CARD ── */}
        <div id="contact" className="clinical-card bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl font-bold">Have Questions About Your Exam Eligibility?</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
              Our academic advising team provides free transcript evaluation, Dataflow guidance, and preparation roadmap planning.
            </p>
            <div className="text-xs text-slate-400 pt-1">
              <span>Email: {siteConfig.contact.email}</span> • <span>Phone: {siteConfig.contact.phone}</span>
            </div>
          </div>
          {siteConfig.contact.whatsappUrl && (
            <a
              href={siteConfig.contact.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg transition-colors shrink-0"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>
          )}
        </div>

      </div>

    </div>
  );
}
