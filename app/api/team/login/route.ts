import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getTeamMemberByEmail, recordTeamMemberLogin } from '@/lib/team';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required.' },
                { status: 400 }
            );
        }

        const member = await getTeamMemberByEmail(email);

        if (!member) {
            return NextResponse.json(
                { success: false, error: 'Invalid email or password.' },
                { status: 401 }
            );
        }

        if (!member.isActive) {
            return NextResponse.json(
                { success: false, error: 'This team account has been deactivated by the Super Admin.' },
                { status: 403 }
            );
        }

        const isValid = await bcrypt.compare(password, member.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { success: false, error: 'Invalid email or password.' },
                { status: 401 }
            );
        }

        await recordTeamMemberLogin(member.id);

        const cookieStore = await cookies();
        cookieStore.set('auth_token', 'team_member', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });
        cookieStore.set('team_member_id', member.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });

        // Determine the best default landing route based on their permissions
        const perms = member.permissions || [];
        let redirectTo = '/admin/dashboard';
        if (perms.includes('upload_images')) {
            redirectTo = '/admin/dashboard';
        } else if (perms.includes('edit_images') || perms.includes('delete_images')) {
            redirectTo = '/admin/dashboard/files';
        } else if (perms.includes('manage_collections')) {
            redirectTo = '/admin/dashboard/collections';
        } else if (perms.includes('view_analytics')) {
            redirectTo = '/admin/dashboard/analytics';
        } else if (perms.includes('manage_general_settings')) {
            redirectTo = '/admin/dashboard/settings';
        } else if (perms.includes('manage_api_keys')) {
            redirectTo = '/admin/dashboard/settings/api-keys';
        } else if (perms.includes('manage_code_injection')) {
            redirectTo = '/admin/dashboard/settings/code-injection';
        } else if (perms.includes('manage_data_seo')) {
            redirectTo = '/admin/dashboard/settings/data-management';
        }

        return NextResponse.json({
            success: true,
            redirectTo,
            member: {
                id: member.id,
                name: member.name,
                email: member.email,
                permissions: member.permissions,
            },
        });
    } catch (error) {
        console.error('Team login error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

