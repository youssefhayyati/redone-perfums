<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;

/**
 * Full product page payload.
 *
 * @mixin Product
 */
class ProductResource extends ProductCardResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'description' => $this->description,
            'inspiration' => $this->inspiration,
            'gender' => $this->gender,
            'longevity' => $this->longevity,
            'sillage' => $this->sillage,
            'images' => $this->images->map->toPublicArray()->values(),
            'collections' => $this->collections
                ->where('is_visible', true)
                ->map(fn ($c) => ['name' => $c->name, 'slug' => $c->slug])
                ->values(),
            'meta' => [
                'title' => $this->meta_title ?: $this->name,
                'description' => $this->meta_description ?: $this->tagline,
            ],
        ];
    }
}
