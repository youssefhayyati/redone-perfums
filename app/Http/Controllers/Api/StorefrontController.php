<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\PackResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Resources\ProductResource;
use App\Models\Collection;
use App\Models\Pack;
use App\Models\Product;
use App\Services\Settings\StoreSettings;
use App\Services\Settings\StorefrontConfig;
use Illuminate\Http\JsonResponse;

class StorefrontController extends Controller
{
    public function __construct(private readonly StoreSettings $settings) {}

    public function config(StorefrontConfig $config): JsonResponse
    {
        return response()->json($config->build());
    }

    public function home(): JsonResponse
    {
        $featured = Product::query()->published()
            ->where('is_featured', true)
            ->whereHas('activeVariants')
            ->with(ProductCardResource::relations())
            ->orderBy('sort_order')
            ->limit(8)
            ->get();

        if ($featured->isEmpty()) {
            $featured = Product::query()->published()->whereHas('activeVariants')
                ->with(ProductCardResource::relations())
                ->orderByDesc('sales_count')->limit(8)->get();
        }

        $storyProduct = null;
        if ($id = $this->settings->get('home.story_product_id')) {
            $storyProduct = Product::query()->published()->with([...ProductCardResource::relations(), 'collections'])->find($id);
        }
        $storyProduct ??= Product::query()->published()
            ->whereNotNull('inspiration')
            ->with([...ProductCardResource::relations(), 'collections'])
            ->orderByDesc('is_featured')->orderBy('sort_order')
            ->first();

        $collections = Collection::query()
            ->where('is_visible', true)
            ->withCount(['products' => fn ($q) => $q->published()])
            ->orderByDesc('is_featured')->orderBy('sort_order')
            ->limit(5)
            ->get();

        $packs = Pack::query()->where('is_active', true)
            ->with('items.variant.product.images')
            ->orderBy('sort_order')->limit(4)->get();

        return response()->json([
            'hero' => [
                'eyebrow' => $this->settings->get('home.hero_eyebrow'),
                'title' => $this->settings->get('home.hero_title'),
                'subtitle' => $this->settings->get('home.hero_subtitle'),
            ],
            'featured' => ProductCardResource::collection($featured),
            'story' => $storyProduct ? [
                'eyebrow' => $this->settings->get('home.story_eyebrow'),
                'title' => $this->settings->get('home.story_title') ?: $storyProduct->name,
                'body' => $this->settings->get('home.story_body') ?: $storyProduct->inspiration,
                'product' => new ProductResource($storyProduct),
            ] : null,
            'collections' => CollectionResource::collection($collections),
            'packs' => PackResource::collection($packs),
        ]);
    }
}
