'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Activity, 
  FlaskConical, 
  ClipboardList, 
  User, 
  AlertCircle, 
  ChevronRight,
  ShieldAlert,
  Clock
} from 'lucide-react';

interface PatientProfile {
  name: string;
  age: number | string;
  gender: string;
  admissionDiagnosis: string;
  allergies?: string;
  codeStatus?: string;
}

interface ChartTab {
  title: string;
  timestamp?: string;
  content: string;
}

interface CaseStudyData {
  patientProfile?: PatientProfile;
  tabs?: ChartTab[];
  stepIndex?: number;
  totalSteps?: number;
}

interface CaseStudyQuestionProps {
  caseStudyData?: CaseStudyData;
  stem: string;
  children: React.ReactNode; // Question interaction choices (MCQ, SATA, etc.)
}

const CJMM_STEPS = [
  'Recognize Cues',
  'Analyze Cues',
  'Prioritize Hypotheses',
  'Generate Solutions',
  'Take Action',
  'Evaluate Outcomes',
];

export default function CaseStudyQuestion({
  caseStudyData,
  stem,
  children,
}: CaseStudyQuestionProps) {
  const profile = caseStudyData?.patientProfile || {
    name: 'Standard Clinical Client',
    age: 'Adult',
    gender: 'Client',
    admissionDiagnosis: 'Acute Inpatient Evaluation',
    allergies: 'NKDA (No Known Drug Allergies)',
  };

  const tabs = caseStudyData?.tabs || [
    { title: "Nurse's Notes", content: 'Client chart notes under evaluation.' },
  ];

  const currentStep = caseStudyData?.stepIndex || 1;
  const totalSteps = caseStudyData?.totalSteps || 6;
  const stepLabel = CJMM_STEPS[currentStep - 1] || 'Clinical Judgment Decision';

  const [activeTabIdx, setActiveTabIdx] = useState(0);

  const getTabIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('vital')) return <Activity className="w-3.5 h-3.5 text-rose-500" />;
    if (t.includes('lab')) return <FlaskConical className="w-3.5 h-3.5 text-sky-500" />;
    if (t.includes('order')) return <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />;
    return <FileText className="w-3.5 h-3.5 text-indigo-500" />;
  };

  return (
    <div className="space-y-5">
      {/* ── 1. NCSBN CLINICAL JUDGMENT STEP INDICATOR ── */}
      <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950 font-black text-xs">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-xs sm:text-sm font-bold text-sky-300">
            CJMM: {stepLabel}
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          6-Question Unfolding Clinical Case Study
        </div>
      </div>

      {/* ── 2. TWO-PANEL EHR CHART LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT / TOP PANEL: Interactive Patient Medical Chart (7 Cols on desktop) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col">
          
          {/* Patient Header Banner (Simulated EHR banner) */}
          <div className="bg-slate-100/90 border-b border-slate-200 p-3 sm:p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-700">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-slate-900 text-sm">{profile.name}</span>
                  <span className="text-slate-500 ml-2">{profile.age} y/o • {profile.gender}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-bold text-rose-700">Allergies: {profile.allergies || 'NKDA'}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-600">
              <strong>Admit Dx:</strong> {profile.admissionDiagnosis}
            </div>
          </div>

          {/* EHR Tabs Navigation */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 custom-scrollbar">
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTabIdx(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTabIdx === idx
                    ? 'border-sky-600 bg-white text-sky-950 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                {getTabIcon(tab.title)}
                <span>{tab.title}</span>
                {tab.timestamp && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({tab.timestamp})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* EHR Tab Content View */}
          <div className="p-4 sm:p-5 bg-white text-xs sm:text-sm text-slate-800 leading-relaxed font-sans max-h-80 overflow-y-auto custom-scrollbar">
            {tabs[activeTabIdx] && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-400">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    {getTabIcon(tabs[activeTabIdx].title)}
                    <span>{tabs[activeTabIdx].title}</span>
                  </span>
                  {tabs[activeTabIdx].timestamp && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Recorded at {tabs[activeTabIdx].timestamp}</span>
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-line font-mono text-xs sm:text-xs text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  {tabs[activeTabIdx].content}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT / BOTTOM PANEL: Cognitive Question & Input (5 Cols on desktop) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
              Clinical Question
            </span>
            <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed pt-1">
              {stem}
            </div>
          </div>

          {/* Interactive choices child component */}
          <div className="pt-2 border-t border-slate-100">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
