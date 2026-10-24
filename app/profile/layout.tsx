import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Portal & Readiness Analytics',
  description: 'View your client needs mastery, recent test attempts, and active lecture passes.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
