import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';

    let sql = `
      SELECT 
        s.*,
        u.first_name, u.last_name, u.email, u.phone as user_phone
      FROM qbank_subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status !== 'all') {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY s.id DESC';

    const items = await query(sql, params);

    const pendingCount = (await queryOne("SELECT count(*) as count FROM qbank_subscriptions WHERE status = 'pending'"))?.count || 0;
    const approvedCount = (await queryOne("SELECT count(*) as count FROM qbank_subscriptions WHERE status = 'approved'"))?.count || 0;
    const rejectedCount = (await queryOne("SELECT count(*) as count FROM qbank_subscriptions WHERE status = 'rejected'"))?.count || 0;

    return NextResponse.json({
      success: true,
      subscriptions: items.map(s => ({
        id: s.id,
        userId: s.user_id,
        studentName: `${s.first_name} ${s.last_name}`.trim(),
        email: s.email,
        phone: s.whatsapp_number || s.user_phone,
        planName: s.plan_name,
        durationDays: s.duration_days,
        price: s.price,
        status: s.status,
        enrolledAt: s.enrolled_at,
        reviewedAt: s.reviewed_at,
        expiresAt: s.expires_at,
        paymentScreenshot: s.payment_screenshot,
        notes: s.notes,
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

    const { id, status, notes, durationDays } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ success: false, message: 'ID and status required' }, { status: 400 });
    }

    const sub = await queryOne('SELECT * FROM qbank_subscriptions WHERE id = ?', [id]);
    if (!sub) {
      return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 });
    }

    const days = durationDays || sub.duration_days || 30;
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + Number(days));
    const expiresAtStr = expiresDate.toISOString().replace('T', ' ').substring(0, 19);

    if (status === 'approved') {
      await execute(
        `UPDATE qbank_subscriptions 
         SET status = 'approved', expires_at = ?, notes = ?, reviewed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [expiresAtStr, notes || 'Approved by administrator', id]
      );

      await execute(
        `INSERT INTO student_notifications (user_id, title, message, type, is_read, link, created_at)
         VALUES (?, ?, ?, 'qbank', 0, '/qbank', CURRENT_TIMESTAMP)`,
        [
          sub.user_id,
          'Q-Bank Access Activated! ⚡',
          `Your Q-Bank subscription has been approved! You now have unrestricted access to all high-yield clinical MCQs and SATA rationales until ${expiresAtStr.split(' ')[0]}.`,
        ]
      );
    } else {
      await execute(
        `UPDATE qbank_subscriptions 
         SET status = ?, notes = ?, reviewed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, notes || 'Status updated by administrator', id]
      );

      if (status === 'rejected') {
        await execute(
          `INSERT INTO student_notifications (user_id, title, message, type, is_read, link, created_at)
           VALUES (?, ?, ?, 'system', 0, '/qbank', CURRENT_TIMESTAMP)`,
          [
            sub.user_id,
            'Q-Bank Subscription Update',
            `Your subscription request was not approved. Note: ${notes || 'Please verify payment screenshot or contact support.'}`,
          ]
        );
      }
    }

    return NextResponse.json({ success: true, message: `Subscription marked as ${status}` });
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
      return NextResponse.json({ success: false, message: 'Subscription ID required' }, { status: 400 });
    }

    await execute('DELETE FROM qbank_subscriptions WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Subscription deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
