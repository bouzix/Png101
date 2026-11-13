<?php

namespace App\Http\Controllers;

use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaptchaController extends Controller
{
    /**
     * Public endpoint to fetch active captcha config + a fresh built-in challenge if needed.
     */
    public function publicConfig(Request $request): JsonResponse
    {
        $context = (string) $request->query('context', 'download');
        if (!in_array($context, CaptchaService::CONTEXTS, true)) {
            $context = 'download';
        }

        return response()
            ->json(CaptchaService::getPublicConfig($context))
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    /**
     * Public endpoint to verify a captcha solution before triggering an image download.
     */
    public function verifyDownload(Request $request): JsonResponse
    {
        $imageId = trim((string) $request->input('imageId', ''));
        if ($imageId === '') {
            return response()->json(['success' => false, 'error' => 'Missing image identifier.'], 400);
        }

        $result = CaptchaService::verify($request, 'download');
        if (!$result['ok']) {
            $fresh = CaptchaService::getProviderForContext('download') === 'builtin_math'
                ? CaptchaService::generateBuiltInChallenge('download')
                : null;

            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Captcha verification failed.',
                'freshChallenge' => $fresh,
            ], 422)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        return response()->json([
            'success' => true,
            'downloadPass' => CaptchaService::issueDownloadPass($imageId),
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }
}

