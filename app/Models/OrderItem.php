<?php

namespace App\Models;

use App\Enums\CartItemType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrderItem extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'type' => CartItemType::class,
            'unit_price' => 'integer',
            'compare_at_price' => 'integer',
            'quantity' => 'integer',
            'line_total' => 'integer',
            'meta' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function selections(): HasMany
    {
        return $this->hasMany(OrderItemSelection::class)->orderBy('position');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
