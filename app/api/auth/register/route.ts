import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    // Server-side Zod validation & password strength check
    const parsed = registerSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || 'Invalid registration data' },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, phone, examType, password } = parsed.data;

    // Check existing email
    const existing = await queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [email]);
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Bcrypt Password Hash (work factor 10)
    const passwordHash = hashPassword(password);
    const selectedExam = examType || 'NCLEX-RN';

    // Store secure hash only (never store plain password)
    const insertResult = await execute(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, plain_password, exam_type, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, '', ?, 'student', 1, CURRENT_TIMESTAMP)`,
      [firstName, lastName, email, phone, passwordHash, selectedExam]
    );

    const newUserId = insertResult.lastInsertId as number;

    const token = signToken({
      id: newUserId,
      email,
      firstName,
      lastName,
      role: 'student',
      exam_type: selectedExam,
    });

    const safeUser = {
      id: newUserId,
      email,
      phone,
      firstName,
      lastName,
      role: 'student',
      examType: selectedExam,
      isActive: true,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: safeUser,
    });

    response.cookies.set('nclex_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
