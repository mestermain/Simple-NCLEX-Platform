import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ success: false, message: 'Question ID required' }, { status: 400 });
    }

    const note = await queryOne(
      'SELECT content, updated_at, created_at FROM notes WHERE user_id = ? AND question_id = ?',
      [session.id, questionId]
    );

    return NextResponse.json({
      success: true,
      note: note ? note.content : '',
      updatedAt: note ? note.updated_at || note.created_at : null,
    });
  } catch (error: any) {
    console.error('QBank notes GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { questionId, content } = await req.json();
    if (!questionId) {
      return NextResponse.json({ success: false, message: 'Question ID required' }, { status: 400 });
    }

    const noteText = typeof content === 'string' ? content.trim() : '';

    if (!noteText) {
      // If blank, delete note
      await execute('DELETE FROM notes WHERE user_id = ? AND question_id = ?', [session.id, questionId]);
      return NextResponse.json({ success: true, message: 'Note cleared' });
    }

    await execute(
      `INSERT INTO notes (user_id, question_id, content, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, question_id) DO UPDATE SET
         content = excluded.content,
         updated_at = CURRENT_TIMESTAMP`,
      [session.id, questionId, noteText]
    );

    return NextResponse.json({ success: true, message: 'Note saved successfully' });
  } catch (error: any) {
    console.error('QBank notes POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
