// Geo-detection utility using MaxMind GeoLite2
// Note: You need to download the GeoLite2-Country database from MaxMind
// https://dev.maxmind.com/geoip/geolite2-free-geolocation-data

import path from 'path';
import fs from 'fs';

export interface CountryInfo {
    countryCode: string;  // "US", "GB", etc.
    countryName: string;  // "United States", "United Kingdom", etc.
}

// Simple fallback for when GeoLite2 is not available
// This will be replaced with actual GeoLite2 implementation
export async function detectCountry(ipAddress: string | null): Promise<CountryInfo> {
    // Default to unknown if no IP
    // Default to US (Localhost) for local development to facilitate testing
    if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === 'localhost') {
        return {
            countryCode: 'US',
            countryName: 'United States (Localhost)'
        };
    }

    // Try to use GeoLite2 if available
    try {
        // Check if GeoLite2 database exists
        const dbPath = path.join(process.cwd(), 'data', 'GeoLite2-Country.mmdb');

        if (fs.existsSync(dbPath)) {
            // Dynamically import maxmind only if database exists
            const maxmind = await import('@maxmind/geoip2-node');
            const reader = await maxmind.Reader.open(dbPath);

            // Clean IP address (remove IPv6 prefix if present)
            const cleanIp = ipAddress.replace('::ffff:', '');

            try {
                const response = reader.country(cleanIp);

                return {
                    countryCode: response.country?.isoCode || 'UNKNOWN',
                    countryName: response.country?.names?.en || 'Unknown'
                };
            } catch (error) {
                console.error('GeoIP lookup error:', error);
                return {
                    countryCode: 'UNKNOWN',
                    countryName: 'Unknown'
                };
            }
        }
    } catch (error) {
        console.error('GeoLite2 error:', error);
    }

    // Fallback to UNKNOWN if GeoLite2 not available
    return {
        countryCode: 'UNKNOWN',
        countryName: 'Unknown'
    };
}

// Get country name from code (for display purposes)
export function getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
        'US': 'United States',
        'GB': 'United Kingdom',
        'CA': 'Canada',
        'AU': 'Australia',
        'DE': 'Germany',
        'FR': 'France',
        'JP': 'Japan',
        'CN': 'China',
        'IN': 'India',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'ES': 'Spain',
        'IT': 'Italy',
        'NL': 'Netherlands',
        'SE': 'Sweden',
        'NO': 'Norway',
        'DK': 'Denmark',
        'FI': 'Finland',
        'PL': 'Poland',
        'BE': 'Belgium',
        'CH': 'Switzerland',
        'AT': 'Austria',
        'IE': 'Ireland',
        'NZ': 'New Zealand',
        'SG': 'Singapore',
        'HK': 'Hong Kong',
        'KR': 'South Korea',
        'TW': 'Taiwan',
        'UNKNOWN': 'Unknown'
    };

    return countryNames[countryCode] || countryCode;
}

// Get country flag emoji from country code
export function getCountryFlag(countryCode: string): string {
    if (countryCode === 'UNKNOWN') return '🏳️';

    // Convert country code to flag emoji
    // Each letter maps to regional indicator symbol
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));

    return String.fromCodePoint(...codePoints);
}
