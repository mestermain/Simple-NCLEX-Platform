import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getRecentAuditLogs } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const logs = await getRecentAuditLogs(50);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
