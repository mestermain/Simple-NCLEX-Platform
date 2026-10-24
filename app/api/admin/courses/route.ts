import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { courseSchema } from '@/lib/validators';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const rows = await query('SELECT * FROM courses ORDER BY id ASC');
    const courses = rows.map(r => {
      let curriculum = [];
      try { curriculum = JSON.parse(r.curriculum_data || '[]'); } catch (_) { curriculum = []; }
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        price: Number(r.price),
        originalPrice: Number(r.original_price),
        rating: Number(r.rating || 4.8),
        studentsCount: r.students_count || 0,
        durationHours: r.duration_hours || 0,
        emoji: r.emoji || '📚',
        badgeText: r.badge_text || '',
        badgeStyle: r.badge_style || 'accent',
        level: r.level || 'All Levels',
        isFeatured: r.is_featured === 1,
        questionsCount: r.questions_count || 0,
        imageUrl: r.image_url || '',
        curriculum,
      };
    });

    return NextResponse.json({ success: true, courses });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid course data' }, { status: 400 });
    }

    const {
      title,
      description,
      category,
      price,
      originalPrice,
      durationHours,
      questionsCount,
      level,
      badgeText,
      emoji,
      imageUrl,
    } = parsed.data;

    const result = await execute(
      `INSERT INTO courses 
       (title, description, category, price, original_price, duration_hours, questions_count, level, badge_text, emoji, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        title,
        description || '',
        category || 'nclex-rn',
        price,
        originalPrice || price,
        durationHours || 40,
        questionsCount || 2000,
        level || 'Comprehensive Review',
        badgeText || 'NextGen 2026',
        emoji || '📚',
        imageUrl || '',
      ]
    );

    const newId = result.lastInsertId;
    await logAdminAction(
      session.userId,
      'course.create',
      'courses',
      newId,
      { title, category, price },
      req
    );

    return NextResponse.json({ success: true, message: 'Course created successfully', id: newId });
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
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid course data' }, { status: 400 });
    }

    const {
      id,
      title,
      description,
      category,
      price,
      originalPrice,
      durationHours,
      questionsCount,
      level,
      badgeText,
      emoji,
      imageUrl,
    } = parsed.data;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Course ID required for updating' }, { status: 400 });
    }

    await execute(
      `UPDATE courses SET
         title = ?,
         description = ?,
         category = ?,
         price = ?,
         original_price = ?,
         duration_hours = ?,
         questions_count = ?,
         level = ?,
         badge_text = ?,
         emoji = ?,
         image_url = ?
       WHERE id = ?`,
      [
        title,
        description || '',
        category || 'nclex-rn',
        price,
        originalPrice || price,
        durationHours || 40,
        questionsCount || 2000,
        level || 'Comprehensive Review',
        badgeText || '',
        emoji || '📚',
        imageUrl || '',
        id,
      ]
    );

    await logAdminAction(
      session.userId,
      'course.update',
      'courses',
      id,
      { title, category, price },
      req
    );

    return NextResponse.json({ success: true, message: 'Course updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Course ID required' }, { status: 400 });
    }

    await execute('DELETE FROM courses WHERE id = ?', [id]);

    await logAdminAction(
      session.userId,
      'course.delete',
      'courses',
      Number(id),
      { courseId: id },
      req
    );

    return NextResponse.json({ success: true, message: 'Course deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

