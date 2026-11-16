<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Collection;
use App\Models\CollectionImage;
use App\Models\EditorCanvasPreset;
use App\Models\EditorFont;
use App\Models\EditorTemplate;
use App\Models\EditorTemplateCategory;
use App\Models\EditorUsageLog;
use App\Models\Image;
use App\Services\EditorDefaultsService;
use App\Services\EditorSettingsService;
use App\Services\ImageProcessingService;
use App\Services\TeamService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EditorController extends Controller
{
    private function detectDeviceType(Request $request): string
    {
        $ua = strtolower((string) $request->header('User-Agent', ''));
        if (str_contains($ua, 'ipad') || str_contains($ua, 'tablet')) {
            return 'tablet';
        }
        if (preg_match('/mobile|iphone|android/', $ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    public function index(Request $request)
    {
        EditorDefaultsService::ensureSeeded();
        $settings = EditorSettingsService::getSettings();
        $session = TeamService::getCurrentSession($request);
        $canManageEditor = TeamService::hasAnyPermission($session, ['manage_editor']);

        if (!$settings['enabled'] && !$canManageEditor) {
            abort(404);
        }

        $categories = EditorTemplateCategory::where('isActive', true)
            ->orderBy('sortOrder')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description', 'icon', 'sortOrder']);

        $presets = EditorCanvasPreset::where('isActive', true)
            ->orderBy('sortOrder')
            ->orderBy('name')
            ->get(['id', 'name', 'groupName', 'width', 'height', 'icon', 'sortOrder']);

        $fonts = EditorFont::where('isActive', true)
            ->orderBy('sortOrder')
            ->orderBy('family')
            ->get(['id', 'family', 'source', 'weights', 'googleImportUrl', 'filePath']);

        $catalogCategories = Category::whereNull('parentId')
            ->with(['children' => fn ($q) => $q->orderBy('name')->select('id', 'name', 'slug', 'parentId')])
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'parentId']);

        $catalogCollections = Collection::where(function ($q) {
            $q->where('status', 'active')->orWhereNull('status');
        })->orderBy('order')->orderBy('name')->get(['id', 'name', 'slug']);

        // Deep link ?asset={imageId}
        $initialAsset = null;
        if ($assetId = trim((string) $request->query('asset', ''))) {
            $img = Image::where('id', $assetId)->where('status', 'published')->first([
                'id', 'name', 'filename', 'path', 'previewPath', 'thumbPath', 'width', 'height', 'tags', 'mimeType'
            ]);
            if ($img) {
                $initialAsset = [
                    'id' => $img->id,
                    'name' => $img->name ?: $img->filename,
                    'url' => $img->path ?: $img->previewPath,
                    'thumbUrl' => ImageProcessingService::ensureWebpThumbnail($img) ?: $img->path ?: $img->previewPath,
                    'width' => (int) ($img->width ?: 800),
                    'height' => (int) ($img->height ?: 800),
                    'tags' => is_array($img->tags) ? $img->tags : [],
                ];
            }
        }

        // Deep link ?template={idOrSlug}
        $initialTemplate = null;
        if ($tplQuery = trim((string) $request->query('template', ''))) {
            $q = EditorTemplate::where(function ($w) use ($tplQuery) {
                $w->where('id', $tplQuery)->orWhere('slug', $tplQuery);
            });
            if (!$canManageEditor) {
                $q->where('status', 'published');
            }
            $tpl = $q->first();
            if ($tpl) {
                $initialTemplate = $this->formatTemplate($tpl, true);
            }
        }

        // Admin Visual Template Designer mode ?adminTemplate={id|new}
        $adminTemplateMode = null;
        $adminTemplate = null;
        $adminParam = trim((string) $request->query('adminTemplate', ''));
        if ($adminParam !== '' && $canManageEditor) {
            if ($adminParam === 'new') {
                $adminTemplateMode = 'new';
            } else {
                $found = EditorTemplate::where('id', $adminParam)->orWhere('slug', $adminParam)->first();
                if ($found) {
                    $adminTemplateMode = 'edit';
                    $adminTemplate = $this->formatTemplate($found, true);
                }
            }
        }

        $allCategoriesForAdmin = $canManageEditor
            ? EditorTemplateCategory::orderBy('sortOrder')->orderBy('name')->get(['id', 'name', 'slug', 'isActive'])
            : [];

        // Collection Hero Cover Designer mode ?mode=collection-hero&width=1200&height=300&collectionId=...
        $collectionHeroMode = null;
        if ($request->query('mode') === 'collection-hero') {
            $heroW = max(100, min(4096, (int) $request->query('width', 1200)));
            $heroH = max(100, min(4096, (int) $request->query('height', 300)));
            $targetField = trim((string) $request->query('targetField', 'heroImagePath'));
            if (!in_array($targetField, ['heroImagePath', 'cardBgImagePath', 'coverImagePath', 'trendingCardImagePath'], true)) {
                $targetField = 'heroImagePath';
            }
            $collectionHeroMode = [
                'width' => $heroW,
                'height' => $heroH,
                'targetField' => $targetField,
                'collectionId' => trim((string) $request->query('collectionId', '')) ?: null,
                'collectionName' => trim((string) $request->query('collectionName', '')) ?: null,
            ];
        }

        return Inertia::render('ImageEditor', [
            'editorSettings' => $settings,
            'templateCategories' => $categories,
            'allTemplateCategories' => $allCategoriesForAdmin,
            'canvasPresets' => $presets,
            'fonts' => $fonts,
            'catalogCategories' => $catalogCategories,
            'catalogCollections' => $catalogCollections,
            'initialAsset' => $initialAsset,
            'initialTemplate' => $initialTemplate,
            'adminTemplateMode' => $adminTemplateMode,
            'adminTemplate' => $adminTemplate,
            'collectionHeroMode' => $collectionHeroMode,
            'canManageEditor' => $canManageEditor,
            'seo' => [
                'title' => $settings['seoTitle'] ?: 'Free Online PNG & Graphic Design Editor',
                'description' => $settings['seoDescription'] ?: '',
            ],
        ]);
    }

    public function searchAssets(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $categoryId = trim((string) $request->query('categoryId', ''));
        $collectionId = trim((string) $request->query('collectionId', ''));
        $orientation = trim((string) $request->query('orientation', 'all'));
        $assetType = strtolower(trim((string) $request->query('type', 'png')));
        $sort = trim((string) $request->query('sort', 'latest'));
        $limit = max(1, min(60, (int) $request->query('limit', 24)));
        $offset = max(0, (int) $request->query('offset', 0));

        $query = Image::where('status', 'published');

        if ($assetType === 'svg') {
            $query->where(function ($sq) {
                $sq->where('mimeType', 'image/svg+xml')
                    ->orWhereRaw("LOWER(COALESCE(path, '')) LIKE '%.svg'");
            });
        } elseif ($assetType === 'backgrounds') {
            $query->where(function ($sq) {
                $sq->whereRaw("LOWER(COALESCE(name, '')) LIKE '%background%'")
                    ->orWhereRaw("LOWER(COALESCE(name, '')) LIKE '%backdrop%'")
                    ->orWhereRaw("LOWER(COALESCE(name, '')) LIKE '%wallpaper%'")
                    ->orWhereHas('categories', fn ($cq) => $cq->whereRaw("LOWER(name) LIKE '%background%'"));
            });
        } elseif ($assetType === 'png') {
            $query->where(function ($sq) {
                $sq->whereNull('mimeType')->orWhere('mimeType', '!=', 'image/svg+xml');
            })->whereRaw("LOWER(COALESCE(path, '')) NOT LIKE '%.svg'");
        }

        if ($categoryId !== '') {
            $catIds = Category::where('id', $categoryId)
                ->orWhere('parentId', $categoryId)
                ->pluck('id')
                ->all();
            if (!empty($catIds)) {
                $query->whereHas('categories', fn ($sq) => $sq->whereIn('categoryId', $catIds));
            }
        }

        if ($collectionId !== '') {
            $imageIdsInCollection = CollectionImage::where('collectionId', $collectionId)->pluck('imageId')->all();
            if (empty($imageIdsInCollection)) {
                return response()->json(['assets' => [], 'total' => 0, 'hasMore' => false]);
            }
            $query->whereIn('id', $imageIdsInCollection);
        }

        if ($orientation === 'square') {
            $query->whereNotNull('width')->whereNotNull('height')
                ->whereRaw('ABS(width - height) <= (CASE WHEN width > height THEN width ELSE height END) * 0.15');
        } elseif ($orientation === 'portrait') {
            $query->whereNotNull('width')->whereNotNull('height')->whereColumn('height', '>', 'width');
        } elseif ($orientation === 'landscape') {
            $query->whereNotNull('width')->whereNotNull('height')->whereColumn('width', '>', 'height');
        }

        if ($q !== '') {
            $qLower = strtolower($q);
            $all = $query->orderByDesc('createdAt')->get([
                'id', 'name', 'filename', 'path', 'previewPath', 'thumbPath', 'width', 'height', 'tags', 'description', 'createdAt'
            ]);

            $matched = $all->filter(function ($img) use ($qLower) {
                if ($img->name && str_contains(strtolower($img->name), $qLower)) {
                    return true;
                }
                if ($img->filename && str_contains(strtolower($img->filename), $qLower)) {
                    return true;
                }
                if ($img->description && str_contains(strtolower($img->description), $qLower)) {
                    return true;
                }
                if (is_array($img->tags)) {
                    foreach ($img->tags as $tag) {
                        if (is_string($tag) && str_contains(strtolower($tag), $qLower)) {
                            return true;
                        }
                    }
                }
                return false;
            });

            $dlCounts = $this->getDownloadCountsMap();
            if ($sort === 'popular') {
                $matched = $matched->sortByDesc(fn ($img) => $dlCounts[$img->id] ?? 0);
            }
            $matched = $matched->values();
            $total = $matched->count();
            $slice = $matched->slice($offset, $limit)->values();

            if ($offset === 0) {
                EditorUsageLog::create([
                    'eventType' => 'asset_search',
                    'searchQuery' => mb_substr($q, 0, 200),
                    'resultCount' => $total,
                    'deviceType' => $this->detectDeviceType($request),
                    'ipAddress' => $request->ip(),
                    'createdAt' => now(),
                ]);
            }

            return response()->json([
                'assets' => $slice->map(fn ($img) => $this->formatAsset($img, $dlCounts[$img->id] ?? 0))->all(),
                'total' => $total,
                'hasMore' => ($offset + $slice->count()) < $total,
            ]);
        }

        $total = (clone $query)->count();
        $dlCounts = $this->getDownloadCountsMap();

        if ($sort === 'popular') {
            $allRows = $query->orderByDesc('createdAt')->get([
                'id', 'name', 'filename', 'path', 'previewPath', 'thumbPath', 'width', 'height', 'tags', 'createdAt'
            ]);
            $rows = $allRows
                ->sortByDesc(fn ($img) => $dlCounts[$img->id] ?? 0)
                ->values()
                ->slice($offset, $limit)
                ->values();
        } else {
            $rows = $query->orderByDesc('createdAt')
                ->offset($offset)
                ->limit($limit)
                ->get([
                    'id', 'name', 'filename', 'path', 'previewPath', 'thumbPath', 'width', 'height', 'tags'
                ]);
        }

        return response()->json([
            'assets' => $rows->map(fn ($img) => $this->formatAsset($img, $dlCounts[$img->id] ?? 0))->all(),
            'total' => $total,
            'hasMore' => ($offset + $rows->count()) < $total,
        ]);
    }

    public function listTemplates(Request $request)
    {
        EditorDefaultsService::ensureSeeded();
        $q = trim((string) $request->query('q', ''));
        $categoryId = trim((string) $request->query('categoryId', ''));
        $featuredOnly = $request->boolean('featured', false);

        $query = EditorTemplate::with('category:id,name,slug')->where('status', 'published');

        if ($categoryId !== '') {
            $cat = EditorTemplateCategory::where('id', $categoryId)->orWhere('slug', $categoryId)->first();
            if ($cat) {
                $query->where('categoryId', $cat->id);
            } else {
                return response()->json(['templates' => []]);
            }
        }

        if ($featuredOnly) {
            $query->where('isFeatured', true);
        }

        $rows = $query->orderByDesc('isFeatured')->orderByDesc('usageCount')->orderByDesc('createdAt')->get();

        if ($q !== '') {
            $qLower = strtolower($q);
            $rows = $rows->filter(function ($tpl) use ($qLower) {
                if (str_contains(strtolower((string) $tpl->title), $qLower)) {
                    return true;
                }
                if ($tpl->description && str_contains(strtolower($tpl->description), $qLower)) {
                    return true;
                }
                if ($tpl->presetLabel && str_contains(strtolower($tpl->presetLabel), $qLower)) {
                    return true;
                }
                if (is_array($tpl->tags)) {
                    foreach ($tpl->tags as $t) {
                        if (is_string($t) && str_contains(strtolower($t), $qLower)) {
                            return true;
                        }
                    }
                }
                return false;
            })->values();
        }

        return response()->json([
            'templates' => $rows->map(fn ($tpl) => $this->formatTemplate($tpl, true))->all(),
        ]);
    }

    public function showTemplate(Request $request, string $idOrSlug)
    {
        $session = TeamService::getCurrentSession($request);
        $canManageEditor = TeamService::hasAnyPermission($session, ['manage_editor']);

        $query = EditorTemplate::with('category:id,name,slug')
            ->where(fn ($q) => $q->where('id', $idOrSlug)->orWhere('slug', $idOrSlug));

        if (!$canManageEditor) {
            $query->where('status', 'published');
        }

        $tpl = $query->first();
        if (!$tpl) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        return response()->json([
            'template' => $this->formatTemplate($tpl, true),
        ]);
    }

    public function track(Request $request)
    {
        $eventType = trim((string) $request->input('eventType', ''));
        $allowedEvents = ['open', 'asset_insert', 'template_apply', 'export'];
        if (!in_array($eventType, $allowedEvents, true)) {
            return response()->json(['error' => 'Invalid event type'], 422);
        }

        $templateId = $request->input('templateId') ? (string) $request->input('templateId') : null;
        $imageId = $request->input('imageId') ? (string) $request->input('imageId') : null;
        $format = $request->input('format') ? strtolower(trim((string) $request->input('format'))) : null;
        $width = $request->input('width') ? max(1, (int) $request->input('width')) : null;
        $height = $request->input('height') ? max(1, (int) $request->input('height')) : null;
        $pageCount = max(1, min(50, (int) $request->input('pageCount', 1)));

        EditorUsageLog::create([
            'eventType' => $eventType,
            'templateId' => $templateId,
            'imageId' => $imageId,
            'format' => $format,
            'width' => $width,
            'height' => $height,
            'pageCount' => $pageCount,
            'deviceType' => $this->detectDeviceType($request),
            'ipAddress' => $request->ip(),
            'createdAt' => now(),
        ]);

        if ($eventType === 'template_apply' && $templateId) {
            EditorTemplate::where('id', $templateId)->increment('usageCount');
        }

        return response()->json(['ok' => true]);
    }

    public function fontCss()
    {
        EditorDefaultsService::ensureSeeded();
        $fonts = EditorFont::where('isActive', true)->orderBy('sortOrder')->get();
        $lines = ["/* Png101 Editor Active Typography */"];

        foreach ($fonts as $font) {
            if ($font->source === 'google' && $font->googleImportUrl) {
                $url = str_replace(["\r", "\n", "'", '"'], '', $font->googleImportUrl);
                $lines[] = "@import url('{$url}');";
            } elseif ($font->source === 'custom' && $font->filePath) {
                $ext = strtolower(pathinfo($font->filePath, PATHINFO_EXTENSION));
                $fmt = match ($ext) {
                    'woff2' => 'woff2',
                    'woff' => 'woff',
                    'otf' => 'opentype',
                    default => 'truetype',
                };
                $family = addslashes($font->family);
                $src = $font->filePath;
                $lines[] = "@font-face { font-family: '{$family}'; src: url('{$src}') format('{$fmt}'); font-display: swap; }";
            }
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'text/css; charset=UTF-8',
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    public function serveFontFile(string $filename)
    {
        if (!preg_match('/^[a-zA-Z0-9._-]+\.(woff2|woff|ttf|otf)$/i', $filename)) {
            abort(404);
        }

        $path = storage_path('app/editor-fonts/' . basename($filename));
        if (!is_file($path)) {
            abort(404);
        }

        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'woff2' => 'font/woff2',
            'woff' => 'font/woff',
            'otf' => 'font/otf',
            default => 'font/ttf',
        };

        return response()->file($path, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=31536000',
            'Access-Control-Allow-Origin' => '*',
        ]);
    }

    private function getDownloadCountsMap(): array
    {
        try {
            return DB::table('Download')
                ->select('imageId', DB::raw('COUNT(*) as dlCount'))
                ->groupBy('imageId')
                ->pluck('dlCount', 'imageId')
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function formatAsset(Image $img, int $downloadsCount = 0): array
    {
        $thumbUrl = ImageProcessingService::ensureWebpThumbnail($img);
        return [
            'id' => $img->id,
            'name' => $img->name ?: $img->filename,
            'url' => $img->path ?: $img->previewPath,
            'thumbUrl' => $thumbUrl ?: $img->path ?: $img->previewPath,
            'width' => (int) ($img->width ?: 800),
            'height' => (int) ($img->height ?: 800),
            'tags' => is_array($img->tags) ? $img->tags : [],
            'downloadsCount' => $downloadsCount,
        ];
    }

    private function formatTemplate(EditorTemplate $tpl, bool $withPages = false): array
    {
        $data = [
            'id' => $tpl->id,
            'title' => $tpl->title,
            'slug' => $tpl->slug,
            'description' => $tpl->description,
            'categoryId' => $tpl->categoryId,
            'categoryName' => $tpl->category?->name ?? 'Uncategorized',
            'width' => (int) $tpl->width,
            'height' => (int) $tpl->height,
            'presetLabel' => $tpl->presetLabel,
            'thumbnailPath' => $tpl->thumbnailPath,
            'tags' => is_array($tpl->tags) ? $tpl->tags : [],
            'isFeatured' => (bool) $tpl->isFeatured,
            'status' => $tpl->status,
            'usageCount' => (int) $tpl->usageCount,
            'createdBy' => $tpl->createdBy,
            'createdAt' => $tpl->createdAt?->toISOString(),
            'updatedAt' => $tpl->updatedAt?->toISOString(),
        ];

        if ($withPages) {
            $data['pagesJson'] = is_array($tpl->pagesJson) ? $tpl->pagesJson : [];
        }

        return $data;
    }
}
