<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryZoneController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => DeliveryZone::query()->withCount('cities')->orderBy('sort_order')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $zone = DeliveryZone::create($this->validated($request));

        return response()->json(['data' => $zone->loadCount('cities')], 201);
    }

    public function update(Request $request, DeliveryZone $deliveryZone): JsonResponse
    {
        $deliveryZone->update($this->validated($request));

        return response()->json(['data' => $deliveryZone->loadCount('cities')]);
    }

    public function destroy(DeliveryZone $deliveryZone): JsonResponse
    {
        // Cities of a deleted zone become undeliverable until reassigned.
        $deliveryZone->delete();

        return response()->json(['message' => 'Zone supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'fee' => ['required', 'integer', 'min:0', 'max:1000000'],
            'free_shipping_threshold' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'delivery_estimate' => ['nullable', 'string', 'max:120'],
            'delivery_estimate_ar' => ['nullable', 'string', 'max:120'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        return [...$data, 'is_active' => $request->boolean('is_active'), 'sort_order' => $request->integer('sort_order')];
    }
}
