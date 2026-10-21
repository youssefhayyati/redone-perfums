<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\CheckoutRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\Cart\CartManager;
use App\Services\Checkout\OrderPlacer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CartManager $carts,
        private readonly OrderPlacer $placer,
    ) {}

    public function store(CheckoutRequest $request): JsonResponse
    {
        $cart = $this->carts->findForCheckout($request->header('X-Cart-Token'));
        abort_if($cart === null, 422, 'Votre panier est introuvable ou vide.');

        $key = $request->header('Idempotency-Key');
        $key = is_string($key) && preg_match('/^[A-Za-z0-9\-]{16,80}$/', $key) ? $key : null;

        $order = $this->placer->place($cart, $request->toData(), $request->user(), $key);

        return response()->json([
            'order' => new OrderResource($order),
            'access_token' => $order->guest_token,
        ], $order->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Confirmation page: the guest token returned at checkout, or the owner's session.
     */
    public function show(Request $request, string $reference): OrderResource
    {
        $order = Order::query()->where('reference', $reference)->with('items.selections')->firstOrFail();

        $token = (string) $request->query('token', '');
        $ownsOrder = $request->user() !== null && $order->user_id === $request->user()->id;

        abort_unless($ownsOrder || ($token !== '' && hash_equals($order->guest_token, $token)), 404);

        return new OrderResource($order);
    }
}
