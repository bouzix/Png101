<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\CollectionService;
use App\Services\SeoGeneratorService;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::with([
            'parent',
            'children' => fn ($q) => $q->withCount('images')->orderBy('name'),
        ])
            ->withCount('images')
            ->orderBy('name')
            ->get()
            ->map(function ($cat) {
                $arr = $cat->toArray();
                $arr['_count'] = ['images' => $cat->images_count ?? 0];
                $arr['children'] = $cat->children->map(function ($child) {
                    $cArr = $child->toArray();
                    $cArr['_count'] = ['images' => $child->images_count ?? 0];
                    return $cArr;
                })->values()->all();
                return $arr;
            });

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $session = \App\Services\TeamService::getCurrentSession($request);
        if (!\App\Services\TeamService::hasPermission($session, 'manage_collections')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $name = trim((string) $request->input('name', ''));
        $requestedSlug = trim((string) $request->input('slug', ''));
        $description = $request->input('description');
        $parentId = $request->input('parentId') ?: null;

        if ($name === '') {
            return response()->json(['error' => 'Category name is required'], 400);
        }

        $baseSlug = $requestedSlug !== '' ? (CollectionService::slugify($requestedSlug) ?: 'category') : (CollectionService::slugify($name) ?: 'category');
        if ($requestedSlug !== '' && Category::where('slug', $baseSlug)->exists()) {
            return response()->json(['error' => 'A category with this name/slug already exists'], 409);
        }

        $slug = $baseSlug;
        $counter = 1;
        while (Category::where('slug', $slug)->exists()) {
            $counter++;
            $slug = "{$baseSlug}-{$counter}";
        }

        $category = Category::create([
            'name' => $name,
            'slug' => $slug,
            'description' => $description,
            'parentId' => $parentId,
        ]);

        SeoGeneratorService::refreshAuto('auto-category');
        return response()->json($category);
    }

    public function update(Request $request, string $id)
    {
        $session = \App\Services\TeamService::getCurrentSession($request);
        if (!\App\Services\TeamService::hasPermission($session, 'manage_collections')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $category = Category::find($id);
        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        if ($request->has('parentId') && $request->input('parentId') === $id) {
            return response()->json(['error' => 'Category cannot be its own parent'], 400);
        }

        if ($request->has('name')) {
            $category->name = trim((string) $request->input('name'));
        }
        if ($request->has('slug')) {
            $slug = trim((string) $request->input('slug'));
            if ($slug !== '') {
                $exists = Category::where('slug', $slug)->where('id', '!=', $id)->exists();
                if ($exists) {
                    return response()->json(['error' => 'A category with this name/slug already exists'], 409);
                }
                $category->slug = $slug;
            }
        } elseif ($request->has('name')) {
            $category->slug = CollectionService::slugify($category->name) ?: $category->slug;
        }

        if ($request->has('description')) {
            $category->description = $request->input('description');
        }
        if ($request->has('parentId')) {
            $parentId = $request->input('parentId') ?: null;
            if ($parentId !== $id) {
                $category->parentId = $parentId;
            }
        }

        $category->save();
        SeoGeneratorService::refreshAuto('auto-category');
        return response()->json($category);
    }

    public function destroy(Request $request, string $id)
    {
        $session = \App\Services\TeamService::getCurrentSession($request);
        if (!\App\Services\TeamService::hasPermission($session, 'manage_collections')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        Category::where('id', $id)->delete();
        SeoGeneratorService::refreshAuto('auto-category-delete');
        return response()->json(['success' => true]);
    }
}
