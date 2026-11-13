<?php

namespace App\Services;

use App\Models\Setting;

class ErrorPagesService
{
    public const SETTING_KEY = 'custom_error_pages_v1';

    public static function defaults(): array
    {
        return [
            'p404' => [
                'title' => 'Lost in Transparency?',
                'subtitle' => '404 - Page Not Found',
                'message' => 'The transparent PNG, collection, or page you were looking for seems to have faded away or never existed.',
                'imagePath' => '/assets/errors/404.svg',
                'imageAlt' => '404 Page Not Found Illustration',
                'primaryButtonText' => 'Back to Home',
                'primaryButtonLink' => '/',
                'secondaryButtonText' => 'Explore Collections',
                'secondaryButtonLink' => '/collections',
                'showSearchBar' => true,
                'showSuggestedTags' => true,
                'suggestedTags' => ['Christmas', 'Logos', 'Arrows', 'Icons', 'Borders', 'Nature'],
            ],
            'p500' => [
                'title' => 'Something Glitched in the Pixels',
                'subtitle' => '500 - Internal Server Error',
                'message' => 'Our servers hit an unexpected bump while rendering this page. Our technical team has been notified.',
                'imagePath' => '/assets/errors/500.svg',
                'imageAlt' => '500 Server Error Illustration',
                'primaryButtonText' => 'Try Again',
                'primaryButtonLink' => '#reload',
                'secondaryButtonText' => 'Return to Homepage',
                'secondaryButtonLink' => '/',
                'showSearchBar' => false,
                'showSuggestedTags' => false,
            ],
            'p403' => [
                'title' => 'Access Restricted',
                'subtitle' => '403 - Access Forbidden',
                'message' => "You don't have permission to access this area or resource.",
                'imagePath' => '/assets/errors/403.svg',
                'imageAlt' => '403 Forbidden Access Illustration',
                'primaryButtonText' => 'Back to Homepage',
                'primaryButtonLink' => '/',
                'secondaryButtonText' => 'Explore Collections',
                'secondaryButtonLink' => '/collections',
                'showSearchBar' => false,
            ],
            'maintenance' => [
                'enabled' => false,
                'title' => 'Polishing Pixels & Upgrading Systems',
                'subtitle' => '503 - Scheduled Maintenance',
                'message' => 'We are performing scheduled maintenance and server performance upgrades. Everything will be back online shortly!',
                'imagePath' => '/assets/errors/503.svg',
                'imageAlt' => 'System Maintenance Illustration',
                'primaryButtonText' => 'Refresh Page',
                'primaryButtonLink' => '#reload',
                'secondaryButtonText' => 'Contact Support',
                'secondaryButtonLink' => '/contact-us',
                'estimatedEndTime' => '',
            ],
        ];
    }

    public static function get(): array
    {
        $defaults = self::defaults();

        try {
            $record = Setting::find(self::SETTING_KEY);
            if ($record && $record->value) {
                $parsed = json_decode($record->value, true);
                if (is_array($parsed)) {
                    return [
                        'p404' => array_merge($defaults['p404'], $parsed['p404'] ?? []),
                        'p500' => array_merge($defaults['p500'], $parsed['p500'] ?? []),
                        'p403' => array_merge($defaults['p403'], $parsed['p403'] ?? []),
                        'maintenance' => array_merge($defaults['maintenance'], $parsed['maintenance'] ?? []),
                        'updatedAt' => $parsed['updatedAt'] ?? null,
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Ignore if DB not ready
        }

        return $defaults;
    }

    public static function save(array $settings): array
    {
        $current = self::get();
        $updated = [
            'p404' => array_merge($current['p404'], $settings['p404'] ?? []),
            'p500' => array_merge($current['p500'], $settings['p500'] ?? []),
            'p403' => array_merge($current['p403'], $settings['p403'] ?? []),
            'maintenance' => array_merge($current['maintenance'], $settings['maintenance'] ?? []),
            'updatedAt' => now()->toISOString(),
        ];

        Setting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($updated)]
        );

        return $updated;
    }
}

