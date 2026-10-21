<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\InventoryReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\Admin\AdminProductResource;
use App\Models\Collection;
use App\Models\FragranceFamily;
use App\Models\Note;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Inventory\InventoryManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function __construct(private readonly InventoryManager $inventory) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::query()
            ->with(['variants', 'images', 'family'])
            ->when($request->query('trashed') === 'only', fn ($q) => $q->onlyTrashed())
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->query('status')))
            ->when($request->filled('family'), fn ($q) => $q->where('fragrance_family_id', $request->integer('family')))
            ->when($request->filled('collection'), fn ($q) => $q->whereHas('collections', fn ($c) => $c->whereKey($request->integer('collection'))))
            ->when($request->boolean('featured'), fn ($q) => $q->where('is_featured', true))
            ->when($search = trim((string) $request->query('search')), function ($q) use ($search) {
                $term = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';
                $q->where(fn ($w) => $w->where('name', 'like', $term)
                    ->orWhereHas('variants', fn ($v) => $v->where('sku', 'like', $term)));
            });

        match ($request->query('sort')) {
            'name' => $query->orderBy('name'),
            'sales' => $query->orderByDesc('sales_count'),
            'updated' => $query->latest('updated_at'),
            default => $query->orderBy('sort_order')->orderBy('name'),
        };

        return AdminProductResource::collection($query->paginate(min(100, $request->integer('per_page', 20))));
    }

    /**
     * Reference data for product, collection and pack forms.
     */
    public function options(): JsonResponse
    {
        return response()->json([
            'families' => FragranceFamily::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'collections' => Collection::query()->orderBy('sort_order')->get(['id', 'name']),
            'notes' => Note::query()->orderBy('name')->pluck('name'),
            'sizes' => ProductVariant::query()->distinct()->orderBy('size_ml')->pluck('size_ml'),
            'products' => Product::query()->orderBy('name')->with('variants:id,product_id,size_ml,sku,price,stock,is_active')
                ->get(['id', 'name', 'status'])
                ->map(fn (Product $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'status' => $p->status->value,
                    'variants' => $p->variants->map(fn ($v) => ['id' => $v->id, 'label' => $v->label(), 'sku' => $v->sku, 'price' => $v->price, 'stock' => $v->stock, 'is_active' => $v->is_active]),
                ]),
            'badges' => Product::BADGES,
            'genders' => Product::GENDERS,
        ]);
    }

    public function show(Product $product): AdminProductResource
    {
        return new AdminProductResource($product->load(['variants', 'images', 'family', 'notes', 'collections']));
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $product = DB::transaction(function () use ($request) {
            $product = Product::create($this->attributes($request));
            $this->syncRelations($product, $request);

            return $product;
        });

        return (new AdminProductResource($product->fresh(['variants', 'images', 'family', 'notes', 'collections'])))
            ->response()->setStatusCode(201);
    }

    public function update(ProductRequest $request, Product $product): AdminProductResource
    {
        DB::transaction(function () use ($request, $product) {
            $product->update($this->attributes($request));
            $this->syncRelations($product, $request);
        });

        return new AdminProductResource($product->fresh(['variants', 'images', 'family', 'notes', 'collections']));
    }

    /**
     * Archive (soft delete). Orders keep their snapshots; the product disappears
     * from the storefront and from packs.
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Produit archivé.']);
    }

    public function restore(Product $product): AdminProductResource
    {
        $product->restore();

        return new AdminProductResource($product->fresh(['variants', 'images', 'family']));
    }

    /**
     * @return array<string, mixed>
     */
    private function attributes(ProductRequest $request): array
    {
        return [
            ...$request->safe()->except(['variants', 'notes', 'collection_ids']),
            'is_featured' => $request->boolean('is_featured'),
            'sort_order' => $request->integer('sort_order'),
        ];
    }

    private function syncRelations(Product $product, ProductRequest $request): void
    {
        $actor = $request->user();
        $keptIds = [];

        foreach (array_values($request->validated('variants')) as $position => $data) {
            $attributes = [
                'size_ml' => $data['size_ml'],
                'sku' => mb_strtoupper($data['sku']),
                'price' => $data['price'],
                'compare_at_price' => $data['compare_at_price'] ?? null,
                'low_stock_threshold' => $data['low_stock_threshold'] ?? 5,
                'is_active' => $data['is_active'] ?? true,
                'sort_order' => $position,
            ];

            if (! empty($data['id'])) {
                $variant = $product->variants()->whereKey($data['id'])->firstOrFail();
                $variant->update($attributes);
                if ((int) $data['stock'] !== $variant->stock) {
                    $this->inventory->set($variant, (int) $data['stock'], $actor, 'Modifié depuis la fiche produit');
                }
            } else {
                $variant = $product->variants()->create($attributes);
                if ((int) $data['stock'] > 0) {
                    $this->inventory->set($variant, (int) $data['stock'], $actor, 'Stock initial', InventoryReason::Initial);
                }
            }

            $keptIds[] = $variant->id;
        }

        // Variants still referenced by packs or orders are deactivated, not deleted.
        $product->variants()->whereNotIn('id', $keptIds)->get()->each(function (ProductVariant $variant) {
            $referenced = DB::table('pack_items')->where('product_variant_id', $variant->id)->exists()
                || DB::table('order_items')->where('product_variant_id', $variant->id)->exists()
                || DB::table('order_item_selections')->where('product_variant_id', $variant->id)->exists();

            $referenced ? $variant->update(['is_active' => false]) : $variant->delete();
        });

        if ($request->has('notes')) {
            $product->syncNotes($request->validated('notes') ?? []);
        }

        if ($request->has('collection_ids')) {
            $product->collections()->sync($request->validated('collection_ids') ?? []);
        }
    }
}
