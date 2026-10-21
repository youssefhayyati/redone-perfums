<?php

namespace App\Models;

use App\Enums\CartItemType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'type' => CartItemType::class,
            'selections' => 'array',
            'quantity' => 'integer',
        ];
    }

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function pack(): BelongsTo
    {
        return $this->belongsTo(Pack::class);
    }
}
