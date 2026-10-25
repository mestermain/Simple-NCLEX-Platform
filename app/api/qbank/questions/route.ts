import { NextResponse } from 'next/server';
import { getAuthFromRequest, checkUserPlatformAccess } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'all';
    const organSystem = searchParams.get('organ_system') || searchParams.get('organSystem') || 'all';
    const bodySystemsParam = searchParams.get('body_systems') || ''; // Comma-separated
    const status = searchParams.get('status') || 'all'; // 'all' | 'unanswered' | 'incorrect' | 'correct' | 'flagged'
    const source = searchParams.get('source') || 'all'; // 'all' | 'unused' | 'incorrect' | 'flagged'
    const questionType = searchParams.get('question_type') || searchParams.get('type') || 'all';
    const difficulty = searchParams.get('difficulty') || 'all';
    const examTrack = searchParams.get('exam_track') || searchParams.get('track') || searchParams.get('exam_type') || 'all';
    const search = searchParams.get('search') || '';
    const limitParam = searchParams.get('limit');
    const mockTestParam = searchParams.get('mock_test') || searchParams.get('mockTest');
    const mode = searchParams.get('mode') || 'tutor'; // 'tutor' | 'timed' | 'exam'
    const revealRationales = searchParams.get('reveal') === 'true'; // Admin or review only

    const session = getAuthFromRequest(req);
    const access = await checkUserPlatformAccess(session ? session.id : null);
    const isDemoOnly = !access.hasAccess;

    // Retrieve user attempts & bookmarks for real-time status filtering
    let userCorrectIds: number[] = [];
    let userIncorrectIds: number[] = [];
    let userFlaggedIds: number[] = [];
    let userAttemptedIds: number[] = [];

    if (session) {
      try {
        const attempts = await query(
          `SELECT question_id, is_correct, attempted_at 
           FROM student_qbank_attempts 
           WHERE user_id = ? 
           ORDER BY attempted_at DESC`,
          [session.id]
        );

        const seen = new Set<number>();
        for (const a of attempts) {
          const qid = Number(a.question_id);
          if (!seen.has(qid)) {
            seen.add(qid);
            userAttemptedIds.push(qid);
            if (Number(a.is_correct) === 1) {
              userCorrectIds.push(qid);
            } else {
              userIncorrectIds.push(qid);
            }
          }
        }

        const flags = await query(
          `SELECT question_id FROM student_qbank_flags WHERE user_id = ?`,
          [session.id]
        );
        userFlaggedIds = flags.map((f: any) => Number(f.question_id));
      } catch (err) {
        console.warn('Error fetching student progress in QBank questions route:', err);
      }
    }

    let sql = 'SELECT * FROM qbank_questions WHERE (is_published = 1 OR is_published IS NULL)';
    const params: any[] = [];

    // In DEMO_MODE or with full access, allow full question bank
    const allowAllQuestions = access.hasAccess || process.env.DEMO_MODE === 'true';

    if (!allowAllQuestions) {
      sql += ' AND is_demo = 1';
    }

    // Exam track filter (RN, PN, DHA, HAAD, SNLE)
    if (examTrack && examTrack !== 'all') {
      const trackUpper = examTrack.toUpperCase();
      sql += ' AND (UPPER(COALESCE(exam_track, exam_type)) LIKE ? OR UPPER(COALESCE(exam_track, exam_type)) = ?)';
      params.push(`%${trackUpper}%`, trackUpper);
    }

    // Mock Test filter (1, 2, 3, 4, none, all)
    let parsedMockTest: number | null = null;
    if (mockTestParam && mockTestParam !== 'all') {
      if (mockTestParam === 'none') {
        sql += ' AND (mock_test IS NULL OR mock_test = 0)';
      } else {
        const mtNum = parseInt(mockTestParam, 10);
        if (!isNaN(mtNum) && mtNum >= 1 && mtNum <= 4) {
          parsedMockTest = mtNum;
          sql += ' AND mock_test = ?';
          params.push(mtNum);
        }
      }
    }

    // Difficulty filter
    if (difficulty && difficulty !== 'all') {
      sql += ' AND LOWER(difficulty) = LOWER(?)';
      params.push(difficulty);
    }

    // Body system filter (supports multiple comma-separated)
    if (bodySystemsParam) {
      const systems = bodySystemsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (systems.length > 0 && !systems.includes('all')) {
        const placeholders = systems.map(() => 'LOWER(COALESCE(body_system, organ_system)) = LOWER(?)').join(' OR ');
        sql += ` AND (${placeholders})`;
        params.push(...systems);
      }
    } else if (organSystem && organSystem !== 'all') {
      sql += ' AND (LOWER(COALESCE(body_system, organ_system)) = LOWER(?) OR LOWER(COALESCE(body_system, organ_system)) LIKE ?)';
      params.push(organSystem, `%${organSystem.toLowerCase()}%`);
    }

    // Question type filter (MCQ, SATA, MATRIX, CLOZE, DRAG_DROP, BOWTIE, CASE_STUDY)
    if (questionType && questionType !== 'all') {
      const qTypeUpper = questionType.toUpperCase();
      if (qTypeUpper === 'SINGLE' || qTypeUpper === 'MCQ') {
        sql += " AND (UPPER(COALESCE(type, question_type)) IN ('SINGLE', 'MCQ'))";
      } else if (qTypeUpper === 'MULTIPLE' || qTypeUpper === 'SATA') {
        sql += " AND (UPPER(COALESCE(type, question_type)) IN ('MULTIPLE', 'SATA'))";
      } else {
        sql += ' AND UPPER(COALESCE(type, question_type)) = ?';
        params.push(qTypeUpper);
      }
    }

    // Category / Client needs filter
    if (category && category !== 'all') {
      sql += ' AND (LOWER(category) LIKE ? OR LOWER(COALESCE(client_needs_category, client_need)) LIKE ?)';
      params.push(`%${category.toLowerCase()}%`, `%${category.toLowerCase()}%`);
    }

    // Search query filter
    if (search) {
      sql += ' AND (LOWER(COALESCE(stem, statement)) LIKE ? OR LOWER(category) LIKE ? OR LOWER(COALESCE(body_system, organ_system)) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const rows = await query(sql, params);

    // Filter by question source (all, unused, incorrect, flagged)
    const effectiveStatus = source !== 'all' ? source : status;

    let filteredRows = rows;
    if (session && effectiveStatus !== 'all') {
      if (effectiveStatus === 'unused' || effectiveStatus === 'unanswered') {
        filteredRows = filteredRows.filter((r: any) => !userAttemptedIds.includes(r.id));
      } else if (effectiveStatus === 'incorrect') {
        filteredRows = filteredRows.filter((r: any) => userIncorrectIds.includes(r.id));
      } else if (effectiveStatus === 'correct') {
        filteredRows = filteredRows.filter((r: any) => userCorrectIds.includes(r.id));
      } else if (effectiveStatus === 'flagged') {
        filteredRows = filteredRows.filter((r: any) => userFlaggedIds.includes(r.id));
      }
    }

    // Apply limit (Mock tests strictly capped at max 75 questions)
    const isMockTest = parsedMockTest !== null;
    const maxLimit = isMockTest ? 75 : undefined;
    if (limitParam) {
      const limitVal = parseInt(limitParam, 10);
      if (!isNaN(limitVal) && limitVal > 0) {
        const finalLimit = maxLimit ? Math.min(maxLimit, limitVal) : limitVal;
        filteredRows = filteredRows.slice(0, finalLimit);
      } else if (maxLimit) {
        filteredRows = filteredRows.slice(0, maxLimit);
      }
    } else if (maxLimit) {
      filteredRows = filteredRows.slice(0, maxLimit);
    }

    // Determine if answers & rationales should be hidden
    // Server-side enforcement: In exam mode or before submission, hide sensitive keys!
    const isExamOrUntimed = mode === 'exam' || mode === 'timed';
    const hideSolutions = isExamOrUntimed && !revealRationales;

    const questions = filteredRows.map((r: any) => {
      let options: any = [];
      let distractors: any = [];
      let correctIndices: any = [];
      let caseStudy: any = null;

      try { options = JSON.parse(r.options || r.options_json || '[]'); } catch (_) { options = []; }
      try { distractors = JSON.parse(r.rationale_per_option || r.distractors_json || '[]'); } catch (_) { distractors = []; }
      try { correctIndices = JSON.parse(r.correct_answers || r.correct_indices_json || '[]'); } catch (_) { correctIndices = []; }
      try { if (r.case_study_data) caseStudy = JSON.parse(r.case_study_data); } catch (_) { caseStudy = null; }

      const rawType = (r.type || r.question_type || 'MCQ').toUpperCase();
      let normalizedType = rawType;
      if (rawType === 'SINGLE') normalizedType = 'MCQ';
      if (rawType === 'MULTIPLE') normalizedType = 'SATA';

      const isMultiple = normalizedType === 'SATA' || (Array.isArray(correctIndices) && correctIndices.length > 1);

      return {
        id: r.id,
        mockTest: r.mock_test ?? null,
        type: normalizedType,
        questionType: isMultiple ? 'multiple' : 'single',
        stem: r.stem || r.statement,
        statement: r.stem || r.statement,
        options,
        bodySystem: r.body_system || r.organ_system || 'General Clinical',
        organSystem: r.body_system || r.organ_system || 'General Clinical',
        clientNeedsCategory: r.client_needs_category || r.client_need || r.category,
        category: r.category,
        difficulty: r.difficulty,
        examTrack: r.exam_track || r.exam_type || 'RN',
        examType: r.exam_track || r.exam_type || 'RN',
        clinicalPearl: hideSolutions ? undefined : r.clinical_pearl,
        caseStudyData: caseStudy,
        isDemo: r.is_demo === 1,
        sortOrder: r.sort_order,

        // Server-side enforcement: Only reveal correct answers and rationales if not in timed exam mode
        correctIndex: hideSolutions ? undefined : r.correct_index,
        correctIndices: hideSolutions ? undefined : (isMultiple ? correctIndices : [r.correct_index]),
        correctAnswers: hideSolutions ? undefined : correctIndices,
        correctRationale: hideSolutions ? undefined : r.correct_rationale,
        distractors: hideSolutions ? undefined : distractors,
        rationalePerOption: hideSolutions ? undefined : distractors,
      };
    });

    const organSystems = [
      'Cardiovascular System',
      'Respiratory System',
      'Neurological & Sensory System',
      'Gastrointestinal & Hepatic System',
      'Renal & Urinary System',
      'Endocrine System',
      'Musculoskeletal System',
      'Hematologic & Immune System',
      'Reproductive & Maternal-Newborn',
      'Mental Health & Psychosocial',
    ];

    return NextResponse.json({
      success: true,
      questions,
      totalCount: questions.length,
      organSystems,
      userProgress: {
        correctIds: userCorrectIds,
        incorrectIds: userIncorrectIds,
        flaggedIds: userFlaggedIds,
        attemptedIds: userAttemptedIds,
      },
      isDemoOnly,
      hasAccess: access.hasAccess,
      isAdmin: access.isAdmin,
      mode,
    });
  } catch (error: any) {
    console.error('QBank questions error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
