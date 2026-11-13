import prisma from '@/lib/db';

export interface CodeInjectionRecord {
    id: string;
    headCode: string;
    bodyCode: string;
    footerCode: string;
    updatedAt?: Date;
}

const DEFAULT_ID = 'default';

export async function getCodeInjection(): Promise<CodeInjectionRecord> {
    try {
        if ('codeInjection' in prisma && (prisma as any).codeInjection) {
            const record = await (prisma as any).codeInjection.findUnique({
                where: { id: DEFAULT_ID },
            });
            return {
                id: DEFAULT_ID,
                headCode: record?.headCode ?? '',
                bodyCode: record?.bodyCode ?? '',
                footerCode: record?.footerCode ?? '',
                updatedAt: record?.updatedAt,
            };
        }

        const rows = await prisma.$queryRaw<any[]>`
            SELECT id, headCode, bodyCode, footerCode, updatedAt
            FROM CodeInjection
            WHERE id = ${DEFAULT_ID}
            LIMIT 1
        `;

        if (rows.length > 0) {
            return {
                id: rows[0].id,
                headCode: rows[0].headCode ?? '',
                bodyCode: rows[0].bodyCode ?? '',
                footerCode: rows[0].footerCode ?? '',
                updatedAt: rows[0].updatedAt,
            };
        }
    } catch (error) {
        console.error('Error reading CodeInjection:', error);
    }

    return {
        id: DEFAULT_ID,
        headCode: '',
        bodyCode: '',
        footerCode: '',
    };
}

export async function saveCodeInjection(data: {
    headCode?: string;
    bodyCode?: string;
    footerCode?: string;
}): Promise<CodeInjectionRecord> {
    const headCode = data.headCode ?? '';
    const bodyCode = data.bodyCode ?? '';
    const footerCode = data.footerCode ?? '';
    const now = new Date();

    if ('codeInjection' in prisma && (prisma as any).codeInjection) {
        const saved = await (prisma as any).codeInjection.upsert({
            where: { id: DEFAULT_ID },
            update: { headCode, bodyCode, footerCode },
            create: { id: DEFAULT_ID, headCode, bodyCode, footerCode },
        });
        return {
            id: saved.id,
            headCode: saved.headCode ?? '',
            bodyCode: saved.bodyCode ?? '',
            footerCode: saved.footerCode ?? '',
            updatedAt: saved.updatedAt,
        };
    }

    const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM CodeInjection WHERE id = ${DEFAULT_ID} LIMIT 1
    `;

    if (existing.length > 0) {
        await prisma.$executeRaw`
            UPDATE CodeInjection
            SET headCode = ${headCode},
                bodyCode = ${bodyCode},
                footerCode = ${footerCode},
                updatedAt = ${now}
            WHERE id = ${DEFAULT_ID}
        `;
    } else {
        await prisma.$executeRaw`
            INSERT INTO CodeInjection (id, headCode, bodyCode, footerCode, updatedAt)
            VALUES (${DEFAULT_ID}, ${headCode}, ${bodyCode}, ${footerCode}, ${now})
        `;
    }

    return {
        id: DEFAULT_ID,
        headCode,
        bodyCode,
        footerCode,
        updatedAt: now,
    };
}

