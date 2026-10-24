import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Live Preparatory Courses & NextGen Clinical Batches',
  description: 'Comprehensive NCLEX-RN, NCLEX-PN, Saudi SNLE, and DHA live lecture courses. Master clinical judgment frameworks, acute pharmacology, and test-taking strategies.',
  alternates: {
    canonical: '/courses',
  },
  openGraph: {
    title: 'Live NCLEX & Licensure Prep Courses | Simple NCLEX Platform',
    description: 'Explore live preparatory batches for RN, PN, DHA, and SNLE candidates.',
    url: 'https://simplenclexplatform.vercel.app/courses',
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  const courseCatalogSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'Course',
        name: 'NCLEX-RN NextGen Comprehensive Mastery',
        description: 'Complete 12-week clinical review covering all 8 NCSBN client-needs categories, unfolding case studies, and pharmacology.',
        provider: {
          '@type': 'EducationalOrganization',
          name: 'Simple NCLEX Platform',
        },
      },
      {
        '@type': 'Course',
        name: 'High-Yield NCLEX Pharmacology & Calculations',
        description: 'Focus exclusively on cardiac, psych, antimicrobial, and autonomic medications, antidotes, and pediatric dosing formulas.',
        provider: {
          '@type': 'EducationalOrganization',
          name: 'Simple NCLEX Platform',
        },
      },
      {
        '@type': 'Course',
        name: 'Next-Gen Clinical Judgment Case Study Bootcamp',
        description: 'Master the 6 cognitive steps of the Clinical Judgment Measurement Model (CJMM) with interactive patient charts.',
        provider: {
          '@type': 'EducationalOrganization',
          name: 'Simple NCLEX Platform',
        },
      },
      {
        '@type': 'Course',
        name: 'NCLEX-PN Practical Nurse Core Review',
        description: 'Targeted preparation for Practical Nursing candidates covering scope of practice, delegation, and safety.',
        provider: {
          '@type': 'EducationalOrganization',
          name: 'Simple NCLEX Platform',
        },
      },
      {
        '@type': 'Course',
        name: 'DHA, HAAD & Gulf Prometric Licensure Intensive',
        description: 'Focused review for nurses relocating to the United Arab Emirates and Saudi Arabia.',
        provider: {
          '@type': 'EducationalOrganization',
          name: 'Simple NCLEX Platform',
        },
      },
    ],
  };

  return (
    <>
      <JsonLd data={courseCatalogSchema} />
      {children}
    </>
  );
}
