<?php

namespace App\Services\Packs;

use App\Enums\PackEligibility;
use App\Enums\PackPricing;
use App\Models\Pack;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Validation\ValidationException;

/**
 * The single authority on what a pack may contain and what it costs.
 */
final class PackResolver
{
    /**
     * Active variants of published products that the pack accepts.
     *
     * @return EloquentCollection<int, ProductVariant>
     */
    public function eligibleVariants(Pack $pack): EloquentCollection
    {
        return $this->eligibleVariantsQuery($pack)
            ->with(['product' => fn ($q) => $q->with(['family', 'images', 'notes'])])
            ->get()
            ->sortBy(fn (ProductVariant $v) => [$v->product->sort_order, $v->product->name, $v->size_ml])
            ->values();
    }

    /**
     * @return Builder<ProductVariant>
     */
    public function eligibleVariantsQuery(Pack $pack): Builder
    {
        $query = ProductVariant::query()
            ->where('is_active', true)
            ->whereHas('product', function (Builder $q) use ($pack) {
                $q->published();

                if ($pack->eligibility === PackEligibility::Collections) {
                    $ids = $pack->eligibleCollections()->pluck('collections.id');
                    $q->whereHas('collections', fn (Builder $c) => $c->whereIn('collections.id', $ids));
                }

                if ($pack->eligibility === PackEligibility::Products) {
                    $q->whereIn('products.id', $pack->eligibleProducts()->pluck('products.id'));
                }
            });

        if (! empty($pack->allowed_sizes)) {
            $query->whereIn('size_ml', array_map('intval', $pack->allowed_sizes));
        }

        return $query;
    }

    public function accepts(Pack $pack, ProductVariant $variant): bool
    {
        return $this->eligibleVariantsQuery($pack)->whereKey($variant->getKey())->exists();
    }

    /**
     * Validate a customer's selection for a custom pack and return the variants
     * in the order chosen. Stock is checked separately, against the whole cart.
     *
     * @param  array<int, mixed>  $variantIds
     * @return list<ProductVariant>
     *
     * @throws ValidationException
     */
    public function resolveSelection(Pack $pack, array $variantIds, string $field = 'selections'): array
    {
        if (! $pack->is_active) {
            throw ValidationException::withMessages([$field => __('Ce coffret n’est plus proposé.')]);
        }

        if (! $pack->isCustom()) {
            return $this->fixedContents($pack);
        }

        $ids = array_values(array_map('intval', $variantIds));
        $required = (int) $pack->selection_count;

        if (count($ids) !== $required) {
            throw ValidationException::withMessages([
                $field => __('Ce coffret se compose de :required parfums : vous en avez choisi :chosen.', ['required' => $required, 'chosen' => count($ids)]),
            ]);
        }

        $eligible = $this->eligibleVariantsQuery($pack)
            ->whereIn('id', array_unique($ids))
            ->with('product')
            ->get()
            ->keyBy('id');

        $variants = [];
        foreach ($ids as $id) {
            $variant = $eligible->get($id);
            if ($variant === null) {
                throw ValidationException::withMessages([$field => __('Un des parfums choisis ne peut pas entrer dans ce coffret.')]);
            }
            $variants[] = $variant;
        }

        if (! $pack->allow_duplicates) {
            $productIds = array_map(fn (ProductVariant $v) => $v->product_id, $variants);
            if (count($productIds) !== count(array_unique($productIds))) {
                throw ValidationException::withMessages([$field => __('Chaque parfum ne peut être choisi qu’une fois dans ce coffret.')]);
            }
        }

        return $variants;
    }

    /**
     * Contents of a fixed pack, expanded to one entry per bottle.
     *
     * @return list<ProductVariant>
     *
     * @throws ValidationException
     */
    public function fixedContents(Pack $pack): array
    {
        $pack->loadMissing('items.variant.product');

        $variants = [];
        foreach ($pack->items as $item) {
            $variant = $item->variant;
            if ($variant === null || ! $variant->isSellable()) {
                throw ValidationException::withMessages(['pack' => __('Ce coffret est momentanément indisponible.')]);
            }
            for ($i = 0; $i < $item->quantity; $i++) {
                $variants[] = $variant;
            }
        }

        if ($variants === []) {
            throw ValidationException::withMessages(['pack' => __('Ce coffret est momentanément indisponible.')]);
        }

        return $variants;
    }

    /**
     * Price a list of variants (one entry per bottle) under the pack's pricing rule.
     *
     * @param  list<ProductVariant>  $variants
     */
    public function quote(Pack $pack, array $variants): PackQuote
    {
        $compareAt = array_sum(array_map(fn (ProductVariant $v) => $v->price, $variants));

        $price = match ($pack->pricing_type) {
            PackPricing::Fixed => (int) $pack->price,
            // Percentage packs are rounded to the whole dirham.
            PackPricing::Percent => (int) (round(($compareAt - intdiv($compareAt * min((int) $pack->discount_value, 100), 100)) / 100) * 100),
            PackPricing::Amount => max(0, $compareAt - (int) $pack->discount_value),
        };

        return new PackQuote($variants, $compareAt, $price);
    }

    /**
     * The lowest possible price of a custom pack, for "à partir de" displays.
     */
    public function startingPrice(Pack $pack): ?int
    {
        if ($pack->pricing_type === PackPricing::Fixed) {
            return (int) $pack->price;
        }

        if (! $pack->isCustom()) {
            try {
                return $this->quote($pack, $this->fixedContents($pack))->price;
            } catch (ValidationException) {
                return null;
            }
        }

        $prices = $this->eligibleVariantsQuery($pack)
            ->where('stock', '>', 0)
            ->orderBy('price')
            ->get(['id', 'product_id', 'price']);

        $needed = (int) $pack->selection_count;
        $picked = $pack->allow_duplicates
            ? $prices->take(1)->flatMap(fn ($v) => array_fill(0, $needed, $v))
            : $prices->unique('product_id')->take($needed);

        if ($picked->count() < $needed) {
            return null;
        }

        return $this->quote($pack, $picked->values()->all())->price;
    }

    public static function describePricing(Pack $pack): string
    {
        return match ($pack->pricing_type) {
            PackPricing::Fixed => __('Prix fixe'),
            PackPricing::Percent => __('-:percent % sur la sélection', ['percent' => $pack->discount_value]),
            PackPricing::Amount => __('-:amount DH sur la sélection', ['amount' => intdiv((int) $pack->discount_value, 100)]),
        };
    }
}
