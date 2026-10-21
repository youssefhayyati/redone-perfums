<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['delivery_zone_id', 'name', 'region', 'is_active', 'sort_order'])]
class City extends Model
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'delivery_zone_id');
    }

    /** Cities a customer can actually order to. */
    #[Scope]
    protected function deliverable(Builder $query): void
    {
        $query->where('is_active', true)
            ->whereHas('zone', fn (Builder $q) => $q->where('is_active', true));
    }
}
