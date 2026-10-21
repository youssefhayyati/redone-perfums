<?php

namespace App\Services\Inventory;

use App\Enums\InventoryReason;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every stock change goes through here and leaves an InventoryMovement behind.
 */
final class InventoryManager
{
    /**
     * Apply a relative change. The caller must hold a row lock on the variant when
     * running concurrently with sales (OrderPlacer does).
     */
    public function change(
        ProductVariant $variant,
        int $delta,
        InventoryReason $reason,
        ?Order $order = null,
        ?User $actor = null,
        ?string $note = null,
    ): InventoryMovement {
        if ($delta === 0) {
            throw ValidationException::withMessages(['stock' => 'La variation de stock ne peut pas être nulle.']);
        }

        $newStock = $variant->stock + $delta;

        if ($newStock < 0) {
            throw ValidationException::withMessages(['stock' => 'Le stock ne peut pas devenir négatif.']);
        }

        $variant->forceFill(['stock' => $newStock])->save();

        return InventoryMovement::create([
            'product_variant_id' => $variant->id,
            'change' => $delta,
            'stock_after' => $newStock,
            'reason' => $reason,
            'order_id' => $order?->id,
            'user_id' => $actor?->id,
            'note' => $note,
        ]);
    }

    /**
     * Relative change from the admin (restock, breakage…), locking the row first.
     */
    public function adjust(ProductVariant $variant, int $delta, InventoryReason $reason, ?User $actor, ?string $note = null): InventoryMovement
    {
        return DB::transaction(function () use ($variant, $delta, $reason, $actor, $note) {
            $locked = ProductVariant::query()->whereKey($variant->id)->lockForUpdate()->firstOrFail();
            $movement = $this->change($locked, $delta, $reason, null, $actor, $note);
            $variant->setRawAttributes($locked->getAttributes(), true);

            return $movement;
        });
    }

    /**
     * Set an absolute stock level from the admin, locking the row first.
     */
    public function set(ProductVariant $variant, int $stock, ?User $actor, ?string $note = null, InventoryReason $reason = InventoryReason::Adjustment): ?InventoryMovement
    {
        return DB::transaction(function () use ($variant, $stock, $actor, $note, $reason) {
            $locked = ProductVariant::query()->whereKey($variant->id)->lockForUpdate()->firstOrFail();
            $delta = $stock - $locked->stock;

            if ($delta === 0) {
                return null;
            }

            $movement = $this->change($locked, $delta, $reason, null, $actor, $note);
            $variant->setRawAttributes($locked->getAttributes(), true);

            return $movement;
        });
    }
}
