<?php

namespace App\Services;

use App\Models\ApiKey;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class GeminiService
{
    public static function getActiveApiKey(): ?ApiKey
    {
        return ApiKey::where('isActive', true)->first();
    }

    /**
     * Map UI / database model versions to active upstream Gemini endpoints
     * (matching F:\Antigravity Projects\png-finder V4).
     */
    public static function resolveModel(?string $modelName = null): string
    {
        $clean = trim((string) $modelName);

        return match ($clean) {
            'gemini-3.8-flash', '3.8' => 'gemini-3-flash-preview',
            'gemini-3.0-pro', '3.0' => 'gemini-3.1-pro-preview',
            '2.5', '' => 'gemini-2.5-flash',
            default => $clean,
        };
    }

    /**
     * Build an HTTP client with strict TLS verification, falling back to an
     * installed Windows CA bundle when local Windows PHP has no curl.cainfo.
     */
    private static function httpClient(): PendingRequest
    {
        $client = Http::timeout(60);

        if (
            PHP_OS_FAMILY === 'Windows'
            && !ini_get('curl.cainfo')
            && !ini_get('openssl.cafile')
        ) {
            $phpDir = dirname(PHP_BINARY);
            $candidates = [
                $phpDir . DIRECTORY_SEPARATOR . 'extras' . DIRECTORY_SEPARATOR . 'ssl' . DIRECTORY_SEPARATOR . 'cacert.pem',
                $phpDir . DIRECTORY_SEPARATOR . 'cacert.pem',
                'C:\\Program Files\\Git\\mingw64\\ssl\\certs\\ca-bundle.crt',
                'C:\\Program Files\\Git\\usr\\ssl\\certs\\ca-bundle.crt',
                'C:\\Program Files (x86)\\Git\\mingw64\\ssl\\certs\\ca-bundle.crt',
            ];

            foreach ($candidates as $caPath) {
                if (is_file($caPath)) {
                    return $client->withOptions(['verify' => $caPath]);
                }
            }
        }

        return $client;
    }

    private static function postGenerateContent(string $resolvedModel, string $apiKey, array $parts): array
    {
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$resolvedModel}:generateContent?key=" . urlencode($apiKey);

        $response = self::httpClient()->post($endpoint, [
            'contents' => [
                ['parts' => $parts],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
            ],
        ]);

        if (!$response->successful()) {
            $errMsg = $response->json('error.message') ?? $response->body();
            throw new \RuntimeException('Gemini API error: ' . $errMsg);
        }

        $text = $response->json('candidates.0.content.parts.0.text');
        if (!is_string($text) || trim($text) === '') {
            throw new \RuntimeException('Empty response from Gemini API.');
        }

        $cleaned = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($text)) ?? trim($text);
        $decoded = json_decode($cleaned, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid JSON returned by Gemini API.');
        }

        return $decoded;
    }

    public static function generateImageMetadata(string $imageBase64, ?string $modelName = null): array
    {
        $activeKey = self::getActiveApiKey();
        if (!$activeKey || !$activeKey->key) {
            throw new \RuntimeException('No active API key found. Please add and activate an API key in Settings > API Keys.');
        }

        $resolvedModel = trim((string) $modelName) !== ''
            ? self::resolveModel($modelName)
            : self::resolveModel($activeKey->modelVersion ?? '2.5');

        $mimeType = 'image/png';
        $base64Data = $imageBase64;

        if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s', $imageBase64, $matches)) {
            $mimeType = $matches[1];
            $base64Data = $matches[2];
        }

        $prompt = <<<PROMPT
You are an SEO expert for a premium PNG images website.
Analyze the provided image and generate the following metadata to maximize search visibility and user engagement.
The content is for a PNG image site, so focus on visual elements, transparency, and usage context.

Required Output Format (JSON):
{
  "title": "A catchy, descriptive, and SEO-friendly title",
  "altText": "Concise description for accessibility (similar to title)",
  "description": "Short, engaging description of the image content",
  "tags": ["tag1", "tag2", ... 20-30 tags]
}
PROMPT;

        return self::postGenerateContent($resolvedModel, $activeKey->key, [
            ['text' => $prompt],
            [
                'inlineData' => [
                    'mimeType' => $mimeType,
                    'data' => $base64Data,
                ],
            ],
        ]);
    }

    public static function generateTextJson(string $prompt, ?string $modelName = null): array
    {
        $activeKey = self::getActiveApiKey();
        if (!$activeKey || !$activeKey->key) {
            throw new \RuntimeException('No active API key found. Please add and activate an API key in Settings > API Keys.');
        }

        $resolvedModel = trim((string) $modelName) !== ''
            ? self::resolveModel($modelName)
            : self::resolveModel($activeKey->modelVersion ?? '2.5');

        return self::postGenerateContent($resolvedModel, $activeKey->key, [
            ['text' => $prompt],
        ]);
    }
}
