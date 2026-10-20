import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    sql += ' ORDER BY id ASC';

    const rows = await query(sql, params);

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
        badgeText: r.badge_text,
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
