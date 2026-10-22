<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FragranceFamily;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FamilyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => FragranceFamily::query()->withCount('products')->orderBy('sort_order')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $family = FragranceFamily::create($this->validated($request));

        return response()->json(['data' => $family], 201);
    }

    public function update(Request $request, FragranceFamily $family): JsonResponse
    {
        $family->update($this->validated($request, $family));

        return response()->json(['data' => $family]);
    }

    public function destroy(FragranceFamily $family): JsonResponse
    {
        // Products keep existing without a family (foreign key is nullOnDelete).
        $family->delete();

        return response()->json(['message' => 'Famille supprimée.']);
    }

    /**
     * Autocomplete for the olfactory pyramid editor.
     */
    public function notes(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));

        return response()->json([
            'data' => Note::query()
                ->when($search !== '', fn ($q) => $q->where('name', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%'))
                ->orderBy('name')->limit(20)->pluck('name'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?FragranceFamily $family = null): array
    {
        $request->merge(['slug' => $request->filled('slug') ? $request->input('slug') : Str::slug((string) $request->input('name'))]);

        if ($request->has('sort_order') && $request->input('sort_order') === null) {
            $request->merge(['sort_order' => 0]);
        }

        return $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'name_ar' => ['nullable', 'string', 'max:80'],
            'slug' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('fragrance_families', 'slug')->ignore($family?->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'description_ar' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ]);
    }
}
