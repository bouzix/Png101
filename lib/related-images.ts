import prisma from '@/lib/db';

/**
 * Words that appear on almost every PNG/logo asset and should not by themselves
 * make two completely unrelated images "related" or outrank specific subject/brand tags.
 */
const STOP_WORDS = new Set([
    'png',
    'transparent',
    'background',
    'image',
    'images',
    'picture',
    'pictures',
    'photo',
    'photos',
    'file',
    'files',
    'free',
    'download',
    'hd',
    'high',
    'quality',
    'resolution',
    'vector',
    'clipart',
    'art',
    'graphic',
    'graphics',
    'design',
    'illustration',
    'isolated',
    'cutout',
    'no',
    'with',
    'and',
    'the',
    'for',
    'of',
    'in',
    'on',
    'to',
    'a',
    'an',
]);

/**
 * Broad format/type tags that carry very low weight on their own (e.g. "logo", "icon")
 * compared to specific subject/brand/category tags (e.g. "google chrome", "google", "browser").
 */
const LOW_SIGNAL_TERMS = new Set([
    'logo',
    'logos',
    'icon',
    'icons',
    'symbol',
    'symbols',
    'emblem',
    'emblems',
    'badge',
    'badges',
    'sign',
    'signs',
    'mark',
    'brand',
    'brands',
    'official',
    'white',
    'black',
    'red',
    'blue',
    'green',
    'yellow',
    'orange',
    'purple',
    'silver',
    'gold',
    'dark',
    'light',
    'flat',
    '3d',
    'modern',
    'vintage',
    'classic',
    'new',
    'old',
    'circle',
    'round',
    'square',
]);

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractSignificantTokens(text: string): string[] {
    const norm = normalizeText(text);
    if (!norm) return [];
    const parts = norm.split(/[\s-]+/);
    const tokens: string[] = [];
    for (const part of parts) {
        if (part.length < 2) continue;
        if (STOP_WORDS.has(part)) continue;
        // Skip random hash-like suffixes from filenames (e.g. "9atxc75")
        if (/^[a-z0-9]{7}$/.test(part) && /\d/.test(part) && /[a-z]/.test(part)) continue;
        tokens.push(part);
    }
    return Array.from(new Set(tokens));
}

function isGenericOnlyTag(normTag: string): boolean {
    const words = normTag.split(/[\s-]+/).filter(Boolean);
    if (words.length === 0) return true;
    return words.every((w) => STOP_WORDS.has(w) || LOW_SIGNAL_TERMS.has(w));
}

export interface RelatedImagesResult {
    images: {
        id: string;
        name: string | null;
        filename: string;
        path: string;
        previewPath?: string | null;
        createdAt: Date;
        score: number;
    }[];
    total: number;
    hasMore: boolean;
}

/**
 * Fetches and ranks related images for a given image ID using a multi-tier relevance hierarchy:
 * Tier 1: Exact subject phrase & multi-keyword subject matches (e.g. "Google Chrome")
 * Tier 2: Specific brand/entity tags & rare tags via Inverse Document Frequency (IDF) (e.g. "Google")
 * Tier 3: Category / Subcategory hierarchy & mid-frequency concept tags (e.g. "Browser")
 * Tier 4: Generic style/type overlap only as a minor tie-breaker
 */
export async function getRankedRelatedImages(
    imageId: string,
    options?: { limit?: number; offset?: number }
): Promise<RelatedImagesResult> {
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;

    const currentImage = await prisma.image.findUnique({
        where: { id: imageId },
        select: {
            id: true,
            name: true,
            filename: true,
            tags: true,
            categories: {
                select: {
                    categoryId: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                            parentId: true,
                        },
                    },
                },
            },
        },
    });

    if (!currentImage) {
        return { images: [], total: 0, hasMore: false };
    }

    const rawCurrentTags = Array.isArray(currentImage.tags) ? (currentImage.tags as string[]) : [];
    const currentTags = Array.from(
        new Set(
            rawCurrentTags
                .filter((t): t is string => typeof t === 'string')
                .map(normalizeText)
                .filter(Boolean)
        )
    );

    // Extract subject tokens from the current image's name and meaningful tags
    const titleTokens = extractSignificantTokens(currentImage.name || '');
    const specificTitleTokens = titleTokens.filter((t) => !LOW_SIGNAL_TERMS.has(t));

    // Tokens from all non-stop tags
    const tagTokensSet = new Set<string>();
    for (const tag of currentTags) {
        for (const tok of extractSignificantTokens(tag)) {
            tagTokensSet.add(tok);
        }
    }

    // If current image has neither tags nor meaningful title tokens nor categories, return empty
    const currentCategoryIds = new Set<string>();
    const currentParentCategoryIds = new Set<string>();
    for (const ic of currentImage.categories) {
        currentCategoryIds.add(ic.categoryId);
        if (ic.category?.parentId) {
            currentParentCategoryIds.add(ic.category.parentId);
        }
    }

    if (currentTags.length === 0 && specificTitleTokens.length === 0 && currentCategoryIds.size === 0) {
        return { images: [], total: 0, hasMore: false };
    }

    // Fetch all published candidate images
    const allPublished = await prisma.image.findMany({
        where: {
            status: 'published',
            id: { not: imageId },
        },
        select: {
            id: true,
            name: true,
            filename: true,
            path: true,
            previewPath: true,
            tags: true,
            luminance: true,
            contrastBgDark: true,
            contrastBgLight: true,
            createdAt: true,
            categories: {
                select: {
                    categoryId: true,
                    category: {
                        select: {
                            id: true,
                            parentId: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const totalDocs = Math.max(1, allPublished.length + 1);

    // Build Document Frequency (DF) maps for tags and tokens across the catalog
    // so rare tags like "google chrome" or "google" automatically outweigh common tags like "logo"
    const tagDocFreq = new Map<string, number>();
    const tokenDocFreq = new Map<string, number>();

    const incrementFreq = (map: Map<string, number>, key: string) => {
        map.set(key, (map.get(key) || 0) + 1);
    };

    // Include current image in DF counts
    for (const t of currentTags) incrementFreq(tagDocFreq, t);
    for (const tok of tagTokensSet) incrementFreq(tokenDocFreq, tok);

    // Pre-process candidates
    const candidates = allPublished.map((img) => {
        const rawTags = Array.isArray(img.tags) ? (img.tags as string[]) : [];
        const normTags = Array.from(
            new Set(
                rawTags
                    .filter((t): t is string => typeof t === 'string')
                    .map(normalizeText)
                    .filter(Boolean)
            )
        );

        const candidateTitleTokens = extractSignificantTokens(img.name || '');
        const candidateTokenSet = new Set<string>(candidateTitleTokens);
        for (const t of normTags) {
            for (const tok of extractSignificantTokens(t)) {
                candidateTokenSet.add(tok);
            }
        }

        for (const t of normTags) incrementFreq(tagDocFreq, t);
        for (const tok of candidateTokenSet) incrementFreq(tokenDocFreq, tok);

        return {
            img,
            normTags,
            normTagSet: new Set(normTags),
            candidateTitleTokens,
            candidateTokenSet,
        };
    });

    // Helper: Inverse Document Frequency weight (higher for rare terms, lower for ubiquitous terms)
    const getIdf = (df: number) => Math.log(1 + totalDocs / Math.max(1, df));

    // Identify the core subject phrase from the current image's title (e.g. "google chrome" from "Google Chrome Logo PNG")
    const subjectPhrase = specificTitleTokens.join(' ');

    const scoredCandidates: {
        id: string;
        name: string | null;
        filename: string;
        path: string;
        previewPath?: string | null;
        luminance?: string | null;
        contrastBgDark?: string | null;
        contrastBgLight?: string | null;
        createdAt: Date;
        score: number;
    }[] = [];

    for (const cand of candidates) {
        let score = 0;
        let meaningfulMatches = 0;

        // 1. Exact Tag Matches (weighted by rarity / IDF + multi-word phrase bonus)
        for (const tag of currentTags) {
            if (cand.normTagSet.has(tag)) {
                const isGeneric = isGenericOnlyTag(tag);
                const idf = getIdf(tagDocFreq.get(tag) || 1);
                const wordCount = tag.split(/\s+/).length;

                if (isGeneric) {
                    // Generic tags like "logo", "png", "icon" get only a tiny tie-breaker weight
                    // and do NOT count as a meaningful match on their own
                    score += 0.25 * idf;
                } else {
                    // Specific tags get strong IDF-scaled weight, boosted when multi-word (e.g. "google chrome")
                    const multiWordMultiplier = wordCount >= 2 ? 2.2 : 1.0;
                    score += 6.0 * idf * multiWordMultiplier;
                    meaningfulMatches += 1;
                }
            }
        }

        // 2. Subject Phrase & Specific Title Token Hierarchy
        // Ensures: "Google Chrome" (all subject tokens) > "Google" (partial brand token) > "Browser" (concept tag)
        if (specificTitleTokens.length > 0) {
            let matchedSubjectTokensInTitle = 0;
            let matchedSubjectTokensAnywhere = 0;

            const candTitleTokenSet = new Set(cand.candidateTitleTokens);

            for (const tok of specificTitleTokens) {
                const tokIdf = getIdf(tokenDocFreq.get(tok) || 1);

                if (candTitleTokenSet.has(tok)) {
                    matchedSubjectTokensInTitle += 1;
                    matchedSubjectTokensAnywhere += 1;
                    score += 5.0 * tokIdf;
                    meaningfulMatches += 1;
                } else if (cand.candidateTokenSet.has(tok)) {
                    matchedSubjectTokensAnywhere += 1;
                    score += 3.0 * tokIdf;
                    meaningfulMatches += 1;
                }
            }

            // Tier 1 Synergy Bonus: Candidate matches ALL specific subject words (e.g. both "google" AND "chrome")
            if (
                specificTitleTokens.length >= 2 &&
                matchedSubjectTokensAnywhere === specificTitleTokens.length
            ) {
                score += 25.0;
            }
            if (
                specificTitleTokens.length >= 2 &&
                matchedSubjectTokensInTitle === specificTitleTokens.length
            ) {
                score += 15.0;
            }

            // Exact subject phrase match in candidate title or tags
            if (subjectPhrase.length >= 3) {
                const candNormName = normalizeText(cand.img.name || '');
                if (candNormName.includes(subjectPhrase) || cand.normTagSet.has(subjectPhrase)) {
                    score += 20.0;
                    meaningfulMatches += 1;
                }
            }
        }

        // 3. Sub-token overlap across non-generic tag tokens (e.g. tag "google chrome" matching tag "google")
        for (const tok of tagTokensSet) {
            if (LOW_SIGNAL_TERMS.has(tok) || STOP_WORDS.has(tok)) continue;
            // Avoid double counting if already scored in specificTitleTokens
            if (specificTitleTokens.includes(tok)) continue;

            if (cand.candidateTokenSet.has(tok)) {
                const tokIdf = getIdf(tokenDocFreq.get(tok) || 1);
                score += 2.5 * tokIdf;
                meaningfulMatches += 1;
            }
        }

        // 4. Category & Parent Category Hierarchy Bonus
        if (currentCategoryIds.size > 0 || currentParentCategoryIds.size > 0) {
            let exactCategoryMatch = false;
            let parentCategoryMatch = false;

            for (const ic of cand.img.categories) {
                if (currentCategoryIds.has(ic.categoryId)) {
                    exactCategoryMatch = true;
                } else if (
                    (ic.category?.parentId && currentCategoryIds.has(ic.category.parentId)) ||
                    (ic.category?.parentId && currentParentCategoryIds.has(ic.category.parentId)) ||
                    currentParentCategoryIds.has(ic.categoryId)
                ) {
                    parentCategoryMatch = true;
                }
            }

            if (exactCategoryMatch) {
                score += 8.0;
                meaningfulMatches += 1;
            } else if (parentCategoryMatch) {
                score += 3.5;
                meaningfulMatches += 1;
            }
        }

        // Only include images that have at least one meaningful connection (not just "logo" or "png")
        if (meaningfulMatches > 0 && score > 0) {
            scoredCandidates.push({
                id: cand.img.id,
                name: cand.img.name,
                filename: cand.img.filename,
                path: cand.img.path,
                previewPath: cand.img.previewPath,
                luminance: cand.img.luminance,
                contrastBgDark: cand.img.contrastBgDark,
                contrastBgLight: cand.img.contrastBgLight,
                createdAt: cand.img.createdAt,
                score: Math.round(score * 100) / 100,
            });
        }
    }

    // Sort by score descending, then newest first
    scoredCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = scoredCandidates.length;
    const paginatedImages = scoredCandidates.slice(offset, offset + limit);

    return {
        images: paginatedImages,
        total,
        hasMore: offset + paginatedImages.length < total,
    };
}

