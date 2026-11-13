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

    public function stats(Request $request)
    {
        try {
            $range = $request->query('range', '7d');
            $deviceFilter = $request->query('device');
            $countryFilter = $request->query('country');
            $dateThreshold = AnalyticsService::getRangeStartDate($range);

            $totalImages = Image::count();
            $totalDownloads = Download::count();
            $publishedImages = Image::where('status', 'published')->count();
            $draftImages = Image::where('status', 'draft')->count();

            $allPublished = Image::with(['categories.category'])
                ->withCount('downloads')
                ->where('status', 'published')
                ->get();

            $periodDownloads = Download::where('createdAt', '>=', $dateThreshold)->get();
            $filteredDownloads = $periodDownloads->filter(function ($d) use ($deviceFilter, $countryFilter) {
                if ($deviceFilter && $deviceFilter !== 'all' && $d->deviceType !== $deviceFilter) {
                    return false;
                }
                if ($countryFilter && $countryFilter !== 'all' && $d->country !== $countryFilter) {
                    return false;
                }
                return true;
            });

            $recentDownloads = DB::table('Download as d')
                ->leftJoin('Image as i', 'd.imageId', '=', 'i.id')
                ->select([
                    'd.id', 'd.imageId', 'd.deviceType', 'd.country', 'd.countryName',
                    'd.isCustomSize', 'd.resolution', 'd.createdAt',
                    'i.name as imageName', 'i.filename as imageFilename', 'i.path as imagePath',
                ])
                ->orderByDesc('d.createdAt')
                ->limit(15)
                ->get()
                ->map(fn($r) => [
                    'id' => $r->id,
                    'imageId' => $r->imageId,
                    'imageName' => $r->imageName ?: ($r->imageFilename ?: 'PNG Image'),
                    'imagePath' => $r->imagePath ?: '',
                    'device' => $r->deviceType ?: 'desktop',
                    'deviceType' => $r->deviceType ?: 'desktop',
                    'countryCode' => $r->country ?: 'XX',
                    'country' => $r->country ?: 'XX',
                    'countryName' => $r->countryName ?: 'Unknown',
                    'isCustomSize' => (bool) $r->isCustomSize,
                    'resolution' => $r->resolution ?: '',
                    'createdAt' => $r->createdAt,
                ]);

            $totalViews = ImageView::count();
            $viewsByImage = ImageView::where('createdAt', '>=', $dateThreshold)
                ->select('imageId', DB::raw('COUNT(*) as count'))
                ->groupBy('imageId')
                ->pluck('count', 'imageId')
                ->all();
            $periodViews = array_sum($viewsByImage);

            $topSearches = SearchLog::where('createdAt', '>=', $dateThreshold)
                ->select('query', DB::raw('COUNT(*) as searches'), DB::raw('AVG(resultsCount) as avgResults'))
                ->groupBy('query')
                ->orderByDesc('searches')
                ->limit(10)
                ->get()
                ->map(fn($s) => [
                    'query' => $s->query,
                    'searches' => (int) $s->searches,
                    'avgResults' => (int) round($s->avgResults ?? 0),
                ]);

            $zeroResultSearches = SearchLog::where('resultsCount', 0)
                ->where('createdAt', '>=', $dateThreshold)
                ->select('query', DB::raw('COUNT(*) as searches'), DB::raw('MAX(createdAt) as lastSearchedAt'))
                ->groupBy('query')
                ->orderByDesc('searches')
                ->orderByDesc('lastSearchedAt')
                ->limit(10)
                ->get()
                ->map(fn($s) => [
                    'query' => $s->query,
                    'searches' => (int) $s->searches,
                    'lastSearchedAt' => $s->lastSearchedAt,
                ]);

            $totalStorageBytes = 0;
            $zeroDownloadImagesCount = 0;
            foreach ($allPublished as $img) {
                $totalStorageBytes += (int) ($img->size ?? 0);
                if (($img->downloads_count ?? 0) === 0) {
                    $zeroDownloadImagesCount++;
                }
            }
            $avgImageSizeBytes = $allPublished->count() > 0 ? (int) round($totalStorageBytes / $allPublished->count()) : 0;

            $deviceCounts = ['desktop' => 0, 'mobile' => 0, 'tablet' => 0];
            $countryCounts = [];
            $downloadsByImage = [];
            $customResizeCount = 0;
            $originalSizeCount = 0;

            foreach ($filteredDownloads as $d) {
                $dev = strtolower($d->deviceType ?: 'desktop');
                if (isset($deviceCounts[$dev])) {
                    $deviceCounts[$dev]++;
                } else {
                    $deviceCounts['desktop']++;
                }

                $code = $d->country ?: 'XX';
                $name = $d->countryName ?: 'Unknown';
                if (!isset($countryCounts[$code])) {
                    $countryCounts[$code] = ['country' => $code, 'countryName' => $name, 'count' => 0];
                }
                $countryCounts[$code]['count']++;

                if ($d->imageId) {
                    $downloadsByImage[$d->imageId] = ($downloadsByImage[$d->imageId] ?? 0) + 1;
                }

                if ($d->isCustomSize) {
                    $customResizeCount++;
                } else {
                    $originalSizeCount++;
                }
            }

            $totalFiltered = $filteredDownloads->count();
            $deviceBreakdown = [];
            foreach ($deviceCounts as $device => $count) {
                $pct = $totalFiltered > 0 ? (int) round(($count / $totalFiltered) * 100) : 0;
                $deviceBreakdown[] = ['device' => $device, 'count' => $count, 'percent' => $pct, 'percentage' => $pct];
            }

            usort($countryCounts, fn($a, $b) => $b['count'] <=> $a['count']);
            $topCountries = array_map(function ($c) use ($totalFiltered) {
                $pct = $totalFiltered > 0 ? (int) round(($c['count'] / $totalFiltered) * 100) : 0;
                return [
                    'code' => $c['country'],
                    'name' => $c['countryName'],
                    'country' => $c['country'],
                    'countryName' => $c['countryName'],
                    'count' => $c['count'],
                    'percent' => $pct,
                    'percentage' => $pct,
                ];
            }, array_slice($countryCounts, 0, 10));

            $tagStats = [];
            $catStats = [];
            foreach ($allPublished as $img) {
                $imgDl = $downloadsByImage[$img->id] ?? 0;
                foreach ((is_array($img->tags) ? $img->tags : []) as $rawTag) {
                    if (is_string($rawTag) && trim($rawTag) !== '') {
                        $clean = strtolower(trim($rawTag));
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
            usort($catStats, fn($a, $b) => $b['downloads'] <=> $a['downloads'] ?: $b['imageCount'] <=> $a['imageCount']);

            $popularImages = [];
            foreach ($allPublished as $img) {
                $dl = $downloadsByImage[$img->id] ?? 0;
                $vw = (int) ($viewsByImage[$img->id] ?? 0);
                if ($dl > 0 || $vw > 0) {
                    $conv = $vw > 0 ? min(100, (int) round(($dl / $vw) * 100)) : 0;
                    $popularImages[] = [
                        'id' => $img->id,
                        'name' => $img->name ?: $img->filename,
                        'path' => $img->path,
                        'downloads' => $dl,
                        'allTimeDownloads' => (int) ($img->downloads_count ?? 0),
                        'views' => $vw,
                        'conversionRate' => $conv,
                        'size' => (int) ($img->size ?? 0),
                        'tags' => is_array($img->tags) ? $img->tags : [],
                        'createdAt' => $img->createdAt?->toISOString(),
                    ];
                }
            }
            usort($popularImages, fn($a, $b) => $b['downloads'] <=> $a['downloads'] ?: $b['views'] <=> $a['views']);

            $periodConversionRate = $periodViews > 0 ? min(100, (int) round(($totalFiltered / $periodViews) * 100)) : 0;
            $customPercent = $totalFiltered > 0 ? (int) round(($customResizeCount / $totalFiltered) * 100) : 0;

            return response()->json([
                'totalImages' => $totalImages,
                'totalDownloads' => $totalDownloads,
                'publishedImages' => $publishedImages,
                'draftImages' => $draftImages,
                'totalViews' => $totalViews,
                'periodViews' => $periodViews,
                'periodDownloads' => $totalFiltered,
                'periodConversionRate' => $periodConversionRate,
                'totalStorageBytes' => $totalStorageBytes,
                'avgImageSizeBytes' => $avgImageSizeBytes,
                'zeroDownloadImagesCount' => $zeroDownloadImagesCount,
                'deviceBreakdown' => $deviceBreakdown,
                'topCountries' => $topCountries,
                'resizeBreakdown' => [
                    'originalCount' => $originalSizeCount,
                    'customCount' => $customResizeCount,
                    'customPercent' => $customPercent,
                    'originalPercent' => 100 - $customPercent,
                    'customPercentage' => $customPercent,
                ],
                'topTags' => array_slice($tagStats, 0, 12),
                'topCategories' => array_slice($catStats, 0, 8),
                'recentDownloads' => $recentDownloads,
                'topSearches' => $topSearches,
                'zeroResultSearches' => $zeroResultSearches,
                'popularImages' => array_slice($popularImages, 0, 100),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'totalImages' => 0, 'totalDownloads' => 0, 'publishedImages' => 0, 'draftImages' => 0,
                'totalViews' => 0, 'periodViews' => 0, 'periodDownloads' => 0, 'periodConversionRate' => 0,
                'totalStorageBytes' => 0, 'avgImageSizeBytes' => 0, 'zeroDownloadImagesCount' => 0,
                'deviceBreakdown' => [], 'topCountries' => [],
                'resizeBreakdown' => ['originalCount' => 0, 'customCount' => 0, 'customPercentage' => 0],
                'topTags' => [], 'topCategories' => [], 'recentDownloads' => [],
                'topSearches' => [], 'zeroResultSearches' => [], 'popularImages' => [],
            ]);
        }
    }

    public function downloads(Request $request)
    {
        $range = $request->query('range', '7d');
        $device = $request->query('device');
        $country = $request->query('country');
        $startDate = AnalyticsService::getRangeStartDate($range);

        $query = Download::where('createdAt', '>=', $startDate);
        if ($device && $device !== 'all') {
            $query->where('deviceType', $device);
        }
        if ($country && $country !== 'all') {
            $query->where('country', $country);
        }

        $rows = $query->orderBy('createdAt')->get(['createdAt']);
        $format = in_array($range, ['1h', '24h'], true) ? 'H:00' : 'Y-m-d';
        $buckets = [];
        foreach ($rows as $row) {
            $key = $row->createdAt->format($format);
            $buckets[$key] = ($buckets[$key] ?? 0) + 1;
        }

        $data = [];
        foreach ($buckets as $date => $count) {
            $data[] = ['date' => $date, 'downloads' => $count];
        }

        return response()->json(['data' => $data]);
    }

    public function countries(Request $request)
    {
        $range = $request->query('range', '7d');
        $startDate = AnalyticsService::getRangeStartDate($range);

        $rows = Download::where('createdAt', '>=', $startDate)
            ->whereNotNull('country')
            ->select('country', 'countryName', DB::raw('COUNT(*) as count'))
            ->groupBy('country', 'countryName')
            ->orderByDesc('count')
            ->get();

        return response()->json(['countries' => $rows]);
    }
}

