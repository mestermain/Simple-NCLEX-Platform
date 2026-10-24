import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { queryOne } from '@/lib/db';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const courseId = parseInt(params.id, 10);
  let courseTitle = 'NCLEX Preparatory Course';
  let courseDesc = 'Detailed syllabus, clinical schedule, and enrollment details for Simple NCLEX Academy preparatory batches.';

  try {
    const course = await queryOne('SELECT title, description FROM courses WHERE id = ?', [courseId]);
    if (course) {
      courseTitle = course.title;
      courseDesc = course.description || courseDesc;
    }
  } catch (_) {}

  return {
    title: courseTitle,
    description: courseDesc,
    alternates: {
      canonical: `/courses/${params.id}`,
    },
    openGraph: {
      title: `${courseTitle} | Simple NCLEX Academy`,
      description: courseDesc,
      url: `https://simplenclexplatform.vercel.app/courses/${params.id}`,
    },
  };
}

export default async function CourseDetailLayout({ params, children }: Props) {
  const courseId = parseInt(params.id, 10);
  let courseTitle = 'NCLEX Preparatory Course';
  let courseDesc = 'Detailed syllabus, clinical schedule, and enrollment details for Simple NCLEX Academy preparatory batches.';
  let coursePrice = '149';

  try {
    const course = await queryOne('SELECT title, description, price FROM courses WHERE id = ?', [courseId]);
    if (course) {
      courseTitle = course.title;
      courseDesc = course.description || courseDesc;
      coursePrice = String(course.price || 149);
    }
  } catch (_) {}

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: courseTitle,
    description: courseDesc,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Simple NCLEX Academy',
      sameAs: 'https://simplenclexplatform.vercel.app',
    },
    offers: {
      '@type': 'Offer',
      price: coursePrice,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <JsonLd data={courseSchema} />
      {children}
    </>
  );
}
