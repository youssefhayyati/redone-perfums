<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasFactory;

    /** Orders are written only by OrderPlacer and OrderWorkflow. */
    protected $guarded = ['id'];

    protected $hidden = ['guest_token', 'idempotency_key'];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'payment_status' => PaymentStatus::class,
            'payment_method' => PaymentMethod::class,
            'subtotal' => 'integer',
            'discount_total' => 'integer',
            'delivery_fee' => 'integer',
            'total' => 'integer',
            'items_count' => 'integer',
            'placed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'reference';
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class)->orderBy('id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->orderByDesc('id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public static function generateReference(): string
    {
        // Unambiguous alphabet: no 0/O, 1/I/L.
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $suffix = '';
            for ($i = 0; $i < 6; $i++) {
                $suffix .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $reference = 'RP-'.now()->format('ymd').'-'.$suffix;
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }

    public static function generateGuestToken(): string
    {
        return Str::random(48);
    }
}
