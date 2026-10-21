<?php

namespace App\Http\Resources;

use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Collection
 */
class CollectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'image' => $this->imageUrl(),
            'accent_color' => $this->accent_color,
            'products_count' => $this->whenCounted('products'),
            'products' => ProductCardResource::collection($this->whenLoaded('products')),
        ];
    }
}
