import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const courseId = parseInt(params.id, 10);
    if (!courseId) {
      return NextResponse.json({ success: false, message: 'Invalid course ID' }, { status: 400 });
    }

    const r = await queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!r) {
      return NextResponse.json({ success: false, message: 'Course not found' }, { status: 404 });
    }

    let curriculum = [];
    try { curriculum = JSON.parse(r.curriculum_data || '[]'); } catch (_) { curriculum = []; }

    const course = {
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

    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
