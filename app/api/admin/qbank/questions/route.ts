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
    const category = searchParams.get('category');
    const isDemo = searchParams.get('is_demo');
    const search = searchParams.get('search');

    let sql = 'SELECT * FROM qbank_questions WHERE 1=1';
    const params: any[] = [];

    if (isDemo === '1') {
      sql += ' AND is_demo = 1';
    } else if (isDemo === '0') {
      sql += ' AND is_demo = 0';
    }

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (LOWER(statement) LIKE ? OR LOWER(category) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    sql += ' ORDER BY id DESC';

    const rows = await query(sql, params);

    const questions = rows.map(r => {
      let options = [];
      let distractors = [];
      let correctIndices = [];

      try { options = JSON.parse(r.options_json || '[]'); } catch (_) { options = []; }
      try { distractors = JSON.parse(r.distractors_json || '[]'); } catch (_) { distractors = []; }
      try { correctIndices = JSON.parse(r.correct_indices_json || '[]'); } catch (_) { correctIndices = []; }

      return {
        id: r.id,
        category: r.category,
        organSystem: r.organ_system || 'General Clinical',
        difficulty: r.difficulty,
        examType: r.exam_type,
        clientNeed: r.client_need,
        statement: r.statement,
        options,
        questionType: r.question_type || (correctIndices.length > 1 ? 'multiple' : 'single'),
        correctIndex: r.correct_index,
        correctIndices: correctIndices.length > 0 ? correctIndices : [r.correct_index],
        correctRationale: r.correct_rationale,
        distractors,
        clinicalPearl: r.clinical_pearl,
        isDemo: r.is_demo === 1,
        sortOrder: r.sort_order,
      };
    });

    return NextResponse.json({ success: true, questions, totalCount: questions.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      category,
      organSystem,
      difficulty,
      examType,
      clientNeed,
      statement,
      options,
      questionType,
      correctIndex,
      correctIndices,
      correctRationale,
      distractors,
      clinicalPearl,
      isDemo,
      sortOrder,
    } = body;

    if (!statement || !category || !options || options.length === 0) {
      return NextResponse.json({ success: false, message: 'Missing required question fields' }, { status: 400 });
    }

    const isMultiple = questionType === 'multiple' || (Array.isArray(correctIndices) && correctIndices.length > 1);
    const resolvedCorrectIndices = isMultiple && Array.isArray(correctIndices) ? correctIndices : [correctIndex || 0];

    const result = await execute(
      `INSERT INTO qbank_questions 
       (category, organ_system, difficulty, exam_type, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, is_demo, sort_order, question_type, correct_indices_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        category,
        organSystem || body.organ_system || 'General Clinical',
        difficulty || 'High Yield',
        examType || 'NCLEX-RN',
        clientNeed || '',
        statement,
        JSON.stringify(options),
        resolvedCorrectIndices[0] || 0,
        correctRationale || '',
        JSON.stringify(distractors || []),
        clinicalPearl || '',
        isDemo ? 1 : 0,
        sortOrder || 0,
        isMultiple ? 'multiple' : 'single',
        JSON.stringify(resolvedCorrectIndices),
      ]
    );

    return NextResponse.json({ success: true, message: 'Question created successfully', id: result.lastInsertId });
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
    const {
      id,
      category,
      organSystem,
      difficulty,
      examType,
      clientNeed,
      statement,
      options,
      questionType,
      correctIndex,
      correctIndices,
      correctRationale,
      distractors,
      clinicalPearl,
      isDemo,
      sortOrder,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Question ID required' }, { status: 400 });
    }

    const isMultiple = questionType === 'multiple' || (Array.isArray(correctIndices) && correctIndices.length > 1);
    const resolvedCorrectIndices = isMultiple && Array.isArray(correctIndices) ? correctIndices : [correctIndex || 0];

    await execute(
      `UPDATE qbank_questions SET
         category = ?,
         organ_system = COALESCE(?, organ_system),
         difficulty = ?,
         exam_type = ?,
         client_need = ?,
         statement = ?,
         options_json = ?,
         correct_index = ?,
         correct_rationale = ?,
         distractors_json = ?,
         clinical_pearl = ?,
         is_demo = ?,
         sort_order = ?,
         question_type = ?,
         correct_indices_json = ?
       WHERE id = ?`,
      [
        category,
        organSystem || body.organ_system || null,
        difficulty || 'High Yield',
        examType || 'NCLEX-RN',
        clientNeed || '',
        statement,
        JSON.stringify(options),
        resolvedCorrectIndices[0] || 0,
        correctRationale || '',
        JSON.stringify(distractors || []),
        clinicalPearl || '',
        isDemo ? 1 : 0,
        sortOrder || 0,
        isMultiple ? 'multiple' : 'single',
        JSON.stringify(resolvedCorrectIndices),
        id,
      ]
    );

    return NextResponse.json({ success: true, message: 'Question updated successfully' });
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
      return NextResponse.json({ success: false, message: 'Question ID required' }, { status: 400 });
    }

    await execute('DELETE FROM qbank_questions WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
