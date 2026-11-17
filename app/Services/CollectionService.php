<?php

namespace App\Services;

use App\Models\Collection;
use App\Models\Image;

class CollectionService
{
    public static function slugify(string $text): string
    {
        $slug = strtolower(trim($text));
        $slug = preg_replace('/[\s\W-]+/', '-', $slug);
        return trim($slug, '-');
    }

    public static function getUniqueSlug(string $baseName, ?string $excludeId = null): string
    {
        $baseSlug = self::slugify($baseName) ?: 'collection';
        $slug = $baseSlug;
        $counter = 1;

        while (true) {
            $query = Collection::where('slug', $slug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
            if (!$query->exists()) {
                return $slug;
            }
            $counter++;
            $slug = "{$baseSlug}-{$counter}";
        }
    }

    public static function normalizeTags($tags): array
    {
        if (!is_array($tags)) {
            return [];
        }
        $set = [];
        foreach ($tags as $t) {
            if (is_string($t)) {
                $clean = strtolower(trim($t));
                if ($clean !== '') {
                    $set[$clean] = true;
                }
            }
        }
        return array_keys($set);
    }

    public static function matchesTagRules(array $imageTags, array $ruleTags, string $mode = 'any'): bool
    {
        if (empty($ruleTags)) {
            return false;
        }
        $imgSet = array_flip(array_map('strtolower', $imageTags));
        if ($mode === 'all') {
            foreach ($ruleTags as $rt) {
                if (!isset($imgSet[strtolower($rt)])) {
                    return false;
                }
            }
            return true;
        }
        foreach ($ruleTags as $rt) {
            if (isset($imgSet[strtolower($rt)])) {
                return true;
            }
        }
        return false;
    }

    public static function previewTagMatches(array $ruleTags, string $mode = 'any'): array
    {
        $cleanRules = self::normalizeTags($ruleTags);
        if (empty($cleanRules)) {
            return ['count' => 0, 'sampleImages' => []];
        }

        $allPublished = Image::where('status', 'published')
            ->select(['id', 'name', 'filename', 'path', 'tags'])
            ->get();

        $matching = [];
        foreach ($allPublished as $img) {
            $imgTags = self::normalizeTags($img->tags ?? []);
            if (self::matchesTagRules($imgTags, $cleanRules, $mode)) {
                $matching[] = [
                    'id' => $img->id,
                    'name' => $img->name,
                    'filename' => $img->filename,
                    'path' => $img->path,
                    'tags' => $img->tags,
                ];
            }
        }

        return [
            'count' => count($matching),
            'sampleImages' => array_slice($matching, 0, 8),
        ];
    }

    public static function listCollections(array $options = []): array
    {
        $query = Collection::with(['images' => function ($q) {
            $q->orderByDesc('isPinned')->orderBy('position')->orderByDesc('createdAt');
        }, 'images.image']);

        if (!empty($options['status'])) {
            $query->where('status', $options['status']);
        } elseif (empty($options['includeDrafts'])) {
            $query->where('status', 'published');
        }

        if (isset($options['isFeatured'])) {
            $query->where('isFeatured', (bool) $options['isFeatured']);
        }

        if (!empty($options['search'])) {
            $s = $options['search'];
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%")
                  ->orWhere('slug', 'like', "%{$s}%");
            });
        }

        $sortBy = $options['sortBy'] ?? 'order';
        if ($sortBy === 'trending') {
            $query->orderByDesc('isFeatured')->orderByDesc('viewsCount')->orderByDesc('downloadsCount')->orderByDesc('updatedAt')->orderByDesc('createdAt');
        } elseif ($sortBy === 'recent') {
            $query->orderByDesc('createdAt');
        } elseif ($sortBy === 'popular') {
            $query->orderByDesc('viewsCount')->orderByDesc('downloadsCount')->orderByDesc('createdAt');
        } else {
            $query->orderByDesc('isFeatured')->orderBy('order')->orderByDesc('createdAt');
        }

        if (!empty($options['limit']) && (int) $options['limit'] > 0) {
            $query->limit((int) $options['limit']);
        }

        $collections = $query->get();

        $publishedImages = Image::where('status', 'published')
            ->select(['id', 'filename', 'path', 'thumbPath', 'previewPath', 'name', 'tags', 'luminance', 'contrastBgDark', 'contrastBgLight', 'createdAt'])
            ->orderByDesc('createdAt')
            ->get();

        $result = [];
        foreach ($collections as $col) {
            $tagRules = self::normalizeTags($col->tagRules ?? []);
            $finalImages = [];

            if ($col->type === 'smart_dynamic') {
                $excludedIds = [];
                $pinnedImages = [];
                $manualImages = [];
                $explicitIds = [];

                foreach ($col->images as $ci) {
                    if ($ci->isExcluded) {
                        $excludedIds[$ci->imageId] = true;
                    } elseif ($ci->image && $ci->image->status === 'published') {
                        if ($ci->isPinned) {
                            $pinnedImages[] = $ci->image;
                        } else {
                            $manualImages[] = $ci->image;
                        }
                        $explicitIds[$ci->imageId] = true;
                    }
                }

                $dynamicMatches = [];
                if (!empty($tagRules)) {
                    foreach ($publishedImages as $img) {
                        if (isset($excludedIds[$img->id]) || isset($explicitIds[$img->id])) {
                            continue;
                        }
                        $imgTags = self::normalizeTags($img->tags ?? []);
                        if (self::matchesTagRules($imgTags, $tagRules, $col->ruleMatchMode ?: 'any')) {
                            $dynamicMatches[] = $img;
                        }
                    }
                }
                $finalImages = array_merge($pinnedImages, $manualImages, $dynamicMatches);
            } else {
                foreach ($col->images as $ci) {
                    if (!$ci->isExcluded && $ci->image && $ci->image->status === 'published') {
                        $finalImages[] = $ci->image;
                    }
                }
            }

            $coverPath = $col->coverImagePath;
            if (!$coverPath && !empty($finalImages)) {
                $coverPath = ImageProcessingService::ensureWebpThumbnail($finalImages[0]) ?: $finalImages[0]->path;
            }

            $previewImages = array_map(fn($img) => [
                'id' => $img->id,
                'filename' => $img->filename,
                'path' => $img->path,
                'thumbPath' => ImageProcessingService::ensureWebpThumbnail($img),
                'previewPath' => $img->previewPath,
                'name' => $img->name,
                'luminance' => $img->luminance,
                'contrastBgDark' => $img->contrastBgDark,
                'contrastBgLight' => $img->contrastBgLight,
            ], array_slice($finalImages, 0, 4));

            $result[] = [
                'id' => $col->id,
                'name' => $col->name,
                'slug' => $col->slug,
                'description' => $col->description,
                'coverImageId' => $col->coverImageId,
                'coverImagePath' => $coverPath,
                'customThumbnailPath' => $col->coverImagePath,
                'heroImagePath' => $col->heroImagePath,
                'heroBgColor' => $col->heroBgColor,
                'heroTextColor' => $col->heroTextColor,
                'cardBgImagePath' => $col->cardBgImagePath,
                'cardBgColor' => $col->cardBgColor,
                'cardTextColor' => $col->cardTextColor,
                'trendingCardImagePath' => $col->trendingCardImagePath,
                'type' => $col->type,
                'tagRules' => $tagRules,
                'ruleMatchMode' => $col->ruleMatchMode ?: 'any',
                'isFeatured' => (bool) $col->isFeatured,
                'status' => $col->status,
                'order' => (int) $col->order,
                'viewsCount' => (int) $col->viewsCount,
                'downloadsCount' => (int) $col->downloadsCount,
                'imageCount' => count($finalImages),
                'previewImages' => $previewImages,
                'createdAt' => $col->createdAt?->toISOString(),
                'updatedAt' => $col->updatedAt?->toISOString(),
            ];
        }

        return $result;
    }

    public static function getCollectionWithImages(array $identifier, array $options = []): ?array
    {
        $query = Collection::with(['images' => function ($q) {
            $q->orderByDesc('isPinned')->orderBy('position')->orderByDesc('createdAt');
        }, 'images.image']);

        if (!empty($identifier['slug'])) {
            $query->where('slug', $identifier['slug']);
        }
        if (!empty($identifier['id'])) {
            $query->where('id', $identifier['id']);
        }
        if (empty($options['includeDrafts'])) {
            $query->where('status', 'published');
        }

        $collection = $query->first();
        if (!$collection) {
            return null;
        }

        $page = max(1, (int) ($options['page'] ?? 1));
        $limit = max(1, (int) ($options['limit'] ?? 30));
        $skip = ($page - 1) * $limit;
        $tagRules = self::normalizeTags($collection->tagRules ?? []);
        $resolved = [];

        if ($collection->type === 'smart_dynamic') {
            $excludedIds = [];
            $pinnedImages = [];
            $manualImages = [];
            $explicitIds = [];

            foreach ($collection->images as $ci) {
                if ($ci->isExcluded) {
                    $excludedIds[$ci->imageId] = true;
                } elseif ($ci->image && $ci->image->status === 'published') {
                    $arr = $ci->image->toArray();
                    $arr['isPinned'] = (bool) $ci->isPinned;
                    $arr['isManual'] = true;
                    if ($ci->isPinned) {
                        $pinnedImages[] = $arr;
                    } else {
                        $manualImages[] = $arr;
                    }
                    $explicitIds[$ci->imageId] = true;
                }
            }

            $dynamicMatches = [];
            if (!empty($tagRules)) {
                $allPublished = Image::where('status', 'published')->orderByDesc('createdAt')->get();
                foreach ($allPublished as $img) {
                    if (isset($excludedIds[$img->id]) || isset($explicitIds[$img->id])) {
                        continue;
                    }
                    $imgTags = self::normalizeTags($img->tags ?? []);
                    if (self::matchesTagRules($imgTags, $tagRules, $collection->ruleMatchMode ?: 'any')) {
                        $dynamicMatches[] = $img->toArray();
                    }
                }
            }
            $resolved = array_merge($pinnedImages, $manualImages, $dynamicMatches);
        } else {
            foreach ($collection->images as $ci) {
                if (!$ci->isExcluded && $ci->image && $ci->image->status === 'published') {
                    $arr = $ci->image->toArray();
                    $arr['isPinned'] = (bool) $ci->isPinned;
                    $arr['position'] = (int) $ci->position;
                    $resolved[] = $arr;
                }
            }
        }

        $total = count($resolved);
        $paginated = array_slice($resolved, $skip, $limit);
        if (!empty($paginated)) {
            $pageIds = array_values(array_filter(array_column($paginated, 'id')));
            $pageModels = !empty($pageIds)
                ? Image::whereIn('id', $pageIds)->get()->keyBy('id')
                : collect();
            foreach ($paginated as &$itemRow) {
                $imgModel = $pageModels->get($itemRow['id'] ?? null);
                if ($imgModel) {
                    $itemRow['thumbPath'] = ImageProcessingService::ensureWebpThumbnail($imgModel);
                }
            }
            unset($itemRow);
        }
        $coverPath = $collection->coverImagePath ?: ($paginated[0]['thumbPath'] ?? $resolved[0]['thumbPath'] ?? $resolved[0]['path'] ?? null);

        return [
            'collection' => [
                'id' => $collection->id,
                'name' => $collection->name,
                'slug' => $collection->slug,
                'description' => $collection->description,
                'coverImageId' => $collection->coverImageId,
                'coverImagePath' => $coverPath,
                'customThumbnailPath' => $collection->coverImagePath,
                'heroImagePath' => $collection->heroImagePath,
                'heroBgColor' => $collection->heroBgColor,
                'heroTextColor' => $collection->heroTextColor,
                'cardBgImagePath' => $collection->cardBgImagePath,
                'cardBgColor' => $collection->cardBgColor,
                'cardTextColor' => $collection->cardTextColor,
                'trendingCardImagePath' => $collection->trendingCardImagePath,
                'type' => $collection->type,
                'tagRules' => $tagRules,
                'ruleMatchMode' => $collection->ruleMatchMode ?: 'any',
                'isFeatured' => (bool) $collection->isFeatured,
                'status' => $collection->status,
                'order' => (int) $collection->order,
                'viewsCount' => (int) $collection->viewsCount,
                'downloadsCount' => (int) $collection->downloadsCount,
                'createdAt' => $collection->createdAt?->toISOString(),
                'updatedAt' => $collection->updatedAt?->toISOString(),
            ],
            'images' => $paginated,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'hasMore' => ($skip + count($paginated)) < $total,
        ];
    }

    public static function getCollectionsForImage(string $imageId, array $imageTags = []): array
    {
        $directIds = Collection::where('status', 'published')
            ->whereHas('images', function ($q) use ($imageId) {
                $q->where('imageId', $imageId)->where('isExcluded', false);
            })
            ->pluck('id')
            ->all();

        $matchedIds = array_fill_keys($directIds, true);

        $normImgTags = self::normalizeTags($imageTags);
        if (!empty($normImgTags)) {
            $smart = Collection::with(['images' => function ($q) use ($imageId) {
                $q->where('imageId', $imageId);
            }])
                ->where('status', 'published')
                ->where('type', 'smart_dynamic')
                ->get();

            foreach ($smart as $sc) {
                if (isset($matchedIds[$sc->id])) {
                    continue;
                }
                $excluded = $sc->images->contains(fn($ci) => (bool) $ci->isExcluded);
                if ($excluded) {
                    continue;
                }
                $rules = self::normalizeTags($sc->tagRules ?? []);
                if (self::matchesTagRules($normImgTags, $rules, $sc->ruleMatchMode ?: 'any')) {
                    $matchedIds[$sc->id] = true;
                }
            }
        }

        if (empty($matchedIds)) {
            return [];
        }

        $allPublished = self::listCollections(['status' => 'published', 'includeDrafts' => false]);
        return array_values(array_filter(
            $allPublished,
            fn(array $col) => isset($matchedIds[$col['id']])
        ));
    }
}

