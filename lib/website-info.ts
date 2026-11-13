import prisma from '@/lib/db';

export interface WebsiteInfoRecord {
    id: string;
    websiteName: string;
    websiteUrl: string;
    tagline: string;
    contactEmail: string;
    dmcaEmail: string;
    companyName: string;
    country: string;
    address: string;
    foundedYear: string;
    updatedAt?: Date;
}

const DEFAULT_ID = 'default';

export const DEFAULT_WEBSITE_INFO: WebsiteInfoRecord = {
    id: DEFAULT_ID,
    websiteName: 'PNG Finder',
    websiteUrl: 'https://png-finder.com',
    tagline: 'Discover and download free, high-resolution transparent PNG images for your creative projects.',
    contactEmail: 'contact@png-finder.com',
    dmcaEmail: 'dmca@png-finder.com',
    companyName: 'PNG Finder',
    country: 'United States',
    address: '',
    foundedYear: '2025',
};

export async function getWebsiteInfo(): Promise<WebsiteInfoRecord> {
    try {
        if ('websiteInfo' in prisma && (prisma as any).websiteInfo) {
            const record = await (prisma as any).websiteInfo.findUnique({
                where: { id: DEFAULT_ID },
            });
            if (record) {
                return {
                    id: DEFAULT_ID,
                    websiteName: record.websiteName || DEFAULT_WEBSITE_INFO.websiteName,
                    websiteUrl: record.websiteUrl || DEFAULT_WEBSITE_INFO.websiteUrl,
                    tagline: record.tagline ?? DEFAULT_WEBSITE_INFO.tagline,
                    contactEmail: record.contactEmail || DEFAULT_WEBSITE_INFO.contactEmail,
                    dmcaEmail: record.dmcaEmail || DEFAULT_WEBSITE_INFO.dmcaEmail,
                    companyName: record.companyName || record.websiteName || DEFAULT_WEBSITE_INFO.companyName,
                    country: record.country || DEFAULT_WEBSITE_INFO.country,
                    address: record.address ?? DEFAULT_WEBSITE_INFO.address,
                    foundedYear: record.foundedYear || DEFAULT_WEBSITE_INFO.foundedYear,
                    updatedAt: record.updatedAt,
                };
            }
        } else {
            const rows = await prisma.$queryRaw<any[]>`
                SELECT id, websiteName, websiteUrl, tagline, contactEmail, dmcaEmail, companyName, country, address, foundedYear, updatedAt
                FROM WebsiteInfo
                WHERE id = ${DEFAULT_ID}
                LIMIT 1
            `;
            if (rows.length > 0) {
                const r = rows[0];
                return {
                    id: DEFAULT_ID,
                    websiteName: r.websiteName || DEFAULT_WEBSITE_INFO.websiteName,
                    websiteUrl: r.websiteUrl || DEFAULT_WEBSITE_INFO.websiteUrl,
                    tagline: r.tagline ?? DEFAULT_WEBSITE_INFO.tagline,
                    contactEmail: r.contactEmail || DEFAULT_WEBSITE_INFO.contactEmail,
                    dmcaEmail: r.dmcaEmail || DEFAULT_WEBSITE_INFO.dmcaEmail,
                    companyName: r.companyName || r.websiteName || DEFAULT_WEBSITE_INFO.companyName,
                    country: r.country || DEFAULT_WEBSITE_INFO.country,
                    address: r.address ?? DEFAULT_WEBSITE_INFO.address,
                    foundedYear: r.foundedYear || DEFAULT_WEBSITE_INFO.foundedYear,
                    updatedAt: r.updatedAt,
                };
            }
        }

        // Check if legacy Setting.websiteTitle exists
        const titleSetting = await prisma.setting.findUnique({
            where: { key: 'websiteTitle' },
        });
        if (titleSetting?.value) {
            return {
                ...DEFAULT_WEBSITE_INFO,
                websiteName: titleSetting.value,
                companyName: titleSetting.value,
            };
        }
    } catch (error) {
        console.error('Error reading WebsiteInfo:', error);
    }

    return DEFAULT_WEBSITE_INFO;
}

export async function saveWebsiteInfo(data: Partial<WebsiteInfoRecord>): Promise<WebsiteInfoRecord> {
    const current = await getWebsiteInfo();
    const next: WebsiteInfoRecord = {
        id: DEFAULT_ID,
        websiteName: (data.websiteName ?? current.websiteName).trim() || DEFAULT_WEBSITE_INFO.websiteName,
        websiteUrl: (data.websiteUrl ?? current.websiteUrl).trim() || DEFAULT_WEBSITE_INFO.websiteUrl,
        tagline: (data.tagline ?? current.tagline).trim(),
        contactEmail: (data.contactEmail ?? current.contactEmail).trim() || DEFAULT_WEBSITE_INFO.contactEmail,
        dmcaEmail: (data.dmcaEmail ?? current.dmcaEmail).trim() || DEFAULT_WEBSITE_INFO.dmcaEmail,
        companyName: (data.companyName ?? current.companyName).trim() || DEFAULT_WEBSITE_INFO.companyName,
        country: (data.country ?? current.country).trim() || DEFAULT_WEBSITE_INFO.country,
        address: (data.address ?? current.address).trim(),
        foundedYear: (data.foundedYear ?? current.foundedYear).trim() || DEFAULT_WEBSITE_INFO.foundedYear,
        updatedAt: new Date(),
    };

    if ('websiteInfo' in prisma && (prisma as any).websiteInfo) {
        await (prisma as any).websiteInfo.upsert({
            where: { id: DEFAULT_ID },
            update: {
                websiteName: next.websiteName,
                websiteUrl: next.websiteUrl,
                tagline: next.tagline,
                contactEmail: next.contactEmail,
                dmcaEmail: next.dmcaEmail,
                companyName: next.companyName,
                country: next.country,
                address: next.address,
                foundedYear: next.foundedYear,
            },
            create: {
                id: DEFAULT_ID,
                websiteName: next.websiteName,
                websiteUrl: next.websiteUrl,
                tagline: next.tagline,
                contactEmail: next.contactEmail,
                dmcaEmail: next.dmcaEmail,
                companyName: next.companyName,
                country: next.country,
                address: next.address,
                foundedYear: next.foundedYear,
            },
        });
    } else {
        const existing = await prisma.$queryRaw<any[]>`
            SELECT id FROM WebsiteInfo WHERE id = ${DEFAULT_ID} LIMIT 1
        `;

        if (existing.length > 0) {
            await prisma.$executeRaw`
                UPDATE WebsiteInfo
                SET websiteName = ${next.websiteName},
                    websiteUrl = ${next.websiteUrl},
                    tagline = ${next.tagline},
                    contactEmail = ${next.contactEmail},
                    dmcaEmail = ${next.dmcaEmail},
                    companyName = ${next.companyName},
                    country = ${next.country},
                    address = ${next.address},
                    foundedYear = ${next.foundedYear},
                    updatedAt = ${next.updatedAt}
                WHERE id = ${DEFAULT_ID}
            `;
        } else {
            await prisma.$executeRaw`
                INSERT INTO WebsiteInfo (id, websiteName, websiteUrl, tagline, contactEmail, dmcaEmail, companyName, country, address, foundedYear, updatedAt)
                VALUES (${DEFAULT_ID}, ${next.websiteName}, ${next.websiteUrl}, ${next.tagline}, ${next.contactEmail}, ${next.dmcaEmail}, ${next.companyName}, ${next.country}, ${next.address}, ${next.foundedYear}, ${next.updatedAt})
            `;
        }
    }

    // Keep legacy Setting.websiteTitle in sync
    try {
        await prisma.setting.upsert({
            where: { key: 'websiteTitle' },
            update: { value: next.websiteName },
            create: { key: 'websiteTitle', value: next.websiteName },
        });
    } catch {
        // Ignore if Setting table fails
    }

    return next;
}

