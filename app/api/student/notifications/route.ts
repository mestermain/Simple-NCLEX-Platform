import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { execute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, markAll } = await req.json();

    if (markAll) {
      await execute('UPDATE student_notifications SET is_read = 1 WHERE user_id = ?', [session.id]);
    } else if (notificationId) {
      await execute('UPDATE student_notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, session.id]);
    }

    return NextResponse.json({ success: true, message: 'Notifications updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
