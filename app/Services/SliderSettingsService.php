<?php

namespace App\Services;

use App\Models\Setting;

class SliderSettingsService
{
    public const SETTING_KEY = 'slider_settings';

    public static function defaults(): array
    {
        return [
            'related_collections' => [
                'id' => 'related_collections',
                'name' => 'More Collections You May Like',
                'location' => 'Collection Detail Page (/collections/{slug})',
                'enabled' => true,
                'cardsDesktop' => 8,
                'stepDesktop' => 1,
                'cardsLaptop' => 6,
                'stepLaptop' => 1,
                'cardsTablet' => 4,
                'stepTablet' => 1,
                'cardsSmallTablet' => 3,
                'stepSmallTablet' => 1,
                'cardsMobile' => 2,
                'stepMobile' => 1,
                'maxTotalItems' => 24,
                'autoScroll' => true,
                'autoScrollIntervalMs' => 3500,
                'autoScrollStepCards' => 1,
                'pauseOnHover' => true,
                'loop' => true,
                'showArrows' => true,
                'showHeaderArrows' => false,
                'showEdgeFade' => true,
                'arrowSize' => 28,
                'arrowIconSize' => 14,
                'arrowOffsetX' => 0,
                'arrowOffsetY' => 0,
                'arrowShape' => 'circle',
                'arrowBgColor' => '',
                'arrowIconColor' => '',
                'arrowBorderColor' => '',
                'showProgressDots' => true,
            ],
            'trending_collections' => [
                'id' => 'trending_collections',
                'name' => 'Trending Collections',
                'location' => 'Homepage (/)',
                'enabled' => true,
                'cardsDesktop' => 4,
                'stepDesktop' => 1,
                'cardsLaptop' => 3,
                'stepLaptop' => 1,
                'cardsTablet' => 2,
                'stepTablet' => 1,
                'cardsSmallTablet' => 2,
                'stepSmallTablet' => 1,
                'cardsMobile' => 1,
                'stepMobile' => 1,
                'maxTotalItems' => 12,
                'autoScroll' => true,
                'autoScrollIntervalMs' => 4000,
                'autoScrollStepCards' => 1,
                'pauseOnHover' => true,
                'loop' => true,
                'showArrows' => true,
                'showHeaderArrows' => false,
                'showEdgeFade' => true,
                'arrowSize' => 32,
                'arrowIconSize' => 16,
                'arrowOffsetX' => 0,
                'arrowOffsetY' => 0,
                'arrowShape' => 'circle',
                'arrowBgColor' => '',
                'arrowIconColor' => '',
                'arrowBorderColor' => '',
                'showProgressDots' => true,
            ],
            'part_of_collections' => [
                'id' => 'part_of_collections',
                'name' => 'Part of Collections',
                'location' => 'Image Detail Sidebar (/images/{slug})',
                'enabled' => true,
                'cardsDesktop' => 1,
                'stepDesktop' => 1,
                'cardsLaptop' => 1,
                'stepLaptop' => 1,
                'cardsTablet' => 1,
                'stepTablet' => 1,
                'cardsSmallTablet' => 1,
                'stepSmallTablet' => 1,
                'cardsMobile' => 1,
                'stepMobile' => 1,
                'maxTotalItems' => 12,
                'autoScroll' => true,
                'autoScrollIntervalMs' => 4000,
                'autoScrollStepCards' => 1,
                'pauseOnHover' => true,
                'loop' => true,
                'showArrows' => true,
                'showHeaderArrows' => false,
                'showEdgeFade' => false,
                'arrowSize' => 28,
                'arrowIconSize' => 14,
                'arrowOffsetX' => 0,
                'arrowOffsetY' => 0,
                'arrowShape' => 'circle',
                'arrowBgColor' => '',
                'arrowIconColor' => '',
                'arrowBorderColor' => '',
                'showProgressDots' => true,
            ],
        ];
    }

    public static function getAll(): array
    {
        $defaults = self::defaults();
        try {
            $row = Setting::where('key', self::SETTING_KEY)->first();
            if (!$row || !$row->value) {
                return $defaults;
            }
            $decoded = json_decode($row->value, true);
            if (!is_array($decoded)) {
                return $defaults;
            }

            $merged = $defaults;
            foreach ($decoded as $key => $cfg) {
                if (is_array($cfg)) {
                    $base = $defaults[$key] ?? self::defaults()['related_collections'];
                    $merged[$key] = self::sanitizeSliderConfig(array_merge($base, $cfg));
                }
            }
            return $merged;
        } catch (\Throwable $e) {
            return $defaults;
        }
    }

    public static function get(string $sliderId): array
    {
        $all = self::getAll();
        return $all[$sliderId] ?? self::defaults()['related_collections'];
    }

    public static function save(array $incoming): array
    {
        $current = self::getAll();
        foreach ($incoming as $key => $cfg) {
            if (is_array($cfg)) {
                $base = $current[$key] ?? self::defaults()['related_collections'];
                $current[$key] = self::sanitizeSliderConfig(array_merge($base, $cfg, ['id' => $key]));
            }
        }

        Setting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($current)]
        );

        return $current;
    }

    private static function sanitizeSliderConfig(array $cfg): array
    {
        $cardsDesktop = max(1, min(12, (int) ($cfg['cardsDesktop'] ?? 8)));
        $cardsLaptop = max(1, min(12, (int) ($cfg['cardsLaptop'] ?? 6)));
        $cardsTablet = max(1, min(10, (int) ($cfg['cardsTablet'] ?? 4)));
        $cardsSmallTablet = max(1, min(8, (int) ($cfg['cardsSmallTablet'] ?? 3)));
        $cardsMobile = max(1, min(6, (int) ($cfg['cardsMobile'] ?? 2)));
        $legacyStep = max(1, min(12, (int) ($cfg['autoScrollStepCards'] ?? 1)));

        $shape = (string) ($cfg['arrowShape'] ?? 'circle');
        if (!in_array($shape, ['circle', 'rounded', 'square'], true)) {
            $shape = 'circle';
        }

        return [
            'id' => (string) ($cfg['id'] ?? 'related_collections'),
            'name' => (string) ($cfg['name'] ?? 'More Collections You May Like'),
            'location' => (string) ($cfg['location'] ?? 'Collection Detail Page (/collections/{slug})'),
            'enabled' => (bool) ($cfg['enabled'] ?? true),
            'cardsDesktop' => $cardsDesktop,
            'stepDesktop' => max(1, min($cardsDesktop, (int) ($cfg['stepDesktop'] ?? $legacyStep))),
            'cardsLaptop' => $cardsLaptop,
            'stepLaptop' => max(1, min($cardsLaptop, (int) ($cfg['stepLaptop'] ?? $legacyStep))),
            'cardsTablet' => $cardsTablet,
            'stepTablet' => max(1, min($cardsTablet, (int) ($cfg['stepTablet'] ?? $legacyStep))),
            'cardsSmallTablet' => $cardsSmallTablet,
            'stepSmallTablet' => max(1, min($cardsSmallTablet, (int) ($cfg['stepSmallTablet'] ?? $legacyStep))),
            'cardsMobile' => $cardsMobile,
            'stepMobile' => max(1, min($cardsMobile, (int) ($cfg['stepMobile'] ?? $legacyStep))),
            'maxTotalItems' => max(2, min(60, (int) ($cfg['maxTotalItems'] ?? 24))),
            'autoScroll' => (bool) ($cfg['autoScroll'] ?? true),
            'autoScrollIntervalMs' => max(1000, min(30000, (int) ($cfg['autoScrollIntervalMs'] ?? 3500))),
            'autoScrollStepCards' => $legacyStep,
            'pauseOnHover' => (bool) ($cfg['pauseOnHover'] ?? true),
            'loop' => (bool) ($cfg['loop'] ?? true),
            'showArrows' => (bool) ($cfg['showArrows'] ?? true),
            'showHeaderArrows' => (bool) ($cfg['showHeaderArrows'] ?? false),
            'showEdgeFade' => (bool) ($cfg['showEdgeFade'] ?? true),
            'arrowSize' => max(20, min(56, (int) ($cfg['arrowSize'] ?? 28))),
            'arrowIconSize' => max(10, min(32, (int) ($cfg['arrowIconSize'] ?? 14))),
            'arrowOffsetX' => max(-36, min(36, (int) ($cfg['arrowOffsetX'] ?? 0))),
            'arrowOffsetY' => max(-48, min(48, (int) ($cfg['arrowOffsetY'] ?? 0))),
            'arrowShape' => $shape,
            'arrowBgColor' => trim((string) ($cfg['arrowBgColor'] ?? '')),
            'arrowIconColor' => trim((string) ($cfg['arrowIconColor'] ?? '')),
            'arrowBorderColor' => trim((string) ($cfg['arrowBorderColor'] ?? '')),
            'showProgressDots' => (bool) ($cfg['showProgressDots'] ?? true),
        ];
    }
}
