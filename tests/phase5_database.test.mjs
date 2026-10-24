import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'nclex.db');
const db = new DatabaseSync(dbPath);

test('Phase 5 Database Tables & Views Integrity', () => {
  const objects = db.prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view')").all();
  const names = new Set(objects.map(o => o.name));

  const requiredEntities = [
    'questions', // unified view/table
    'qbank_questions',
    'test_sessions',
    'attempts',
    'flags',
    'notes',
    'flashcard_decks',
    'flashcards',
    'courses',
    'enrollments',
    'payments',
    'testimonials',
    'faq_items',
  ];

  for (const entity of requiredEntities) {
    assert.ok(names.has(entity), `Expected entity "${entity}" to exist in database schema`);
  }
});

test('Question Schema Has All Phase 5 Mandatory Columns', () => {
  const columns = db.prepare("PRAGMA table_info(qbank_questions)").all();
  const colNames = new Set(columns.map(c => c.name));

  const requiredFields = [
    'type',
    'stem',
    'options',
    'correct_answers',
    'rationale_per_option',
    'body_system',
    'client_needs_category',
    'difficulty',
    'exam_track',
    'status',
    'reviewer',
    'clinical_pearl',
    'case_study_data',
    'created_at',
  ];

  for (const field of requiredFields) {
    assert.ok(colNames.has(field), `Expected column "${field}" in qbank_questions`);
  }
});

test('All 7 Next Gen NCLEX Question Types Are Supported & Seeded', () => {
  const types = ['MCQ', 'SATA', 'MATRIX', 'CLOZE', 'DRAG_DROP', 'BOWTIE', 'CASE_STUDY'];
  
  for (const type of types) {
    const question = db.prepare("SELECT * FROM qbank_questions WHERE type = ? LIMIT 1").get(type);
    assert.ok(question, `Expected at least one seeded question for Next Gen type: ${type}`);
    assert.ok(question.stem.length > 10, `Question ${type} must have a non-empty stem`);
    assert.ok(question.options.length > 2, `Question ${type} must have structured options`);
    assert.ok(question.correct_answers.length > 0, `Question ${type} must have correct answers`);
    assert.ok(question.rationale_per_option.length > 0, `Question ${type} must have rationales`);
    assert.ok(['RN', 'PN', 'SNLE', 'DHA', 'HAAD', 'Prometric'].includes(question.exam_track), `Valid exam track on ${type}`);
    assert.ok(['draft', 'published'].includes(question.status), `Valid status on ${type}`);
  }
});

test('Testimonials Table Contains verified Column For Demo Content Separation', () => {
  const columns = db.prepare("PRAGMA table_info(testimonials)").all();
  const colNames = new Set(columns.map(c => c.name));
  assert.ok(colNames.has('verified'), 'Testimonials must have verified column');

  const verifiedReview = db.prepare("SELECT * FROM testimonials WHERE verified = 1 LIMIT 1").get();
  assert.ok(verifiedReview, 'Must have verified review in database');
  assert.equal(verifiedReview.verified, 1);

  const demoReview = db.prepare("SELECT * FROM testimonials WHERE verified = 0 LIMIT 1").get();
  assert.ok(demoReview, 'Must support unverified/demo reviews');
  assert.equal(demoReview.verified, 0);
});

test('Test Sessions & Attempts Model With Partial Credit Scoring', () => {
  const session = db.prepare("SELECT * FROM test_sessions LIMIT 1").get();
  assert.ok(session, 'Must have at least one test session');
  assert.ok(['tutor', 'timed', 'cat'].includes(session.mode), 'Valid test session mode');
  assert.ok(['in_progress', 'completed', 'abandoned'].includes(session.status), 'Valid test session status');

  // Verify attempts table columns
  const attemptCols = db.prepare("PRAGMA table_info(attempts)").all();
  const attemptColNames = new Set(attemptCols.map(c => c.name));
  assert.ok(attemptColNames.has('score'), 'Attempts must support score column for partial credit');
  assert.ok(attemptColNames.has('session_id'), 'Attempts must link to session_id');
  assert.ok(attemptColNames.has('time_spent_seconds'), 'Attempts must track time_spent_seconds');
});

test('Flashcards Spaced Repetition (Leitner & SM-2) Schema', () => {
  const flashcardCols = db.prepare("PRAGMA table_info(flashcards)").all();
  const colNames = new Set(flashcardCols.map(c => c.name));

  assert.ok(colNames.has('box_level'), 'Flashcards must have box_level (Leitner 1-5)');
  assert.ok(colNames.has('interval_days'), 'Flashcards must have interval_days');
  assert.ok(colNames.has('ease_factor'), 'Flashcards must have ease_factor (SM-2)');
  assert.ok(colNames.has('repetition_count'), 'Flashcards must have repetition_count');

  const card = db.prepare("SELECT * FROM flashcards LIMIT 1").get();
  assert.ok(card, 'Must have at least one seeded flashcard');
  assert.ok(card.box_level >= 1 && card.box_level <= 5);
  assert.ok(card.ease_factor >= 1.30);
});

test('Payments Table Tracks Transaction Lifecycle', () => {
  const paymentCols = db.prepare("PRAGMA table_info(payments)").all();
  const colNames = new Set(paymentCols.map(c => c.name));

  assert.ok(colNames.has('payable_type'), 'Payments must record payable_type');
  assert.ok(colNames.has('payable_id'), 'Payments must record payable_id');
  assert.ok(colNames.has('amount'), 'Payments must record amount');
  assert.ok(colNames.has('status'), 'Payments must record status');
  assert.ok(colNames.has('payment_method'), 'Payments must record payment_method');
  assert.ok(colNames.has('receipt_url'), 'Payments must record receipt_url');
});
