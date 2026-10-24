import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { queryOne, execute, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Please log in to generate a remediation deck.' }, { status: 401 });
    }

    // 1. Find all distinct question IDs missed by this user
    const missedAttempts = await query(
      `SELECT DISTINCT question_id 
       FROM student_qbank_attempts 
       WHERE user_id = ? AND is_correct = 0
       UNION
       SELECT DISTINCT question_id 
       FROM attempts 
       WHERE user_id = ? AND is_correct = 0`,
      [session.id, session.id]
    );

    const missedQIds: number[] = missedAttempts.map((r: any) => Number(r.question_id)).filter(Boolean);

    if (missedQIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No missed questions found yet. Complete a practice session to generate targeted remediation cards!',
      });
    }

    // 2. Find or create the Remediation Deck
    let deck = await queryOne(
      `SELECT id FROM flashcard_decks WHERE user_id = ? AND title LIKE '%Weakness & Remediation%' LIMIT 1`,
      [session.id]
    );

    if (!deck) {
      const res = await execute(
        `INSERT INTO flashcard_decks (user_id, title, description, category, is_public, card_count, created_at)
         VALUES (?, 'Weakness & Remediation Deck', 'Targeted flashcards auto-generated from your incorrectly answered NCLEX items.', 'Remediation', 0, 0, CURRENT_TIMESTAMP)`,
        [session.id]
      );
      deck = { id: res.lastInsertId };
    }

    // 3. Find which questions are already in user's flashcards
    const existingCards = await query(
      `SELECT question_id FROM flashcards WHERE user_id = ? AND question_id IS NOT NULL`,
      [session.id]
    );
    const existingQIdSet = new Set(existingCards.map((c: any) => Number(c.question_id)));

    // 4. Create cards for remaining missed questions
    let createdCount = 0;
    for (const qid of missedQIds) {
      if (existingQIdSet.has(qid)) continue;

      const q = await queryOne('SELECT * FROM qbank_questions WHERE id = ?', [qid]);
      if (!q) continue;

      const front = `${q.body_system || q.organ_system || 'Clinical Vignette'}: ${q.stem || q.statement}`;
      const back = q.correct_rationale || 'Review rationale and options.';
      const pearl = q.clinical_pearl || '';

      await execute(
        `INSERT INTO flashcards (
          deck_id, user_id, question_id, front, back, clinical_pearl,
          box_level, interval_days, ease_factor, repetition_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 2.50, 0, CURRENT_TIMESTAMP)`,
        [deck.id, session.id, qid, front, back, pearl]
      );
      createdCount++;
    }

    // 5. Update deck card count
    await execute(
      `UPDATE flashcard_decks 
       SET card_count = (SELECT COUNT(*) FROM flashcards WHERE deck_id = ?),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [deck.id, deck.id]
    );

    return NextResponse.json({
      success: true,
      createdCount,
      deckId: deck.id,
      message: createdCount > 0 
        ? `Successfully generated ${createdCount} new spaced repetition flashcards from your missed items!`
        : 'All of your missed items are already in your flashcard study deck.',
    });
  } catch (error: any) {
    console.error('Generate remediation deck error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
