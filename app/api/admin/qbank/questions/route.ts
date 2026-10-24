import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { logAdminAction } from '@/lib/audit';
import { questionSchema } from '@/lib/validators';

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
    const status = searchParams.get('status');

    let sql = 'SELECT * FROM qbank_questions WHERE 1=1';
    const params: any[] = [];

    if (isDemo === '1') {
      sql += ' AND is_demo = 1';
    } else if (isDemo === '0') {
      sql += ' AND is_demo = 0';
    }

    if (status === 'draft') {
      sql += ' AND is_published = 0';
    } else if (status === 'published') {
      sql += ' AND is_published = 1';
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
        isPublished: r.is_published !== 0,
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

    const rawBody = await req.json();
    const parsed = questionSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || 'Invalid question format' },
        { status: 400 }
      );
    }

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
      clinicalPearl,
      isPublished,
    } = parsed.data;

    const isMultiple = questionType === 'multiple' || (Array.isArray(correctIndices) && correctIndices.length > 1);
    const resolvedCorrectIndices = isMultiple && Array.isArray(correctIndices) ? correctIndices : [correctIndex || 0];

    const result = await execute(
      `INSERT INTO qbank_questions 
       (category, organ_system, difficulty, exam_type, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, is_demo, sort_order, question_type, correct_indices_json, is_published, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        category,
        organSystem,
        difficulty,
        examType,
        clientNeed,
        statement,
        JSON.stringify(options),
        resolvedCorrectIndices[0] || 0,
        correctRationale,
        JSON.stringify(rawBody.distractors || []),
        clinicalPearl,
        rawBody.isDemo ? 1 : 0,
        rawBody.sortOrder || 0,
        isMultiple ? 'multiple' : 'single',
        JSON.stringify(resolvedCorrectIndices),
        isPublished ? 1 : 0,
      ]
    );

    const questionId = result.lastInsertId as number;

    await logAdminAction(
      'CREATE_QUESTION',
      `Created question #${questionId} in ${category} (${isPublished ? 'Published' : 'Draft'})`,
      session.id,
      session.email
    );

    return NextResponse.json({ success: true, message: 'Question created successfully', id: questionId });
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

    const rawBody = await req.json();
    if (!rawBody.id) {
      return NextResponse.json({ success: false, message: 'Question ID required' }, { status: 400 });
    }

    const parsed = questionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || 'Invalid question format' },
        { status: 400 }
      );
    }

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
      clinicalPearl,
      isPublished,
    } = parsed.data;

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
         correct_indices_json = ?,
         is_published = ?
       WHERE id = ?`,
      [
        category,
        organSystem || null,
        difficulty,
        examType,
        clientNeed,
        statement,
        JSON.stringify(options),
        resolvedCorrectIndices[0] || 0,
        correctRationale,
        JSON.stringify(rawBody.distractors || []),
        clinicalPearl,
        rawBody.isDemo ? 1 : 0,
        rawBody.sortOrder || 0,
        isMultiple ? 'multiple' : 'single',
        JSON.stringify(resolvedCorrectIndices),
        isPublished ? 1 : 0,
        rawBody.id,
      ]
    );

    await logAdminAction(
      'UPDATE_QUESTION',
      `Updated question #${rawBody.id} (${isPublished ? 'Published' : 'Draft'})`,
      session.id,
      session.email
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

    const existing = await queryOne('SELECT statement FROM qbank_questions WHERE id = ?', [id]);

    await execute('DELETE FROM qbank_questions WHERE id = ?', [id]);

    await logAdminAction(
      'DELETE_QUESTION',
      `Deleted question #${id}${existing ? `: "${existing.statement.slice(0, 40)}..."` : ''}`,
      session.id,
      session.email
    );

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
