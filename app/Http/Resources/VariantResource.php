<?php

namespace App\Http\Resources;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductVariant
 */
class VariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $availability = $this->availability();

        return [
            'id' => $this->id,
            'size_ml' => $this->size_ml,
            'sku' => $this->sku,
            'label' => $this->label(),
            'price' => $this->price,
            'compare_at_price' => $this->compare_at_price,
            'availability' => $availability,
            'stock_left' => $availability === 'low_stock' ? $this->stock : null,
        ];
    }
}
