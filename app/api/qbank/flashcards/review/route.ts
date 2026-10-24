import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

const BOX_INTERVALS = [1, 3, 7, 14, 30]; // Days per Leitner box 1-5

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    // Allow demo/guest review in frontend state, but if logged in, persist to database
    const userId = session ? session.id : null;

    const { cardId, rating } = await req.json();

    if (!cardId || !rating) {
      return NextResponse.json({ success: false, message: 'Card ID and rating required' }, { status: 400 });
    }

    const card = await queryOne('SELECT * FROM flashcards WHERE id = ?', [cardId]);
    if (!card) {
      return NextResponse.json({ success: false, message: 'Card not found' }, { status: 404 });
    }

    // Convert rating to SM-2 quality (0 to 5)
    // 'again' = 2, 'hard' = 3, 'good' = 4, 'easy' = 5
    let quality = 4;
    const ratingLower = String(rating).toLowerCase();
    if (ratingLower === 'again' || rating === 1) quality = 2;
    else if (ratingLower === 'hard' || rating === 2) quality = 3;
    else if (ratingLower === 'good' || rating === 3) quality = 4;
    else if (ratingLower === 'easy' || rating === 4) quality = 5;

    let currentBox = Number(card.box_level) || 1;
    let currentInterval = Number(card.interval_days) || 1;
    let currentEf = Number(card.ease_factor) || 2.50;
    const reps = Number(card.repetition_count) || 0;

    // SM-2 Ease Factor calculation
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const nextEf = Math.max(1.30, Math.round((currentEf + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))) * 100) / 100);

    let nextBox = currentBox;
    let nextInterval = currentInterval;

    if (quality === 2) {
      // Again: Drop back to Box 1
      nextBox = 1;
      nextInterval = 1;
    } else if (quality === 3) {
      // Hard: Keep in current box, slight interval stretch
      nextBox = currentBox;
      nextInterval = Math.max(1, Math.round(currentInterval * 1.2));
    } else if (quality === 4) {
      // Good: Advance to next box (max Box 5)
      nextBox = Math.min(5, currentBox + 1);
      nextInterval = BOX_INTERVALS[nextBox - 1];
    } else if (quality === 5) {
      // Easy: Advance to next box with bonus multiplier
      nextBox = Math.min(5, currentBox + 1);
      nextInterval = Math.round(BOX_INTERVALS[nextBox - 1] * 1.35);
    }

    if (userId) {
      await execute(
        `UPDATE flashcards 
         SET box_level = ?, 
             interval_days = ?, 
             ease_factor = ?, 
             repetition_count = repetition_count + 1,
             last_reviewed_at = CURRENT_TIMESTAMP,
             next_review_at = datetime('now', '+' || ? || ' days')
         WHERE id = ?`,
        [nextBox, nextInterval, nextEf, nextInterval, cardId]
      );
    }

    return NextResponse.json({
      success: true,
      cardId,
      boxLevel: nextBox,
      intervalDays: nextInterval,
      easeFactor: nextEf,
      nextReviewDays: nextInterval,
      message: `Card updated! Scheduled for review in ${nextInterval} ${nextInterval === 1 ? 'day' : 'days'} (Box ${nextBox}).`,
    });
  } catch (error: any) {
    console.error('Review card error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
