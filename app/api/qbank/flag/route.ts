import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: true, flaggedIds: [] });
    }

    const rows = await query(
      'SELECT question_id FROM student_qbank_flags WHERE user_id = ? ORDER BY id DESC',
      [session.id]
    );

    const flaggedIds = rows.map((r: any) => r.question_id);
    return NextResponse.json({ success: true, flaggedIds });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const { questionId } = await req.json();

    if (!questionId) {
      return NextResponse.json({ success: false, message: 'Question ID required' }, { status: 400 });
    }

    if (!session) {
      // For unauthenticated guest sessions, acknowledge toggle so client handles local state
      return NextResponse.json({ success: true, guest: true });
    }

    const existing = await queryOne(
      'SELECT id FROM student_qbank_flags WHERE user_id = ? AND question_id = ?',
      [session.id, questionId]
    );

    if (existing) {
      await execute('DELETE FROM student_qbank_flags WHERE id = ?', [existing.id]);
      return NextResponse.json({ success: true, isFlagged: false });
    } else {
      await execute(
        'INSERT INTO student_qbank_flags (user_id, question_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [session.id, questionId]
      );
      return NextResponse.json({ success: true, isFlagged: true });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
