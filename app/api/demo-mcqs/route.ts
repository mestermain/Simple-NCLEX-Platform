import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM demo_mcqs ORDER BY sort_order ASC, id ASC');
    const mcqs = rows.map(r => {
      let options = [];
      let distractors = [];
      try { options = JSON.parse(r.options_json); } catch (_) { options = []; }
      try { distractors = JSON.parse(r.distractors_json); } catch (_) { distractors = []; }

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
        description: {
          correctRationale: r.correct_rationale,
          distractors,
          clinicalPearl: r.clinical_pearl,
        }
      };
    });

    return NextResponse.json({ success: true, mcqs });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
