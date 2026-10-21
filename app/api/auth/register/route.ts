import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, password, examType } = await req.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);

    if (existing) {
      return NextResponse.json({ success: false, message: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const selectedExam = examType || 'NCLEX-RN';

    const insertResult = await execute(
      `INSERT INTO users (first_name, last_name, email, password_hash, plain_password, exam_type, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'student', 1, CURRENT_TIMESTAMP)`,
      [firstName.trim(), lastName.trim(), normalizedEmail, passwordHash, password, selectedExam]
    );

    const newUserId = insertResult.lastInsertId as number;

    const token = signToken({
      id: newUserId,
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'student',
      exam_type: selectedExam,
    });

    const safeUser = {
      id: newUserId,
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
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
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
