<?php

namespace App\Services;

use App\Models\Collection;
use App\Models\Image;
use App\Models\SeoSetting;

class SeoGeneratorService
{
    public const DEFAULT_ID = 'default';

    public static function defaults(): array
    {
        return [
            'id' => self::DEFAULT_ID,
            'autoRegenerate' => true,
            'scheduleFrequency' => 'daily',
            'scheduleTime' => '00:00',
            'scheduleDayOfWeek' => 1,
            'scheduleDayOfMonth' => 1,
            'disallowAdminInRobots' => true,
            'includeImageXml' => true,
            'includeLlmsTxt' => true,
            'includeManifest' => true,
            'customRobotsRules' => '',
            'lastGeneratedAt' => null,
            'lastGeneratedTrigger' => null,
            'lastStats' => null,
            'nextScheduledAt' => null,
        ];
    }

    private static function escapeXml(string $unsafe): string
    {
        return htmlspecialchars($unsafe, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    public static function getSettings(): array
    {
        $defaults = self::defaults();
        try {
            $row = SeoSetting::find(self::DEFAULT_ID);
            if ($row) {
                $stats = $row->lastStatsJson ? json_decode($row->lastStatsJson, true) : null;
                return [
                    'id' => self::DEFAULT_ID,
                    'autoRegenerate' => (bool) $row->autoRegenerate,
                    'scheduleFrequency' => $row->scheduleFrequency ?: 'daily',
                    'scheduleTime' => $row->scheduleTime ?: '00:00',
                    'scheduleDayOfWeek' => (int) $row->scheduleDayOfWeek,
                    'scheduleDayOfMonth' => (int) $row->scheduleDayOfMonth,
                    'disallowAdminInRobots' => (bool) $row->disallowAdminInRobots,
                    'includeImageXml' => (bool) $row->includeImageXml,
                    'includeLlmsTxt' => (bool) $row->includeLlmsTxt,
                    'includeManifest' => (bool) $row->includeManifest,
                    'customRobotsRules' => $row->customRobotsRules ?? '',
                    'lastGeneratedAt' => $row->lastGeneratedAt?->toISOString(),
                    'lastGeneratedTrigger' => $row->lastGeneratedTrigger,
                    'lastStats' => $stats,
                    'nextScheduledAt' => $row->autoRegenerate ? now()->addDay()->toISOString() : null,
                ];
            }
        } catch (\Throwable $e) {
            // Ignore
        }
        return $defaults;
    }

    public static function saveSettings(array $data): array
    {
        $current = self::getSettings();
        $next = [
            'autoRegenerate' => array_key_exists('autoRegenerate', $data) ? (bool) $data['autoRegenerate'] : $current['autoRegenerate'],
            'scheduleFrequency' => $data['scheduleFrequency'] ?? $current['scheduleFrequency'],
            'scheduleTime' => $data['scheduleTime'] ?? $current['scheduleTime'],
            'scheduleDayOfWeek' => (int) ($data['scheduleDayOfWeek'] ?? $current['scheduleDayOfWeek']),
            'scheduleDayOfMonth' => (int) ($data['scheduleDayOfMonth'] ?? $current['scheduleDayOfMonth']),
            'disallowAdminInRobots' => array_key_exists('disallowAdminInRobots', $data) ? (bool) $data['disallowAdminInRobots'] : $current['disallowAdminInRobots'],
            'includeImageXml' => array_key_exists('includeImageXml', $data) ? (bool) $data['includeImageXml'] : $current['includeImageXml'],
            'includeLlmsTxt' => array_key_exists('includeLlmsTxt', $data) ? (bool) $data['includeLlmsTxt'] : $current['includeLlmsTxt'],
            'includeManifest' => array_key_exists('includeManifest', $data) ? (bool) $data['includeManifest'] : $current['includeManifest'],
            'customRobotsRules' => $data['customRobotsRules'] ?? $current['customRobotsRules'],
            'lastGeneratedAt' => $data['lastGeneratedAt'] ?? $current['lastGeneratedAt'],
            'lastGeneratedTrigger' => $data['lastGeneratedTrigger'] ?? $current['lastGeneratedTrigger'],
            'lastStatsJson' => isset($data['lastStats']) ? json_encode($data['lastStats']) : ($current['lastStats'] ? json_encode($current['lastStats']) : null),
        ];

        SeoSetting::updateOrCreate(['id' => self::DEFAULT_ID], $next);
        return self::getSettings();
    }

    public static function checkScheduled(): void
    {
        try {
            $settings = self::getSettings();
            if (empty($settings['autoRegenerate'])) {
                return;
            }
            if (empty($settings['lastGeneratedAt'])) {
                return;
            }

            $last = \Carbon\Carbon::parse($settings['lastGeneratedAt']);
            $due = match ($settings['scheduleFrequency'] ?? 'daily') {
                'hourly' => $last->addHour(),
                'weekly' => $last->addWeek(),
                'monthly' => $last->addMonth(),
                default => $last->addDay(),
            };

            if (now()->greaterThanOrEqualTo($due)) {
                self::generateAll('auto-schedule');
            }
        } catch (\Throwable $e) {
            // Ignore background check failures
        }
    }

    public static function generateAll(string $trigger = 'manual'): array
    {
        $info = WebsiteInfoService::get();
        $seoSettings = self::getSettings();
        $publishedImages = Image::where('status', 'published')->orderByDesc('updatedAt')->get();
        $collections = Collection::where('status', 'published')->orderByDesc('updatedAt')->get();

        $baseUrl = rtrim($info['websiteUrl'] ?: 'https://png101.com', '/');
        $publicDir = public_path();
        $nowIso = now()->toISOString();
        $filesGenerated = [];

        // 1. sitemap-pages.xml
        $staticPages = [
            ['path' => '', 'priority' => '1.0', 'changefreq' => 'daily'],
            ['path' => '/latest', 'priority' => '0.9', 'changefreq' => 'daily'],
            ['path' => '/collections', 'priority' => '0.9', 'changefreq' => 'daily'],
            ['path' => '/tags', 'priority' => '0.8', 'changefreq' => 'daily'],
            ['path' => '/about-us', 'priority' => '0.7', 'changefreq' => 'monthly'],
            ['path' => '/contact-us', 'priority' => '0.6', 'changefreq' => 'monthly'],
            ['path' => '/terms-of-service', 'priority' => '0.5', 'changefreq' => 'yearly'],
            ['path' => '/privacy-policy', 'priority' => '0.5', 'changefreq' => 'yearly'],
            ['path' => '/dmca-policy', 'priority' => '0.5', 'changefreq' => 'yearly'],
        ];

        $pagesXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($staticPages as $p) {
            $loc = self::escapeXml($baseUrl . $p['path']);
            $pagesXml .= "  <url>\n    <loc>{$loc}</loc>\n    <lastmod>{$nowIso}</lastmod>\n    <changefreq>{$p['changefreq']}</changefreq>\n    <priority>{$p['priority']}</priority>\n  </url>\n";
        }
        $pagesXml .= "</urlset>\n";
        file_put_contents($publicDir . '/sitemap-pages.xml', $pagesXml);
        $filesGenerated[] = '/sitemap-pages.xml';

        // 2. sitemap-images.xml
        $imageNs = $seoSettings['includeImageXml'] ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '';
        $imagesXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"{$imageNs}>\n";
        foreach ($publishedImages as $img) {
            $slug = CollectionService::slugify($img->name ?: $img->filename ?: 'image');
            $pageUrl = $baseUrl . '/images/' . $img->id . ($slug ? "-{$slug}" : '');
            $rawImgPath = $img->previewPath ?: $img->path ?: '';
            $fullImgUrl = str_starts_with($rawImgPath, 'http')
                ? $rawImgPath
                : $baseUrl . (str_starts_with($rawImgPath, '/') ? '' : '/') . $rawImgPath;
            $lastMod = $img->updatedAt ? $img->updatedAt->toISOString() : $nowIso;

            $imagesXml .= "  <url>\n    <loc>" . self::escapeXml($pageUrl) . "</loc>\n    <lastmod>{$lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>";
            if ($seoSettings['includeImageXml']) {
                $title = self::escapeXml($img->name ?: $img->filename ?: 'PNG Image');
                $caption = $img->description ?: $img->altText ?: '';
                $imagesXml .= "\n    <image:image>\n      <image:loc>" . self::escapeXml($fullImgUrl) . "</image:loc>\n      <image:title>{$title}</image:title>";
                if ($caption !== '') {
                    $imagesXml .= "\n      <image:caption>" . self::escapeXml($caption) . "</image:caption>";
                }
                $imagesXml .= "\n    </image:image>";
            }
            $imagesXml .= "\n  </url>\n";
        }
        $imagesXml .= "</urlset>\n";
        file_put_contents($publicDir . '/sitemap-images.xml', $imagesXml);
        $filesGenerated[] = '/sitemap-images.xml';

        // 3. sitemap-collections.xml
        $collectionsXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        $collectionsXml .= "  <url>\n    <loc>" . self::escapeXml("{$baseUrl}/collections") . "</loc>\n    <lastmod>{$nowIso}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n";
        foreach ($collections as $col) {
            $colUrl = self::escapeXml("{$baseUrl}/collections/{$col->slug}");
            $lastMod = $col->updatedAt ? $col->updatedAt->toISOString() : $nowIso;
            $prio = $col->isFeatured ? '0.9' : '0.8';
            $collectionsXml .= "  <url>\n    <loc>{$colUrl}</loc>\n    <lastmod>{$lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>{$prio}</priority>\n  </url>\n";
        }
        $collectionsXml .= "</urlset>\n";
        file_put_contents($publicDir . '/sitemap-collections.xml', $collectionsXml);
        $filesGenerated[] = '/sitemap-collections.xml';

        // 4. sitemap-tags.xml
        $uniqueTagsMap = [];
        foreach ($publishedImages as $img) {
            foreach ((is_array($img->tags) ? $img->tags : []) as $rawTag) {
                if (is_string($rawTag)) {
                    $cleaned = trim($rawTag);
                    $lower = strtolower($cleaned);
                    if ($cleaned !== '' && !isset($uniqueTagsMap[$lower])) {
                        $uniqueTagsMap[$lower] = $cleaned;
                    }
                }
            }
        }
        $uniqueTags = array_values($uniqueTagsMap);

        $tagsXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($uniqueTags as $tag) {
            $tagUrl = self::escapeXml("{$baseUrl}/search?q=" . rawurlencode($tag));
            $tagsXml .= "  <url>\n    <loc>{$tagUrl}</loc>\n    <lastmod>{$nowIso}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n";
        }
        $tagsXml .= "</urlset>\n";
        file_put_contents($publicDir . '/sitemap-tags.xml', $tagsXml);
        $filesGenerated[] = '/sitemap-tags.xml';

        // 5. sitemap.xml
        $subSitemaps = ['sitemap-pages.xml', 'sitemap-images.xml', 'sitemap-collections.xml', 'sitemap-tags.xml'];
        $indexXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($subSitemaps as $file) {
            $indexXml .= "  <sitemap>\n    <loc>" . self::escapeXml("{$baseUrl}/{$file}") . "</loc>\n    <lastmod>{$nowIso}</lastmod>\n  </sitemap>\n";
        }
        $indexXml .= "</sitemapindex>\n";
        file_put_contents($publicDir . '/sitemap.xml', $indexXml);
        array_unshift($filesGenerated, '/sitemap.xml');

        // 6. robots.txt
        $robots = [
            "# robots.txt for {$info['websiteName']}",
            "# Generated at {$nowIso}",
            'User-agent: *',
            'Allow: /',
        ];
        if ($seoSettings['disallowAdminInRobots']) {
            $robots[] = 'Disallow: /admin';
            $robots[] = 'Disallow: /api/';
        }
        if (!empty(trim($seoSettings['customRobotsRules'] ?? ''))) {
            $robots[] = '';
            $robots[] = '# Custom Rules';
            $robots[] = trim($seoSettings['customRobotsRules']);
        }
        $robots[] = '';
        $robots[] = "Sitemap: {$baseUrl}/sitemap.xml";
        $robots[] = "Sitemap: {$baseUrl}/sitemap-pages.xml";
        $robots[] = "Sitemap: {$baseUrl}/sitemap-images.xml";
        $robots[] = "Sitemap: {$baseUrl}/sitemap-collections.xml";
        $robots[] = "Sitemap: {$baseUrl}/sitemap-tags.xml";
        file_put_contents($publicDir . '/robots.txt', implode("\n", $robots) . "\n");
        $filesGenerated[] = '/robots.txt';

        // 7. llms.txt
        if ($seoSettings['includeLlmsTxt']) {
            $topCollections = $collections->take(25)->map(fn($c) => "- [{$c->name}]({$baseUrl}/collections/{$c->slug})")->all();
            $topTags = implode(', ', array_slice($uniqueTags, 0, 40));
            $llms = [
                "# {$info['websiteName']}",
                '',
                "> {$info['tagline']}",
                '',
                "Website: {$baseUrl}",
                "Contact: {$info['contactEmail']}",
                '',
                '## Main Pages',
                "- [Home]({$baseUrl}/)",
                "- [Collections]({$baseUrl}/collections)",
                "- [About Us]({$baseUrl}/about-us)",
                "- [Contact Us]({$baseUrl}/contact-us)",
                "- [Terms of Service]({$baseUrl}/terms-of-service)",
                "- [Privacy Policy]({$baseUrl}/privacy-policy)",
                "- [DMCA Policy]({$baseUrl}/dmca-policy)",
                '',
                '## Sitemaps',
                "- [Master Sitemap Index]({$baseUrl}/sitemap.xml)",
                "- [Collections Sitemap ({$collections->count()} packs)]({$baseUrl}/sitemap-collections.xml)",
                "- [Images Sitemap ({$publishedImages->count()} PNGs)]({$baseUrl}/sitemap-images.xml)",
                "- [Tags Sitemap (" . count($uniqueTags) . " tags)]({$baseUrl}/sitemap-tags.xml)",
            ];
            if (!empty($topCollections)) {
                $llms = array_merge($llms, ['', '## Curated Collections'], $topCollections);
            }
            if ($topTags !== '') {
                $llms = array_merge($llms, ['', '## Popular Tags', $topTags]);
            }
            file_put_contents($publicDir . '/llms.txt', implode("\n", $llms) . "\n");
            $filesGenerated[] = '/llms.txt';
        }

        // 8. manifest.webmanifest
        if ($seoSettings['includeManifest']) {
            $manifest = [
                'name' => $info['websiteName'],
                'short_name' => $info['websiteName'],
                'description' => $info['tagline'],
                'start_url' => '/',
                'display' => 'standalone',
                'background_color' => '#0f172a',
                'theme_color' => '#3b82f6',
                'icons' => [
                    ['src' => '/favicon.ico', 'sizes' => 'any', 'type' => 'image/x-icon'],
                ],
            ];
            file_put_contents($publicDir . '/manifest.webmanifest', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $filesGenerated[] = '/manifest.webmanifest';
        }

        return self::saveSettings([
            'lastGeneratedAt' => now(),
            'lastGeneratedTrigger' => $trigger,
            'lastStats' => [
                'pagesCount' => count($staticPages),
                'imagesCount' => $publishedImages->count(),
                'collectionsCount' => $collections->count(),
                'tagsCount' => count($uniqueTags),
                'categoriesCount' => 0,
                'filesGenerated' => $filesGenerated,
            ],
        ]);
    }
}

