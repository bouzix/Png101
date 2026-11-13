import { NextResponse } from 'next/server';
import {
    getCurrentAdminSession,
    getAllTeamMembers,
    getTeamMemberByEmail,
    getTeamMemberById,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    getSmtpConfig,
    saveSmtpConfig,
    sendTeamInviteEmail,
    TEAM_PERMISSIONS,
} from '@/lib/team';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin() {
    const session = await getCurrentAdminSession();
    if (!session.authenticated || session.role !== 'super_admin') {
        return null;
    }
    return session;
}

export async function GET() {
    const session = await requireSuperAdmin();
    if (!session) {
        return NextResponse.json(
            { error: 'Forbidden: Only the Super Admin can manage team members.' },
            { status: 403 }
        );
    }

    const [members, smtp] = await Promise.all([getAllTeamMembers(), getSmtpConfig()]);

    return NextResponse.json({
        members,
        availablePermissions: TEAM_PERMISSIONS,
        smtp,
    });
}

export async function POST(request: Request) {
    const session = await requireSuperAdmin();
    if (!session) {
        return NextResponse.json(
            { error: 'Forbidden: Only the Super Admin can add team members.' },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const { name, email, password, permissions, sendInvite = true } = body;

        if (!email || !email.trim()) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        if (!password || String(password).trim().length < 4) {
            return NextResponse.json(
                { error: 'Password must be at least 4 characters.' },
                { status: 400 }
            );
        }

        const existing = await getTeamMemberByEmail(email);
        if (existing) {
            return NextResponse.json(
                { error: 'A team member with this email already exists.' },
                { status: 409 }
            );
        }

        const validPermissions = Array.isArray(permissions) ? permissions.map(String) : [];

        const created = await createTeamMember({
            name: name || email.split('@')[0],
            email,
            passwordPlain: String(password).trim(),
            permissions: validPermissions,
        });

        const origin = new URL(request.url).origin;
        const loginUrl = `${origin}/team/login`;

        let emailResult = null;
        if (sendInvite) {
            emailResult = await sendTeamInviteEmail({
                name: created.name,
                email: created.email,
                passwordPlain: String(password).trim(),
                permissions: created.permissions,
                loginUrl,
            });
        }

        return NextResponse.json({
            success: true,
            member: created,
            loginUrl,
            emailResult,
        });
    } catch (error: any) {
        console.error('Create team member error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to create team member.' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    const session = await requireSuperAdmin();
    if (!session) {
        return NextResponse.json(
            { error: 'Forbidden: Only the Super Admin can update team settings.' },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();

        // Action 1: Save SMTP configuration
        if (body.action === 'save_smtp') {
            await saveSmtpConfig({
                host: String(body.host || '').trim(),
                port: Number(body.port || 587),
                secure: Boolean(body.secure),
                user: String(body.user || '').trim(),
                pass: String(body.pass || ''),
                fromEmail: String(body.fromEmail || 'noreply@png-finder.com').trim(),
                fromName: String(body.fromName || 'PNG Finder Admin').trim(),
            });
            return NextResponse.json({ success: true });
        }

        // Action 2: Resend Invite Email (with new or provided password)
        if (body.action === 'resend_invite') {
            const { id, password } = body;
            if (!id || !password) {
                return NextResponse.json(
                    { error: 'Member ID and password are required to send invite.' },
                    { status: 400 }
                );
            }

            const updated = await updateTeamMember(id, {
                passwordPlain: String(password).trim(),
            });
            if (!updated) {
                return NextResponse.json({ error: 'Team member not found.' }, { status: 404 });
            }

            const origin = new URL(request.url).origin;
            const loginUrl = `${origin}/team/login`;
            const emailResult = await sendTeamInviteEmail({
                name: updated.name,
                email: updated.email,
                passwordPlain: String(password).trim(),
                permissions: updated.permissions,
                loginUrl,
            });

            return NextResponse.json({
                success: true,
                member: updated,
                loginUrl,
                emailResult,
            });
        }

        // Action 3: Update team member fields (name, email, password, permissions, isActive)
        const { id, name, email, password, permissions, isActive } = body;
        if (!id) {
            return NextResponse.json({ error: 'Member ID is required.' }, { status: 400 });
        }

        const existing = await getTeamMemberById(id);
        if (!existing) {
            return NextResponse.json({ error: 'Team member not found.' }, { status: 404 });
        }

        const updated = await updateTeamMember(id, {
            name,
            email,
            passwordPlain: password ? String(password).trim() : undefined,
            permissions: Array.isArray(permissions) ? permissions.map(String) : undefined,
            isActive,
        });

        return NextResponse.json({
            success: true,
            member: updated,
        });
    } catch (error: any) {
        console.error('Update team member error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to update team member.' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    const session = await requireSuperAdmin();
    if (!session) {
        return NextResponse.json(
            { error: 'Forbidden: Only the Super Admin can delete team members.' },
            { status: 403 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Member ID is required.' }, { status: 400 });
        }

        await deleteTeamMember(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete team member error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to delete team member.' },
            { status: 500 }
        );
    }
}

