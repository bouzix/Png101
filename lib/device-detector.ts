import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
    deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
    browser: string;
    os: string;
}

export function detectDevice(userAgent: string | null): DeviceInfo {
    if (!userAgent) {
        return {
            deviceType: 'unknown',
            browser: 'unknown',
            os: 'unknown'
        };
    }

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Determine device type
    let deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown' = 'unknown';

    if (result.device.type === 'mobile') {
        deviceType = 'mobile';
    } else if (result.device.type === 'tablet') {
        deviceType = 'tablet';
    } else if (result.device.type === 'wearable' || result.device.type === 'smarttv' || result.device.type === 'console') {
        deviceType = 'unknown';
    } else {
        // If no device type specified, it's usually desktop
        // Also check if it's a mobile OS on a device without type
        const os = result.os.name?.toLowerCase() || '';
        if (os.includes('android') || os.includes('ios') || os.includes('windows phone')) {
            deviceType = 'mobile';
        } else {
            deviceType = 'desktop';
        }
    }

    return {
        deviceType,
        browser: result.browser.name || 'unknown',
        os: result.os.name || 'unknown'
    };
}
