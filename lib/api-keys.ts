import crypto from 'crypto';
import prisma from '@/lib/db';

export type ModelVersion = '2.5' | '3.0' | '3.8';

export interface ApiKeyRecord {
    id: string;
    name: string;
    key: string;
    modelVersion: ModelVersion;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

function normalizeModelVersion(v: any): ModelVersion {
    if (v === '3.0' || v === '3.8' || v === '2.5') return v;
    return '2.5';
}

function normalizeRow(row: any): ApiKeyRecord {
    return {
        ...row,
        modelVersion: normalizeModelVersion(row.modelVersion),
        isActive: Boolean(row.isActive),
    };
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
    const rows = await prisma.$queryRaw<any[]>`
        SELECT id, name, \`key\`, modelVersion, isActive, createdAt, updatedAt
        FROM ApiKey
        ORDER BY isActive DESC, createdAt DESC
    `;
    return rows.map(normalizeRow);
}

export async function getActiveApiKey(): Promise<ApiKeyRecord | null> {
    const rows = await prisma.$queryRaw<any[]>`
        SELECT id, name, \`key\`, modelVersion, isActive, createdAt, updatedAt
        FROM ApiKey
        WHERE isActive = 1
        LIMIT 1
    `;
    return rows.length > 0 ? normalizeRow(rows[0]) : null;
}

export async function createApiKey(data: {
    name: string;
    key: string;
    modelVersion?: string;
    isActive?: boolean;
}): Promise<ApiKeyRecord> {
    const trimmedName = data.name.trim();
    const trimmedKey = data.key.trim();
    const modelVersion = normalizeModelVersion(data.modelVersion);

    const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM ApiKey
    `;
    const existingCount = Number(countRows[0]?.count ?? 0);
    const shouldActivate = existingCount === 0 ? true : Boolean(data.isActive);
    const id = crypto.randomUUID();
    const now = new Date();

    if (shouldActivate) {
        await prisma.$executeRaw`UPDATE ApiKey SET isActive = 0 WHERE isActive = 1`;
    }

    await prisma.$executeRaw`
        INSERT INTO ApiKey (id, name, \`key\`, modelVersion, isActive, createdAt, updatedAt)
        VALUES (${id}, ${trimmedName}, ${trimmedKey}, ${modelVersion}, ${shouldActivate ? 1 : 0}, ${now}, ${now})
    `;

    return {
        id,
        name: trimmedName,
        key: trimmedKey,
        modelVersion,
        isActive: shouldActivate,
        createdAt: now,
        updatedAt: now,
    };
}

export async function updateApiKey(
    id: string,
    data: { name?: string; key?: string; modelVersion?: string; isActive?: boolean }
): Promise<ApiKeyRecord> {
    const now = new Date();
    if (data.isActive === true) {
        await prisma.$executeRaw`UPDATE ApiKey SET isActive = 0 WHERE id != ${id}`;
    }

    const existingRows = await prisma.$queryRaw<any[]>`
        SELECT id, name, \`key\`, modelVersion, isActive, createdAt, updatedAt
        FROM ApiKey
        WHERE id = ${id}
        LIMIT 1
    `;
    if (existingRows.length === 0) {
        throw new Error('API key not found');
    }

    const existing = normalizeRow(existingRows[0]);
    const nextName = data.name !== undefined ? data.name.trim() : existing.name;
    const nextKey = data.key !== undefined ? data.key.trim() : existing.key;
    const nextModelVersion =
        data.modelVersion !== undefined
            ? normalizeModelVersion(data.modelVersion)
            : existing.modelVersion;
    const nextActive = data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive;

    await prisma.$executeRaw`
        UPDATE ApiKey
        SET name = ${nextName},
            \`key\` = ${nextKey},
            modelVersion = ${nextModelVersion},
            isActive = ${nextActive ? 1 : 0},
            updatedAt = ${now}
        WHERE id = ${id}
    `;

    return {
        ...existing,
        name: nextName,
        key: nextKey,
        modelVersion: nextModelVersion,
        isActive: nextActive,
        updatedAt: now,
    };
}

export async function deleteApiKey(id: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM ApiKey WHERE id = ${id}`;
}
