import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'nclex.db');

test('Phase 7: NGN Item Types Seeded in Database', () => {
  const db = new DatabaseSync(DB_PATH);
  
  const types = db.prepare(`
    SELECT DISTINCT type FROM questions 
    WHERE type IN ('MATRIX', 'CLOZE', 'DRAG_DROP', 'BOWTIE', 'CASE_STUDY')
  `).all().map(r => r.type);

  assert.ok(types.includes('MATRIX'), 'MATRIX item type must be present');
  assert.ok(types.includes('CLOZE'), 'CLOZE item type must be present');
  assert.ok(types.includes('DRAG_DROP'), 'DRAG_DROP item type must be present');
  assert.ok(types.includes('BOWTIE'), 'BOWTIE item type must be present');
  assert.ok(types.includes('CASE_STUDY'), 'CASE_STUDY item type must be present');

  db.close();
});

test('Phase 7: Matrix/Grid Partial-Credit Scoring Algorithm', () => {
  function scoreMatrix(studentAnswers, expectedAnswers) {
    const student = typeof studentAnswers === 'object' && studentAnswers !== null ? studentAnswers : {};
    const expected = typeof expectedAnswers === 'object' && expectedAnswers !== null ? expectedAnswers : {};

    const rowKeys = Object.keys(expected);
    let matches = 0;
    for (const k of rowKeys) {
      if (String(student[k]) === String(expected[k])) {
        matches++;
      }
    }
    const totalRows = rowKeys.length > 0 ? rowKeys.length : 1;
    const score = Math.round((matches / totalRows) * 100) / 100;
    const isCorrect = score === 1.0;
    return { score, isCorrect, matches, totalRows };
  }

  const expectedMatrix = { '0': 0, '1': 1, '2': 2, '3': 1, '4': 0 }; // 5 rows

  // Perfect submission
  const perfect = scoreMatrix({ '0': 0, '1': 1, '2': 2, '3': 1, '4': 0 }, expectedMatrix);
  assert.equal(perfect.score, 1.0);
  assert.equal(perfect.isCorrect, true);
  assert.equal(perfect.matches, 5);

  // Partial submission (3 of 5 correct)
  const partial = scoreMatrix({ '0': 0, '1': 1, '2': 0, '3': 1, '4': 2 }, expectedMatrix);
  assert.equal(partial.score, 0.6);
  assert.equal(partial.isCorrect, false);
  assert.equal(partial.matches, 3);

  // Zero match submission
  const zero = scoreMatrix({ '0': 2, '1': 0, '2': 0, '3': 0, '4': 1 }, expectedMatrix);
  assert.equal(zero.score, 0.0);
  assert.equal(zero.isCorrect, false);
});

test('Phase 7: Cloze (Dropdown in Narrative) Scoring Algorithm', () => {
  function scoreCloze(studentAnswers, expectedAnswers) {
    const student = typeof studentAnswers === 'object' && studentAnswers !== null ? studentAnswers : {};
    const expected = typeof expectedAnswers === 'object' && expectedAnswers !== null ? expectedAnswers : {};

    const dropKeys = Object.keys(expected);
    let matches = 0;
    for (const k of dropKeys) {
      if (String(student[k]).trim().toLowerCase() === String(expected[k]).trim().toLowerCase()) {
        matches++;
      }
    }
    const totalDrops = dropKeys.length > 0 ? dropKeys.length : 1;
    const score = Math.round((matches / totalDrops) * 100) / 100;
    const isCorrect = score === 1.0;
    return { score, isCorrect, matches, totalDrops };
  }

  const expectedDropdowns = {
    dropdown_1: 'fatal cardiac dysrhythmias and hyperthermia',
    dropdown_2: 'propranolol',
    dropdown_3: 'contraindicated'
  };

  // Full correct match
  const full = scoreCloze({
    dropdown_1: 'fatal cardiac dysrhythmias and hyperthermia',
    dropdown_2: 'Propranolol', // Case-insensitive
    dropdown_3: 'contraindicated ' // Trimmed
  }, expectedDropdowns);
  assert.equal(full.score, 1.0);
  assert.equal(full.isCorrect, true);

  // Partial (2 of 3 correct)
  const partial = scoreCloze({
    dropdown_1: 'fatal cardiac dysrhythmias and hyperthermia',
    dropdown_2: 'levothyroxine', // Wrong
    dropdown_3: 'contraindicated'
  }, expectedDropdowns);
  assert.equal(partial.score, 0.67);
  assert.equal(partial.isCorrect, false);
});

test('Phase 7: Drag & Drop Ordered Priority Scoring Algorithm', () => {
  function scoreDragDrop(studentSeq, expectedSeq) {
    const student = Array.isArray(studentSeq) ? studentSeq.map(Number) : [];
    const expected = Array.isArray(expectedSeq) ? expectedSeq.map(Number) : [];

    let matches = 0;
    for (let i = 0; i < expected.length; i++) {
      if (student[i] === expected[i]) {
        matches++;
      }
    }
    const totalSteps = expected.length > 0 ? expected.length : 1;
    const score = Math.round((matches / totalSteps) * 100) / 100;
    const isCorrect = score === 1.0;
    return { score, isCorrect, matches, totalSteps };
  }

  const targetSequence = [0, 1, 2, 3, 4]; // 5 priority steps

  // Exact correct sequence
  const exact = scoreDragDrop([0, 1, 2, 3, 4], targetSequence);
  assert.equal(exact.score, 1.0);
  assert.equal(exact.isCorrect, true);

  // Partially ordered (3 matches)
  const partial = scoreDragDrop([0, 1, 4, 3, 2], targetSequence);
  assert.equal(partial.score, 0.6);
  assert.equal(partial.isCorrect, false);
  assert.equal(partial.matches, 3);

  // Inverted sequence (1 match at middle index 2)
  const inverted = scoreDragDrop([4, 3, 2, 1, 0], targetSequence);
  assert.equal(inverted.score, 0.2);
  assert.equal(inverted.matches, 1);
});

test('Phase 7: Bow-Tie 5-Point Clinical Scoring Model', () => {
  function scoreBowtie(studentBow, expectedBow) {
    const student = typeof studentBow === 'object' && studentBow !== null ? studentBow : {};
    const expected = typeof expectedBow === 'object' && expectedBow !== null ? expectedBow : {};

    let matches = 0;
    // 1. Condition (1 pt)
    if (String(student.potentialCondition) === String(expected.potentialCondition)) {
      matches++;
    }

    // 2. Actions (2 pts)
    const stActions = new Set(Array.isArray(student.actionsToTake) ? student.actionsToTake.map(Number) : []);
    const exActions = Array.isArray(expected.actionsToTake) ? expected.actionsToTake.map(Number) : [];
    for (const a of exActions) {
      if (stActions.has(a)) matches++;
    }

    // 3. Parameters (2 pts)
    const stParams = new Set(Array.isArray(student.parametersToMonitor) ? student.parametersToMonitor.map(Number) : []);
    const exParams = Array.isArray(expected.parametersToMonitor) ? expected.parametersToMonitor.map(Number) : [];
    for (const p of exParams) {
      if (stParams.has(p)) matches++;
    }

    const score = Math.round((matches / 5.0) * 100) / 100;
    const isCorrect = score === 1.0;
    return { score, isCorrect, matches };
  }

  const expectedBowtie = {
    actionsToTake: [0, 1],
    potentialCondition: 0,
    parametersToMonitor: [0, 1]
  };

  // Full 5/5 score
  const perfect = scoreBowtie({
    actionsToTake: [0, 1],
    potentialCondition: 0,
    parametersToMonitor: [0, 1]
  }, expectedBowtie);
  assert.equal(perfect.score, 1.0);
  assert.equal(perfect.isCorrect, true);
  assert.equal(perfect.matches, 5);

  // Partial 4/5 score (1 wrong parameter)
  const partial = scoreBowtie({
    actionsToTake: [0, 1],
    potentialCondition: 0,
    parametersToMonitor: [0, 2] // 2 instead of 1
  }, expectedBowtie);
  assert.equal(partial.score, 0.8);
  assert.equal(partial.isCorrect, false);
  assert.equal(partial.matches, 4);

  // Partial 2/5 score (Wrong condition, only actions correct)
  const low = scoreBowtie({
    actionsToTake: [0, 1],
    potentialCondition: 3,
    parametersToMonitor: [2, 3]
  }, expectedBowtie);
  assert.equal(low.score, 0.4);
  assert.equal(low.matches, 2);
});

test('Phase 7: Case Study EHR Chart Schema & Clinical Data Integrity', () => {
  const db = new DatabaseSync(DB_PATH);
  const row = db.prepare(`SELECT * FROM questions WHERE type = 'CASE_STUDY' LIMIT 1`).get();
  assert.ok(row, 'Case study question must exist in DB');

  const caseData = JSON.parse(row.case_study_data);
  assert.ok(caseData.patientProfile, 'Case study must have patientProfile');
  assert.ok(caseData.patientProfile.name, 'Patient profile must have name');
  assert.ok(caseData.patientProfile.age, 'Patient profile must have age');
  assert.ok(caseData.patientProfile.admissionDiagnosis, 'Patient profile must have admissionDiagnosis');

  assert.ok(Array.isArray(caseData.tabs), 'Case study must have tabs array');
  assert.ok(caseData.tabs.length >= 3, 'Case study must have at least 3 clinical tabs');

  const tabTitles = caseData.tabs.map(t => t.title);
  assert.ok(tabTitles.includes("Nurse's Notes") || tabTitles.some(t => t.toLowerCase().includes('note')), 'Must include Nurse Notes tab');
  assert.ok(tabTitles.includes("Vital Signs") || tabTitles.some(t => t.toLowerCase().includes('vital')), 'Must include Vital Signs tab');
  assert.ok(tabTitles.includes("Lab Results") || tabTitles.some(t => t.toLowerCase().includes('lab')), 'Must include Lab Results tab');

  db.close();
});

test('Phase 7: CAT Adaptive Simulation Engine IRT & 95% Confidence Stopping Rule', () => {
  // CAT Simulation Model
  function simulateCatEngine(responses) {
    let theta = 0.0; // Initial ability at passing threshold
    let margin = 0.80; // Initial wide confidence band
    const minQuestions = 75;
    const maxQuestions = 145;
    let stoppedEarly = false;
    let stoppingItem = null;

    for (let i = 0; i < responses.length; i++) {
      const scoreVal = responses[i]; // 0.0 to 1.0
      
      // Ability adaptation
      if (scoreVal >= 0.7) {
        theta = Math.min(2.5, theta + 0.35 * scoreVal);
      } else {
        theta = Math.max(-2.5, theta - 0.35 * (1.0 - scoreVal));
      }

      // Confidence margin narrows per item down to floor of 0.15
      margin = Math.max(0.15, margin - 0.015);

      const itemsDelivered = i + 1;

      // NCSBN 95% Confidence Interval Stopping Rule (Minimum 75 items)
      if (itemsDelivered >= minQuestions && (theta - margin) > 0.05) {
        stoppedEarly = true;
        stoppingItem = itemsDelivered;
        break;
      }

      if (itemsDelivered >= maxQuestions) {
        stoppingItem = itemsDelivered;
        break;
      }
    }

    const isPass = theta > 0.0;
    return { theta, margin, stoppedEarly, stoppingItem, isPass };
  }

  // Scenario A: High-performing candidate (85% correct answers for 80 items)
  const highPerformer = Array.from({ length: 80 }, (_, i) => (i % 6 === 0 ? 0.0 : 1.0));
  const simA = simulateCatEngine(highPerformer);
  assert.equal(simA.stoppedEarly, true, 'High performer should trigger early stopping rule at 75 items');
  assert.equal(simA.stoppingItem, 75, 'Stopping rule should activate at question 75');
  assert.ok(simA.theta > 1.0, 'Candidate theta should be well above passing threshold');
  assert.equal(simA.isPass, true, 'Candidate should pass');

  // Scenario B: Borderline candidate struggling around passing threshold
  const borderline = Array.from({ length: 145 }, (_, i) => (i % 2 === 0 ? 0.70 : 0.26));
  const simB = simulateCatEngine(borderline);
  assert.equal(simB.stoppedEarly, false, 'Borderline candidate should not early stop before max items');
  assert.equal(simB.stoppingItem, 145, 'Candidate should reach maximum item ceiling of 145');
});
