import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Admissions Desk & Academic Counseling Contact',
  description: 'Connect with Simple NCLEX Academy student advisors for transcript assessments, Dataflow guidance, and course enrollment assistance.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Admissions Desk | Simple NCLEX Academy',
    description: 'Speak with an academic counselor on WhatsApp or email.',
    url: 'https://simplenclexplatform.vercel.app/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Simple NCLEX Academy Admissions Desk',
    description: 'Academic counseling and admissions support for nursing licensure candidates.',
    url: 'https://simplenclexplatform.vercel.app/contact',
    mainEntity: {
      '@type': 'EducationalOrganization',
      name: siteConfig.name,
      telephone: siteConfig.contact.phone,
      email: siteConfig.contact.email,
    },
  };

  return (
    <>
      <JsonLd data={contactSchema} />
      {children}
    </>
  );
}
