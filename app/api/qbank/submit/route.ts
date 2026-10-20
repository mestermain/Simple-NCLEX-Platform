import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { questionId, selectedIndices, questionType } = await req.json();

    if (!questionId) {
      return NextResponse.json({ success: false, message: 'Question ID is required' }, { status: 400 });
    }

    const q = await queryOne('SELECT * FROM qbank_questions WHERE id = ?', [questionId]);
    if (!q) {
      return NextResponse.json({ success: false, message: 'Question not found' }, { status: 404 });
    }

    let correctIndices: number[] = [];
    try {
      correctIndices = JSON.parse(q.correct_indices_json || '[]');
    } catch (_) {
      correctIndices = [];
    }

    if (!Array.isArray(correctIndices) || correctIndices.length === 0) {
      correctIndices = [q.correct_index];
    }

    const isMultiple = q.question_type === 'multiple' || correctIndices.length > 1;
    const userSelected: number[] = Array.isArray(selectedIndices) ? selectedIndices.map(Number) : [];

    let isCorrect = false;
    if (isMultiple) {
      const sortedUser = [...userSelected].sort((a, b) => a - b);
      const sortedCorrect = [...correctIndices].sort((a, b) => a - b);
      isCorrect = sortedUser.length === sortedCorrect.length && sortedUser.every((val, idx) => val === sortedCorrect[idx]);
    } else {
      isCorrect = userSelected.length === 1 && userSelected[0] === q.correct_index;
    }

    // Save attempt if user is authenticated
    const session = getAuthFromRequest(req);
    if (session) {
      try {
        await execute(
          `INSERT INTO student_qbank_attempts 
           (user_id, question_id, question_type, category, difficulty, exam_type, selected_indices_json, is_correct, attempted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            session.id,
            q.id,
            isMultiple ? 'multiple' : 'single',
            q.category,
            q.difficulty,
            q.exam_type || 'NCLEX-RN',
            JSON.stringify(userSelected),
            isCorrect ? 1 : 0,
          ]
        );
      } catch (e) {
        console.warn('Could not record student attempt:', e);
      }
    }

    let distractors = [];
    try { distractors = JSON.parse(q.distractors_json || '[]'); } catch (_) { distractors = []; }

    return NextResponse.json({
      success: true,
      isCorrect,
      correctIndex: q.correct_index,
      correctIndices,
      questionType: isMultiple ? 'multiple' : 'single',
      correctRationale: q.correct_rationale,
      distractors,
      clinicalPearl: q.clinical_pearl,
    });
  } catch (error: any) {
    console.error('QBank submit error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
