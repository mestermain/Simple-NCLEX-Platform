import React from 'react';
import Link from 'next/link';
import { GraduationCap, Award, ShieldCheck, HeartHandshake, BookOpen, Users, PhoneCall, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* ── 1. HERO ── */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-xs font-semibold text-sky-400">
            <GraduationCap className="w-4 h-4" />
            <span>Dedicated Exclusively to Nursing Excellence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            About Simple NCLEX Academy
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Founded by veteran clinical educators to empower internationally educated and domestic nurses with high-yield Saunders 9th Edition frameworks.
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
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="text-3xl font-extrabold text-sky-600">99.2%</div>
              <div className="text-xs font-bold uppercase text-slate-800">Pass Rate</div>
              <p className="text-xs text-slate-500">First-time passing percentage across all 2024-2025 cohorts.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="text-3xl font-extrabold text-emerald-600">4,800+</div>
              <div className="text-xs font-bold uppercase text-slate-800">Alumni Nurses</div>
              <p className="text-xs text-slate-500">Practicing in top hospitals across the US, Canada, and the Gulf.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="text-3xl font-extrabold text-indigo-600">Saunders 9th</div>
              <div className="text-xs font-bold uppercase text-slate-800">Benchmark</div>
              <p className="text-xs text-slate-500">Every rationale is cross-referenced with Elsevier & ATI texts.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="text-3xl font-extrabold text-amber-600">1-on-1</div>
              <div className="text-xs font-bold uppercase text-slate-800">Mentorship</div>
              <p className="text-xs text-slate-500">Direct WhatsApp guidance from practicing nurse educators.</p>
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
              Our faculty members are board-certified nurse clinicians with decades of acute care experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-sky-100 text-sky-700 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-inner">
                DR
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Prof. D. Rashid, MSN, RN</h4>
                <div className="text-xs text-sky-600 font-semibold">Lead NCLEX-RN Faculty & Pharmacology Chair</div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                14+ years teaching medical-surgical nursing and clinical hemodynamics. Specializes in cardiac pharmacotherapy and ventilator management.
              </p>
            </div>

            <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-inner">
                FK
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Dr. F. Khan, BSN, RN-BC</h4>
                <div className="text-xs text-emerald-600 font-semibold">Gulf Prometric & SNLE Specialist</div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Former clinical preceptor at King Faisal Specialist Hospital. Expert in Saudi SCFHS regulations and DHA licensure exam frameworks.
              </p>
            </div>

            <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-inner">
                SA
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">S. Anwer, MSN, CNE</h4>
                <div className="text-xs text-indigo-600 font-semibold">Director of Clinical Judgment & SATA Drills</div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pioneered our Next-Gen Case Study simulation model. Passionate about empowering candidates through error-reduction techniques.
              </p>
            </div>
          </div>
        </div>

        {/* ── 4. CONTACT & COUNSELOR CARD ── */}
        <div className="clinical-card bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl font-bold">Have Questions About Your Exam Eligibility?</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
              Our academic advising team provides free transcript evaluation, Dataflow guidance, and preparation roadmap planning.
            </p>
          </div>
          <a
            href="https://wa.me/923000000000"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg transition-colors shrink-0"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

      </div>

    </div>
  );
}
