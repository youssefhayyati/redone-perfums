<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\UpdateProfileRequest;
use App\Http\Resources\OrderResource;
use App\Support\MoroccanPhone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rules\Password;

class AccountController extends Controller
{
    public function orders(Request $request): AnonymousResourceCollection
    {
        $orders = $request->user()->orders()
            ->with('items.selections')
            ->latest('placed_at')
            ->paginate(10);

        return OrderResource::collection($orders);
    }

    public function order(Request $request, string $reference): OrderResource
    {
        $order = $request->user()->orders()
            ->where('reference', $reference)
            ->with('items.selections')
            ->firstOrFail();

        return new OrderResource($order);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->fill([
            'name' => trim($request->string('name')),
            'phone' => MoroccanPhone::normalize($request->input('phone')),
        ])->save();

        return response()->json(['user' => AuthController::present($user)]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->forceFill(['password' => $request->string('password')])->save();

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }
}
