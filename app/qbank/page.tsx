import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  BrainCircuit, 
  Activity, 
  BarChart3, 
  Clock, 
  FileCheck2, 
  HelpCircle, 
  Target, 
  Check, 
  X,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import WorkingSampleQuestion from '@/components/qbank/WorkingSampleQuestion';
import JsonLd from '@/components/JsonLd';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'NextGen NCLEX Q-Bank | Clinical Decision-Making & Practice Questions',
  description: 'Master the Next Generation NCLEX-RN & PN with 3,500+ clinical judgment questions, authentic unfolding case studies, CAT simulation, and option-by-option rationales.',
  alternates: {
    canonical: '/qbank',
  },
  openGraph: {
    title: 'NextGen NCLEX Q-Bank | Simple NCLEX Platform',
    description: 'Realistic NGN practice questions with NCSBN partial-credit scoring, in-depth rationales, and CAT adaptive simulation.',
    url: 'https://simplenclexplatform.vercel.app/qbank',
  },
};

export default function QBankMarketingPage() {
  const qbankAppUrl = process.env.NEXT_PUBLIC_QBANK_APP_URL || '/app';

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How closely does this Q-Bank mirror the official NCSBN NextGen NCLEX?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our simulator uses the official NCSBN Clinical Judgment Measurement Model (CJMM), replicating unfolding 6-question case studies, bow-tie items, matrix/grid questions, and extended multiple response (SATA) with +/- partial credit scoring.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the difference between Tutor Mode and Timed Exam Mode?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tutor Mode displays comprehensive option-by-option rationales and clinical pearls immediately after each question is answered. Timed Exam Mode simulates actual testing conditions by hiding answers until the entire test block is completed.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the CAT (Computerized Adaptive Testing) simulation work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our CAT engine calculates item response theory (IRT) theta values in real time, serving dynamically harder or easier questions based on candidate performance and terminating tests between 85 and 150 items using the 95% certainty stopping rule.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I access the Q-Bank on mobile phones and tablets?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, the Q-Bank web app is fully responsive, optimized for iPhones, Android smartphones, iPads, laptops, and desktop computers with synchronized cloud progress.',
        },
      },
    ],
  };

  const featureCards = [
    {
      icon: <Layers className="w-6 h-6 text-sky-500" />,
      title: 'All 7 NextGen (NGN) Item Formats',
      description: 'Practice unfolding case studies, bow-tie clinical scenarios, drag-and-drop ordered response, matrix grids, and extended SATA items with exact NCSBN +/- partial credit scoring.'
    },
    {
      icon: <BrainCircuit className="w-6 h-6 text-indigo-500" />,
      title: 'Exhaustive Clinical Rationales & Pearls',
      description: 'Never wonder why an answer was wrong. Every option is thoroughly explained with pathophysiology rationale, diagnostic pointers, and high-yield clinical pearls.'
    },
    {
      icon: <Activity className="w-6 h-6 text-emerald-500" />,
      title: 'Adaptive CAT Testing Simulation',
      description: 'Experience real exam conditions. Our Item Response Theory (IRT) engine dynamically adjusts difficulty and enforces the 95% confidence stopping rule between 85 and 150 questions.'
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-amber-500" />,
      title: 'Smart Readiness & Weak-Area Drills',
      description: 'Pinpoint weak organ systems and client needs categories in seconds. Generate targeted remediation test blocks and track your predicted NCLEX passing probability.'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Configure Your Drill or Full Exam',
      description: 'Choose your licensure track (RN, PN, DHA, SNLE), select organ systems or client needs categories, and toggle between Tutor Mode for immediate rationales or Timed Exam Mode.'
    },
    {
      step: '02',
      title: 'Apply the Clinical Judgment Model',
      description: 'Analyze real EHR clinical cues, review vital signs and lab trends, prioritize hypotheses, and make evidence-based nursing interventions under realistic exam software conditions.'
    },
    {
      step: '03',
      title: 'Remediate Weaknesses & Master Concepts',
      description: 'Review deep option-by-option explanations, convert difficult clinical concepts into 1-click spaced repetition flashcards, and watch your passing readiness climb.'
    }
  ];

  const comparisonRows = [
    { feature: 'High-Yield Clinical Question Pool', free: '15 Sample Questions', paid: '3,500+ Complete High-Yield Bank' },
    { feature: 'NextGen NGN Item Types (Bow-Tie, Matrix, Case Studies)', free: 'Basic MCQ & SATA Only', paid: 'All 7 NextGen Formats Included' },
    { feature: 'In-Depth Rationales & Pathophysiology', free: 'Basic Answer Key', paid: 'Option-by-Option Clinical Rationales' },
    { feature: 'Computerized Adaptive Testing (CAT) Simulation', free: 'Unavailable', paid: 'Full IRT Adaptive Engine with 95% Stopping Rule' },
    { feature: 'Spaced Repetition & Flashcard Integration', free: 'Unavailable', paid: '1-Click Save to Leitner Review Deck' },
    { feature: 'Detailed Passing Readiness & Analytics', free: 'Basic Accuracy %', paid: 'Comprehensive Client Needs Analytics & Passing Score' },
    { feature: 'Mobile, Tablet & Desktop Cloud Sync', free: 'Included', paid: 'Included (24/7 Unlimited Access)' },
    { feature: 'Direct Clinical Faculty Academic Support', free: 'Community', paid: 'Dedicated WhatsApp Faculty Advising' },
  ];

  const faqs = [
    {
      question: 'How closely does this Q-Bank mirror the official NCSBN NextGen NCLEX?',
      answer: 'Our software replicates the official NCSBN exam environment down to the question layouts, tabs, laboratory values chart, calculator, and clinical scoring models (including +/- scoring for SATA and 0/1 scoring for matrix rows).'
    },
    {
      question: 'What is the difference between Tutor Mode and Timed Exam Mode?',
      answer: 'In Tutor Mode, you receive instantaneous clinical rationales, distractor explanations, and clinical pearls as soon as you submit each question. In Timed Exam Mode, the rationales and scores are held until you conclude the test, simulating real exam pacing.'
    },
    {
      question: 'How does the CAT (Computerized Adaptive Testing) simulation work?',
      answer: 'Our CAT simulator models the official NCLEX algorithm. It starts at an average passing standard (theta 0.0) and dynamically selects harder or easier items based on whether your previous answers were correct, stopping once certainty above the passing standard is reached.'
    },
    {
      question: 'Can I use the Q-Bank on my phone or tablet?',
      answer: 'Yes. The web application is 100% cloud-based and responsive. You can seamlessly switch between your desktop computer at home, a tablet on the go, or your smartphone during breaks.'
    },
    {
      question: 'How do I access the Q-Bank after signing up?',
      answer: 'Click "Launch Q-Bank" anywhere on this page. If you are already registered or enrolled, you will be taken straight to your candidate dashboard. If you are new, you can quickly create an account and access our starter clinical drill immediately.'
    },
    {
      question: 'Are the questions updated for the 2026 Test Plan?',
      answer: 'Yes. All questions, clinical references, pharmacology dosages, and laboratory reference ranges are actively curated by registered nurse faculty in accordance with the latest NCSBN test plans.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <JsonLd data={faqSchema} />

      {/* ── 1. HERO SECTION ── */}
      <section className="relative bg-slate-900 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-slate-800">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-sky-500/10 via-indigo-500/5 to-transparent pointer-events-none blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-xs font-bold text-sky-300">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Next Generation NCLEX (NGN) Question Bank · 2026 Ready</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Master Clinical Judgment.{' '}
            <span className="bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Pass the NCLEX on Your First Attempt.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Practice with 3,500+ authentic NextGen unfolding case studies, bow-tie questions, and SATA drills. Powered by exhaustive option-by-option rationales and adaptive CAT simulation.
          </p>

          {/* Primary Top Launch CTA Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={qbankAppUrl}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-base shadow-xl shadow-sky-600/30 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <span>Launch Q-Bank</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="#sample-question"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>Try Sample Question</span>
            </a>
          </div>

          {/* Trust stats proof points */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t border-slate-800/80 max-w-4xl mx-auto text-left">
            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-400">3,500+</div>
              <div className="text-xs text-slate-400 font-medium mt-1">High-Yield Questions</div>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">All 7</div>
              <div className="text-xs text-slate-400 font-medium mt-1">NGN Item Formats</div>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400">99.2%</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Candidate Pass Rate</div>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">100%</div>
              <div className="text-xs text-slate-400 font-medium mt-1">NCSBN CJMM Aligned</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. FOUR FEATURE CARDS ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            Engineered For Licensure Success
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything You Need to Think Like a Nurse
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Built from the ground up for the Next Generation NCLEX standard, giving you the stamina, diagnostic judgment, and tactical confidence to pass on test day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {featureCards.map((card, idx) => (
            <div 
              key={idx}
              className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                  {card.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {card.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. HOW IT WORKS (3 STEPS) ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-400/20">
              The Study Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              How It Works in 3 Simple Steps
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Transform passive memorization into active clinical reasoning with our streamlined test-taking cycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-2xl bg-slate-800/60 border border-slate-700/80 relative space-y-4 hover:border-sky-500/40 transition-colors"
              >
                <div className="text-4xl sm:text-5xl font-black text-sky-400/20 tracking-tighter">
                  {st.step}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {st.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {st.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. WORKING SAMPLE QUESTION ── */}
      <section id="sample-question" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full scroll-mt-12">
        <div className="text-center space-y-3 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Interactive Live Demo
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Experience Our Clinical Question Quality
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Test your clinical judgment below. Select an answer to see our in-depth option-by-option rationale and clinical pearls in action.
          </p>
        </div>

        <WorkingSampleQuestion launchUrl={qbankAppUrl} />
      </section>

      {/* ── 5. FREE VS PAID COMPARISON ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-100/70 border-y border-slate-200">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Clear Value Comparison
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Free Candidate Demo vs. Full Q-Bank Access
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Compare our starter preview against full access to make the best decision for your nursing licensure goals.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm sm:text-base border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-800">
                    <th className="p-4 sm:p-5 font-bold">Platform Feature</th>
                    <th className="p-4 sm:p-5 font-bold text-slate-300 w-1/4">Free Candidate Demo</th>
                    <th className="p-4 sm:p-5 font-bold text-sky-400 w-1/3 bg-slate-800/80">Full Q-Bank All-Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-4 sm:p-5 font-medium text-slate-900">{row.feature}</td>
                      <td className="p-4 sm:p-5 text-slate-500 text-xs sm:text-sm">{row.free}</td>
                      <td className="p-4 sm:p-5 text-sky-950 font-semibold bg-sky-50/40 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{row.paid}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
                All plans include full access to the NCLEX-RN, NCLEX-PN, DHA, HAAD, and Saudi SNLE tracks.
              </div>
              <Link
                href={qbankAppUrl}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span>Unlock All-Access Q-Bank</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ SECTION ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            Frequently Asked Questions
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything You Need to Know
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Have questions about our NCLEX Q-Bank? Here are answers to the most common candidate questions.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2 hover:border-slate-300 transition-colors"
            >
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <span>{faq.question}</span>
              </h3>
              <p className="text-sm text-slate-600 pl-7 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. BOTTOM LAUNCH Q-BANK CTA ── */}
      <section className="bg-slate-900 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto border border-sky-400/30">
            <GraduationCap className="w-8 h-8" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Ready to Begin Your NCLEX Journey?
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Join thousands of successful nursing candidates who trained with our NextGen question bank, clinical judgment drills, and in-depth rationales.
          </p>

          {/* Primary Bottom Launch CTA Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={qbankAppUrl}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-base shadow-xl shadow-sky-600/30 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <span>Launch Q-Bank</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>Create Free Account</span>
            </Link>
          </div>

          <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instant Online Access</span>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Secure Candidate Cloud</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
