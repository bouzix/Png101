<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\WebsiteInfo;

class WebsiteInfoService
{
    public const DEFAULT_ID = 'default';

    public static function defaults(): array
    {
        return [
            'id' => self::DEFAULT_ID,
            'websiteName' => 'Png101',
            'websiteUrl' => 'https://png101.com',
            'tagline' => 'Discover and download free, high-resolution transparent PNG images for your creative projects.',
            'contactEmail' => 'contact@png101.com',
            'dmcaEmail' => 'dmca@png101.com',
            'companyName' => 'Png101',
            'country' => 'United States',
            'address' => '',
            'foundedYear' => '2025',
        ];
    }

    public static function get(): array
    {
        $defaults = self::defaults();

        try {
            $record = WebsiteInfo::find(self::DEFAULT_ID);
            if ($record) {
                return [
                    'id' => self::DEFAULT_ID,
                    'websiteName' => $record->websiteName ?: $defaults['websiteName'],
                    'websiteUrl' => $record->websiteUrl ?: $defaults['websiteUrl'],
                    'tagline' => $record->tagline ?? $defaults['tagline'],
                    'contactEmail' => $record->contactEmail ?: $defaults['contactEmail'],
                    'dmcaEmail' => $record->dmcaEmail ?: $defaults['dmcaEmail'],
                    'companyName' => $record->companyName ?: ($record->websiteName ?: $defaults['companyName']),
                    'country' => $record->country ?: $defaults['country'],
                    'address' => $record->address ?? $defaults['address'],
                    'foundedYear' => $record->foundedYear ?: $defaults['foundedYear'],
                    'updatedAt' => $record->updatedAt?->toISOString(),
                ];
            }

            $titleSetting = Setting::find('websiteTitle');
            if ($titleSetting && $titleSetting->value) {
                $defaults['websiteName'] = $titleSetting->value;
                $defaults['companyName'] = $titleSetting->value;
            }
        } catch (\Throwable $e) {
            // Table might not exist yet before migration
        }

        return $defaults;
    }

    public static function save(array $data): array
    {
        $current = self::get();
        $defaults = self::defaults();

        $next = [
            'websiteName' => trim((string) ($data['websiteName'] ?? $current['websiteName'])) ?: $defaults['websiteName'],
            'websiteUrl' => trim((string) ($data['websiteUrl'] ?? $current['websiteUrl'])) ?: $defaults['websiteUrl'],
            'tagline' => trim((string) ($data['tagline'] ?? $current['tagline'])),
            'contactEmail' => trim((string) ($data['contactEmail'] ?? $current['contactEmail'])) ?: $defaults['contactEmail'],
            'dmcaEmail' => trim((string) ($data['dmcaEmail'] ?? $current['dmcaEmail'])) ?: $defaults['dmcaEmail'],
            'companyName' => trim((string) ($data['companyName'] ?? $current['companyName'])) ?: $defaults['companyName'],
            'country' => trim((string) ($data['country'] ?? $current['country'])) ?: $defaults['country'],
            'address' => trim((string) ($data['address'] ?? $current['address'])),
            'foundedYear' => trim((string) ($data['foundedYear'] ?? $current['foundedYear'])) ?: $defaults['foundedYear'],
        ];

        $record = WebsiteInfo::updateOrCreate(['id' => self::DEFAULT_ID], $next);

        try {
            Setting::updateOrCreate(
                ['key' => 'websiteTitle'],
                ['value' => $next['websiteName']]
            );
        } catch (\Throwable $e) {
            // Ignore
        }

        return array_merge(['id' => self::DEFAULT_ID], $next, [
            'updatedAt' => $record->updatedAt?->toISOString(),
        ]);
    }
}

