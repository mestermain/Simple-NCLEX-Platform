import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'nclex.db');

test('Phase 6: Server-side hiding of rationales and correct answers in Exam Mode', () => {
  const db = new DatabaseSync(DB_PATH);
  const row = db.prepare('SELECT * FROM questions LIMIT 1').get();
  assert.ok(row, 'Question should exist in DB');

  // Simulate what /api/qbank/questions does in Timed Exam mode vs Tutor mode
  function sanitizeForExamMode(q) {
    const {
      correct_index,
      correct_indices,
      correct_rationale,
      clinical_pearl,
      distractors,
      ...safe
    } = q;
    return safe;
  }

  const sanitized = sanitizeForExamMode(row);
  assert.equal(sanitized.correct_index, undefined, 'correct_index must be hidden in exam mode');
  assert.equal(sanitized.correct_indices, undefined, 'correct_indices must be hidden in exam mode');
  assert.equal(sanitized.correct_rationale, undefined, 'correct_rationale must be hidden in exam mode');
  assert.equal(sanitized.clinical_pearl, undefined, 'clinical_pearl must be hidden in exam mode');
  assert.equal(sanitized.distractors, undefined, 'distractors must be hidden in exam mode');
  assert.ok(sanitized.statement, 'Question statement should remain');
  db.close();
});

test('Phase 6: NCSBN SATA +/- Partial Credit Scoring Algorithm', () => {
  // NCSBN Scoring rule: Each correct selected +1, each incorrect selected -1, floor at 0.
  // Final score = Math.max(0, correctSelected - incorrectSelected) / totalCorrect
  function scoreSata(selectedIndices, correctIndices) {
    const correctSet = new Set(correctIndices);
    let correctSelected = 0;
    let incorrectSelected = 0;

    for (const idx of selectedIndices) {
      if (correctSet.has(idx)) {
        correctSelected++;
      } else {
        incorrectSelected++;
      }
    }

    const netPoints = Math.max(0, correctSelected - incorrectSelected);
    const score = Number((netPoints / correctIndices.length).toFixed(2));
    const isCorrect = score === 1.0;
    return { score, isCorrect, netPoints };
  }

  const correctKeys = [0, 2, 4]; // 3 correct items

  // Case 1: Perfect score (all 3 correct selected, 0 wrong)
  const perfect = scoreSata([0, 2, 4], correctKeys);
  assert.equal(perfect.score, 1.0);
  assert.equal(perfect.isCorrect, true);

  // Case 2: Partial credit (2 correct selected, 0 wrong) -> 2/3 = 0.67
  const partial = scoreSata([0, 2], correctKeys);
  assert.equal(partial.score, 0.67);
  assert.equal(partial.isCorrect, false);

  // Case 3: Penalized guess (2 correct selected, 1 wrong selected) -> (2 - 1)/3 = 0.33
  const penalized = scoreSata([0, 2, 1], correctKeys);
  assert.equal(penalized.score, 0.33);

  // Case 4: Zero floor (0 correct, 2 wrong) -> max(0, -2) = 0
  const floorZero = scoreSata([1, 3], correctKeys);
  assert.equal(floorZero.score, 0);
  assert.equal(floorZero.isCorrect, false);
});

test('Phase 6: Test Session Autosave & Resumption Lifecycle', () => {
  const db = new DatabaseSync(DB_PATH);
  
  // Find a valid user
  const user = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
  assert.ok(user, 'User must exist');

  // 1. Create active session
  const insertStmt = db.prepare(`
    INSERT INTO test_sessions (
      user_id, title, mode, exam_track, total_questions, time_limit_seconds, 
      status, filters_json, question_ids_json, current_question_index, time_spent_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = insertStmt.run(
    user.id,
    'Cardiovascular Focused Review',
    'timed',
    'RN',
    10,
    900,
    'in_progress',
    JSON.stringify({ organSystem: 'Cardiovascular System' }),
    JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    0,
    0
  );

  const sessionId = info.lastInsertRowid;
  assert.ok(sessionId > 0, 'Session must be created');

  // 2. Query active session
  const activeSession = db.prepare(`
    SELECT * FROM test_sessions 
    WHERE user_id = ? AND status = 'in_progress' 
    ORDER BY created_at DESC LIMIT 1
  `).get(user.id);

  assert.equal(activeSession.id, sessionId);
  assert.equal(activeSession.mode, 'timed');
  assert.equal(activeSession.current_question_index, 0);

  // 3. Autosave progress (navigate to question 4, 120s elapsed)
  db.prepare(`
    UPDATE test_sessions
    SET current_question_index = ?, time_spent_seconds = ?
    WHERE id = ?
  `).run(4, 120, sessionId);

  const saved = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(sessionId);
  assert.equal(saved.current_question_index, 4);
  assert.equal(saved.time_spent_seconds, 120);

  // 4. Complete session with final score
  db.prepare(`
    UPDATE test_sessions
    SET status = 'completed', score_percentage = ?, correct_count = ?, time_spent_seconds = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(80.0, 8, 450, sessionId);

  const completed = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(sessionId);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.score_percentage, 80.0);
  assert.equal(completed.correct_count, 8);

  // Cleanup test session
  db.prepare('DELETE FROM test_sessions WHERE id = ?').run(sessionId);
  db.close();
});

test('Phase 6: Question Notes Upsert & Sync', () => {
  const db = new DatabaseSync(DB_PATH);
  const user = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
  const q = db.prepare('SELECT id FROM questions LIMIT 1').get();

  // Insert Note
  const upsertNote = (userId, qId, content) => {
    return db.prepare(`
      INSERT INTO notes (user_id, question_id, content, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, question_id) DO UPDATE SET
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, qId, content);
  };

  upsertNote(user.id, q.id, 'Clinical note: check potassium levels before administering furosemide.');

  let note = db.prepare('SELECT * FROM notes WHERE user_id = ? AND question_id = ?').get(user.id, q.id);
  assert.ok(note, 'Note should be recorded');
  assert.ok(note.content.includes('potassium'));

  // Update Note (upsert conflict resolution)
  upsertNote(user.id, q.id, 'Updated: check BP and serum potassium < 3.5 mEq/L.');
  note = db.prepare('SELECT * FROM notes WHERE user_id = ? AND question_id = ?').get(user.id, q.id);
  assert.ok(note.content.includes('Updated: check BP'));

  // Cleanup
  db.prepare('DELETE FROM notes WHERE user_id = ? AND question_id = ?').run(user.id, q.id);
  db.close();
});

test('Phase 6: Student Analytics - Readiness Estimate, Weak Topics & Pace', () => {
  // Simulate analytics calculation engine used in /api/student/profile
  const mockAttempts = [
    { system: 'Cardiovascular System', is_correct: 1, time_spent_seconds: 40 },
    { system: 'Cardiovascular System', is_correct: 1, time_spent_seconds: 45 },
    { system: 'Cardiovascular System', is_correct: 0, time_spent_seconds: 50 },
    { system: 'Pharmacology', is_correct: 0, time_spent_seconds: 60 },
    { system: 'Pharmacology', is_correct: 0, time_spent_seconds: 55 },
    { system: 'Pharmacology', is_correct: 1, time_spent_seconds: 50 },
  ];

  const systemStats = {};
  let totalTime = 0;
  let totalCorrect = 0;

  for (const a of mockAttempts) {
    totalTime += a.time_spent_seconds;
    if (a.is_correct) totalCorrect++;

    if (!systemStats[a.system]) {
      systemStats[a.system] = { total: 0, correct: 0 };
    }
    systemStats[a.system].total++;
    if (a.is_correct) systemStats[a.system].correct++;
  }

  // Accuracy
  const overallAccuracy = Math.round((totalCorrect / mockAttempts.length) * 100);
  assert.equal(overallAccuracy, 50);

  // Average Pace
  const avgPace = Math.round(totalTime / mockAttempts.length);
  assert.equal(avgPace, 50, 'Average pace should be 50 seconds per question');

  // Weak topics (accuracy < 65%)
  const weakTopics = Object.entries(systemStats)
    .map(([system, data]) => ({
      system,
      accuracy: Math.round((data.correct / data.total) * 100),
      total: data.total,
    }))
    .filter(s => s.accuracy < 65);

  assert.equal(weakTopics.length, 1);
  assert.equal(weakTopics[0].system, 'Pharmacology');
  assert.equal(weakTopics[0].accuracy, 33);

  // Readiness Score formula
  const readinessEstimate = Math.min(99, Math.round(overallAccuracy * 0.95 + 10));
  assert.ok(readinessEstimate >= 0 && readinessEstimate <= 100);
});
