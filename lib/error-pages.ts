import prisma from '@/lib/db';

export interface ErrorPageItemConfig {
    title: string;
    subtitle: string;
    message: string;
    imagePath: string;
    imageAlt: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    showSearchBar?: boolean;
    showSuggestedTags?: boolean;
    suggestedTags?: string[];
}

export interface MaintenancePageConfig extends ErrorPageItemConfig {
    enabled: boolean;
    estimatedEndTime?: string;
}

export interface ErrorPagesSettings {
    p404: ErrorPageItemConfig;
    p500: ErrorPageItemConfig;
    p403: ErrorPageItemConfig;
    maintenance: MaintenancePageConfig;
    updatedAt?: string;
}

const SETTING_KEY = 'custom_error_pages_v1';

export const DEFAULT_ERROR_PAGES: ErrorPagesSettings = {
    p404: {
        title: 'Lost in Transparency?',
        subtitle: '404 - Page Not Found',
        message: 'The transparent PNG, collection, or page you were looking for seems to have faded away or never existed.',
        imagePath: '/assets/errors/404.svg',
        imageAlt: '404 Page Not Found Illustration',
        primaryButtonText: 'Back to Home',
        primaryButtonLink: '/',
        secondaryButtonText: 'Explore Collections',
        secondaryButtonLink: '/collections',
        showSearchBar: true,
        showSuggestedTags: true,
        suggestedTags: ['Christmas', 'Logos', 'Arrows', 'Icons', 'Borders', 'Nature'],
    },
    p500: {
        title: 'Something Glitched in the Pixels',
        subtitle: '500 - Internal Server Error',
        message: 'Our servers hit an unexpected bump while rendering this page. Our technical team has been notified.',
        imagePath: '/assets/errors/500.svg',
        imageAlt: '500 Server Error Illustration',
        primaryButtonText: 'Try Again',
        primaryButtonLink: '#reload',
        secondaryButtonText: 'Return to Homepage',
        secondaryButtonLink: '/',
        showSearchBar: false,
        showSuggestedTags: false,
    },
    p403: {
        title: 'Access Restricted',
        subtitle: '403 - Access Forbidden',
        message: "You don't have permission to access this area or resource.",
        imagePath: '/assets/errors/403.svg',
        imageAlt: '403 Forbidden Access Illustration',
        primaryButtonText: 'Back to Homepage',
        primaryButtonLink: '/',
        secondaryButtonText: 'Explore Collections',
        secondaryButtonLink: '/collections',
        showSearchBar: false,
    },
    maintenance: {
        enabled: false,
        title: 'Polishing Pixels & Upgrading Systems',
        subtitle: '503 - Scheduled Maintenance',
        message: 'We are performing scheduled maintenance and server performance upgrades. Everything will be back online shortly!',
        imagePath: '/assets/errors/503.svg',
        imageAlt: 'System Maintenance Illustration',
        primaryButtonText: 'Refresh Page',
        primaryButtonLink: '#reload',
        secondaryButtonText: 'Contact Support',
        secondaryButtonLink: '/contact-us',
        estimatedEndTime: '',
    },
};

/**
 * Retrieve current Error Pages configuration
 */
export async function getErrorPagesConfig(): Promise<ErrorPagesSettings> {
    try {
        const record = await prisma.setting.findUnique({
            where: { key: SETTING_KEY },
        });

        if (record && record.value) {
            const parsed = JSON.parse(record.value);
            return {
                p404: { ...DEFAULT_ERROR_PAGES.p404, ...(parsed.p404 || {}) },
                p500: { ...DEFAULT_ERROR_PAGES.p500, ...(parsed.p500 || {}) },
                p403: { ...DEFAULT_ERROR_PAGES.p403, ...(parsed.p403 || {}) },
                maintenance: { ...DEFAULT_ERROR_PAGES.maintenance, ...(parsed.maintenance || {}) },
                updatedAt: parsed.updatedAt || undefined,
            };
        }
    } catch (error) {
        console.error('Error fetching Error Pages config:', error);
    }

    return DEFAULT_ERROR_PAGES;
}

/**
 * Save Error Pages configuration
 */
export async function saveErrorPagesConfig(
    settings: Partial<ErrorPagesSettings>
): Promise<ErrorPagesSettings> {
    const current = await getErrorPagesConfig();
    const updated: ErrorPagesSettings = {
        p404: { ...current.p404, ...(settings.p404 || {}) },
        p500: { ...current.p500, ...(settings.p500 || {}) },
        p403: { ...current.p403, ...(settings.p403 || {}) },
        maintenance: { ...current.maintenance, ...(settings.maintenance || {}) },
        updatedAt: new Date().toISOString(),
    };

    await prisma.setting.upsert({
        where: { key: SETTING_KEY },
        update: { value: JSON.stringify(updated) },
        create: {
            key: SETTING_KEY,
            value: JSON.stringify(updated),
        },
    });

    return updated;
}

