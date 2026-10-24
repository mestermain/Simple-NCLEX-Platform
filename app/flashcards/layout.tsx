import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clinical Flashcards & Spaced Repetition | Simple NCLEX Academy',
  description: 'Master high-yield NCLEX pharmacology, nursing interventions, and clinical pearls using the scientifically proven Leitner 5-box and SM-2 spaced repetition algorithms.',
  keywords: [
    'NCLEX flashcards',
    'spaced repetition nursing',
    'Leitner box flashcards',
    'NCLEX pharmacology flashcards',
    'high-yield nursing pearls'
  ],
  openGraph: {
    title: 'Clinical Flashcards & Spaced Repetition | Simple NCLEX Academy',
    description: 'Scientifically spaced review of high-yield NCLEX clinical pearls, lab ranges, and nursing interventions.',
    type: 'website',
  },
};

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
