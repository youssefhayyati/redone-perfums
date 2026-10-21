<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\InventoryReason;
use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Services\Inventory\InventoryManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryController extends Controller
{
    public function __construct(private readonly InventoryManager $inventory) {}

    public function index(Request $request): JsonResponse
    {
        $variants = ProductVariant::query()
            ->whereHas('product', fn ($q) => $q->withoutTrashed())
            ->with('product:id,name,slug,status')
            ->when($request->query('filter') === 'low', fn ($q) => $q->whereColumn('stock', '<=', 'low_stock_threshold')->where('stock', '>', 0))
            ->when($request->query('filter') === 'out', fn ($q) => $q->where('stock', '<=', 0))
            ->when($search = trim((string) $request->query('search')), function ($q) use ($search) {
                $term = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';
                $q->where(fn ($w) => $w->where('sku', 'like', $term)->orWhereHas('product', fn ($p) => $p->where('name', 'like', $term)));
            })
            ->orderBy('stock')
            ->orderBy('id')
            ->paginate(min(100, $request->integer('per_page', 25)));

        return response()->json([
            'data' => $variants->getCollection()->map(fn (ProductVariant $v) => $this->present($v)),
            'meta' => [
                'current_page' => $variants->currentPage(),
                'last_page' => $variants->lastPage(),
                'total' => $variants->total(),
                'per_page' => $variants->perPage(),
            ],
            'counts' => [
                'low' => ProductVariant::query()->whereColumn('stock', '<=', 'low_stock_threshold')->where('stock', '>', 0)->whereHas('product', fn ($q) => $q->withoutTrashed())->count(),
                'out' => ProductVariant::query()->where('stock', '<=', 0)->whereHas('product', fn ($q) => $q->withoutTrashed())->count(),
            ],
        ]);
    }

    public function adjust(Request $request, ProductVariant $variant): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', Rule::in(['set', 'add', 'remove'])],
            'quantity' => ['required', 'integer', $request->input('mode') === 'set' ? 'min:0' : 'min:1', 'max:100000'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $note = $data['note'] ?? null;

        match ($data['mode']) {
            'set' => $this->inventory->set($variant, $data['quantity'], $request->user(), $note),
            'add' => $this->inventory->adjust($variant, $data['quantity'], InventoryReason::Restock, $request->user(), $note),
            'remove' => $this->inventory->adjust($variant, -$data['quantity'], InventoryReason::Adjustment, $request->user(), $note),
        };

        return response()->json(['data' => $this->present($variant->fresh('product'))]);
    }

    public function movements(ProductVariant $variant): JsonResponse
    {
        $movements = $variant->movements()->with(['user:id,name', 'order:id,reference'])->limit(100)->get();

        return response()->json(['data' => $movements->map(fn ($m) => [
            'id' => $m->id,
            'change' => $m->change,
            'stock_after' => $m->stock_after,
            'reason' => $m->reason->value,
            'note' => $m->note,
            'user' => $m->user?->name,
            'order' => $m->order?->reference,
            'created_at' => $m->created_at->toIso8601String(),
        ])]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(ProductVariant $v): array
    {
        return [
            'id' => $v->id,
            'product_id' => $v->product_id,
            'product' => $v->product?->name,
            'product_status' => $v->product?->status->value,
            'label' => $v->label(),
            'sku' => $v->sku,
            'price' => $v->price,
            'stock' => $v->stock,
            'low_stock_threshold' => $v->low_stock_threshold,
            'is_active' => $v->is_active,
            'availability' => $v->availability(),
        ];
    }
}
