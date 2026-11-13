<?php

namespace App\Services;

use App\Models\CollectionImage;
use App\Models\Image;
use App\Models\ImageCategory;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class TrashService
{
    public const RETENTION_SETTING_KEY = 'trash_retention_days';
    public const DEFAULT_RETENTION_DAYS = 30;
    public const ALLOWED_RETENTION_DAYS = [0, 7, 14, 30, 60, 90, 180, 365];

    public static function hasSoftDeleteColumn(): bool
    {
        try {
            return Schema::hasColumn('Image', 'deletedAt');
        } catch (\Throwable $e) {
            return false;
        }
    }

    public static function getRetentionDays(): int
    {
        try {
            $raw = Setting::find(self::RETENTION_SETTING_KEY)?->value;
            if ($raw === null || $raw === '') {
                return self::DEFAULT_RETENTION_DAYS;
            }
            $days = (int) $raw;
            return $days >= 0 ? $days : self::DEFAULT_RETENTION_DAYS;
        } catch (\Throwable $e) {
            return self::DEFAULT_RETENTION_DAYS;
        }
    }

    public static function saveRetentionDays(int $days): int
    {
        $normalized = max(0, min(3650, $days));
        Setting::updateOrCreate(
            ['key' => self::RETENTION_SETTING_KEY],
            ['value' => (string) $normalized]
        );
        return $normalized;
    }

    /**
     * Permanently delete one soft-deleted (or active) image and its local upload files.
     */
    public static function permanentlyDeleteImage(Image $image): void
    {
        $uploadsRoot = realpath(public_path('uploads'));
        $rootPrefix = $uploadsRoot ? rtrim($uploadsRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR : null;

        foreach ([$image->path, $image->previewPath, $image->thumbPath] as $relPath) {
            if (!is_string($relPath) || trim($relPath) === '') {
                continue;
            }
            $candidate = public_path('/' . ltrim(str_replace('\\', '/', $relPath), '/'));
            $real = realpath($candidate);
            if ($real && is_file($real) && (!$rootPrefix || str_starts_with($real, $rootPrefix))) {
                @unlink($real);
            }
        }

        ImageCategory::where('imageId', $image->id)->delete();
        CollectionImage::where('imageId', $image->id)->delete();
        $image->forceDelete();
    }

    /**
     * Purge all trashed images older than the configured retention period.
     */
    public static function purgeExpired(): int
    {
        if (!self::hasSoftDeleteColumn()) {
            return 0;
        }

        $retentionDays = self::getRetentionDays();
        if ($retentionDays <= 0) {
            return 0;
        }

        $cutoff = now()->subDays($retentionDays);
        $expired = Image::onlyTrashed()
            ->where('deletedAt', '<=', $cutoff)
            ->get();

        $purged = 0;
        foreach ($expired as $img) {
            self::permanentlyDeleteImage($img);
            $purged++;
        }

        return $purged;
    }

    /**
     * Shared-hosting-friendly throttled cleanup (runs at most once every 6 hours).
     */
    public static function runAutoPurgeIfDue(): int
    {
        if (!self::hasSoftDeleteColumn()) {
            return 0;
        }

        $lastRunKey = 'trash_last_auto_purge_ts';
        $lastTs = (int) Cache::get($lastRunKey, 0);
        if ((time() - $lastTs) < 6 * 3600) {
            return 0;
        }

        try {
            $lock = Cache::lock('trash_auto_purge_lock', 30);
            if (!$lock->get()) {
                return 0;
            }
            try {
                Cache::put($lastRunKey, time(), now()->addHours(12));
                return self::purgeExpired();
            } finally {
                $lock->release();
            }
        } catch (\Throwable $e) {
            return 0;
        }
    }
}

