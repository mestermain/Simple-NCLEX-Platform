import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Please log in to enroll in a course' }, { status: 401 });
    }

    const { courseId, whatsappNumber, paymentScreenshot, transactionId, notes } = await req.json();

    if (!courseId) {
      return NextResponse.json({ success: false, message: 'Course ID is required' }, { status: 400 });
    }

    const course = await queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      return NextResponse.json({ success: false, message: 'Course not found' }, { status: 404 });
    }

    // Check existing enrollment
    const existing = await queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [session.id, courseId]);
    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json({ success: true, message: 'You are already enrolled in this course with full access!' });
      }
      return NextResponse.json({ success: true, message: 'Your enrollment is currently pending approval.' });
    }

    await execute(
      `INSERT INTO enrollments 
       (user_id, course_id, status, whatsapp_number, payment_screenshot, transaction_id, notes, enrolled_at)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        session.id,
        courseId,
        whatsappNumber || '',
        paymentScreenshot || '',
        transactionId || '',
        notes || '',
      ]
    );

    // Create user notification
    try {
      await execute(
        `INSERT INTO student_notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'enrollment', 0, CURRENT_TIMESTAMP)`,
        [
          session.id,
          'Course Enrollment Submitted',
          `Your enrollment for "${course.title}" has been submitted for review. Once verified, you will receive full access to lectures and the complete 2,500+ NCLEX question bank!`,
        ]
      );
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Enrollment submitted successfully. Admin will review payment and grant access.',
    });
  } catch (error: any) {
    console.error('Enroll error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
