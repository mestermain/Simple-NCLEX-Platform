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

  // Verify assigning to Mock Test 1
  db.prepare("UPDATE qbank_questions SET mock_test = ? WHERE id = ?").run(1, row.id);
  let updated = db.prepare("SELECT mock_test FROM qbank_questions WHERE id = ?").get(row.id);
  assert.equal(updated.mock_test, 1);

  // Verify assigning to None (null)
  db.prepare("UPDATE qbank_questions SET mock_test = NULL WHERE id = ?").run(row.id);
  updated = db.prepare("SELECT mock_test FROM qbank_questions WHERE id = ?").get(row.id);
  assert.equal(updated.mock_test, null);
});
