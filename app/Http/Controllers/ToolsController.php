<?php

namespace App\Http\Controllers;

use App\Services\ConverterToolsService;
use App\Services\ErrorPagesService;
use App\Services\WebsiteInfoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ToolsController extends Controller
{
    private function notFoundResponse()
    {
        $config = ErrorPagesService::get();
        return Inertia::render('Errors/NotFound', [
            'config' => $config['p404'],
        ])->toResponse(request())->setStatusCode(404);
    }

    private function extractPreloadAsset(Request $request): ?array
    {
        $uiFlags = ConverterToolsService::getPublicUiFlags();
        if ($uiFlags['enableCatalogHandoff'] && is_string($request->query('asset')) && str_starts_with($request->query('asset'), '/uploads/')) {
            return [
                'path' => $request->query('asset'),
                'name' => (string) $request->query('name', 'png101-asset'),
            ];
        }

        return null;
    }

    private function formatHubTools(array $tools): array
    {
        return array_values(array_map(fn ($tool) => [
            'slug' => $tool['slug'],
            'url' => $tool['url'],
            'pairKey' => $tool['pairKey'],
            'reverseSlug' => $tool['reverseSlug'],
            'category' => $tool['category'],
            'mode' => $tool['mode'],
            'fromFormat' => $tool['fromFormat'],
            'toFormat' => $tool['toFormat'],
            'shortTitle' => $tool['shortTitle'] ?? $tool['title'],
            'title' => $tool['title'],
            'shortDesc' => $tool['shortDesc'],
        ], $tools));
    }

    private function renderToolResponse(Request $request, array $tool)
    {
        $info = WebsiteInfoService::get();

        return Inertia::render('Tools/ConvertTool', [
            'seo' => [
                'title' => "{$tool['seoTitle']} | {$info['websiteName']}",
                'description' => $tool['seoDescription'],
            ],
            'tool' => $tool,
            'preloadAsset' => $this->extractPreloadAsset($request),
        ]);
    }

    private function appendQueryString(string $path, Request $request): string
    {
        $qs = $request->getQueryString();
        return $qs ? "{$path}?{$qs}" : $path;
    }

    public function index(Request $request)
    {
        $settings = ConverterToolsService::getSettings();
        $enabledTools = ConverterToolsService::getEnabledTools();

        if (empty($settings['globalEnabled']) || empty($enabledTools)) {
            return $this->notFoundResponse();
        }

        $info = WebsiteInfoService::get();

        return Inertia::render('Tools/ConvertHub', [
            'seo' => [
                'title' => "Free Online Image Tools & Converters - {$info['websiteName']}",
                'description' => 'All-in-one browser image tools: convert PNG, WebP, JPG, AVIF, SVG, and ICO, compress photos, resize for social media, and remove solid backgrounds.',
            ],
            'hubMode' => 'all',
            'tools' => $this->formatHubTools($enabledTools),
            'preloadAsset' => $this->extractPreloadAsset($request),
        ]);
    }

    private function renderCategoryHub(Request $request, string $category, string $hubMode, string $seoTitle, string $seoDescription)
    {
        $settings = ConverterToolsService::getSettings();
        $enabledTools = array_filter(
            ConverterToolsService::getEnabledTools(),
            fn ($tool) => ($tool['category'] ?? '') === $category
        );

        if (empty($settings['globalEnabled']) || empty($enabledTools)) {
            return $this->notFoundResponse();
        }

        $info = WebsiteInfoService::get();

        return Inertia::render('Tools/ConvertHub', [
            'seo' => [
                'title' => "{$seoTitle} - {$info['websiteName']}",
                'description' => $seoDescription,
            ],
            'hubMode' => $hubMode,
            'tools' => $this->formatHubTools($enabledTools),
            'preloadAsset' => $this->extractPreloadAsset($request),
        ]);
    }

    public function convertIndex(Request $request)
    {
        return $this->renderCategoryHub(
            $request,
            'converters',
            'convert',
            'Free Online Image Format Converters',
            'Convert PNG, WebP, JPG, AVIF, SVG, and ICO images directly inside your browser with zero server uploads.'
        );
    }

    public function utilitiesIndex(Request $request)
    {
        return $this->renderCategoryHub(
            $request,
            'utilities',
            'utilities',
            'Free Online Image Utilities — Compress, Resize, Crop & Favicon Maker',
            'Compress, resize, crop, round corners, remove solid backgrounds, add watermarks, split grids, and generate ICO favicons or app icons in your browser.'
        );
    }

    public function devtoolsIndex(Request $request)
    {
        return $this->renderCategoryHub(
            $request,
            'developer',
            'devtools',
            'Developer Image & SVG Tools — Base64, SVG JSX, Palette & EXIF',
            'Encode images to Base64 or Data URIs, optimize SVGs for React JSX, extract CSS/Tailwind color palettes, and strip EXIF metadata locally in your browser.'
        );
    }

    public function showConvertTool(Request $request, string $slug)
    {
        $mappedSlug = $slug === 'remove-solid-background' ? 'remove-background' : $slug;
        $tool = ConverterToolsService::getToolForPublic($mappedSlug);
        if (!$tool) {
            return $this->notFoundResponse();
        }

        if (($tool['category'] ?? '') !== 'converters') {
            return redirect()->to($this->appendQueryString($tool['url'], $request), 301);
        }

        return $this->renderToolResponse($request, $tool);
    }

    public function showTool(Request $request, string $slug)
    {
        $mappedSlug = $slug === 'remove-solid-background' ? 'remove-background' : $slug;
        $tool = ConverterToolsService::getToolForPublic($mappedSlug);
        if (!$tool) {
            return $this->notFoundResponse();
        }

        if ($slug !== $mappedSlug || ($tool['category'] ?? '') === 'converters') {
            return redirect()->to($this->appendQueryString($tool['url'], $request), 301);
        }

        return $this->renderToolResponse($request, $tool);
    }

    public function redirectLegacyConvert(Request $request, ?string $slug = null)
    {
        if ($slug === null || $slug === '') {
            $settings = ConverterToolsService::getSettings();
            if (empty($settings['globalEnabled'])) {
                return $this->notFoundResponse();
            }
            return redirect()->to($this->appendQueryString('/tools/convert', $request), 301);
        }

        $mappedSlug = $slug === 'remove-solid-background' ? 'remove-background' : $slug;
        $tool = ConverterToolsService::getToolForPublic($mappedSlug);
        if (!$tool) {
            return $this->notFoundResponse();
        }

        return redirect()->to($this->appendQueryString($tool['url'], $request), 301);
    }

    public function track(Request $request): JsonResponse
    {
        $slug = trim((string) $request->input('slug', ''));
        if ($slug === '' || !ConverterToolsService::isToolEnabled($slug)) {
            return response()->json(['ok' => false], 404);
        }

        $eventType = $request->input('eventType') === 'convert' ? 'convert' : 'view';
        $filesCount = (int) $request->input('filesCount', 1);
        $inputBytes = (int) $request->input('inputBytes', 0);
        $outputBytes = (int) $request->input('outputBytes', 0);

        $ua = strtolower((string) $request->userAgent());
        $deviceType = str_contains($ua, 'ipad') || str_contains($ua, 'tablet')
            ? 'tablet'
            : (str_contains($ua, 'mobile') || str_contains($ua, 'android') || str_contains($ua, 'iphone') ? 'mobile' : 'desktop');

        ConverterToolsService::trackUsage($slug, $eventType, $filesCount, $inputBytes, $outputBytes, $deviceType);

        return response()->json(['ok' => true]);
    }

    public function removeBackground(Request $request)
    {
        if (!ConverterToolsService::isToolEnabled('remove-background')) {
            return response()->json(['error' => 'Background remover tool is disabled.'], 404);
        }

        $settings = ConverterToolsService::getSettings();
        $bg = $settings['bgRemover'] ?? ConverterToolsService::bgRemoverDefaults();

        if (empty($bg['engines']['server_ai'])) {
            return response()->json(['error' => 'Server AI background removal is currently disabled by administrator.'], 403);
        }

        $maxKb = max(1024, ((int) ($bg['maxUploadMb'] ?? 15)) * 1024);
        $validated = $request->validate([
            'image' => ['required', 'file', 'mimes:png,jpg,jpeg,webp,bmp,gif', "max:{$maxKb}"],
        ]);

        /** @var \Illuminate\Http\UploadedFile $uploaded */
        $uploaded = $validated['image'];
        $model = (string) ($bg['serverAiModel'] ?? 'isnet-general-use');
        $alphaMatting = !empty($bg['serverAiAlphaMatting']);
        $timeout = max(15, min(600, (int) ($bg['serverAiTimeout'] ?? 180)));

        @set_time_limit($timeout + 15);

        if (($bg['serverAiMode'] ?? 'cli') === 'http') {
            $serviceUrl = (string) ($bg['serverAiServiceUrl'] ?? 'http://127.0.0.1:8001/remove-background');
            $verifySsl = (bool) ($bg['serverAiVerifySsl'] ?? true);
            $stream = fopen($uploaded->getRealPath(), 'rb');
            try {
                $response = Http::timeout($timeout)
                    ->withHeaders(ConverterToolsService::buildBgRemoverServiceHeaders($bg))
                    ->withOptions(['verify' => $verifySsl])
                    ->attach('image', $stream, $uploaded->getClientOriginalName() ?: 'upload.png')
                    ->post($serviceUrl, [
                        'model' => $model,
                        'alpha_matting' => $alphaMatting ? '1' : '0',
                    ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'error' => 'Python AI service unreachable: ' . $e->getMessage(),
                ], 502);
            } finally {
                if (is_resource($stream)) {
                    @fclose($stream);
                }
            }

            if (in_array($response->status(), [401, 403], true)) {
                return response()->json([
                    'error' => 'Server AI service authentication failed (invalid or missing API key).',
                ], 502);
            }

            if (!$response->successful() || !str_starts_with((string) $response->header('Content-Type'), 'image/')) {
                $errJson = $response->json();
                return response()->json([
                    'error' => is_array($errJson) && !empty($errJson['error'])
                        ? $errJson['error']
                        : 'Server AI service failed to process image.',
                ], 502);
            }

            return response($response->body(), 200, [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'no-store',
                'X-Bg-Engine' => 'server-ai-http',
            ]);
        }

        // Local Python CLI execution
        $pythonExe = ConverterToolsService::resolvePythonExecutable($bg['serverAiPythonPath'] ?? '');
        $scriptPath = base_path('python-ai' . DIRECTORY_SEPARATOR . 'remove_bg.py');
        if (!is_file($scriptPath)) {
            return response()->json(['error' => 'Server AI script is missing on the server.'], 500);
        }

        $tmpDir = storage_path('app' . DIRECTORY_SEPARATOR . 'tmp-bg');
        $modelsDir = storage_path('app' . DIRECTORY_SEPARATOR . 'rembg-models');
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0775, true);
        }
        if (!is_dir($modelsDir)) {
            @mkdir($modelsDir, 0775, true);
        }

        $ext = strtolower($uploaded->getClientOriginalExtension() ?: 'png');
        if (!preg_match('/^[a-z0-9]{2,5}$/', $ext)) {
            $ext = 'png';
        }
        $token = (string) Str::uuid();
        $inPath = $tmpDir . DIRECTORY_SEPARATOR . $token . '.' . $ext;
        $outPath = $tmpDir . DIRECTORY_SEPARATOR . $token . '-out.png';

        @copy($uploaded->getRealPath(), $inPath);

        try {
            $args = [
                $pythonExe,
                $scriptPath,
                '--input',
                $inPath,
                '--output',
                $outPath,
                '--model',
                $model,
                '--models-dir',
                $modelsDir,
            ];
            if ($alphaMatting) {
                $args[] = '--alpha-matting';
            }

            $result = Process::env(ConverterToolsService::pythonProcessEnv())
                ->timeout($timeout)
                ->run($args);
            if (!$result->successful() || !is_file($outPath)) {
                $errOut = trim($result->errorOutput());
                $errDecoded = json_decode($errOut, true);
                $message = is_array($errDecoded) && !empty($errDecoded['error'])
                    ? $errDecoded['error']
                    : ($errOut !== '' ? $errOut : 'Python background removal failed.');

                return response()->json([
                    'error' => $message,
                ], 500);
            }

            $pngBytes = @file_get_contents($outPath);
            if ($pngBytes === false || $pngBytes === '') {
                return response()->json(['error' => 'Server AI produced an empty output image.'], 500);
            }

            return response($pngBytes, 200, [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'no-store',
                'X-Bg-Engine' => 'server-ai-cli',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Server AI execution error: ' . $e->getMessage(),
            ], 500);
        } finally {
            @unlink($inPath);
            @unlink($outPath);
        }
    }
}
