<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CouponRequest;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Coupon::query()->latest()->get()->map(fn (Coupon $c) => $this->present($c))]);
    }

    public function store(CouponRequest $request): JsonResponse
    {
        $coupon = Coupon::create([...$request->validated(), 'is_active' => $request->boolean('is_active')]);

        return response()->json(['data' => $this->present($coupon->refresh())], 201);
    }

    public function update(CouponRequest $request, Coupon $coupon): JsonResponse
    {
        $coupon->update([...$request->validated(), 'is_active' => $request->boolean('is_active')]);

        return response()->json(['data' => $this->present($coupon)]);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        // Orders keep the code as text (coupon_code); the foreign key becomes null.
        $coupon->delete();

        return response()->json(['message' => 'Code supprimé.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Coupon $c): array
    {
        return [
            'id' => $c->id,
            'code' => $c->code,
            'description' => $c->description,
            'type' => $c->type->value,
            'value' => $c->value,
            'min_subtotal' => $c->min_subtotal,
            'max_uses' => $c->max_uses,
            'used_count' => $c->used_count,
            'starts_at' => $c->starts_at?->toIso8601String(),
            'ends_at' => $c->ends_at?->toIso8601String(),
            'is_active' => $c->is_active,
            'is_currently_valid' => $c->rejectionReason(PHP_INT_MAX) === null,
        ];
    }
}
