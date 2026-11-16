<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Image;
use App\Models\ImageCategory;
use App\Models\Setting;
use App\Services\AnalyticsService;
use App\Services\CollectionService;
use App\Services\GeminiService;
use App\Services\ImageProcessingService;
use App\Services\RelatedImagesService;
use App\Services\SeoGeneratorService;
use App\Services\TeamService;
use App\Services\TrashService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ImageApiController extends Controller
{
    public function homepage()
    {
        try {
            $cacheKey = 'homepage_weekly_popular_v1';
            $cacheTtlSeconds = 24 * 60 * 60;
            $popularLimit = 14;
            $latestLimit = 28;

            $latestImages = Image::where('status', 'published')
                ->orderByDesc('createdAt')
                ->limit($latestLimit)
                ->get(['id', 'name', 'filename', 'path', 'thumbPath', 'createdAt', 'luminance', 'contrastBgDark', 'contrastBgLight']);

            $totalPublishedCount = Image::where('status', 'published')->count();
            $targetPopularCount = min($popularLimit, $totalPublishedCount);
            $popularImages = [];
            $needsRefresh = true;

            $cacheSetting = Setting::find($cacheKey);
            if ($cacheSetting && $cacheSetting->value) {
                $parsed = json_decode($cacheSetting->value, true);
                if (is_array($parsed) && !empty($parsed['updatedAt']) && !empty($parsed['imageIds'])) {
                    $ageSeconds = time() - (int) floor($parsed['updatedAt'] / 1000);
                    if ($ageSeconds < $cacheTtlSeconds) {
                        $cachedRecords = Image::whereIn('id', $parsed['imageIds'])
                            ->where('status', 'published')
                            ->get(['id', 'name', 'filename', 'path', 'thumbPath', 'luminance', 'contrastBgDark', 'contrastBgLight'])
                            ->keyBy('id');

                        $ordered = [];
                        foreach ($parsed['imageIds'] as $id) {
                            if ($cachedRecords->has($id)) {
                                $ordered[] = $cachedRecords->get($id);
                            }
                        }

                        if (count($ordered) === $targetPopularCount) {
                            $popularImages = $ordered;
                            $needsRefresh = false;
                        }
                    }
                }
            }

            if ($needsRefresh) {
                $sevenDaysAgo = now()->subDays(7);
                $topRows = DB::table('Download as d')
                    ->join('Image as i', 'd.imageId', '=', 'i.id')
                    ->whereNull('i.deletedAt')
                    ->where('d.createdAt', '>=', $sevenDaysAgo)
                    ->where('i.status', 'published')
                    ->select('d.imageId', DB::raw('COUNT(*) as dlCount'))
                    ->groupBy('d.imageId')
                    ->orderByDesc('dlCount')
                    ->limit($popularLimit)
                    ->get();

                $topIds = $topRows->pluck('imageId')->all();
                $topImages = !empty($topIds)
                    ? Image::whereIn('id', $topIds)->where('status', 'published')
                        ->get(['id', 'name', 'filename', 'path', 'thumbPath', 'luminance', 'contrastBgDark', 'contrastBgLight'])
                        ->keyBy('id')
                    : collect();

                $orderedTop = [];
                foreach ($topIds as $id) {
                    if ($topImages->has($id)) {
                        $orderedTop[] = $topImages->get($id);
                    }
                }

                $remaining = $popularLimit - count($orderedTop);
                $filler = [];
                if ($remaining > 0) {
                    $q = Image::where('status', 'published');
                    if (!empty($orderedTop)) {
                        $q->whereNotIn('id', array_map(fn($img) => $img->id, $orderedTop));
                    }
                    $pool = $q->get(['id', 'name', 'filename', 'path', 'thumbPath', 'luminance', 'contrastBgDark', 'contrastBgLight'])->all();
                    shuffle($pool);
                    $filler = array_slice($pool, 0, $remaining);
                }

                $popularImages = array_slice(array_merge($orderedTop, $filler), 0, $popularLimit);

                Setting::updateOrCreate(
                    ['key' => $cacheKey],
                    [
                        'value' => json_encode([
                            'updatedAt' => (int) round(microtime(true) * 1000),
                            'imageIds' => array_map(fn($img) => $img->id, $popularImages),
                        ]),
                    ]
                );
            }

            return response()->json([
                'popularImages' => $popularImages,
                'latestImages' => $latestImages,
                'totalPublishedCount' => $totalPublishedCount,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'popularImages' => [],
                'latestImages' => [],
                'totalPublishedCount' => 0,
            ], 500);
        }
    }

    public function index(Request $request)
    {
        $status = $request->query('status');
        $categoryId = $request->query('categoryId');
        $limit = $request->query('limit') ? max(1, (int) $request->query('limit')) : null;
        $offset = $request->query('offset') ? max(0, (int) $request->query('offset')) : 0;
        $paginated = $request->query('paginated') === '1';
        $qParam = trim((string) $request->query('q', ''));

        try {
            TrashService::runAutoPurgeIfDue();
            $query = Image::query();

            if ($status) {
                $query->where('status', $status);
            }

            if ($categoryId) {
                $catIds = Category::where('id', $categoryId)->orWhere('parentId', $categoryId)->pluck('id')->all();
                $query->whereHas('categories', fn($q) => $q->whereIn('categoryId', $catIds));
            }

            if ($paginated) {
                $pageSize = $limit ?: 30;
                if ($qParam !== '') {
                    $qLower = strtolower($qParam);
                    $allMatching = $query->orderByDesc('createdAt')
                        ->get(['id', 'name', 'filename', 'path', 'thumbPath', 'tags', 'createdAt', 'luminance', 'contrastBgDark', 'contrastBgLight']);

                    $filtered = $allMatching->filter(function ($img) use ($qLower) {
                        if ($img->name && str_contains(strtolower($img->name), $qLower)) {
                            return true;
                        }
                        if ($img->filename && str_contains(strtolower($img->filename), $qLower)) {
                            return true;
                        }
                        $tags = is_array($img->tags) ? $img->tags : [];
                        foreach ($tags as $t) {
                            if (is_string($t) && str_contains(strtolower($t), $qLower)) {
                                return true;
                            }
                        }
                        return false;
                    })->values();

                    $total = $filtered->count();
                    $images = $filtered->slice($offset, $pageSize)->values();

                    if ($offset === 0) {
                        AnalyticsService::recordSearchQuery($qParam, $total);
                    }

                    return response()->json([
                        'images' => $images,
                        'total' => $total,
                        'hasMore' => ($offset + $images->count()) < $total,
                    ]);
                }

                $total = (clone $query)->count();
                $images = $query->orderByDesc('createdAt')
                    ->offset($offset)
                    ->limit($pageSize)
                    ->get(['id', 'name', 'filename', 'path', 'thumbPath', 'createdAt', 'luminance', 'contrastBgDark', 'contrastBgLight']);

                return response()->json([
                    'images' => $images,
                    'total' => $total,
                    'hasMore' => ($offset + $images->count()) < $total,
                ]);
            }

            $query->with(['categories.category'])->orderByDesc('createdAt');
            if ($limit !== null) {
                $query->limit($limit);
            }
            if ($offset > 0) {
                $query->offset($offset);
            }

            return response()->json($query->get());
        } catch (\Throwable $e) {
            return response()->json($paginated ? ['images' => [], 'total' => 0, 'hasMore' => false] : []);
        }
    }

    public function related(Request $request)
    {
        $id = $request->query('id');
        if (!$id) {
            return response()->json(['images' => [], 'total' => 0, 'hasMore' => false], 400);
        }

        $limit = max(1, (int) $request->query('limit', 30));
        $offset = max(0, (int) $request->query('offset', 0));

        return response()->json(RelatedImagesService::getRankedRelatedImages($id, $limit, $offset));
    }

    public function upload(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'upload_images')) {
            return response()->json(['error' => 'Forbidden: Missing permission to upload images.'], 403);
        }

        if (!$request->hasFile('file')) {
            return response()->json(['error' => 'No file received (the file may exceed the server POST size limit).'], 400);
        }

        $file = $request->file('file');
        if (!$file->isValid()) {
            return response()->json(['error' => $file->getErrorMessage() ?: 'Invalid or incomplete file upload.'], 422);
        }

        $name = $request->input('name');
        $tagsString = $request->input('tags');

        try {
            $year = date('Y');
            $month = strtolower(date('F'));
            $day = date('d');

            $relativeDir = "/uploads/{$year}/{$month}/{$day}";
            $uploadDir = public_path($relativeDir);
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $origName = preg_replace('/\s+/', '-', $file->getClientOriginalName());
            $filename = (int) round(microtime(true) * 1000) . '-' . $origName;
            $filepath = $uploadDir . '/' . $filename;
            $fileSize = $file->getSize();
            $mimeType = $file->getClientMimeType();

            $file->move($uploadDir, $filename);

            [$width, $height] = ImageProcessingService::getDimensions($filepath);
            $previewFilename = "preview-{$filename}.jpg";
            $previewFilepath = $uploadDir . '/' . $previewFilename;
            $previewOk = ImageProcessingService::generateCheckerboardPreview($filepath, $previewFilepath, $width, $height);
            $thumbFilename = "thumb-{$filename}.png";
            $thumbFilepath = $uploadDir . '/' . $thumbFilename;
            $thumbOk = ImageProcessingService::generateThumbnail($filepath, $thumbFilepath, 450);
            $luminanceResult = ImageProcessingService::calculateLuminance($filepath);

            $tags = [];
            if ($tagsString) {
                $decoded = json_decode($tagsString, true);
                if (is_array($decoded)) {
                    $tags = $decoded;
                }
            }

            $newImage = Image::create([
                'filename' => $filename,
                'path' => "{$relativeDir}/{$filename}",
                'previewPath' => $previewOk ? "{$relativeDir}/{$previewFilename}" : null,
                'thumbPath' => $thumbOk ? "{$relativeDir}/{$thumbFilename}" : null,
                'name' => $name ?: $filename,
                'tags' => $tags,
                'status' => 'draft',
                'width' => $width,
                'height' => $height,
                'size' => $fileSize,
                'mimeType' => $mimeType,
                'luminance' => $luminanceResult['luminance'],
            ]);

            return response()->json(['success' => true, 'image' => $newImage]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage() ?: 'Server error while processing uploaded image.',
            ], 500);
        }
    }

    public function update(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'edit_images') && !TeamService::hasPermission($session, 'upload_images')) {
            return response()->json(['success' => false, 'message' => 'Forbidden: You do not have permission to edit images.'], 403);
        }

        $id = $request->input('id');
        if (!$id) {
            return response()->json(['success' => false, 'message' => 'Image ID is required'], 400);
        }

        $image = Image::find($id);
        if (!$image) {
            return response()->json(['success' => false, 'message' => 'Image not found'], 404);
        }

        $wasPublished = $image->status === 'published';

        if ($request->has('tags')) {
            $image->tags = $request->input('tags');
        }
        if ($request->has('status')) {
            $image->status = $request->input('status');
        }
        if ($request->has('altText')) {
            $image->altText = $request->input('altText');
        }
        if ($request->has('description')) {
            $image->description = $request->input('description');
        }
        if ($request->has('contrastBgDark')) {
            $image->contrastBgDark = $request->input('contrastBgDark');
        }
        if ($request->has('contrastBgLight')) {
            $image->contrastBgLight = $request->input('contrastBgLight');
        }

        if ($request->has('categoryIds') && is_array($request->input('categoryIds'))) {
            ImageCategory::where('imageId', $id)->delete();
            foreach ($request->input('categoryIds') as $catId) {
                ImageCategory::create([
                    'imageId' => $id,
                    'categoryId' => $catId,
                ]);
            }
        }

        $name = $request->input('name');
        if ($name !== null && $name !== $image->name) {
            $image->name = $name;
            $oldPath = public_path($image->path);
            if (file_exists($oldPath)) {
                $ext = pathinfo($image->filename, PATHINFO_EXTENSION);
                $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($name)), '-');
                $uniqueId = substr(bin2hex(random_bytes(4)), 0, 7);
                $newFilename = "{$slug}-{$uniqueId}." . ($ext ?: 'png');
                $dir = dirname($oldPath);
                $newPath = $dir . '/' . $newFilename;

                if (@rename($oldPath, $newPath)) {
                    $image->filename = $newFilename;
                    $relDir = str_replace('\\', '/', dirname($image->path));
                    $image->path = "{$relDir}/{$newFilename}";
                }
            }
        }

        $image->save();

        if ($wasPublished || $image->status === 'published') {
            SeoGeneratorService::refreshAuto('auto-image-update');
        }

        return response()->json(['success' => true, 'image' => $image]);
    }

    public function destroy(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'delete_images')) {
            return response()->json(['success' => false, 'message' => 'Forbidden: You do not have permission to delete images.'], 403);
        }

        $ids = $request->input('ids');
        if (!is_array($ids) || empty($ids)) {
            return response()->json(['success' => false, 'message' => 'No IDs provided'], 400);
        }

        $hadPublished = Image::whereIn('id', $ids)->where('status', 'published')->exists();
        Image::whereIn('id', $ids)->delete();

        if ($hadPublished) {
            SeoGeneratorService::refreshAuto('auto-image-trash');
        }

        return response()->json([
            'success' => true,
            'softDeleted' => true,
            'retentionDays' => TrashService::getRetentionDays(),
        ]);
    }

    public function trash(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasAnyPermission($session, ['delete_images', 'edit_images', 'upload_images'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        TrashService::runAutoPurgeIfDue();
        $retentionDays = TrashService::getRetentionDays();

        $trashed = Image::onlyTrashed()
            ->with(['categories.category'])
            ->orderByDesc('deletedAt')
            ->get()
            ->map(function (Image $img) use ($retentionDays) {
                $arr = $img->toArray();
                if ($retentionDays > 0 && $img->deletedAt) {
                    $expiresAt = $img->deletedAt->copy()->addDays($retentionDays);
                    $daysRemaining = max(0, (int) ceil(now()->floatDiffInDays($expiresAt, false)));
                    $arr['expiresAt'] = $expiresAt->toISOString();
                    $arr['daysRemaining'] = $daysRemaining;
                } else {
                    $arr['expiresAt'] = null;
                    $arr['daysRemaining'] = null;
                }
                return $arr;
            })
            ->values();

        return response()->json([
            'images' => $trashed,
            'retentionDays' => $retentionDays,
        ]);
    }

    public function restore(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasAnyPermission($session, ['delete_images', 'edit_images'])) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $ids = $request->input('ids');
        if (!is_array($ids) || empty($ids)) {
            return response()->json(['success' => false, 'message' => 'No IDs provided'], 400);
        }

        $restoredImages = Image::onlyTrashed()->whereIn('id', $ids)->get();
        $hasPublished = $restoredImages->contains(fn ($img) => $img->status === 'published');
        Image::onlyTrashed()->whereIn('id', $ids)->restore();

        if ($hasPublished) {
            SeoGeneratorService::refreshAuto('auto-image-restore');
        }

        return response()->json([
            'success' => true,
            'restoredCount' => $restoredImages->count(),
        ]);
    }

    public function forceDestroy(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'delete_images')) {
            return response()->json(['success' => false, 'message' => 'Forbidden: Missing permission to permanently delete images.'], 403);
        }

        $ids = $request->input('ids');
        if (!is_array($ids) || empty($ids)) {
            return response()->json(['success' => false, 'message' => 'No IDs provided'], 400);
        }

        $images = Image::withTrashed()->whereIn('id', $ids)->get();
        $hadPublished = false;
        foreach ($images as $img) {
            if (!$img->deletedAt && $img->status === 'published') {
                $hadPublished = true;
            }
            TrashService::permanentlyDeleteImage($img);
        }

        if ($hadPublished) {
            SeoGeneratorService::refreshAuto('auto-image-purge');
        }

        return response()->json(['success' => true, 'deletedCount' => $images->count()]);
    }

    public function emptyTrash(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'delete_images')) {
            return response()->json(['success' => false, 'message' => 'Forbidden: Missing permission to empty trash.'], 403);
        }

        $trashed = Image::onlyTrashed()->get();
        foreach ($trashed as $img) {
            TrashService::permanentlyDeleteImage($img);
        }

        return response()->json(['success' => true, 'purgedCount' => $trashed->count()]);
    }

    public function backfillThumbnails(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasAnyPermission($session, ['manage_general_settings', 'manage_data_seo', 'upload_images'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $missing = Image::where(function ($q) {
            $q->whereNull('thumbPath')->orWhere('thumbPath', '');
        })->limit(100)->get();

        $generated = 0;
        $skipped = 0;
        foreach ($missing as $img) {
            $src = public_path('/' . ltrim((string) $img->path, '/'));
            if (!is_file($src)) {
                $skipped++;
                continue;
            }
            $dir = dirname($src);
            $relDir = str_replace('\\', '/', dirname('/' . ltrim((string) $img->path, '/')));
            $thumbName = 'thumb-' . basename($src) . '.png';
            $thumbDest = $dir . '/' . $thumbName;

            if (ImageProcessingService::generateThumbnail($src, $thumbDest, 450)) {
                $img->thumbPath = "{$relDir}/{$thumbName}";
                $img->save();
                $generated++;
            } else {
                $skipped++;
            }
        }

        return response()->json([
            'success' => true,
            'processed' => $missing->count(),
            'generated' => $generated,
            'skipped' => $skipped,
        ]);
    }

    public function generateMeta(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasAnyPermission($session, ['upload_images', 'edit_images'])) {
            return response()->json(['error' => 'Forbidden: Missing permission to generate AI metadata.'], 403);
        }

        try {
            $imageBase64 = (string) $request->input('imageBase64', '');
            $modelName = $request->input('modelName');
            $hints = $request->input('hints', []);
            if (!is_array($hints)) {
                $hints = [];
            }
            $result = GeminiService::generateImageMetadata(
                $imageBase64,
                is_string($modelName) ? $modelName : null,
                $hints
            );
            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function redirectUpload(Request $request)
    {
        $filePath = $request->query('path');
        if (!$filePath) {
            return redirect('/');
        }

        $image = Image::where('previewPath', $filePath)->orWhere('path', $filePath)->first();
        if ($image) {
            $slug = CollectionService::slugify($image->name ?: $image->filename ?: 'image');
            return redirect('/images/' . $image->id . ($slug ? "-{$slug}" : ''), 307);
        }

        return redirect('/');
    }
}

