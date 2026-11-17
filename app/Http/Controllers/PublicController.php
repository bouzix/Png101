<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\Image;
use App\Models\Setting;
use App\Services\AnalyticsService;
use App\Services\CollectionService;
use App\Services\ErrorPagesService;
use App\Services\RelatedImagesService;
use App\Services\SliderSettingsService;
use App\Services\WebsiteInfoService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublicController extends Controller
{
    public function home()
    {
        $info = WebsiteInfoService::get();
        $trendingSliderConfig = \App\Services\SliderSettingsService::get('trending_collections');
        $maxItems = max(2, (int) ($trendingSliderConfig['maxTotalItems'] ?? 12));
        $trendingCollections = CollectionService::listCollections([
            'sortBy' => 'trending',
            'status' => 'published',
            'limit' => $maxItems,
        ]);

        return Inertia::render('Home', [
            'seo' => [
                'title' => $info['websiteName'],
                'description' => $info['tagline'],
            ],
            'popularKeywords' => AnalyticsService::getHomepageTopKeywords(10, 7),
            'trendingSliderConfig' => $trendingSliderConfig,
            'trendingCollections' => $trendingCollections,
        ]);
    }

    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $info = WebsiteInfoService::get();

        return Inertia::render('Search', [
            'query' => $q,
            'seo' => [
                'title' => $q ? "Search: {$q} - {$info['websiteName']}" : "Search PNG Images - {$info['websiteName']}",
                'description' => $q ? "Free transparent PNG images matching {$q} on {$info['websiteName']}." : $info['tagline'],
            ],
        ]);
    }

    public function latest()
    {
        $info = WebsiteInfoService::get();
        return Inertia::render('Latest', [
            'seo' => [
                'title' => "Latest PNG Uploads - {$info['websiteName']}",
                'description' => "Browse the latest high-resolution transparent PNG images uploaded to {$info['websiteName']}.",
            ],
        ]);
    }

    public function image(string $id)
    {
        $imageId = substr($id, 0, 36);
        $image = Image::find($imageId);
        $info = WebsiteInfoService::get();

        if (!$image) {
            return $this->render404();
        }

        AnalyticsService::recordImageView($image->id);

        $related = RelatedImagesService::getRankedRelatedImages($imageId, 14, 0);
        $partOfCollectionsSliderConfig = \App\Services\SliderSettingsService::get('part_of_collections');
        $maxPartCols = max(1, (int) ($partOfCollectionsSliderConfig['maxTotalItems'] ?? 12));
        $allMatchingCollections = CollectionService::getCollectionsForImage($image->id, is_array($image->tags) ? $image->tags : []);
        $collections = array_slice($allMatchingCollections, 0, $maxPartCols);

        $siteName = $info['websiteName'] ?: 'Png101';
        $imgName = $image->name ?: $image->filename;

        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => 'ImageObject',
            'contentUrl' => $image->previewPath ?: $image->path,
            'license' => 'https://creativecommons.org/licenses/by/4.0/',
            'acquireLicensePage' => rtrim($info['websiteUrl'], '/') . '/terms-of-service',
            'creditText' => $siteName,
            'creator' => [
                '@type' => 'Organization',
                'name' => $info['companyName'] ?: $siteName,
            ],
            'copyrightNotice' => $info['companyName'] ?: $siteName,
            'name' => $imgName,
            'description' => $image->description ?: "High-quality PNG image of {$imgName}",
            'width' => $image->width ? "{$image->width} px" : null,
            'height' => $image->height ? "{$image->height} px" : null,
            'encodingFormat' => $image->mimeType ?: 'image/png',
            'fileFormat' => $image->mimeType ?: 'image/png',
            'contentSize' => $image->size ? round($image->size / 1024) . ' KB' : null,
            'caption' => $image->altText ?: $imgName,
        ];

        return Inertia::render('ImageDetail', [
            'image' => $image,
            'relatedImages' => $related['images'],
            'totalRelatedImages' => $related['total'],
            'collections' => $collections,
            'partOfCollectionsSliderConfig' => $partOfCollectionsSliderConfig,
            'seo' => [
                'title' => "{$imgName} - {$siteName}",
                'description' => $image->description ?: "Download {$imgName} PNG image. Free high-quality PNG image.",
                'ogTitle' => "{$imgName} - {$siteName}",
                'ogDescription' => $image->description ?: "Download {$imgName} PNG image.",
                'ogImage' => $image->previewPath ?: $image->path,
                'jsonLd' => array_filter($jsonLd, fn($v) => $v !== null),
            ],
        ]);
    }

    public function collections()
    {
        $info = WebsiteInfoService::get();
        $collections = CollectionService::listCollections(['status' => 'published', 'includeDrafts' => false]);

        $gridDefaults = [
            'mobile' => 1,
            'smallTablet' => 2,
            'tablet' => 3,
            'desktop' => 6,
        ];
        $gridSetting = Setting::find('collections_grid_columns');
        $decodedGrid = $gridSetting && is_string($gridSetting->value)
            ? json_decode($gridSetting->value, true)
            : null;
        $gridColumns = is_array($decodedGrid)
            ? [
                'mobile' => max(1, min(4, (int) ($decodedGrid['mobile'] ?? $gridDefaults['mobile']))),
                'smallTablet' => max(1, min(6, (int) ($decodedGrid['smallTablet'] ?? $gridDefaults['smallTablet']))),
                'tablet' => max(1, min(6, (int) ($decodedGrid['tablet'] ?? $gridDefaults['tablet']))),
                'desktop' => max(1, min(8, (int) ($decodedGrid['desktop'] ?? $gridDefaults['desktop']))),
            ]
            : $gridDefaults;

        return Inertia::render('Collections/Index', [
            'collections' => $collections,
            'gridColumns' => $gridColumns,
            'featuredCollectionsSliderConfig' => SliderSettingsService::get('featured_collections'),
            'seo' => [
                'title' => "Curated PNG Collections & Clipart Packs - {$info['websiteName']}",
                'description' => "Explore curated collections of transparent PNG images, seasonal clipart, themed design packs, and brand graphics on {$info['websiteName']}.",
            ],
        ]);
    }

    public function collectionDetail(string $slug)
    {
        $info = WebsiteInfoService::get();
        $data = CollectionService::getCollectionWithImages(['slug' => $slug], ['page' => 1, 'limit' => 30]);

        if (!$data) {
            return $this->render404();
        }

        try {
            Collection::where('id', $data['collection']['id'])->increment('viewsCount');
        } catch (\Throwable $e) {
            // Ignore
        }

        $sliderConfig = \App\Services\SliderSettingsService::get('related_collections');
        $maxItems = max(2, (int) ($sliderConfig['maxTotalItems'] ?? 24));
        $allPublished = CollectionService::listCollections(['status' => 'published', 'limit' => $maxItems + 4]);
        $relatedCollections = array_values(array_slice(array_filter(
            $allPublished,
            fn($c) => $c['id'] !== $data['collection']['id']
        ), 0, $maxItems));

        return Inertia::render('Collections/Show', [
            'collection' => $data['collection'],
            'initialImages' => $data['images'],
            'total' => $data['total'],
            'relatedCollections' => $relatedCollections,
            'sliderConfig' => $sliderConfig,
            'seo' => [
                'title' => "{$data['collection']['name']} PNG Collection - {$info['websiteName']}",
                'description' => $data['collection']['description'] ?: "Download free transparent PNG graphics from the {$data['collection']['name']} collection.",
            ],
        ]);
    }

    public function tags()
    {
        $info = WebsiteInfoService::get();
        $images = Image::where('status', 'published')->select(['tags'])->get();

        $tagCounts = [];
        foreach ($images as $img) {
            $tags = is_array($img->tags) ? $img->tags : [];
            foreach ($tags as $rawTag) {
                if (is_string($rawTag)) {
                    $cleaned = trim($rawTag);
                    $lower = strtolower($cleaned);
                    if ($cleaned !== '') {
                        $tagCounts[$lower] = ($tagCounts[$lower] ?? 0) + 1;
                    }
                }
            }
        }

        $allUniqueTags = [];
        foreach ($tagCounts as $tag => $count) {
            $allUniqueTags[] = ['tag' => $tag, 'count' => $count];
        }
        usort($allUniqueTags, fn($a, $b) => strcmp($a['tag'], $b['tag']));

        $groupedTags = [];
        foreach ($allUniqueTags as $item) {
            $firstChar = strtoupper(substr($item['tag'], 0, 1));
            $key = preg_match('/^[A-Z]$/', $firstChar) ? $firstChar : '#';
            $groupedTags[$key][] = $item;
        }

        return Inertia::render('Tags', [
            'groupedTags' => $groupedTags,
            'totalTagsCount' => count($allUniqueTags),
            'seo' => [
                'title' => "All PNG Tags & Brand Directory - {$info['websiteName']}",
                'description' => "Browse all transparent PNG tags, brand logos, icons, and categories alphabetically on {$info['websiteName']}.",
            ],
        ]);
    }

    public function about()
    {
        $info = WebsiteInfoService::get();
        return Inertia::render('Legal/AboutUs', [
            'seo' => ['title' => "About Us - {$info['websiteName']}"],
        ]);
    }

    public function contact()
    {
        $info = WebsiteInfoService::get();
        return Inertia::render('Legal/ContactUs', [
            'seo' => ['title' => "Contact Us - {$info['websiteName']}"],
        ]);
    }

    public function terms()
    {
        $info = WebsiteInfoService::get();
        return Inertia::render('Legal/TermsOfService', [
            'seo' => ['title' => "Terms of Service - {$info['websiteName']}"],
        ]);
    }

    public function privacy()
    {
        $info = WebsiteInfoService::get();
        return Inertia::render('Legal/PrivacyPolicy', [
            'seo' => ['title' => "Privacy Policy - {$info['websiteName']}"],
        ]);
    }

    public function dmca()
    {
        $info = WebsiteInfoService::get();
        return Inertia::render('Legal/DmcaPolicy', [
            'seo' => ['title' => "DMCA Policy - {$info['websiteName']}"],
        ]);
    }

    public function maintenance()
    {
        $config = ErrorPagesService::get();
        return Inertia::render('Maintenance', [
            'config' => $config['maintenance'],
        ]);
    }

    public function forbidden()
    {
        $config = ErrorPagesService::get();
        return Inertia::render('Errors/Forbidden', [
            'config' => $config['p403'],
        ])->toResponse(request())->setStatusCode(403);
    }

    public function render404()
    {
        $config = ErrorPagesService::get();
        return Inertia::render('Errors/NotFound', [
            'config' => $config['p404'],
        ])->toResponse(request())->setStatusCode(404);
    }

    public function serveUpload(Request $request, string $path)
    {
        $uploadsRoot = realpath(public_path('uploads'));
        $normalizedRel = ltrim(str_replace('\\', '/', rawurldecode($path)), '/');
        if (!$uploadsRoot || $normalizedRel === '' || str_contains($normalizedRel, "\0")) {
            abort(404);
        }

        // Block any directory traversal segments before hitting filesystem
        foreach (explode('/', $normalizedRel) as $segment) {
            if ($segment === '..' || $segment === '.' || str_starts_with($segment, '.')) {
                abort(403);
            }
        }

        $cleanPath = '/uploads/' . $normalizedRel;
        $candidatePath = $uploadsRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $normalizedRel);

        $filename = basename($cleanPath);
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico', 'avif'];
        if (!in_array($ext, $allowedExtensions, true)) {
            abort(403);
        }

        $isPreviewJpg = str_starts_with($filename, 'preview-') || in_array($ext, ['jpg', 'jpeg'], true);
        $userAgent = (string) $request->header('User-Agent', '');
        $isBot = (bool) preg_match('/googlebot|googlebot-image|mediapartners-google|adsbot-google|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|applebot/i', $userAgent);

        $redirectToImagePage = function () use ($cleanPath) {
            $image = Image::where(function ($q) use ($cleanPath) {
                $q->where('previewPath', $cleanPath)
                    ->orWhere('path', $cleanPath)
                    ->orWhere('thumbPath', $cleanPath);
            })->first();
            if ($image) {
                $slug = CollectionService::slugify($image->name ?: $image->filename ?: 'image');
                return redirect('/images/' . $image->id . ($slug ? "-{$slug}" : ''), 307);
            }
            return redirect('/');
        };

        if ($isBot && !$isPreviewJpg) {
            return $redirectToImagePage();
        }

        $isExplicitDownload = $request->query('download') === '1';
        $secFetchDest = $request->header('Sec-Fetch-Dest');
        $secFetchMode = $request->header('Sec-Fetch-Mode');
        $accept = (string) $request->header('Accept', '');

        $isDirectNavigation = !$isExplicitDownload && (
            $secFetchDest === 'document' ||
            $secFetchMode === 'navigate' ||
            str_contains($accept, 'text/html')
        );

        if ($isDirectNavigation) {
            return $redirectToImagePage();
        }

        $referer = (string) $request->header('Referer', '');
        $refererHost = strtolower((string) (parse_url($referer, PHP_URL_HOST) ?? ''));
        $requestHost = strtolower((string) $request->getHost());
        $secFetchSite = strtolower((string) $request->header('Sec-Fetch-Site', ''));
        $isSameOrigin = $secFetchSite === 'same-origin' || ($requestHost !== '' && $refererHost === $requestHost);

        // For raw transparent PNGs / non-preview files, block external hotlinking when Referer/Sec-Fetch-Site is foreign or missing
        if (!$isPreviewJpg && !$isSameOrigin && !$isExplicitDownload) {
            return $redirectToImagePage();
        }

        $realPath = realpath($candidatePath);
        if (!$realPath || !is_file($realPath)) {
            abort(404);
        }

        $rootPrefix = rtrim($uploadsRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        if (!str_starts_with($realPath, $rootPrefix)) {
            abort(403);
        }

        $headers = [];
        if (!$isPreviewJpg) {
            $headers['X-Robots-Tag'] = 'noindex, noimageindex';
        }
        if ($isExplicitDownload) {
            $headers['Cache-Control'] = 'private, no-cache, must-revalidate';
            $downloadName = $filename;
            $requestedName = trim((string) $request->query('name', ''));
            if ($requestedName !== '') {
                $cleanBase = preg_replace('/[^A-Za-z0-9._-]+/', '-', basename(str_replace('\\', '/', $requestedName)));
                $cleanBase = trim((string) $cleanBase, '.-');
                if ($cleanBase !== '') {
                    $stem = trim((string) pathinfo($cleanBase, PATHINFO_FILENAME), '.-');
                    if ($stem !== '') {
                        $downloadName = $stem . '.' . $ext;
                    }
                }
            } else {
                $host = strtolower((string) preg_replace('/^www\./', '', (string) $request->getHost()));
                $isLocal = $host === ''
                    || $host === 'localhost'
                    || $host === '127.0.0.1'
                    || $host === '::1'
                    || filter_var($host, FILTER_VALIDATE_IP) !== false
                    || !str_contains($host, '.');
                if ($isLocal) {
                    $info = WebsiteInfoService::get();
                    $parsedHost = strtolower((string) preg_replace('/^www\./', '', (string) parse_url((string) ($info['websiteUrl'] ?? ''), PHP_URL_HOST)));
                    $host = $parsedHost ?: (CollectionService::slugify($info['websiteName'] ?? 'png101') . '.com');
                }
                $siteTag = trim((string) preg_replace('/[^a-z0-9.-]/', '', $host), '.');
                $stem = pathinfo($filename, PATHINFO_FILENAME);
                if ($siteTag !== '' && $stem !== '' && !str_ends_with(strtolower($stem), '-' . $siteTag)) {
                    $downloadName = $stem . '-' . $siteTag . '.' . $ext;
                }
            }
            return response()->download($realPath, $downloadName, $headers);
        }

        $mtime = @filemtime($realPath) ?: time();
        $size = @filesize($realPath) ?: 0;
        $etag = '"' . md5($realPath . '|' . $mtime . '|' . $size) . '"';
        $lastModified = gmdate('D, d M Y H:i:s', $mtime) . ' GMT';

        $headers['ETag'] = $etag;
        $headers['Last-Modified'] = $lastModified;
        $headers['Cache-Control'] = 'public, max-age=31536000, immutable';

        $ifNoneMatch = trim((string) $request->header('If-None-Match', ''));
        if ($ifNoneMatch !== '' && ($ifNoneMatch === $etag || $ifNoneMatch === 'W/' . $etag)) {
            return response('', 304, $headers);
        }

        $ifModifiedSince = $request->header('If-Modified-Since');
        if ($ifModifiedSince && strtotime($ifModifiedSince) !== false && strtotime($ifModifiedSince) >= $mtime) {
            return response('', 304, $headers);
        }

        return response()->file($realPath, $headers);
    }
}

