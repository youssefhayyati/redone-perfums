<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'fee', 'free_shipping_threshold', 'delivery_estimate', 'is_active', 'sort_order', 'delivery_estimate_ar'])]
class DeliveryZone extends Model
{
    use HasFactory, HasTranslations;

    /** Columns with an Arabic `_ar` sibling (see HasTranslations). */
    public const TRANSLATABLE = ['delivery_estimate'];

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
