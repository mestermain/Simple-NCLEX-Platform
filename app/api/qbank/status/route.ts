import { NextResponse } from 'next/server';
import { getAuthFromRequest, checkUserPlatformAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const access = await checkUserPlatformAccess(session ? session.id : null);

    return NextResponse.json({
      success: true,
      hasAccess: access.hasAccess,
      status: access.status,
      daysRemaining: access.daysRemaining,
      isAdmin: access.isAdmin,
      isCourseEnrolled: access.isCourseEnrolled,
      isSubscribed: access.isSubscriber,
      planName: access.planName,
      expiresAt: access.expiresAt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
