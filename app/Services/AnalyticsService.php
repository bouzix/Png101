<?php

namespace App\Services;

use App\Models\Download;
use App\Models\ImageView;
use App\Models\SearchLog;
use App\Models\Setting;
use App\Support\HostingEnvironment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    private const CDN_COUNTRY_HEADERS = [
        'CF-IPCountry',
        'CloudFront-Viewer-Country',
        'X-Vercel-IP-Country',
        'X-Country-Code',
        'GeoIP-Country-Code',
    ];

    private const CLIENT_IP_HEADERS = [
        'CF-Connecting-IP',
        'True-Client-IP',
        'X-Real-IP',
        'X-Client-IP',
        'X-Forwarded-For',
    ];

    private const ISO_COUNTRIES = [
        'AD' => 'Andorra', 'AE' => 'United Arab Emirates', 'AF' => 'Afghanistan', 'AG' => 'Antigua and Barbuda',
        'AI' => 'Anguilla', 'AL' => 'Albania', 'AM' => 'Armenia', 'AO' => 'Angola', 'AR' => 'Argentina',
        'AS' => 'American Samoa', 'AT' => 'Austria', 'AU' => 'Australia', 'AW' => 'Aruba', 'AZ' => 'Azerbaijan',
        'BA' => 'Bosnia and Herzegovina', 'BB' => 'Barbados', 'BD' => 'Bangladesh', 'BE' => 'Belgium',
        'BF' => 'Burkina Faso', 'BG' => 'Bulgaria', 'BH' => 'Bahrain', 'BI' => 'Burundi', 'BJ' => 'Benin',
        'BM' => 'Bermuda', 'BN' => 'Brunei', 'BO' => 'Bolivia', 'BR' => 'Brazil', 'BS' => 'Bahamas',
        'BT' => 'Bhutan', 'BW' => 'Botswana', 'BY' => 'Belarus', 'BZ' => 'Belize', 'CA' => 'Canada',
        'CD' => 'DR Congo', 'CF' => 'Central African Republic', 'CG' => 'Republic of the Congo',
        'CH' => 'Switzerland', 'CI' => 'Ivory Coast', 'CL' => 'Chile', 'CM' => 'Cameroon', 'CN' => 'China',
        'CO' => 'Colombia', 'CR' => 'Costa Rica', 'CU' => 'Cuba', 'CV' => 'Cape Verde', 'CY' => 'Cyprus',
        'CZ' => 'Czechia', 'DE' => 'Germany', 'DJ' => 'Djibouti', 'DK' => 'Denmark', 'DM' => 'Dominica',
        'DO' => 'Dominican Republic', 'DZ' => 'Algeria', 'EC' => 'Ecuador', 'EE' => 'Estonia', 'EG' => 'Egypt',
        'EH' => 'Western Sahara', 'ER' => 'Eritrea', 'ES' => 'Spain', 'ET' => 'Ethiopia', 'FI' => 'Finland',
        'FJ' => 'Fiji', 'FO' => 'Faroe Islands', 'FR' => 'France', 'GA' => 'Gabon', 'GB' => 'United Kingdom',
        'GD' => 'Grenada', 'GE' => 'Georgia', 'GF' => 'French Guiana', 'GH' => 'Ghana', 'GI' => 'Gibraltar',
        'GL' => 'Greenland', 'GM' => 'Gambia', 'GN' => 'Guinea', 'GP' => 'Guadeloupe', 'GQ' => 'Equatorial Guinea',
        'GR' => 'Greece', 'GT' => 'Guatemala', 'GU' => 'Guam', 'GW' => 'Guinea-Bissau', 'GY' => 'Guyana',
        'HK' => 'Hong Kong', 'HN' => 'Honduras', 'HR' => 'Croatia', 'HT' => 'Haiti', 'HU' => 'Hungary',
        'ID' => 'Indonesia', 'IE' => 'Ireland', 'IL' => 'Israel', 'IN' => 'India', 'IQ' => 'Iraq',
        'IR' => 'Iran', 'IS' => 'Iceland', 'IT' => 'Italy', 'JM' => 'Jamaica', 'JO' => 'Jordan',
        'JP' => 'Japan', 'KE' => 'Kenya', 'KG' => 'Kyrgyzstan', 'KH' => 'Cambodia', 'KI' => 'Kiribati',
        'KM' => 'Comoros', 'KN' => 'Saint Kitts and Nevis', 'KP' => 'North Korea', 'KR' => 'South Korea',
        'KW' => 'Kuwait', 'KY' => 'Cayman Islands', 'KZ' => 'Kazakhstan', 'LA' => 'Laos', 'LB' => 'Lebanon',
        'LC' => 'Saint Lucia', 'LI' => 'Liechtenstein', 'LK' => 'Sri Lanka', 'LR' => 'Liberia', 'LS' => 'Lesotho',
        'LT' => 'Lithuania', 'LU' => 'Luxembourg', 'LV' => 'Latvia', 'LY' => 'Libya', 'MA' => 'Morocco',
        'MC' => 'Monaco', 'MD' => 'Moldova', 'ME' => 'Montenegro', 'MG' => 'Madagascar', 'MK' => 'North Macedonia',
        'ML' => 'Mali', 'MM' => 'Myanmar', 'MN' => 'Mongolia', 'MO' => 'Macau', 'MQ' => 'Martinique',
        'MR' => 'Mauritania', 'MT' => 'Malta', 'MU' => 'Mauritius', 'MV' => 'Maldives', 'MW' => 'Malawi',
        'MX' => 'Mexico', 'MY' => 'Malaysia', 'MZ' => 'Mozambique', 'NA' => 'Namibia', 'NC' => 'New Caledonia',
        'NE' => 'Niger', 'NG' => 'Nigeria', 'NI' => 'Nicaragua', 'NL' => 'Netherlands', 'NO' => 'Norway',
        'NP' => 'Nepal', 'NZ' => 'New Zealand', 'OM' => 'Oman', 'PA' => 'Panama', 'PE' => 'Peru',
        'PF' => 'French Polynesia', 'PG' => 'Papua New Guinea', 'PH' => 'Philippines', 'PK' => 'Pakistan',
        'PL' => 'Poland', 'PR' => 'Puerto Rico', 'PS' => 'Palestine', 'PT' => 'Portugal', 'PY' => 'Paraguay',
        'QA' => 'Qatar', 'RE' => 'Reunion', 'RO' => 'Romania', 'RS' => 'Serbia', 'RU' => 'Russia',
        'RW' => 'Rwanda', 'SA' => 'Saudi Arabia', 'SB' => 'Solomon Islands', 'SC' => 'Seychelles',
        'SD' => 'Sudan', 'SE' => 'Sweden', 'SG' => 'Singapore', 'SI' => 'Slovenia', 'SK' => 'Slovakia',
        'SL' => 'Sierra Leone', 'SM' => 'San Marino', 'SN' => 'Senegal', 'SO' => 'Somalia', 'SR' => 'Suriname',
        'SS' => 'South Sudan', 'ST' => 'Sao Tome and Principe', 'SV' => 'El Salvador', 'SY' => 'Syria',
        'SZ' => 'Eswatini', 'TD' => 'Chad', 'TG' => 'Togo', 'TH' => 'Thailand', 'TJ' => 'Tajikistan',
        'TL' => 'Timor-Leste', 'TM' => 'Turkmenistan', 'TN' => 'Tunisia', 'TO' => 'Tonga', 'TR' => 'Turkey',
        'TT' => 'Trinidad and Tobago', 'TW' => 'Taiwan', 'TZ' => 'Tanzania', 'UA' => 'Ukraine', 'UG' => 'Uganda',
        'US' => 'United States', 'UY' => 'Uruguay', 'UZ' => 'Uzbekistan', 'VC' => 'Saint Vincent and the Grenadines',
        'VE' => 'Venezuela', 'VN' => 'Vietnam', 'VU' => 'Vanuatu', 'WS' => 'Samoa', 'YE' => 'Yemen',
        'ZA' => 'South Africa', 'ZM' => 'Zambia', 'ZW' => 'Zimbabwe',
    ];

    public static function getRangeStartDate(string $range): Carbon
    {
        return match ($range) {
            '1h' => now()->subHour(),
            '24h' => now()->subDay(),
            '30d' => now()->subDays(30),
            '90d' => now()->subDays(90),
            '1y' => now()->subYear(),
            default => now()->subDays(7),
        };
    }

    public static function detectDevice(?string $userAgent): string
    {
        if (!$userAgent) {
            return 'unknown';
        }
        $ua = strtolower($userAgent);
        if (preg_match('/ipad|tablet|playbook|silk|(android(?!.*mobile))/i', $ua)) {
            return 'tablet';
        }
        if (preg_match('/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|windows phone/i', $ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    public static function countryNameFromCode(?string $code): string
    {
        $normalized = strtoupper(trim((string) $code));
        if (strlen($normalized) !== 2 || !ctype_alpha($normalized) || in_array($normalized, ['XX', 'T1'], true)) {
            return 'Unknown';
        }

        if (isset(self::ISO_COUNTRIES[$normalized])) {
            return self::ISO_COUNTRIES[$normalized];
        }

        if (class_exists(\Locale::class)) {
            $name = \Locale::getDisplayRegion('-' . $normalized, 'en');
            if ($name && strtoupper($name) !== $normalized) {
                return $name;
            }
        }

        return $normalized;
    }

    public static function extractClientIp(Request $request): ?string
    {
        foreach (self::CLIENT_IP_HEADERS as $header) {
            $raw = trim((string) $request->header($header, ''));
            if ($raw === '') {
                continue;
            }

            foreach (explode(',', $raw) as $candidate) {
                $clean = self::normalizeIp($candidate);
                if ($clean && self::isPublicIp($clean)) {
                    return $clean;
                }
            }
        }

        return self::normalizeIp($request->ip());
    }

    /**
     * Resolve country via CDN headers first (zero external calls), then client IP GeoIP lookup.
     */
    public static function detectCountryForRequest(Request $request): array
    {
        foreach (self::CDN_COUNTRY_HEADERS as $header) {
            $rawCode = strtoupper(trim((string) $request->header($header, '')));
            if (strlen($rawCode) === 2 && ctype_alpha($rawCode) && !in_array($rawCode, ['XX', 'T1'], true)) {
                return [
                    'countryCode' => $rawCode,
                    'countryName' => self::countryNameFromCode($rawCode),
                ];
            }
        }

        return self::detectCountry(self::extractClientIp($request));
    }

    public static function detectCountry(?string $ip): array
    {
        $cleanIp = self::normalizeIp($ip);

        // Localhost or private LAN IP (local dev / behind internal proxy): detect host's public IP location & cache
        if (!$cleanIp || !self::isPublicIp($cleanIp)) {
            $cacheKey = 'geoip_local_public_country_v1';
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && !empty($cached['countryCode'])) {
                return $cached;
            }

            $detected = self::lookupPublicIpCountry(null);
            if ($detected) {
                Cache::put($cacheKey, $detected, now()->addHours(6));
                return $detected;
            }

            return ['countryCode' => 'US', 'countryName' => 'United States (Localhost)'];
        }

        $cacheKey = 'geoip_country_' . md5($cleanIp);
        $cached = Cache::get($cacheKey);
        if (is_array($cached) && !empty($cached['countryCode'])) {
            return $cached;
        }

        $detected = self::lookupPublicIpCountry($cleanIp);
        if ($detected) {
            Cache::put($cacheKey, $detected, now()->addHours(24));
            return $detected;
        }

        return ['countryCode' => 'UNKNOWN', 'countryName' => 'Unknown'];
    }

    private static function normalizeIp(?string $ip): ?string
    {
        $cleaned = trim((string) $ip);
        if ($cleaned === '' || strtolower($cleaned) === 'localhost') {
            return $cleaned === '' ? null : '127.0.0.1';
        }
        if (str_starts_with($cleaned, '::ffff:')) {
            $cleaned = substr($cleaned, 7);
        }
        return filter_var($cleaned, FILTER_VALIDATE_IP) ? $cleaned : null;
    }

    private static function isPublicIp(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    private static function lookupPublicIpCountry(?string $ip): ?array
    {
        $client = HostingEnvironment::httpClient(3);
        $ipSegment = $ip ? urlencode($ip) : '';

        // 1. ipwho.is (HTTPS, zero API key)
        try {
            $url = $ipSegment
                ? "https://ipwho.is/{$ipSegment}?fields=success,country,country_code"
                : 'https://ipwho.is/?fields=success,country,country_code';
            $res = $client->get($url);
            if ($res->successful()) {
                $data = $res->json();
                $code = strtoupper(trim((string) ($data['country_code'] ?? '')));
                if (!empty($data['success']) && strlen($code) === 2 && ctype_alpha($code)) {
                    $name = trim((string) ($data['country'] ?? '')) ?: self::countryNameFromCode($code);
                    return ['countryCode' => $code, 'countryName' => $name];
                }
            }
        } catch (\Throwable $e) {
            // Try next provider
        }

        // 2. api.country.is (HTTPS Cloudflare edge lookup)
        try {
            $url = $ipSegment ? "https://api.country.is/{$ipSegment}" : 'https://api.country.is/';
            $res = $client->get($url);
            if ($res->successful()) {
                $data = $res->json();
                $code = strtoupper(trim((string) ($data['country'] ?? '')));
                if (strlen($code) === 2 && ctype_alpha($code)) {
                    return [
                        'countryCode' => $code,
                        'countryName' => self::countryNameFromCode($code),
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Try next provider
        }

        // 3. ip-api.com (HTTP fallback if HTTPS outbound is restricted)
        try {
            $url = $ipSegment
                ? "http://ip-api.com/json/{$ipSegment}?fields=status,country,countryCode"
                : 'http://ip-api.com/json/?fields=status,country,countryCode';
            $res = $client->get($url);
            if ($res->successful()) {
                $data = $res->json();
                $code = strtoupper(trim((string) ($data['countryCode'] ?? '')));
                if (($data['status'] ?? '') === 'success' && strlen($code) === 2 && ctype_alpha($code)) {
                    $name = trim((string) ($data['country'] ?? '')) ?: self::countryNameFromCode($code);
                    return ['countryCode' => $code, 'countryName' => $name];
                }
            }
        } catch (\Throwable $e) {
            // All providers failed
        }

        return null;
    }

    public static function recordImageView(string $imageId): void
    {
        if (!$imageId) {
            return;
        }
        try {
            ImageView::create(['imageId' => $imageId]);
        } catch (\Throwable $e) {
            // Ignore
        }
    }

    public static function recordSearchQuery(string $query, int $resultsCount): void
    {
        $cleaned = strtolower(trim($query));
        if ($cleaned === '') {
            return;
        }
        try {
            SearchLog::create([
                'query' => $cleaned,
                'resultsCount' => $resultsCount,
            ]);
        } catch (\Throwable $e) {
            // Ignore
        }
    }

    public static function recordDownload(array $data): void
    {
        try {
            Download::create([
                'imageId' => $data['imageId'] ?: null,
                'deviceType' => $data['deviceType'] ?? 'desktop',
                'country' => $data['country'] ?? 'UNKNOWN',
                'countryName' => $data['countryName'] ?? 'Unknown',
                'isCustomSize' => (bool) ($data['isCustomSize'] ?? false),
                'resolution' => $data['resolution'] ?? null,
            ]);
        } catch (\Throwable $e) {
            // Ignore
        }
    }

    /**
     * Get top searched single-word keywords over the last N days, refreshed once per 24h.
     */
    public static function getHomepageTopKeywords(int $limit = 10, int $days = 7): array
    {
        $limit = max(1, min($limit, 20));
        $defaults = ['science', 'book', 'stamp', 'chart', 'macbook', 'fist', 'circuit', 'food', 'badge', 'paper'];
        $cacheKey = 'homepage_top_keywords_7d_v2';
        $cacheTtlSeconds = 24 * 60 * 60;

        try {
            $cached = Setting::find($cacheKey);
            if ($cached) {
                $parsed = json_decode((string) $cached->value, true);
                if (
                    is_array($parsed)
                    && !empty($parsed['updatedAt'])
                    && isset($parsed['keywords'])
                    && is_array($parsed['keywords'])
                ) {
                    $ageSeconds = time() - (int) floor(((int) $parsed['updatedAt']) / 1000);
                    if ($ageSeconds >= 0 && $ageSeconds < $cacheTtlSeconds) {
                        $cachedKeywords = array_values(array_filter($parsed['keywords'], fn ($item) => is_string($item) && $item !== ''));
                        if (!empty($cachedKeywords)) {
                            return array_slice($cachedKeywords, 0, $limit);
                        }
                    }
                }
            }

            $rows = SearchLog::query()
                ->where('createdAt', '>=', Carbon::now()->subDays($days))
                ->select(
                    'query',
                    DB::raw('MAX(resultsCount) as maxResults'),
                    DB::raw('COUNT(*) as searchCount')
                )
                ->groupBy('query')
                ->orderByDesc('searchCount')
                ->limit(250)
                ->get();

            $withResults = [];
            $withoutResults = [];
            $seen = [];

            foreach ($rows as $row) {
                $word = mb_strtolower(trim((string) ($row->query ?? '')), 'UTF-8');
                if ($word === '' || isset($seen[$word])) {
                    continue;
                }
                if (!preg_match('/^[\p{L}\p{N}-]{2,40}$/u', $word)) {
                    continue;
                }
                $seen[$word] = true;
                if ((int) ($row->maxResults ?? 0) > 0) {
                    $withResults[] = $word;
                } else {
                    $withoutResults[] = $word;
                }
            }

            $keywords = array_slice($withResults, 0, $limit);
            foreach ($withoutResults as $word) {
                if (count($keywords) >= $limit) {
                    break;
                }
                $keywords[] = $word;
            }
            foreach ($defaults as $word) {
                if (count($keywords) >= $limit) {
                    break;
                }
                if (!in_array($word, $keywords, true)) {
                    $keywords[] = $word;
                }
            }

            $keywords = array_slice($keywords, 0, $limit);

            Setting::updateOrCreate(
                ['key' => $cacheKey],
                [
                    'value' => json_encode([
                        'updatedAt' => (int) round(microtime(true) * 1000),
                        'keywords' => $keywords,
                    ]),
                ]
            );

            return $keywords;
        } catch (\Throwable $e) {
            return array_slice($defaults, 0, $limit);
        }
    }
}
