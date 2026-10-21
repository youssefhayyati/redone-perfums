<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\AddCartItemRequest;
use App\Http\Requests\Storefront\AddPackRequest;
use App\Http\Requests\Storefront\UpdateCartItemRequest;
use App\Http\Resources\CartResource;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\City;
use App\Models\Pack;
use App\Models\ProductVariant;
use App\Services\Cart\CartCalculator;
use App\Services\Cart\CartManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The cart is identified by the X-Cart-Token header (a random UUID issued by the
 * server). Every response is the full, server-priced cart.
 */
class CartController extends Controller
{
    public function __construct(
        private readonly CartManager $carts,
        private readonly CartCalculator $calculator,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $cart = $this->carts->find($request->header('X-Cart-Token'));

        if ($cart === null) {
            return response()->json(['token' => null, 'lines' => [], 'items_count' => 0, 'subtotal' => 0, 'discount_total' => 0, 'coupon' => null, 'delivery' => null, 'total' => null, 'merchandise_total' => 0, 'is_checkout_ready' => false, 'max_quantity' => CartManager::MAX_QUANTITY]);
        }

        return $this->respond($request, $cart);
    }

    public function addItem(AddCartItemRequest $request): JsonResponse
    {
        $cart = $this->cart($request);
        $variant = ProductVariant::with('product')->findOrFail($request->integer('variant_id'));

        $this->carts->addVariant($cart, $variant, $request->integer('quantity', 1));

        return $this->respond($request, $cart, 201);
    }

    public function addPack(AddPackRequest $request): JsonResponse
    {
        $cart = $this->cart($request);
        $pack = Pack::findOrFail($request->integer('pack_id'));

        $this->carts->addPack($cart, $pack, $request->input('selections', []), $request->integer('quantity', 1));

        return $this->respond($request, $cart, 201);
    }

    public function updateItem(UpdateCartItemRequest $request, int $item): JsonResponse
    {
        $cart = $this->existingCart($request);
        $line = $this->line($cart, $item);

        if ($request->has('selections')) {
            $this->carts->replaceSelections($cart, $line, $request->input('selections'));
        }

        if ($request->has('quantity')) {
            $this->carts->setQuantity($cart, $line, $request->integer('quantity'));
        }

        return $this->respond($request, $cart);
    }

    public function removeItem(Request $request, int $item): JsonResponse
    {
        $cart = $this->existingCart($request);
        $this->carts->remove($this->line($cart, $item));

        return $this->respond($request, $cart);
    }

    public function applyCoupon(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:40']]);
        $cart = $this->existingCart($request);

        $this->carts->applyCoupon($cart, $request->string('code'));

        return $this->respond($request, $cart);
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $cart = $this->existingCart($request);
        $this->carts->removeCoupon($cart);

        return $this->respond($request, $cart);
    }

    private function cart(Request $request): Cart
    {
        return $this->carts->findOrCreate($request->header('X-Cart-Token'), $request->user());
    }

    private function existingCart(Request $request): Cart
    {
        $cart = $this->carts->find($request->header('X-Cart-Token'));
        abort_if($cart === null, 404, 'Panier introuvable.');

        return $cart;
    }

    private function line(Cart $cart, int $id): CartItem
    {
        return $cart->items()->with('pack.items')->findOrFail($id);
    }

    private function respond(Request $request, Cart $cart, int $status = 200): JsonResponse
    {
        $cityId = $request->integer('city_id') ?: null;
        $city = $cityId ? City::with('zone')->find($cityId) : null;

        $summary = $this->calculator->summarize($cart->fresh(), $city);

        return (new CartResource($summary))->response()->setStatusCode($status);
    }
}
