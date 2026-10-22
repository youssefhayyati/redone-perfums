<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Models\Collection;
use App\Models\FragranceFamily;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CollectionControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_visible_collections_with_their_published_product_count(): void
    {
        $evenings = Collection::factory()->named('Soirées')->create(['sort_order' => 2]);
        Collection::factory()->named('Signatures')->create(['sort_order' => 1]);
        Collection::factory()->hidden()->create();
        $evenings->products()->attach([
            Product::factory()->published()->withVariant()->create()->id,
            Product::factory()->draft()->withVariant()->create()->id,
        ]);

        $response = $this->getJson('/api/collections');

        $response->assertOk()
            ->assertJsonPath('data.*.slug', ['signatures', 'soirees'])
            ->assertJsonPath('data.*.products_count', [0, 1]);
    }

    public function test_show_returns_a_visible_collection_with_only_its_purchasable_products(): void
    {
        $collection = Collection::factory()->named('Nuits d’Orient')->create();
        $published = Product::factory()->published()->withVariant()->create();
        $draft = Product::factory()->draft()->withVariant()->create();
        $withoutActiveVariant = Product::factory()->published()->has(ProductVariant::factory()->inactive(), 'variants')->create();
        $collection->products()->attach([$published->id, $draft->id, $withoutActiveVariant->id]);

        $response = $this->getJson('/api/collections/nuits-dorient');

        $response->assertOk()
            ->assertJsonPath('data.name', 'Nuits d’Orient')
            ->assertJsonPath('data.products.*.slug', [$published->slug]);
    }

    public function test_show_lists_products_in_the_collection_order(): void
    {
        $collection = Collection::factory()->named('Signatures')->create();
        $second = Product::factory()->published()->withVariant()->create();
        $first = Product::factory()->published()->withVariant()->create();
        $collection->products()->attach([$second->id => ['sort_order' => 1], $first->id => ['sort_order' => 0]]);

        $response = $this->getJson('/api/collections/signatures');

        $response->assertOk()
            ->assertJsonPath('data.products.*.slug', [$first->slug, $second->slug]);
    }

    public function test_show_returns_404_for_a_hidden_collection(): void
    {
        Collection::factory()->hidden()->named('Avant-première')->create();

        $response = $this->getJson('/api/collections/avant-premiere');

        $response->assertNotFound();
    }

    public function test_families_lists_families_with_published_perfumes_and_shows_three_of_them(): void
    {
        $woody = FragranceFamily::factory()->named('Boisé')->create(['sort_order' => 1]);
        $floral = FragranceFamily::factory()->named('Floral')->create(['sort_order' => 2]);
        $draftsOnly = FragranceFamily::factory()->create();
        $featured = Product::factory()->published()->featured()->withVariant()->for($woody, 'family')->create(['sort_order' => 9]);
        $others = Product::factory()->count(3)->published()->withVariant()->for($woody, 'family')
            ->sequence(['sort_order' => 1], ['sort_order' => 2], ['sort_order' => 3])
            ->create();
        Product::factory()->published()->withVariant()->for($floral, 'family')->create();
        Product::factory()->draft()->withVariant()->for($draftsOnly, 'family')->create();

        $response = $this->getJson('/api/families');

        $response->assertOk()
            ->assertJsonPath('data.*.slug', ['boise', 'floral'])
            ->assertJsonPath('data.0.products_count', 4)
            ->assertJsonPath('data.0.products.*.slug', [$featured->slug, $others[0]->slug, $others[1]->slug]);
    }
}
