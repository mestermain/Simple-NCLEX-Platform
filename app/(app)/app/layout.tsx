import React from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import AppShell from './components/AppShell';

export const metadata: Metadata = {
  title: 'Q-Bank Candidate Portal | Simple NCLEX Platform',
  description: 'Candidate practice tests, CAT simulations, and clinical review dashboard.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function QBankAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── SERVER-SIDE SESSION CHECK ──
  const cookieStore = cookies();
  const token = cookieStore.get('nclex_token')?.value || cookieStore.get('token')?.value || '';
  const user = token ? verifyToken(token) : null;

  if (!user) {
    // Logged-out users are immediately redirected to /login?redirect=/app
    redirect('/login?redirect=/app');
  }

  return <AppShell user={user}>{children}</AppShell>;
}
