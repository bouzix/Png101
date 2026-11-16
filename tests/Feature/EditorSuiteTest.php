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
}
