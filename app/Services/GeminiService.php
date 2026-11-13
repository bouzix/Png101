<?php

namespace App\Services;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Http;

class GeminiService
{
    public static function getActiveApiKey(): ?ApiKey
    {
        return ApiKey::where('isActive', true)->first();
    }

    public static function resolveModel(string $modelName): string
    {
        return match ($modelName) {
            'gemini-3.8-flash' => 'gemini-2.5-flash',
            'gemini-3.0-pro' => 'gemini-2.5-pro',
            default => $modelName ?: 'gemini-2.5-flash',
        };
    }

    public static function generateImageMetadata(string $imageBase64, string $modelName = 'gemini-2.5-flash'): array
    {
        $activeKey = self::getActiveApiKey();
        if (!$activeKey || !$activeKey->key) {
            throw new \RuntimeException('No active API key found. Please add and activate an API key in Settings > API Keys.');
        }

        $resolvedModel = self::resolveModel($modelName);
        $mimeType = 'image/png';
        $base64Data = $imageBase64;

        if (preg_match('/^data:(image\/\w+);base64,(.+)$/s', $imageBase64, $matches)) {
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

        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$resolvedModel}:generateContent?key=" . urlencode($activeKey->key);

        $response = Http::timeout(60)->post($endpoint, [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                        [
                            'inlineData' => [
                                'mimeType' => $mimeType,
                                'data' => $base64Data,
                            ],
                        ],
                    ],
                ],
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
        if (!$text) {
            throw new \RuntimeException('Empty response from Gemini API.');
        }

        $decoded = json_decode($text, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid JSON returned by Gemini API.');
        }

        return $decoded;
    }

    public static function generateTextJson(string $prompt, ?string $modelName = null): array
    {
        $activeKey = self::getActiveApiKey();
        if (!$activeKey || !$activeKey->key) {
            throw new \RuntimeException('No active API key found. Please add and activate an API key in Settings > API Keys.');
        }

        $version = $activeKey->modelVersion ?? '2.5';
        $defaultModel = match ($version) {
            '3.8' => 'gemini-2.5-flash',
            '3.0' => 'gemini-2.5-pro',
            default => 'gemini-2.5-flash',
        };
        $resolvedModel = $modelName ? self::resolveModel($modelName) : $defaultModel;

        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$resolvedModel}:generateContent?key=" . urlencode($activeKey->key);

        $response = Http::timeout(60)->post($endpoint, [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                    ],
                ],
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
        $decoded = json_decode((string) $text, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid JSON returned by Gemini API.');
        }

        return $decoded;
    }
}

