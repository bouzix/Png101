<?php

namespace App\Services;

use App\Models\ApiKey;
use App\Models\Download;
use App\Models\Image;
use App\Support\HostingEnvironment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemHealthService
{
    public static function collect(): array
    {
        $checks = [];

        // 1. Database Connectivity & Schema
        $dbStatus = 'ok';
        $dbDetail = 'Connected';
        $dbDriver = config('database.default', 'unknown');
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $latencyMs = round((microtime(true) - $start) * 1000, 1);
            $hasThumb = Schema::hasColumn('Image', 'thumbPath');
            $hasTrash = Schema::hasColumn('Image', 'deletedAt');
            $dbDetail = strtoupper((string) $dbDriver) . " connected ({$latencyMs} ms)";
            if (!$hasThumb || !$hasTrash) {
                $dbStatus = 'warn';
                $dbDetail .= ' — Pending database migrations detected.';
            }
        } catch (\Throwable $e) {
            $dbStatus = 'error';
            $dbDetail = 'Connection failed: ' . $e->getMessage();
        }
        $checks[] = [
            'id' => 'database',
            'label' => 'Database Connection',
            'status' => $dbStatus,
            'detail' => $dbDetail,
        ];

        // 2. Uploads Directory & Writability
        $uploadsDir = public_path('uploads');
        $uploadsExists = is_dir($uploadsDir);
        $uploadsWritable = $uploadsExists && is_writable($uploadsDir);
        $diskFree = @disk_free_space($uploadsExists ? $uploadsDir : public_path());
        $diskTotal = @disk_total_space($uploadsExists ? $uploadsDir : public_path());
        $diskSummary = ($diskFree !== false && $diskTotal !== false && $diskTotal > 0)
            ? round($diskFree / (1024 * 1024 * 1024), 2) . ' GB free / ' . round($diskTotal / (1024 * 1024 * 1024), 2) . ' GB'
            : 'Disk usage unavailable';

        $checks[] = [
            'id' => 'uploads',
            'label' => 'Uploads Storage',
            'status' => ($uploadsExists && $uploadsWritable) ? 'ok' : 'error',
            'detail' => ($uploadsExists ? ($uploadsWritable ? 'Writable' : 'Not writable') : 'Missing directory') . " • {$diskSummary}",
        ];

        // 3. PHP Runtime & Extensions
        $requiredExt = ['gd', 'fileinfo', 'mbstring', 'curl', 'openssl'];
        $missingExt = array_values(array_filter($requiredExt, fn ($ext) => !extension_loaded($ext)));
        $limits = ImageProcessingService::getUploadLimits();
        $checks[] = [
            'id' => 'php',
            'label' => 'PHP Runtime & Image Extensions',
            'status' => empty($missingExt) ? 'ok' : 'warn',
            'detail' => 'PHP ' . PHP_VERSION
                . ' • Max Upload: ' . ($limits['effectiveMaxLabel'] ?: 'Unlimited')
                . (empty($missingExt) ? ' • All extensions loaded (GD, curl, openssl, fileinfo, mbstring)' : ' • Missing: ' . implode(', ', $missingExt)),
        ];

        // 4. Thumbnails Backfill Coverage
        $totalActive = 0;
        $publishedCount = 0;
        $draftCount = 0;
        $trashedCount = 0;
        $withThumbCount = 0;
        $totalDownloads = 0;
        try {
            $publishedCount = Image::where('status', 'published')->count();
            $draftCount = Image::where('status', '!=', 'published')->count();
            $totalActive = $publishedCount + $draftCount;
            $trashedCount = TrashService::hasSoftDeleteColumn() ? Image::onlyTrashed()->count() : 0;
            $withThumbCount = Schema::hasColumn('Image', 'thumbPath')
                ? Image::whereNotNull('thumbPath')->where('thumbPath', '!=', '')->count()
                : 0;
            $totalDownloads = Download::count();
        } catch (\Throwable $e) {
            // Keep zeroes
        }

        $checks[] = [
            'id' => 'thumbnails',
            'label' => 'Grid Thumbnail Optimization',
            'status' => ($totalActive === 0 || $withThumbCount > 0) ? 'ok' : 'warn',
            'detail' => $totalActive === 0
                ? 'No uploaded images yet (new uploads auto-generate thumbnails)'
                : "{$withThumbCount} / {$totalActive} active images have dedicated lightweight thumbnails",
        ];

        // 5. Sitemap & SEO Freshness
        $sitemapExists = is_file(public_path('sitemap.xml'));
        $seoSettings = SeoGeneratorService::getSettings();
        $lastGen = $seoSettings['lastGeneratedAt'] ?? null;
        $checks[] = [
            'id' => 'seo',
            'label' => 'Sitemaps & SEO Index',
            'status' => $sitemapExists ? 'ok' : 'warn',
            'detail' => $sitemapExists
                ? ('sitemap.xml present' . ($lastGen ? ' • Last updated ' . \Carbon\Carbon::parse($lastGen)->diffForHumans() : ''))
                : 'sitemap.xml not generated yet (auto-creates when images are published)',
        ];

        // 6. Gemini AI Keys
        $activeAiKeys = 0;
        try {
            $activeAiKeys = ApiKey::where('isActive', true)->count();
        } catch (\Throwable $e) {
        }
        $checks[] = [
            'id' => 'gemini',
            'label' => 'Gemini AI Metadata Engine',
            'status' => $activeAiKeys > 0 ? 'ok' : 'warn',
            'detail' => $activeAiKeys > 0
                ? "{$activeAiKeys} active API key(s) configured"
                : 'No active Gemini API key (AI auto-tagging disabled)',
        ];

        // 7. Installer Lock & Mail
        $installedLocked = HostingEnvironment::isInstalled();
        $mailer = (string) config('mail.default', 'log');
        $checks[] = [
            'id' => 'security',
            'label' => 'Installer Lock & Mailer',
            'status' => $installedLocked ? 'ok' : 'warn',
            'detail' => ($installedLocked ? 'Installer locked (.installed)' : 'Installer unlocked')
                . ' • Mailer: ' . $mailer
                . ' • Version ' . HostingEnvironment::getAppVersion(),
        ];

        // 8. Captcha Posture Summary
        $captcha = CaptchaService::getSettings();
        $checks[] = [
            'id' => 'captcha',
            'label' => 'Captcha Bot Protection',
            'status' => ($captcha['downloadProvider'] !== 'none' || $captcha['adminLoginProvider'] !== 'none' || $captcha['teamLoginProvider'] !== 'none') ? 'ok' : 'warn',
            'detail' => sprintf(
                'Download: %s (%ds gate) • Admin Login: %s • Team Login: %s',
                $captcha['downloadProvider'],
                (int) ($captcha['downloadCountdownSeconds'] ?? 3),
                $captcha['adminLoginProvider'],
                $captcha['teamLoginProvider']
            ),
        ];

        $hasError = collect($checks)->contains(fn ($c) => $c['status'] === 'error');
        $hasWarn = collect($checks)->contains(fn ($c) => $c['status'] === 'warn');

        return [
            'overall' => $hasError ? 'error' : ($hasWarn ? 'warn' : 'ok'),
            'checkedAt' => now()->toISOString(),
            'stats' => [
                'published' => $publishedCount,
                'drafts' => $draftCount,
                'trashed' => $trashedCount,
                'withThumbs' => $withThumbCount,
                'totalDownloads' => $totalDownloads,
                'trashRetentionDays' => TrashService::getRetentionDays(),
            ],
            'checks' => $checks,
        ];
    }
}

