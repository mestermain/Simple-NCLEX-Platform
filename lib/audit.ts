import { execute, query, queryOne } from './db';

export interface AuditLogEntry {
  id: number;
  action: string;
  details: string;
  userId?: number;
  adminId?: number;
  userEmail?: string;
  adminEmail?: string;
  adminName?: string;
  targetTable?: string;
  targetId?: number | null;
  metadata?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

/**
 * Records an immutable administrative or security action in activity_logs.
 * Accepts both (action, details, userId?, userEmail?) and (adminId, action, targetTable, targetId?, metadata?, req?)
 */
export async function logAdminAction(
  arg1: string | number,
  arg2: string,
  arg3?: string | number,
  arg4?: any,
  arg5?: any,
  arg6?: Request
): Promise<void> {
  try {
    let action = '';
    let details = '';
    let userId: number | null = null;
    let userEmail: string | null = null;

    if (typeof arg1 === 'number') {
      userId = arg1;
      action = arg2;
      const targetTable = typeof arg3 === 'string' ? arg3 : '';
      const targetId = typeof arg4 === 'number' ? arg4 : null;
      const meta = typeof arg5 === 'object' && arg5 !== null ? JSON.stringify(arg5) : (arg5 ? String(arg5) : '');
      const req = arg6;

      let ip = '';
      if (req && req.headers) {
        ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
      }

      details = `${targetTable}${targetId ? ` #${targetId}` : ''}${meta ? ` | ${meta}` : ''}${ip ? ` | IP: ${ip}` : ''}`.trim();

      try {
        const u = await queryOne('SELECT email, first_name, last_name FROM users WHERE id = ?', [userId]);
        if (u) {
          userEmail = u.email;
        }
      } catch (_) {}
    } else {
      action = arg1;
      details = arg2;
      userId = typeof arg3 === 'number' ? arg3 : null;
      userEmail = typeof arg4 === 'string' ? arg4 : null;
    }

    const createdAt = new Date().toISOString();
    await execute(
      `INSERT INTO activity_logs (action, details, user_id, user_email, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [action, details, userId, userEmail, createdAt]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Fetches recent audit logs for the administration dashboard
 */
export async function getRecentAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  try {
    const rows = await query(
      `SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?`,
      [limit]
    );
    return rows.map(r => {
      const email = r.user_email || '';
      const name = email ? email.split('@')[0] : `Admin #${r.user_id || 'system'}`;
      let targetTable = 'system';
      let targetId: number | null = null;
      let ip = '';

      if (r.details) {
        const parts = r.details.split('|');
        const first = parts[0]?.trim() || '';
        const idMatch = first.match(/#(\d+)/);
        if (idMatch) targetId = Number(idMatch[1]);
        targetTable = first.replace(/#\d+/, '').trim() || 'system';

        const ipMatch = r.details.match(/IP:\s*([^\s|]+)/);
        if (ipMatch) ip = ipMatch[1];
      }

      return {
        id: r.id,
        action: r.action,
        details: r.details,
        userId: r.user_id,
        adminId: r.user_id,
        userEmail: email,
        adminEmail: email,
        adminName: name,
        targetTable,
        targetId,
        metadata: r.details,
        ipAddress: ip || 'internal',
        createdAt: r.created_at,
      };
    });
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
    return [];
  }
}

