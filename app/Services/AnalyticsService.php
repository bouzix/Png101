<?php

namespace App\Services;

use App\Models\Download;
use App\Models\ImageView;
use App\Models\SearchLog;
use Carbon\Carbon;

class AnalyticsService
{
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

    public static function detectCountry(?string $ip): array
    {
        if (!$ip || in_array($ip, ['::1', '127.0.0.1', 'localhost'], true)) {
            return ['countryCode' => 'US', 'countryName' => 'United States (Localhost)'];
        }
        return ['countryCode' => 'UNKNOWN', 'countryName' => 'Unknown'];
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
}

