<?php

namespace App\Http\Controllers;

use App\Models\EditorCanvasPreset;
use App\Models\EditorFont;
use App\Models\EditorTemplate;
use App\Models\EditorTemplateCategory;
use App\Models\EditorUsageLog;
use App\Models\Image;
use App\Services\EditorDefaultsService;
use App\Services\EditorSettingsService;
use App\Services\TeamService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class EditorAdminController extends Controller
{
    private function checkPermission(Request $request): ?Response
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasAnyPermission($session, ['manage_editor'])) {
            return Inertia::render('Errors/Forbidden');
        }
        return null;
    }

    private function authorizeApi(Request $request): ?JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasAnyPermission($session, ['manage_editor'])) {
            return response()->json(['error' => 'Forbidden: Missing manage_editor permission.'], 403);
        }
        return null;
    }

    // ==================== INERTIA ADMIN PAGES ====================

    public function dashboard(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request)) {
            return $forbidden;
        }
        EditorDefaultsService::ensureSeeded();

        return Inertia::render('Admin/Editor/Dashboard', [
            'initialData' => $this->buildAnalyticsPayload(30),
            'settings' => EditorSettingsService::getSettings(),
        ]);
    }

    public function templates(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request)) {
            return $forbidden;
        }
        EditorDefaultsService::ensureSeeded();

        return Inertia::render('Admin/Editor/Templates', [
            'initialTemplates' => $this->fetchAdminTemplates(),
            'categories' => EditorTemplateCategory::orderBy('sortOrder')->orderBy('name')->get(),
            'presets' => EditorCanvasPreset::orderBy('sortOrder')->orderBy('name')->get(),
        ]);
    }

    public function categories(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request)) {
            return $forbidden;
        }
        EditorDefaultsService::ensureSeeded();

        return Inertia::render('Admin/Editor/Categories', [
            'initialCategories' => EditorTemplateCategory::withCount('templates')->orderBy('sortOrder')->orderBy('name')->get(),
            'initialPresets' => EditorCanvasPreset::orderBy('sortOrder')->orderBy('name')->get(),
        ]);
    }

    public function fonts(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request)) {
            return $forbidden;
        }
        EditorDefaultsService::ensureSeeded();

        return Inertia::render('Admin/Editor/Fonts', [
            'initialFonts' => EditorFont::orderBy('sortOrder')->orderBy('family')->get(),
        ]);
    }

    public function analytics(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request)) {
            return $forbidden;
        }
        EditorDefaultsService::ensureSeeded();

        $days = in_array((int) $request->query('days', 30), [7, 30, 90], true)
            ? (int) $request->query('days', 30)
            : 30;

        return Inertia::render('Admin/Editor/Analytics', [
            'initialData' => $this->buildAnalyticsPayload($days),
            'initialDays' => $days,
        ]);
    }

    public function settings(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request)) {
            return $forbidden;
        }
        EditorDefaultsService::ensureSeeded();

        return Inertia::render('Admin/Editor/Settings', [
            'initialSettings' => EditorSettingsService::getSettings(),
        ]);
    }

    // ==================== TEMPLATES API ====================

    public function apiTemplates(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }
        EditorDefaultsService::ensureSeeded();

        return response()->json([
            'templates' => $this->fetchAdminTemplates(),
            'categories' => EditorTemplateCategory::orderBy('sortOrder')->orderBy('name')->get(),
        ]);
    }

    public function storeTemplate(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $title = trim((string) $request->input('title', 'Untitled Template'));
        if ($title === '') {
            return response()->json(['error' => 'Template title is required.'], 422);
        }

        $pagesJson = $this->normalizePagesJson($request->input('pagesJson'));
        $width = max(64, min(8192, (int) $request->input('width', 1080)));
        $height = max(64, min(8192, (int) $request->input('height', 1080)));
        $slug = $this->uniqueTemplateSlug($request->input('slug') ?: $title);

        $session = TeamService::getCurrentSession($request);
        $tpl = EditorTemplate::create([
            'title' => $title,
            'slug' => $slug,
            'description' => trim((string) $request->input('description', '')) ?: null,
            'categoryId' => $request->input('categoryId') ?: null,
            'width' => $width,
            'height' => $height,
            'presetLabel' => trim((string) $request->input('presetLabel', '')) ?: "{$width}×{$height}",
            'pagesJson' => $pagesJson,
            'thumbnailPath' => $this->sanitizeThumbnail($request->input('thumbnailPath')),
            'tags' => $this->normalizeTags($request->input('tags')),
            'isFeatured' => (bool) $request->boolean('isFeatured', false),
            'status' => in_array($request->input('status'), ['published', 'draft', 'archived'], true)
                ? $request->input('status')
                : 'published',
            'createdBy' => $session['name'] ?? 'Admin',
        ]);

        $tpl->load('category:id,name,slug');

        return response()->json([
            'template' => $this->formatAdminTemplate($tpl),
        ], 201);
    }

    public function updateTemplate(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $tpl = EditorTemplate::find($id);
        if (!$tpl) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $updates = [];
        if ($request->has('title')) {
            $title = trim((string) $request->input('title'));
            if ($title !== '') {
                $updates['title'] = $title;
            }
        }
        if ($request->has('slug') && trim((string) $request->input('slug')) !== '') {
            $updates['slug'] = $this->uniqueTemplateSlug((string) $request->input('slug'), $tpl->id);
        }
        if ($request->has('description')) {
            $updates['description'] = trim((string) $request->input('description')) ?: null;
        }
        if ($request->has('categoryId')) {
            $updates['categoryId'] = $request->input('categoryId') ?: null;
        }
        if ($request->has('width')) {
            $updates['width'] = max(64, min(8192, (int) $request->input('width')));
        }
        if ($request->has('height')) {
            $updates['height'] = max(64, min(8192, (int) $request->input('height')));
        }
        if ($request->has('presetLabel')) {
            $updates['presetLabel'] = trim((string) $request->input('presetLabel')) ?: null;
        }
        if ($request->has('pagesJson')) {
            $updates['pagesJson'] = $this->normalizePagesJson($request->input('pagesJson'));
        }
        if ($request->has('thumbnailPath')) {
            $updates['thumbnailPath'] = $this->sanitizeThumbnail($request->input('thumbnailPath'));
        }
        if ($request->has('tags')) {
            $updates['tags'] = $this->normalizeTags($request->input('tags'));
        }
        if ($request->has('isFeatured')) {
            $updates['isFeatured'] = (bool) $request->boolean('isFeatured');
        }
        if ($request->has('status') && in_array($request->input('status'), ['published', 'draft', 'archived'], true)) {
            $updates['status'] = $request->input('status');
        }

        $tpl->update($updates);
        $tpl->load('category:id,name,slug');

        return response()->json([
            'template' => $this->formatAdminTemplate($tpl),
        ]);
    }

    public function duplicateTemplate(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $src = EditorTemplate::find($id);
        if (!$src) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $newTitle = $src->title . ' (Copy)';
        $copy = EditorTemplate::create([
            'title' => $newTitle,
            'slug' => $this->uniqueTemplateSlug($newTitle),
            'description' => $src->description,
            'categoryId' => $src->categoryId,
            'width' => $src->width,
            'height' => $src->height,
            'presetLabel' => $src->presetLabel,
            'pagesJson' => $src->pagesJson,
            'thumbnailPath' => $src->thumbnailPath,
            'tags' => $src->tags,
            'isFeatured' => false,
            'status' => 'draft',
            'usageCount' => 0,
            'createdBy' => TeamService::getCurrentSession($request)['name'] ?? 'Admin',
        ]);
        $copy->load('category:id,name,slug');

        return response()->json(['template' => $this->formatAdminTemplate($copy)], 201);
    }

    public function destroyTemplate(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $tpl = EditorTemplate::find($id);
        if (!$tpl) {
            return response()->json(['error' => 'Template not found'], 404);
        }
        $tpl->delete();

        return response()->json(['ok' => true]);
    }

    // ==================== CATEGORIES & PRESETS API ====================

    public function storeCategory(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $name = trim((string) $request->input('name', ''));
        if ($name === '') {
            return response()->json(['error' => 'Category name is required'], 422);
        }

        $baseSlug = Str::slug($request->input('slug') ?: $name) ?: 'category';
        $slug = $baseSlug;
        $i = 1;
        while (EditorTemplateCategory::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$i}";
            $i++;
        }

        $cat = EditorTemplateCategory::create([
            'name' => $name,
            'slug' => $slug,
            'description' => trim((string) $request->input('description', '')) ?: null,
            'icon' => trim((string) $request->input('icon', 'Folder')) ?: 'Folder',
            'sortOrder' => (int) $request->input('sortOrder', EditorTemplateCategory::count() + 1),
            'isActive' => (bool) $request->boolean('isActive', true),
        ]);

        return response()->json(['category' => $cat], 201);
    }

    public function updateCategory(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $cat = EditorTemplateCategory::find($id);
        if (!$cat) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        $updates = [];
        if ($request->has('name') && trim((string) $request->input('name')) !== '') {
            $updates['name'] = trim((string) $request->input('name'));
        }
        if ($request->has('description')) {
            $updates['description'] = trim((string) $request->input('description')) ?: null;
        }
        if ($request->has('icon')) {
            $updates['icon'] = trim((string) $request->input('icon')) ?: 'Folder';
        }
        if ($request->has('sortOrder')) {
            $updates['sortOrder'] = (int) $request->input('sortOrder');
        }
        if ($request->has('isActive')) {
            $updates['isActive'] = (bool) $request->boolean('isActive');
        }

        $cat->update($updates);
        return response()->json(['category' => $cat]);
    }

    public function destroyCategory(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $cat = EditorTemplateCategory::find($id);
        if (!$cat) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        EditorTemplate::where('categoryId', $cat->id)->update(['categoryId' => null]);
        $cat->delete();

        return response()->json(['ok' => true]);
    }

    public function storePreset(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $name = trim((string) $request->input('name', ''));
        $width = (int) $request->input('width', 0);
        $height = (int) $request->input('height', 0);
        if ($name === '' || $width < 32 || $height < 32) {
            return response()->json(['error' => 'Valid preset name, width, and height are required.'], 422);
        }

        $preset = EditorCanvasPreset::create([
            'name' => $name,
            'groupName' => trim((string) $request->input('groupName', 'Custom')) ?: 'Custom',
            'width' => min(8192, $width),
            'height' => min(8192, $height),
            'icon' => trim((string) $request->input('icon', 'Maximize2')) ?: 'Maximize2',
            'sortOrder' => (int) $request->input('sortOrder', EditorCanvasPreset::count() + 1),
            'isActive' => (bool) $request->boolean('isActive', true),
        ]);

        return response()->json(['preset' => $preset], 201);
    }

    public function updatePreset(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $preset = EditorCanvasPreset::find($id);
        if (!$preset) {
            return response()->json(['error' => 'Preset not found'], 404);
        }

        $updates = [];
        if ($request->has('name') && trim((string) $request->input('name')) !== '') {
            $updates['name'] = trim((string) $request->input('name'));
        }
        if ($request->has('groupName')) {
            $updates['groupName'] = trim((string) $request->input('groupName')) ?: 'Custom';
        }
        if ($request->has('width')) {
            $updates['width'] = max(32, min(8192, (int) $request->input('width')));
        }
        if ($request->has('height')) {
            $updates['height'] = max(32, min(8192, (int) $request->input('height')));
        }
        if ($request->has('sortOrder')) {
            $updates['sortOrder'] = (int) $request->input('sortOrder');
        }
        if ($request->has('isActive')) {
            $updates['isActive'] = (bool) $request->boolean('isActive');
        }

        $preset->update($updates);
        return response()->json(['preset' => $preset]);
    }

    public function destroyPreset(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $preset = EditorCanvasPreset::find($id);
        if (!$preset) {
            return response()->json(['error' => 'Preset not found'], 404);
        }
        $preset->delete();
        return response()->json(['ok' => true]);
    }

    // ==================== FONTS API ====================

    public function storeFont(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $family = trim((string) $request->input('family', ''));
        $source = in_array($request->input('source'), ['google', 'custom'], true)
            ? $request->input('source')
            : 'google';

        if ($family === '') {
            return response()->json(['error' => 'Font family name is required'], 422);
        }

        if ($source === 'custom') {
            if (!$request->hasFile('file')) {
                return response()->json(['error' => 'Font file (.woff2, .ttf, .otf) is required'], 422);
            }
            $file = $request->file('file');
            $ext = strtolower($file->getClientOriginalExtension());
            if (!in_array($ext, ['woff2', 'woff', 'ttf', 'otf'], true)) {
                return response()->json(['error' => 'Unsupported font file extension. Use woff2, woff, ttf, or otf.'], 422);
            }
            $dir = storage_path('app/editor-fonts');
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $safeName = Str::slug($family) . '-' . substr(md5(uniqid('', true)), 0, 8) . '.' . $ext;
            $file->move($dir, $safeName);

            $font = EditorFont::create([
                'family' => $family,
                'source' => 'custom',
                'weights' => ['400', '700'],
                'filePath' => '/editor-fonts/file/' . $safeName,
                'isActive' => true,
                'sortOrder' => EditorFont::count() + 1,
            ]);
            return response()->json(['font' => $font], 201);
        }

        $weights = $request->input('weights');
        if (is_string($weights)) {
            $weights = array_values(array_filter(array_map('trim', explode(',', $weights))));
        }
        if (!is_array($weights) || empty($weights)) {
            $weights = ['400', '700'];
        }

        $encoded = str_replace(' ', '+', $family);
        $googleUrl = trim((string) $request->input('googleImportUrl', ''));
        if ($googleUrl === '') {
            $googleUrl = "https://fonts.googleapis.com/css2?family={$encoded}:wght@" . implode(';', $weights) . "&display=swap";
        }

        $font = EditorFont::create([
            'family' => $family,
            'source' => 'google',
            'weights' => $weights,
            'googleImportUrl' => $googleUrl,
            'isActive' => true,
            'sortOrder' => EditorFont::count() + 1,
        ]);

        return response()->json(['font' => $font], 201);
    }

    public function updateFont(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $font = EditorFont::find($id);
        if (!$font) {
            return response()->json(['error' => 'Font not found'], 404);
        }

        $updates = [];
        if ($request->has('isActive')) {
            $updates['isActive'] = (bool) $request->boolean('isActive');
        }
        if ($request->has('family') && trim((string) $request->input('family')) !== '') {
            $updates['family'] = trim((string) $request->input('family'));
        }
        $font->update($updates);

        return response()->json(['font' => $font]);
    }

    public function destroyFont(Request $request, string $id)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $font = EditorFont::find($id);
        if (!$font) {
            return response()->json(['error' => 'Font not found'], 404);
        }

        if ($font->source === 'custom' && $font->filePath) {
            $basename = basename($font->filePath);
            $diskPath = storage_path('app/editor-fonts/' . $basename);
            if (is_file($diskPath)) {
                @unlink($diskPath);
            }
        }
        $font->delete();

        return response()->json(['ok' => true]);
    }

    // ==================== ANALYTICS API & CSV ====================

    public function apiAnalytics(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $days = in_array((int) $request->query('days', 30), [7, 30, 90], true)
            ? (int) $request->query('days', 30)
            : 30;

        return response()->json($this->buildAnalyticsPayload($days));
    }

    public function exportAnalyticsCsv(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $days = in_array((int) $request->query('days', 30), [7, 30, 90], true)
            ? (int) $request->query('days', 30)
            : 30;
        $since = Carbon::now()->subDays($days)->startOfDay();

        $rows = EditorUsageLog::where('createdAt', '>=', $since)
            ->orderByDesc('createdAt')
            ->limit(10000)
            ->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="editor-analytics-' . $days . 'd.csv"',
        ];

        return response()->stream(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Timestamp', 'Event', 'Search Query', 'Result Count', 'Format', 'Width', 'Height', 'Pages', 'Device', 'Template ID', 'Image ID']);
            foreach ($rows as $row) {
                fputcsv($out, [
                    $row->createdAt?->toIso8601String(),
                    $row->eventType,
                    $row->searchQuery,
                    $row->resultCount,
                    $row->format,
                    $row->width,
                    $row->height,
                    $row->pageCount,
                    $row->deviceType,
                    $row->templateId,
                    $row->imageId,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }

    // ==================== SETTINGS API ====================

    public function getSettings(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        return response()->json([
            'settings' => EditorSettingsService::getSettings(),
        ]);
    }

    public function saveSettings(Request $request)
    {
        if ($forbidden = $this->authorizeApi($request)) {
            return $forbidden;
        }

        $saved = EditorSettingsService::saveSettings($request->all());
        return response()->json(['settings' => $saved]);
    }

    // ==================== HELPERS ====================

    private function fetchAdminTemplates(): array
    {
        return EditorTemplate::with('category:id,name,slug')
            ->orderByDesc('isFeatured')
            ->orderByDesc('updatedAt')
            ->get()
            ->map(fn ($t) => $this->formatAdminTemplate($t))
            ->all();
    }

    private function formatAdminTemplate(EditorTemplate $tpl): array
    {
        return [
            'id' => $tpl->id,
            'title' => $tpl->title,
            'slug' => $tpl->slug,
            'description' => $tpl->description,
            'categoryId' => $tpl->categoryId,
            'categoryName' => $tpl->category?->name ?? 'Uncategorized',
            'width' => (int) $tpl->width,
            'height' => (int) $tpl->height,
            'presetLabel' => $tpl->presetLabel,
            'pagesJson' => is_array($tpl->pagesJson) ? $tpl->pagesJson : [],
            'thumbnailPath' => $tpl->thumbnailPath,
            'tags' => is_array($tpl->tags) ? $tpl->tags : [],
            'isFeatured' => (bool) $tpl->isFeatured,
            'status' => $tpl->status,
            'usageCount' => (int) $tpl->usageCount,
            'createdBy' => $tpl->createdBy,
            'createdAt' => $tpl->createdAt?->toISOString(),
            'updatedAt' => $tpl->updatedAt?->toISOString(),
        ];
    }

    private function normalizePagesJson($raw): array
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($raw) || empty($raw)) {
            return [[
                'id' => 'page-1',
                'name' => 'Page 1',
                'width' => 1080,
                'height' => 1080,
                'background' => null,
                'fabricJson' => ['version' => '6.0.0', 'objects' => []],
            ]];
        }
        return array_values($raw);
    }

    private function normalizeTags($raw): array
    {
        if (is_string($raw)) {
            $raw = array_map('trim', explode(',', $raw));
        }
        if (!is_array($raw)) {
            return [];
        }
        return array_values(array_unique(array_filter(array_map(fn ($t) => trim((string) $t), $raw))));
    }

    private function sanitizeThumbnail($raw): ?string
    {
        if (!$raw || !is_string($raw)) {
            return null;
        }
        $trimmed = trim($raw);
        if (str_starts_with($trimmed, 'data:image/') || str_starts_with($trimmed, '/uploads/')) {
            return $trimmed;
        }
        return null;
    }

    private function uniqueTemplateSlug(string $source, ?string $ignoreId = null): string
    {
        $base = Str::slug($source) ?: 'template';
        $slug = $base;
        $i = 1;
        while (EditorTemplate::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }

    private function buildAnalyticsPayload(int $days): array
    {
        $since = Carbon::now()->subDays($days - 1)->startOfDay();
        $logs = EditorUsageLog::where('createdAt', '>=', $since)->get();

        $opens = $logs->where('eventType', 'open')->count();
        $exports = $logs->where('eventType', 'export')->count();
        $assetInserts = $logs->where('eventType', 'asset_insert')->count();
        $templateApplies = $logs->where('eventType', 'template_apply')->count();
        $searches = $logs->where('eventType', 'asset_search')->count();

        // Daily series
        $dailyMap = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = Carbon::now()->subDays($i);
            $key = $d->format('Y-m-d');
            $dailyMap[$key] = [
                'date' => $d->format('M j'),
                'opens' => 0,
                'exports' => 0,
                'inserts' => 0,
            ];
        }
        foreach ($logs as $log) {
            if (!$log->createdAt) {
                continue;
            }
            $k = $log->createdAt->format('Y-m-d');
            if (!isset($dailyMap[$k])) {
                continue;
            }
            if ($log->eventType === 'open') {
                $dailyMap[$k]['opens']++;
            } elseif ($log->eventType === 'export') {
                $dailyMap[$k]['exports']++;
            } elseif ($log->eventType === 'asset_insert') {
                $dailyMap[$k]['inserts']++;
            }
        }

        // Format distribution
        $formatBreakdown = $logs->where('eventType', 'export')
            ->groupBy(fn ($l) => strtoupper($l->format ?: 'PNG'))
            ->map(fn ($group, $fmt) => ['name' => $fmt, 'count' => $group->count()])
            ->values()
            ->all();

        // Device distribution
        $deviceBreakdown = $logs->groupBy(fn ($l) => ucfirst($l->deviceType ?: 'desktop'))
            ->map(fn ($group, $dev) => ['name' => $dev, 'count' => $group->count()])
            ->values()
            ->all();

        // Top Canvas Dimensions exported
        $topSizes = $logs->where('eventType', 'export')
            ->filter(fn ($l) => $l->width && $l->height)
            ->groupBy(fn ($l) => "{$l->width}×{$l->height}")
            ->map(fn ($group, $dim) => ['size' => $dim, 'count' => $group->count()])
            ->sortByDesc('count')
            ->take(6)
            ->values()
            ->all();

        // Top Searched PNG Queries & Zero-result gaps
        $searchGroups = $logs->where('eventType', 'asset_search')
            ->filter(fn ($l) => !empty($l->searchQuery))
            ->groupBy(fn ($l) => strtolower(trim((string) $l->searchQuery)));

        $topSearches = $searchGroups->map(function ($group, $term) {
            $avgResults = round($group->avg('resultCount') ?? 0);
            return [
                'query' => $group->first()->searchQuery,
                'count' => $group->count(),
                'avgResults' => $avgResults,
            ];
        })->sortByDesc('count')->take(12)->values()->all();

        $zeroResultSearches = $searchGroups->filter(fn ($g) => (int) $g->max('resultCount') === 0)
            ->map(fn ($group) => [
                'query' => $group->first()->searchQuery,
                'count' => $group->count(),
            ])->sortByDesc('count')->take(10)->values()->all();

        // Top Inserted Site PNGs
        $topAssetCounts = $logs->where('eventType', 'asset_insert')
            ->filter(fn ($l) => !empty($l->imageId))
            ->groupBy('imageId')
            ->map->count()
            ->sortDesc()
            ->take(8);

        $assetModels = $topAssetCounts->isNotEmpty()
            ? Image::whereIn('id', $topAssetCounts->keys()->all())->get(['id', 'name', 'filename', 'thumbPath', 'path'])->keyBy('id')
            : collect();

        $topAssets = [];
        foreach ($topAssetCounts as $imgId => $cnt) {
            $img = $assetModels->get($imgId);
            $topAssets[] = [
                'id' => $imgId,
                'name' => $img?->name ?: ($img?->filename ?: 'Deleted Asset'),
                'thumbUrl' => $img?->thumbPath ?: ($img?->path ?: null),
                'inserts' => $cnt,
            ];
        }

        // Top Templates
        $topTemplates = EditorTemplate::with('category:id,name')
            ->orderByDesc('usageCount')
            ->take(8)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'title' => $t->title,
                'categoryName' => $t->category?->name ?? 'Uncategorized',
                'usageCount' => (int) $t->usageCount,
                'status' => $t->status,
                'width' => (int) $t->width,
                'height' => (int) $t->height,
                'thumbnailPath' => $t->thumbnailPath,
            ])->all();

        return [
            'kpis' => [
                'totalTemplates' => EditorTemplate::count(),
                'publishedTemplates' => EditorTemplate::where('status', 'published')->count(),
                'draftTemplates' => EditorTemplate::where('status', 'draft')->count(),
                'activeCategories' => EditorTemplateCategory::where('isActive', true)->count(),
                'activePresets' => EditorCanvasPreset::where('isActive', true)->count(),
                'activeFonts' => EditorFont::where('isActive', true)->count(),
                'opens' => $opens,
                'exports' => $exports,
                'assetInserts' => $assetInserts,
                'templateApplies' => $templateApplies,
                'searches' => $searches,
                'exportRate' => $opens > 0 ? round(($exports / $opens) * 100, 1) : 0,
            ],
            'daily' => array_values($dailyMap),
            'formats' => $formatBreakdown,
            'devices' => $deviceBreakdown,
            'topSizes' => $topSizes,
            'topSearches' => $topSearches,
            'zeroResultSearches' => $zeroResultSearches,
            'topAssets' => $topAssets,
            'topTemplates' => $topTemplates,
        ];
    }
}
