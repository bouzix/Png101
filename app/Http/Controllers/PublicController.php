<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\Image;
use App\Services\AnalyticsService;
use App\Services\CollectionService;
use App\Services\ErrorPagesService;
use App\Services\RelatedImagesService;
use App\Services\WebsiteInfoService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublicController extends Controller
{
    public function home()
    {
        $info = WebsiteInfoService::get();
        return Inertia::render('Home', [
            'seo' => [
                'title' => $info['websiteName'],
                'description' => $info['tagline'],
            ],
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

        $related = RelatedImagesService::getRankedRelatedImages($imageId, 10, 0);
        $collections = CollectionService::getCollectionsForImage($image->id, is_array($image->tags) ? $image->tags : []);

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

        return Inertia::render('Collections/Index', [
            'collections' => $collections,
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

        $allPublished = CollectionService::listCollections(['status' => 'published', 'limit' => 6]);
        $relatedCollections = array_values(array_slice(array_filter(
            $allPublished,
            fn($c) => $c['id'] !== $data['collection']['id']
        ), 0, 3));

        return Inertia::render('Collections/Show', [
            'collection' => $data['collection'],
            'initialImages' => $data['images'],
            'total' => $data['total'],
            'relatedCollections' => $relatedCollections,
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
        $cleanPath = '/uploads/' . ltrim($path, '/');
        $fullPath = public_path($cleanPath);

        $filename = basename($cleanPath);
        $isPreviewJpg = str_starts_with($filename, 'preview-') || str_ends_with(strtolower($cleanPath), '.jpg');
        $userAgent = (string) $request->header('User-Agent', '');
        $isBot = (bool) preg_match('/googlebot|googlebot-image|mediapartners-google|adsbot-google|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|applebot/i', $userAgent);

        $redirectToImagePage = function () use ($cleanPath) {
            $image = Image::where('previewPath', $cleanPath)->orWhere('path', $cleanPath)->first();
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

        if (!file_exists($fullPath) || !is_file($fullPath)) {
            abort(404);
        }

        $headers = [];
        if (!$isPreviewJpg) {
            $headers['X-Robots-Tag'] = 'noindex, noimageindex';
        }
        if ($isExplicitDownload) {
            return response()->download($fullPath, $filename, $headers);
        }

        return response()->file($fullPath, $headers);
    }
}

