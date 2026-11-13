<?php

namespace App\Services;

use App\Models\Image;

class RelatedImagesService
{
    private const STOP_WORDS = [
        'png', 'transparent', 'background', 'image', 'images', 'picture', 'pictures',
        'photo', 'photos', 'file', 'files', 'free', 'download', 'hd', 'high', 'quality',
        'resolution', 'vector', 'clipart', 'art', 'graphic', 'graphics', 'design',
        'illustration', 'isolated', 'cutout', 'no', 'with', 'and', 'the', 'for', 'of',
        'in', 'on', 'to', 'a', 'an',
    ];

    private const LOW_SIGNAL_TERMS = [
        'logo', 'logos', 'icon', 'icons', 'symbol', 'symbols', 'emblem', 'emblems',
        'badge', 'badges', 'sign', 'signs', 'mark', 'brand', 'brands', 'official',
        'white', 'black', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
        'silver', 'gold', 'dark', 'light', 'flat', '3d', 'modern', 'vintage',
        'classic', 'new', 'old', 'circle', 'round', 'square',
    ];

    private static function normalizeText(string $value): string
    {
        $v = strtolower($value);
        $v = preg_replace('/[^a-z0-9\s-]/', ' ', $v);
        $v = preg_replace('/\s+/', ' ', $v);
        return trim($v);
    }

    private static function extractSignificantTokens(string $text): array
    {
        $norm = self::normalizeText($text);
        if ($norm === '') {
            return [];
        }
        $parts = preg_split('/[\s-]+/', $norm) ?: [];
        $tokens = [];
        foreach ($parts as $part) {
            if (strlen($part) < 2) {
                continue;
            }
            if (in_array($part, self::STOP_WORDS, true)) {
                continue;
            }
            if (preg_match('/^[a-z0-9]{7}$/', $part) && preg_match('/\d/', $part) && preg_match('/[a-z]/', $part)) {
                continue;
            }
            $tokens[$part] = true;
        }
        return array_keys($tokens);
    }

    private static function isGenericOnlyTag(string $normTag): bool
    {
        $words = array_filter(preg_split('/[\s-]+/', $normTag) ?: []);
        if (empty($words)) {
            return true;
        }
        foreach ($words as $w) {
            if (!in_array($w, self::STOP_WORDS, true) && !in_array($w, self::LOW_SIGNAL_TERMS, true)) {
                return false;
            }
        }
        return true;
    }

    public static function getRankedRelatedImages(string $imageId, int $limit = 10, int $offset = 0): array
    {
        $currentImage = Image::with(['categories.category'])->find($imageId);
        if (!$currentImage) {
            return ['images' => [], 'total' => 0, 'hasMore' => false];
        }

        $rawCurrentTags = is_array($currentImage->tags) ? $currentImage->tags : [];
        $currentTags = array_values(array_unique(array_filter(array_map(
            fn($t) => is_string($t) ? self::normalizeText($t) : '',
            $rawCurrentTags
        ))));

        $titleTokens = self::extractSignificantTokens($currentImage->name ?? '');
        $specificTitleTokens = array_values(array_filter(
            $titleTokens,
            fn($t) => !in_array($t, self::LOW_SIGNAL_TERMS, true)
        ));

        $tagTokensSet = [];
        foreach ($currentTags as $tag) {
            foreach (self::extractSignificantTokens($tag) as $tok) {
                $tagTokensSet[$tok] = true;
            }
        }
        $tagTokens = array_keys($tagTokensSet);

        $currentCategoryIds = [];
        $currentParentCategoryIds = [];
        foreach ($currentImage->categories as $ic) {
            $currentCategoryIds[$ic->categoryId] = true;
            if ($ic->category && $ic->category->parentId) {
                $currentParentCategoryIds[$ic->category->parentId] = true;
            }
        }

        if (empty($currentTags) && empty($specificTitleTokens) && empty($currentCategoryIds)) {
            return ['images' => [], 'total' => 0, 'hasMore' => false];
        }

        $allPublished = Image::with(['categories.category'])
            ->where('status', 'published')
            ->where('id', '!=', $imageId)
            ->orderByDesc('createdAt')
            ->get();

        $totalDocs = max(1, $allPublished->count() + 1);
        $tagDocFreq = [];
        $tokenDocFreq = [];

        foreach ($currentTags as $t) {
            $tagDocFreq[$t] = ($tagDocFreq[$t] ?? 0) + 1;
        }
        foreach ($tagTokens as $tok) {
            $tokenDocFreq[$tok] = ($tokenDocFreq[$tok] ?? 0) + 1;
        }

        $candidates = [];
        foreach ($allPublished as $img) {
            $rawTags = is_array($img->tags) ? $img->tags : [];
            $normTags = array_values(array_unique(array_filter(array_map(
                fn($t) => is_string($t) ? self::normalizeText($t) : '',
                $rawTags
            ))));

            $candTitleTokens = self::extractSignificantTokens($img->name ?? '');
            $candTokenSet = array_flip($candTitleTokens);
            foreach ($normTags as $t) {
                foreach (self::extractSignificantTokens($t) as $tok) {
                    $candTokenSet[$tok] = true;
                }
            }

            foreach ($normTags as $t) {
                $tagDocFreq[$t] = ($tagDocFreq[$t] ?? 0) + 1;
            }
            foreach (array_keys($candTokenSet) as $tok) {
                $tokenDocFreq[$tok] = ($tokenDocFreq[$tok] ?? 0) + 1;
            }

            $candidates[] = [
                'img' => $img,
                'normTagSet' => array_flip($normTags),
                'candTitleTokens' => $candTitleTokens,
                'candTokenSet' => $candTokenSet,
            ];
        }

        $getIdf = fn(int $df) => log(1 + $totalDocs / max(1, $df));
        $subjectPhrase = implode(' ', $specificTitleTokens);
        $scored = [];

        foreach ($candidates as $cand) {
            $score = 0.0;
            $meaningfulMatches = 0;

            foreach ($currentTags as $tag) {
                if (isset($cand['normTagSet'][$tag])) {
                    $idf = $getIdf($tagDocFreq[$tag] ?? 1);
                    if (self::isGenericOnlyTag($tag)) {
                        $score += 0.25 * $idf;
                    } else {
                        $wordCount = count(preg_split('/\s+/', $tag) ?: []);
                        $mult = $wordCount >= 2 ? 2.2 : 1.0;
                        $score += 6.0 * $idf * $mult;
                        $meaningfulMatches++;
                    }
                }
            }

            if (!empty($specificTitleTokens)) {
                $matchedInTitle = 0;
                $matchedAnywhere = 0;
                $candTitleSet = array_flip($cand['candTitleTokens']);

                foreach ($specificTitleTokens as $tok) {
                    $tokIdf = $getIdf($tokenDocFreq[$tok] ?? 1);
                    if (isset($candTitleSet[$tok])) {
                        $matchedInTitle++;
                        $matchedAnywhere++;
                        $score += 5.0 * $tokIdf;
                        $meaningfulMatches++;
                    } elseif (isset($cand['candTokenSet'][$tok])) {
                        $matchedAnywhere++;
                        $score += 3.0 * $tokIdf;
                        $meaningfulMatches++;
                    }
                }

                if (count($specificTitleTokens) >= 2 && $matchedAnywhere === count($specificTitleTokens)) {
                    $score += 25.0;
                }
                if (count($specificTitleTokens) >= 2 && $matchedInTitle === count($specificTitleTokens)) {
                    $score += 15.0;
                }

                if (strlen($subjectPhrase) >= 3) {
                    $candNormName = self::normalizeText($cand['img']->name ?? '');
                    if (str_contains($candNormName, $subjectPhrase) || isset($cand['normTagSet'][$subjectPhrase])) {
                        $score += 20.0;
                        $meaningfulMatches++;
                    }
                }
            }

            foreach ($tagTokens as $tok) {
                if (in_array($tok, self::LOW_SIGNAL_TERMS, true) || in_array($tok, self::STOP_WORDS, true)) {
                    continue;
                }
                if (in_array($tok, $specificTitleTokens, true)) {
                    continue;
                }
                if (isset($cand['candTokenSet'][$tok])) {
                    $score += 2.5 * $getIdf($tokenDocFreq[$tok] ?? 1);
                    $meaningfulMatches++;
                }
            }

            if (!empty($currentCategoryIds) || !empty($currentParentCategoryIds)) {
                $exactCat = false;
                $parentCat = false;
                foreach ($cand['img']->categories as $ic) {
                    if (isset($currentCategoryIds[$ic->categoryId])) {
                        $exactCat = true;
                    } elseif (
                        ($ic->category && $ic->category->parentId && isset($currentCategoryIds[$ic->category->parentId])) ||
                        ($ic->category && $ic->category->parentId && isset($currentParentCategoryIds[$ic->category->parentId])) ||
                        isset($currentParentCategoryIds[$ic->categoryId])
                    ) {
                        $parentCat = true;
                    }
                }
                if ($exactCat) {
                    $score += 8.0;
                    $meaningfulMatches++;
                } elseif ($parentCat) {
                    $score += 3.5;
                    $meaningfulMatches++;
                }
            }

            if ($meaningfulMatches > 0 && $score > 0) {
                $img = $cand['img'];
                $scored[] = [
                    'id' => $img->id,
                    'name' => $img->name,
                    'filename' => $img->filename,
                    'path' => $img->path,
                    'thumbPath' => $img->thumbPath,
                    'previewPath' => $img->previewPath,
                    'luminance' => $img->luminance,
                    'contrastBgDark' => $img->contrastBgDark,
                    'contrastBgLight' => $img->contrastBgLight,
                    'createdAt' => $img->createdAt?->toISOString(),
                    'score' => round($score, 2),
                ];
            }
        }

        usort($scored, function ($a, $b) {
            if ($b['score'] !== $a['score']) {
                return $b['score'] <=> $a['score'];
            }
            return strcmp((string) $b['createdAt'], (string) $a['createdAt']);
        });

        $total = count($scored);
        $paginated = array_slice($scored, $offset, $limit);

        return [
            'images' => $paginated,
            'total' => $total,
            'hasMore' => ($offset + count($paginated)) < $total,
        ];
    }
}

