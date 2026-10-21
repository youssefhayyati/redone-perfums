<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\Collection;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CollectionControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_store_creates_the_collection_with_its_products_in_the_requested_order_and_returns_201(): void
    {
        [$first, $second, $third] = Product::factory()->count(3)->create()->all();

        $response = $this->actingAs($this->manager())->postJson('/api/admin/collections', [
            'name' => 'Nuits d’Orient',
            'tagline' => 'Oud, ambre et safran.',
            'image_path' => '/images/collections/nuits.webp',
            'accent_color' => '#8A5A2B',
            'is_visible' => true,
            'product_ids' => [$third->id, $first->id, $second->id],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'nuits-dorient')
            ->assertJsonPath('data.image_path', '/images/collections/nuits.webp')
            ->assertJsonPath('data.is_visible', true)
            ->assertJsonPath('data.is_demo', false)
            ->assertJsonPath('data.sort_order', 0)
            ->assertJsonPath('data.products_count', 3);
        $collection = Collection::query()->where('slug', 'nuits-dorient')->sole();
        $this->assertSame([$third->id, $first->id, $second->id], $collection->products()->pluck('products.id')->all());
    }

    public function test_store_rejects_an_external_image_url_with_422(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/collections', [
            'name' => 'Nuits d’Orient',
            'image_path' => 'https://cdn.example.com/nuits.webp',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['image_path' => 'Chemin d’image invalide.']);
        $this->assertDatabaseCount('collections', 0);
    }

    public function test_update_reorders_the_products_sent_with_the_collection(): void
    {
        $collection = Collection::factory()->named('Signatures')->create();
        [$first, $second] = Product::factory()->count(2)->create()->all();
        $collection->products()->attach([$first->id => ['sort_order' => 0], $second->id => ['sort_order' => 1]]);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/collections/{$collection->id}", [
            'name' => 'Signatures',
            'product_ids' => [$second->id, $first->id],
        ]);

        $response->assertOk();
        $this->assertSame([$second->id, $first->id], $collection->products()->pluck('products.id')->all());
    }

    public function test_update_without_products_keeps_the_current_ones(): void
    {
        $collection = Collection::factory()->named('Signatures')->create();
        $member = Product::factory()->create();
        $collection->products()->attach($member);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/collections/{$collection->id}", [
            'name' => 'Signatures maison',
            'slug' => 'signatures',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Signatures maison')
            ->assertJsonPath('data.products_count', 1);
        $this->assertSame([$member->id], $collection->products()->pluck('products.id')->all());
    }

    public function test_show_lists_the_products_in_collection_order(): void
    {
        $collection = Collection::factory()->create();
        [$first, $second] = Product::factory()->count(2)->create()->all();
        $collection->products()->attach([$second->id => ['sort_order' => 0], $first->id => ['sort_order' => 1]]);

        $response = $this->actingAs($this->manager())->getJson("/api/admin/collections/{$collection->id}");

        $response->assertOk()
            ->assertJsonPath('data.products.*.id', [$second->id, $first->id]);
    }

    public function test_destroy_deletes_the_collection_but_keeps_its_products(): void
    {
        $collection = Collection::factory()->create();
        $member = Product::factory()->create();
        $collection->products()->attach($member);

        $response = $this->actingAs($this->manager())->deleteJson("/api/admin/collections/{$collection->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Collection supprimée.']);
        $this->assertModelMissing($collection);
        $this->assertModelExists($member);
        $this->assertDatabaseCount('collection_product', 0);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
