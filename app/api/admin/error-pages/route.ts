import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getErrorPagesConfig, saveErrorPagesConfig } from '@/lib/error-pages';
import { getCurrentAdminSession } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const config = await getErrorPagesConfig();
        return NextResponse.json(config);
    } catch (error: any) {
        console.error('Failed to get error pages config:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get error pages config' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getCurrentAdminSession();
        if (
            !session.authenticated ||
            (session.role !== 'super_admin' &&
                !session.permissions.includes('*') &&
                !session.permissions.includes('manage_general_settings'))
        ) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const updated = await saveErrorPagesConfig(body);

        // Revalidate error and not-found pages across the site
        revalidatePath('/', 'layout');

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('Failed to save error pages config:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save error pages config' },
            { status: 500 }
        );
    }
}

