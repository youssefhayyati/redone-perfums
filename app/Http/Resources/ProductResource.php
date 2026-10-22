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
            'description' => $this->translated('description'),
            'inspiration' => $this->translated('inspiration'),
            'gender' => $this->gender,
            'longevity' => $this->longevity,
            'sillage' => $this->sillage,
            'images' => $this->images->map->toPublicArray()->values(),
            'collections' => $this->collections
                ->where('is_visible', true)
                ->map(fn ($c) => ['name' => $c->translated('name'), 'slug' => $c->slug])
                ->values(),
            'meta' => [
                'title' => $this->translated('meta_title') ?: $this->translated('name'),
                'description' => $this->translated('meta_description') ?: $this->translated('tagline'),
            ],
        ];
    }
}
