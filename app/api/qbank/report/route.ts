import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const body = await req.json();

    const { questionId, issueType, details } = body;

    if (!questionId) {
      return NextResponse.json({ success: false, message: 'Question ID required' }, { status: 400 });
    }

    const userId = session ? session.id : null;
    const userEmail = session ? session.email : 'guest@simplenclex.com';
    const issueSummary = `${issueType || 'General Issue'}: ${details || 'No additional details provided'}`;

    // Record in activity_logs for review by admin
    await execute(
      `INSERT INTO activity_logs (action, details, user_id, user_email, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        'question_reported',
        JSON.stringify({
          questionId,
          issueType: issueType || 'Typo / Discrepancy',
          details: details || '',
          reportedBy: userEmail,
        }),
        userId,
        userEmail,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your feedback has been forwarded to our nursing clinical review team.',
    });
  } catch (error: any) {
    console.error('Report question error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
