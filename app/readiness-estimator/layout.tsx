import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free NCLEX Passing Probability Calculator & Diagnostic Quiz | Simple NCLEX Platform',
  description: 'Calculate your predicted NCLEX-RN first-time passing probability with our free 7-question clinical diagnostic quiz. Benchmark your clinical judgment against NCSBN standards.',
  keywords: [
    'NCLEX passing probability calculator',
    'free NCLEX diagnostic test',
    'NCLEX readiness score',
    'will I pass the NCLEX quiz',
    'NCLEX predictor exam free'
  ],
  openGraph: {
    title: 'Free NCLEX Passing Probability Calculator | Simple NCLEX Platform',
    description: 'Find out your predicted NCLEX-RN passing probability in under 5 minutes with our free diagnostic exam.',
    type: 'website',
  },
};

export default function ReadinessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
