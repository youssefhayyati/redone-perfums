<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CollectionRequest;
use App\Models\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CollectionController extends Controller
{
    public function index(): JsonResponse
    {
        $collections = Collection::query()->withCount('products')->orderBy('sort_order')->get();

        return response()->json(['data' => $collections->map(fn (Collection $c) => $this->present($c))]);
    }

    public function show(Collection $collection): JsonResponse
    {
        $collection->load('products:id,name,status');

        return response()->json(['data' => [
            ...$this->present($collection),
            'products' => $collection->products->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'status' => $p->status->value])->values(),
        ]]);
    }

    public function store(CollectionRequest $request): JsonResponse
    {
        $collection = DB::transaction(function () use ($request) {
            $collection = Collection::create($this->attributes($request));
            $this->syncProducts($collection, $request->validated('product_ids') ?? []);

            return $collection;
        });

        return response()->json(['data' => $this->present($collection->refresh()->loadCount('products'))], 201);
    }

    public function update(CollectionRequest $request, Collection $collection): JsonResponse
    {
        DB::transaction(function () use ($request, $collection) {
            $collection->update($this->attributes($request));
            if ($request->has('product_ids')) {
                $this->syncProducts($collection, $request->validated('product_ids') ?? []);
            }
        });

        return response()->json(['data' => $this->present($collection->loadCount('products'))]);
    }

    public function destroy(Collection $collection): JsonResponse
    {
        $collection->delete();

        return response()->json(['message' => 'Collection supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function attributes(CollectionRequest $request): array
    {
        return [
            ...$request->safe()->except('product_ids'),
            'is_visible' => $request->boolean('is_visible'),
            'is_featured' => $request->boolean('is_featured'),
            'sort_order' => $request->integer('sort_order'),
        ];
    }

    /**
     * @param  list<int>  $productIds  in display order
     */
    private function syncProducts(Collection $collection, array $productIds): void
    {
        $collection->products()->sync(
            collect($productIds)->values()->mapWithKeys(fn ($id, $position) => [$id => ['sort_order' => $position]])->all()
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Collection $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'name_ar' => $c->name_ar,
            'slug' => $c->slug,
            'tagline' => $c->tagline,
            'tagline_ar' => $c->tagline_ar,
            'description' => $c->description,
            'description_ar' => $c->description_ar,
            'image_path' => $c->image_path,
            'image_url' => $c->imageUrl(),
            'accent_color' => $c->accent_color,
            'is_visible' => $c->is_visible,
            'is_featured' => $c->is_featured,
            'is_demo' => $c->is_demo,
            'sort_order' => $c->sort_order,
            'products_count' => $c->products_count ?? null,
        ];
    }
}
