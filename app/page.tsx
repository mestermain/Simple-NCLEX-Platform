import type { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import JsonLd from '@/components/JsonLd';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'NextGen NCLEX-RN, PN & Prometric Clinical Prep Q-Bank',
  description: 'Evidence-based nursing licensure preparation with interactive NextGen NCLEX case studies, SATA clinical drills, evidence-based clinical rationales, and live faculty classes.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Simple NCLEX Platform | Next Generation Q-Bank & Clinical Review',
    description: 'Evidence-based nursing licensure preparation with interactive NextGen NCLEX case studies, clinical rationales, and live classes.',
    url: 'https://simplenclexplatform.vercel.app',
    siteName: 'Simple NCLEX Platform',
    type: 'website',
  },
};

export default function HomePage() {
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: siteConfig.name,
      url: 'https://simplenclexplatform.vercel.app',
      logo: 'https://simplenclexplatform.vercel.app/images/logo.png',
      description: 'Online nursing licensure preparatory academy for NCLEX-RN, NCLEX-PN, DHA, HAAD, and Saudi SNLE.',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: siteConfig.contact.phone,
        contactType: 'Admissions and Academic Advising',
        email: siteConfig.contact.email,
        availableLanguage: ['English', 'Urdu', 'Arabic'],
      },
      sameAs: [
        siteConfig.contact.whatsappUrl,
      ].filter(Boolean),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does Simple NCLEX Platform prepare nurses for Next Generation NCLEX (NGN)?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Our simulator incorporates 6-question unfolding clinical case studies, matrix/grid questions, and extended multiple-response (SATA) items scored using NCSBN partial-credit rules.',
          },
        },
        {
          '@type': 'Question',
          name: 'When do I get access after subscribing or enrolling?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Account access is activated instantly upon registration for free trial items. For full Q-Bank subscriptions and live batches, access is verified within 15 to 30 minutes after submitting proof of payment.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Simple NCLEX offer a pass guarantee?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Candidates enrolled in our Comprehensive Live Batches who complete 100% of curriculum lectures and maintain a 75%+ benchmark on the Q-Bank qualify for our 100% Pass Guarantee.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I study for Gulf exams like Saudi SNLE, DHA, or HAAD here?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Our clinical questions and core lectures cover the universal test blueprints required by the Saudi Commission (SCFHS), Dubai Health Authority (DHA), and Abu Dhabi (DoH/HAAD).',
          },
        },
        {
          '@type': 'Question',
          name: 'What payment options are supported?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We support local mobile wallets (Easypaisa, JazzCash), direct online bank transfers, and international payment assistance via our admissions desk.',
          },
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <HomeClient />
    </>
  );
}
