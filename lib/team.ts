import prisma from './db';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

export interface PermissionDef {
    key: string;
    label: string;
    description: string;
    group: 'Assets & Catalog' | 'Analytics' | 'Settings';
}

export const TEAM_PERMISSIONS: PermissionDef[] = [
    {
        key: 'upload_images',
        label: 'Upload Images & AI Metadata',
        description: 'Upload new PNGs, stage files, and use AI auto-metadata on the Upload page.',
        group: 'Assets & Catalog',
    },
    {
        key: 'edit_images',
        label: 'Edit Images',
        description: 'Edit titles, tags, alt text, descriptions, and categories of staged or published images.',
        group: 'Assets & Catalog',
    },
    {
        key: 'delete_images',
        label: 'Delete Images',
        description: 'Permanently delete staged or published images from the catalog.',
        group: 'Assets & Catalog',
    },
    {
        key: 'manage_collections',
        label: 'Manage Collections',
        description: 'Create, edit, and delete categories/collections.',
        group: 'Assets & Catalog',
    },
    {
        key: 'view_analytics',
        label: 'View Analytics',
        description: 'Access the Analytics dashboard, charts, and search intelligence.',
        group: 'Analytics',
    },
    {
        key: 'export_analytics',
        label: 'Export Analytics CSV',
        description: 'Download analytics reports as CSV files.',
        group: 'Analytics',
    },
    {
        key: 'manage_general_settings',
        label: 'General Settings & Legal Pages',
        description: 'Edit website branding, contact details, and legal/about pages.',
        group: 'Settings',
    },
    {
        key: 'manage_api_keys',
        label: 'Manage AI API Keys',
        description: 'View, add, edit, or switch active Google Gemini API keys.',
        group: 'Settings',
    },
    {
        key: 'manage_code_injection',
        label: 'Manage Code Injection',
        description: 'Edit custom Head, Body, and Footer HTML/scripts.',
        group: 'Settings',
    },
    {
        key: 'manage_data_seo',
        label: 'Data Management & SEO Sitemaps',
        description: 'Export/import backups and regenerate SEO sitemaps.',
        group: 'Settings',
    },
];

export interface TeamMemberRecord {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    permissions: string[];
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminSession {
    authenticated: boolean;
    role: 'super_admin' | 'team_member' | null;
    id?: string;
    name?: string;
    email?: string | null;
    permissions: string[];
}

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string;
}

const SMTP_SETTING_KEY = 'smtp_config_v1';

function parsePermissions(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function mapRow(row: any): TeamMemberRecord {
    return {
        id: row.id,
        name: row.name || '',
        email: row.email || '',
        passwordHash: row.passwordHash || '',
        permissions: parsePermissions(row.permissions),
        isActive: Boolean(row.isActive),
        lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt).toISOString() : null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    };
}

export async function getAllTeamMembers(): Promise<Omit<TeamMemberRecord, 'passwordHash'>[]> {
    const rows = await prisma.$queryRaw<any[]>`
        SELECT id, name, email, permissions, isActive, lastLoginAt, createdAt, updatedAt
        FROM TeamMember
        ORDER BY createdAt DESC
    `.catch(() => [] as any[]);

    return rows.map((r) => {
        const mapped = mapRow(r);
        const { passwordHash: _, ...safe } = mapped;
        return safe;
    });
}

export async function getTeamMemberById(id: string): Promise<TeamMemberRecord | null> {
    const rows = await prisma.$queryRaw<any[]>`
        SELECT id, name, email, passwordHash, permissions, isActive, lastLoginAt, createdAt, updatedAt
        FROM TeamMember
        WHERE id = ${id}
        LIMIT 1
    `.catch(() => [] as any[]);

    if (!rows || rows.length === 0) return null;
    return mapRow(rows[0]);
}

export async function getTeamMemberByEmail(email: string): Promise<TeamMemberRecord | null> {
    const cleanEmail = email.trim().toLowerCase();
    const rows = await prisma.$queryRaw<any[]>`
        SELECT id, name, email, passwordHash, permissions, isActive, lastLoginAt, createdAt, updatedAt
        FROM TeamMember
        WHERE LOWER(email) = ${cleanEmail}
        LIMIT 1
    `.catch(() => [] as any[]);

    if (!rows || rows.length === 0) return null;
    return mapRow(rows[0]);
}

export async function createTeamMember(input: {
    name: string;
    email: string;
    passwordPlain: string;
    permissions: string[];
}): Promise<Omit<TeamMemberRecord, 'passwordHash'>> {
    const id = crypto.randomUUID();
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.name.trim() || cleanEmail.split('@')[0];
    const passwordHash = await bcrypt.hash(input.passwordPlain, 10);
    const permissionsJson = JSON.stringify(input.permissions || []);
    const now = new Date();

    await prisma.$executeRaw`
        INSERT INTO TeamMember (id, name, email, passwordHash, permissions, isActive, createdAt, updatedAt)
        VALUES (${id}, ${cleanName}, ${cleanEmail}, ${passwordHash}, ${permissionsJson}, true, ${now}, ${now})
    `;

    return {
        id,
        name: cleanName,
        email: cleanEmail,
        permissions: input.permissions || [],
        isActive: true,
        lastLoginAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
}

export async function updateTeamMember(
    id: string,
    input: {
        name?: string;
        email?: string;
        passwordPlain?: string;
        permissions?: string[];
        isActive?: boolean;
    }
): Promise<Omit<TeamMemberRecord, 'passwordHash'> | null> {
    const existing = await getTeamMemberById(id);
    if (!existing) return null;

    const nextName = input.name !== undefined ? input.name.trim() : existing.name;
    const nextEmail = input.email !== undefined ? input.email.trim().toLowerCase() : existing.email;
    const nextPermissions = input.permissions !== undefined ? input.permissions : existing.permissions;
    const nextIsActive = input.isActive !== undefined ? input.isActive : existing.isActive;
    const nextPasswordHash =
        input.passwordPlain && input.passwordPlain.trim()
            ? await bcrypt.hash(input.passwordPlain.trim(), 10)
            : existing.passwordHash;
    const permissionsJson = JSON.stringify(nextPermissions);
    const now = new Date();

    await prisma.$executeRaw`
        UPDATE TeamMember
        SET name = ${nextName},
            email = ${nextEmail},
            passwordHash = ${nextPasswordHash},
            permissions = ${permissionsJson},
            isActive = ${nextIsActive},
            updatedAt = ${now}
        WHERE id = ${id}
    `;

    const updated = await getTeamMemberById(id);
    if (!updated) return null;
    const { passwordHash: _, ...safe } = updated;
    return safe;
}

export async function deleteTeamMember(id: string): Promise<boolean> {
    await prisma.$executeRaw`
        DELETE FROM TeamMember WHERE id = ${id}
    `;
    return true;
}

export async function recordTeamMemberLogin(id: string): Promise<void> {
    const now = new Date();
    await prisma.$executeRaw`
        UPDATE TeamMember SET lastLoginAt = ${now} WHERE id = ${id}
    `.catch(() => {});
}

export async function getCurrentAdminSession(): Promise<AdminSession> {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth_token')?.value;
        const teamMemberId = cookieStore.get('team_member_id')?.value;

        if (authToken === 'authenticated') {
            return {
                authenticated: true,
                role: 'super_admin',
                name: 'Super Admin',
                email: null,
                permissions: ['*'],
            };
        }

        if (authToken === 'team_member' && teamMemberId) {
            const member = await getTeamMemberById(teamMemberId);
            if (member && member.isActive) {
                return {
                    authenticated: true,
                    role: 'team_member',
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    permissions: member.permissions,
                };
            }
        }

        return {
            authenticated: false,
            role: null,
            permissions: [],
        };
    } catch {
        return {
            authenticated: false,
            role: null,
            permissions: [],
        };
    }
}

export function hasPermission(session: AdminSession, permission: string): boolean {
    if (!session.authenticated) return false;
    if (session.role === 'super_admin') return true;
    if (session.permissions.includes('*')) return true;
    return session.permissions.includes(permission);
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
    const defaults: SmtpConfig = {
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@png-finder.com',
        fromName: process.env.SMTP_FROM_NAME || 'PNG Finder Admin',
    };

    try {
        const setting = await prisma.setting.findUnique({ where: { key: SMTP_SETTING_KEY } });
        if (setting?.value) {
            const parsed = JSON.parse(setting.value);
            return {
                host: parsed.host ?? defaults.host,
                port: Number(parsed.port ?? defaults.port),
                secure: Boolean(parsed.secure ?? defaults.secure),
                user: parsed.user ?? defaults.user,
                pass: parsed.pass ?? defaults.pass,
                fromEmail: parsed.fromEmail ?? defaults.fromEmail,
                fromName: parsed.fromName ?? defaults.fromName,
            };
        }
    } catch {
        // Ignore parse error
    }

    return defaults;
}

export async function saveSmtpConfig(config: SmtpConfig): Promise<void> {
    await prisma.setting.upsert({
        where: { key: SMTP_SETTING_KEY },
        update: { value: JSON.stringify(config) },
        create: { key: SMTP_SETTING_KEY, value: JSON.stringify(config) },
    });
}

export async function sendTeamInviteEmail(params: {
    name: string;
    email: string;
    passwordPlain: string;
    permissions: string[];
    loginUrl: string;
}): Promise<{
    sent: boolean;
    mode: 'smtp' | 'test_preview' | 'manual_only';
    previewUrl?: string | null;
    error?: string;
}> {
    const smtp = await getSmtpConfig();
    const permLabels = params.permissions
        .map((key) => TEAM_PERMISSIONS.find((p) => p.key === key)?.label || key);

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #1e293b;">
            <h2 style="margin-top: 0; color: #3b82f6; font-size: 22px;">You've Been Invited to the PNG Finder Team</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                Hi <strong>${params.name || params.email}</strong>, the Super Admin has created a team account for you on PNG Finder.
                Use the credentials below to sign in to the Team Portal:
            </p>
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #334155;">
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #94a3b8;">
                    <strong style="color: #f8fafc;">Team Login URL:</strong><br/>
                    <a href="${params.loginUrl}" style="color: #60a5fa; text-decoration: none;">${params.loginUrl}</a>
                </p>
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #94a3b8;">
                    <strong style="color: #f8fafc;">Email:</strong> <code style="color: #38bdf8;">${params.email}</code>
                </p>
                <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                    <strong style="color: #f8fafc;">Temporary Password:</strong> <code style="color: #34d399;">${params.passwordPlain}</code>
                </p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                Granted Permissions:
            </p>
            <ul style="color: #cbd5e1; font-size: 13px; padding-left: 20px; margin-top: 0;">
                ${permLabels.map((l) => `<li style="margin-bottom: 4px;">${l}</li>`).join('')}
            </ul>
            <div style="margin-top: 28px;">
                <a href="${params.loginUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px;">
                    Log In to Team Dashboard →
                </a>
            </div>
        </div>
    `;

    try {
        if (smtp.host && smtp.user && smtp.pass) {
            const transporter = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port || 587,
                secure: smtp.secure,
                auth: {
                    user: smtp.user,
                    pass: smtp.pass,
                },
            });

            await transporter.sendMail({
                from: `"${smtp.fromName || 'PNG Finder Admin'}" <${smtp.fromEmail || smtp.user}>`,
                to: params.email,
                subject: 'Your PNG Finder Team Account Credentials',
                html: htmlBody,
            });

            return { sent: true, mode: 'smtp' };
        }

        // Fallback to Ethereal test SMTP account on localhost if real SMTP is not configured
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        const info = await transporter.sendMail({
            from: `"${smtp.fromName || 'PNG Finder Admin'}" <${smtp.fromEmail || 'noreply@png-finder.com'}>`,
            to: params.email,
            subject: 'Your PNG Finder Team Account Credentials',
            html: htmlBody,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info) || null;
        return { sent: true, mode: 'test_preview', previewUrl };
    } catch (error: any) {
        console.error('Failed to send invite email:', error);
        return {
            sent: false,
            mode: 'manual_only',
            error: error?.message || 'SMTP connection failed',
        };
    }
}
