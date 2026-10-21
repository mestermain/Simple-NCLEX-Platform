import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const rows = await query(`
      SELECT id, first_name, last_name, email, exam_type, role, is_active, created_at, phone
      FROM users
      ORDER BY id DESC
    `);

    return NextResponse.json({
      success: true,
      users: rows.map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`.trim(),
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        examType: u.exam_type,
        role: u.role,
        isActive: u.is_active === 1,
        createdAt: u.created_at,
        phone: u.phone,
      })),
      total: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, role, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    if (role !== undefined) {
      await execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    }
    if (isActive !== undefined) {
      await execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    }

    return NextResponse.json({ success: true, message: 'User updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
