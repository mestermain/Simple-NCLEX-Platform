/**
 * Database Seed Script for Simple NCLEX Platform
 * 
 * Usage:
 *   node scripts/seed.js
 * 
 * Works with both SQLite (nclex.db) and PostgreSQL (DATABASE_URL).
 * Fills the database with clearly labeled, original sample preparatory data.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load environment variables from .env.local or .env if present
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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const N = 32768;
  const r = 8;
  const p = 1;
  const derived = crypto.scryptSync(password, salt, 64, { N, r, p, maxmem: 128 * N * r * 2 });
  return `scrypt:${N}:${r}:${p}$${salt}$${derived.toString('hex')}`;
}

async function runSeed() {
  console.log('🌱 Starting Simple NCLEX Platform database seed...');

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  let dbType = 'sqlite';
  let client = null;

  if (connectionString) {
    dbType = 'postgres';
    console.log('📦 Using PostgreSQL database connection.');
    const { Pool } = require('pg');
    client = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  } else {
    console.log('📦 Using local SQLite database (nclex.db).');
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

  // 1. Create Tables
  console.log('⚙️  Ensuring database schema exists...');

  await execSql(`
    CREATE TABLE IF NOT EXISTS users (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plain_password TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      exam_type TEXT DEFAULT 'NCLEX-RN',
      role TEXT NOT NULL DEFAULT 'student',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS courses (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      rating NUMERIC(3,2) DEFAULT 4.9,
      students_count INTEGER DEFAULT 0,
      duration_hours INTEGER DEFAULT 48,
      emoji TEXT DEFAULT '📚',
      badge_text TEXT,
      badge_style TEXT DEFAULT 'accent',
      level TEXT DEFAULT 'All Levels',
      is_featured INTEGER DEFAULT 0,
      questions_count INTEGER DEFAULT 2500,
      image_url TEXT DEFAULT '',
      curriculum_data TEXT DEFAULT '',
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      enrolled_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      progress INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'},
      notes TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '',
      payment_screenshot TEXT DEFAULT '',
      transaction_id TEXT DEFAULT '',
      UNIQUE(user_id, course_id)
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS demo_mcqs (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      client_need TEXT DEFAULT '',
      statement TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL DEFAULT 0,
      correct_rationale TEXT NOT NULL,
      distractors_json TEXT NOT NULL,
      clinical_pearl TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS qbank_plans (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 30,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      badge TEXT DEFAULT '',
      features_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS qbank_subscriptions (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES qbank_plans(id) ON DELETE SET NULL,
      plan_name TEXT NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 30,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      whatsapp_number TEXT DEFAULT '',
      payment_screenshot TEXT DEFAULT '',
      enrolled_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      reviewed_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'},
      expires_at ${dbType === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME'},
      notes TEXT DEFAULT ''
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS student_notifications (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      is_read INTEGER DEFAULT 0,
      link TEXT DEFAULT '',
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS student_qbank_attempts (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL,
      question_type TEXT DEFAULT 'single',
      category TEXT DEFAULT '',
      difficulty TEXT DEFAULT '',
      exam_type TEXT DEFAULT 'NCLEX-RN',
      selected_indices_json TEXT DEFAULT '[]',
      is_correct INTEGER NOT NULL DEFAULT 0,
      attempted_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS student_qbank_flags (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      UNIQUE(user_id, question_id)
    )
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS qbank_questions (
      id ${dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      category TEXT NOT NULL,
      organ_system TEXT DEFAULT 'Comprehensive Multi-System',
      difficulty TEXT NOT NULL DEFAULT 'High Yield',
      exam_type TEXT NOT NULL DEFAULT 'NCLEX-RN',
      client_need TEXT DEFAULT '',
      statement TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      correct_index INTEGER NOT NULL DEFAULT 0,
      correct_indices_json TEXT NOT NULL DEFAULT '[]',
      correct_rationale TEXT NOT NULL,
      distractors_json TEXT NOT NULL DEFAULT '[]',
      clinical_pearl TEXT DEFAULT '',
      question_type TEXT DEFAULT 'single',
      is_demo INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at ${dbType === 'postgres' ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);

  // 2. Seed Admin & Sample Users
  console.log('👤 Seeding admin and test accounts...');
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@simplenclex.com';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin123!';
  const adminHash = hashPassword(adminPassword);

  const studentPassword = 'Password123!';
  const studentHash = hashPassword(studentPassword);

  // Check and insert admin
  const now = new Date().toISOString();
  await execSql(`
    INSERT INTO users (first_name, last_name, email, password_hash, plain_password, phone, exam_type, role, is_active, created_at)
    VALUES (?, ?, ?, ?, '', ?, 'NCLEX-RN', 'admin', 1, ?)
    ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin'
  `, ['Faculty', 'Administrator', adminEmail, adminHash, process.env.NEXT_PUBLIC_CONTACT_PHONE || '+92 300 1234567', now]);

  // Check and insert test student
  await execSql(`
    INSERT INTO users (first_name, last_name, email, password_hash, plain_password, phone, exam_type, role, is_active, created_at)
    VALUES (?, ?, ?, ?, '', '+92 300 9876543', 'NCLEX-RN', 'student', 1, ?)
    ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash
  `, ['Sarah', 'Jenkins', 'student@simplenclex.com', studentHash, now]);

  // 3. Seed Q-Bank Subscription Plans
  console.log('💎 Seeding Q-Bank subscription plans...');
  const plans = [
    {
      id: 1,
      name: '1-Month Intensive Pass',
      description: 'Full 30-day access to all 2,500+ NCLEX & SNLE practice questions with rationales.',
      duration_days: 30,
      price: 4999.00,
      original_price: 8000.00,
      badge: 'Starter',
      features_json: JSON.stringify([
        'Full 2,500+ NCLEX & SNLE Question Bank',
        'In-Depth Evidence-Based Clinical Rationales',
        'Distractor Analysis for Every Option',
        'Interactive Tutor & Exam Modes',
        'Category & Specialty Filtering',
      ]),
    },
    {
      id: 2,
      name: '3-Month High-Yield Master',
      description: 'The recommended plan for comprehensive exam readiness. Includes Next-Gen cases and simulated exams.',
      duration_days: 90,
      price: 7999.00,
      original_price: 14000.00,
      badge: 'Most Popular',
      features_json: JSON.stringify([
        'Complete 90-Day All-Access Question Bank',
        'Next-Generation NCLEX (NGN) Case Studies',
        'Timed Exam Mode & Mock Test Simulator',
        'Specialty Performance Diagnostics',
        'Priority WhatsApp Study Support Group',
        'NCLEX High-Yield Clinical Pearl Summaries',
      ]),
    },
    {
      id: 3,
      name: '6-Month Complete Pass',
      description: 'Maximum flexibility and complete licensure guarantee for international and repeat test-takers.',
      duration_days: 180,
      price: 11999.00,
      original_price: 22000.00,
      badge: 'Best Value',
      features_json: JSON.stringify([
        'Unlimited 180-Day Complete Q-Bank Access',
        'All NCLEX-RN, Next-Gen, SNLE & Prometric Tracks',
        'Personalized Weakness Remediation Quizzes',
        'Direct Faculty Mentorship on WhatsApp',
        'Free Content & Question Updates for 2026',
        'First-Time Pass Guarantee Commitment',
      ]),
    },
  ];

  for (const p of plans) {
    await execSql(`
      INSERT INTO qbank_plans (id, name, description, duration_days, price, original_price, badge, features_json, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name, 
        price = excluded.price, 
        original_price = excluded.original_price, 
        features_json = excluded.features_json
    `, [p.id, p.name, p.description, p.duration_days, p.price, p.original_price, p.badge, p.features_json, now]);
  }

  // 4. Seed Courses
  console.log('📚 Seeding core courses and syllabi...');
  const curriculumSample = JSON.stringify([
    {
      moduleTitle: 'Module 1: Safe and Effective Care Environment & Client Advocacy',
      lectures: [
        {
          id: 'nclex-1',
          title: 'Management of Care, Delegation & Legal Nursing Standards',
          duration: '50:00',
          notes: [
            'The Five Rights of Delegation to UAP and LPN/LVN.',
            'Informed consent, client rights, advance directives, and confidentiality (HIPAA).',
            'Supervision, leadership principles, and ethical dilemmas in clinical practice.',
          ],
        },
        {
          id: 'nclex-2',
          title: 'Safety and Infection Control & Accident Prevention',
          duration: '45:00',
          notes: [
            'Standard vs transmission-based isolation precautions (airborne, droplet, contact).',
            'Fall prevention, surgical asepsis, and restraint usage rules.',
            'Disaster planning, triage tags (emergent/urgent/non-urgent/expectant).',
          ],
        },
      ],
    },
    {
      moduleTitle: 'Module 2: Physiological Integrity & Pharmacological Therapies',
      lectures: [
        {
          id: 'nclex-3',
          title: 'High-Yield Cardiovascular & Respiratory Pharmacotherapy',
          duration: '60:00',
          notes: [
            'Antihypertensives, cardiac glycosides, diuretics, and anticoagulants.',
            'Beta-2 agonists, inhaled corticosteroids, and respiratory rescue protocols.',
          ],
        },
        {
          id: 'nclex-4',
          title: 'Endocrine Crises, Fluid & Electrolyte Imbalances',
          duration: '55:00',
          notes: [
            'DKA vs HHS management, insulin sliding scale pearls, and hypoglycemia safety.',
            'Hyperkalemia vs hypokalemia ECG changes, hyponatremia and neurological precautions.',
          ],
        },
      ],
    },
    {
      moduleTitle: 'Module 3: Next Generation NCLEX (NGN) Clinical Decision Making',
      lectures: [
        {
          id: 'nclex-5',
          title: 'NCSBN Clinical Judgment Measurement Model (CJMM) 6 Steps',
          duration: '65:00',
          notes: [
            'Recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes.',
            'Strategies for answering Bow-Tie, Extended Multiple Response, Matrix, and Trend items.',
          ],
        },
      ],
    },
  ]);

  const courses = [
    {
      id: 10,
      title: 'NCLEX-RN Complete Prep 2026',
      description: 'The premier NCLEX-RN preparation course covering all 8 NCSBN Client Needs categories, clinical rationales, 48 hours of live instruction, and complete Next Generation NCLEX (NGN) case studies.',
      category: 'nclex-rn',
      price: 15000.0,
      original_price: 25000.0,
      rating: 4.9,
      students_count: 180,
      duration_hours: 48,
      emoji: '🏥',
      badge_text: 'Global Licensure',
      badge_style: 'accent',
      level: 'Beginner → Pro',
      is_featured: 1,
      questions_count: 2500,
      curriculum_data: curriculumSample,
    },
    {
      id: 11,
      title: 'Saudi Nursing Licensure Exam (SNLE) Material',
      description: 'Targeted preparation aligned with the official Saudi Commission for Health Specialties (SCFHS) blueprint. High-yield recall questions, adult medical-surgical, maternal-child, and critical care nursing.',
      category: 'snle',
      price: 18000.0,
      original_price: 30000.0,
      rating: 4.9,
      students_count: 95,
      duration_hours: 36,
      emoji: '🇸🇦',
      badge_text: 'SCFHS Aligned',
      badge_style: 'green',
      level: 'Beginner → Pro',
      is_featured: 0,
      questions_count: 2000,
      curriculum_data: curriculumSample,
    },
    {
      id: 12,
      title: 'Prometric Nursing Exam Material (DHA, MOH, Qatar, Oman)',
      description: 'Comprehensive question bank and video reviews for Gulf health authorities (Dubai DHA, Abu Dhabi HAAD/DoH, UAE MOH, Qatar Prometric QCHP, and Oman OMSB Prometric exams).',
      category: 'prometric',
      price: 16000.0,
      original_price: 28000.0,
      rating: 4.8,
      students_count: 120,
      duration_hours: 32,
      emoji: '🌐',
      badge_text: 'Gulf Licensing',
      badge_style: 'teal',
      level: 'All Levels',
      is_featured: 0,
      questions_count: 2200,
      curriculum_data: curriculumSample,
    },
    {
      id: 13,
      title: 'NCLEX-PN Practical Nurse Intensive Review',
      description: 'Focused review designed specifically for LPN and LVN licensure candidates. Covers safe effective care environment, coordinated care, pharmacology calculations, and practical physiological adaptation.',
      category: 'nclex-pn',
      price: 14000.0,
      original_price: 22000.0,
      rating: 4.9,
      students_count: 85,
      duration_hours: 36,
      emoji: '🩺',
      badge_text: 'LPN / LVN Prep',
      badge_style: 'accent',
      level: 'Practical Nursing',
      is_featured: 0,
      questions_count: 1800,
      curriculum_data: curriculumSample,
    },
    {
      id: 14,
      title: 'Dubai DHA & Abu Dhabi HAAD (DoH) Fast-Track',
      description: 'Tailored for UAE licensing credentials. High-yield recall drills, infection prevention protocols, emergency triage guidelines, and Dataflow Primary Source Verification guidance.',
      category: 'dha',
      price: 17000.0,
      original_price: 26000.0,
      rating: 4.8,
      students_count: 110,
      duration_hours: 30,
      emoji: '🇦🇪',
      badge_text: 'UAE Health Authorities',
      badge_style: 'teal',
      level: 'All Levels',
      is_featured: 0,
      questions_count: 2100,
      curriculum_data: curriculumSample,
    },
  ];

  for (const c of courses) {
    await execSql(`
      INSERT INTO courses (id, title, description, category, price, original_price, rating, students_count, duration_hours, emoji, badge_text, badge_style, level, is_featured, questions_count, curriculum_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        price = excluded.price,
        original_price = excluded.original_price,
        curriculum_data = excluded.curriculum_data
    `, [c.id, c.title, c.description, c.category, c.price, c.original_price, c.rating, c.students_count, c.duration_hours, c.emoji, c.badge_text, c.badge_style, c.level, c.is_featured, c.questions_count, c.curriculum_data, now]);
  }

  // 5. Seed Site Settings
  console.log('⚙️  Seeding site settings...');
  const settings = [
    ['hero_headline', 'Master NCLEX-RN, SNLE & Prometric 2026'],
    ['hero_subtitle', 'Interactive live clinical sessions, Next-Gen case studies, and authentic practice questions curated by registered nurses and licensing experts.'],
    ['contact_email', process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@simplenclex.com'],
    ['contact_phone', process.env.NEXT_PUBLIC_CONTACT_PHONE || '+92 300 1234567'],
    ['contact_whatsapp', process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '923001234567'],
    ['payment_bank_name', process.env.NEXT_PUBLIC_BANK_NAME || 'Meezan Bank Islamic'],
    ['payment_bank_iban', process.env.NEXT_PUBLIC_BANK_IBAN || 'PK42MEZN0001020304050607'],
    ['payment_easypaisa_name', process.env.NEXT_PUBLIC_EASYPAISA_NAME || 'Simple NCLEX Academy'],
    ['payment_easypaisa_number', process.env.NEXT_PUBLIC_EASYPAISA_NUMBER || '0300-1234567'],
    ['pass_rate', '99.2%'],
    ['students_helped', '4,800+'],
  ];

  for (const [key, value] of settings) {
    await execSql(`
      INSERT INTO site_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [key, value]);
  }

  // 6. Run Phase 5 Advanced Models Migration
  console.log('🚀 Running Phase 5 Schema & Next Gen Migration...');
  const { spawnSync } = require('child_process');
  const migResult = spawnSync(process.execPath, [path.resolve(__dirname, 'migrate_phase5.js')], { stdio: 'inherit' });
  if (migResult.status !== 0) {
    throw new Error(`Phase 5 migration failed with exit code ${migResult.status}`);
  }

  console.log('✅ Seed and Phase 5 Migration completed successfully!');
  if (client && client.end) {
    await client.end();
  }
}

runSeed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
