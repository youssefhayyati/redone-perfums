<?php

namespace App\Http\Resources\Admin;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class AdminProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $variants = $this->whenLoaded('variants');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_ar' => $this->name_ar,
            'slug' => $this->slug,
            'status' => $this->status->value,
            'is_featured' => $this->is_featured,
            'is_demo' => $this->is_demo,
            'badge' => $this->badge,
            'family' => $this->whenLoaded('family', fn () => $this->family ? ['id' => $this->family->id, 'name' => $this->family->name] : null),
            'fragrance_family_id' => $this->fragrance_family_id,
            'tagline' => $this->tagline,
            'tagline_ar' => $this->tagline_ar,
            'description' => $this->description,
            'description_ar' => $this->description_ar,
            'inspiration' => $this->inspiration,
            'inspiration_ar' => $this->inspiration_ar,
            'concentration' => $this->concentration,
            'concentration_ar' => $this->concentration_ar,
            'gender' => $this->gender,
            'longevity' => $this->longevity,
            'sillage' => $this->sillage,
            'accent_color' => $this->accent_color,
            'sort_order' => $this->sort_order,
            'meta_title' => $this->meta_title,
            'meta_title_ar' => $this->meta_title_ar,
            'meta_description' => $this->meta_description,
            'meta_description_ar' => $this->meta_description_ar,
            'published_at' => $this->published_at?->toIso8601String(),
            'sales_count' => $this->sales_count,
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'image' => $this->whenLoaded('images', fn () => $this->images->first()?->toPublicArray()),
            'images' => $this->whenLoaded('images', fn () => $this->images->map->toPublicArray()->values()),
            'variants' => $this->whenLoaded('variants', fn () => $this->variants->map(fn ($v) => [
                'id' => $v->id,
                'size_ml' => $v->size_ml,
                'sku' => $v->sku,
                'price' => $v->price,
                'compare_at_price' => $v->compare_at_price,
                'stock' => $v->stock,
                'low_stock_threshold' => $v->low_stock_threshold,
                'is_active' => $v->is_active,
            ])->values()),
            'stock_total' => $this->whenLoaded('variants', fn () => $variants->sum('stock')),
            'price_range' => $this->whenLoaded('variants', fn () => [
                'min' => $variants->min('price'),
                'max' => $variants->max('price'),
            ]),
            'notes' => $this->whenLoaded('notes', fn () => $this->notesByLayer()),
            'collection_ids' => $this->whenLoaded('collections', fn () => $this->collections->pluck('id')->values()),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
