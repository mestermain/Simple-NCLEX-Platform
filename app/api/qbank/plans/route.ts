import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM qbank_plans WHERE is_active = 1 ORDER BY duration_days ASC');
    const plans = rows.map(r => {
      let features = [];
      try { features = JSON.parse(r.features_json || '[]'); } catch (_) { features = []; }
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        durationDays: r.duration_days,
        price: Number(r.price),
        originalPrice: Number(r.original_price),
        badge: r.badge,
        features,
      };
    });

    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
