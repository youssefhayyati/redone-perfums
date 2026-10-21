<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminOrderResource;
use App\Models\User;
use App\Support\MoroccanPhone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Registered customers only. Guest orders are searchable from the orders screen.
 * Only the fields needed for customer service are exposed.
 */
class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $customers = User::query()
            ->where('role', UserRole::Customer)
            ->when($search = trim((string) $request->query('search')), function ($q) use ($search) {
                $term = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';
                $phone = MoroccanPhone::normalize($search);
                $q->where(fn ($w) => $w->where('name', 'like', $term)->orWhere('email', 'like', $term)
                    ->when($phone, fn ($w) => $w->orWhere('phone', $phone)));
            })
            ->withCount(['orders' => fn ($q) => $q->where('status', '!=', OrderStatus::Cancelled)])
            ->withSum(['orders as total_spent' => fn ($q) => $q->where('status', '!=', OrderStatus::Cancelled)], 'total')
            ->withMax('orders as last_order_at', 'placed_at')
            ->latest()
            ->paginate(min(100, $request->integer('per_page', 20)));

        return response()->json([
            'data' => $customers->getCollection()->map(fn (User $u) => $this->present($u)),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'total' => $customers->total(),
                'per_page' => $customers->perPage(),
            ],
        ]);
    }

    public function show(User $customer): JsonResponse
    {
        abort_unless($customer->role === UserRole::Customer, 404);

        $customer->loadCount(['orders' => fn ($q) => $q->where('status', '!=', OrderStatus::Cancelled)])
            ->loadSum(['orders as total_spent' => fn ($q) => $q->where('status', '!=', OrderStatus::Cancelled)], 'total')
            ->loadMax('orders as last_order_at', 'placed_at');

        $orders = $customer->orders()->latest('placed_at')->limit(50)->get();

        return response()->json(['data' => [
            ...$this->present($customer),
            'orders' => AdminOrderResource::collection($orders)->resolve(),
        ]]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone ? MoroccanPhone::format($u->phone) : null,
            'is_active' => $u->is_active,
            'orders_count' => (int) $u->orders_count,
            'total_spent' => (int) $u->total_spent,
            'last_order_at' => $u->last_order_at ? (string) $u->last_order_at : null,
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }
}
