import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { updateStatusSchema } from '@/lib/validators';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const q = searchParams.get('q') || '';

    let sql = `
      SELECT 
        e.*,
        u.first_name, u.last_name, u.email, u.phone as user_phone,
        c.title as course_title, c.category as course_exam_type, c.price as course_price
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status !== 'all') {
      sql += ' AND e.status = ?';
      params.push(status);
    }

    if (q) {
      sql += ' AND (LOWER(u.first_name) LIKE ? OR LOWER(u.last_name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(c.title) LIKE ?)';
      params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
    }

    sql += ' ORDER BY e.id DESC';

    const items = await query(sql, params);

    // Status counts
    const pendingCount = (await queryOne("SELECT count(*) as count FROM enrollments WHERE status = 'pending'"))?.count || 0;
    const approvedCount = (await queryOne("SELECT count(*) as count FROM enrollments WHERE status = 'approved'"))?.count || 0;
    const rejectedCount = (await queryOne("SELECT count(*) as count FROM enrollments WHERE status = 'rejected'"))?.count || 0;

    return NextResponse.json({
      success: true,
      registrations: items.map(r => ({
        id: r.id,
        userId: r.user_id,
        courseId: r.course_id,
        studentName: `${r.first_name} ${r.last_name}`.trim(),
        email: r.email,
        phone: r.whatsapp_number || r.user_phone,
        courseTitle: r.course_title,
        examType: r.course_exam_type,
        price: r.course_price,
        status: r.status,
        enrolledAt: r.enrolled_at,
        reviewedAt: r.reviewed_at,
        paymentScreenshot: r.payment_screenshot,
        transactionId: r.transaction_id,
        notes: r.notes,
      })),
      counts: {
        pending: Number(pendingCount),
        approved: Number(approvedCount),
        rejected: Number(rejectedCount),
        total: items.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid status data' }, { status: 400 });
    }
    const { id, status, notes } = parsed.data;

    const enrollment = await queryOne('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (!enrollment) {
      return NextResponse.json({ success: false, message: 'Registration not found' }, { status: 404 });
    }

    await execute(
      `UPDATE enrollments SET status = ?, notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, notes || (status === 'approved' ? 'Approved by administrator' : 'Rejected by administrator'), id]
    );

    // Notify student
    const course = await queryOne('SELECT title FROM courses WHERE id = ?', [enrollment.course_id]);
    const courseTitle = course?.title || 'Selected Course';

    if (status === 'approved') {
      await execute(
        `INSERT INTO student_notifications (user_id, title, message, type, is_read, link, created_at)
         VALUES (?, ?, ?, 'course', 0, '/courses', CURRENT_TIMESTAMP)`,
        [
          enrollment.user_id,
          'Course Enrollment Verified! 📚',
          `Your registration for "${courseTitle}" has been approved! You now have full access to class curriculum and live sessions.`,
        ]
      );
    } else if (status === 'rejected') {
      await execute(
        `INSERT INTO student_notifications (user_id, title, message, type, is_read, link, created_at)
         VALUES (?, ?, ?, 'system', 0, '/profile', CURRENT_TIMESTAMP)`,
        [
          enrollment.user_id,
          'Enrollment Status Update',
          `Your registration for "${courseTitle}" was not approved. Note: ${notes || 'Please contact support or re-submit proof.'}`,
        ]
      );
    }

    await logAdminAction(
      session.userId,
      `registration.${status}`,
      'enrollments',
      id,
      { courseId: enrollment.course_id, studentUserId: enrollment.user_id, status, notes },
      req
    );

    return NextResponse.json({ success: true, message: `Registration marked as ${status}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Registration ID required' }, { status: 400 });
    }

    await execute('DELETE FROM enrollments WHERE id = ?', [id]);

    await logAdminAction(
      session.userId,
      'registration.delete',
      'enrollments',
      Number(id),
      { enrollmentId: id },
      req
    );

    return NextResponse.json({ success: true, message: 'Registration deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

