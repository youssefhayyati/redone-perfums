<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * Compact product shape for grids, search results and pack builders.
 * Expects `activeVariants`, `images`, `family` and `notes` to be eager loaded.
 *
 * @mixin Product
 */
class ProductCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $variants = $this->activeVariants;
        $cheapest = $variants->sortBy('price')->first();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->translated('name'),
            'tagline' => $this->translated('tagline'),
            'excerpt' => $this->translated('tagline') ?: Str::limit(strip_tags((string) $this->translated('description')), 140),
            'family' => $this->family ? ['name' => $this->family->translated('name'), 'slug' => $this->family->slug] : null,
            'concentration' => $this->translated('concentration'),
            'badge' => $this->badge,
            'accent_color' => $this->accent_color,
            'image' => $this->images->first()?->toPublicArray(),
            'hover_image' => $this->images->skip(1)->first()?->toPublicArray(),
            'price_from' => $cheapest?->price,
            'has_price_range' => $variants->pluck('price')->unique()->count() > 1,
            'variants' => VariantResource::collection($variants->sortBy('size_ml')->values()),
            'in_stock' => $variants->contains(fn ($v) => $v->stock > 0),
            'notes' => $this->relationLoaded('notes') ? $this->notesByLayer() : null,
        ];
    }

    /**
     * Eager-loads expected by this resource.
     *
     * @return list<string>
     */
    public static function relations(): array
    {
        return ['activeVariants', 'images', 'family', 'notes'];
    }
}
