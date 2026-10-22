<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\ProductCardResource;
use App\Models\Collection;
use App\Models\FragranceFamily;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CollectionController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $collections = Collection::query()
            ->where('is_visible', true)
            ->withCount(['products' => fn ($q) => $q->published()])
            ->orderBy('sort_order')
            ->get();

        return CollectionResource::collection($collections);
    }

    public function show(string $slug): CollectionResource
    {
        $collection = Collection::query()
            ->where('is_visible', true)
            ->where('slug', $slug)
            ->with(['products' => fn ($q) => $q->published()->whereHas('activeVariants')->with(ProductCardResource::relations())])
            ->firstOrFail();

        return new CollectionResource($collection);
    }

    /**
     * Fragrance families for the "Découvrir" guide, with a few perfumes of each.
     */
    public function families(): JsonResponse
    {
        $families = FragranceFamily::query()
            ->whereHas('products', fn ($q) => $q->published())
            ->with(['products' => fn ($q) => $q->published()->whereHas('activeVariants')
                ->with(ProductCardResource::relations())
                ->orderByDesc('is_featured')->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $families->map(fn (FragranceFamily $family) => [
                'name' => $family->translated('name'),
                'slug' => $family->slug,
                'description' => $family->translated('description'),
                'products_count' => $family->products->count(),
                'products' => ProductCardResource::collection($family->products->take(3)),
            ]),
        ]);
    }
}
