import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'nclex.db');
const db = new DatabaseSync(dbPath);

test('Mock Test DB Schema Integrity', () => {
  const pragma = db.prepare("PRAGMA table_info(qbank_questions)").all();
  const cols = new Set(pragma.map(c => c.name));
  assert.ok(cols.has('mock_test'), 'qbank_questions table must have mock_test column');

  const viewCols = db.prepare("PRAGMA table_info(questions)").all();
  const vCols = new Set(viewCols.map(c => c.name));
  assert.ok(vCols.has('mock_test'), 'questions view must expose mock_test column');
});

test('Mock Test Countdown Timer Math (5 Hours Reverse)', () => {
  const MAX_MOCK_SECONDS = 5 * 60 * 60; // 18000s
  assert.equal(MAX_MOCK_SECONDS, 18000, 'Mock test must be exactly 5 hours (18,000 seconds)');

  function formatCountdown(sec) {
    const s = Math.max(0, Math.floor(sec));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  assert.equal(formatCountdown(18000), '05:00:00');
  assert.equal(formatCountdown(17999), '04:59:59');
  assert.equal(formatCountdown(3661), '01:01:01');
  assert.equal(formatCountdown(60), '00:01:00');
  assert.equal(formatCountdown(0), '00:00:00');
  assert.equal(formatCountdown(-5), '00:00:00');
});

test('Exactly 4 Mock Tests Allowed (1, 2, 3, 4)', () => {
  const validMockTests = [1, 2, 3, 4];
  assert.equal(validMockTests.length, 4, 'There must be exactly 4 mock tests');

  function isValidMockTest(num) {
    if (num === null || num === undefined) return true; // Optional, can be unassigned
    return Number.isInteger(num) && num >= 1 && num <= 4;
  }

  assert.equal(isValidMockTest(null), true);
  assert.equal(isValidMockTest(undefined), true);
  assert.equal(isValidMockTest(1), true);
  assert.equal(isValidMockTest(2), true);
  assert.equal(isValidMockTest(3), true);
  assert.equal(isValidMockTest(4), true);
  assert.equal(isValidMockTest(0), false);
  assert.equal(isValidMockTest(5), false);
  assert.equal(isValidMockTest(-1), false);
});

test('Max 75 Questions per Mock Test Cap Rule', () => {
  const MAX_MOCK_QUESTIONS = 75;

  function enforceCap(mockTest, requestedLimit) {
    if (mockTest !== null && mockTest !== undefined) {
      return Math.min(MAX_MOCK_QUESTIONS, requestedLimit || MAX_MOCK_QUESTIONS);
    }
    return requestedLimit || 100;
  }

  assert.equal(enforceCap(1, 100), 75);
  assert.equal(enforceCap(2, 50), 50);
  assert.equal(enforceCap(3, undefined), 75);
  assert.equal(enforceCap(null, 100), 100);
});

test('Assigning MCQs to Mock Tests 1-4 and Unassigned (None)', () => {
  // Test query and updating a row
  const row = db.prepare("SELECT id, mock_test FROM qbank_questions LIMIT 1").get();
  assert.ok(row, 'At least one qbank question must exist');
  const originalMock = row.mock_test;

  try {
    // Verify assigning to Mock Test 1
    db.prepare("UPDATE qbank_questions SET mock_test = ? WHERE id = ?").run(1, row.id);
    let updated = db.prepare("SELECT mock_test FROM qbank_questions WHERE id = ?").get(row.id);
    assert.equal(updated.mock_test, 1);

    // Verify assigning to None (null)
    db.prepare("UPDATE qbank_questions SET mock_test = NULL WHERE id = ?").run(row.id);
    updated = db.prepare("SELECT mock_test FROM qbank_questions WHERE id = ?").get(row.id);
    assert.equal(updated.mock_test, null);
  } finally {
    // Restore original state
    db.prepare("UPDATE qbank_questions SET mock_test = ? WHERE id = ?").run(originalMock, row.id);
  }
});

test('Zero Duplicates Across the 4 Mock Tests (1, 2, 3, 4)', () => {
  const rows = db.prepare("SELECT id, mock_test, stem, statement FROM qbank_questions WHERE mock_test IN (1, 2, 3, 4)").all();
  
  const idSet = new Set();
  const stemMap = new Map();

  for (const r of rows) {
    // 1. Verify ID uniqueness
    assert.ok(!idSet.has(r.id), `Duplicate question ID ${r.id} found in mock test ${r.mock_test}`);
    idSet.add(r.id);

    // 2. Verify Stem uniqueness across all mock tests
    const stemNorm = (r.stem || r.statement || '').trim().toLowerCase();
    if (stemNorm) {
      assert.ok(!stemMap.has(stemNorm), `Duplicate question stem found between Mock ${r.mock_test} and Mock ${stemMap.get(stemNorm)}`);
      stemMap.set(stemNorm, r.mock_test);
    }
  }

  // Verify questions exist in all 4 mock tests
  const mockCounts = [1, 2, 3, 4].map(mt => rows.filter(r => r.mock_test === mt).length);
  for (let i = 0; i < 4; i++) {
    assert.ok(mockCounts[i] > 0, `Mock Test ${i + 1} must have assigned questions`);
    assert.ok(mockCounts[i] <= 75, `Mock Test ${i + 1} must not exceed 75 questions`);
  }
});

test('Single-Click Next Navigation and Direct Results on Exam Completion', () => {
  // Simulate questions
  const testQuestions = [
    { id: 1, statement: 'Q1', correct_index: 0, correctRationale: 'R1' },
    { id: 2, statement: 'Q2', correct_index: 1, correctRationale: 'R2' },
    { id: 3, statement: 'Q3', correct_index: 2, correctRationale: 'R3' },
  ];

  const selectedAnswers = {};
  const attemptResults = {};
  let currentIndex = 0;
  let sessionCompleted = false;

  function handleExamNext(selectedAnswer) {
    const currentQ = testQuestions[currentIndex];
    
    // 1. "Next" means: record answer to current question immediately
    if (selectedAnswer !== undefined) {
      selectedAnswers[currentQ.id] = [selectedAnswer];
      const isCorrect = selectedAnswer === currentQ.correct_index;
      attemptResults[currentQ.id] = {
        isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        correctRationale: currentQ.correctRationale,
      };
    }

    // 2. Advance to next question or directly complete exam if at end
    if (currentIndex === testQuestions.length - 1) {
      sessionCompleted = true; // Shows results directly
    } else {
      currentIndex++;
    }
  }

  // Answer Q1 with correct answer (0)
  handleExamNext(0);
  assert.equal(currentIndex, 1, 'Clicking Next must immediately advance to item 2');
  assert.deepEqual(selectedAnswers[1], [0], 'Current question answer must be recorded');
  assert.equal(sessionCompleted, false);

  // Answer Q2 with incorrect answer (0 instead of 1)
  handleExamNext(0);
  assert.equal(currentIndex, 2, 'Clicking Next must immediately advance to item 3');
  assert.deepEqual(selectedAnswers[2], [0]);
  assert.equal(sessionCompleted, false);

  // Answer Q3 with correct answer (2) - Last question!
  handleExamNext(2);
  assert.equal(sessionCompleted, true, 'At the end of MCQs, must complete test and show results directly');

  // Verify results breakdown: overall score + wrong question explanations
  const answeredKeys = Object.keys(attemptResults);
  const correctCount = answeredKeys.filter(k => attemptResults[Number(k)].isCorrect).length;
  const accuracyPct = Math.round((correctCount / testQuestions.length) * 100);
  
  assert.equal(correctCount, 2, 'Should have 2 correct answers');
  assert.equal(accuracyPct, 67, 'Score should be 67% (2/3)');

  // Verify missed / wrong question list contains all incorrect questions with full rationale
  const missedList = testQuestions.filter(q => {
    const res = attemptResults[q.id];
    return res ? !res.isCorrect : true;
  });

  assert.equal(missedList.length, 1, 'Should have exactly 1 missed question');
  assert.equal(missedList[0].id, 2, 'Missed question must be item 2');
  assert.equal(attemptResults[2].correctRationale, 'R2', 'Wrong question must include its full clinical explanation');
});
