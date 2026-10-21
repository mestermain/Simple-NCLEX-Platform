import { NextResponse } from 'next/server';
import { getAuthFromRequest, checkUserPlatformAccess } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    const user = await queryOne('SELECT id, first_name, last_name, email, role, exam_type FROM users WHERE id = ?', [session.id]);
    if (!user) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    const access = await checkUserPlatformAccess(user.id);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        examType: user.exam_type || 'NCLEX-RN',
      },
      access,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
