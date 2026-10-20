import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Simple NCLEX Academy | Next Generation Q-Bank & Clinical Review',
  description: 'Master NCLEX-RN, NCLEX-PN, DHA, HAAD, and Prometric nursing exams with 60+ interactive high-yield clinical MCQs & SATA questions, Saunders rationales, and live classes.',
  icons: {
    icon: '/images/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.png" sizes="any" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
