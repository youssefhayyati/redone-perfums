<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\City;
use Illuminate\Http\JsonResponse;

class DeliveryController extends Controller
{
    public function cities(): JsonResponse
    {
        $cities = City::query()->deliverable()
            ->with('zone')
            ->orderBy('sort_order')->orderBy('name')
            ->get();

        return response()->json([
            'data' => $cities->map(fn (City $city) => [
                'id' => $city->id,
                'name' => $city->name,
                'region' => $city->region,
                'fee' => $city->zone->fee,
                'free_shipping_threshold' => $city->zone->free_shipping_threshold,
                'estimate' => $city->zone->delivery_estimate,
            ]),
        ]);
    }
}
