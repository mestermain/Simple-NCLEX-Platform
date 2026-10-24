import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      // Find the most recent in-progress session
      const activeSession = await queryOne(
        `SELECT * FROM test_sessions 
         WHERE user_id = ? AND status = 'in_progress' 
         ORDER BY created_at DESC LIMIT 1`,
        [session.id]
      );

      return NextResponse.json({
        success: true,
        session: activeSession
          ? {
              ...activeSession,
              filters: JSON.parse(activeSession.filters_json || '{}'),
              questionIds: JSON.parse(activeSession.question_ids_json || '[]'),
            }
          : null,
      });
    }

    // List recent sessions
    const sessions = await query(
      `SELECT * FROM test_sessions 
       WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 20`,
      [session.id]
    );

    return NextResponse.json({
      success: true,
      sessions: sessions.map(s => ({
        ...s,
        filters: JSON.parse(s.filters_json || '{}'),
        questionIds: JSON.parse(s.question_ids_json || '[]'),
      })),
    });
  } catch (error: any) {
    console.error('QBank sessions GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const body = await req.json();

    const {
      title = 'Practice Test',
      mode = 'tutor', // 'tutor' | 'timed' | 'cat'
      examTrack = 'RN',
      questionIds = [],
      filters = {},
      timeLimitSeconds = 0,
    } = body;

    const userId = session ? session.id : 0;
    const totalQuestions = Array.isArray(questionIds) ? questionIds.length : 0;

    if (totalQuestions === 0) {
      return NextResponse.json({ success: false, message: 'No questions provided for test session' }, { status: 400 });
    }

    let sessionId: number | undefined;

    if (userId > 0) {
      const res = await execute(
        `INSERT INTO test_sessions (
          user_id, title, mode, exam_track, status, filters_json,
          question_ids_json, current_question_index, total_questions,
          correct_count, score_percentage, time_limit_seconds, time_spent_seconds, created_at
        ) VALUES (?, ?, ?, ?, 'in_progress', ?, ?, 0, ?, 0, 0.00, ?, 0, CURRENT_TIMESTAMP)`,
        [
          userId,
          title,
          mode,
          examTrack,
          JSON.stringify(filters),
          JSON.stringify(questionIds),
          totalQuestions,
          timeLimitSeconds,
        ]
      );
      sessionId = res.lastInsertId ? Number(res.lastInsertId) : undefined;
    }

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Test session initiated successfully',
      mode,
      totalQuestions,
    });
  } catch (error: any) {
    console.error('QBank sessions POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const body = await req.json();

    const {
      sessionId,
      currentIndex,
      timeSpentSeconds,
      status, // 'in_progress' | 'completed' | 'abandoned'
      correctCount,
      scorePercentage,
    } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'Session ID is required for autosave' }, { status: 400 });
    }

    if (session) {
      const existing = await queryOne('SELECT * FROM test_sessions WHERE id = ? AND user_id = ?', [sessionId, session.id]);
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
      }

      await execute(
        `UPDATE test_sessions SET
          current_question_index = COALESCE(?, current_question_index),
          time_spent_seconds = COALESCE(?, time_spent_seconds),
          status = COALESCE(?, status),
          correct_count = COALESCE(?, correct_count),
          score_percentage = COALESCE(?, score_percentage),
          completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = ? AND user_id = ?`,
        [
          currentIndex !== undefined ? currentIndex : null,
          timeSpentSeconds !== undefined ? timeSpentSeconds : null,
          status || null,
          correctCount !== undefined ? correctCount : null,
          scorePercentage !== undefined ? scorePercentage : null,
          status || '',
          sessionId,
          session.id,
        ]
      );
    }

    return NextResponse.json({ success: true, message: 'Session autosaved successfully' });
  } catch (error: any) {
    console.error('QBank sessions PUT error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
