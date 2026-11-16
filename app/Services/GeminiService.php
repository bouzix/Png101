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
        return \App\Support\HostingEnvironment::httpClient(60);
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

    public static function generateImageMetadata(string $imageBase64, ?string $modelName = null, array $hints = []): array
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

        $cleanHints = array_values(array_filter(array_map(
            fn ($h) => is_string($h) ? trim($h) : '',
            $hints
        ), fn ($h) => $h !== ''));

        $hintsSection = '';
        if (!empty($cleanHints)) {
            $hintsList = implode(', ', array_map(fn ($h) => '"' . addslashes($h) . '"', $cleanHints));
            $hintsSection = "\n\nIMPORTANT USER HINTS / CONTEXT:\n"
                . "The user has provided the following factual hints identifying this specific image: [{$hintsList}].\n"
                . "You MUST use these hints as the primary context to accurately identify the subject, brand, character, logo, or object in the image, and reflect this identity in the title, altText, description, and tags.";
        }

        $prompt = <<<PROMPT
You are an SEO expert for a premium PNG images website.
Analyze the provided image and generate the following metadata to maximize search visibility and user engagement.
The content is for a PNG image site, so focus on visual elements, transparency, and usage context.{$hintsSection}

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
