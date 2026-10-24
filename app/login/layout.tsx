import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In to Student Portal',
  description: 'Access your NCLEX simulator questions, practice attempts, and lecture syllabus.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
