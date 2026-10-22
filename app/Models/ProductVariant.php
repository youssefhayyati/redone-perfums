<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * `stock` is not fillable: every change goes through InventoryManager so that it is
 * logged as an InventoryMovement.
 */
#[Fillable(['size_ml', 'sku', 'price', 'compare_at_price', 'low_stock_threshold', 'is_active', 'sort_order'])]
class ProductVariant extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'size_ml' => 'integer',
            'price' => 'integer',
            'compare_at_price' => 'integer',
            'stock' => 'integer',
            'low_stock_threshold' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class)->latest('id');
    }

    public function label(): string
    {
        return __(':size ml', ['size' => $this->size_ml]);
    }

    /** Purchasable right now: active variant of a published product. */
    public function isSellable(): bool
    {
        return $this->is_active && $this->product !== null && $this->product->isPublished();
    }

    public function isLowStock(): bool
    {
        return $this->stock <= $this->low_stock_threshold;
    }

    /** Public stock signal; exact quantities are only revealed when low. */
    public function availability(): string
    {
        return match (true) {
            $this->stock <= 0 => 'out_of_stock',
            $this->isLowStock() => 'low_stock',
            default => 'in_stock',
        };
    }
}
