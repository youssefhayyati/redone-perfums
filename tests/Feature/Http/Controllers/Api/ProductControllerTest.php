<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Models\Collection;
use App\Models\FragranceFamily;
use App\Models\Product;
use App\Models\ProductVariant;
use Closure;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class ProductControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_only_published_products_with_an_active_variant(): void
    {
        Product::factory()->published()->withVariant()->named('Ambre Nuit')->create();
        Product::factory()->withVariant()->named('Bois Sacré')->create(['published_at' => null]);
        Product::factory()->draft()->withVariant()->create();
        Product::factory()->archived()->withVariant()->create();
        Product::factory()->scheduled()->withVariant()->create();
        Product::factory()->published()->trashed()->withVariant()->create();
        Product::factory()->published()->has(ProductVariant::factory()->inactive(), 'variants')->create();
        Product::factory()->published()->create();

        $response = $this->getJson('/api/products');

        $response->assertOk();
        $this->assertSame(['ambre-nuit', 'bois-sacre'], $this->slugs($response));
    }

    public function test_index_card_exposes_server_prices_and_stock_signals(): void
    {
        $product = Product::factory()->published()->create();
        ProductVariant::factory()->for($product)->outOfStock()->create(['size_ml' => 30, 'price' => 25000]);
        ProductVariant::factory()->for($product)->lowStock()->create(['size_ml' => 50, 'price' => 45000]);
        ProductVariant::factory()->for($product)->create(['size_ml' => 100, 'price' => 80000, 'stock' => 30]);
        ProductVariant::factory()->for($product)->inactive()->create(['size_ml' => 200, 'price' => 10000]);

        $response = $this->getJson('/api/products');

        $response->assertOk()
            ->assertJsonPath('data.0.price_from', 25000)
            ->assertJsonPath('data.0.has_price_range', true)
            ->assertJsonPath('data.0.in_stock', true)
            ->assertJsonPath('data.0.variants.*.size_ml', [30, 50, 100])
            ->assertJsonPath('data.0.variants.*.availability', ['out_of_stock', 'low_stock', 'in_stock'])
            ->assertJsonPath('data.0.variants.*.stock_left', [null, 2, null]);
    }

    public function test_index_filters_by_family_slug(): void
    {
        $woody = FragranceFamily::factory()->named('Boisé')->create();
        Product::factory()->published()->withVariant()->for($woody, 'family')->named('Cèdre Blanc')->create();
        Product::factory()->published()->withVariant()->named('Fleur de Lune')->create();

        $response = $this->getJson('/api/products?family=boise');

        $response->assertOk();
        $this->assertSame(['cedre-blanc'], $this->slugs($response));
    }

    public function test_index_filters_by_visible_collection_slug(): void
    {
        $collection = Collection::factory()->named('Nuits d’Orient')->create();
        $inCollection = Product::factory()->published()->withVariant()->named('Oud Royal')->create();
        $collection->products()->attach($inCollection);
        Product::factory()->published()->withVariant()->named('Néroli Frais')->create();

        $response = $this->getJson('/api/products?collection=nuits-dorient');

        $response->assertOk();
        $this->assertSame(['oud-royal'], $this->slugs($response));
    }

    public function test_index_finds_nothing_through_a_hidden_collection(): void
    {
        $hidden = Collection::factory()->hidden()->named('Avant-première')->create();
        $hidden->products()->attach(Product::factory()->published()->withVariant()->create());

        $response = $this->getJson('/api/products?collection=avant-premiere');

        $response->assertOk();
        $this->assertSame([], $this->slugs($response));
    }

    public function test_index_applies_size_and_price_filters_to_the_same_variant(): void
    {
        $matching = Product::factory()->published()->named('Ambre Nuit')->create();
        ProductVariant::factory()->for($matching)->create(['size_ml' => 100, 'price' => 58000]);
        $cheapOnlyInSmallSize = Product::factory()->published()->create();
        ProductVariant::factory()->for($cheapOnlyInSmallSize)->create(['size_ml' => 50, 'price' => 40000]);
        ProductVariant::factory()->for($cheapOnlyInSmallSize)->create(['size_ml' => 100, 'price' => 90000]);
        $belowMinimum = Product::factory()->published()->create();
        ProductVariant::factory()->for($belowMinimum)->create(['size_ml' => 100, 'price' => 45000]);
        $inactiveMatch = Product::factory()->published()->create();
        ProductVariant::factory()->for($inactiveMatch)->inactive()->create(['size_ml' => 100, 'price' => 55000]);
        ProductVariant::factory()->for($inactiveMatch)->create(['size_ml' => 50, 'price' => 55000]);

        $response = $this->getJson('/api/products?size=100&min_price=50000&max_price=60000');

        $response->assertOk();
        $this->assertSame(['ambre-nuit'], $this->slugs($response));
    }

    /**
     * @return array<string, array{Closure(Product): void}>
     */
    public static function searchableFields(): array
    {
        return [
            'name' => [fn (Product $product) => $product->update(['name' => 'Vanille Noire'])],
            'tagline' => [fn (Product $product) => $product->update(['tagline' => 'Une vanille fumée sur un fond de cuir'])],
            'olfactory note' => [fn (Product $product) => $product->syncNotes(['base' => ['Vanille de Madagascar']])],
            'fragrance family' => [fn (Product $product) => $product->family->update(['name' => 'Vanille gourmande'])],
        ];
    }

    /**
     * @param  Closure(Product): void  $mentionVanilla
     */
    #[DataProvider('searchableFields')]
    public function test_index_search_matches_the_term_in_each_searchable_field(Closure $mentionVanilla): void
    {
        $match = Product::factory()->published()->withVariant()->named('Cuir Ancien')->create(['tagline' => 'Un cuir patiné']);
        $mentionVanilla($match);
        Product::factory()->published()->withVariant()->named('Rose Poivrée')->create(['tagline' => 'Une rose épicée']);

        $response = $this->getJson('/api/products?q=vanille');

        $response->assertOk();
        $this->assertSame([$match->slug], $this->slugs($response));
    }

    #[TestWith(['%'])]
    #[TestWith(['_'])]
    public function test_index_search_treats_like_wildcards_as_literal_characters(string $wildcard): void
    {
        Product::factory()->published()->withVariant()->named('Ambre Nuit')->create();

        $response = $this->getJson('/api/products?q='.urlencode($wildcard));

        $response->assertOk();
        $this->assertSame([], $this->slugs($response));
    }

    /**
     * @return array<string, array{string, string, list<string>}>
     */
    public static function sortOrders(): array
    {
        return [
            'cheapest active variant first' => ['price_asc', 'price_asc', ['bergamote', 'ambre', 'cedre']],
            'most expensive first' => ['price_desc', 'price_desc', ['cedre', 'ambre', 'bergamote']],
            'best sellers first' => ['popular', 'popular', ['bergamote', 'cedre', 'ambre']],
            'latest publication first' => ['newest', 'newest', ['cedre', 'ambre', 'bergamote']],
            'featured, then manual order' => ['featured', 'featured', ['bergamote', 'cedre', 'ambre']],
            'unknown value falls back to featured' => ['name;drop table products', 'featured', ['bergamote', 'cedre', 'ambre']],
        ];
    }

    /**
     * @param  list<string>  $expectedSlugs
     */
    #[DataProvider('sortOrders')]
    public function test_index_sorts_products(string $sort, string $appliedSort, array $expectedSlugs): void
    {
        $this->freezeTime();
        $amber = Product::factory()->named('Ambre')->create([
            'published_at' => now()->subDays(3), 'sales_count' => 5, 'sort_order' => 2,
        ]);
        ProductVariant::factory()->for($amber)->create(['size_ml' => 50, 'price' => 60000]);
        ProductVariant::factory()->for($amber)->inactive()->create(['size_ml' => 30, 'price' => 10000]);
        $bergamot = Product::factory()->featured()->named('Bergamote')->create([
            'published_at' => now()->subDays(10), 'sales_count' => 50, 'sort_order' => 3,
        ]);
        ProductVariant::factory()->for($bergamot)->create(['price' => 30000]);
        $cedar = Product::factory()->named('Cèdre')->create([
            'published_at' => now()->subDay(), 'sales_count' => 20, 'sort_order' => 1,
        ]);
        ProductVariant::factory()->for($cedar)->create(['price' => 90000]);

        $response = $this->getJson('/api/products?sort='.urlencode($sort));

        $response->assertOk()
            ->assertJsonPath('sort', $appliedSort);
        $this->assertSame($expectedSlugs, $this->slugs($response));
    }

    #[TestWith(['', 12])]
    #[TestWith(['?per_page=24', 24])]
    #[TestWith(['?per_page=500', 48])]
    #[TestWith(['?per_page=0', 1])]
    public function test_index_page_size_is_bounded(string $query, int $expectedPerPage): void
    {
        Product::factory()->published()->withVariant()->create();

        $response = $this->getJson('/api/products'.$query);

        $response->assertOk()
            ->assertJsonPath('meta.per_page', $expectedPerPage);
    }

    public function test_facets_only_reflect_the_published_catalog(): void
    {
        $woody = FragranceFamily::factory()->named('Boisé')->create(['sort_order' => 1]);
        $floral = FragranceFamily::factory()->named('Floral')->create(['sort_order' => 2]);
        $draftsOnly = FragranceFamily::factory()->named('Cuiré')->create();
        $visible = Collection::factory()->named('Signatures')->create();
        $hidden = Collection::factory()->hidden()->create();
        $draftCollection = Collection::factory()->create();

        $cedar = Product::factory()->published()->for($woody, 'family')->create();
        ProductVariant::factory()->for($cedar)->create(['size_ml' => 50, 'price' => 42000]);
        ProductVariant::factory()->for($cedar)->inactive()->create(['size_ml' => 30, 'price' => 9000]);
        $oud = Product::factory()->published()->for($woody, 'family')->create();
        ProductVariant::factory()->for($oud)->create(['size_ml' => 100, 'price' => 98000]);
        $jasmine = Product::factory()->published()->for($floral, 'family')->create();
        ProductVariant::factory()->for($jasmine)->create(['size_ml' => 50, 'price' => 51000]);
        $draft = Product::factory()->draft()->for($draftsOnly, 'family')->create();
        ProductVariant::factory()->for($draft)->create(['size_ml' => 200, 'price' => 250000]);
        $visible->products()->attach($cedar);
        $hidden->products()->attach($oud);
        $draftCollection->products()->attach($draft);

        $response = $this->getJson('/api/products/facets');

        $response->assertOk()
            ->assertExactJson([
                'families' => [
                    ['name' => 'Boisé', 'slug' => 'boise', 'count' => 2],
                    ['name' => 'Floral', 'slug' => 'floral', 'count' => 1],
                ],
                'collections' => [['name' => 'Signatures', 'slug' => 'signatures']],
                'sizes' => [50, 100],
                'price' => ['min' => 42000, 'max' => 98000],
                'sorts' => ['featured', 'price_asc', 'price_desc', 'popular', 'newest'],
            ]);
    }

    public function test_show_returns_the_product_and_related_perfumes_of_the_same_family_first(): void
    {
        $woody = FragranceFamily::factory()->create();
        $collection = Collection::factory()->create();
        $product = Product::factory()->published()->withVariant()->for($woody, 'family')->named('Cèdre Blanc')->create([
            'meta_title' => null,
            'tagline' => 'Cèdre de l’Atlas et encens',
        ]);
        $product->syncNotes(['top' => ['Bergamote'], 'heart' => ['Encens'], 'base' => ['Cèdre']]);
        $collection->products()->attach($product);
        $sameFamily = Product::factory()->published()->withVariant()->for($woody, 'family')->named('Santal Doux')->create(['sales_count' => 1]);
        $sameCollection = Product::factory()->published()->withVariant()->named('Oud Royal')->create(['sales_count' => 100]);
        $collection->products()->attach($sameCollection);
        Product::factory()->draft()->withVariant()->for($woody, 'family')->create();
        Product::factory()->published()->for($woody, 'family')->create();
        Product::factory()->published()->withVariant()->create();

        $response = $this->getJson('/api/products/cedre-blanc');

        $response->assertOk()
            ->assertJsonPath('data.slug', 'cedre-blanc')
            ->assertJsonPath('data.notes', ['top' => ['Bergamote'], 'heart' => ['Encens'], 'base' => ['Cèdre']])
            ->assertJsonPath('data.meta', ['title' => 'Cèdre Blanc', 'description' => 'Cèdre de l’Atlas et encens'])
            ->assertJsonPath('related.*.slug', [$sameFamily->slug, $sameCollection->slug]);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function unpublishedStates(): array
    {
        return [
            'draft' => ['draft'],
            'scheduled' => ['scheduled'],
            'archived' => ['archived'],
            'soft-deleted' => ['trashed'],
        ];
    }

    #[DataProvider('unpublishedStates')]
    public function test_show_returns_404_for_a_product_that_is_not_published(string $state): void
    {
        Product::factory()->{$state}()->withVariant()->named('Ambre Secret')->create();

        $response = $this->getJson('/api/products/ambre-secret');

        $response->assertNotFound();
    }

    /**
     * @return list<string>
     */
    private function slugs(TestResponse $response): array
    {
        return array_column($response->json('data'), 'slug');
    }
}
