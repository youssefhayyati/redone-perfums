<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\PackResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Resources\ProductResource;
use App\Models\Collection;
use App\Models\Pack;
use App\Models\ProcessStep;
use App\Models\Product;
use App\Services\Settings\StorefrontConfig;
use App\Services\Settings\StoreSettings;
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

        $steps = ProcessStep::query()->told()->get(ProcessStep::withTranslations(['id', 'title', 'body', 'detail', 'image_path', 'image_credit']));

        return response()->json([
            'hero' => [
                'eyebrow' => $this->settings->localized('home.hero_eyebrow'),
                'title' => $this->settings->localized('home.hero_title'),
                'subtitle' => $this->settings->localized('home.hero_subtitle'),
            ],
            'featured' => ProductCardResource::collection($featured),
            'story' => $storyProduct ? [
                'eyebrow' => $this->settings->localized('home.story_eyebrow'),
                'title' => $this->settings->localized('home.story_title') ?: $storyProduct->translated('name'),
                'body' => $this->settings->localized('home.story_body') ?: $storyProduct->translated('inspiration'),
                'product' => new ProductResource($storyProduct),
            ] : null,
            'collections' => CollectionResource::collection($collections),
            'packs' => PackResource::collection($packs),
            'lab' => $steps->isEmpty() ? null : [
                'title' => $this->settings->localized('lab.title'),
                'intro' => $this->settings->localized('lab.intro'),
                'steps' => $steps->map(fn (ProcessStep $step) => [
                    'id' => $step->id,
                    'title' => $step->translated('title'),
                    'body' => $step->translated('body'),
                    'detail' => $step->translated('detail'),
                    'image' => $step->imageUrl(),
                    'credit' => $step->image_credit,
                ]),
            ],
        ]);
    }
}
