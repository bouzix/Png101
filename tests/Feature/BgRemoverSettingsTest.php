<?php

namespace Tests\Feature;

use App\Http\Middleware\HostingInstallerRedirectMiddleware;
use App\Services\ConverterToolsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BgRemoverSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(HostingInstallerRedirectMiddleware::class);
    }

    public function test_normalization_preserves_at_least_one_engine_and_valid_default(): void
    {
        $allOff = ConverterToolsService::normalizeBgRemoverSettings([
            'engines' => [
                'solid' => false,
                'browser_ai' => false,
                'server_ai' => false,
            ],
            'defaultEngine' => 'browser_ai',
            'maxUploadMb' => 999,
        ]);

        $this->assertTrue($allOff['engines']['solid']);
        $this->assertSame('solid', $allOff['defaultEngine']);
        $this->assertSame(50, $allOff['maxUploadMb']);

        $reassignedDefault = ConverterToolsService::normalizeBgRemoverSettings([
            'engines' => [
                'solid' => true,
                'browser_ai' => false,
                'server_ai' => true,
            ],
            'defaultEngine' => 'browser_ai',
        ]);

        $this->assertSame('server_ai', $reassignedDefault['defaultEngine']);

        $defaults = ConverterToolsService::bgRemoverDefaults();
        $this->assertFalse($defaults['engines']['server_ai']);

        $withRemoteVps = ConverterToolsService::normalizeBgRemoverSettings([
            'serverAiMode' => 'http',
            'serverAiServiceUrl' => 'https://ai.example.com/remove-background',
            'serverAiApiKey' => '  png101_ai_secret_token  ',
            'serverAiTimeout' => 9999,
            'serverAiVerifySsl' => false,
        ]);

        $this->assertSame('http', $withRemoteVps['serverAiMode']);
        $this->assertSame('https://ai.example.com/remove-background', $withRemoteVps['serverAiServiceUrl']);
        $this->assertSame('png101_ai_secret_token', $withRemoteVps['serverAiApiKey']);
        $this->assertSame(600, $withRemoteVps['serverAiTimeout']);
        $this->assertFalse($withRemoteVps['serverAiVerifySsl']);
        $this->assertSame([
            'X-API-Key' => 'png101_ai_secret_token',
            'Authorization' => 'Bearer png101_ai_secret_token',
        ], ConverterToolsService::buildBgRemoverServiceHeaders($withRemoteVps));
        $this->assertSame([], ConverterToolsService::buildBgRemoverServiceHeaders(['serverAiApiKey' => '']));
    }

    public function test_public_tool_payload_exposes_only_safe_bg_remover_config(): void
    {
        ConverterToolsService::saveSettings([
            'globalEnabled' => true,
            'pairStates' => ['remove-background' => true],
            'bgRemover' => [
                'engines' => ['solid' => true, 'browser_ai' => true, 'server_ai' => false],
                'defaultEngine' => 'browser_ai',
                'browserAiModel' => 'isnet_quint8',
                'serverAiPythonPath' => '/secret/path/python',
                'serverAiServiceUrl' => 'https://ai.example.com/remove-background',
                'serverAiApiKey' => 'png101_ai_super_secret_123',
                'serverAiTimeout' => 240,
                'serverAiVerifySsl' => false,
            ],
        ]);

        $tool = ConverterToolsService::getToolForPublic('remove-background');
        $this->assertIsArray($tool);
        $this->assertArrayHasKey('bgRemoverConfig', $tool);

        $cfg = $tool['bgRemoverConfig'];
        $this->assertSame('isnet_quint8', $cfg['browserAiModel']);
        $this->assertTrue($cfg['engines']['solid']);
        $this->assertTrue($cfg['engines']['browser_ai']);
        $this->assertFalse($cfg['engines']['server_ai']);
        $this->assertArrayNotHasKey('serverAiPythonPath', $cfg);
        $this->assertArrayNotHasKey('serverAiServiceUrl', $cfg);
        $this->assertArrayNotHasKey('serverAiApiKey', $cfg);
        $this->assertArrayNotHasKey('serverAiTimeout', $cfg);
        $this->assertArrayNotHasKey('serverAiVerifySsl', $cfg);
    }

    public function test_admin_can_toggle_and_save_bg_remover_engines(): void
    {
        $this->postJson('/api/admin/tools', [
            'bgRemover' => ['defaultEngine' => 'solid'],
        ])->assertStatus(401);

        $res = $this->withSession(['auth_token' => 'authenticated'])
            ->postJson('/api/admin/tools', [
                'bgRemover' => [
                    'engines' => [
                        'solid' => true,
                        'browser_ai' => false,
                        'server_ai' => true,
                    ],
                    'defaultEngine' => 'server_ai',
                    'serverAiModel' => 'u2netp',
                    'maxUploadMb' => 12,
                ],
            ]);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('settings.bgRemover.engines.solid', true)
            ->assertJsonPath('settings.bgRemover.engines.browser_ai', false)
            ->assertJsonPath('settings.bgRemover.engines.server_ai', true)
            ->assertJsonPath('settings.bgRemover.defaultEngine', 'server_ai')
            ->assertJsonPath('settings.bgRemover.serverAiModel', 'u2netp')
            ->assertJsonPath('settings.bgRemover.maxUploadMb', 12);
    }

    public function test_admin_test_server_ai_diagnostics_succeeds_with_local_venv(): void
    {
        $res = $this->withSession(['auth_token' => 'authenticated'])
            ->postJson('/api/admin/tools/bg-remover/test-server', [
                'bgRemover' => [
                    'serverAiMode' => 'cli',
                ],
            ]);

        $res->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('mode', 'cli')
            ->assertJsonStructure([
                'ok',
                'mode',
                'python',
                'details' => [
                    'ok',
                    'python',
                    'modelsDir',
                    'cachedModels',
                    'packages' => ['rembg', 'onnxruntime', 'pillow'],
                ],
            ]);
    }

    public function test_public_remove_background_endpoint_respects_server_ai_toggle_and_processes_png(): void
    {
        // Create an in-memory 128x128 PNG with colored background and center foreground ellipse
        $gd = imagecreatetruecolor(128, 128);
        $bg = imagecolorallocate($gd, 35, 110, 210);
        $fg = imagecolorallocate($gd, 235, 65, 55);
        imagefill($gd, 0, 0, $bg);
        imagefilledellipse($gd, 64, 64, 72, 72, $fg);

        $tmpImg = tempnam(sys_get_temp_dir(), 'bgtest_') . '.png';
        imagepng($gd, $tmpImg);
        imagedestroy($gd);

        try {
            $upload = new UploadedFile($tmpImg, 'sample.png', 'image/png', null, true);

            // 1) When Server AI is toggled OFF in Admin, endpoint must deny access (403)
            ConverterToolsService::saveSettings([
                'globalEnabled' => true,
                'pairStates' => ['remove-background' => true],
                'bgRemover' => [
                    'engines' => ['solid' => true, 'browser_ai' => true, 'server_ai' => false],
                ],
            ]);

            $this->post('/api/tools/remove-background', [
                'image' => $upload,
            ])->assertStatus(403);

            // 2) When Server AI is toggled ON with u2netp, endpoint returns transparent PNG
            ConverterToolsService::saveSettings([
                'globalEnabled' => true,
                'pairStates' => ['remove-background' => true],
                'bgRemover' => [
                    'engines' => ['solid' => true, 'browser_ai' => true, 'server_ai' => true],
                    'defaultEngine' => 'server_ai',
                    'serverAiMode' => 'cli',
                    'serverAiModel' => 'u2netp',
                ],
            ]);

            $upload2 = new UploadedFile($tmpImg, 'sample.png', 'image/png', null, true);
            $res = $this->post('/api/tools/remove-background', [
                'image' => $upload2,
            ]);

            $res->assertOk();
            $this->assertSame('image/png', $res->headers->get('Content-Type'));

            $outImg = @imagecreatefromstring($res->getContent());
            $this->assertNotFalse($outImg);
            $this->assertSame(128, imagesx($outImg));
            $this->assertSame(128, imagesy($outImg));

            // GD alpha: 127 = fully transparent, 0 = fully opaque
            $cornerAlpha = (imagecolorat($outImg, 4, 4) & 0x7F000000) >> 24;
            $centerAlpha = (imagecolorat($outImg, 64, 64) & 0x7F000000) >> 24;
            imagedestroy($outImg);

            $this->assertGreaterThan(100, $cornerAlpha);
            $this->assertLessThan(20, $centerAlpha);
        } finally {
            @unlink($tmpImg);
        }
    }
}
