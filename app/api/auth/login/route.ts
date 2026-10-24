import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';
import { checkLoginRateLimit, recordFailedLoginAttempt, resetLoginRateLimit } from '@/lib/rateLimit';
import { loginSchema } from '@/lib/validators';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    
    // Zod Schema Validation
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || 'Invalid login details' },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;

    // Rate Limiting Protection (Brute Force Defense)
    const rateLimitCheck = checkLoginRateLimit(identifier);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: rateLimitCheck.message || 'Too many failed login attempts. Please wait 15 minutes.' 
        },
        { 
          status: 429,
          headers: rateLimitCheck.retryAfterSeconds 
            ? { 'Retry-After': String(rateLimitCheck.retryAfterSeconds) } 
            : undefined 
        }
      );
    }

    const normalizedLower = identifier.toLowerCase();
    const cleanDigits = identifier.replace(/[\s\-\+\(\)]/g, '');

    // Allow sign-in with either Email Address or Registered Phone/WhatsApp Number
    const user = await queryOne(
      `SELECT * FROM users 
       WHERE LOWER(email) = ? 
          OR phone = ? 
          OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') = ?`,
      [normalizedLower, identifier, cleanDigits]
    );

    if (!user) {
      recordFailedLoginAttempt(identifier);
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. Please verify your email/phone and password.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.password_hash, user.plain_password);
    if (!isValid) {
      recordFailedLoginAttempt(identifier);
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. Please verify your email/phone and password.' },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful login
    resetLoginRateLimit(identifier);

    const token = signToken({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      exam_type: user.exam_type,
    });

    const safeUser = {
      id: user.id,
      email: user.email,
      phone: user.phone || '',
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      examType: user.exam_type || 'NCLEX-RN',
      isActive: user.is_active === 1,
    };

    // Audit log if administrator
    if (user.role === 'admin') {
      await logAdminAction(
        'ADMIN_LOGIN',
        `Administrator signed into management portal from session`,
        user.id,
        user.email
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: safeUser,
    });

    // Secure HTTP-Only Cookie
    response.cookies.set('nclex_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
