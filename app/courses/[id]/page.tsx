'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Clock, 
  Star, 
  Users, 
  Check, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ShieldCheck, 
  GraduationCap, 
  PhoneCall, 
  Video, 
  X,
  FileText
} from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';
import DemoBadge from '@/components/DemoBadge';

interface CourseDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  studentsCount: number;
  durationHours: number;
  emoji: string;
  badgeText: string;
  level: string;
  isFeatured: boolean;
  questionsCount: number;
  curriculum: {
    title: string;
    description?: string;
    lectures?: {
      title: string;
      duration?: string;
      type?: string;
    }[];
  }[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModuleIndex, setOpenModuleIndex] = useState<number | null>(0);

  // Enrollment modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId) return;
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        const data = await res.json();
        if (data.success && data.course) {
          setCourse(data.course);
        }
      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [courseId]);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    setSubmitting(true);
    try {
      let screenshotUrl = '';
      if (screenshotFile) {
        const formData = new FormData();
        formData.append('file', screenshotFile);
        const upRes = await fetch('/api/enroll', { method: 'POST', body: formData });
        const upData = await upRes.json();
        screenshotUrl = upData.screenshotUrl || '';
      }

      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          whatsappNumber: whatsapp,
          paymentScreenshot: screenshotUrl || 'proof_attached',
          transactionId: `TXN-${Date.now().toString().slice(-6)}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEnrollSuccess(true);
      } else {
        alert(data.message || 'Enrollment failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting enrollment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading course syllabus & materials...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-slate-600 font-medium">Course not found.</p>
          <Link href="/courses" className="px-5 py-2 text-xs font-bold text-white bg-sky-600 rounded-lg">
            Back to All Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Back Link */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Courses</span>
        </Link>

        {/* ── 1. COURSE BANNER ── */}
        <div className="clinical-card bg-slate-900 text-white p-6 sm:p-10 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold uppercase rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30">
              {course.category.toUpperCase()}
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 text-slate-300">
              {course.level}
            </span>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-300 ml-auto">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{course.rating.toFixed(1)}</span>
              <span className="text-slate-400">({course.studentsCount.toLocaleString()} enrolled)</span>
            </div>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {course.title}
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">
              {course.description}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>{course.durationHours}+ Hours of Live Instruction</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>{course.questionsCount}+ Practice Questions</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="text-left sm:text-right">
                <div className="text-2xl font-black text-white">
                  PKR {course.price.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold">
                  ✓ Includes Full Q-Bank Access
                </div>
              </div>

              <button
                onClick={() => { setIsModalOpen(true); setEnrollSuccess(false); }}
                className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-600/30 transition-all text-center cursor-pointer"
              >
                Enroll In This Batch
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. MAIN CONTENT & SYLLABUS ACCORDIONS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Curriculum Modules */}
          <div className="lg:col-span-2 space-y-6">
            <div className="clinical-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Comprehensive Course Curriculum
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structured lecture schedule with high-yield reading references and course notes
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {course.curriculum.length} Modules
                </span>
              </div>

              {course.curriculum.length === 0 ? (
                <div className="space-y-4">
                  {/* Default clinical modules */}
                  {[
                    {
                      title: 'Module 1: Safe and Effective Care Environment & Client Rights',
                      lectures: [
                        'Lecture 1.1: Advance Directives, Informed Consent & Nursing Ethics',
                        'Lecture 1.2: Delegation & Assignment Principles (RN vs LPN vs UAP)',
                        'Lecture 1.3: Infection Prevention, Isolation Precautions & PPE Protocols',
                      ],
                    },
                    {
                      title: 'Module 2: Physiological Adaptation & Advanced Med-Surg',
                      lectures: [
                        'Lecture 2.1: Arterial Blood Gas (ABG) Interpretation & Respiratory Failure',
                        'Lecture 2.2: Acute Coronary Syndrome, Heart Failure & EKG Dysrhythmias',
                        'Lecture 2.3: Diabetic Ketoacidosis (DKA) vs HHS & Endocrine Crises',
                      ],
                    },
                    {
                      title: 'Module 3: High-Yield Pharmacology & Safe Parenteral Therapies',
                      lectures: [
                        'Lecture 3.1: Cardiac Medications: Digoxin, Beta-Blockers & ACE Inhibitors',
                        'Lecture 3.2: Anticoagulants (Heparin, Warfarin) & Antidote Safety Protocols',
                        'Lecture 3.3: Psychiatric Medications: SSRIs, MAOIs & Lithium Toxicity',
                      ],
                    },
                    {
                      title: 'Module 4: Next-Gen Clinical Judgment Measurement Model (CJMM)',
                      lectures: [
                        'Lecture 4.1: Recognizing & Analyzing Clinical Cues',
                        'Lecture 4.2: Generating Solutions & Taking Immediate Action',
                        'Lecture 4.3: Mastering Select All That Apply (SATA) Questions',
                      ],
                    },
                  ].map((mod, mIdx) => {
                    const isOpen = openModuleIndex === mIdx;
                    return (
                      <div key={mIdx} className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenModuleIndex(isOpen ? null : mIdx)}
                          className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors"
                        >
                          <span className="text-sm font-bold text-slate-900">{mod.title}</span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </button>
                        {isOpen && (
                          <div className="p-4 bg-white divide-y divide-slate-100 text-xs text-slate-700">
                            {mod.lectures.map((lec, lIdx) => (
                              <div key={lIdx} className="py-2.5 flex items-center gap-3">
                                <Video className="w-4 h-4 text-sky-600 shrink-0" />
                                <span className="flex-1 font-medium">{lec}</span>
                                <span className="text-slate-400">Live + Recording</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {course.curriculum.map((mod, mIdx) => {
                    const isOpen = openModuleIndex === mIdx;
                    return (
                      <div key={mIdx} className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenModuleIndex(isOpen ? null : mIdx)}
                          className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors"
                        >
                          <span className="text-sm font-bold text-slate-900">{mod.title}</span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </button>
                        {isOpen && mod.lectures && (
                          <div className="p-4 bg-white divide-y divide-slate-100 text-xs text-slate-700">
                            {mod.lectures.map((lec, lIdx) => (
                              <div key={lIdx} className="py-2.5 flex items-center gap-3">
                                <Video className="w-4 h-4 text-sky-600 shrink-0" />
                                <span className="flex-1 font-medium">{lec.title}</span>
                                {lec.duration && <span className="text-slate-400">{lec.duration}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Inclusions & Counselor Support */}
          <div className="space-y-6">
            
            <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Enrollment Inclusions
              </h4>
              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>100% Full Access to all NCLEX Q-Bank questions, SATA drills, and custom mock exams.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Live Google Meet classes with interactive screen-sharing and real-time clinical case solving.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Comprehensive clinical lecture slides, pharmacology charts, and study notes accessible immediately.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Direct 1-on-1 WhatsApp access to faculty educators for doubt resolution.</span>
                </li>
                {siteConfig.claims.passGuarantee && (
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="flex items-center gap-1.5">
                      <span>{siteConfig.claims.passGuarantee}: Eligible students receive complimentary batch review access.</span>
                      <DemoBadge label="Policy Note" />
                    </span>
                  </li>
                )}
              </ul>

              <div className="pt-2">
                <button
                  onClick={() => { setIsModalOpen(true); setEnrollSuccess(false); }}
                  className="w-full py-3 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition-all"
                >
                  Enroll Now — PKR {course.price.toLocaleString()}
                </button>
              </div>
            </div>

            {/* 4-Step Enrollment Process */}
            <div className="clinical-card bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Enrollment Steps
              </h4>
              <ol className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">1</span>
                  <span>Click <strong>Enroll Now</strong> to open the secure desk.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">2</span>
                  <span>Transfer fee via Meezan Bank, Easypaisa, or JazzCash.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">3</span>
                  <span>Attach receipt screenshot and your WhatsApp number.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">4</span>
                  <span>Receive WhatsApp confirmation & instant Q-Bank access.</span>
                </li>
              </ol>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-900">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>NCSBN Alignment Verified</span>
              </div>
              <p className="leading-relaxed">
                All lectures are verified against the 2026 Test Plan for Registered Nurses and Saudi Commission for Health Specialties (SCFHS) blueprint.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* ── 3. ENROLLMENT MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase text-sky-700 tracking-wider">
                  Enrollment Desk
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {course.title}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {enrollSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Registration Received!</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Our faculty admin team will review your proof and approve your enrollment within 2 to 4 hours.
                </p>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-left">
                  ✓ Full Q-Bank Access to all clinical MCQs & SATA questions will activate automatically upon verification.
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-lg"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnrollSubmit} className="space-y-5 pt-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Total Enrollment Fee:</div>
                    <div className="text-xl font-black text-slate-900">
                      PKR {course.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-emerald-700 font-semibold">
                    ✓ Full Q-Bank Included
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Direct Deposit / Transfer Details:</span>
                    <DemoBadge label="Sample Account" />
                  </div>
                  <div className="font-mono bg-white p-2.5 rounded border border-slate-200 space-y-1">
                    <div>Bank: {siteConfig.banking.bankName}</div>
                    <div>Account Title: {siteConfig.banking.accountTitle}</div>
                    <div>Account / IBAN: {siteConfig.banking.iban}</div>
                    <div>EasyPaisa: {siteConfig.banking.easypaisaNumber} ({siteConfig.banking.easypaisaName})</div>
                    <div>JazzCash: {siteConfig.banking.jazzcashNumber} ({siteConfig.banking.jazzcashName})</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      WhatsApp Number (for class Google Meet links)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+92 300 1234567"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Payment Screenshot / Receipt
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshotFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Enrollment Proof'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
