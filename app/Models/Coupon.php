<?php

namespace App\Models;

use App\Enums\CouponType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'code', 'description', 'type', 'value', 'min_subtotal', 'max_uses',
    'starts_at', 'ends_at', 'is_active',
])]
class Coupon extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => CouponType::class,
            'value' => 'integer',
            'min_subtotal' => 'integer',
            'max_uses' => 'integer',
            'used_count' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    protected function code(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => mb_strtoupper(trim($value)),
        );
    }

    public static function findByCode(string $code): ?self
    {
        return static::where('code', mb_strtoupper(trim($code)))->first();
    }

    /**
     * Why the coupon cannot be applied to this merchandise total, or null when it can.
     */
    public function rejectionReason(int $subtotal): ?string
    {
        return match (true) {
            ! $this->is_active => __('Ce code n’est pas actif.'),
            $this->starts_at !== null && $this->starts_at->isFuture() => __('Ce code n’est pas encore valable.'),
            $this->ends_at !== null && $this->ends_at->isPast() => __('Ce code a expiré.'),
            $this->max_uses !== null && $this->used_count >= $this->max_uses => __('Ce code a atteint sa limite d’utilisation.'),
            $this->min_subtotal !== null && $subtotal < $this->min_subtotal => __('Le montant minimum pour ce code n’est pas atteint.'),
            default => null,
        };
    }

    public function discountFor(int $subtotal): int
    {
        $discount = match ($this->type) {
            CouponType::Percent => intdiv($subtotal * min($this->value, 100), 100),
            CouponType::Fixed => $this->value,
        };

        return min($discount, $subtotal);
    }
}
