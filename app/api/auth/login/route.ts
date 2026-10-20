import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await queryOne('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]);

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password_hash, user.plain_password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

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
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      examType: user.exam_type || 'NCLEX-RN',
      isActive: user.is_active === 1,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
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
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
