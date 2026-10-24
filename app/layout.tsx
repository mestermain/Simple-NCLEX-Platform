import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieNotice from '@/components/CookieNotice';
import { siteConfig } from '@/lib/siteConfig';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://simplenclexplatform.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Simple NCLEX Platform | Next Generation Q-Bank & Clinical Review',
    template: '%s | Simple NCLEX Platform',
  },
  description: 'Master Next Generation NCLEX-RN, NCLEX-PN, Saudi SNLE, and DHA exams with interactive high-yield clinical MCQs & SATA scenarios, evidence-based rationales, and live classes.',
  keywords: [
    'NCLEX-RN',
    'NCLEX-PN',
    'NextGen NCLEX',
    'NGN Case Studies',
    'Nursing Licensure Exam',
    'Clinical Rationales',
    'SATA Nursing Questions',
    'DHA Exam Nursing',
    'Saudi SNLE Review',
    'HAAD Nursing',
    'Prometric Nursing Prep',
  ],
  authors: [{ name: 'Simple NCLEX Platform Faculty' }],
  creator: 'Simple NCLEX Platform',
  publisher: 'Simple NCLEX Platform',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Simple NCLEX Platform | NextGen NCLEX Review & Clinical Q-Bank',
    description: 'Evidence-based NCLEX-RN, NCLEX-PN, and Gulf Prometric exam preparation. Practice interactive clinical judgment case studies with in-depth rationales.',
    url: baseUrl,
    siteName: 'Simple NCLEX Platform',
    images: [
      {
        url: '/images/logo.png',
        width: 800,
        height: 600,
        alt: 'Simple NCLEX Platform Logo & Clinical Review',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simple NCLEX Platform | NextGen NCLEX Review',
    description: 'Practice high-yield NextGen NCLEX questions with option-by-option clinical rationales.',
    images: ['/images/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-sky-500 selection:text-white">
        {/* Accessible skip link for keyboard & screen reader navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-sky-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:font-bold focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <Navbar />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <CookieNotice />
      </body>
    </html>
  );
}
