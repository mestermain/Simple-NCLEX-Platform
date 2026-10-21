import path from 'path';

let pgPool: any = null;
let sqliteDb: any = null;

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

  if (connectionString) {
    if (!pgPool) {
      const { Pool } = require('pg');
      pgPool = new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
      });
    }
    return { type: 'postgres' as const, client: pgPool };
  } else {
    if (!sqliteDb) {
      try {
        const { DatabaseSync } = require('node:sqlite');
        const dbPath = path.resolve(process.cwd(), 'nclex.db');
        sqliteDb = new DatabaseSync(dbPath);
      } catch (err) {
        console.error('Failed to initialize node:sqlite:', err);
        throw err;
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
  const db = getDb();

  if (db.type === 'postgres') {
    const normalized = normalizeSql(sql, 'postgres');
    const res = await db.client.query(normalized, params);
    return res.rows;
  } else {
    const normalized = normalizeSql(sql, 'sqlite');
    const stmt = db.client.prepare(normalized);
    return stmt.all(...params) as T[];
  }
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<{ lastInsertId?: number | bigint; changes?: number }> {
  const db = getDb();

  if (db.type === 'postgres') {
    const normalized = normalizeSql(sql, 'postgres');
    const res = await db.client.query(normalized, params);
    // If it's an insert with RETURNING id
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
}
