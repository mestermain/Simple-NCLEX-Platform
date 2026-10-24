import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const {
      questionId,
      selectedIndices, // Legacy number[] or structured user answer
      userAnswers, // Generic answer payload (array, object, or string)
      timeSpentSeconds = 0,
      sessionId = null,
    } = await req.json();

    if (!questionId) {
      return NextResponse.json({ success: false, message: 'Question ID is required' }, { status: 400 });
    }

    const q = await queryOne('SELECT * FROM qbank_questions WHERE id = ?', [questionId]);
    if (!q) {
      return NextResponse.json({ success: false, message: 'Question not found' }, { status: 404 });
    }

    const questionType = (q.type || q.question_type || 'MCQ').toUpperCase();
    let correctAnswersRaw: any = [];
    try {
      correctAnswersRaw = JSON.parse(q.correct_answers || q.correct_indices_json || '[]');
    } catch (_) {
      correctAnswersRaw = [];
    }

    if (!Array.isArray(correctAnswersRaw) && typeof correctAnswersRaw !== 'object') {
      correctAnswersRaw = [q.correct_index];
    } else if (Array.isArray(correctAnswersRaw) && correctAnswersRaw.length === 0) {
      correctAnswersRaw = [q.correct_index];
    }

    // Determine student's answer payload
    const effectiveAnswers = userAnswers !== undefined ? userAnswers : selectedIndices;

    let score = 0.0;
    let isCorrect = false;

    // SCORING ENGINE (NCSBN Clinical Scoring Model)
    if (questionType === 'MCQ' || questionType === 'SINGLE') {
      const selected = Array.isArray(effectiveAnswers) ? Number(effectiveAnswers[0]) : Number(effectiveAnswers);
      const expected = Array.isArray(correctAnswersRaw) ? Number(correctAnswersRaw[0]) : Number(q.correct_index);
      isCorrect = selected === expected;
      score = isCorrect ? 1.0 : 0.0;
    } else if (questionType === 'SATA' || questionType === 'MULTIPLE') {
      // NCSBN +/- Scoring with 0 Floor: +1 for each correct selected, -1 for each incorrect selected
      const studentArr: number[] = Array.isArray(effectiveAnswers) ? effectiveAnswers.map(Number) : [];
      const expectedArr: number[] = Array.isArray(correctAnswersRaw) ? correctAnswersRaw.map(Number) : [q.correct_index];

      const expectedSet = new Set(expectedArr);
      let correctPicks = 0;
      let incorrectPicks = 0;

      for (const sel of studentArr) {
        if (expectedSet.has(sel)) {
          correctPicks++;
        } else {
          incorrectPicks++;
        }
      }

      const totalCorrect = expectedArr.length > 0 ? expectedArr.length : 1;
      const netPoints = Math.max(0, correctPicks - incorrectPicks);
      score = Math.round((netPoints / totalCorrect) * 100) / 100;
      isCorrect = score === 1.0 && studentArr.length === expectedArr.length;
    } else if (questionType === 'MATRIX') {
      // Row by row comparison
      const studentMatrix = typeof effectiveAnswers === 'object' && effectiveAnswers !== null ? effectiveAnswers : {};
      const expectedMatrix = typeof correctAnswersRaw === 'object' && correctAnswersRaw !== null ? correctAnswersRaw : {};

      const rowKeys = Object.keys(expectedMatrix);
      let matches = 0;
      for (const k of rowKeys) {
        if (String(studentMatrix[k]) === String(expectedMatrix[k])) {
          matches++;
        }
      }
      const totalRows = rowKeys.length > 0 ? rowKeys.length : 1;
      score = Math.round((matches / totalRows) * 100) / 100;
      isCorrect = score === 1.0;
    } else if (questionType === 'CLOZE') {
      // Dropdown by dropdown comparison
      const studentDropdowns = typeof effectiveAnswers === 'object' && effectiveAnswers !== null ? effectiveAnswers : {};
      const expectedDropdowns = typeof correctAnswersRaw === 'object' && correctAnswersRaw !== null ? correctAnswersRaw : {};

      const dropKeys = Object.keys(expectedDropdowns);
      let matches = 0;
      for (const k of dropKeys) {
        if (String(studentDropdowns[k]).trim().toLowerCase() === String(expectedDropdowns[k]).trim().toLowerCase()) {
          matches++;
        }
      }
      const totalDrops = dropKeys.length > 0 ? dropKeys.length : 1;
      score = Math.round((matches / totalDrops) * 100) / 100;
      isCorrect = score === 1.0;
    } else if (questionType === 'DRAG_DROP') {
      // Sequence ordering comparison
      const studentSeq: number[] = Array.isArray(effectiveAnswers) ? effectiveAnswers.map(Number) : [];
      const expectedSeq: number[] = Array.isArray(correctAnswersRaw) ? correctAnswersRaw.map(Number) : [];

      let matches = 0;
      for (let i = 0; i < expectedSeq.length; i++) {
        if (studentSeq[i] === expectedSeq[i]) {
          matches++;
        }
      }
      const totalSteps = expectedSeq.length > 0 ? expectedSeq.length : 1;
      score = Math.round((matches / totalSteps) * 100) / 100;
      isCorrect = score === 1.0;
    } else if (questionType === 'BOWTIE') {
      // 5 parts: 2 actions, 1 condition, 2 parameters
      const studentBow = typeof effectiveAnswers === 'object' && effectiveAnswers !== null ? effectiveAnswers : {};
      const expectedBow = typeof correctAnswersRaw === 'object' && correctAnswersRaw !== null ? correctAnswersRaw : {};

      let matches = 0;
      // condition (1 point)
      if (String(studentBow.potentialCondition) === String(expectedBow.potentialCondition)) matches++;

      // actions (2 points)
      const stActions = new Set(Array.isArray(studentBow.actionsToTake) ? studentBow.actionsToTake.map(Number) : []);
      const exActions = Array.isArray(expectedBow.actionsToTake) ? expectedBow.actionsToTake.map(Number) : [];
      for (const a of exActions) {
        if (stActions.has(a)) matches++;
      }

      // parameters (2 points)
      const stParams = new Set(Array.isArray(studentBow.parametersToMonitor) ? studentBow.parametersToMonitor.map(Number) : []);
      const exParams = Array.isArray(expectedBow.parametersToMonitor) ? expectedBow.parametersToMonitor.map(Number) : [];
      for (const p of exParams) {
        if (stParams.has(p)) matches++;
      }

      score = Math.round((matches / 5.0) * 100) / 100;
      isCorrect = score === 1.0;
    } else {
      // Fallback
      isCorrect = JSON.stringify(effectiveAnswers) === JSON.stringify(correctAnswersRaw);
      score = isCorrect ? 1.0 : 0.0;
    }

    // Save attempt if user is authenticated
    const session = getAuthFromRequest(req);
    if (session) {
      try {
        // 1. Modern attempts table
        await execute(
          `INSERT INTO attempts (
            user_id, session_id, question_id, question_type, user_answers,
            score, is_correct, time_spent_seconds, category, body_system, difficulty, exam_track, attempted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            session.id,
            sessionId || null,
            q.id,
            questionType,
            JSON.stringify(effectiveAnswers),
            score,
            isCorrect ? 1 : 0,
            timeSpentSeconds,
            q.category,
            q.body_system || q.organ_system || 'General',
            q.difficulty,
            q.exam_track || q.exam_type || 'RN',
          ]
        );

        // 2. Legacy student_qbank_attempts table for backward compatibility
        await execute(
          `INSERT INTO student_qbank_attempts 
           (user_id, question_id, question_type, category, difficulty, exam_type, selected_indices_json, is_correct, attempted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            session.id,
            q.id,
            questionType === 'SATA' ? 'multiple' : 'single',
            q.category,
            q.difficulty,
            q.exam_track || q.exam_type || 'NCLEX-RN',
            JSON.stringify(Array.isArray(effectiveAnswers) ? effectiveAnswers : []),
            isCorrect ? 1 : 0,
          ]
        );
      } catch (e) {
        console.warn('Could not record student attempt:', e);
      }
    }

    let distractors: any = [];
    try {
      distractors = JSON.parse(q.rationale_per_option || q.distractors_json || '[]');
    } catch (_) {
      distractors = [];
    }

    return NextResponse.json({
      success: true,
      questionId: q.id,
      questionType,
      isCorrect,
      score, // 0.0 to 1.0 partial credit
      correctIndex: q.correct_index,
      correctIndices: Array.isArray(correctAnswersRaw) ? correctAnswersRaw : [q.correct_index],
      correctAnswers: correctAnswersRaw,
      correctRationale: q.correct_rationale || 'Detailed clinical rationale unavailable.',
      distractors,
      rationalePerOption: distractors,
      clinicalPearl: q.clinical_pearl || '',
    });
  } catch (error: any) {
    console.error('QBank submit error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
