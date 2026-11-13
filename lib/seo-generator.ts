import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { getWebsiteInfo } from '@/lib/website-info';
import { slugify } from '@/lib/utils';

export interface SeoStats {
    pagesCount: number;
    imagesCount: number;
    collectionsCount: number;
    tagsCount: number;
    categoriesCount?: number;
    filesGenerated: string[];
}

export interface SeoSettingRecord {
    id: string;
    autoRegenerate: boolean;
    scheduleFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    scheduleTime: string; // "HH:mm"
    scheduleDayOfWeek: number; // 0-6
    scheduleDayOfMonth: number; // 1-28
    disallowAdminInRobots: boolean;
    includeImageXml: boolean;
    includeLlmsTxt: boolean;
    includeManifest: boolean;
    customRobotsRules: string;
    lastGeneratedAt: string | null;
    lastGeneratedTrigger: string | null;
    lastStats: SeoStats | null;
    nextScheduledAt?: string | null;
}

const DEFAULT_ID = 'default';

export const DEFAULT_SEO_SETTING: SeoSettingRecord = {
    id: DEFAULT_ID,
    autoRegenerate: true,
    scheduleFrequency: 'daily',
    scheduleTime: '00:00',
    scheduleDayOfWeek: 1,
    scheduleDayOfMonth: 1,
    disallowAdminInRobots: true,
    includeImageXml: true,
    includeLlmsTxt: true,
    includeManifest: true,
    customRobotsRules: '',
    lastGeneratedAt: null,
    lastGeneratedTrigger: null,
    lastStats: null,
};

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function parseTimeParts(timeStr: string): { hours: number; minutes: number } {
    const [h, m] = (timeStr || '00:00').split(':').map((n) => parseInt(n, 10));
    return {
        hours: Number.isFinite(h) && h >= 0 && h <= 23 ? h : 0,
        minutes: Number.isFinite(m) && m >= 0 && m <= 59 ? m : 0,
    };
}

/**
 * Returns the most recent scheduled slot <= now, and the next scheduled slot > now.
 */
export function getScheduleSlots(
    setting: Pick<SeoSettingRecord, 'scheduleFrequency' | 'scheduleTime' | 'scheduleDayOfWeek' | 'scheduleDayOfMonth'>,
    now = new Date()
): { mostRecentSlot: Date; nextSlot: Date } {
    const { hours, minutes } = parseTimeParts(setting.scheduleTime);

    if (setting.scheduleFrequency === 'hourly') {
        const slot = new Date(now);
        slot.setMinutes(minutes, 0, 0);
        if (slot > now) {
            slot.setHours(slot.getHours() - 1);
        }
        const next = new Date(slot);
        next.setHours(next.getHours() + 1);
        return { mostRecentSlot: slot, nextSlot: next };
    }

    if (setting.scheduleFrequency === 'daily') {
        const slot = new Date(now);
        slot.setHours(hours, minutes, 0, 0);
        if (slot > now) {
            slot.setDate(slot.getDate() - 1);
        }
        const next = new Date(slot);
        next.setDate(next.getDate() + 1);
        return { mostRecentSlot: slot, nextSlot: next };
    }

    if (setting.scheduleFrequency === 'weekly') {
        const targetDay = Math.min(6, Math.max(0, Number(setting.scheduleDayOfWeek ?? 1)));
        const slot = new Date(now);
        slot.setHours(hours, minutes, 0, 0);
        const currentDay = slot.getDay();
        let diff = currentDay - targetDay;
        if (diff < 0 || (diff === 0 && slot > now)) {
            diff += 7;
        }
        slot.setDate(slot.getDate() - diff);
        const next = new Date(slot);
        next.setDate(next.getDate() + 7);
        return { mostRecentSlot: slot, nextSlot: next };
    }

    // monthly
    const targetDate = Math.min(28, Math.max(1, Number(setting.scheduleDayOfMonth ?? 1)));
    const slot = new Date(now.getFullYear(), now.getMonth(), targetDate, hours, minutes, 0, 0);
    if (slot > now) {
        slot.setMonth(slot.getMonth() - 1);
    }
    const next = new Date(slot);
    next.setMonth(next.getMonth() + 1);
    return { mostRecentSlot: slot, nextSlot: next };
}

function normalizeRow(row: any): SeoSettingRecord {
    let parsedStats: SeoStats | null = null;
    if (row.lastStatsJson) {
        try {
            parsedStats = JSON.parse(row.lastStatsJson);
        } catch {
            parsedStats = null;
        }
    }

    const record: SeoSettingRecord = {
        id: DEFAULT_ID,
        autoRegenerate: row.autoRegenerate !== undefined ? Boolean(row.autoRegenerate) : true,
        scheduleFrequency: (row.scheduleFrequency as any) || 'daily',
        scheduleTime: row.scheduleTime || '00:00',
        scheduleDayOfWeek: Number(row.scheduleDayOfWeek ?? 1),
        scheduleDayOfMonth: Number(row.scheduleDayOfMonth ?? 1),
        disallowAdminInRobots: row.disallowAdminInRobots !== undefined ? Boolean(row.disallowAdminInRobots) : true,
        includeImageXml: row.includeImageXml !== undefined ? Boolean(row.includeImageXml) : true,
        includeLlmsTxt: row.includeLlmsTxt !== undefined ? Boolean(row.includeLlmsTxt) : true,
        includeManifest: row.includeManifest !== undefined ? Boolean(row.includeManifest) : true,
        customRobotsRules: row.customRobotsRules ?? '',
        lastGeneratedAt: row.lastGeneratedAt ? new Date(row.lastGeneratedAt).toISOString() : null,
        lastGeneratedTrigger: row.lastGeneratedTrigger ?? null,
        lastStats: parsedStats,
    };

    const { nextSlot } = getScheduleSlots(record);
    record.nextScheduledAt = record.autoRegenerate ? nextSlot.toISOString() : null;
    return record;
}

export async function getSeoSettings(): Promise<SeoSettingRecord> {
    try {
        if ('seoSetting' in prisma && (prisma as any).seoSetting) {
            const row = await (prisma as any).seoSetting.findUnique({
                where: { id: DEFAULT_ID },
            });
            if (row) return normalizeRow(row);
        } else {
            const rows = await prisma.$queryRaw<any[]>`
                SELECT * FROM SeoSetting WHERE id = ${DEFAULT_ID} LIMIT 1
            `;
            if (rows.length > 0) {
                return normalizeRow(rows[0]);
            }
        }
    } catch (error) {
        console.error('Error reading SeoSetting:', error);
    }

    const fallback = { ...DEFAULT_SEO_SETTING };
    const { nextSlot } = getScheduleSlots(fallback);
    fallback.nextScheduledAt = fallback.autoRegenerate ? nextSlot.toISOString() : null;
    return fallback;
}

export async function saveSeoSettings(data: Partial<SeoSettingRecord>): Promise<SeoSettingRecord> {
    const current = await getSeoSettings();
    const next: SeoSettingRecord = {
        ...current,
        autoRegenerate: data.autoRegenerate !== undefined ? Boolean(data.autoRegenerate) : current.autoRegenerate,
        scheduleFrequency: (data.scheduleFrequency as any) || current.scheduleFrequency,
        scheduleTime: data.scheduleTime !== undefined ? data.scheduleTime : current.scheduleTime,
        scheduleDayOfWeek: data.scheduleDayOfWeek !== undefined ? Number(data.scheduleDayOfWeek) : current.scheduleDayOfWeek,
        scheduleDayOfMonth: data.scheduleDayOfMonth !== undefined ? Number(data.scheduleDayOfMonth) : current.scheduleDayOfMonth,
        disallowAdminInRobots: data.disallowAdminInRobots !== undefined ? Boolean(data.disallowAdminInRobots) : current.disallowAdminInRobots,
        includeImageXml: data.includeImageXml !== undefined ? Boolean(data.includeImageXml) : current.includeImageXml,
        includeLlmsTxt: data.includeLlmsTxt !== undefined ? Boolean(data.includeLlmsTxt) : current.includeLlmsTxt,
        includeManifest: data.includeManifest !== undefined ? Boolean(data.includeManifest) : current.includeManifest,
        customRobotsRules: data.customRobotsRules !== undefined ? data.customRobotsRules : current.customRobotsRules,
        lastGeneratedAt: data.lastGeneratedAt !== undefined ? data.lastGeneratedAt : current.lastGeneratedAt,
        lastGeneratedTrigger: data.lastGeneratedTrigger !== undefined ? data.lastGeneratedTrigger : current.lastGeneratedTrigger,
        lastStats: data.lastStats !== undefined ? data.lastStats : current.lastStats,
    };

    const now = new Date();
    const lastGenDate = next.lastGeneratedAt ? new Date(next.lastGeneratedAt) : null;
    const statsJson = next.lastStats ? JSON.stringify(next.lastStats) : null;

    if ('seoSetting' in prisma && (prisma as any).seoSetting) {
        await (prisma as any).seoSetting.upsert({
            where: { id: DEFAULT_ID },
            update: {
                autoRegenerate: next.autoRegenerate,
                scheduleFrequency: next.scheduleFrequency,
                scheduleTime: next.scheduleTime,
                scheduleDayOfWeek: next.scheduleDayOfWeek,
                scheduleDayOfMonth: next.scheduleDayOfMonth,
                disallowAdminInRobots: next.disallowAdminInRobots,
                includeImageXml: next.includeImageXml,
                includeLlmsTxt: next.includeLlmsTxt,
                includeManifest: next.includeManifest,
                customRobotsRules: next.customRobotsRules,
                lastGeneratedAt: lastGenDate,
                lastGeneratedTrigger: next.lastGeneratedTrigger,
                lastStatsJson: statsJson,
            },
            create: {
                id: DEFAULT_ID,
                autoRegenerate: next.autoRegenerate,
                scheduleFrequency: next.scheduleFrequency,
                scheduleTime: next.scheduleTime,
                scheduleDayOfWeek: next.scheduleDayOfWeek,
                scheduleDayOfMonth: next.scheduleDayOfMonth,
                disallowAdminInRobots: next.disallowAdminInRobots,
                includeImageXml: next.includeImageXml,
                includeLlmsTxt: next.includeLlmsTxt,
                includeManifest: next.includeManifest,
                customRobotsRules: next.customRobotsRules,
                lastGeneratedAt: lastGenDate,
                lastGeneratedTrigger: next.lastGeneratedTrigger,
                lastStatsJson: statsJson,
            },
        });
    } else {
        const existing = await prisma.$queryRaw<any[]>`
            SELECT id FROM SeoSetting WHERE id = ${DEFAULT_ID} LIMIT 1
        `;
        if (existing.length > 0) {
            await prisma.$executeRaw`
                UPDATE SeoSetting
                SET autoRegenerate = ${next.autoRegenerate ? 1 : 0},
                    scheduleFrequency = ${next.scheduleFrequency},
                    scheduleTime = ${next.scheduleTime},
                    scheduleDayOfWeek = ${next.scheduleDayOfWeek},
                    scheduleDayOfMonth = ${next.scheduleDayOfMonth},
                    disallowAdminInRobots = ${next.disallowAdminInRobots ? 1 : 0},
                    includeImageXml = ${next.includeImageXml ? 1 : 0},
                    includeLlmsTxt = ${next.includeLlmsTxt ? 1 : 0},
                    includeManifest = ${next.includeManifest ? 1 : 0},
                    customRobotsRules = ${next.customRobotsRules},
                    lastGeneratedAt = ${lastGenDate},
                    lastGeneratedTrigger = ${next.lastGeneratedTrigger},
                    lastStatsJson = ${statsJson},
                    updatedAt = ${now}
                WHERE id = ${DEFAULT_ID}
            `;
        } else {
            await prisma.$executeRaw`
                INSERT INTO SeoSetting (
                    id, autoRegenerate, scheduleFrequency, scheduleTime, scheduleDayOfWeek, scheduleDayOfMonth,
                    disallowAdminInRobots, includeImageXml, includeLlmsTxt, includeManifest, customRobotsRules,
                    lastGeneratedAt, lastGeneratedTrigger, lastStatsJson, updatedAt
                ) VALUES (
                    ${DEFAULT_ID}, ${next.autoRegenerate ? 1 : 0}, ${next.scheduleFrequency}, ${next.scheduleTime},
                    ${next.scheduleDayOfWeek}, ${next.scheduleDayOfMonth}, ${next.disallowAdminInRobots ? 1 : 0},
                    ${next.includeImageXml ? 1 : 0}, ${next.includeLlmsTxt ? 1 : 0}, ${next.includeManifest ? 1 : 0},
                    ${next.customRobotsRules}, ${lastGenDate}, ${next.lastGeneratedTrigger}, ${statsJson}, ${now}
                )
            `;
        }
    }

    const { nextSlot } = getScheduleSlots(next);
    next.nextScheduledAt = next.autoRegenerate ? nextSlot.toISOString() : null;
    return next;
}

export async function generateAllSeoFiles(trigger: 'manual' | 'auto-schedule' = 'manual'): Promise<SeoSettingRecord> {
    const [info, seoSettings, publishedImages, collections] = await Promise.all([
        getWebsiteInfo(),
        getSeoSettings(),
        prisma.image.findMany({
            where: { status: 'published' },
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.collection.findMany({
            where: { status: 'published' },
            orderBy: { updatedAt: 'desc' },
        }),
    ]);

    const baseUrl = (info.websiteUrl || 'https://png-finder.com').replace(/\/+$/, '');
    const publicDir = path.join(process.cwd(), 'public');
    await fs.mkdir(publicDir, { recursive: true });
    // Remove obsolete categories sitemap if it exists on disk
    await fs.unlink(path.join(publicDir, 'sitemap-categories.xml')).catch(() => {});
    const nowIso = new Date().toISOString();
    const filesGenerated: string[] = [];

    // 1. sitemap-pages.xml (Static & Informational Pages)
    const staticPages = [
        { path: '', priority: '1.0', changefreq: 'daily' },
        { path: '/latest', priority: '0.9', changefreq: 'daily' },
        { path: '/collections', priority: '0.9', changefreq: 'daily' },
        { path: '/tags', priority: '0.8', changefreq: 'daily' },
        { path: '/about-us', priority: '0.7', changefreq: 'monthly' },
        { path: '/contact-us', priority: '0.6', changefreq: 'monthly' },
        { path: '/terms-of-service', priority: '0.5', changefreq: 'yearly' },
        { path: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
        { path: '/dmca-policy', priority: '0.5', changefreq: 'yearly' },
    ];

    const pagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
    .map(
        (p) => `  <url>
    <loc>${escapeXml(`${baseUrl}${p.path}`)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join('\n')}
</urlset>`;

    await fs.writeFile(path.join(publicDir, 'sitemap-pages.xml'), pagesXml, 'utf8');
    filesGenerated.push('/sitemap-pages.xml');

    // 2. sitemap-images.xml (Published PNG Image Pages + Google Image XML Extension)
    const imageNs = seoSettings.includeImageXml
        ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
        : '';

    const imagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}>
${publishedImages
    .map((img) => {
        const slug = slugify(img.name || img.filename || 'image');
        const pageUrl = `${baseUrl}/images/${img.id}${slug ? `-${slug}` : ''}`;
        const rawImgPath = img.previewPath || img.path || '';
        const fullImgUrl = rawImgPath.startsWith('http')
            ? rawImgPath
            : `${baseUrl}${rawImgPath.startsWith('/') ? '' : '/'}${rawImgPath}`;
        const lastMod = img.updatedAt ? new Date(img.updatedAt).toISOString() : nowIso;

        const imageExtensionBlock = seoSettings.includeImageXml
            ? `\n    <image:image>
      <image:loc>${escapeXml(fullImgUrl)}</image:loc>
      <image:title>${escapeXml(img.name || img.filename || 'PNG Image')}</image:title>${
          img.description || img.altText
              ? `\n      <image:caption>${escapeXml(img.description || img.altText || '')}</image:caption>`
              : ''
      }
    </image:image>`
            : '';

        return `  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageExtensionBlock}
  </url>`;
    })
    .join('\n')}
</urlset>`;

    await fs.writeFile(path.join(publicDir, 'sitemap-images.xml'), imagesXml, 'utf8');
    filesGenerated.push('/sitemap-images.xml');

    // 3. sitemap-collections.xml (Curated PNG Collections)
    const collectionsXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`${baseUrl}/collections`)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${collections
    .map((col) => {
        const colUrl = `${baseUrl}/collections/${col.slug}`;
        const lastMod = col.updatedAt ? new Date(col.updatedAt).toISOString() : nowIso;
        return `  <url>
    <loc>${escapeXml(colUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${col.isFeatured ? '0.9' : '0.8'}</priority>
  </url>`;
    })
    .join('\n')}
</urlset>`;

    await fs.writeFile(path.join(publicDir, 'sitemap-collections.xml'), collectionsXml, 'utf8');
    filesGenerated.push('/sitemap-collections.xml');

    // 4. sitemap-tags.xml (Unique Image Tags / Keywords Search Pages)
    const uniqueTagsMap = new Map<string, string>();
    for (const img of publishedImages) {
        const tags = Array.isArray(img.tags) ? (img.tags as string[]) : [];
        for (const rawTag of tags) {
            if (typeof rawTag === 'string') {
                const cleaned = rawTag.trim();
                const lower = cleaned.toLowerCase();
                if (cleaned && !uniqueTagsMap.has(lower)) {
                    uniqueTagsMap.set(lower, cleaned);
                }
            }
        }
    }
    const uniqueTags = Array.from(uniqueTagsMap.values());

    const tagsXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueTags
    .map((tag) => {
        const tagUrl = `${baseUrl}/search?q=${encodeURIComponent(tag)}`;
        return `  <url>
    <loc>${escapeXml(tagUrl)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    })
    .join('\n')}
</urlset>`;

    await fs.writeFile(path.join(publicDir, 'sitemap-tags.xml'), tagsXml, 'utf8');
    filesGenerated.push('/sitemap-tags.xml');

    // 5. Master Sitemap Index: sitemap.xml
    const subSitemaps = [
        'sitemap-pages.xml',
        'sitemap-images.xml',
        'sitemap-collections.xml',
        'sitemap-tags.xml',
    ];

    const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${subSitemaps
    .map(
        (file) => `  <sitemap>
    <loc>${escapeXml(`${baseUrl}/${file}`)}</loc>
    <lastmod>${nowIso}</lastmod>
  </sitemap>`
    )
    .join('\n')}
</sitemapindex>`;

    await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemapIndexXml, 'utf8');
    filesGenerated.unshift('/sitemap.xml');

    // 6. robots.txt
    const robotsLines = [
        `# robots.txt for ${info.websiteName}`,
        `# Generated at ${nowIso}`,
        'User-agent: *',
        'Allow: /',
    ];
    if (seoSettings.disallowAdminInRobots) {
        robotsLines.push('Disallow: /admin');
        robotsLines.push('Disallow: /api/');
    }
    if (seoSettings.customRobotsRules && seoSettings.customRobotsRules.trim()) {
        robotsLines.push('');
        robotsLines.push('# Custom Rules');
        robotsLines.push(seoSettings.customRobotsRules.trim());
    }
    robotsLines.push('');
    robotsLines.push(`Sitemap: ${baseUrl}/sitemap.xml`);
    robotsLines.push(`Sitemap: ${baseUrl}/sitemap-pages.xml`);
    robotsLines.push(`Sitemap: ${baseUrl}/sitemap-images.xml`);
    robotsLines.push(`Sitemap: ${baseUrl}/sitemap-collections.xml`);
    robotsLines.push(`Sitemap: ${baseUrl}/sitemap-tags.xml`);

    await fs.writeFile(path.join(publicDir, 'robots.txt'), robotsLines.join('\n') + '\n', 'utf8');
    filesGenerated.push('/robots.txt');

    // 7. llms.txt (AI Search & LLM Discovery File)
    if (seoSettings.includeLlmsTxt) {
        const topCollections = collections.slice(0, 25).map((c) => `- [${c.name}](${baseUrl}/collections/${c.slug})`);
        const topTags = uniqueTags.slice(0, 40).join(', ');
        const llmsContent = [
            `# ${info.websiteName}`,
            '',
            `> ${info.tagline}`,
            '',
            `Website: ${baseUrl}`,
            `Contact: ${info.contactEmail}`,
            '',
            '## Main Pages',
            `- [Home](${baseUrl}/)`,
            `- [Collections](${baseUrl}/collections)`,
            `- [About Us](${baseUrl}/about-us)`,
            `- [Contact Us](${baseUrl}/contact-us)`,
            `- [Terms of Service](${baseUrl}/terms-of-service)`,
            `- [Privacy Policy](${baseUrl}/privacy-policy)`,
            `- [DMCA Policy](${baseUrl}/dmca-policy)`,
            '',
            '## Sitemaps',
            `- [Master Sitemap Index](${baseUrl}/sitemap.xml)`,
            `- [Collections Sitemap (${collections.length} packs)](${baseUrl}/sitemap-collections.xml)`,
            `- [Images Sitemap (${publishedImages.length} PNGs)](${baseUrl}/sitemap-images.xml)`,
            `- [Tags Sitemap (${uniqueTags.length} tags)](${baseUrl}/sitemap-tags.xml)`,
            ...(topCollections.length > 0 ? ['', '## Curated Collections', ...topCollections] : []),
            ...(topTags ? ['', '## Popular Tags', topTags] : []),
            '',
        ].join('\n');

        await fs.writeFile(path.join(publicDir, 'llms.txt'), llmsContent, 'utf8');
        filesGenerated.push('/llms.txt');
    }

    // 8. manifest.webmanifest (Web App Manifest for Mobile & Technical SEO)
    if (seoSettings.includeManifest) {
        const manifest = {
            name: info.websiteName,
            short_name: info.websiteName,
            description: info.tagline,
            start_url: '/',
            display: 'standalone',
            background_color: '#0f172a',
            theme_color: '#3b82f6',
            icons: [
                {
                    src: '/favicon.ico',
                    sizes: 'any',
                    type: 'image/x-icon',
                },
            ],
        };
        await fs.writeFile(
            path.join(publicDir, 'manifest.webmanifest'),
            JSON.stringify(manifest, null, 2),
            'utf8'
        );
        filesGenerated.push('/manifest.webmanifest');
    }

    const stats: SeoStats = {
        pagesCount: staticPages.length,
        imagesCount: publishedImages.length,
        collectionsCount: collections.length,
        tagsCount: uniqueTags.length,
        categoriesCount: 0,
        filesGenerated,
    };

    return saveSeoSettings({
        lastGeneratedAt: nowIso,
        lastGeneratedTrigger: trigger,
        lastStats: stats,
    });
}

let isAutoCheckRunning = false;

/**
 * Checks if automatic scheduled SEO regeneration is due (because no manual or automatic
 * regeneration has occurred since the most recent scheduled time slot) and runs it if needed.
 */
export async function checkAndRunScheduledSeoGeneration(): Promise<boolean> {
    if (isAutoCheckRunning) return false;
    try {
        isAutoCheckRunning = true;
        const settings = await getSeoSettings();
        if (!settings.autoRegenerate) {
            return false;
        }

        const now = new Date();
        const { mostRecentSlot } = getScheduleSlots(settings, now);
        const lastGen = settings.lastGeneratedAt ? new Date(settings.lastGeneratedAt) : null;

        // If never generated, or last generated before the most recent scheduled time slot
        if (!lastGen || lastGen < mostRecentSlot) {
            await generateAllSeoFiles('auto-schedule');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error in scheduled SEO generation check:', error);
        return false;
    } finally {
        isAutoCheckRunning = false;
    }
}

