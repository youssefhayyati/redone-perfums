<?php

namespace App\Services\Catalog;

use App\Http\Resources\ProductCardResource;
use App\Models\Collection;
use App\Models\FragranceFamily;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Storefront catalog filtering. Every filter here changes the SQL query; there are
 * no cosmetic filters.
 */
final class ProductSearch
{
    public const SORTS = ['featured', 'price_asc', 'price_desc', 'popular', 'newest'];

    /**
     * @return Builder<Product>
     */
    public function query(Request $request): Builder
    {
        $sizes = $this->intList($request->query('size'));
        $min = $request->filled('min_price') ? max(0, (int) $request->query('min_price')) : null;
        $max = $request->filled('max_price') ? max(0, (int) $request->query('max_price')) : null;

        // Size and price apply to the same variant: "a 50 ml under 600 DH".
        $variantFilter = function (Builder $q) use ($sizes, $min, $max) {
            $q->where('is_active', true)
                ->when($sizes !== [], fn ($q) => $q->whereIn('size_ml', $sizes))
                ->when($min !== null, fn ($q) => $q->where('price', '>=', $min))
                ->when($max !== null, fn ($q) => $q->where('price', '<=', $max));
        };

        $query = Product::query()
            ->published()
            ->whereHas('variants', $variantFilter)
            ->with(ProductCardResource::relations())
            ->withMin(['variants as min_price' => fn ($q) => $q->where('is_active', true)], 'price');

        if ($search = trim((string) $request->query('q', ''))) {
            $term = '%'.str_replace(['%', '_'], ['\%', '\_'], mb_substr($search, 0, 80)).'%';
            $query->where(fn (Builder $q) => $q
                ->where('name', 'like', $term)
                ->orWhere('name_ar', 'like', $term)
                ->orWhere('tagline', 'like', $term)
                ->orWhere('tagline_ar', 'like', $term)
                ->orWhereHas('notes', fn ($n) => $n->where('name', 'like', $term)->orWhere('name_ar', 'like', $term))
                ->orWhereHas('family', fn ($f) => $f->where('name', 'like', $term)->orWhere('name_ar', 'like', $term)));
        }

        if ($families = $this->slugList($request->query('family'))) {
            $query->whereHas('family', fn ($q) => $q->whereIn('slug', $families));
        }

        if ($collections = $this->slugList($request->query('collection'))) {
            $query->whereHas('collections', fn ($q) => $q->where('is_visible', true)->whereIn('slug', $collections));
        }

        if ($ids = $this->intList($request->query('ids'))) {
            $query->whereIn('products.id', array_slice($ids, 0, 24));
        }

        match ($this->sort($request)) {
            'price_asc' => $query->orderBy('min_price')->orderBy('name'),
            'price_desc' => $query->orderByDesc('min_price')->orderBy('name'),
            'popular' => $query->orderByDesc('sales_count')->orderBy('name'),
            'newest' => $query->orderByDesc('published_at')->orderByDesc('id'),
            default => $query->orderByDesc('is_featured')->orderBy('sort_order')->orderBy('name'),
        };

        return $query;
    }

    public function sort(Request $request): string
    {
        $sort = (string) $request->query('sort', 'featured');

        return in_array($sort, self::SORTS, true) ? $sort : 'featured';
    }

    /**
     * Options that actually exist in the published catalog.
     *
     * @return array<string, mixed>
     */
    public function facets(): array
    {
        $publishedVariants = ProductVariant::query()
            ->where('is_active', true)
            ->whereHas('product', fn ($q) => $q->published());

        return [
            'families' => FragranceFamily::query()
                ->whereHas('products', fn ($q) => $q->published())
                ->withCount(['products' => fn ($q) => $q->published()])
                ->orderBy('sort_order')->orderBy('name')
                ->get(FragranceFamily::withTranslations(['id', 'name', 'slug']))
                ->map(fn ($f) => ['name' => $f->translated('name'), 'slug' => $f->slug, 'count' => $f->products_count]),
            'collections' => Collection::query()
                ->where('is_visible', true)
                ->whereHas('products', fn ($q) => $q->published())
                ->orderBy('sort_order')
                ->get(Collection::withTranslations(['id', 'name', 'slug']))
                ->map(fn ($c) => ['name' => $c->translated('name'), 'slug' => $c->slug]),
            'sizes' => (clone $publishedVariants)->distinct()->orderBy('size_ml')->pluck('size_ml')->map(fn ($s) => (int) $s),
            'price' => [
                'min' => (int) (clone $publishedVariants)->min('price'),
                'max' => (int) (clone $publishedVariants)->max('price'),
            ],
            'sorts' => self::SORTS,
        ];
    }

    /**
     * @return list<string>
     */
    private function slugList(mixed $value): array
    {
        $items = is_array($value) ? $value : explode(',', (string) $value);

        return array_values(array_filter(array_map(fn ($s) => preg_replace('/[^a-z0-9\-]/', '', strtolower(trim((string) $s))), $items)));
    }

    /**
     * @return list<int>
     */
    private function intList(mixed $value): array
    {
        $items = is_array($value) ? $value : explode(',', (string) $value);

        return array_values(array_unique(array_filter(array_map('intval', $items), fn ($i) => $i > 0)));
    }
}
