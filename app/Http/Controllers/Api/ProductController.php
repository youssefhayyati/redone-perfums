<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCardResource;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\Catalog\ProductSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    public function __construct(private readonly ProductSearch $search) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(48, max(1, $request->integer('per_page', 12)));

        $products = $this->search->query($request)->paginate($perPage)->withQueryString();

        return ProductCardResource::collection($products)->additional([
            'sort' => $this->search->sort($request),
        ]);
    }

    public function facets(): JsonResponse
    {
        return response()->json($this->search->facets());
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::query()->published()
            ->where('slug', $slug)
            ->with([...ProductCardResource::relations(), 'collections'])
            ->firstOrFail();

        $related = $this->related($product);

        return response()->json([
            'data' => new ProductResource($product),
            'related' => ProductCardResource::collection($related),
        ]);
    }

    /**
     * Same family first, then the same collections, excluding the product itself.
     */
    private function related(Product $product)
    {
        $collectionIds = $product->collections->pluck('id');

        return Product::query()->published()
            ->whereKeyNot($product->id)
            ->whereHas('activeVariants')
            ->where(fn ($q) => $q
                ->when($product->fragrance_family_id, fn ($q) => $q->where('fragrance_family_id', $product->fragrance_family_id))
                ->orWhereHas('collections', fn ($c) => $c->whereIn('collections.id', $collectionIds)))
            ->with(ProductCardResource::relations())
            ->orderByRaw('CASE WHEN fragrance_family_id = ? THEN 0 ELSE 1 END', [$product->fragrance_family_id ?? 0])
            ->orderByDesc('sales_count')
            ->limit(4)
            ->get();
    }
}
