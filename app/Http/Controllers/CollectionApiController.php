<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\CollectionImage;
use App\Models\Image;
use App\Services\CollectionService;
use App\Services\GeminiService;
use App\Services\SeoGeneratorService;
use App\Services\TeamService;
use Illuminate\Http\Request;

class CollectionApiController extends Controller
{
    public function index(Request $request)
    {
        $sort = $request->query('sort');
        $limit = $request->query('limit') ? (int) $request->query('limit') : null;
        $q = $request->query('q');
        $includeDrafts = $request->query('includeDrafts') === '1' || $request->query('admin') === '1';

        if ($includeDrafts) {
            $session = TeamService::getCurrentSession($request);
            if (!TeamService::hasPermission($session, 'manage_collections')) {
                $includeDrafts = false;
            }
        }

        return response()->json(CollectionService::listCollections([
            'sortBy' => $sort ?: 'order',
            'limit' => $limit,
            'search' => $q,
            'includeDrafts' => $includeDrafts,
        ]));
    }

    public function store(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'manage_collections')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $name = trim((string) $request->input('name', ''));
        if ($name === '') {
            return response()->json(['error' => 'Collection name is required'], 400);
        }

        $slug = $request->input('slug')
            ? CollectionService::getUniqueSlug((string) $request->input('slug'))
            : CollectionService::getUniqueSlug($name);

        $type = $request->input('type', 'manual');
        $tagRules = CollectionService::normalizeTags($request->input('tagRules', []));
        $ruleMatchMode = $request->input('ruleMatchMode', 'any');

        $collection = Collection::create([
            'name' => $name,
            'slug' => $slug,
            'description' => $request->input('description'),
            'coverImageId' => $request->input('coverImageId'),
            'coverImagePath' => $request->input('coverImagePath'),
            'type' => $type,
            'tagRules' => $tagRules,
            'ruleMatchMode' => $ruleMatchMode,
            'isFeatured' => (bool) $request->input('isFeatured', false),
            'status' => $request->input('status', 'published'),
            'order' => (int) $request->input('order', 0),
        ]);

        $imageIds = $request->input('imageIds', []);
        if ($type === 'smart_snapshot' && !empty($tagRules) && empty($imageIds)) {
            $allPublished = Image::where('status', 'published')->get(['id', 'tags']);
            foreach ($allPublished as $img) {
                $imgTags = CollectionService::normalizeTags($img->tags ?? []);
                if (CollectionService::matchesTagRules($imgTags, $tagRules, $ruleMatchMode)) {
                    $imageIds[] = $img->id;
                }
            }
        }

        if (is_array($imageIds)) {
            foreach (array_values(array_unique($imageIds)) as $pos => $imgId) {
                CollectionImage::create([
                    'collectionId' => $collection->id,
                    'imageId' => $imgId,
                    'position' => $pos,
                ]);
            }
        }

        SeoGeneratorService::refreshAuto('auto-collection');

        return response()->json(array_merge($collection->toArray(), [
            'success' => true,
            'collection' => $collection,
        ]));
    }

    public function show(Request $request, string $id)
    {
        $includeDrafts = $request->query('includeDrafts') === '1' || $request->query('admin') === '1';
        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 50));

        if ($includeDrafts) {
            $session = TeamService::getCurrentSession($request);
            if (!TeamService::hasPermission($session, 'manage_collections')) {
                $includeDrafts = false;
            }
        }

        $data = CollectionService::getCollectionWithImages(['id' => $id], [
            'includeDrafts' => $includeDrafts,
            'page' => $page,
            'limit' => $limit,
        ]);

        if (!$data) {
            return response()->json(['error' => 'Collection not found'], 404);
        }

        return response()->json($data);
    }

    public function update(Request $request, string $id)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'manage_collections')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $collection = Collection::find($id);
        if (!$collection) {
            return response()->json(['error' => 'Collection not found'], 404);
        }

        foreach (['name', 'description', 'coverImageId', 'coverImagePath', 'type', 'ruleMatchMode', 'status'] as $field) {
            if ($request->has($field)) {
                $collection->{$field} = $request->input($field);
            }
        }
        if ($request->has('slug')) {
            $collection->slug = CollectionService::getUniqueSlug((string) $request->input('slug'), $id);
        }
        if ($request->has('tagRules')) {
            $collection->tagRules = CollectionService::normalizeTags($request->input('tagRules'));
        }
        if ($request->has('isFeatured')) {
            $collection->isFeatured = (bool) $request->input('isFeatured');
        }
        if ($request->has('order')) {
            $collection->order = (int) $request->input('order');
        }

        $collection->save();

        if ($request->has('imageIds') && is_array($request->input('imageIds'))) {
            CollectionImage::where('collectionId', $id)->delete();
            foreach (array_values(array_unique($request->input('imageIds'))) as $pos => $imgId) {
                CollectionImage::create([
                    'collectionId' => $id,
                    'imageId' => $imgId,
                    'position' => $pos,
                ]);
            }
        }

        SeoGeneratorService::refreshAuto('auto-collection');

        return response()->json(array_merge($collection->toArray(), [
            'success' => true,
            'collection' => $collection,
        ]));
    }

    public function destroy(Request $request, string $id)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'manage_collections')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        Collection::where('id', $id)->delete();
        SeoGeneratorService::refreshAuto('auto-collection-delete');
        return response()->json(['success' => true]);
    }

    public function manageImages(Request $request, string $id)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'manage_collections')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $collection = Collection::find($id);
        if (!$collection) {
            return response()->json(['error' => 'Collection not found'], 404);
        }

        // Handle DELETE /api/collections/{id}/images?imageId=...
        if ($request->isMethod('delete')) {
            $imageId = $request->query('imageId') ?: $request->input('imageId');
            if ($imageId) {
                if ($collection->type === 'smart_dynamic') {
                    CollectionImage::updateOrCreate(
                        ['collectionId' => $id, 'imageId' => $imageId],
                        ['isExcluded' => true, 'isPinned' => false]
                    );
                } else {
                    CollectionImage::where('collectionId', $id)->where('imageId', $imageId)->delete();
                }
            }
            return response()->json(['success' => true]);
        }

        $action = $request->input('action');
        $imageId = $request->input('imageId');
        $imageIds = $request->input('imageIds', []);

        if ($action === 'add' && is_array($imageIds)) {
            foreach ($imageIds as $imgId) {
                CollectionImage::updateOrCreate(
                    ['collectionId' => $id, 'imageId' => $imgId],
                    ['isExcluded' => false]
                );
            }
        } elseif ($action === 'set_cover' && $imageId) {
            $img = Image::find($imageId);
            if ($img) {
                $collection->coverImageId = $img->id;
                $collection->coverImagePath = $img->path;
                $collection->save();
            }
        } elseif ($action === 'update' && $imageId) {
            $updateData = [];
            if ($request->has('isPinned')) {
                $updateData['isPinned'] = (bool) $request->input('isPinned');
                if ($updateData['isPinned']) {
                    $updateData['isExcluded'] = false;
                }
            }
            if ($request->has('position')) {
                $updateData['position'] = (int) $request->input('position');
            }
            CollectionImage::updateOrCreate(
                ['collectionId' => $id, 'imageId' => $imageId],
                $updateData
            );
        } elseif ($action === 'remove' && $imageId) {
            CollectionImage::where('collectionId', $id)->where('imageId', $imageId)->delete();
        } elseif ($action === 'pin' && $imageId) {
            CollectionImage::updateOrCreate(
                ['collectionId' => $id, 'imageId' => $imageId],
                ['isPinned' => (bool) $request->input('isPinned', true), 'isExcluded' => false]
            );
        } elseif ($action === 'exclude' && $imageId) {
            CollectionImage::updateOrCreate(
                ['collectionId' => $id, 'imageId' => $imageId],
                ['isExcluded' => (bool) $request->input('isExcluded', true), 'isPinned' => false]
            );
        }

        return response()->json(['success' => true]);
    }

    public function previewTags(Request $request)
    {
        $tagRules = $request->input('tags', $request->input('tagRules', []));
        $mode = $request->input('mode', $request->input('ruleMatchMode', 'any'));
        return response()->json(CollectionService::previewTagMatches(is_array($tagRules) ? $tagRules : [], $mode));
    }

    public function generateAi(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, 'manage_collections')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $topic = trim((string) ($request->input('prompt') ?: $request->input('topic', '')));
        if ($topic === '') {
            return response()->json(['error' => 'Prompt is required'], 400);
        }

        $images = Image::where('status', 'published')->get(['tags']);
        $tagFreq = [];
        foreach ($images as $img) {
            foreach ((is_array($img->tags) ? $img->tags : []) as $t) {
                if (is_string($t) && trim($t) !== '') {
                    $clean = strtolower(trim($t));
                    $tagFreq[$clean] = ($tagFreq[$clean] ?? 0) + 1;
                }
            }
        }
        arsort($tagFreq);
        $availableTags = implode(', ', array_slice(array_keys($tagFreq), 0, 120));

        $prompt = <<<PROMPT
You are an SEO & content curator for Png101, a transparent PNG asset platform.
The user wants to create a curated PNG collection about: "{$topic}".
Available popular tags in our catalog: [{$availableTags}]

Generate a JSON object with:
{
  "name": "Catchy SEO Collection Title",
  "slug": "url-friendly-slug",
  "description": "Engaging 1-2 sentence SEO description of this PNG collection.",
  "tags": ["tag1", "tag2", ... 5-10 relevant tags, preferring tags from the available catalog]
}
PROMPT;

        try {
            $result = GeminiService::generateTextJson($prompt);
            $generatedTags = CollectionService::normalizeTags($result['tags'] ?? $result['tagRules'] ?? []);
            $preview = CollectionService::previewTagMatches($generatedTags, 'any');

            return response()->json([
                'success' => true,
                'name' => $result['name'] ?? '',
                'slug' => $result['slug'] ?? CollectionService::slugify($result['name'] ?? $topic),
                'description' => $result['description'] ?? '',
                'tags' => $generatedTags,
                'matchCount' => $preview['count'],
                'sampleImages' => $preview['sampleImages'],
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
