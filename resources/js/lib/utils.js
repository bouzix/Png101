export function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function normalizeHostTag(rawHost) {
    if (!rawHost || typeof rawHost !== 'string') return '';
    return rawHost
        .trim()
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/[^a-z0-9.-]/g, '')
        .replace(/\.{2,}/g, '.')
        .replace(/^\.+|\.+$/g, '');
}

function isLocalHostname(host) {
    if (!host) return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
    if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost')) return true;
    return false;
}

export function getSiteDomainTag(websiteInfo = {}) {
    if (typeof window !== 'undefined' && window.location?.hostname) {
        const liveHost = normalizeHostTag(window.location.hostname);
        if (liveHost && !isLocalHostname(liveHost)) {
            return liveHost;
        }
    }

    const rawUrl = websiteInfo?.websiteUrl || '';
    if (rawUrl) {
        try {
            const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
            const configHost = normalizeHostTag(parsed.hostname);
            if (configHost && !isLocalHostname(configHost)) {
                return configHost;
            }
        } catch {
            // Fall through to siteName / fallback
        }
    }

    const nameSlug = slugify(websiteInfo?.websiteName || websiteInfo?.siteName || '');
    return nameSlug || 'png101.com';
}

export function appendDomainToFilename(filename, websiteInfoOrTag = {}) {
    const raw = (filename || 'download').toString().trim();
    const siteTag = typeof websiteInfoOrTag === 'string'
        ? normalizeHostTag(websiteInfoOrTag) || getSiteDomainTag({})
        : getSiteDomainTag(websiteInfoOrTag);

    if (!siteTag) return raw;

    const suffix = `-${siteTag}`;
    const dotIndex = raw.lastIndexOf('.');
    if (dotIndex > 0 && dotIndex < raw.length - 1) {
        const stem = raw.slice(0, dotIndex);
        const ext = raw.slice(dotIndex);
        if (stem.toLowerCase().endsWith(suffix.toLowerCase())) {
            return `${stem}${ext}`;
        }
        return `${stem}${suffix}${ext}`;
    }

    if (raw.toLowerCase().endsWith(suffix.toLowerCase())) {
        return raw;
    }
    return `${raw}${suffix}`;
}

export function triggerSiteBlobDownload(blob, filename, websiteInfoOrTag = {}) {
    if (!blob || typeof document === 'undefined') return '';
    const finalFilename = appendDomainToFilename(filename, websiteInfoOrTag);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return finalFilename;
}


