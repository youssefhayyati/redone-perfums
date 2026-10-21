<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PackResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Resources\VariantResource;
use App\Models\Pack;
use App\Models\ProductVariant;
use App\Services\Packs\PackResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PackController extends Controller
{
    public function __construct(private readonly PackResolver $resolver) {}

    public function index(): AnonymousResourceCollection
    {
        $packs = Pack::query()->where('is_active', true)
            ->with('items.variant.product.images')
            ->orderBy('sort_order')
            ->get();

        return PackResource::collection($packs);
    }

    /**
     * A pack with every perfume the customer may choose, grouped by product.
     */
    public function show(string $slug): JsonResponse
    {
        $pack = Pack::query()->where('is_active', true)->where('slug', $slug)
            ->with('items.variant.product.images')
            ->firstOrFail();

        $options = [];
        if ($pack->isCustom()) {
            $options = $this->resolver->eligibleVariants($pack)
                ->groupBy('product_id')
                ->map(function ($variants) {
                    $product = $variants->first()->product;
                    // Show the product card with only the pack-eligible variants.
                    $product->setRelation('activeVariants', $variants->values());

                    return [
                        ...(new ProductCardResource($product))->resolve(),
                        'pack_variants' => VariantResource::collection($variants->sortBy('size_ml')->values())->resolve(),
                    ];
                })
                ->values()
                ->all();
        }

        return response()->json([
            'data' => new PackResource($pack),
            'options' => $options,
        ]);
    }

    /**
     * Authoritative price for a selection; the builder shows this figure.
     */
    public function quote(Request $request, string $slug): JsonResponse
    {
        $pack = Pack::query()->where('is_active', true)->where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'selections' => ['present', 'array', 'max:24'],
            'selections.*' => ['integer', 'min:1'],
        ]);

        $variants = $this->resolver->resolveSelection($pack, $validated['selections']);
        $quote = $this->resolver->quote($pack, $variants);

        $outOfStock = collect($variants)
            ->countBy(fn (ProductVariant $v) => $v->id)
            ->filter(fn ($count, $id) => collect($variants)->firstWhere('id', $id)->stock < $count)
            ->keys()->values();

        return response()->json([
            'compare_at' => $quote->compareAt,
            'price' => $quote->price,
            'savings' => $quote->savings(),
            'out_of_stock' => $outOfStock,
        ]);
    }
}
