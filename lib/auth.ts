import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { queryOne, query } from './db';

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'simple-nclex-platform-super-secret-key-2026';

export interface UserSession {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'student';
  examType?: string;
}

export interface PlatformAccess {
  hasAccess: boolean;
  status: 'approved' | 'demo' | 'pending' | 'expired';
  isAdmin: boolean;
  isCourseEnrolled: boolean;
  isSubscriber: boolean;
  daysRemaining: number;
  planName?: string;
  expiresAt?: string;
}

export function verifyPassword(password: string, hash?: string, plain?: string): boolean {
  if (plain && password === plain) return true;
  if (!hash) return false;

  // Python Werkzeug scrypt hash: scrypt:N:r:p$salt$hash
  if (hash.startsWith('scrypt:')) {
    const parts = hash.split('$');
    if (parts.length === 3) {
      const [method, salt, expected] = parts;
      const subparts = method.split(':');
      const N = parseInt(subparts[1], 10) || 32768;
      const r = parseInt(subparts[2], 10) || 8;
      const p = parseInt(subparts[3], 10) || 1;
      try {
        const derived = crypto.scryptSync(password, salt, 64, { N, r, p, maxmem: 128 * N * r * 2 });
        return derived.toString('hex') === expected;
      } catch (e) {
        console.error('Scrypt verify error:', e);
      }
    }
  }

  // Fallback direct match
  return password === hash;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const N = 32768;
  const r = 8;
  const p = 1;
  const derived = crypto.scryptSync(password, salt, 64, { N, r, p, maxmem: 128 * N * r * 2 });
  return `scrypt:${N}:${r}:${p}$${salt}$${derived.toString('hex')}`;
}

export function signToken(user: { id: number; email: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; role: string; exam_type?: string }): string {
  const payload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    firstName: user.first_name || user.firstName || '',
    lastName: user.last_name || user.lastName || '',
    role: user.role,
    examType: user.exam_type || 'NCLEX-RN',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      firstName: decoded.firstName || '',
      lastName: decoded.lastName || '',
      role: decoded.role || 'student',
      examType: decoded.examType || 'NCLEX-RN',
    };
  } catch (_) {
    return null;
  }
}

export function getAuthFromRequest(req: Request): UserSession | null {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    // Check cookies
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );
    token = cookies['nclex_token'] || cookies['token'] || cookies['access_token'] || '';
  }

  if (!token) return null;
  return verifyToken(token);
}

/**
 * Checks platform-wide full access permissions:
 * - Admin -> 100% full access
 * - Approved course enrollment -> 100% full access
 * - Approved Q-Bank subscription -> 100% full access
 * - Otherwise -> Demo access
 */
export async function checkUserPlatformAccess(userId: number | null): Promise<PlatformAccess> {
  if (!userId) {
    return {
      hasAccess: false,
      status: 'demo',
      isAdmin: false,
      isCourseEnrolled: false,
      isSubscriber: false,
      daysRemaining: 0,
    };
  }

  const user = await queryOne('SELECT id, role FROM users WHERE id = ?', [userId]);
  if (!user) {
    return {
      hasAccess: false,
      status: 'demo',
      isAdmin: false,
      isCourseEnrolled: false,
      isSubscriber: false,
      daysRemaining: 0,
    };
  }

  if (user.role === 'admin') {
    return {
      hasAccess: true,
      status: 'approved',
      isAdmin: true,
      isCourseEnrolled: true,
      isSubscriber: true,
      daysRemaining: 9999,
      planName: 'Admin Master Pass',
    };
  }

  // Check active approved Q-Bank subscription
  const sub = await queryOne(
    `SELECT * FROM qbank_subscriptions 
     WHERE user_id = ? AND status = 'approved' 
     ORDER BY id DESC LIMIT 1`,
    [userId]
  );

  if (sub) {
    let daysRemaining = 30;
    if (sub.expires_at) {
      const diff = new Date(sub.expires_at).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    if (daysRemaining > 0) {
      return {
        hasAccess: true,
        status: 'approved',
        isAdmin: false,
        isCourseEnrolled: false,
        isSubscriber: true,
        daysRemaining,
        planName: sub.plan_name || 'Active Q-Bank Subscription',
        expiresAt: sub.expires_at,
      };
    }
  }

  // Check approved course enrollment
  const enrollment = await queryOne(
    `SELECT * FROM enrollments 
     WHERE user_id = ? AND status = 'approved' 
     ORDER BY id DESC LIMIT 1`,
    [userId]
  );

  if (enrollment) {
    return {
      hasAccess: true,
      status: 'approved',
      isAdmin: false,
      isCourseEnrolled: true,
      isSubscriber: false,
      daysRemaining: 365,
      planName: 'Course Enrollment All-Access',
    };
  }

  return {
    hasAccess: false,
    status: 'demo',
    isAdmin: false,
    isCourseEnrolled: false,
    isSubscriber: false,
    daysRemaining: 0,
  };
}
