import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Student Account | Free NCLEX Trial',
  description: 'Register for free access to NextGen NCLEX clinical scenarios, client needs analysis, and score reports.',
  alternates: {
    canonical: '/register',
  },
  openGraph: {
    title: 'Create Free Student Account | Simple NCLEX Platform',
    description: 'Start practicing high-yield NCLEX clinical scenarios and track your readiness.',
    url: 'https://simplenclexplatform.vercel.app/register',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
