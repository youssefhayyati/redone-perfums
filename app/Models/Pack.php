<?php

namespace App\Models;

use App\Enums\PackEligibility;
use App\Enums\PackPricing;
use App\Enums\PackType;
use App\Models\Concerns\HasTranslations;
use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'slug', 'type', 'tagline', 'description', 'image_path', 'selection_count',
    'allowed_sizes', 'eligibility', 'allow_duplicates', 'pricing_type', 'price',
    'discount_value', 'is_active', 'sort_order',
    'name_ar', 'tagline_ar', 'description_ar',
])]
class Pack extends Model
{
    use HasFactory, HasTranslations;

    /** Columns with an Arabic `_ar` sibling (see HasTranslations). */
    public const TRANSLATABLE = ['name', 'tagline', 'description'];

    protected function casts(): array
    {
        return [
            'type' => PackType::class,
            'eligibility' => PackEligibility::class,
            'pricing_type' => PackPricing::class,
            'allowed_sizes' => 'array',
            'allow_duplicates' => 'boolean',
            'is_active' => 'boolean',
            'is_demo' => 'boolean',
            'selection_count' => 'integer',
            'price' => 'integer',
            'discount_value' => 'integer',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(PackItem::class)->orderBy('sort_order');
    }

    public function eligibleCollections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'pack_collection');
    }

    public function eligibleProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'pack_product');
    }

    public function isCustom(): bool
    {
        return $this->type === PackType::Custom;
    }

    public function imageUrl(): ?string
    {
        return MediaUrl::for($this->image_path);
    }

    /** Number of bottles the customer receives. */
    public function bottleCount(): int
    {
        return $this->isCustom()
            ? (int) $this->selection_count
            : (int) $this->items->sum('quantity');
    }
}
