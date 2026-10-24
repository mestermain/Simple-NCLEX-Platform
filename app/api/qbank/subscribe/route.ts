import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Please log in to subscribe to the Q-Bank' }, { status: 401 });
    }

    const { planId, planName, durationDays, price, whatsappNumber, paymentScreenshot, notes, instantActivate } = await req.json();

    if (!planName || !durationDays) {
      return NextResponse.json({ success: false, message: 'Missing plan selection' }, { status: 400 });
    }

    const days = parseInt(durationDays, 10) || 30;
    const isAutoApproved = Boolean(instantActivate || process.env.DEMO_MODE === 'true' || Number(price) === 0);
    const initialStatus = isAutoApproved ? 'approved' : 'pending';
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    // Insert subscription
    await execute(
      `INSERT INTO qbank_subscriptions 
       (user_id, plan_id, plan_name, duration_days, price, status, whatsapp_number, payment_screenshot, enrolled_at, expires_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
      [
        session.id,
        planId || null,
        planName,
        days,
        price || 0,
        initialStatus,
        whatsappNumber || '',
        paymentScreenshot || '',
        isAutoApproved ? expiresAt : null,
        notes || (isAutoApproved ? 'Instant Access Pass Activated' : ''),
      ]
    );

    // Create user notification
    try {
      await execute(
        `INSERT INTO student_notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'subscription', 0, CURRENT_TIMESTAMP)`,
        [
          session.id,
          isAutoApproved ? 'Q-Bank Access Activated!' : 'Q-Bank Subscription Submitted',
          isAutoApproved
            ? `Your all-access pass for "${planName}" (${days} days) has been activated! Enjoy full access to all practice questions and simulations.`
            : `Your subscription request for "${planName}" has been received. Our admin team will verify your payment and activate your 100% full Q-Bank access within a few hours.`,
        ]
      );
    } catch (_) {}

    return NextResponse.json({
      success: true,
      activated: isAutoApproved,
      message: isAutoApproved
        ? `Access activated! You now have full access to the Q-Bank for ${days} days.`
        : 'Subscription request submitted successfully. Admin will review and activate your access.',
    });
  } catch (error: any) {
    console.error('QBank subscribe error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
