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
