<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\CollectionService;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::with(['parent', 'children'])
            ->withCount('images')
            ->orderBy('name')
            ->get()
            ->map(function ($cat) {
                $arr = $cat->toArray();
                $arr['_count'] = ['images' => $cat->images_count];
                return $arr;
            });

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $name = trim((string) $request->input('name', ''));
        $description = $request->input('description');
        $parentId = $request->input('parentId') ?: null;

        if ($name === '') {
            return response()->json(['error' => 'Category name is required'], 400);
        }

        $baseSlug = CollectionService::slugify($name) ?: 'category';
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

        return response()->json($category);
    }

    public function update(Request $request, string $id)
    {
        $category = Category::find($id);
        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        if ($request->has('name')) {
            $category->name = trim((string) $request->input('name'));
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
        return response()->json($category);
    }

    public function destroy(string $id)
    {
        Category::where('id', $id)->delete();
        return response()->json(['success' => true]);
    }
}

