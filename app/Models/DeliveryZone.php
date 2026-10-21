<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'fee', 'free_shipping_threshold', 'delivery_estimate', 'is_active', 'sort_order'])]
class DeliveryZone extends Model
{
    protected function casts(): array
    {
        return [
            'fee' => 'integer',
            'free_shipping_threshold' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function cities(): HasMany
    {
        return $this->hasMany(City::class)->orderBy('sort_order')->orderBy('name');
    }

    public function feeFor(int $merchandiseTotal): int
    {
        if ($this->free_shipping_threshold !== null && $merchandiseTotal >= $this->free_shipping_threshold) {
            return 0;
        }

        return $this->fee;
    }
}
