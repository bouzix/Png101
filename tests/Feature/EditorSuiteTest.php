<?php

namespace Tests\Feature;

use App\Http\Middleware\HostingInstallerRedirectMiddleware;
use App\Models\EditorTemplate;
use App\Models\EditorUsageLog;
use App\Models\Image;
use App\Models\TeamMember;
use App\Services\EditorSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EditorSuiteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(HostingInstallerRedirectMiddleware::class);
    }

    private function adminSession(): array
    {
        return ['auth_token' => 'authenticated'];
    }

    public function test_public_editor_page_renders_with_defaults(): void
    {
        $response = $this->get('/image-editor');
        $response->assertStatus(200);
        $response->assertSee('ImageEditor');
    }

    public function test_editor_asset_search_filters_published_pngs_and_logs_searches(): void
    {
        $pub = Image::create([
            'filename' => 'golden-crown.png',
            'path' => '/uploads/golden-crown.png',
            'previewPath' => '/uploads/preview-golden-crown.jpg',
            'thumbPath' => '/uploads/thumb-golden-crown.webp',
            'name' => 'Golden Crown Sticker',
            'tags' => ['crown', 'gold', 'royal'],
            'status' => 'published',
            'width' => 1000,
            'height' => 1000,
        ]);

        Image::create([
            'filename' => 'hidden-draft.png',
            'path' => '/uploads/hidden-draft.png',
            'name' => 'Crown Draft',
            'tags' => ['crown'],
            'status' => 'staged',
            'width' => 800,
            'height' => 800,
        ]);

        $res = $this->getJson('/api/editor/assets?q=crown');
        $res->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('assets.0.id', $pub->id);

        $pop = $this->getJson('/api/editor/assets?sort=popular');
        $pop->assertStatus(200)->assertJsonPath('total', 1);

        $this->assertDatabaseHas('EditorUsageLog', [
            'eventType' => 'asset_search',
            'searchQuery' => 'crown',
            'resultCount' => 1,
        ]);

        // Zero-result gap logging
        $zero = $this->getJson('/api/editor/assets?q=nonexistent_unicorn');
        $zero->assertStatus(200)->assertJsonPath('total', 0);

        $this->assertDatabaseHas('EditorUsageLog', [
            'eventType' => 'asset_search',
            'searchQuery' => 'nonexistent_unicorn',
            'resultCount' => 0,
        ]);
    }

    public function test_tracking_increments_template_usage_and_records_events(): void
    {
        $this->get('/image-editor')->assertStatus(200);
        $tpl = EditorTemplate::first();
        $this->assertNotNull($tpl);
        $initialUses = $tpl->usageCount;

        $this->postJson('/api/editor/track', [
            'eventType' => 'template_apply',
            'templateId' => $tpl->id,
        ])->assertStatus(200)->assertJson(['ok' => true]);

        $this->assertSame($initialUses + 1, $tpl->fresh()->usageCount);

        $this->postJson('/api/editor/track', [
            'eventType' => 'export',
            'format' => 'png',
            'width' => 2160,
            'height' => 2160,
            'pageCount' => 2,
        ])->assertStatus(200);

        $this->assertSame(1, EditorUsageLog::where('eventType', 'export')->where('format', 'png')->count());
    }

    public function test_admin_editor_endpoints_require_manage_editor_permission(): void
    {
        $this->getJson('/api/admin/editor/templates')->assertStatus(401);

        $restrictedMember = TeamMember::create([
            'name' => 'Uploader Only',
            'email' => 'uploader@example.com',
            'passwordHash' => Hash::make('secret123'),
            'permissions' => ['upload_images'],
            'isActive' => true,
        ]);

        $this->withSession([
            'auth_token' => 'team_member',
            'team_member_id' => $restrictedMember->id,
        ])->getJson('/api/admin/editor/templates')->assertStatus(403);
    }

    public function test_super_admin_can_manage_templates_categories_presets_fonts_settings_and_analytics(): void
    {
        $session = $this->adminSession();

        // All 6 admin Inertia pages respond 200
        foreach ([
            '/admin/dashboard/editor',
            '/admin/dashboard/editor/templates',
            '/admin/dashboard/editor/categories',
            '/admin/dashboard/editor/fonts',
            '/admin/dashboard/editor/analytics',
            '/admin/dashboard/editor/settings',
        ] as $uri) {
            $this->withSession($session)->get($uri)->assertStatus(200);
        }

        // Category CRUD
        $catRes = $this->withSession($session)->postJson('/api/admin/editor/categories', [
            'name' => 'Podcast Covers',
            'description' => 'Square album artwork',
        ])->assertStatus(201);
        $catId = $catRes->json('category.id');

        // Preset CRUD
        $presetRes = $this->withSession($session)->postJson('/api/admin/editor/presets', [
            'name' => 'Podcast Square 3000',
            'groupName' => 'Audio',
            'width' => 3000,
            'height' => 3000,
        ])->assertStatus(201);
        $presetId = $presetRes->json('preset.id');

        // Template CRUD + Duplicate + Public filter
        $tplRes = $this->withSession($session)->postJson('/api/admin/editor/templates', [
            'title' => 'Neon Podcast Starter',
            'categoryId' => $catId,
            'width' => 3000,
            'height' => 3000,
            'status' => 'published',
            'isFeatured' => true,
            'pagesJson' => [[
                'id' => 'p1',
                'name' => 'Cover',
                'width' => 3000,
                'height' => 3000,
                'fabricJson' => ['version' => '6.0.0', 'objects' => []],
            ]],
        ])->assertStatus(201);
        $tplId = $tplRes->json('template.id');

        $dupRes = $this->withSession($session)
            ->postJson("/api/admin/editor/templates/{$tplId}/duplicate")
            ->assertStatus(201);
        $dupId = $dupRes->json('template.id');
        $this->assertSame('draft', $dupRes->json('template.status'));

        // Font CRUD + CSS output
        $fontRes = $this->withSession($session)->postJson('/api/admin/editor/fonts', [
            'source' => 'google',
            'family' => 'Syne',
            'weights' => '600,800',
        ])->assertStatus(201);
        $fontId = $fontRes->json('font.id');

        $cssRes = $this->get('/editor-fonts.css');
        $cssRes->assertStatus(200)->assertSee('Syne');

        // Analytics CSV
        $csvRes = $this->withSession($session)->get('/api/admin/editor/analytics/export?days=30');
        $csvRes->assertStatus(200);
        $this->assertStringContainsString('text/csv', (string) $csvRes->headers->get('Content-Type'));

        // Settings toggles save showInPublicNav & showInFooter and gate public flags
        $this->withSession($session)->postJson('/api/admin/editor/settings', [
            'enabled' => true,
            'showInPublicNav' => false,
            'showInFooter' => false,
            'navLabel' => 'Studio Pro',
        ])->assertStatus(200)
            ->assertJsonPath('settings.showInPublicNav', false)
            ->assertJsonPath('settings.showInFooter', false)
            ->assertJsonPath('settings.navLabel', 'Studio Pro');

        $flagsOff = EditorSettingsService::getPublicFlags();
        $this->assertTrue($flagsOff['enabled']);
        $this->assertFalse($flagsOff['showInPublicNav']);
        $this->assertFalse($flagsOff['showInFooter']);
        $this->assertSame('Studio Pro', $flagsOff['navLabel']);

        // Re-enable navbar + footer menu flags & verify
        $this->withSession($session)->postJson('/api/admin/editor/settings', [
            'enabled' => true,
            'showInPublicNav' => true,
            'showInFooter' => true,
            'navLabel' => 'Image Editor',
        ])->assertStatus(200)
            ->assertJsonPath('settings.showInPublicNav', true)
            ->assertJsonPath('settings.showInFooter', true);

        $flagsOn = EditorSettingsService::getPublicFlags();
        $this->assertTrue($flagsOn['showInPublicNav']);
        $this->assertTrue($flagsOn['showInFooter']);

        // Settings toggle hides public /image-editor when disabled
        $this->withSession($session)->postJson('/api/admin/editor/settings', [
            'enabled' => false,
        ])->assertStatus(200)->assertJsonPath('settings.enabled', false);

        // Outside Canvas settings validation, clamping, and automatic default inclusion
        $this->withSession($session)->postJson('/api/admin/editor/settings', [
            'enableOutsideCanvasPasteboard' => true,
            'defaultOutsideCanvasMode' => 'original',
            'allowedOutsideCanvasModes' => ['grayscale-dim', 'dimmed'],
            'allowOutsideCanvasUserOverride' => false,
            'outsideCanvasOpacity' => 75,
            'outsideCanvasPadding' => 960,
        ])->assertStatus(200)
            ->assertJsonPath('settings.enableOutsideCanvasPasteboard', true)
            ->assertJsonPath('settings.defaultOutsideCanvasMode', 'original')
            ->assertJsonPath('settings.allowOutsideCanvasUserOverride', false)
            ->assertJsonPath('settings.outsideCanvasOpacity', 75)
            ->assertJsonPath('settings.outsideCanvasPadding', 960);

        $outsideSaved = EditorSettingsService::getSettings();
        $this->assertContains('original', $outsideSaved['allowedOutsideCanvasModes']);
        $this->assertSame('original', $outsideSaved['defaultOutsideCanvasMode']);
        $this->assertSame(960, $outsideSaved['outsideCanvasPadding']);

        $flagsDisabled = EditorSettingsService::getPublicFlags();
        $this->assertFalse($flagsDisabled['enabled']);
        $this->assertFalse($flagsDisabled['showInPublicNav']);
        $this->assertFalse($flagsDisabled['showInFooter']);

        // Flush session before unauthenticated guest assertion
        $this->app['session']->flush();

        // Public visitor blocked (404) when disabled
        $this->get('/image-editor')->assertStatus(404);
        // Super admin still accesses studio cleanly
        $this->withSession($session)->get('/image-editor?adminTemplate=' . $tplId)->assertStatus(200);

        // Cleanup entities & restore enabled state
        $this->withSession($session)->deleteJson("/api/admin/editor/templates/{$dupId}")->assertStatus(200);
        $this->withSession($session)->deleteJson("/api/admin/editor/templates/{$tplId}")->assertStatus(200);
        $this->withSession($session)->deleteJson("/api/admin/editor/presets/{$presetId}")->assertStatus(200);
        $this->withSession($session)->deleteJson("/api/admin/editor/categories/{$catId}")->assertStatus(200);
        $this->withSession($session)->deleteJson("/api/admin/editor/fonts/{$fontId}")->assertStatus(200);

        EditorSettingsService::saveSettings([
            'enabled' => true,
            'showInPublicNav' => true,
            'showInFooter' => true,
        ]);
    }

    public function test_save_as_template_permission_is_only_granted_to_authenticated_admin_or_editor_team_member(): void
    {
        // 1. Unauthenticated / normal visitor cannot see or manage templates
        $guestRes = $this->get('/image-editor');
        $guestRes->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ImageEditor')
                ->where('canManageEditor', false)
                ->where('auth.authenticated', false)
            );

        // 2. Super Admin receives canManageEditor = true
        $this->withSession($this->adminSession())
            ->get('/image-editor')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ImageEditor')
                ->where('canManageEditor', true)
                ->where('auth.authenticated', true)
                ->where('auth.role', 'super_admin')
            );

        // 3. Team member WITH manage_editor permission receives canManageEditor = true
        $editorMember = TeamMember::create([
            'name' => 'Template Designer',
            'email' => 'designer@example.com',
            'passwordHash' => Hash::make('secret123'),
            'permissions' => ['manage_editor'],
            'isActive' => true,
        ]);

        $this->withSession([
            'auth_token' => 'team_member',
            'team_member_id' => $editorMember->id,
        ])
            ->get('/image-editor')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ImageEditor')
                ->where('canManageEditor', true)
                ->where('auth.authenticated', true)
                ->where('auth.role', 'team_member')
            );

        // 4. Team member WITHOUT manage_editor permission cannot see Save as Template
        $restrictedMember = TeamMember::create([
            'name' => 'Restricted Uploader',
            'email' => 'restricted@example.com',
            'passwordHash' => Hash::make('secret123'),
            'permissions' => ['upload_images'],
            'isActive' => true,
        ]);

        $this->withSession([
            'auth_token' => 'team_member',
            'team_member_id' => $restrictedMember->id,
        ])
            ->get('/image-editor')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ImageEditor')
                ->where('canManageEditor', false)
                ->where('auth.authenticated', true)
                ->where('auth.role', 'team_member')
            );
    }

    public function test_editor_assets_generate_transparent_webp_thumbnails_and_support_asset_types(): void
    {
        $tmpDir = public_path('uploads/_test_webp');
        if (!is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }
        $pngAbs = $tmpDir . '/sample-sticker.png';
        $im = imagecreatetruecolor(600, 600);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        $trans = imagecolorallocatealpha($im, 0, 0, 0, 127);
        imagefilledrectangle($im, 0, 0, 600, 600, $trans);
        $blue = imagecolorallocatealpha($im, 37, 99, 235, 0);
        imagefilledellipse($im, 300, 300, 400, 400, $blue);
        imagepng($im, $pngAbs);
        imagedestroy($im);

        $pngImg = Image::create([
            'filename' => 'sample-sticker.png',
            'path' => '/uploads/_test_webp/sample-sticker.png',
            'previewPath' => '/uploads/_test_webp/preview-sample-sticker.jpg',
            'thumbPath' => null,
            'name' => 'Sample Blue Sticker',
            'status' => 'published',
            'width' => 600,
            'height' => 600,
            'mimeType' => 'image/png',
        ]);

        $svgImg = Image::create([
            'filename' => 'arrow-icon.svg',
            'path' => '/uploads/_test_webp/arrow-icon.svg',
            'name' => 'Arrow Vector Icon',
            'status' => 'published',
            'width' => 64,
            'height' => 64,
            'mimeType' => 'image/svg+xml',
        ]);

        try {
            // PNG type excludes SVG and lazily generates a real transparent .webp thumbnail
            $pngRes = $this->getJson('/api/editor/assets?type=png');
            $pngRes->assertStatus(200)
                ->assertJsonPath('total', 1)
                ->assertJsonPath('assets.0.id', $pngImg->id);

            $returnedThumb = (string) $pngRes->json('assets.0.thumbUrl');
            $this->assertStringEndsWith('.webp', $returnedThumb);
            $this->assertFileExists(public_path(ltrim($returnedThumb, '/')));
            $this->assertStringNotContainsString('preview-', $returnedThumb);

            // SVG type returns only SVG assets
            $svgRes = $this->getJson('/api/editor/assets?type=svg');
            $svgRes->assertStatus(200)
                ->assertJsonPath('total', 1)
                ->assertJsonPath('assets.0.id', $svgImg->id);

            // Backgrounds type filters cleanly
            $bgRes = $this->getJson('/api/editor/assets?type=backgrounds');
            $bgRes->assertStatus(200)->assertJsonPath('total', 0);
        } finally {
            foreach (glob($tmpDir . '/*') ?: [] as $f) {
                @unlink($f);
            }
            @rmdir($tmpDir);
        }
    }

    public function test_admin_upload_generates_webp_thumbnail_and_public_grids_serve_webp_thumbnails(): void
    {
        $tmpPng = sys_get_temp_dir() . '/test_upload_' . uniqid() . '.png';
        $im = imagecreatetruecolor(700, 700);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        $trans = imagecolorallocatealpha($im, 0, 0, 0, 127);
        imagefilledrectangle($im, 0, 0, 700, 700, $trans);
        $emerald = imagecolorallocatealpha($im, 16, 185, 129, 0);
        imagefilledellipse($im, 350, 350, 480, 480, $emerald);
        imagepng($im, $tmpPng);
        imagedestroy($im);

        $uploadedFile = new \Illuminate\Http\UploadedFile($tmpPng, 'emerald-circle.png', 'image/png', null, true);

        $createdPaths = [];
        try {
            $uploadRes = $this->withSession($this->adminSession())
                ->post('/api/upload', [
                    'file' => $uploadedFile,
                    'name' => 'Emerald Circle Badge',
                    'tags' => json_encode(['badge', 'circle']),
                ]);

            $uploadRes->assertStatus(200)->assertJsonPath('success', true);
            $imgData = $uploadRes->json('image');
            $this->assertNotEmpty($imgData['path']);
            $this->assertNotEmpty($imgData['thumbPath']);
            $this->assertStringEndsWith('.webp', $imgData['thumbPath']);

            $createdPaths = [
                public_path(ltrim((string) $imgData['path'], '/')),
                public_path(ltrim((string) $imgData['previewPath'], '/')),
                public_path(ltrim((string) $imgData['thumbPath'], '/')),
            ];
            $this->assertFileExists($createdPaths[2]);

            // Publish the uploaded image and confirm homepage + paginated catalog APIs serve the .webp thumbPath
            Image::where('id', $imgData['id'])->update(['status' => 'published', 'thumbPath' => null]);

            $homeRes = $this->getJson('/api/images/homepage');
            $homeRes->assertStatus(200);
            $latestThumb = (string) ($homeRes->json('latestImages.0.thumbPath') ?? '');
            $this->assertStringEndsWith('.webp', $latestThumb);

            $listRes = $this->getJson('/api/images?status=published&paginated=1');
            $listRes->assertStatus(200);
            $this->assertStringEndsWith('.webp', (string) ($listRes->json('images.0.thumbPath') ?? ''));
        } finally {
            @unlink($tmpPng);
            foreach ($createdPaths as $p) {
                if ($p && is_file($p)) {
                    @unlink($p);
                }
            }
        }
    }

    public function test_admin_template_edit_mode_only_activates_via_admin_templates_query(): void
    {
        $this->get('/image-editor')->assertStatus(200);
        $tpl = EditorTemplate::first();
        $this->assertNotNull($tpl);

        $session = $this->adminSession();

        $publicFromTpl = $this->withSession($session)
            ->get("/image-editor?template={$tpl->slug}");
        $publicFromTpl->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ImageEditor')
                ->where('adminTemplateMode', null)
                ->where('adminTemplate', null)
                ->where('initialTemplate.id', $tpl->id)
            );

        $adminEdit = $this->withSession($session)
            ->get("/image-editor?adminTemplate={$tpl->id}");
        $adminEdit->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ImageEditor')
                ->where('adminTemplateMode', 'edit')
                ->where('adminTemplate.id', $tpl->id)
            );

        $adminNew = $this->withSession($session)
            ->get('/image-editor?adminTemplate=new');
        $adminNew->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ImageEditor')
                ->where('adminTemplateMode', 'new')
                ->where('adminTemplate', null)
            );
    }

    public function test_part_of_collections_slider_and_related_card_props_on_image_detail(): void
    {
        $img = Image::create([
            'filename' => 'badge-icon.png',
            'path' => '/uploads/badge-icon.png',
            'previewPath' => '/uploads/preview-badge-icon.jpg',
            'thumbPath' => '/uploads/thumb-badge-icon.webp',
            'name' => 'Badge Icon PNG',
            'tags' => ['badge', 'icon'],
            'status' => 'published',
            'width' => 1024,
            'height' => 1024,
        ]);

        $col = \App\Models\Collection::create([
            'name' => 'Badge Icons Pack',
            'slug' => 'badge-icons-pack',
            'type' => 'manual',
            'status' => 'published',
            'coverImagePath' => '/uploads/col-thumb.webp',
            'cardBgImagePath' => '/uploads/col-card-bg.png',
            'cardBgColor' => '#1e1b4b',
            'cardTextColor' => '#f8fafc',
        ]);

        \App\Models\CollectionImage::create([
            'collectionId' => $col->id,
            'imageId' => $img->id,
            'position' => 0,
            'isExcluded' => false,
        ]);

        $session = $this->adminSession();
        $this->withSession($session)
            ->get('/admin/dashboard/settings/sliders')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Settings/Sliders')
                ->where('initialSliders.part_of_collections.id', 'part_of_collections')
                ->where('initialSliders.part_of_collections.cardsDesktop', 1)
                ->where('initialSliders.part_of_collections.cardsMobile', 1)
                ->where('initialSliders.featured_collections.id', 'featured_collections')
                ->where('initialSliders.featured_collections.cardsDesktop', 4)
                ->where('initialSliders.featured_collections.cardsMobile', 1)
            );

        $this->get('/collections')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Collections/Index')
                ->where('featuredCollectionsSliderConfig.id', 'featured_collections')
                ->where('featuredCollectionsSliderConfig.cardsDesktop', 4)
            );

        $this->get("/images/{$img->id}-badge-icon")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ImageDetail')
                ->where('partOfCollectionsSliderConfig.id', 'part_of_collections')
                ->where('partOfCollectionsSliderConfig.cardsDesktop', 1)
                ->where('collections.0.id', $col->id)
                ->where('collections.0.cardBgColor', '#1e1b4b')
                ->where('collections.0.cardBgImagePath', '/uploads/col-card-bg.png')
                ->where('collections.0.cardTextColor', '#f8fafc')
                ->where('collections.0.coverImagePath', '/uploads/col-thumb.webp')
                ->where('collections.0.imageCount', 1)
            );
    }

    public function test_color_picker_defaults_persisted_and_shared_globally(): void
    {
        $session = $this->adminSession();

        // Factory defaults shared on public and editor pages initially
        $this->get('/')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->where('colorPickerDefaults.defaultColor', '#3b82f6')
                ->where('colorPickerDefaults.defaultGradientType', 'linear')
                ->where('colorPickerDefaults.defaultGradientAngle', 135)
                ->where('colorPickerDefaults.defaultGradientFrom', '#3b82f6')
                ->where('colorPickerDefaults.defaultGradientTo', '#9333ea')
            );

        // Save customized defaults through /api/admin/settings
        $this->withSession($session)
            ->postJson('/api/admin/settings', [
                'color_picker_defaults' => json_encode([
                    'defaultColor' => '#E11D48',
                    'defaultGradientType' => 'radial',
                    'defaultGradientAngle' => 45,
                    'defaultGradientFrom' => '#0EA5E9',
                    'defaultGradientTo' => '#10B981',
                ]),
            ])
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $img = Image::create([
            'filename' => 'color-default-check.png',
            'path' => '/uploads/color-default-check.png',
            'previewPath' => '/uploads/preview-color-default-check.jpg',
            'thumbPath' => '/uploads/thumb-color-default-check.webp',
            'name' => 'Color Default Check',
            'tags' => ['test'],
            'status' => 'published',
            'width' => 512,
            'height' => 512,
        ]);

        // Assert normalized lowercase hex values are shared globally across image detail, editor, and admin settings
        foreach (["/images/{$img->id}-color-default-check", '/image-editor', '/admin/dashboard/settings'] as $route) {
            $req = str_starts_with($route, '/admin') ? $this->withSession($session) : $this;
            $req->get($route)
                ->assertStatus(200)
                ->assertInertia(fn ($page) => $page
                    ->where('colorPickerDefaults.defaultColor', '#e11d48')
                    ->where('colorPickerDefaults.defaultGradientType', 'radial')
                    ->where('colorPickerDefaults.defaultGradientAngle', 45)
                    ->where('colorPickerDefaults.defaultGradientFrom', '#0ea5e9')
                    ->where('colorPickerDefaults.defaultGradientTo', '#10b981')
                );
        }
    }

    public function test_website_branding_assets_upload_save_and_shared_globally(): void
    {
        $session = $this->adminSession();
        $createdPaths = [];

        try {
            $tmpPng = sys_get_temp_dir() . '/test_brand_' . uniqid() . '.png';
            $im = imagecreatetruecolor(64, 64);
            imagesavealpha($im, true);
            $blue = imagecolorallocatealpha($im, 37, 99, 235, 0);
            imagefill($im, 0, 0, $blue);
            imagepng($im, $tmpPng);
            imagedestroy($im);

            $uploaded = [];
            foreach (['logo', 'icon', 'favicon'] as $slot) {
                $slotTmp = sys_get_temp_dir() . '/test_brand_' . $slot . '_' . uniqid() . '.png';
                copy($tmpPng, $slotTmp);
                $file = new \Illuminate\Http\UploadedFile($slotTmp, "brand-{$slot}.png", 'image/png', null, true);
                $res = $this->withSession($session)
                    ->post('/api/admin/branding/upload', [
                        'type' => $slot,
                        'file' => $file,
                    ]);
                @unlink($slotTmp);
                $res->assertStatus(200)->assertJsonPath('success', true)->assertJsonPath('type', $slot);
                $path = (string) $res->json('path');
                $this->assertStringStartsWith('/uploads/branding/brand-' . $slot . '-', $path);
                $createdPaths[] = public_path(ltrim($path, '/'));
                $uploaded[$slot] = $path;
            }
            @unlink($tmpPng);

            $saveRes = $this->withSession($session)
                ->postJson('/api/admin/website-info', [
                    'websiteName' => 'Png101 BrandTest',
                    'logoUrl' => $uploaded['logo'],
                    'iconUrl' => $uploaded['icon'],
                    'faviconUrl' => $uploaded['favicon'],
                ]);
            $saveRes->assertStatus(200)
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.logoUrl', $uploaded['logo'])
                ->assertJsonPath('data.iconUrl', $uploaded['icon'])
                ->assertJsonPath('data.faviconUrl', $uploaded['favicon']);

            foreach (['/', '/image-editor', '/admin/dashboard/settings'] as $route) {
                $req = str_starts_with($route, '/admin') ? $this->withSession($session) : $this;
                $req->get($route)
                    ->assertStatus(200)
                    ->assertInertia(fn ($page) => $page
                        ->where('websiteInfo.logoUrl', $uploaded['logo'])
                        ->where('websiteInfo.iconUrl', $uploaded['icon'])
                        ->where('websiteInfo.faviconUrl', $uploaded['favicon'])
                    );
            }

            $htmlRes = $this->get('/');
            $htmlRes->assertStatus(200);
            $htmlRes->assertSee('<link rel="icon" href="' . $uploaded['favicon'] . '"', false);

            // Public unauthenticated request must NOT receive admin brandSuiteMode
            $this->flushSession();
            $this->get('/image-editor?mode=brand-suite')
                ->assertStatus(200)
                ->assertInertia(fn ($page) => $page
                    ->component('ImageEditor')
                    ->where('brandSuiteMode', null)
                );

            // Authenticated admin receives pre-populated multi-artboard Brand Suite specs
            $this->withSession($session)
                ->get('/image-editor?mode=brand-suite')
                ->assertStatus(200)
                ->assertInertia(fn ($page) => $page
                    ->component('ImageEditor')
                    ->where('brandSuiteMode.logoUrl', $uploaded['logo'])
                    ->where('brandSuiteMode.iconUrl', $uploaded['icon'])
                    ->where('brandSuiteMode.faviconUrl', $uploaded['favicon'])
                    ->where('brandSuiteMode.artboards.0.id', 'brand-logo')
                    ->where('brandSuiteMode.artboards.0.format', 'svg')
                    ->where('brandSuiteMode.artboards.0.width', 480)
                    ->where('brandSuiteMode.artboards.0.height', 120)
                    ->where('brandSuiteMode.artboards.1.id', 'brand-icon')
                    ->where('brandSuiteMode.artboards.1.format', 'svg')
                    ->where('brandSuiteMode.artboards.1.width', 256)
                    ->where('brandSuiteMode.artboards.1.height', 256)
                    ->where('brandSuiteMode.artboards.2.id', 'brand-favicon')
                    ->where('brandSuiteMode.artboards.2.format', 'png')
                    ->where('brandSuiteMode.artboards.2.width', 96)
                    ->where('brandSuiteMode.artboards.2.height', 96)
                );

            // Dedicated single-asset Brand Suite mode ?mode=brand-suite&asset=icon
            $this->withSession($session)
                ->get('/image-editor?mode=brand-suite&asset=icon')
                ->assertStatus(200)
                ->assertInertia(fn ($page) => $page
                    ->component('ImageEditor')
                    ->where('brandSuiteMode.singleAssetRole', 'icon')
                    ->where('brandSuiteMode.artboards.0.id', 'brand-icon')
                    ->where('brandSuiteMode.artboards.0.width', 256)
                    ->where('brandSuiteMode.artboards.0.height', 256)
                    ->where('brandSuiteMode.artboards.0.format', 'svg')
                    ->missing('brandSuiteMode.artboards.1')
                );

            // When only iconUrl is updated (logoUrl & faviconUrl stay empty), websiteInfo keeps logoUrl/faviconUrl='' and favicon falls back to iconUrl
            $this->withSession($session)
                ->postJson('/api/admin/website-info', [
                    'logoUrl' => '',
                    'iconUrl' => $uploaded['icon'],
                    'faviconUrl' => '',
                ])
                ->assertStatus(200)
                ->assertJsonPath('data.logoUrl', '')
                ->assertJsonPath('data.iconUrl', $uploaded['icon'])
                ->assertJsonPath('data.faviconUrl', '');

            $fallbackRes = $this->get('/');
            $fallbackRes->assertStatus(200)
                ->assertInertia(fn ($page) => $page
                    ->where('websiteInfo.logoUrl', '')
                    ->where('websiteInfo.iconUrl', $uploaded['icon'])
                    ->where('websiteInfo.faviconUrl', '')
                );
            $fallbackRes->assertSee('<link rel="icon" href="' . $uploaded['icon'] . '"', false);
        } finally {
            foreach ($createdPaths as $abs) {
                if ($abs && is_file($abs)) {
                    @unlink($abs);
                }
            }
        }
    }

    public function test_admin_can_view_save_sanitize_and_reset_legal_pages(): void
    {
        $session = $this->adminSession();

        $this->withSession($session)
            ->get('/admin/dashboard/settings/legal-pages')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Settings/LegalPages')
                ->has('initialConfig.aboutUs.missionBodyHtml')
                ->has('initialConfig.contactUs.supportTitle')
                ->has('initialConfig.termsOfService.sections', 8)
                ->has('initialConfig.privacyPolicy.sections', 7)
                ->has('initialConfig.dmcaPolicy.sections', 4)
            );

        $customPayload = \App\Services\LegalPagesService::get();
        $customPayload['aboutUs']['missionTitle'] = 'Updated Mission';
        $customPayload['aboutUs']['missionBodyHtml'] = '<p><strong>Bold</strong> and <em>italic</em> <a href="/contact-us">Contact</a><script>alert(1)</script><a href="javascript:evil()">bad</a></p>';
        $customPayload['termsOfService']['sections'][0]['bodyHtml'] = '<ul><li><strong>Clause A</strong> <em>italic detail</em></li></ul>';

        $saveRes = $this->withSession($session)
            ->postJson('/api/admin/legal-pages', ['legalPages' => $customPayload]);

        $saveRes->assertStatus(200)->assertJsonPath('success', true);
        $savedBody = (string) $saveRes->json('legalPages.aboutUs.missionBodyHtml');
        $this->assertStringContainsString('<strong>Bold</strong>', $savedBody);
        $this->assertStringContainsString('<em>italic</em>', $savedBody);
        $this->assertStringContainsString('href="/contact-us"', $savedBody);
        $this->assertStringNotContainsString('<script>', $savedBody);
        $this->assertStringNotContainsString('javascript:', $savedBody);

        $this->get('/about-us')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Legal/AboutUs')
                ->where('legalContent.missionTitle', 'Updated Mission')
                ->where('legalContent.missionBodyHtml', fn ($val) => str_contains((string) $val, '<strong>Bold</strong>') && str_contains((string) $val, '<em>italic</em>'))
            );

        $this->get('/terms-of-service')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Legal/TermsOfService')
                ->where('legalContent.sections.0.bodyHtml', fn ($val) => str_contains((string) $val, '<ul><li><strong>Clause A</strong> <em>italic detail</em></li></ul>'))
            );

        $this->withSession($session)
            ->postJson('/api/admin/legal-pages/reset', ['pageKey' => 'aboutUs'])
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('legalPages.aboutUs.missionTitle', 'Our Mission');

        $this->withSession($session)
            ->postJson('/api/admin/legal-pages/reset', ['pageKey' => 'termsOfService'])
            ->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
