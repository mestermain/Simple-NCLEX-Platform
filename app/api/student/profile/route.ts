import { NextResponse } from 'next/server';
import { getAuthFromRequest, checkUserPlatformAccess } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [session.id]);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const access = await checkUserPlatformAccess(user.id);

    // Fetch enrollments with course details
    const enrollments = await query(
      `SELECT e.*, c.title as course_title, c.category as course_category, c.emoji as course_emoji
       FROM enrollments e
       LEFT JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC`,
      [user.id]
    );

    // Fetch subscriptions
    const subscriptions = await query(
      `SELECT * FROM qbank_subscriptions WHERE user_id = ? ORDER BY enrolled_at DESC`,
      [user.id]
    );

    // Fetch notifications
    const notifications = await query(
      `SELECT * FROM student_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      [user.id]
    );

    const unreadCount = notifications.filter(n => n.is_read === 0).length;

    // Fetch practice attempts & score metrics
    const attempts = await query(
      `SELECT * FROM student_qbank_attempts WHERE user_id = ? ORDER BY attempted_at DESC`,
      [user.id]
    );

    const totalAttempted = attempts.length;
    const totalCorrect = attempts.filter(a => a.is_correct === 1).length;
    const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    // Category breakdown
    const categoryStats: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const a of attempts) {
      const cat = a.category || 'General';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, correct: 0, accuracy: 0 };
      }
      categoryStats[cat].total++;
      if (a.is_correct === 1) {
        categoryStats[cat].correct++;
      }
    }

    for (const cat in categoryStats) {
      categoryStats[cat].accuracy = Math.round((categoryStats[cat].correct / categoryStats[cat].total) * 100);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone || '',
        role: user.role,
        examType: user.exam_type || 'NCLEX-RN',
        createdAt: user.created_at,
      },
      hasFullAccess: access.hasAccess,
      accessDetails: access,
      scores: {
        totalAttempted,
        totalCorrect,
        overallAccuracy,
        categoryBreakdown: categoryStats,
      },
      enrollments: enrollments.map(e => ({
        id: e.id,
        courseId: e.course_id,
        courseTitle: e.course_title || 'NCLEX Course',
        courseCategory: e.course_category,
        courseEmoji: e.course_emoji || '📚',
        status: e.status,
        enrolledAt: e.enrolled_at,
        reviewedAt: e.reviewed_at,
        whatsappNumber: e.whatsapp_number,
        paymentScreenshot: e.payment_screenshot,
        transactionId: e.transaction_id,
        notes: e.notes,
      })),
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        planId: s.plan_id,
        planName: s.plan_name,
        durationDays: s.duration_days,
        price: Number(s.price),
        status: s.status,
        enrolledAt: s.enrolled_at,
        expiresAt: s.expires_at,
        whatsappNumber: s.whatsapp_number,
        paymentScreenshot: s.payment_screenshot,
      })),
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read === 1,
        link: n.link,
        createdAt: n.created_at,
      })),
      unreadNotificationsCount: unreadCount,
    });
  } catch (error: any) {
    console.error('Student profile error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
