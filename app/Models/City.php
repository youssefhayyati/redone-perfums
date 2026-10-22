<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['delivery_zone_id', 'name', 'region', 'is_active', 'sort_order', 'name_ar', 'region_ar', 'name_en', 'region_en'])]
class City extends Model
{
    use HasFactory, HasTranslations;

    /** Columns with Arabic `_ar` and English `_en` siblings (see HasTranslations). */
    public const TRANSLATABLE = ['name', 'region'];

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
