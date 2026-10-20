import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const rows = await query('SELECT * FROM demo_mcqs ORDER BY sort_order ASC, id ASC');
    const mcqs = rows.map(r => {
      let options = [];
      let distractors = [];
      try { options = JSON.parse(r.options_json || '[]'); } catch (_) { options = []; }
      try { distractors = JSON.parse(r.distractors_json || '[]'); } catch (_) { distractors = []; }

      return {
        id: r.id,
        category: r.category,
        difficulty: r.difficulty,
        clientNeed: r.client_need,
        statement: r.statement,
        options,
        correctIndex: r.correct_index,
        correctRationale: r.correct_rationale,
        distractors,
        clinicalPearl: r.clinical_pearl,
        sortOrder: r.sort_order,
      };
    });

    return NextResponse.json({ success: true, mcqs });
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
      difficulty,
      clientNeed,
      statement,
      options,
      correctIndex,
      correctRationale,
      distractors,
      clinicalPearl,
      sortOrder,
    } = body;

    if (!statement || !options || options.length === 0) {
      return NextResponse.json({ success: false, message: 'Statement and options are required' }, { status: 400 });
    }

    const result = await execute(
      `INSERT INTO demo_mcqs 
       (category, difficulty, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        category || 'NCLEX-RN • Pharmacology & Client Needs',
        difficulty || 'High Yield',
        clientNeed || '',
        statement,
        JSON.stringify(options),
        Number(correctIndex || 0),
        correctRationale || '',
        JSON.stringify(distractors || []),
        clinicalPearl || '',
        Number(sortOrder || 0),
      ]
    );

    return NextResponse.json({ success: true, message: 'Demo MCQ created', id: result.lastInsertId });
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
      difficulty,
      clientNeed,
      statement,
      options,
      correctIndex,
      correctRationale,
      distractors,
      clinicalPearl,
      sortOrder,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Demo MCQ ID required' }, { status: 400 });
    }

    await execute(
      `UPDATE demo_mcqs SET
         category = ?,
         difficulty = ?,
         client_need = ?,
         statement = ?,
         options_json = ?,
         correct_index = ?,
         correct_rationale = ?,
         distractors_json = ?,
         clinical_pearl = ?,
         sort_order = ?
       WHERE id = ?`,
      [
        category || 'NCLEX-RN • Pharmacology & Client Needs',
        difficulty || 'High Yield',
        clientNeed || '',
        statement,
        JSON.stringify(options),
        Number(correctIndex || 0),
        correctRationale || '',
        JSON.stringify(distractors || []),
        clinicalPearl || '',
        Number(sortOrder || 0),
        id,
      ]
    );

    return NextResponse.json({ success: true, message: 'Demo MCQ updated' });
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
      return NextResponse.json({ success: false, message: 'Demo MCQ ID required' }, { status: 400 });
    }

    await execute('DELETE FROM demo_mcqs WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Demo MCQ deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
