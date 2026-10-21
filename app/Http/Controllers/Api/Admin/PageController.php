<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PageRequest;
use App\Models\Page;
use Illuminate\Http\JsonResponse;

class PageController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Page::query()->orderBy('sort_order')->get()]);
    }

    public function store(PageRequest $request): JsonResponse
    {
        $page = Page::create([...$request->validated(), 'is_published' => $request->boolean('is_published')]);

        return response()->json(['data' => $page], 201);
    }

    public function update(PageRequest $request, Page $page): JsonResponse
    {
        $page->update([...$request->validated(), 'is_published' => $request->boolean('is_published')]);

        return response()->json(['data' => $page]);
    }

    public function destroy(Page $page): JsonResponse
    {
        $page->delete();

        return response()->json(['message' => 'Page supprimée.']);
    }
}
