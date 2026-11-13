import { NextResponse } from 'next/server';
import { getCurrentAdminSession, TEAM_PERMISSIONS } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getCurrentAdminSession();
    return NextResponse.json({
        ...session,
        availablePermissions: TEAM_PERMISSIONS,
    });
}

