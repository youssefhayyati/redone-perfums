<?php

namespace App\Http\Resources;

use App\Models\Pack;
use App\Services\Packs\PackResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Pack
 */
class PackResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $resolver = app(PackResolver::class);

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'type' => $this->type->value,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'image' => $this->imageUrl(),
            'selection_count' => $this->isCustom() ? $this->selection_count : null,
            'bottle_count' => $this->bottleCount(),
            'allowed_sizes' => $this->allowed_sizes ? array_map('intval', $this->allowed_sizes) : null,
            'allow_duplicates' => $this->allow_duplicates,
            'pricing' => [
                'type' => $this->pricing_type->value,
                'price' => $this->price,
                'discount_value' => $this->discount_value,
                'label' => PackResolver::describePricing($this->resource),
            ],
            'starting_price' => $resolver->startingPrice($this->resource),
            'contents' => $this->when(! $this->isCustom(), fn () => $this->items->map(fn ($item) => [
                'quantity' => $item->quantity,
                'variant' => $item->variant ? new VariantResource($item->variant) : null,
                'product' => $item->variant?->product ? [
                    'name' => $item->variant->product->name,
                    'slug' => $item->variant->product->slug,
                    'image' => $item->variant->product->images->first()?->toPublicArray(),
                ] : null,
            ])->values()),
        ];
    }
}
