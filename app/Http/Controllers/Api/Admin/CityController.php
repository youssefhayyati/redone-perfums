<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\City;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CityController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => City::query()->with('zone:id,name')->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $city = City::create($this->validated($request));

        return response()->json(['data' => $city->load('zone:id,name')], 201);
    }

    public function update(Request $request, City $city): JsonResponse
    {
        $city->update($this->validated($request, $city));

        return response()->json(['data' => $city->load('zone:id,name')]);
    }

    public function destroy(City $city): JsonResponse
    {
        // Past orders keep the city name as a snapshot.
        $city->delete();

        return response()->json(['message' => 'Ville supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?City $city = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('cities', 'name')->ignore($city?->id)],
            'region' => ['nullable', 'string', 'max:120'],
            'delivery_zone_id' => ['nullable', 'integer', 'exists:delivery_zones,id'],
            'is_active' => ['boolean'],
        ]);

        return [...$data, 'is_active' => $request->boolean('is_active')];
    }
}
