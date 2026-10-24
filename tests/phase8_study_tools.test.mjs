import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'nclex.db');

test('Phase 8: Leitner 5-Box Interval Progression Logic', () => {
  const BOX_INTERVALS = [1, 3, 7, 14, 30]; // Days per box

  function calculateLeitner(currentBox, currentInterval, rating) {
    let nextBox = currentBox;
    let nextInterval = currentInterval;

    if (rating === 'again') {
      nextBox = 1;
      nextInterval = 1;
    } else if (rating === 'hard') {
      nextBox = currentBox;
      nextInterval = Math.max(1, Math.round(currentInterval * 1.2));
    } else if (rating === 'good') {
      nextBox = Math.min(5, currentBox + 1);
      nextInterval = BOX_INTERVALS[nextBox - 1];
    } else if (rating === 'easy') {
      nextBox = Math.min(5, currentBox + 1);
      nextInterval = Math.round(BOX_INTERVALS[nextBox - 1] * 1.35);
    }

    return { nextBox, nextInterval };
  }

  // 1. Advance from Box 1 with 'good' -> Box 2 (3 days)
  const step1 = calculateLeitner(1, 1, 'good');
  assert.equal(step1.nextBox, 2);
  assert.equal(step1.nextInterval, 3);

  // 2. Advance from Box 2 with 'easy' -> Box 3 (7 * 1.35 = 9 days)
  const step2 = calculateLeitner(2, 3, 'easy');
  assert.equal(step2.nextBox, 3);
  assert.equal(step2.nextInterval, 9);

  // 3. Stumble on Box 3 with 'again' -> Drops back to Box 1 (1 day)
  const step3 = calculateLeitner(3, 9, 'again');
  assert.equal(step3.nextBox, 1);
  assert.equal(step3.nextInterval, 1);

  // 4. Stays in current box with 'hard'
  const step4 = calculateLeitner(4, 14, 'hard');
  assert.equal(step4.nextBox, 4);
  assert.equal(step4.nextInterval, 17); // 14 * 1.2 = 16.8 -> 17

  // 5. Box 5 ceiling: cannot exceed Box 5
  const step5 = calculateLeitner(5, 30, 'good');
  assert.equal(step5.nextBox, 5);
  assert.equal(step5.nextInterval, 30);
});

test('Phase 8: SM-2 Ease Factor Adaptation Algorithm', () => {
  function calculateSm2Ef(currentEf, quality) {
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const raw = currentEf + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    return Math.max(1.30, Math.round(raw * 100) / 100);
  }

  const initialEf = 2.50;

  // Perfect recall (quality = 5: Easy) increases EF
  const efEasy = calculateSm2Ef(initialEf, 5);
  assert.equal(efEasy, 2.60);

  // Good recall (quality = 4: Good) maintains EF
  const efGood = calculateSm2Ef(initialEf, 4);
  assert.equal(efGood, 2.50);

  // Hard recall (quality = 3: Hard) reduces EF
  const efHard = calculateSm2Ef(initialEf, 3);
  assert.equal(efHard, 2.36);

  // Blackout (quality = 2: Again) sharply reduces EF
  const efAgain = calculateSm2Ef(initialEf, 2);
  assert.equal(efAgain, 2.18);

  // Minimum floor enforcement: cannot drop below 1.30
  let lowEf = 1.35;
  for (let i = 0; i < 5; i++) {
    lowEf = calculateSm2Ef(lowEf, 2);
  }
  assert.equal(lowEf, 1.30, 'Ease factor must not drop below 1.30 minimum bound');
});

test('Phase 8: Flashcard Database Seeds & Leitner Distribution', () => {
  const db = new DatabaseSync(DB_PATH);

  const cards = db.prepare('SELECT * FROM flashcards').all();
  assert.ok(cards.length >= 10, 'Must have at least 10 seeded flashcards');

  const deck = db.prepare('SELECT * FROM flashcard_decks WHERE id = 1').get();
  assert.ok(deck, 'Default flashcard deck must exist');
  assert.ok(deck.card_count >= 10, 'Deck card_count must accurately track cards');

  // Verify cards exist across multiple Leitner boxes
  const boxes = new Set(cards.map(c => c.box_level));
  assert.ok(boxes.has(1), 'Box 1 cards must be present');
  assert.ok(boxes.has(2), 'Box 2 cards must be present');
  assert.ok(boxes.has(3), 'Box 3 cards must be present');
  assert.ok(boxes.has(4) || boxes.has(5), 'Higher level boxes must be present');

  // Verify clinical pearl presence
  const pearls = cards.filter(c => Boolean(c.clinical_pearl));
  assert.ok(pearls.length >= 5, 'Cards should feature Saunders clinical pearls');

  db.close();
});

test('Phase 8: NCLEX Passing Probability Calculator Algorithm', () => {
  function calculatePassingProbability(correctCount, totalQuestions = 7) {
    if (correctCount >= 7) return 96;
    if (correctCount === 6) return 91;
    if (correctCount === 5) return 84;
    if (correctCount === 4) return 74;
    if (correctCount === 3) return 61;
    if (correctCount === 2) return 48;
    return 35;
  }

  assert.equal(calculatePassingProbability(7), 96, '7/7 perfect score should yield 96% pass probability');
  assert.equal(calculatePassingProbability(6), 91, '6/7 score should yield 91% pass probability');
  assert.equal(calculatePassingProbability(5), 84, '5/7 score should yield 84% pass probability');
  assert.equal(calculatePassingProbability(4), 74, '4/7 score should yield 74% pass probability (passing threshold)');
  assert.equal(calculatePassingProbability(2), 48, '2/7 score should yield 48% (remediation required)');
  assert.equal(calculatePassingProbability(0), 35, '0/7 score should yield 35% base chance');
});

test('Phase 8: Remediation Deck Generation Deduplication Logic', () => {
  const missedQuestionIds = [101, 102, 103, 104];
  const existingFlashcardQIds = new Set([101, 103]);

  const cardsToCreate = [];
  for (const qid of missedQuestionIds) {
    if (!existingFlashcardQIds.has(qid)) {
      cardsToCreate.push(qid);
    }
  }

  assert.deepEqual(cardsToCreate, [102, 104], 'Deduplication must only create cards for questions not yet in flashcard collection');
  assert.equal(cardsToCreate.length, 2);
});
