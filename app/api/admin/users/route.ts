import { NextResponse } from 'next/server';
import { getAuthFromRequest, hashPassword } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const rows = await query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.exam_type, u.role, u.is_active, u.created_at, u.phone,
             (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id AND status = 'approved') as approved_courses,
             (SELECT COUNT(*) FROM qbank_subscriptions WHERE user_id = u.id AND status = 'approved') as approved_subscriptions
      FROM users u
      ORDER BY u.id DESC
    `);

    return NextResponse.json({
      success: true,
      users: rows.map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`.trim(),
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        examType: u.exam_type,
        role: u.role,
        isActive: u.is_active === 1,
        createdAt: u.created_at,
        phone: u.phone,
        hasFullAccess: u.role === 'admin' || u.approved_courses > 0 || u.approved_subscriptions > 0,
        approvedCoursesCount: u.approved_courses,
        approvedSubscriptionsCount: u.approved_subscriptions,
      })),
      total: rows.length,
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
    const { id, role, isActive, action, newPassword } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    const targetUser = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // 1. Password Reset Action
    if (action === 'reset_password') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Temporary password must be at least 6 characters' },
          { status: 400 }
        );
      }
      const newHash = hashPassword(newPassword);
      await execute("UPDATE users SET password_hash = ?, plain_password = '' WHERE id = ?", [newHash, id]);
      
      await logAdminAction(
        session.userId,
        'student.reset_password',
        'users',
        id,
        { studentEmail: targetUser.email },
        req
      );

      return NextResponse.json({ success: true, message: `Password reset successfully for ${targetUser.email}` });
    }

    // 2. Grant Full Q-Bank Access Action
    if (action === 'grant_access' || action === 'grant_pass') {
      const duration = Number(body.durationDays) || 30;
      const now = new Date();
      const expires = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();
      
      await execute(
        `INSERT INTO qbank_subscriptions 
         (user_id, plan_name, duration_days, price, status, whatsapp_number, payment_screenshot, enrolled_at, expires_at)
         VALUES (?, 'Admin Granted 30-Day Pass', ?, 0, 'approved', ?, 'admin_granted', ?, ?)`,
        [id, duration, targetUser.phone || '', now.toISOString(), expires]
      );

      await execute(
        `INSERT INTO student_notifications (user_id, title, message, type, is_read, link, created_at)
         VALUES (?, 'Full Q-Bank Access Granted', 'An administrator has activated a 30-day all-access Q-Bank pass on your account.', 'access_granted', 0, '/qbank', ?)`,
        [id, now.toISOString()]
      );

      await logAdminAction(
        session.userId,
        'student.grant_access',
        'users',
        id,
        { studentEmail: targetUser.email, durationDays: duration },
        req
      );

      return NextResponse.json({ success: true, message: `Full access granted to ${targetUser.email}` });
    }

    // 3. Revoke Access Action
    if (action === 'revoke_access' || action === 'revoke_pass') {
      await execute("UPDATE qbank_subscriptions SET status = 'expired' WHERE user_id = ?", [id]);
      await execute("UPDATE enrollments SET status = 'pending' WHERE user_id = ?", [id]);

      await logAdminAction(
        session.userId,
        'student.revoke_access',
        'users',
        id,
        { studentEmail: targetUser.email },
        req
      );

      return NextResponse.json({ success: true, message: `Access revoked for ${targetUser.email}` });
    }

    // 4. Role Update
    if (role !== undefined || action === 'change_role') {
      const targetRole = role || body.newRole;
      await execute('UPDATE users SET role = ? WHERE id = ?', [targetRole, id]);
      await logAdminAction(
        session.userId,
        'user.change_role',
        'users',
        id,
        { studentEmail: targetUser.email, newRole: targetRole },
        req
      );
    }

    // 5. Account Activation Status
    if (isActive !== undefined || action === 'toggle_status') {
      const newActive = isActive !== undefined ? (isActive ? 1 : 0) : (targetUser.is_active === 1 ? 0 : 1);
      await execute('UPDATE users SET is_active = ? WHERE id = ?', [newActive, id]);
      await logAdminAction(
        session.userId,
        newActive === 1 ? 'user.activate' : 'user.suspend',
        'users',
        id,
        { studentEmail: targetUser.email, isActive: newActive === 1 },
        req
      );
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
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
      return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    const numId = parseInt(id, 10);
    if (session.userId === numId) {
      return NextResponse.json({ success: false, message: 'You cannot delete your own administrative account' }, { status: 400 });
    }

    const targetUser = await queryOne('SELECT email FROM users WHERE id = ?', [numId]);

    await execute('DELETE FROM users WHERE id = ?', [numId]);

    await logAdminAction(
      session.userId,
      'user.delete',
      'users',
      numId,
      { studentEmail: targetUser?.email || 'unknown' },
      req
    );

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

