import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { jsonCode, defaultCategory, defaultExamType, isDemo } = await req.json();

    if (!jsonCode || typeof jsonCode !== 'string') {
      return NextResponse.json({ success: false, message: 'JSON code string is required' }, { status: 400 });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonCode);
    } catch (e: any) {
      return NextResponse.json({ success: false, message: `Invalid JSON syntax: ${e.message}` }, { status: 400 });
    }

    const items: any[] = Array.isArray(parsedData) ? parsedData : (Array.isArray(parsedData.questions) ? parsedData.questions : [parsedData]);

    if (items.length === 0) {
      return NextResponse.json({ success: false, message: 'No questions found in JSON' }, { status: 400 });
    }

    let importedCount = 0;
    let msqCount = 0;
    let mcqCount = 0;

    for (const item of items) {
      const statement = item.statement || item.question || item.stem || '';
      if (!statement) continue;

      const rawOptions = item.options || item.choices || [];
      const options = Array.isArray(rawOptions) ? rawOptions.map(String) : [];
      if (options.length === 0) continue;

      const category = item.category || defaultCategory || 'Physiological Adaptation & Med-Surg';
      const difficulty = item.difficulty || 'High Yield';
      const examType = item.exam_type || item.examType || defaultExamType || 'NCLEX-RN';
      const clientNeed = item.client_need || item.clientNeed || '';
      const correctRationale = item.correct_rationale || item.rationale || item.explanation || '';
      const clinicalPearl = item.clinical_pearl || item.clinicalPearl || item.pearl || '';

      const rawDistractors = item.distractors || item.distractor_analysis || [];
      const distractors = Array.isArray(rawDistractors) ? rawDistractors.map(String) : [];

      // Detect question type
      const explicitType = (item.question_type || item.questionType || item.type || item.msq_type || '').toLowerCase();
      let isMultiple = explicitType.includes('multi') || explicitType.includes('msq') || explicitType.includes('sata');

      let correctIndices: number[] = [];
      if (Array.isArray(item.correct_indices)) {
        correctIndices = item.correct_indices.map(Number);
      } else if (Array.isArray(item.correctIndices)) {
        correctIndices = item.correctIndices.map(Number);
      } else if (Array.isArray(item.answers)) {
        correctIndices = item.answers.map(Number);
      } else if (item.correct_index !== undefined) {
        correctIndices = [Number(item.correct_index)];
      } else if (item.correctIndex !== undefined) {
        correctIndices = [Number(item.correctIndex)];
      } else if (item.answer !== undefined) {
        correctIndices = [Number(item.answer)];
      }

      if (correctIndices.length > 1) {
        isMultiple = true;
      }

      if (correctIndices.length === 0) {
        correctIndices = [0];
      }

      const qType = isMultiple ? 'multiple' : 'single';
      if (isMultiple) msqCount++;
      else mcqCount++;

      await execute(
        `INSERT INTO qbank_questions 
         (category, difficulty, exam_type, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, is_demo, sort_order, question_type, correct_indices_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP)`,
        [
          category,
          difficulty,
          examType,
          clientNeed,
          statement,
          JSON.stringify(options),
          correctIndices[0] || 0,
          correctRationale,
          JSON.stringify(distractors),
          clinicalPearl,
          isDemo ? 1 : 0,
          qType,
          JSON.stringify(correctIndices),
        ]
      );

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} items (${msqCount} Multi-Choice SATA MSQs, ${mcqCount} Single-Choice MCQs).`,
      importedCount,
      msqCount,
      mcqCount,
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
