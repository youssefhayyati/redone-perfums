<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\PackEligibility;
use App\Enums\PackType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PackRequest;
use App\Models\Pack;
use App\Services\Packs\PackResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PackController extends Controller
{
    public function __construct(private readonly PackResolver $resolver) {}

    public function index(): JsonResponse
    {
        $packs = Pack::query()->with('items')->orderBy('sort_order')->get();

        return response()->json(['data' => $packs->map(fn (Pack $p) => [
            ...$this->present($p),
            'eligible_count' => $p->isCustom() ? $this->resolver->eligibleVariantsQuery($p)->count() : null,
        ])]);
    }

    public function show(Pack $pack): JsonResponse
    {
        $pack->load(['items.variant.product', 'eligibleCollections:id', 'eligibleProducts:id']);

        return response()->json(['data' => [
            ...$this->present($pack),
            'collection_ids' => $pack->eligibleCollections->pluck('id'),
            'product_ids' => $pack->eligibleProducts->pluck('id'),
            'items' => $pack->items->map(fn ($i) => [
                'variant_id' => $i->product_variant_id,
                'quantity' => $i->quantity,
                'label' => $i->variant ? $i->variant->product->name.' — '.$i->variant->label() : 'Variante supprimée',
            ]),
            'eligible_count' => $pack->isCustom() ? $this->resolver->eligibleVariantsQuery($pack)->count() : null,
        ]]);
    }

    public function store(PackRequest $request): JsonResponse
    {
        $pack = DB::transaction(function () use ($request) {
            $pack = Pack::create($this->attributes($request));
            $this->syncRules($pack, $request);

            return $pack;
        });

        return response()->json(['data' => $this->present($pack->fresh('items'))], 201);
    }

    public function update(PackRequest $request, Pack $pack): JsonResponse
    {
        DB::transaction(function () use ($request, $pack) {
            $pack->update($this->attributes($request));
            $this->syncRules($pack, $request);
        });

        return response()->json(['data' => $this->present($pack->fresh('items'))]);
    }

    public function destroy(Pack $pack): JsonResponse
    {
        // Order lines keep their snapshot (pack_id becomes null); carts lose the line.
        $pack->delete();

        return response()->json(['message' => 'Coffret supprimé.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function attributes(PackRequest $request): array
    {
        $custom = $request->input('type') === PackType::Custom->value;
        $data = $request->safe()->except(['collection_ids', 'product_ids', 'items']);

        return [
            ...$data,
            'is_active' => $request->boolean('is_active'),
            'allow_duplicates' => $custom && $request->boolean('allow_duplicates'),
            'sort_order' => $request->integer('sort_order'),
            'selection_count' => $custom ? $request->integer('selection_count') : null,
            'allowed_sizes' => $custom && ! empty($data['allowed_sizes']) ? array_values(array_unique(array_map('intval', $data['allowed_sizes']))) : null,
            'eligibility' => $custom ? $data['eligibility'] : PackEligibility::All->value,
        ];
    }

    private function syncRules(Pack $pack, PackRequest $request): void
    {
        $custom = $pack->isCustom();

        $pack->eligibleCollections()->sync($custom && $pack->eligibility === PackEligibility::Collections ? ($request->validated('collection_ids') ?? []) : []);
        $pack->eligibleProducts()->sync($custom && $pack->eligibility === PackEligibility::Products ? ($request->validated('product_ids') ?? []) : []);

        $pack->items()->delete();
        if (! $custom) {
            foreach (array_values($request->validated('items') ?? []) as $position => $item) {
                $pack->items()->create([
                    'product_variant_id' => $item['variant_id'],
                    'quantity' => $item['quantity'],
                    'sort_order' => $position,
                ]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Pack $p): array
    {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'name_ar' => $p->name_ar,
            'slug' => $p->slug,
            'type' => $p->type->value,
            'tagline' => $p->tagline,
            'tagline_ar' => $p->tagline_ar,
            'description' => $p->description,
            'description_ar' => $p->description_ar,
            'image_path' => $p->image_path,
            'image_url' => $p->imageUrl(),
            'selection_count' => $p->selection_count,
            'allowed_sizes' => $p->allowed_sizes,
            'eligibility' => $p->eligibility->value,
            'allow_duplicates' => $p->allow_duplicates,
            'pricing_type' => $p->pricing_type->value,
            'price' => $p->price,
            'discount_value' => $p->discount_value,
            'pricing_label' => PackResolver::describePricing($p),
            'is_active' => $p->is_active,
            'is_demo' => $p->is_demo,
            'sort_order' => $p->sort_order,
            'bottle_count' => $p->bottleCount(),
            'starting_price' => $this->resolver->startingPrice($p),
        ];
    }
}
