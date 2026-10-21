<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\JsonResponse;

class PageController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $page = Page::query()->where('slug', $slug)->where('is_published', true)->firstOrFail();

        return response()->json([
            'data' => [
                'slug' => $page->slug,
                'title' => $page->title,
                'body' => $page->body,
                'meta_description' => $page->meta_description,
                'updated_at' => $page->updated_at?->toIso8601String(),
            ],
        ]);
    }
}
