<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[WithoutTimestamps]
class OrderItemSelection extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'size_ml' => 'integer',
            'unit_price' => 'integer',
            'position' => 'integer',
        ];
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
