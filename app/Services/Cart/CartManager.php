<?php

namespace App\Services\Cart;

use App\Enums\CartItemType;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Pack;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Packs\PackResolver;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CartManager
{
    public const MAX_LINES = 30;

    public const MAX_QUANTITY = 10;

    public function __construct(
        private readonly PackResolver $packs,
        private readonly CartCalculator $calculator,
    ) {}

    public function find(?string $token): ?Cart
    {
        if ($token === null || ! Str::isUuid($token)) {
            return null;
        }

        return Cart::query()->where('token', $token)->whereNull('converted_at')->first();
    }

    /** Includes carts already turned into an order, for idempotent checkout replays. */
    public function findForCheckout(?string $token): ?Cart
    {
        if ($token === null || ! Str::isUuid($token)) {
            return null;
        }

        return Cart::query()->where('token', $token)->first();
    }

    public function create(?User $user = null): Cart
    {
        return Cart::create(['token' => (string) Str::uuid(), 'user_id' => $user?->id]);
    }

    public function findOrCreate(?string $token, ?User $user = null): Cart
    {
        $cart = $this->find($token) ?? $this->create($user);

        if ($user !== null && $cart->user_id === null) {
            $cart->forceFill(['user_id' => $user->id])->save();
        }

        return $cart;
    }

    public function addVariant(Cart $cart, ProductVariant $variant, int $quantity): CartItem
    {
        $variant->loadMissing('product');

        if (! $variant->isSellable()) {
            throw ValidationException::withMessages(['variant_id' => __('Ce format n’est pas disponible.')]);
        }

        $item = $cart->items()
            ->where('type', CartItemType::Product)
            ->where('product_variant_id', $variant->id)
            ->first();

        if ($item === null) {
            $this->guardLineCount($cart);
            $item = $cart->items()->make(['type' => CartItemType::Product, 'product_variant_id' => $variant->id, 'quantity' => 0]);
        }

        $item->quantity = $this->clampQuantity($item->quantity + $quantity);
        $this->saveIfStockAllows($cart, $item);

        return $item;
    }

    /**
     * @param  array<int, mixed>  $selectionIds
     */
    public function addPack(Cart $cart, Pack $pack, array $selectionIds, int $quantity = 1): CartItem
    {
        $variants = $this->packs->resolveSelection($pack, $selectionIds);
        $selections = $pack->isCustom() ? array_map(fn (ProductVariant $v) => $v->id, $variants) : null;

        // The same composition added twice becomes one line with quantity 2.
        $existing = $cart->items()
            ->where('type', CartItemType::Pack)
            ->where('pack_id', $pack->id)
            ->get()
            ->first(fn (CartItem $i) => $this->sameComposition($i->selections, $selections));

        if ($existing === null) {
            $this->guardLineCount($cart);
            $existing = $cart->items()->make([
                'type' => CartItemType::Pack,
                'pack_id' => $pack->id,
                'selections' => $selections,
                'quantity' => 0,
            ]);
        }

        $existing->quantity = $this->clampQuantity($existing->quantity + $quantity);
        $this->saveIfStockAllows($cart, $existing);

        return $existing;
    }

    public function setQuantity(Cart $cart, CartItem $item, int $quantity): void
    {
        $item->quantity = $this->clampQuantity($quantity);
        $this->saveIfStockAllows($cart, $item);
    }

    /**
     * Replace the perfumes of a custom pack already in the cart.
     *
     * @param  array<int, mixed>  $selectionIds
     */
    public function replaceSelections(Cart $cart, CartItem $item, array $selectionIds): void
    {
        if ($item->type !== CartItemType::Pack || $item->pack === null || ! $item->pack->isCustom()) {
            throw ValidationException::withMessages(['selections' => __('Cet article ne se compose pas.')]);
        }

        $variants = $this->packs->resolveSelection($item->pack, $selectionIds);
        $item->selections = array_map(fn (ProductVariant $v) => $v->id, $variants);
        $this->saveIfStockAllows($cart, $item);
    }

    public function remove(CartItem $item): void
    {
        $item->delete();
    }

    public function applyCoupon(Cart $cart, string $code): void
    {
        $coupon = Coupon::findByCode($code);

        if ($coupon === null) {
            throw ValidationException::withMessages(['code' => __('Ce code n’existe pas.')]);
        }

        $subtotal = $this->calculator->summarize($cart->fresh())->subtotal;

        if ($reason = $coupon->rejectionReason($subtotal)) {
            throw ValidationException::withMessages(['code' => $reason]);
        }

        $cart->coupon()->associate($coupon)->save();
    }

    public function removeCoupon(Cart $cart): void
    {
        $cart->coupon()->dissociate()->save();
    }

    private function guardLineCount(Cart $cart): void
    {
        if ($cart->items()->count() >= self::MAX_LINES) {
            throw ValidationException::withMessages(['cart' => __('Votre panier a atteint le nombre maximum d’articles.')]);
        }
    }

    private function clampQuantity(int $quantity): int
    {
        return max(1, min(self::MAX_QUANTITY, $quantity));
    }

    /**
     * Persist the line only if the whole cart, including this change, can be served
     * from current stock.
     */
    private function saveIfStockAllows(Cart $cart, CartItem $candidate): void
    {
        $items = $cart->items()->with('pack.items')->get();
        $items = $candidate->exists
            ? $items->map(fn (CartItem $i) => $i->is($candidate) ? $candidate : $i)
            : $items->push($candidate);

        $probe = (new Cart)->forceFill($cart->only(['id', 'coupon_id']));
        $probe->setRelation('items', $items->values());
        $probe->setRelation('coupon', null);

        $summary = $this->calculator->summarize($probe);
        $line = collect($summary->lines)->first(fn (CartLine $l) => $l->item === $candidate);

        if ($line !== null && $line->issues !== []) {
            throw ValidationException::withMessages(['quantity' => $line->issues[0]['message']]);
        }

        $candidate->save();
        $cart->touch();
    }

    /**
     * @param  array<int, int>|null  $a
     * @param  array<int, int>|null  $b
     */
    private function sameComposition(?array $a, ?array $b): bool
    {
        if ($a === null || $b === null) {
            return $a === $b;
        }

        sort($a);
        sort($b);

        return array_map('intval', $a) === array_map('intval', $b);
    }
}
