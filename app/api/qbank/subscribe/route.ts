import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Please log in to subscribe to the Q-Bank' }, { status: 401 });
    }

    const { planId, planName, durationDays, price, whatsappNumber, paymentScreenshot, notes } = await req.json();

    if (!planName || !durationDays) {
      return NextResponse.json({ success: false, message: 'Missing plan selection' }, { status: 400 });
    }

    // Insert pending subscription
    await execute(
      `INSERT INTO qbank_subscriptions 
       (user_id, plan_id, plan_name, duration_days, price, status, whatsapp_number, payment_screenshot, enrolled_at, notes)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, ?)`,
      [
        session.id,
        planId || null,
        planName,
        durationDays,
        price || 0,
        whatsappNumber || '',
        paymentScreenshot || '',
        notes || '',
      ]
    );

    // Create user notification
    try {
      await execute(
        `INSERT INTO student_notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'subscription', 0, CURRENT_TIMESTAMP)`,
        [
          session.id,
          'Q-Bank Subscription Submitted',
          `Your subscription request for "${planName}" has been received. Our admin team will verify your payment and activate your 100% full Q-Bank access within a few hours.`,
        ]
      );
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Subscription request submitted successfully. Admin will review and activate your access.',
    });
  } catch (error: any) {
    console.error('QBank subscribe error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
