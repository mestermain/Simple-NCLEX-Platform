'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  GraduationCap, 
  Star, 
  Users, 
  Clock, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Search, 
  X, 
  ShieldCheck,
  Video,
  CheckCircle2,
  HelpCircle,
  PhoneCall,
  Layers,
  Award
} from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';
import DemoBadge from '@/components/DemoBadge';

interface Course {
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
  curriculum: any[];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Enrollment modal state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Sync with URL query parameters on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const categoryParam = params.get('category');
      const trackParam = params.get('track');
      if (categoryParam) {
        setActiveCategory(categoryParam);
      } else if (trackParam) {
        const found = siteConfig.tracks.find(t => t.id.toLowerCase() === trackParam.toLowerCase());
        if (found) {
          setActiveCategory(found.categorySlug);
        }
      }
    }
  }, []);

  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses?category=${activeCategory}&search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success && data.courses) {
          setCourses(data.courses);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, [activeCategory, searchQuery]);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    setSubmitting(true);
    try {
      let screenshotUrl = '';
      if (screenshotFile) {
        const formData = new FormData();
        formData.append('file', screenshotFile);
        const upRes = await fetch('/api/enroll', {
          method: 'POST',
          body: formData,
        });
        const upData = await upRes.json();
        screenshotUrl = upData.screenshotUrl || '';
      }

      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
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

  const categories = [
    { id: 'all', name: 'All Exam Tracks' },
    { id: 'nclex-rn', name: 'NCLEX-RN (NextGen)' },
    { id: 'nclex-pn', name: 'NCLEX-PN Practical' },
    { id: 'snle', name: 'Saudi SNLE (SCFHS)' },
    { id: 'dha', name: 'Dubai DHA' },
    { id: 'haad', name: 'Abu Dhabi HAAD' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* ── 1. COURSES HERO ── */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-xs font-semibold text-sky-400">
            <GraduationCap className="w-4 h-4" />
            <span>Interactive Live Batches Aligned with NCSBN Test Plan</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            High-Yield Nursing Licensure Courses
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Live Google Meet lectures, clinical scenario breakdowns, and full platform Q-Bank access included automatically with every course.
          </p>

          {/* Search & Filter Bar */}
          <div className="pt-6 max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by topic, pharmacology, or track..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  activeCategory === c.id
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ── 2. COURSE CARDS GRID ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">Loading course curriculum...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 clinical-card bg-white p-8 rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
            <p className="text-slate-600 font-medium text-sm">No courses found matching your criteria.</p>
            <button
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
              className="px-4 py-2 text-xs font-semibold bg-sky-600 text-white rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div
                key={course.id}
                className="clinical-card bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all"
              >
                <div className="p-6 sm:p-7 space-y-5">
                  
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                      {course.badgeText || course.category.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{course.rating.toFixed(1)}</span>
                      <span className="text-slate-400">({course.studentsCount.toLocaleString()})</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600" />
                      <span>{course.durationHours || 40}+ Lecture Hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-sky-600" />
                      <span>{course.questionsCount || 2000}+ Practice Items</span>
                    </div>
                  </div>

                  {/* Key Highlights */}
                  <div className="space-y-2 pt-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Live Google Meet Interactive Classes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100% Full Q-Bank Access Included (SATA & MCQs)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Comprehensive High-Yield Course Study Notes</span>
                    </div>
                  </div>

                </div>

                {/* Footer Pricing & CTA */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      PKR {course.price.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      One-time enrollment
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/courses/${course.id}`}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      Syllabus
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setEnrollSuccess(false);
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* ── 3. PLAN COMPARISON MATRIX ── */}
        <div className="mt-20 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Feature Matrix</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Compare Preparation Plans
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Find the perfect preparation style between self-paced question practice and full live mentor instruction.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 sm:p-5 font-bold text-slate-900">Feature / Learning Deliverable</th>
                  <th className="p-4 sm:p-5 font-bold text-slate-700 text-center">Free Trial</th>
                  <th className="p-4 sm:p-5 font-bold text-sky-700 text-center bg-sky-50/50">Q-Bank Subscription</th>
                  <th className="p-4 sm:p-5 font-bold text-indigo-700 text-center bg-indigo-50/50">Live Course Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-4 font-medium">Sample Diagnostic Questions</td>
                  <td className="p-4 text-center font-bold text-emerald-600">5 Questions</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-sky-50/20">Full Question Bank</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-indigo-50/20">Full Q-Bank & Live Drills</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Select All That Apply (SATA) Items</td>
                  <td className="p-4 text-center text-slate-400">Limited</td>
                  <td className="p-4 text-center text-emerald-600 font-bold bg-sky-50/20">Full Access</td>
                  <td className="p-4 text-center text-emerald-600 font-bold bg-indigo-50/20">Full Access</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Evidence-Based Distractor Breakdown</td>
                  <td className="p-4 text-center font-bold text-emerald-600">Included</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-sky-50/20">Included</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-indigo-50/20">Included</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Timed Exam Mode & CAT Simulator</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-sky-50/20">Included</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-indigo-50/20">Included</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Live Google Meet Classes (4x / week)</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400 bg-sky-50/20">—</td>
                  <td className="p-4 text-center font-bold text-indigo-700 bg-indigo-50/20">30–48 Hours Live</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">PDF Lecture Slides & Study Sheets</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400 bg-sky-50/20">—</td>
                  <td className="p-4 text-center font-bold text-indigo-700 bg-indigo-50/20">Downloadable PDFs</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">1-on-1 WhatsApp Senior Faculty Mentor</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400 bg-sky-50/20">—</td>
                  <td className="p-4 text-center font-bold text-indigo-700 bg-indigo-50/20">Direct Support</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">First-Time Pass Retake Commitment</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400 bg-sky-50/20">—</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-indigo-50/20">Included (Cohort Guarantee)</td>
                </tr>
                <tr className="bg-slate-50/50 font-bold">
                  <td className="p-4 text-slate-900">Pricing / Investment</td>
                  <td className="p-4 text-center text-slate-900">Free</td>
                  <td className="p-4 text-center text-sky-700 bg-sky-50/50">From PKR 4,500</td>
                  <td className="p-4 text-center text-indigo-700 bg-indigo-50/50">From PKR 14,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. STEP-BY-STEP ENROLLMENT GUIDE ── */}
        <div className="mt-16 p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Simple Enrollment Desk</span>
            <h3 className="text-xl font-bold text-slate-900">How To Join An Upcoming Live Cohort</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-2">
            <div className="space-y-2 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-sky-600/20">
                1
              </div>
              <h4 className="font-bold text-sm text-slate-900">Select Track</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose your target exam batch (NCLEX-RN, PN, DHA, HAAD, or SNLE) and click Enroll Now.
              </p>
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-600/20">
                2
              </div>
              <h4 className="font-bold text-sm text-slate-900">Transfer Tuition</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Send fee via Meezan Bank IBAN, Easypaisa, or JazzCash using details in the enrollment modal.
              </p>
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-emerald-600/20">
                3
              </div>
              <h4 className="font-bold text-sm text-slate-900">Attach Receipt</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Provide your WhatsApp number and upload transaction receipt screenshot for instant verification.
              </p>
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-slate-900/20">
                4
              </div>
              <h4 className="font-bold text-sm text-slate-900">Start Learning</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Admissions desk approves access, adds you to the WhatsApp batch group, and unlocks full Q-Bank.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. ENROLLMENT MODAL ── */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase text-sky-700 tracking-wider">
                  Course Registration Desk
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedCourse.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
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
                  Thank you! Our faculty admin team will verify your payment and approve your enrollment within 2 to 4 hours.
                </p>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-left">
                  ✓ Once approved, your student profile will grant you 100% full unrestricted access to all NCLEX Q-Bank questions, SATA drills, and class curriculum.
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-lg"
                >
                  Close & Return
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnrollSubmit} className="space-y-5 pt-4">
                
                {/* Course Details Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Course Enrollment Fee:</div>
                    <div className="text-xl font-black text-slate-900">
                      PKR {selectedCourse.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-xs text-emerald-700 font-semibold">
                    ✓ Includes Full Q-Bank Access
                  </div>
                </div>

                {/* Bank / Payment Instructions */}
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

                {/* Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      WhatsApp Number (for live Google Meet class invites)
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
                    onClick={() => setSelectedCourse(null)}
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
