<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\Collection;
use App\Models\Pack;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class PackControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_store_creates_a_custom_pack_limited_to_collections_and_returns_201(): void
    {
        $collection = Collection::factory()->create();

        $response = $this->actingAs($this->manager())->postJson('/api/admin/packs', [
            'name' => 'Coffret Découverte',
            'type' => 'custom',
            'pricing_type' => 'percent',
            'discount_value' => 15,
            'selection_count' => 3,
            'allowed_sizes' => [50, '50', 30],
            'eligibility' => 'collections',
            'collection_ids' => [$collection->id],
            'allow_duplicates' => true,
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'coffret-decouverte')
            ->assertJsonPath('data.type', 'custom')
            ->assertJsonPath('data.selection_count', 3)
            ->assertJsonPath('data.allowed_sizes', [50, 30])
            ->assertJsonPath('data.eligibility', 'collections')
            ->assertJsonPath('data.allow_duplicates', true)
            ->assertJsonPath('data.is_demo', false)
            ->assertJsonPath('data.pricing_label', '-15 % sur la sélection');
        $pack = Pack::query()->sole();
        $this->assertSame(
            ['custom', 3, [50, 30], 'collections', true, 'percent', null, 15, true],
            [$pack->type->value, $pack->selection_count, $pack->allowed_sizes, $pack->eligibility->value, $pack->allow_duplicates,
                $pack->pricing_type->value, $pack->price, $pack->discount_value, $pack->is_active],
        );
        $this->assertSame([$collection->id], $pack->eligibleCollections()->pluck('collections.id')->all());
    }

    public function test_custom_pack_limited_to_collections_without_any_collection_returns_422(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/packs', $this->customPack([
            'eligibility' => 'collections',
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['collection_ids' => 'Choisissez au moins une collection.']);
        $this->assertDatabaseCount('packs', 0);
    }

    public function test_custom_pack_limited_to_fewer_perfumes_than_bottles_returns_422(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/packs', $this->customPack([
            'selection_count' => 3,
            'eligibility' => 'products',
            'product_ids' => Product::factory()->count(2)->create()->pluck('id')->all(),
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['product_ids' => 'Sélectionnez au moins autant de parfums que de flacons à composer.']);
        $this->assertDatabaseCount('packs', 0);
    }

    public function test_percent_discount_above_90_returns_422(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/packs', $this->customPack([
            'pricing_type' => 'percent',
            'discount_value' => 95,
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['discount_value' => 'Le champ réduction ne doit pas être supérieur à 90.']);
        $this->assertDatabaseCount('packs', 0);
    }

    public function test_fixed_pack_with_a_single_bottle_returns_422(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/packs', [
            'name' => 'Solo',
            'type' => 'fixed',
            'pricing_type' => 'fixed',
            'price' => 45000,
            'items' => [['variant_id' => ProductVariant::factory()->create()->id, 'quantity' => 1]],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => 'Un coffret fixe contient au moins deux flacons.']);
        $this->assertDatabaseCount('packs', 0);
    }

    public function test_store_creates_a_fixed_pack_with_its_contents_and_ignores_custom_rules(): void
    {
        $amber = ProductVariant::factory()->for(Product::factory()->published())->create();
        $oud = ProductVariant::factory()->for(Product::factory()->published())->create();

        $response = $this->actingAs($this->manager())->postJson('/api/admin/packs', [
            'name' => 'Duo Signature',
            'type' => 'fixed',
            'pricing_type' => 'fixed',
            'price' => 85000,
            'items' => [['variant_id' => $amber->id, 'quantity' => 1], ['variant_id' => $oud->id, 'quantity' => 1]],
            'selection_count' => 4,
            'allow_duplicates' => true,
            'eligibility' => 'products',
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.type', 'fixed')
            ->assertJsonPath('data.selection_count', null)
            ->assertJsonPath('data.allow_duplicates', false)
            ->assertJsonPath('data.eligibility', 'all')
            ->assertJsonPath('data.bottle_count', 2)
            ->assertJsonPath('data.starting_price', 85000);
        $pack = Pack::query()->sole();
        $this->assertSame([[$amber->id, 1, 0], [$oud->id, 1, 1]], $pack->items->map(fn ($item) => [$item->product_variant_id, $item->quantity, $item->sort_order])->all());
    }

    public function test_index_reports_how_many_variants_a_custom_pack_accepts(): void
    {
        foreach (range(1, 3) as $index) {
            ProductVariant::factory()->for(Product::factory()->published())->create(['size_ml' => 50]);
        }
        ProductVariant::factory()->for(Product::factory()->published())->create(['size_ml' => 100]);
        ProductVariant::factory()->for(Product::factory()->draft())->create(['size_ml' => 50]);
        Pack::factory()->custom(2)->allowedSizes([50])->create(['sort_order' => 1]);
        Pack::factory()->fixed()->containing(ProductVariant::query()->first(), 2)->create(['sort_order' => 2]);

        $response = $this->actingAs($this->manager())->getJson('/api/admin/packs');

        $response->assertOk()
            ->assertJsonPath('data.*.eligible_count', [3, null]);
    }

    public function test_show_returns_the_eligibility_rules_of_a_custom_pack(): void
    {
        $collection = Collection::factory()->create();
        $custom = Pack::factory()->custom(2)->forCollections($collection)->create();

        $response = $this->actingAs($this->manager())->getJson("/api/admin/packs/{$custom->id}");

        $response->assertOk()
            ->assertJsonPath('data.collection_ids', [$collection->id])
            ->assertJsonPath('data.product_ids', [])
            ->assertJsonPath('data.items', [])
            ->assertJsonPath('data.eligible_count', 0);
    }

    public function test_show_labels_the_contents_of_a_fixed_pack(): void
    {
        $variant = ProductVariant::factory()->for(Product::factory()->state(['name' => 'Ambre Nuit']))->create(['size_ml' => 50]);
        $fixed = Pack::factory()->fixed()->containing($variant, 2)->create();

        $response = $this->actingAs($this->manager())->getJson("/api/admin/packs/{$fixed->id}");

        $response->assertOk()
            ->assertJsonPath('data.items', [['variant_id' => $variant->id, 'quantity' => 2, 'label' => 'Ambre Nuit — 50 ml']])
            ->assertJsonPath('data.eligible_count', null);
    }

    public function test_update_turning_a_custom_pack_into_a_fixed_one_drops_its_eligibility_rules(): void
    {
        $collection = Collection::factory()->create();
        $pack = Pack::factory()->custom(2)->forCollections($collection)->named('Coffret du Soir')->create();
        $variant = ProductVariant::factory()->for(Product::factory()->published()->state(['name' => 'Ambre Nuit']))->create(['size_ml' => 50]);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/packs/{$pack->id}", [
            'name' => 'Coffret du Soir',
            'type' => 'fixed',
            'pricing_type' => 'fixed',
            'price' => 80000,
            'items' => [['variant_id' => $variant->id, 'quantity' => 2]],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.type', 'fixed')
            ->assertJsonPath('data.eligibility', 'all')
            ->assertJsonPath('data.bottle_count', 2);
        $this->assertDatabaseCount('pack_collection', 0);
        $this->assertDatabaseHas('pack_items', ['pack_id' => $pack->id, 'product_variant_id' => $variant->id, 'quantity' => 2]);
    }

    public function test_destroy_deletes_the_pack(): void
    {
        $pack = Pack::factory()->create();

        $response = $this->actingAs($this->manager())->deleteJson("/api/admin/packs/{$pack->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Coffret supprimé.']);
        $this->assertModelMissing($pack);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function customPack(array $overrides = []): array
    {
        return [
            'name' => 'Coffret Découverte',
            'type' => 'custom',
            'pricing_type' => 'fixed',
            'price' => 120000,
            'selection_count' => 3,
            'eligibility' => 'all',
            ...$overrides,
        ];
    }
}
