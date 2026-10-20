import { NextResponse } from 'next/server';
import { getAuthFromRequest, checkUserPlatformAccess } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'all';
    const difficulty = searchParams.get('difficulty') || 'all';
    const examType = searchParams.get('exam_type') || 'all';
    const search = searchParams.get('search') || '';

    const session = getAuthFromRequest(req);
    const access = await checkUserPlatformAccess(session ? session.id : null);
    const isDemoOnly = !access.hasAccess;

    let sql = 'SELECT * FROM qbank_questions WHERE 1=1';
    const params: any[] = [];

    if (isDemoOnly) {
      sql += ' AND is_demo = 1';
    }

    if (difficulty && difficulty !== 'all') {
      sql += ' AND difficulty = ?';
      params.push(difficulty);
    }

    if (examType && examType !== 'all') {
      sql += ' AND exam_type = ?';
      params.push(examType);
    }

    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      if (catLower.includes('pharm')) {
        sql += ' AND LOWER(category) LIKE ?';
        params.push('%pharm%');
      } else if (catLower.includes('physiol') || catLower.includes('med-surg')) {
        sql += ' AND (LOWER(category) LIKE ? OR LOWER(category) LIKE ?)';
        params.push('%physiol%', '%med-surg%');
      } else if (catLower.includes('risk') || catLower.includes('cardiac')) {
        sql += ' AND (LOWER(category) LIKE ? OR LOWER(category) LIKE ?)';
        params.push('%risk%', '%cardiac%');
      } else if (catLower.includes('care') || catLower.includes('delegat') || catLower.includes('triag') || catLower.includes('manage')) {
        sql += ' AND (LOWER(category) LIKE ? OR LOWER(category) LIKE ?)';
        params.push('%care%', '%manage%');
      } else if (catLower.includes('matern') || catLower.includes('newborn')) {
        sql += ' AND (LOWER(category) LIKE ? OR LOWER(category) LIKE ?)';
        params.push('%matern%', '%newborn%');
      } else if (catLower.includes('pediatr')) {
        sql += ' AND LOWER(category) LIKE ?';
        params.push('%pediatr%');
      } else if (catLower.includes('safe') || catLower.includes('infect')) {
        sql += ' AND (LOWER(category) LIKE ? OR LOWER(category) LIKE ?)';
        params.push('%safe%', '%infect%');
      } else if (catLower.includes('psych') || catLower.includes('mental')) {
        sql += ' AND (LOWER(category) LIKE ? OR LOWER(category) LIKE ?)';
        params.push('%psych%', '%mental%');
      } else {
        sql += ' AND category = ?';
        params.push(category);
      }
    }

    if (search) {
      sql += ' AND (LOWER(statement) LIKE ? OR LOWER(category) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const rows = await query(sql, params);

    const questions = rows.map(r => {
      let options = [];
      let distractors = [];
      let correctIndices = [];

      try { options = JSON.parse(r.options_json || '[]'); } catch (_) { options = []; }
      try { distractors = JSON.parse(r.distractors_json || '[]'); } catch (_) { distractors = []; }
      try { correctIndices = JSON.parse(r.correct_indices_json || '[]'); } catch (_) { correctIndices = []; }

      const isMultiple = r.question_type === 'multiple' || (Array.isArray(correctIndices) && correctIndices.length > 1);

      return {
        id: r.id,
        category: r.category,
        difficulty: r.difficulty,
        examType: r.exam_type,
        clientNeed: r.client_need,
        statement: r.statement,
        options,
        questionType: isMultiple ? 'multiple' : 'single',
        correctIndex: r.correct_index,
        correctIndices: isMultiple ? correctIndices : [r.correct_index],
        correctRationale: r.correct_rationale,
        distractors,
        clinicalPearl: r.clinical_pearl,
        isDemo: r.is_demo === 1,
        sortOrder: r.sort_order,
      };
    });

    return NextResponse.json({
      success: true,
      questions,
      totalCount: questions.length,
      isDemoOnly,
      hasAccess: access.hasAccess,
      isAdmin: access.isAdmin,
      isCourseEnrolled: access.isCourseEnrolled,
      isSubscribed: access.isSubscriber,
    });
  } catch (error: any) {
    console.error('QBank questions error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
