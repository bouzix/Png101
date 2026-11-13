<?php

namespace App\Http\Controllers;

use App\Models\Download;
use App\Models\Image;
use App\Models\ImageView;
use App\Models\SearchLog;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function track(Request $request)
    {
        try {
            $imageId = $request->input('imageId');
            $eventType = $request->input('eventType');

            if ($eventType === 'view' && $imageId) {
                AnalyticsService::recordImageView($imageId);
                return response()->json(['success' => true]);
            }

            $deviceType = AnalyticsService::detectDevice($request->userAgent());
            $country = AnalyticsService::detectCountry($request->ip());

            AnalyticsService::recordDownload([
                'imageId' => $imageId,
                'deviceType' => $deviceType,
                'country' => $country['countryCode'],
                'countryName' => $country['countryName'],
                'isCustomSize' => (bool) $request->input('isCustomSize', false),
                'resolution' => $request->input('resolution'),
            ]);

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false], 500);
        }
    }

    private function countryFlag(?string $code): string
    {
        $c = strtoupper(trim((string) $code));
        if (strlen($c) === 2 && ctype_alpha($c)) {
            return mb_chr(0x1F1E6 + ord($c[0]) - 65, 'UTF-8')
                . mb_chr(0x1F1E6 + ord($c[1]) - 65, 'UTF-8');
        }
        return '🌐';
    }

    public function stats(Request $request)
    {
        $session = \App\Services\TeamService::getCurrentSession($request);
        if (!\App\Services\TeamService::hasPermission($session, 'view_analytics')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        try {
            $range = $request->query('range', '7d');
            $deviceFilter = $request->query('device');
            $countryFilter = $request->query('country');
            $tagsParam = $request->query('tags', '');
            $filterTags = array_values(array_filter(array_map(fn($t) => strtolower(trim($t)), explode(',', (string) $tagsParam))));
            $minDownloads = max(0, (int) $request->query('minDownloads', 0));
            $sortBy = $request->query('sortBy', 'downloads_desc');
            $page = max(1, (int) $request->query('page', 1));
            $limit = max(1, min(100, (int) $request->query('limit', 10)));

            $dateThreshold = AnalyticsService::getRangeStartDate($range);
            $diffSeconds = max(1, (int) abs(now()->diffInSeconds($dateThreshold, false)));
            $prevStart = $dateThreshold->copy()->subSeconds($diffSeconds);

            $totalImages = Image::count();
            $totalDownloads = Download::count();
            $publishedImages = Image::where('status', 'published')->count();
            $draftImages = Image::where('status', 'draft')->count();

            $allPublished = Image::with(['categories.category'])
                ->withCount('downloads')
                ->where('status', 'published')
                ->get();

            $periodDownloads = Download::where('createdAt', '>=', $dateThreshold)->get();
            $prevPeriodDownloadsCount = Download::where('createdAt', '>=', $prevStart)
                ->where('createdAt', '<', $dateThreshold)
                ->count();

            $filteredDownloads = $periodDownloads->filter(function ($d) use ($deviceFilter, $countryFilter) {
                if ($deviceFilter && $deviceFilter !== 'all' && $d->deviceType !== $deviceFilter) {
                    return false;
                }
                if ($countryFilter && $countryFilter !== 'all' && strtoupper((string) $d->country) !== strtoupper($countryFilter)) {
                    return false;
                }
                return true;
            });

            $recentDownloads = DB::table('Download as d')
                ->leftJoin('Image as i', 'd.imageId', '=', 'i.id')
                ->select([
                    'd.id', 'd.imageId', 'd.deviceType', 'd.country', 'd.countryName',
                    'd.isCustomSize', 'd.resolution', 'd.createdAt',
                    'i.name as imageName', 'i.filename as imageFilename', 'i.path as imagePath', 'i.previewPath as imagePreviewPath',
                ])
                ->orderByDesc('d.createdAt')
                ->limit(10)
                ->get()
                ->map(function ($r) {
                    $relPath = $r->imagePreviewPath ?: ($r->imagePath ?: '');
                    $imgUrl = $relPath ? '/' . ltrim($relPath, '/') : '';
                    return [
                        'id' => $r->id,
                        'imageId' => $r->imageId,
                        'imageTitle' => $r->imageName ?: ($r->imageFilename ?: 'PNG Image'),
                        'imageUrl' => $imgUrl,
                        'deviceType' => $r->deviceType ?: 'desktop',
                        'countryCode' => $r->country ?: 'XX',
                        'countryName' => $r->countryName ?: 'Unknown',
                        'countryFlag' => $this->countryFlag($r->country),
                        'isCustomSize' => (bool) $r->isCustomSize,
                        'resolution' => $r->resolution ?: '',
                        'createdAt' => $r->createdAt,
                    ];
                });

            $totalViews = ImageView::count();
            $viewsByImage = ImageView::where('createdAt', '>=', $dateThreshold)
                ->select('imageId', DB::raw('COUNT(*) as count'))
                ->groupBy('imageId')
                ->pluck('count', 'imageId')
                ->all();
            $periodViews = array_sum($viewsByImage);

            $topSearches = SearchLog::where('createdAt', '>=', $dateThreshold)
                ->select('query', DB::raw('COUNT(*) as count'))
                ->groupBy('query')
                ->orderByDesc('count')
                ->limit(10)
                ->get()
                ->map(fn($s) => [
                    'query' => $s->query,
                    'count' => (int) $s->count,
                ]);

            $zeroResultQueries = SearchLog::where('resultsCount', 0)
                ->where('createdAt', '>=', $dateThreshold)
                ->select('query', DB::raw('COUNT(*) as count'))
                ->groupBy('query')
                ->orderByDesc('count')
                ->limit(10)
                ->get()
                ->map(fn($s) => [
                    'query' => $s->query,
                    'count' => (int) $s->count,
                ]);
            $zeroResultSearchesCount = SearchLog::where('resultsCount', 0)
                ->where('createdAt', '>=', $dateThreshold)
                ->count();

            $deviceCounts = ['desktop' => 0, 'mobile' => 0, 'tablet' => 0];
            $countryCounts = [];
            $downloadsByImage = [];
            $customResolutions = [];
            $customResizeCount = 0;

            foreach ($filteredDownloads as $d) {
                $dev = strtolower($d->deviceType ?: 'desktop');
                if (isset($deviceCounts[$dev])) {
                    $deviceCounts[$dev]++;
                } else {
                    $deviceCounts['desktop']++;
                }

                $code = strtoupper((string) ($d->country ?: 'XX'));
                $name = $d->countryName ?: 'Unknown';
                if (!isset($countryCounts[$code])) {
                    $countryCounts[$code] = [
                        'country' => $code,
                        'name' => $name,
                        'flag' => $this->countryFlag($code),
                        'count' => 0,
                    ];
                }
                $countryCounts[$code]['count']++;

                if ($d->imageId) {
                    $downloadsByImage[$d->imageId] = ($downloadsByImage[$d->imageId] ?? 0) + 1;
                }

                if ($d->isCustomSize) {
                    $customResizeCount++;
                    if ($d->resolution) {
                        $customResolutions[$d->resolution] = ($customResolutions[$d->resolution] ?? 0) + 1;
                    }
                }
            }

            $totalFiltered = $filteredDownloads->count();
            $deviceBreakdown = [];
            foreach ($deviceCounts as $device => $count) {
                if ($count > 0 || $device === 'desktop' || $device === 'mobile') {
                    $deviceBreakdown[] = ['device' => $device, 'count' => $count];
                }
            }

            $topCountries = array_values($countryCounts);
            usort($topCountries, fn($a, $b) => $b['count'] <=> $a['count']);
            $topCountries = array_slice($topCountries, 0, 10);

            arsort($customResolutions);
            $topCustomResolutions = [];
            foreach (array_slice($customResolutions, 0, 8, true) as $res => $cnt) {
                $topCustomResolutions[] = ['resolution' => $res, 'count' => $cnt];
            }

            $tagStats = [];
            $catStats = [];
            $availableTagsMap = [];

            foreach ($allPublished as $img) {
                $imgDl = $downloadsByImage[$img->id] ?? 0;
                $tags = is_array($img->tags) ? $img->tags : [];
                foreach ($tags as $rawTag) {
                    if (is_string($rawTag) && trim($rawTag) !== '') {
                        $clean = strtolower(trim($rawTag));
                        $availableTagsMap[$clean] = ($availableTagsMap[$clean] ?? 0) + 1;
                        if (!isset($tagStats[$clean])) {
                            $tagStats[$clean] = ['tag' => $clean, 'downloads' => 0, 'imageCount' => 0];
                        }
                        $tagStats[$clean]['downloads'] += $imgDl;
                        $tagStats[$clean]['imageCount']++;
                    }
                }
                foreach ($img->categories as $ic) {
                    if (!$ic->category) {
                        continue;
                    }
                    $cid = $ic->category->id;
                    if (!isset($catStats[$cid])) {
                        $catStats[$cid] = [
                            'id' => $cid,
                            'name' => $ic->category->name,
                            'slug' => $ic->category->slug,
                            'downloads' => 0,
                            'imageCount' => 0,
                        ];
                    }
                    $catStats[$cid]['downloads'] += $imgDl;
                    $catStats[$cid]['imageCount']++;
                }
            }

            usort($tagStats, fn($a, $b) => $b['downloads'] <=> $a['downloads'] ?: $b['imageCount'] <=> $a['imageCount']);
            $catValues = array_values($catStats);
            usort($catValues, fn($a, $b) => $b['downloads'] <=> $a['downloads'] ?: $b['imageCount'] <=> $a['imageCount']);
            arsort($availableTagsMap);
            $availableTags = array_keys(array_slice($availableTagsMap, 0, 100, true));

            $popularItems = [];
            foreach ($allPublished as $img) {
                $imgTags = array_values(array_filter(array_map(
                    fn($t) => is_string($t) ? strtolower(trim($t)) : '',
                    is_array($img->tags) ? $img->tags : []
                )));

                if (!empty($filterTags)) {
                    $matchesAll = true;
                    foreach ($filterTags as $ft) {
                        if (!in_array($ft, $imgTags, true)) {
                            $matchesAll = false;
                            break;
                        }
                    }
                    if (!$matchesAll) {
                        continue;
                    }
                }

                $periodDl = $downloadsByImage[$img->id] ?? 0;
                if ($periodDl < $minDownloads) {
                    continue;
                }

                $vw = (int) ($viewsByImage[$img->id] ?? 0);
                if ($periodDl === 0 && $vw === 0) {
                    continue;
                }
                $conv = $vw > 0 ? min(100, (int) round(($periodDl / $vw) * 100)) : 0;
                $relPath = $img->previewPath ?: $img->path;
                $w = (int) ($img->width ?? 0);
                $h = (int) ($img->height ?? 0);

                $popularItems[] = [
                    'id' => $img->id,
                    'url' => $relPath ? '/' . ltrim($relPath, '/') : '',
                    'title' => $img->name ?: $img->filename,
                    'name' => $img->name ?: $img->filename,
                    'viewsCount' => $vw,
                    'downloadsCount' => (int) ($img->downloads_count ?? 0),
                    'filteredDownloads' => $periodDl,
                    'conversionRate' => $conv,
                    'width' => $w,
                    'height' => $h,
                    'aspectRatio' => ($w > 0 && $h > 0) ? round($w / $h, 2) . ':1' : '',
                    'tags' => $imgTags,
                    'createdAtTs' => $img->createdAt?->timestamp ?? 0,
                ];
            }

            usort($popularItems, function ($a, $b) use ($sortBy) {
                return match ($sortBy) {
                    'downloads_asc' => $a['filteredDownloads'] <=> $b['filteredDownloads'],
                    'views_desc' => $b['viewsCount'] <=> $a['viewsCount'],
                    'conversion_desc' => $b['conversionRate'] <=> $a['conversionRate'],
                    'recent' => $b['createdAtTs'] <=> $a['createdAtTs'],
                    'name_asc' => strcasecmp($a['title'], $b['title']),
                    'name_desc' => strcasecmp($b['title'], $a['title']),
                    default => $b['filteredDownloads'] <=> $a['filteredDownloads'] ?: $b['viewsCount'] <=> $a['viewsCount'],
                };
            });

            $totalItems = count($popularItems);
            $totalPages = max(1, (int) ceil($totalItems / $limit));
            $offset = ($page - 1) * $limit;
            $pagedPopular = array_slice($popularItems, $offset, $limit);

            $conversionRate = $periodViews > 0 ? min(100, (int) round(($totalFiltered / $periodViews) * 100)) : 0;
            $customSizeRatio = $totalFiltered > 0 ? (int) round(($customResizeCount / $totalFiltered) * 100) : 0;
            $periodCountAll = $periodDownloads->count();
            $periodTrend = $prevPeriodDownloadsCount > 0
                ? (int) round((($periodCountAll - $prevPeriodDownloadsCount) / $prevPeriodDownloadsCount) * 100)
                : ($periodCountAll > 0 ? 100 : 0);

            return response()->json([
                'kpis' => [
                    'totalDownloads' => $totalDownloads,
                    'periodDownloads' => $totalFiltered,
                    'periodDownloadsTrend' => $periodTrend,
                    'totalViews' => $totalViews,
                    'periodViews' => $periodViews,
                    'conversionRate' => $conversionRate,
                    'totalImages' => $totalImages,
                    'publishedImages' => $publishedImages,
                    'draftImages' => $draftImages,
                    'zeroResultSearches' => $zeroResultSearchesCount,
                    'customSizeRatio' => $customSizeRatio,
                    'customDownloadsCount' => $customResizeCount,
                ],
                'deviceBreakdown' => $deviceBreakdown,
                'topCountries' => $topCountries,
                'topCustomResolutions' => $topCustomResolutions,
                'topTags' => array_slice($tagStats, 0, 12),
                'topCategories' => array_slice($catValues, 0, 8),
                'recentDownloads' => $recentDownloads,
                'topSearches' => $topSearches,
                'zeroResultQueries' => $zeroResultQueries,
                'popularImages' => $pagedPopular,
                'popularPagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'totalItems' => $totalItems,
                    'totalPages' => $totalPages,
                ],
                'availableTags' => $availableTags,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'kpis' => [
                    'totalDownloads' => 0,
                    'periodDownloads' => 0,
                    'periodDownloadsTrend' => 0,
                    'totalViews' => 0,
                    'periodViews' => 0,
                    'conversionRate' => 0,
                    'totalImages' => 0,
                    'publishedImages' => 0,
                    'draftImages' => 0,
                    'zeroResultSearches' => 0,
                    'customSizeRatio' => 0,
                    'customDownloadsCount' => 0,
                ],
                'deviceBreakdown' => [],
                'topCountries' => [],
                'topCustomResolutions' => [],
                'topTags' => [],
                'topCategories' => [],
                'recentDownloads' => [],
                'topSearches' => [],
                'zeroResultQueries' => [],
                'popularImages' => [],
                'popularPagination' => ['page' => 1, 'limit' => 10, 'totalItems' => 0, 'totalPages' => 1],
                'availableTags' => [],
            ]);
        }
    }

    public function downloads(Request $request)
    {
        $session = \App\Services\TeamService::getCurrentSession($request);
        if (!\App\Services\TeamService::hasPermission($session, 'view_analytics')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $range = $request->query('range', '7d');
        $device = $request->query('device');
        $country = $request->query('country');
        $startDate = AnalyticsService::getRangeStartDate($range);

        $diffSeconds = max(1, now()->diffInSeconds($startDate, false) * -1);
        $previousStart = $startDate->copy()->subSeconds($diffSeconds);

        $dlQuery = Download::where('createdAt', '>=', $startDate);
        $prevQuery = Download::where('createdAt', '>=', $previousStart)->where('createdAt', '<', $startDate);
        if ($device && $device !== 'all') {
            $dlQuery->where('deviceType', $device);
            $prevQuery->where('deviceType', $device);
        }
        if ($country && $country !== 'all') {
            $dlQuery->where('country', $country);
            $prevQuery->where('country', $country);
        }

        $dlRows = $dlQuery->orderBy('createdAt')->get(['createdAt']);
        $previousTotal = $prevQuery->count();
        $total = $dlRows->count();

        $viewRows = ImageView::where('createdAt', '>=', $startDate)->orderBy('createdAt')->get(['createdAt']);
        $totalViews = $viewRows->count();

        $format = in_array($range, ['1h', '24h'], true) ? 'H:00' : 'Y-m-d';
        $buckets = [];
        foreach ($dlRows as $row) {
            $key = $row->createdAt->format($format);
            if (!isset($buckets[$key])) {
                $buckets[$key] = ['date' => $key, 'downloads' => 0, 'views' => 0];
            }
            $buckets[$key]['downloads']++;
        }
        foreach ($viewRows as $row) {
            $key = $row->createdAt->format($format);
            if (!isset($buckets[$key])) {
                $buckets[$key] = ['date' => $key, 'downloads' => 0, 'views' => 0];
            }
            $buckets[$key]['views']++;
        }

        ksort($buckets);
        $data = array_values($buckets);

        $growthPercent = $previousTotal > 0
            ? (int) round((($total - $previousTotal) / $previousTotal) * 100)
            : ($total > 0 ? 100 : 0);

        return response()->json([
            'data' => $data,
            'total' => $total,
            'totalViews' => $totalViews,
            'growthPercent' => $growthPercent,
            'previousTotal' => $previousTotal,
        ]);
    }

    public function countries(Request $request)
    {
        $session = \App\Services\TeamService::getCurrentSession($request);
        if (!\App\Services\TeamService::hasPermission($session, 'view_analytics')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $range = $request->query('range', '7d');
        $startDate = AnalyticsService::getRangeStartDate($range);

        $rows = Download::where('createdAt', '>=', $startDate)
            ->whereNotNull('country')
            ->select('country', 'countryName', DB::raw('COUNT(*) as count'))
            ->groupBy('country', 'countryName')
            ->orderByDesc('count')
            ->get();

        $result = $rows->map(function ($row) {
            $code = strtoupper((string) ($row->country ?? ''));
            $flag = '🌐';
            if (strlen($code) === 2 && ctype_alpha($code)) {
                $flag = mb_chr(0x1F1E6 + ord($code[0]) - 65, 'UTF-8')
                    . mb_chr(0x1F1E6 + ord($code[1]) - 65, 'UTF-8');
            }
            return [
                'code' => $code,
                'name' => $row->countryName ?: $code,
                'downloads' => (int) $row->count,
                'flag' => $flag,
            ];
        })->values();

        return response()->json($result);
    }
}

