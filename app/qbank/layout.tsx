import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive NextGen NCLEX Clinical Question Bank',
  description: 'Practice high-yield NextGen NCLEX-RN and PN clinical scenarios with SATA items, matrix formats, and in-depth clinical rationales.',
  alternates: {
    canonical: '/qbank',
  },
  openGraph: {
    title: 'Interactive NCLEX Question Bank | Simple NCLEX Academy',
    description: 'Master clinical decision-making with high-yield NGN items and detailed rationales.',
    url: 'https://simplenclexplatform.vercel.app/qbank',
  },
};

export default function QBankLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
