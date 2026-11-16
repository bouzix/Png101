<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaptchaController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CollectionApiController;
use App\Http\Controllers\EditorAdminController;
use App\Http\Controllers\EditorController;
use App\Http\Controllers\ImageApiController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\ToolsController;
use Illuminate\Support\Facades\Route;

// Public pages
Route::get('/', [PublicController::class, 'home'])->name('home');
Route::get('/search', [PublicController::class, 'search'])->name('search');
Route::get('/latest', [PublicController::class, 'latest'])->name('latest');
Route::get('/images/{id}', [PublicController::class, 'image'])->name('images.show');
Route::get('/collections', [PublicController::class, 'collections'])->name('collections.index');
Route::get('/collections/{slug}', [PublicController::class, 'collectionDetail'])->name('collections.show');
Route::get('/tags', [PublicController::class, 'tags'])->name('tags');

// Bonus Standalone Image Tools & Converters
Route::get('/tools', [ToolsController::class, 'index'])->name('tools.index');
Route::get('/tools/convert', [ToolsController::class, 'convertIndex'])->name('tools.convert.index');
Route::get('/tools/convert/{slug}', [ToolsController::class, 'showConvertTool'])->where('slug', '[a-z0-9-]+')->name('tools.convert.show');
Route::get('/tools/utilities', [ToolsController::class, 'utilitiesIndex'])->name('tools.utilities.index');
Route::get('/tools/devtools', [ToolsController::class, 'devtoolsIndex'])->name('tools.devtools.index');
Route::get('/tools/{slug}', [ToolsController::class, 'showTool'])->where('slug', '[a-z0-9-]+')->name('tools.show');

// Legacy /convert SEO 301 Redirects
Route::get('/convert', [ToolsController::class, 'redirectLegacyConvert'])->name('tools.legacy.index');
Route::get('/convert/{slug}', [ToolsController::class, 'redirectLegacyConvert'])->where('slug', '[a-z0-9-]+')->name('tools.legacy.show');

// Canva-Style Public Image Editor & Fonts
Route::get('/image-editor', [EditorController::class, 'index'])->name('editor.index');
Route::get('/editor-fonts.css', [EditorController::class, 'fontCss'])->name('editor.fonts.css');
Route::get('/editor-fonts/file/{filename}', [EditorController::class, 'serveFontFile'])->name('editor.fonts.file');

// Legal & Info pages
Route::get('/about-us', [PublicController::class, 'about'])->name('about');
Route::get('/contact-us', [PublicController::class, 'contact'])->name('contact');
Route::get('/terms-of-service', [PublicController::class, 'terms'])->name('terms');
Route::get('/privacy-policy', [PublicController::class, 'privacy'])->name('privacy');
Route::get('/dmca-policy', [PublicController::class, 'dmca'])->name('dmca');

// Maintenance & Error pages
Route::get('/maintenance', [PublicController::class, 'maintenance'])->name('maintenance');
Route::get('/403', [PublicController::class, 'forbidden'])->name('forbidden');

// Protected /uploads/ route (anti-hotlink / download tracking / preview protection / HTTP cache)
Route::get('/uploads/{path}', [PublicController::class, 'serveUpload'])
    ->where('path', '.*')
    ->middleware('throttle:300,1');
Route::get('/api/uploads/{path}', [PublicController::class, 'serveUpload'])
    ->where('path', '.*')
    ->middleware('throttle:300,1');

// Auth pages
Route::get('/admin', [AuthController::class, 'adminLoginPage'])->name('admin.login');
Route::get('/team/login', [AuthController::class, 'teamLoginPage'])->name('team.login');

// Admin Dashboard (protected by admin.auth middleware)
Route::middleware(['admin.auth'])->get('/admin/upload', [AdminController::class, 'dashboard'])->name('admin.upload');
Route::middleware(['admin.auth'])->prefix('admin/dashboard')->group(function () {
    Route::get('/', [AdminController::class, 'teamWorkspace'])->name('admin.dashboard');
    Route::redirect('/workspace', '/admin/dashboard')->name('admin.workspace');
    Route::get('/files', [AdminController::class, 'files'])->name('admin.files');
    Route::get('/categories', [AdminController::class, 'categories'])->name('admin.categories');
    Route::get('/collections', [AdminController::class, 'collections'])->name('admin.collections');
    Route::get('/analytics', [AdminController::class, 'analytics'])->name('admin.analytics');
    Route::get('/team', [AdminController::class, 'team'])->name('admin.team');
    Route::get('/tools', [AdminController::class, 'tools'])->name('admin.tools');

    // Collapsible Editor Admin Suite
    Route::prefix('editor')->group(function () {
        Route::get('/', [EditorAdminController::class, 'dashboard'])->name('admin.editor.dashboard');
        Route::get('/templates', [EditorAdminController::class, 'templates'])->name('admin.editor.templates');
        Route::get('/categories', [EditorAdminController::class, 'categories'])->name('admin.editor.categories');
        Route::get('/fonts', [EditorAdminController::class, 'fonts'])->name('admin.editor.fonts');
        Route::get('/analytics', [EditorAdminController::class, 'analytics'])->name('admin.editor.analytics');
        Route::get('/settings', [EditorAdminController::class, 'settings'])->name('admin.editor.settings');
    });

    Route::get('/settings', [AdminController::class, 'settings'])->name('admin.settings');
    Route::get('/settings/api-keys', [AdminController::class, 'apiKeys'])->name('admin.settings.api-keys');
    Route::get('/settings/code-injection', [AdminController::class, 'codeInjection'])->name('admin.settings.code-injection');
    Route::get('/settings/data-management', [AdminController::class, 'dataManagement'])->name('admin.settings.data-management');
    Route::get('/settings/error-pages', [AdminController::class, 'errorPages'])->name('admin.settings.error-pages');
    Route::get('/settings/captcha', [AdminController::class, 'captchaSettings'])->name('admin.settings.captcha');
    Route::get('/settings/sliders', [AdminController::class, 'sliderSettings'])->name('admin.settings.sliders');
    Route::get('/settings/team', [AdminController::class, 'settingsTeam'])->name('admin.settings.team');
    Route::get('/settings/website-info', [AdminController::class, 'websiteInfo'])->name('admin.settings.website-info');
    Route::get('/settings/update-app', [AdminController::class, 'updateApp'])->name('admin.settings.update-app');
});

// API Routes
Route::prefix('api')->group(function () {
    // Auth API (rate-limited against brute-force attacks)
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/team/login', [AuthController::class, 'teamLogin'])->middleware('throttle:10,1');
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Public Captcha API
    Route::get('/captcha/config', [CaptchaController::class, 'publicConfig'])->middleware('throttle:120,1');
    Route::post('/captcha/verify', [CaptchaController::class, 'verifyDownload'])->middleware('throttle:60,1');

    // Public Image & Category & Collection APIs
    Route::get('/images/homepage', [ImageApiController::class, 'homepage']);
    Route::get('/images/related', [ImageApiController::class, 'related']);
    Route::get('/images', [ImageApiController::class, 'index']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/collections', [CollectionApiController::class, 'index']);
    Route::get('/collections/{id}', [CollectionApiController::class, 'show']);

    // Analytics & Tool APIs
    Route::post('/analytics/track', [AnalyticsController::class, 'track'])->middleware('throttle:60,1');
    Route::post('/tools/track', [ToolsController::class, 'track'])->middleware('throttle:120,1');
    Route::post('/tools/remove-background', [ToolsController::class, 'removeBackground'])->middleware('throttle:30,1');

    // Public Image Editor APIs
    Route::get('/editor/assets', [EditorController::class, 'searchAssets'])->middleware('throttle:120,1');
    Route::get('/editor/templates', [EditorController::class, 'listTemplates'])->middleware('throttle:120,1');
    Route::get('/editor/templates/{idOrSlug}', [EditorController::class, 'showTemplate'])->middleware('throttle:120,1');
    Route::post('/editor/track', [EditorController::class, 'track'])->middleware('throttle:180,1');

    // Public Contrast Templates GET (used on image detail page)
    Route::get('/admin/contrast-templates', [AdminController::class, 'getContrastTemplates']);

    // Protected Admin & Upload APIs
    Route::middleware(['admin.auth'])->group(function () {
        // Upload & Image Management
        Route::post('/upload', [ImageApiController::class, 'upload']);
        Route::post('/images/upload', [ImageApiController::class, 'redirectUpload']);
        Route::post('/images/generate-meta', [ImageApiController::class, 'generateMeta'])->middleware('throttle:30,1');
        Route::patch('/images', [ImageApiController::class, 'update']);
        Route::patch('/images/update', [ImageApiController::class, 'update']);
        Route::delete('/images', [ImageApiController::class, 'destroy']);
        Route::delete('/images/delete', [ImageApiController::class, 'destroy']);
        Route::get('/images/trash', [ImageApiController::class, 'trash']);
        Route::post('/images/restore', [ImageApiController::class, 'restore']);
        Route::delete('/images/trash', [ImageApiController::class, 'forceDestroy']);
        Route::delete('/images/trash/empty', [ImageApiController::class, 'emptyTrash']);
        Route::post('/images/backfill-thumbs', [ImageApiController::class, 'backfillThumbnails']);

        // Categories CRUD
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{id}', [CategoryController::class, 'update']);
        Route::patch('/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

        // Collections CRUD
        Route::post('/collections', [CollectionApiController::class, 'store']);
        Route::post('/collections/upload-hero', [CollectionApiController::class, 'uploadHero']);
        Route::put('/collections/{id}', [CollectionApiController::class, 'update']);
        Route::patch('/collections/{id}', [CollectionApiController::class, 'update']);
        Route::delete('/collections/{id}', [CollectionApiController::class, 'destroy']);
        Route::post('/collections/{id}/images', [CollectionApiController::class, 'manageImages']);
        Route::delete('/collections/{id}/images', [CollectionApiController::class, 'manageImages']);
        Route::post('/collections/preview-tags', [CollectionApiController::class, 'previewTags']);
        Route::post('/collections/generate-ai', [CollectionApiController::class, 'generateAi']);

        // Analytics Stats
        Route::get('/analytics/stats', [AnalyticsController::class, 'stats']);
        Route::get('/analytics/downloads', [AnalyticsController::class, 'downloads']);
        Route::get('/analytics/countries', [AnalyticsController::class, 'countries']);

        // Admin Settings & Tools
        Route::get('/admin/settings', [AdminController::class, 'getSettings']);
        Route::post('/admin/settings', [AdminController::class, 'saveSettings']);

        Route::get('/admin/api-keys', [AdminController::class, 'listApiKeys']);
        Route::post('/admin/api-keys', [AdminController::class, 'createApiKey']);
        Route::put('/admin/api-keys/{id}', [AdminController::class, 'updateApiKey']);
        Route::delete('/admin/api-keys/{id}', [AdminController::class, 'deleteApiKey']);

        Route::get('/admin/code-injection', [AdminController::class, 'getCodeInjection']);
        Route::post('/admin/code-injection', [AdminController::class, 'saveCodeInjection']);

        Route::get('/admin/website-info', [AdminController::class, 'getWebsiteInfo']);
        Route::post('/admin/website-info', [AdminController::class, 'saveWebsiteInfo']);

        Route::get('/admin/error-pages', [AdminController::class, 'getErrorPages']);
        Route::post('/admin/error-pages', [AdminController::class, 'saveErrorPages']);

        Route::get('/admin/captcha', [AdminController::class, 'getCaptchaSettings']);
        Route::post('/admin/captcha', [AdminController::class, 'saveCaptchaSettings']);

        Route::get('/admin/sliders', [AdminController::class, 'getSliderSettings']);
        Route::post('/admin/sliders', [AdminController::class, 'saveSliderSettings']);

        Route::get('/admin/system-health', [AdminController::class, 'systemHealth']);
        Route::get('/admin/trash-settings', [AdminController::class, 'getTrashSettings']);
        Route::post('/admin/trash-settings', [AdminController::class, 'saveTrashSettings']);

        Route::get('/admin/seo', [AdminController::class, 'getSeoSettings']);
        Route::post('/admin/seo', [AdminController::class, 'saveOrGenerateSeo']);

        Route::post('/admin/contrast-templates', [AdminController::class, 'saveContrastTemplates']);

        Route::get('/admin/team', [AdminController::class, 'getTeam']);
        Route::post('/admin/team', [AdminController::class, 'createTeamMember']);
        Route::patch('/admin/team', [AdminController::class, 'updateTeam']);
        Route::delete('/admin/team', [AdminController::class, 'deleteTeamMember']);

        Route::get('/team/workspace', [AdminController::class, 'teamWorkspaceData']);

        Route::get('/admin/update-app/status', [AdminController::class, 'getUpdateStatus']);
        Route::post('/admin/update-app/check-remote', [AdminController::class, 'checkRemoteUpdate']);
        Route::post('/admin/update-app/run', [AdminController::class, 'runUpdateApp']);

        Route::get('/admin/tools', [AdminController::class, 'getToolsSettings']);
        Route::post('/admin/tools', [AdminController::class, 'saveToolsSettings']);
        Route::post('/admin/tools/bg-remover/test-server', [AdminController::class, 'testBgRemoverServer']);

        // Protected Admin Editor Management APIs
        Route::prefix('admin/editor')->group(function () {
            Route::get('/templates', [EditorAdminController::class, 'apiTemplates']);
            Route::post('/templates', [EditorAdminController::class, 'storeTemplate']);
            Route::put('/templates/{id}', [EditorAdminController::class, 'updateTemplate']);
            Route::patch('/templates/{id}', [EditorAdminController::class, 'updateTemplate']);
            Route::post('/templates/{id}/duplicate', [EditorAdminController::class, 'duplicateTemplate']);
            Route::delete('/templates/{id}', [EditorAdminController::class, 'destroyTemplate']);

            Route::post('/categories', [EditorAdminController::class, 'storeCategory']);
            Route::put('/categories/{id}', [EditorAdminController::class, 'updateCategory']);
            Route::delete('/categories/{id}', [EditorAdminController::class, 'destroyCategory']);

            Route::post('/presets', [EditorAdminController::class, 'storePreset']);
            Route::put('/presets/{id}', [EditorAdminController::class, 'updatePreset']);
            Route::delete('/presets/{id}', [EditorAdminController::class, 'destroyPreset']);

            Route::post('/fonts', [EditorAdminController::class, 'storeFont']);
            Route::patch('/fonts/{id}', [EditorAdminController::class, 'updateFont']);
            Route::delete('/fonts/{id}', [EditorAdminController::class, 'destroyFont']);

            Route::get('/analytics', [EditorAdminController::class, 'apiAnalytics']);
            Route::get('/analytics/export', [EditorAdminController::class, 'exportAnalyticsCsv']);

            Route::get('/settings', [EditorAdminController::class, 'getSettings']);
            Route::post('/settings', [EditorAdminController::class, 'saveSettings']);
        });

        Route::get('/admin/me', [AuthController::class, 'me']);

        Route::delete('/admin/clear-db', [AdminController::class, 'clearDb']);
        Route::delete('/admin/clear-uploads', [AdminController::class, 'clearUploads']);
        Route::post('/admin/data/clear-database', [AdminController::class, 'clearDb']);
        Route::post('/admin/data/clear-uploads', [AdminController::class, 'clearUploads']);
    });
});

// Fallback 404 page
Route::fallback([PublicController::class, 'render404']);
