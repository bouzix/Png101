<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Schema;

class EditorSettingsService
{
    public const SETTING_KEY = 'editor_studio_settings_v1';

    public static function getDefaults(): array
    {
        return [
            'enabled' => true,
            'showInPublicNav' => true,
            'showInFooter' => true,
            'showEditInStudioButton' => true,
            'navLabel' => 'Editor',
            'defaultWidth' => 1080,
            'defaultHeight' => 1080,
            'maxCanvasWidth' => 4096,
            'maxCanvasHeight' => 4096,
            'maxPagesPerProject' => 12,
            'allowedExportFormats' => ['png', 'jpeg', 'webp', 'svg'],
            'defaultExportQuality' => 92,
            'defaultTransparentBg' => true,
            'enableBgRemover' => true,
            'enableFreehandDraw' => true,
            'enableSvgExport' => true,
            'enableAutosave' => true,
            'seoTitle' => 'Free Online PNG & Graphic Design Editor',
            'seoDescription' => 'Create stunning designs with transparent PNG assets, customizable templates, text styles, photo frames, and multi-format high-DPI export right in your browser.',
        ];
    }

    public static function getSettings(): array
    {
        $defaults = self::getDefaults();

        try {
            if (!Schema::hasTable('Setting')) {
                return $defaults;
            }
            $row = Setting::find(self::SETTING_KEY);
            if (!$row || !$row->value) {
                return $defaults;
            }
            $decoded = json_decode($row->value, true);
            if (!is_array($decoded)) {
                return $defaults;
            }
            $merged = array_merge($defaults, $decoded);
            if (!is_array($merged['allowedExportFormats']) || empty($merged['allowedExportFormats'])) {
                $merged['allowedExportFormats'] = $defaults['allowedExportFormats'];
            }
            return $merged;
        } catch (\Throwable $e) {
            return $defaults;
        }
    }

    public static function saveSettings(array $input): array
    {
        $current = self::getSettings();
        $allowedFormats = array_values(array_intersect(
            ['png', 'jpeg', 'webp', 'svg'],
            is_array($input['allowedExportFormats'] ?? null) ? $input['allowedExportFormats'] : $current['allowedExportFormats']
        ));
        if (empty($allowedFormats)) {
            $allowedFormats = ['png'];
        }

        $next = [
            'enabled' => array_key_exists('enabled', $input) ? (bool) $input['enabled'] : $current['enabled'],
            'showInPublicNav' => array_key_exists('showInPublicNav', $input) ? (bool) $input['showInPublicNav'] : $current['showInPublicNav'],
            'showInFooter' => array_key_exists('showInFooter', $input) ? (bool) $input['showInFooter'] : $current['showInFooter'],
            'showEditInStudioButton' => array_key_exists('showEditInStudioButton', $input) ? (bool) $input['showEditInStudioButton'] : $current['showEditInStudioButton'],
            'navLabel' => trim((string) ($input['navLabel'] ?? $current['navLabel'])) ?: 'Editor',
            'defaultWidth' => max(120, min(4096, (int) ($input['defaultWidth'] ?? $current['defaultWidth']))),
            'defaultHeight' => max(120, min(4096, (int) ($input['defaultHeight'] ?? $current['defaultHeight']))),
            'maxCanvasWidth' => max(512, min(8192, (int) ($input['maxCanvasWidth'] ?? $current['maxCanvasWidth']))),
            'maxCanvasHeight' => max(512, min(8192, (int) ($input['maxCanvasHeight'] ?? $current['maxCanvasHeight']))),
            'maxPagesPerProject' => max(1, min(30, (int) ($input['maxPagesPerProject'] ?? $current['maxPagesPerProject']))),
            'allowedExportFormats' => $allowedFormats,
            'defaultExportQuality' => max(10, min(100, (int) ($input['defaultExportQuality'] ?? $current['defaultExportQuality']))),
            'defaultTransparentBg' => array_key_exists('defaultTransparentBg', $input) ? (bool) $input['defaultTransparentBg'] : $current['defaultTransparentBg'],
            'enableBgRemover' => array_key_exists('enableBgRemover', $input) ? (bool) $input['enableBgRemover'] : $current['enableBgRemover'],
            'enableFreehandDraw' => array_key_exists('enableFreehandDraw', $input) ? (bool) $input['enableFreehandDraw'] : $current['enableFreehandDraw'],
            'enableSvgExport' => array_key_exists('enableSvgExport', $input) ? (bool) $input['enableSvgExport'] : $current['enableSvgExport'],
            'enableAutosave' => array_key_exists('enableAutosave', $input) ? (bool) $input['enableAutosave'] : $current['enableAutosave'],
            'seoTitle' => trim((string) ($input['seoTitle'] ?? $current['seoTitle'])),
            'seoDescription' => trim((string) ($input['seoDescription'] ?? $current['seoDescription'])),
        ];

        Setting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($next)]
        );

        return $next;
    }

    public static function getPublicFlags(): array
    {
        $s = self::getSettings();
        return [
            'enabled' => (bool) $s['enabled'],
            'showInPublicNav' => (bool) ($s['enabled'] && $s['showInPublicNav']),
            'showInFooter' => (bool) ($s['enabled'] && $s['showInFooter']),
            'showEditInStudioButton' => (bool) ($s['enabled'] && $s['showEditInStudioButton']),
            'navLabel' => $s['navLabel'],
        ];
    }
}
