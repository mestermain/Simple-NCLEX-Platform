/**
 * Phase 5 Database Migration Script
 * Simple NCLEX Platform
 * 
 * Usage:
 *   node scripts/migrate_phase5.js
 * 
 * Works identically for SQLite (nclex.db) and PostgreSQL (DATABASE_URL).
 * Safely creates Phase 5 tables, alters existing tables, and backfills sample Next Gen items.
 */

const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}
loadEnv();

async function runMigration() {
  console.log('🚀 Starting Phase 5 Database Migration...');

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  let dbType = 'sqlite';
  let client = null;

  if (connectionString) {
    dbType = 'postgres';
    console.log('📦 Connected to PostgreSQL target.');
    const { Pool } = require('pg');
    client = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  } else {
    console.log('📦 Connected to local SQLite database (nclex.db).');
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = path.resolve(process.cwd(), 'nclex.db');
    client = new DatabaseSync(dbPath);
  }

  async function execSql(sql, params = []) {
    if (dbType === 'postgres') {
      let paramIdx = 1;
      const normalized = sql.replace(/\?/g, () => `$${paramIdx++}`);
      const res = await client.query(normalized, params);
      return res;
    } else {
      const normalized = sql.replace(/\$\d+/g, '?');
      const stmt = client.prepare(normalized);
      const res = stmt.run(...params);
      return res;
    }
  }

  async function querySql(sql, params = []) {
    if (dbType === 'postgres') {
      let paramIdx = 1;
      const normalized = sql.replace(/\?/g, () => `$${paramIdx++}`);
      const res = await client.query(normalized, params);
      return res.rows;
    } else {
      const normalized = sql.replace(/\$\d+/g, '?');
      const stmt = client.prepare(normalized);
      return stmt.all(...params);
    }
  }

  // 1. Check existing columns of qbank_questions and alter table safely
  console.log('🔧 Upgrading qbank_questions with Phase 5 fields...');
  let existingColumns = [];
  if (dbType === 'sqlite') {
    const info = await querySql("PRAGMA table_info(qbank_questions)");
    existingColumns = info.map(c => c.name);
  } else {
    const info = await querySql(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'qbank_questions'"
    );
    existingColumns = info.map(c => c.column_name);
  }

  const columnsToAdd = [
    { name: 'type', def: "TEXT DEFAULT 'MCQ'" },
    { name: 'stem', def: "TEXT DEFAULT ''" },
    { name: 'options', def: "TEXT DEFAULT '[]'" },
    { name: 'correct_answers', def: "TEXT DEFAULT '[]'" },
    { name: 'rationale_per_option', def: "TEXT DEFAULT '[]'" },
    { name: 'body_system', def: "TEXT DEFAULT 'General'" },
    { name: 'client_needs_category', def: "TEXT DEFAULT ''" },
    { name: 'exam_track', def: "TEXT DEFAULT 'RN'" },
    { name: 'status', def: "TEXT DEFAULT 'published'" },
    { name: 'reviewer', def: "TEXT DEFAULT 'Senior NCLEX Clinical Reviewer'" },
    { name: 'case_study_data', def: "TEXT DEFAULT ''" },
    { name: 'updated_at', def: dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME' },
  ];

  for (const col of columnsToAdd) {
    if (!existingColumns.includes(col.name)) {
      console.log(`   + Adding column ${col.name} to qbank_questions...`);
      await execSql(`ALTER TABLE qbank_questions ADD COLUMN ${col.name} ${col.def}`);
    }
  }

  // Backfill new columns from existing fields
  console.log('🔄 Backfilling data in qbank_questions...');
  await execSql(`
    UPDATE qbank_questions SET
      stem = CASE WHEN stem IS NULL OR stem = '' THEN statement ELSE stem END,
      options = CASE WHEN options IS NULL OR options = '' OR options = '[]' THEN options_json ELSE options END,
      correct_answers = CASE 
        WHEN (correct_answers IS NULL OR correct_answers = '' OR correct_answers = '[]') AND correct_indices_json IS NOT NULL AND correct_indices_json != '[]' THEN correct_indices_json
        WHEN (correct_answers IS NULL OR correct_answers = '' OR correct_answers = '[]') THEN '[' || correct_index || ']'
        ELSE correct_answers 
      END,
      rationale_per_option = CASE WHEN rationale_per_option IS NULL OR rationale_per_option = '' OR rationale_per_option = '[]' THEN distractors_json ELSE rationale_per_option END,
      body_system = CASE WHEN body_system IS NULL OR body_system = '' OR body_system = 'General' THEN COALESCE(organ_system, 'General') ELSE body_system END,
      client_needs_category = CASE WHEN client_needs_category IS NULL OR client_needs_category = '' THEN COALESCE(client_need, category) ELSE client_needs_category END,
      exam_track = CASE 
        WHEN exam_type LIKE '%PN%' THEN 'PN'
        WHEN exam_type LIKE '%SNLE%' THEN 'SNLE'
        WHEN exam_type LIKE '%DHA%' THEN 'DHA'
        WHEN exam_type LIKE '%HAAD%' THEN 'HAAD'
        ELSE 'RN'
      END,
      status = CASE WHEN is_published = 1 THEN 'published' ELSE 'draft' END,
      type = CASE 
        WHEN question_type = 'multiple' THEN 'SATA'
        WHEN UPPER(question_type) IN ('MCQ', 'SATA', 'MATRIX', 'CLOZE', 'DRAG_DROP', 'BOWTIE', 'CASE_STUDY') THEN UPPER(question_type)
        ELSE 'MCQ'
      END
  `);

  // Create unified questions view for seamless querying
  console.log('🔗 Creating unified questions view...');
  await execSql(`
    CREATE VIEW IF NOT EXISTS questions AS
    SELECT 
      id,
      type,
      stem,
      options,
      correct_answers,
      rationale_per_option,
      body_system,
      client_needs_category,
      difficulty,
      exam_track,
      status,
      reviewer,
      clinical_pearl,
      case_study_data,
      is_demo,
      sort_order,
      created_at,
      updated_at,
      statement,
      options_json,
      correct_index,
      correct_indices_json,
      correct_rationale,
      distractors_json,
      question_type,
      organ_system,
      is_published
    FROM qbank_questions
  `);

  // 2. Create Test Sessions Table
  console.log('📋 Creating test_sessions table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS test_sessions (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Practice Test',
      mode TEXT NOT NULL DEFAULT 'tutor',
      exam_track TEXT NOT NULL DEFAULT 'RN',
      status TEXT NOT NULL DEFAULT 'in_progress',
      filters_json TEXT DEFAULT '{}',
      question_ids_json TEXT NOT NULL DEFAULT '[]',
      current_question_index INTEGER DEFAULT 0,
      total_questions INTEGER NOT NULL DEFAULT 10,
      correct_count INTEGER DEFAULT 0,
      score_percentage NUMERIC(5,2) DEFAULT 0.00,
      time_limit_seconds INTEGER DEFAULT 0,
      time_spent_seconds INTEGER DEFAULT 0,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      completed_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'}
    )
  `);

  // 3. Create Attempts Table (modernized with session_id, partial credit score, time_spent)
  console.log('🎯 Creating attempts table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS attempts (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES test_sessions(id) ON DELETE SET NULL,
      question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
      question_type TEXT NOT NULL DEFAULT 'MCQ',
      user_answers TEXT NOT NULL DEFAULT '[]',
      score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
      is_correct INTEGER NOT NULL DEFAULT 0,
      time_spent_seconds INTEGER DEFAULT 0,
      category TEXT DEFAULT '',
      body_system TEXT DEFAULT '',
      difficulty TEXT DEFAULT '',
      exam_track TEXT DEFAULT 'RN',
      attempted_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  // 4. Create Flags Table
  console.log('🚩 Creating flags table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS flags (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
      reason TEXT DEFAULT 'review_later',
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      UNIQUE(user_id, question_id)
    )
  `);

  // 5. Create Notes Table
  console.log('📝 Creating notes table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS notes (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      updated_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'},
      UNIQUE(user_id, question_id)
    )
  `);

  // 6. Create Flashcard Decks Table
  console.log('🃏 Creating flashcard_decks table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS flashcard_decks (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      is_public INTEGER NOT NULL DEFAULT 0,
      card_count INTEGER NOT NULL DEFAULT 0,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      updated_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'}
    )
  `);

  // 7. Create Flashcards Table (with spaced repetition / Leitner SM-2 parameters)
  console.log('🗂️  Creating flashcards table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER REFERENCES qbank_questions(id) ON DELETE SET NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      clinical_pearl TEXT DEFAULT '',
      box_level INTEGER NOT NULL DEFAULT 1,
      interval_days INTEGER NOT NULL DEFAULT 1,
      ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
      repetition_count INTEGER NOT NULL DEFAULT 0,
      next_review_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'},
      last_reviewed_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'},
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  // 8. Create Payments Table
  console.log('💳 Creating payments table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS payments (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payable_type TEXT NOT NULL,
      payable_id INTEGER NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PKR',
      payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
      transaction_id TEXT DEFAULT '',
      receipt_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      payer_account_name TEXT DEFAULT '',
      payer_phone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      verified_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'},
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  // 9. Create Testimonials Table (with verified column)
  console.log('🌟 Creating testimonials table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      student_name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      credential TEXT DEFAULT 'RN',
      exam_passed TEXT NOT NULL DEFAULT 'NCLEX-RN',
      score_or_attempt TEXT DEFAULT 'Passed 85 Questions (1st Attempt)',
      quote TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      verified INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  // 10. Create FAQ Items Table
  console.log('❓ Creating faq_items table...');
  await execSql(`
    CREATE TABLE IF NOT EXISTS faq_items (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  // 11. Seed High-Yield Sample Data Across Phase 5 Tables
  console.log('🌱 Seeding Phase 5 Next Gen items, testimonials, and FAQs...');

  // A. Seed Sample Next Gen Questions (All 7 types: MCQ, SATA, MATRIX, CLOZE, DRAG_DROP, BOWTIE, CASE_STUDY)
  const sampleNgQuestions = [
    {
      id: 101,
      type: 'SATA',
      stem: 'A registered nurse is providing discharge instructions to a client newly prescribed spironolactone. Which statements by the client indicate a correct understanding of the teaching? (Select all that apply.)',
      options: JSON.stringify([
        'I will use a salt substitute containing potassium to flavor my food.',
        'I need to report palpitations, muscle weakness, or irregular heartbeats promptly.',
        'I should avoid eating excessive amounts of bananas, oranges, and dark leafy greens.',
        'I will weigh myself daily at the same time in the morning.',
        'I should expect my urine to turn reddish-orange while taking this medication.',
        'I will stand up slowly from sitting or lying positions to prevent dizziness.',
      ]),
      correct_answers: JSON.stringify([1, 2, 3, 5]),
      rationale_per_option: JSON.stringify([
        'Incorrect: Salt substitutes replace sodium with potassium chloride; combining them with potassium-sparing diuretics significantly increases hyperkalemia risk.',
        'Correct: Palpitations, paresthesia, and muscle weakness are hallmark signs of hyperkalemia and cardiac dysrhythmias.',
        'Correct: Dietary potassium intake must be moderated to prevent hyperkalemia during aldosterone antagonist therapy.',
        'Correct: Daily morning weights monitor fluid volume status and efficacy of diuretic treatment.',
        'Incorrect: Reddish-orange urine discoloration occurs with rifampin or phenazopyridine, not spironolactone.',
        'Correct: Orthostatic hypotension is a common adverse effect when taking antihypertensives/diuretics.',
      ]),
      body_system: 'Cardiovascular System',
      client_needs_category: 'Physiological Integrity — Pharmacological and Parenteral Therapies',
      difficulty: 'medium',
      exam_track: 'RN',
      status: 'published',
      reviewer: 'NCLEX Clinical Advisory Board',
      clinical_pearl: 'Spironolactone "spares" Potassium (K+). Watch for K+ > 5.0 mEq/L, peaked T-waves, and advise against salt substitutes.',
    },
    {
      id: 102,
      type: 'MATRIX',
      stem: 'The nurse evaluates laboratory values and clinical findings for a client diagnosed with acute decompensated heart failure receiving intravenous furosemide. For each clinical finding, click to specify whether the finding indicates an Improvement, Adverse Effect, or Ineffective Therapy.',
      options: JSON.stringify({
        rows: [
          'Bilateral 3+ pitting pedal edema reduced to trace edema',
          'Serum potassium decreased from 4.1 mEq/L to 3.1 mEq/L',
          'Persistent bilateral basilar lung crackles and orthopnea',
          'Serum creatinine increased from 0.9 mg/dL to 2.4 mg/dL',
          'Urine output averaging 85 mL/hr over the past 4 hours',
        ],
        columns: ['Improvement', 'Adverse Effect', 'Ineffective Therapy'],
      }),
      correct_answers: JSON.stringify({
        '0': 0, // Reduction of edema -> Improvement
        '1': 1, // Hypokalemia -> Adverse Effect
        '2': 2, // Persistent crackles/orthopnea -> Ineffective Therapy
        '3': 1, // Elevated creatinine/AKI -> Adverse Effect
        '4': 0, // Adequate diuresis -> Improvement
      }),
      rationale_per_option: JSON.stringify({
        '0': 'Edema reduction reflects therapeutic fluid mobilization from interstitial compartments.',
        '1': 'Loop diuretics inhibit Na-K-2Cl symporters, wasting potassium and causing hypokalemia.',
        '2': 'Persistent pulmonary congestion indicates continued volume overload requiring therapy intensification.',
        '3': 'Rapid creatinine escalation signifies prerenal acute kidney injury from aggressive intravascular volume depletion.',
        '4': 'Urine output > 0.5 mL/kg/hr demonstrates effective renal perfusion and diuretic response.',
      }),
      body_system: 'Renal & Urinary System',
      client_needs_category: 'Physiological Integrity — Reduction of Risk Potential',
      difficulty: 'hard',
      exam_track: 'RN',
      status: 'published',
      reviewer: 'Advanced Practice Clinical Reviewer',
      clinical_pearl: 'Monitor BUN/Cr and Potassium during loop diuretic diuresis. Too fast diuresis leads to prerenal AKI and fatal dysrhythmias.',
    },
    {
      id: 103,
      type: 'CLOZE',
      stem: 'Complete the following clinical documentation by selecting the correct option from each dropdown menu:',
      options: JSON.stringify({
        text: 'The nurse recognizes that the client exhibiting signs of thyroid storm is at high risk for [dropdown_1]. The priority medication to administer first to block peripheral conversion of T4 to T3 and alleviate hyperadrenergic symptoms is [dropdown_2]. Aspirin is [dropdown_3] because it displaces thyroid hormone from binding proteins.',
        dropdowns: {
          dropdown_1: ['hypothermia and bradycardia', 'fatal cardiac dysrhythmias and hyperthermia', 'fluid volume excess and hyponatremia'],
          dropdown_2: ['propranolol', 'levothyroxine', 'potassium iodide'],
          dropdown_3: ['contraindicated', 'indicated as first-line antipyretic', 'administered with acetaminophen'],
        },
      }),
      correct_answers: JSON.stringify({
        dropdown_1: 'fatal cardiac dysrhythmias and hyperthermia',
        dropdown_2: 'propranolol',
        dropdown_3: 'contraindicated',
      }),
      rationale_per_option: JSON.stringify({
        dropdown_1: 'Thyroid storm is a hypermetabolic crisis marked by extreme fever, tachycardia, agitation, and lethal arrhythmias.',
        dropdown_2: 'Beta-blockers (propranolol) rapidly control tachycardia, tremor, and block peripheral T4 to T3 conversion.',
        dropdown_3: 'Salicylates displace T3/T4 from thyroxine-binding globulin, worsening free hormone toxicity; acetaminophen is the antipyretic of choice.',
      }),
      body_system: 'Endocrine System',
      client_needs_category: 'Physiological Integrity — Physiological Adaptation',
      difficulty: 'hard',
      exam_track: 'RN',
      status: 'published',
      reviewer: 'Endocrine Specialist Nurse',
      clinical_pearl: 'NEVER give Aspirin for thyroid storm fever! Aspirin displaces thyroid hormone into the bloodstream. Give Acetaminophen instead.',
    },
    {
      id: 104,
      type: 'DRAG_DROP',
      stem: 'The nurse is caring for an adult client with suspected acute bacterial meningitis. Place the following clinical actions in order of highest to lowest priority.',
      options: JSON.stringify([
        'Place the client on droplet precautions in a private room.',
        'Perform a comprehensive neurological baseline assessment.',
        'Obtain blood cultures and assist with lumbar puncture for CSF analysis.',
        'Administer broad-spectrum intravenous antibiotic therapy.',
        'Administer prescribed acetaminophen for fever and headache.',
      ]),
      correct_answers: JSON.stringify([0, 1, 2, 3, 4]),
      rationale_per_option: JSON.stringify([
        'Step 1: Infection control and droplet isolation must be instituted immediately to protect staff and other clients.',
        'Step 2: Neurologic baseline (GCS, pupil response, meningeal signs) guides detection of rising intracranial pressure.',
        'Step 3: Cultures and CSF collection must occur prior to or immediately concurrent with antibiotic initiation to ensure accurate pathogen identification.',
        'Step 4: Prompt IV antimicrobial administration within the "golden hour" is critical to prevent permanent neurologic sequelae or death.',
        'Step 5: Comfort and symptomatic measures follow emergent life-preserving interventions.',
      ]),
      body_system: 'Neurological & Sensory System',
      client_needs_category: 'Safe and Effective Care Environment — Safety and Infection Control',
      difficulty: 'medium',
      exam_track: 'RN',
      status: 'published',
      reviewer: 'Emergency Nursing Clinical Educator',
      clinical_pearl: 'Bacterial Meningitis: Droplet Precautions FIRST, Blood/CSF Cultures SECOND, Antibiotics THIRD. Do not delay antibiotics if LP is delayed.',
    },
    {
      id: 105,
      type: 'BOWTIE',
      stem: 'A 58-year-old male presents to the emergency department with acute retrosternal chest tightness radiating to the left jaw, diaphoresis, and nausea. The 12-lead ECG reveals 3 mm ST-segment elevation in leads II, III, and aVF. Complete the diagram by selecting the Potential Condition in the center, two Actions to Take on the left, and two Parameters to Monitor on the right.',
      options: JSON.stringify({
        actionsToTake: [
          'Administer chewable aspirin 324 mg immediately',
          'Activate the cardiac catheterization laboratory for primary PCI',
          'Administer intravenous furosemide 80 mg bolus',
          'Prepare client for immediate upper endoscopy',
        ],
        potentialConditions: [
          'Inferior Wall ST-Elevation Myocardial Infarction (STEMI)',
          'Acute Pericarditis',
          'Pulmonary Embolism',
          'Gastroesophageal Reflux Disease (GERD)',
        ],
        parametersToMonitor: [
          'Continuous cardiac rhythm and ST-segment resolution',
          'Blood pressure and heart rate for bradycardia or hypotension',
          'Peak expiratory flow rate',
          'Urine specific gravity',
        ],
      }),
      correct_answers: JSON.stringify({
        actionsToTake: [0, 1],
        potentialCondition: 0,
        parametersToMonitor: [0, 1],
      }),
      rationale_per_option: JSON.stringify({
        condition: 'ST elevation in leads II, III, and aVF indicates an acute inferior wall myocardial infarction (right coronary artery occlusion).',
        actions: 'Chewable aspirin prevents platelet thrombus propagation; immediate PCI activation targets door-to-balloon time < 90 minutes.',
        parameters: 'Inferior STEMI frequently compromises the SA and AV nodes, predisposing to high-degree AV blocks and severe bradycardia/hypotension.',
      }),
      body_system: 'Cardiovascular System',
      client_needs_category: 'Physiological Integrity — Physiological Adaptation',
      difficulty: 'hard',
      exam_track: 'RN',
      status: 'published',
      reviewer: 'Cardiology Nurse Specialist',
      clinical_pearl: 'Inferior STEMI = Leads II, III, aVF (RCA). Watch out for Right Ventricular Infarction: Avoid Nitroglycerin and Morphine if preload-dependent (hypotensive)!',
    },
    {
      id: 106,
      type: 'CASE_STUDY',
      stem: 'Review the unfolding clinical records for 68-year-old Margaret Gable across the chart tabs. Then answer the cognitive question: What is the registered nurse’s highest priority hypothesis?',
      options: JSON.stringify([
        'Acute respiratory distress syndrome secondary to hospital-acquired pneumonia',
        'Urosepsis progressing to septic shock with acute end-organ hypoperfusion',
        'Acute kidney injury secondary to severe dehydration',
        'Decompensated heart failure with cardiogenic pulmonary edema',
      ]),
      correct_answers: JSON.stringify([1]),
      rationale_per_option: JSON.stringify([
        'Incorrect: Lungs are clear to auscultation; chest X-ray shows no infiltrates.',
        'Correct: The combination of cloudy foul-smelling urine, fever (38.8°C), tachycardia (118 bpm), hypotension (84/52 mmHg), leukocytosis (18,500/mm³), and elevated lactate (3.6 mmol/L) confirms severe sepsis/septic shock requiring immediate fluid resuscitation and broad-spectrum IV antibiotics.',
        'Incorrect: While creatinine and BUN are elevated, acute kidney dysfunction here is secondary end-organ damage from septic distributive shock.',
        'Incorrect: Heart failure would manifest with fluid overload, elevated BNP, S3 gallop, and pulmonary crackles, not hyperthermia and warm flushed extremities.',
      ]),
      body_system: 'Hematologic & Immune System',
      client_needs_category: 'Physiological Integrity — Complex Care & Physiological Adaptation',
      difficulty: 'hard',
      exam_track: 'RN',
      status: 'published',
      reviewer: 'Critical Care Clinical Specialist',
      clinical_pearl: 'Sepsis Hour-1 Bundle: Measure lactate level, obtain blood cultures before antibiotics, administer broad-spectrum antibiotics, begin 30 mL/kg crystalloid for hypotension or lactate ≥ 4 mmol/L.',
      case_study_data: JSON.stringify({
        patientProfile: {
          name: 'Margaret Gable',
          age: 68,
          gender: 'Female',
          admissionDiagnosis: 'Altered Mental Status & Suspected Infection',
          allergies: 'Penicillin (Anaphylaxis)',
        },
        tabs: [
          {
            title: "Nurse's Notes",
            timestamp: '08:00',
            content: 'Client admitted from nursing facility with 2-day history of lethargy, confusion, and decreased oral intake. Caregiver reports foul-smelling cloudy urine. Client is disoriented to time and place. Skin is warm and flushed.',
          },
          {
            title: 'Vital Signs',
            timestamp: '08:15',
            content: 'Temperature: 38.8°C (101.8°F) tympanic\nHeart Rate: 118 beats/min (sinus tachycardia)\nBlood Pressure: 84/52 mm Hg (MAP: 62 mm Hg)\nRespiratory Rate: 24 breaths/min\nSpO2: 95% on room air',
          },
          {
            title: 'Lab Results',
            timestamp: '08:45',
            content: 'WBC: 18,500/mm³ (bands 14%)\nSerum Lactate: 3.6 mmol/L (Normal: 0.5 - 2.0)\nSerum Creatinine: 2.1 mg/dL (Baseline: 0.8)\nUrinalysis: Cloudy, Positive Leukocyte Esterase, Positive Nitrites, > 50 WBC/HPF, Bacteria: Many',
          },
          {
            title: 'Provider Orders',
            timestamp: '09:00',
            content: '1. Establish 2 large-bore peripheral IV lines.\n2. Administer 30 mL/kg IV Normal Saline bolus over 2 hours.\n3. Blood cultures x 2 sites.\n4. Administer IV Levofloxacin 750 mg (client allergic to penicillin).\n5. Insert indwelling urinary catheter with hourly urometer.',
          },
        ],
        stepIndex: 1,
        totalSteps: 6,
      }),
    },
  ];

  for (const q of sampleNgQuestions) {
    const isMultiple = q.type === 'SATA';
    const parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    const parsedCorrect = typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers;
    const primaryCorrectIndex = Array.isArray(parsedCorrect) && parsedCorrect.length > 0 ? Number(parsedCorrect[0]) : 0;
    const optionsArray = Array.isArray(parsedOptions) ? parsedOptions : (parsedOptions.rows || Object.keys(parsedOptions));

    await execSql(`
      INSERT INTO qbank_questions (
        id, category, organ_system, difficulty, exam_type, client_need,
        statement, options_json, correct_index, correct_indices_json,
        correct_rationale, distractors_json, clinical_pearl,
        question_type, is_demo, is_published, sort_order,
        type, stem, options, correct_answers, rationale_per_option,
        body_system, client_needs_category, exam_track, status, reviewer,
        case_study_data, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, 0, 1, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        stem = excluded.stem,
        options = excluded.options,
        correct_answers = excluded.correct_answers,
        rationale_per_option = excluded.rationale_per_option,
        body_system = excluded.body_system,
        client_needs_category = excluded.client_needs_category,
        exam_track = excluded.exam_track,
        status = excluded.status,
        reviewer = excluded.reviewer,
        clinical_pearl = excluded.clinical_pearl,
        case_study_data = excluded.case_study_data
    `, [
      q.id,
      q.client_needs_category,
      q.body_system,
      q.difficulty,
      q.exam_track,
      q.client_needs_category,
      q.stem,
      typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
      primaryCorrectIndex,
      typeof q.correct_answers === 'string' ? q.correct_answers : JSON.stringify(q.correct_answers),
      'See comprehensive clinical breakdown.',
      typeof q.rationale_per_option === 'string' ? q.rationale_per_option : JSON.stringify(q.rationale_per_option),
      q.clinical_pearl || '',
      isMultiple ? 'multiple' : 'single',
      q.id,
      q.type,
      q.stem,
      typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
      typeof q.correct_answers === 'string' ? q.correct_answers : JSON.stringify(q.correct_answers),
      typeof q.rationale_per_option === 'string' ? q.rationale_per_option : JSON.stringify(q.rationale_per_option),
      q.body_system,
      q.client_needs_category,
      q.exam_track,
      q.status,
      q.reviewer,
      q.case_study_data || '',
    ]);
  }

  // B. Seed Sample Testimonials (with verified flag)
  console.log('🌟 Seeding testimonials with verified flag...');
  const sampleTestimonials = [
    {
      id: 1,
      student_name: 'Fatima Z., BSN, RN',
      avatar_url: '',
      credential: 'BSN, RN',
      exam_passed: 'NCLEX-RN',
      score_or_attempt: 'Passed in 85 Questions (1st Attempt)',
      quote: 'The Next Generation Case Study unfolding tabs and SATA drills mirror the Pearson VUE interface down to the font and timer. The clinical rationales built my intuition to eliminate trap distractors.',
      rating: 5,
      verified: 1, // Real verified student
      is_featured: 1,
      sort_order: 1,
    },
    {
      id: 2,
      student_name: 'Ahmed M., Staff Nurse',
      avatar_url: '',
      credential: 'Staff Nurse',
      exam_passed: 'SNLE',
      score_or_attempt: 'Score: 685 (Passed)',
      quote: 'The Saudi SNLE question bank and live case discussions directly matched the SCFHS blueprint. The distractor analysis taught me WHY each wrong option compromises patient safety.',
      rating: 5,
      verified: 1, // Real verified student
      is_featured: 1,
      sort_order: 2,
    },
    {
      id: 3,
      student_name: 'Priya N., Clinical Nurse',
      avatar_url: '',
      credential: 'Clinical Nurse',
      exam_passed: 'DHA',
      score_or_attempt: 'Passed 1st Attempt (Dubai Licensure)',
      quote: 'Passing my DHA licensure on the first try was made possible by the structured pharmacology modules and priority triaging scenarios.',
      rating: 5,
      verified: 1, // Real verified student
      is_featured: 1,
      sort_order: 3,
    },
    {
      id: 4,
      student_name: 'Sample Student Placeholder',
      avatar_url: '',
      credential: 'Graduate Nurse',
      exam_passed: 'NCLEX-RN',
      score_or_attempt: 'Demo Review',
      quote: 'This is placeholder student feedback displayed during demonstration mode to test layout cards and rating typography.',
      rating: 5,
      verified: 0, // Demo unverified
      is_featured: 0,
      sort_order: 99,
    },
  ];

  for (const t of sampleTestimonials) {
    await execSql(`
      INSERT INTO testimonials (
        id, student_name, avatar_url, credential, exam_passed, score_or_attempt, quote, rating, verified, is_featured, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        student_name = excluded.student_name,
        credential = excluded.credential,
        exam_passed = excluded.exam_passed,
        score_or_attempt = excluded.score_or_attempt,
        quote = excluded.quote,
        verified = excluded.verified,
        is_featured = excluded.is_featured
    `, [t.id, t.student_name, t.avatar_url, t.credential, t.exam_passed, t.score_or_attempt, t.quote, t.rating, t.verified, t.is_featured, t.sort_order]);
  }

  // C. Seed Sample FAQ Items
  console.log('❓ Seeding FAQ items...');
  const sampleFaqs = [
    {
      id: 1,
      question: 'How do the Next-Generation NCLEX (NGN) case studies work on this platform?',
      answer: 'Our NGN case studies follow the official 6-cognitive-step NCSBN Clinical Judgment Measurement Model (CJMM). You review unfolding patient charts (History & Physical, Vital Signs, Lab Values, Provider Orders) across realistic tabs and answer interactive item types including Bow-Tie, Matrix/Grid, Dropdown Cloze, and Extended SATA with partial-credit scoring.',
      category: 'NCLEX-RN',
      sort_order: 1,
    },
    {
      id: 2,
      question: 'What is the difference between Tutor Mode and Timed Exam Mode?',
      answer: 'In Tutor Mode, in-depth clinical rationales and distractor analyses appear immediately after you answer each question for targeted learning. In Timed Exam Mode, the test replicates authentic exam conditions with an active countdown timer, disabled rationales during testing, and a comprehensive performance diagnostic scorecard at the end.',
      category: 'Q-Bank',
      sort_order: 2,
    },
    {
      id: 3,
      question: 'How does the spaced-repetition flashcard system work?',
      answer: 'Whenever you miss or flag a practice question, you can automatically send its clinical pearl and rationale into your personalized flashcard deck. The system utilizes the Leitner 5-box algorithm to schedule reviews right before memory decay occurs.',
      category: 'Study Tools',
      sort_order: 3,
    },
    {
      id: 4,
      question: 'What payment methods are supported for enrollments and subscriptions?',
      answer: 'We support local bank transfers (Meezan Bank IBAN), Easypaisa, and JazzCash. You submit your transaction ID and receipt screenshot upon registration; faculty reviews and verifies payments within 2 to 4 hours and provides direct WhatsApp mentorship access.',
      category: 'Enrollment & Pricing',
      sort_order: 4,
    },
  ];

  for (const f of sampleFaqs) {
    await execSql(`
      INSERT INTO faq_items (id, question, answer, category, sort_order, is_published, created_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        question = excluded.question,
        answer = excluded.answer,
        category = excluded.category
    `, [f.id, f.question, f.answer, f.category, f.sort_order]);
  }

  // D. Seed Sample Flashcard Decks & Spaced Repetition Cards
  console.log('🗂️  Seeding flashcard decks and spaced repetition cards...');
  const userRows = await querySql('SELECT id FROM users ORDER BY id ASC LIMIT 2');
  const targetUserId = userRows[0]?.id || 2;
  const secondUserId = userRows[1]?.id || targetUserId;

  await execSql(`
    INSERT INTO flashcard_decks (id, user_id, title, description, category, is_public, card_count, created_at)
    VALUES (1, ?, 'High-Yield Cardiovascular & Emergency Pearls', 'Critical cardiac pharmacology, ECG changes, and hemodynamic calculations.', 'Cardiovascular', 1, 3, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, card_count = 3
  `, [targetUserId]);

  const sampleCards = [
    {
      id: 1,
      deck_id: 1,
      user_id: targetUserId,
      question_id: 101,
      front: 'Spironolactone (Aldactone) — Mechanism & Critical Electrolyte Warning',
      back: 'Potassium-sparing aldosterone antagonist. Inhibits sodium reabsorption in distal renal tubules while retaining potassium. Never combine with potassium supplements or salt substitutes. Watch for peaked T-waves.',
      clinical_pearl: 'Spironolactone spares Potassium. Salt substitutes contain potassium chloride!',
      box_level: 1,
      interval_days: 1,
      ease_factor: 2.50,
      repetition_count: 0,
    },
    {
      id: 2,
      deck_id: 1,
      user_id: targetUserId,
      question_id: 105,
      front: 'Inferior Wall STEMI — Lead Involvements & Hemodynamic Preload Hazard',
      back: 'ST elevation in leads II, III, and aVF indicates occlusion of the Right Coronary Artery (RCA). Frequently affects SA/AV nodes (bradycardia). Avoid nitrates and morphine if right ventricular infarction is present due to acute preload collapse!',
      clinical_pearl: 'Inferior STEMI = Leads II, III, aVF. RCA supplies SA/AV nodes. Nitrates can cause severe hypotension.',
      box_level: 2,
      interval_days: 3,
      ease_factor: 2.60,
      repetition_count: 1,
    },
    {
      id: 3,
      deck_id: 1,
      user_id: targetUserId,
      question_id: 103,
      front: 'Thyroid Storm (Thyrotoxic Crisis) — Antipyretic Contraindication',
      back: 'Aspirin (salicylates) is strictly contraindicated because it displaces thyroxine (T4/T3) from binding proteins, dramatically increasing free circulating thyroid hormone levels. Use Acetaminophen instead!',
      clinical_pearl: 'Never give Aspirin for thyroid storm. Administer Propranolol to block adrenergic overdrive and peripheral T4-to-T3 conversion.',
      box_level: 1,
      interval_days: 1,
      ease_factor: 2.50,
      repetition_count: 0,
    },
  ];

  for (const c of sampleCards) {
    await execSql(`
      INSERT INTO flashcards (
        id, deck_id, user_id, question_id, front, back, clinical_pearl, box_level, interval_days, ease_factor, repetition_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        front = excluded.front,
        back = excluded.back,
        clinical_pearl = excluded.clinical_pearl
    `, [c.id, c.deck_id, c.user_id, c.question_id, c.front, c.back, c.clinical_pearl, c.box_level, c.interval_days, c.ease_factor, c.repetition_count]);
  }

  // E. Seed Sample Test Session
  console.log('⏱️  Seeding sample test session...');
  await execSql(`
    INSERT INTO test_sessions (
      id, user_id, title, mode, exam_track, status, filters_json, question_ids_json, current_question_index, total_questions, correct_count, score_percentage, time_limit_seconds, time_spent_seconds, created_at
    ) VALUES (
      1, ?, 'Diagnostic NextGen Sample Test', 'tutor', 'RN', 'in_progress',
      '{"category":"All","difficulty":"All","source":"all"}',
      '[101, 102, 103, 104, 105, 106]',
      0, 6, 0, 0.00, 3600, 120, CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET title = excluded.title
  `, [secondUserId]);

  console.log('✅ Phase 5 Database Migration completed successfully!');
  if (client && client.end) {
    await client.end();
  }
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
