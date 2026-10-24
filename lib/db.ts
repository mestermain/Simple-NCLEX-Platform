import path from 'path';
import fs from 'fs';

let pgPool: any = null;
let sqliteDb: any = null;

function getSqlitePath(): string {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  const tmpDbPath = '/tmp/nclex.db';

  if (isServerless && fs.existsSync(tmpDbPath)) {
    return tmpDbPath;
  }

  // Look for nclex.db across candidate paths
  const candidates = [
    path.resolve(process.cwd(), 'nclex.db'),
    path.join(__dirname, 'nclex.db'),
    path.join(__dirname, '..', 'nclex.db'),
    path.join(__dirname, '..', '..', 'nclex.db'),
    path.join(process.cwd(), '.next', 'server', 'nclex.db'),
    path.join(process.env.LAMBDA_TASK_ROOT || '', 'nclex.db'),
  ];

  let foundPath = candidates.find(p => p && fs.existsSync(p));

  if (isServerless) {
    if (foundPath) {
      try {
        fs.copyFileSync(foundPath, tmpDbPath);
        return tmpDbPath;
      } catch (err) {
        console.error('Error copying nclex.db to /tmp:', err);
        return foundPath;
      }
    }
    return tmpDbPath;
  }

  return foundPath || path.resolve(process.cwd(), 'nclex.db');
}

function ensureSqliteSchema(db: any) {
  if (!db) return;
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!tableCheck) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          plain_password TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          exam_type TEXT DEFAULT 'NCLEX-RN',
          role TEXT NOT NULL DEFAULT 'student',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS enrollments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          progress INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          reviewed_at DATETIME,
          notes TEXT DEFAULT '',
          whatsapp_number TEXT DEFAULT '',
          payment_screenshot TEXT DEFAULT '',
          transaction_id TEXT DEFAULT '',
          UNIQUE(user_id, course_id)
        );
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          details TEXT NOT NULL,
          user_id INTEGER,
          user_email TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS site_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS demo_mcqs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS qbank_plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          duration_days INTEGER NOT NULL DEFAULT 30,
          price NUMERIC(10,2) NOT NULL DEFAULT 0,
          original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
          badge TEXT DEFAULT '',
          features_json TEXT NOT NULL DEFAULT '[]',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS qbank_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          plan_id INTEGER REFERENCES qbank_plans(id) ON DELETE SET NULL,
          plan_name TEXT NOT NULL,
          duration_days INTEGER NOT NULL DEFAULT 30,
          price NUMERIC(10,2) NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          whatsapp_number TEXT DEFAULT '',
          payment_screenshot TEXT DEFAULT '',
          enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          reviewed_at DATETIME,
          expires_at DATETIME,
          notes TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS student_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'general',
          is_read INTEGER DEFAULT 0,
          link TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS student_qbank_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          question_id INTEGER NOT NULL,
          question_type TEXT DEFAULT 'single',
          category TEXT DEFAULT '',
          difficulty TEXT DEFAULT '',
          exam_type TEXT DEFAULT 'NCLEX-RN',
          selected_indices_json TEXT DEFAULT '[]',
          is_correct INTEGER NOT NULL DEFAULT 0,
          attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS student_qbank_flags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          question_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, question_id)
        );
        CREATE TABLE IF NOT EXISTS qbank_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS flashcard_decks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          exam_type TEXT NOT NULL DEFAULT 'NCLEX-RN',
          cards_count INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS flashcards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          deck_id INTEGER REFERENCES flashcard_decks(id) ON DELETE CASCADE,
          front TEXT NOT NULL,
          back TEXT NOT NULL,
          high_yield_note TEXT DEFAULT '',
          box INTEGER NOT NULL DEFAULT 1,
          repetitions INTEGER NOT NULL DEFAULT 0,
          ease_factor REAL NOT NULL DEFAULT 2.5,
          interval_days INTEGER NOT NULL DEFAULT 0,
          last_reviewed DATETIME,
          next_review DATETIME
        );
      `);
    }

    // Always ensure default admin user exists
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@simplenclex.com';
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if (!existingAdmin) {
      const adminHash = 'scrypt:32768:8:1$ed0349617a6bc8acb08fde23a4d34010$8faa11c917a2a6993d67a853d1363f3a6c90c4d34bd9bef244454110576320005d7a303d27a8188089d362d305e9041519b1c7c7e250d014f5bb0be807b7778f';
      const insertAdmin = db.prepare(`
        INSERT INTO users (first_name, last_name, email, password_hash, plain_password, phone, exam_type, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);
      insertAdmin.run('Faculty', 'Administrator', adminEmail, adminHash, 'Admin123!', '+92 300 1234567', 'NCLEX-RN', 'admin');
    }
  } catch (err) {
    console.warn('ensureSqliteSchema notice:', err);
  }
}

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

  if (connectionString) {
    if (!pgPool) {
      try {
        const { Pool } = require('pg');
        pgPool = new Pool({
          connectionString,
          ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
        });
      } catch (err) {
        console.error('Failed to initialize pg pool:', err);
      }
    }
    return { type: 'postgres' as const, client: pgPool };
  } else {
    if (!sqliteDb) {
      try {
        let DatabaseSyncModule: any = null;
        try {
          DatabaseSyncModule = require('node:sqlite').DatabaseSync;
        } catch {
          // node:sqlite is available in Node 22.5.0+
        }

        if (DatabaseSyncModule) {
          const dbPath = getSqlitePath();
          sqliteDb = new DatabaseSyncModule(dbPath);
          ensureSqliteSchema(sqliteDb);
        } else {
          console.warn('node:sqlite DatabaseSync is unavailable in the current runtime environment.');
        }
      } catch (err) {
        console.error('Failed to initialize SQLite database:', err);
      }
    }
    return { type: 'sqlite' as const, client: sqliteDb };
  }
}

/**
 * Normalizes SQL queries so the same query works across PostgreSQL ($1, $2) and SQLite (?, ?)
 */
function normalizeSql(sql: string, targetType: 'postgres' | 'sqlite'): string {
  if (targetType === 'sqlite') {
    // Convert $1, $2, $3 to ?
    return sql.replace(/\$\d+/g, '?');
  } else {
    // If query uses ? for postgres, convert ? to $1, $2, $3
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const db = getDb();
    if (!db || !db.client) {
      return [];
    }

    if (db.type === 'postgres') {
      const normalized = normalizeSql(sql, 'postgres');
      const res = await db.client.query(normalized, params);
      return res.rows;
    } else {
      const normalized = normalizeSql(sql, 'sqlite');
      const stmt = db.client.prepare(normalized);
      return stmt.all(...params) as T[];
    }
  } catch (err) {
    console.error('Database query error:', err);
    return [];
  }
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  try {
    const rows = await query<T>(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('Database queryOne error:', err);
    return null;
  }
}

export async function execute(sql: string, params: any[] = []): Promise<{ lastInsertId?: number | bigint; changes?: number }> {
  try {
    const db = getDb();
    if (!db || !db.client) {
      return { changes: 0 };
    }

    if (db.type === 'postgres') {
      const normalized = normalizeSql(sql, 'postgres');
      const res = await db.client.query(normalized, params);
      const lastId = res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : undefined;
      return { lastInsertId: lastId, changes: res.rowCount };
    } else {
      const normalized = normalizeSql(sql, 'sqlite');
      const stmt = db.client.prepare(normalized);
      const result = stmt.run(...params);
      return {
        lastInsertId: result.lastInsertRowid,
        changes: result.changes,
      };
    }
  } catch (err) {
    console.error('Database execute error:', err);
    return { changes: 0 };
  }
}
