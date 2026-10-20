import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const [
      totalUsers,
      totalStudents,
      totalQuestions,
      pendingEnrollments,
      approvedEnrollments,
      pendingSubscriptions,
      approvedSubscriptions,
    ] = await Promise.all([
      queryOne('SELECT count(*) as count FROM users'),
      queryOne("SELECT count(*) as count FROM users WHERE role = 'student'"),
      queryOne('SELECT count(*) as count FROM qbank_questions'),
      queryOne("SELECT count(*) as count FROM enrollments WHERE status = 'pending'"),
      queryOne("SELECT count(*) as count FROM enrollments WHERE status = 'approved'"),
      queryOne("SELECT count(*) as count FROM qbank_subscriptions WHERE status = 'pending'"),
      queryOne("SELECT count(*) as count FROM qbank_subscriptions WHERE status = 'approved'"),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: Number(totalUsers?.count || 0),
        totalStudents: Number(totalStudents?.count || 0),
        totalQuestions: Number(totalQuestions?.count || 0),
        pendingEnrollments: Number(pendingEnrollments?.count || 0),
        approvedEnrollments: Number(approvedEnrollments?.count || 0),
        pendingSubscriptions: Number(pendingSubscriptions?.count || 0),
        approvedSubscriptions: Number(approvedSubscriptions?.count || 0),
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
