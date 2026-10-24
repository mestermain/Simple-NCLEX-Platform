import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { queryOne, execute, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const userId = session ? session.id : null;
    const { searchParams } = new URL(req.url);

    const deckId = searchParams.get('deck_id');
    const boxLevel = searchParams.get('box_level');
    const dueOnly = searchParams.get('due_only') === 'true';

    let cardsSql = `
      SELECT f.*, d.title as deck_title, d.category as deck_category
      FROM flashcards f
      JOIN flashcard_decks d ON f.deck_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      cardsSql += ' AND (f.user_id = ? OR d.is_public = 1)';
      params.push(userId);
    } else {
      cardsSql += ' AND d.is_public = 1';
    }

    if (deckId && deckId !== 'all') {
      cardsSql += ' AND f.deck_id = ?';
      params.push(Number(deckId));
    }

    if (boxLevel && boxLevel !== 'all') {
      cardsSql += ' AND f.box_level = ?';
      params.push(Number(boxLevel));
    }

    if (dueOnly) {
      cardsSql += " AND (f.next_review_at IS NULL OR f.next_review_at <= datetime('now'))";
    }

    cardsSql += ' ORDER BY f.box_level ASC, COALESCE(f.next_review_at, f.created_at) ASC';

    const cards = await query(cardsSql, params);

    // Fetch Decks
    let decksSql = 'SELECT * FROM flashcard_decks WHERE 1=1';
    const deckParams: any[] = [];
    if (userId) {
      decksSql += ' AND (user_id = ? OR is_public = 1)';
      deckParams.push(userId);
    } else {
      decksSql += ' AND is_public = 1';
    }
    decksSql += ' ORDER BY id ASC';
    const decks = await query(decksSql, deckParams);

    // Compute Summary Stats
    let allUserCardsSql = 'SELECT box_level, next_review_at FROM flashcards WHERE ';
    const countParams: any[] = [];
    if (userId) {
      allUserCardsSql += 'user_id = ? OR deck_id IN (SELECT id FROM flashcard_decks WHERE is_public = 1)';
      countParams.push(userId);
    } else {
      allUserCardsSql += 'deck_id IN (SELECT id FROM flashcard_decks WHERE is_public = 1)';
    }

    const allCards = await query(allUserCardsSql, countParams);
    const boxDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let dueCount = 0;
    const nowIso = new Date().toISOString();

    for (const c of allCards) {
      const b = Number(c.box_level) || 1;
      boxDistribution[b] = (boxDistribution[b] || 0) + 1;
      if (!c.next_review_at || new Date(c.next_review_at).toISOString() <= nowIso) {
        dueCount++;
      }
    }

    return NextResponse.json({
      success: true,
      cards,
      decks,
      stats: {
        totalCards: allCards.length,
        dueToday: dueCount,
        masteredCount: boxDistribution[5] || 0,
        boxDistribution,
      },
    });
  } catch (error: any) {
    console.error('Fetch flashcards error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Please log in to save flashcards.' }, { status: 401 });
    }

    const { questionId, deckId, front, back, clinicalPearl } = await req.json();

    if (!questionId && !front) {
      return NextResponse.json({ success: false, message: 'Question ID or front text required' }, { status: 400 });
    }

    // Determine target deck
    let targetDeckId = deckId ? Number(deckId) : null;
    if (!targetDeckId) {
      let deck = await queryOne('SELECT id FROM flashcard_decks WHERE user_id = ? LIMIT 1', [session.id]);
      if (!deck) {
        const res = await execute(
          `INSERT INTO flashcard_decks (user_id, title, description, category, is_public, card_count, created_at)
           VALUES (?, 'My Missed Questions & NCLEX Pearls', 'High-yield pearls saved during Q-Bank practice tests.', 'General', 0, 0, CURRENT_TIMESTAMP)`,
          [session.id]
        );
        deck = { id: res.lastInsertId };
      }
      targetDeckId = deck.id;
    }

    // Default card content from question if not provided
    let cardFront = front;
    let cardBack = back;
    let cardPearl = clinicalPearl || '';

    if (!cardFront && questionId) {
      const q = await queryOne('SELECT * FROM qbank_questions WHERE id = ?', [questionId]);
      if (q) {
        cardFront = `${q.body_system || q.organ_system || 'Clinical Concept'}: ${q.stem || q.statement}`;
        cardBack = q.correct_rationale || 'Review rationale and options.';
        cardPearl = q.clinical_pearl || '';
      }
    }

    if (!cardFront || !cardBack) {
      return NextResponse.json({ success: false, message: 'Front and back text required for flashcard' }, { status: 400 });
    }

    // Insert card
    await execute(
      `INSERT INTO flashcards (
        deck_id, user_id, question_id, front, back, clinical_pearl,
        box_level, interval_days, ease_factor, repetition_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 2.50, 0, CURRENT_TIMESTAMP)`,
      [targetDeckId, session.id, questionId || null, cardFront, cardBack, cardPearl]
    );

    // Update deck count
    await execute(
      'UPDATE flashcard_decks SET card_count = card_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetDeckId]
    );

    return NextResponse.json({
      success: true,
      message: 'Flashcard added to your deck! Review scheduled in 24 hours.',
    });
  } catch (error: any) {
    console.error('Save flashcard error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get('id');
    if (!cardId) {
      return NextResponse.json({ success: false, message: 'Card ID required' }, { status: 400 });
    }

    const card = await queryOne('SELECT * FROM flashcards WHERE id = ? AND user_id = ?', [cardId, session.id]);
    if (!card) {
      return NextResponse.json({ success: false, message: 'Card not found or access denied' }, { status: 404 });
    }

    await execute('DELETE FROM flashcards WHERE id = ?', [cardId]);
    await execute('UPDATE flashcard_decks SET card_count = MAX(0, card_count - 1) WHERE id = ?', [card.deck_id]);

    return NextResponse.json({ success: true, message: 'Card deleted successfully' });
  } catch (error: any) {
    console.error('Delete flashcard error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
