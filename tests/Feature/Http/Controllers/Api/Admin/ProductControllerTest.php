<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Enums\CartItemType;
use App\Models\Collection;
use App\Models\FragranceFamily;
use App\Models\Note;
use App\Models\Order;
use App\Models\Pack;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Closure;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class ProductControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_support_staff_gets_403_on_the_catalog(): void
    {
        $response = $this->actingAs(User::factory()->support()->create())->getJson('/api/admin/products');

        $response->assertForbidden();
    }

    public function test_store_creates_the_product_with_its_variants_and_returns_201(): void
    {
        $family = FragranceFamily::factory()->create();

        $response = $this->actingAs($this->manager())->postJson('/api/admin/products', $this->payload([
            'fragrance_family_id' => $family->id,
        ]));

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'ambre-nocturne')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.is_featured', true)
            ->assertJsonPath('data.is_demo', false)
            ->assertJsonPath('data.sales_count', 0)
            ->assertJsonPath('data.family', ['id' => $family->id, 'name' => $family->name])
            ->assertJsonPath('data.variants.*.sku', ['AMB-50', 'AMB-100'])
            ->assertJsonPath('data.price_range', ['min' => 45000, 'max' => 80000]);
        $product = Product::query()->where('slug', 'ambre-nocturne')->sole();
        $this->assertDatabaseHas('product_variants', [
            'product_id' => $product->id, 'sku' => 'AMB-50', 'size_ml' => 50, 'price' => 45000,
            'compare_at_price' => null, 'stock' => 12, 'low_stock_threshold' => 5, 'is_active' => true, 'sort_order' => 0,
        ]);
        $this->assertDatabaseHas('product_variants', [
            'product_id' => $product->id, 'sku' => 'AMB-100', 'size_ml' => 100, 'price' => 80000,
            'compare_at_price' => 95000, 'stock' => 0, 'sort_order' => 1,
        ]);
    }

    public function test_store_records_the_initial_stock_as_an_initial_movement(): void
    {
        $manager = $this->manager();

        $response = $this->actingAs($manager)->postJson('/api/admin/products', $this->payload());

        $response->assertCreated();
        $this->assertDatabaseCount('inventory_movements', 1);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => ProductVariant::query()->where('sku', 'AMB-50')->sole()->id,
            'change' => 12,
            'stock_after' => 12,
            'reason' => 'initial',
            'user_id' => $manager->id,
            'note' => 'Stock initial',
        ]);
    }

    public function test_store_syncs_the_olfactory_pyramid_and_the_collections(): void
    {
        $collection = Collection::factory()->create();
        Note::create(['name' => 'Bergamote', 'slug' => 'bergamote']);

        $response = $this->actingAs($this->manager())->postJson('/api/admin/products', $this->payload([
            'collection_ids' => [$collection->id],
        ]));

        $response->assertCreated()
            ->assertJsonPath('data.notes', ['top' => ['Bergamote'], 'heart' => ['Rose de Damas', 'Jasmin'], 'base' => ['Ambre gris']])
            ->assertJsonPath('data.collection_ids', [$collection->id]);
        $this->assertDatabaseCount('notes', 4);
        $this->assertDatabaseHas('collection_product', ['collection_id' => $collection->id, 'product_id' => $response->json('data.id')]);
    }

    public function test_update_changes_stock_only_through_an_adjustment_movement(): void
    {
        $manager = $this->manager();
        $product = Product::factory()->named('Ambre Nocturne')->create();
        $variant = ProductVariant::factory()->for($product)->create(['size_ml' => 50, 'sku' => 'AMB-50', 'stock' => 10]);

        $response = $this->actingAs($manager)->putJson("/api/admin/products/{$product->id}", $this->payload([
            'variants' => [['id' => $variant->id, 'size_ml' => 50, 'sku' => 'AMB-50', 'price' => 47000, 'stock' => 4]],
        ]));

        $response->assertOk()
            ->assertJsonPath('data.variants.0.price', 47000)
            ->assertJsonPath('data.variants.0.stock', 4);
        $this->assertSame(4, $variant->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $variant->id,
            'change' => -6,
            'stock_after' => 4,
            'reason' => 'adjustment',
            'user_id' => $manager->id,
            'note' => 'Modifié depuis la fiche produit',
        ]);
    }

    public function test_update_without_a_stock_change_writes_no_movement(): void
    {
        $product = Product::factory()->named('Ambre Nocturne')->create();
        $variant = ProductVariant::factory()->for($product)->create(['size_ml' => 50, 'sku' => 'AMB-50', 'stock' => 10]);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/products/{$product->id}", $this->payload([
            'variants' => [['id' => $variant->id, 'size_ml' => 50, 'sku' => 'AMB-50', 'price' => 47000, 'stock' => 10]],
        ]));

        $response->assertOk();
        $this->assertDatabaseCount('inventory_movements', 0);
    }

    /**
     * @return array<string, array{Closure(ProductVariant): mixed}>
     */
    public static function variantReferences(): array
    {
        return [
            'sold as a single bottle' => [fn (ProductVariant $variant) => Order::factory()->withItem($variant)->create()],
            'part of a fixed pack' => [fn (ProductVariant $variant) => Pack::factory()->fixed()->containing($variant, 2)->create()],
            'sold inside a pack' => [function (ProductVariant $variant) {
                $line = Order::factory()->create()->items()->create([
                    'type' => CartItemType::Pack, 'name' => 'Duo du Soir', 'unit_price' => 80000, 'quantity' => 1, 'line_total' => 80000,
                ]);
                $line->selections()->create([
                    'product_id' => $variant->product_id, 'product_variant_id' => $variant->id, 'product_name' => 'Ambre Nocturne',
                    'size_ml' => $variant->size_ml, 'sku' => $variant->sku, 'unit_price' => $variant->price, 'position' => 1,
                ]);
            }],
        ];
    }

    /**
     * @param  Closure(ProductVariant): mixed  $reference
     */
    #[DataProvider('variantReferences')]
    public function test_update_deactivates_a_removed_variant_that_is_still_referenced(Closure $reference): void
    {
        $product = Product::factory()->named('Ambre Nocturne')->create();
        $kept = ProductVariant::factory()->for($product)->create(['size_ml' => 50, 'sku' => 'AMB-50']);
        $removed = ProductVariant::factory()->for($product)->create(['size_ml' => 100, 'sku' => 'AMB-100']);
        $reference($removed);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/products/{$product->id}", $this->payload([
            'variants' => [['id' => $kept->id, 'size_ml' => 50, 'sku' => 'AMB-50', 'price' => 45000, 'stock' => 20]],
        ]));

        $response->assertOk();
        $this->assertModelExists($removed);
        $this->assertFalse($removed->fresh()->is_active);
    }

    public function test_update_deletes_a_removed_variant_that_nothing_references(): void
    {
        $product = Product::factory()->named('Ambre Nocturne')->create();
        $kept = ProductVariant::factory()->for($product)->create(['size_ml' => 50, 'sku' => 'AMB-50']);
        $removed = ProductVariant::factory()->for($product)->create(['size_ml' => 100, 'sku' => 'AMB-100']);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/products/{$product->id}", $this->payload([
            'variants' => [['id' => $kept->id, 'size_ml' => 50, 'sku' => 'AMB-50', 'price' => 45000, 'stock' => 20]],
        ]));

        $response->assertOk()
            ->assertJsonPath('data.variants.*.sku', ['AMB-50']);
        $this->assertModelMissing($removed);
    }

    /**
     * @return array<string, array{Closure(ProductVariant): list<array<string, mixed>>, string, string}>
     */
    public static function invalidVariantSets(): array
    {
        return [
            'the same size twice' => [
                fn () => [['size_ml' => 50, 'sku' => 'AMB-50', 'price' => 45000, 'stock' => 1], ['size_ml' => 50, 'sku' => 'AMB-51', 'price' => 46000, 'stock' => 1]],
                'variants', 'Chaque contenance ne peut apparaître qu’une fois.',
            ],
            'the same sku twice, whatever the case' => [
                fn () => [['size_ml' => 50, 'sku' => 'amb-50', 'price' => 45000, 'stock' => 1], ['size_ml' => 100, 'sku' => 'AMB-50', 'price' => 80000, 'stock' => 1]],
                'variants', 'Chaque référence (SKU) doit être unique.',
            ],
            'a sku used by another product' => [
                fn () => [['size_ml' => 50, 'sku' => 'taken-50', 'price' => 45000, 'stock' => 1]],
                'variants.0.sku', 'Cette référence est déjà utilisée.',
            ],
            'a struck-through price not above the price' => [
                fn () => [['size_ml' => 50, 'sku' => 'AMB-50', 'price' => 45000, 'compare_at_price' => 45000, 'stock' => 1]],
                'variants.0.compare_at_price', 'Le prix barré doit être supérieur au prix.',
            ],
            'a variant of another product' => [
                fn (ProductVariant $foreign) => [['id' => $foreign->id, 'size_ml' => 50, 'sku' => 'AMB-50', 'price' => 45000, 'stock' => 1]],
                'variants.0.id', 'Variante inconnue.',
            ],
        ];
    }

    /**
     * @param  Closure(ProductVariant): list<array<string, mixed>>  $variants
     */
    #[DataProvider('invalidVariantSets')]
    public function test_store_rejects_an_invalid_variant_set_with_422(Closure $variants, string $field, string $message): void
    {
        $foreign = ProductVariant::factory()->create(['sku' => 'TAKEN-50']);

        $response = $this->actingAs($this->manager())->postJson('/api/admin/products', $this->payload([
            'variants' => $variants($foreign),
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors([$field => $message]);
        $this->assertDatabaseMissing('products', ['slug' => 'ambre-nocturne']);
    }

    public function test_store_with_an_empty_form_returns_422_for_every_required_field(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/products', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name' => 'Le champ nom est obligatoire.',
                'status' => 'Le champ statut est obligatoire.',
                'variants' => 'Le champ formats est obligatoire.',
            ]);
        $this->assertDatabaseCount('products', 0);
    }

    public function test_destroy_archives_the_product_by_soft_deleting_it(): void
    {
        $product = Product::factory()->published()->create();

        $response = $this->actingAs($this->manager())->deleteJson("/api/admin/products/{$product->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Produit archivé.']);
        $this->assertSoftDeleted($product);
    }

    public function test_restore_brings_an_archived_product_back(): void
    {
        $product = Product::factory()->trashed()->create();

        $response = $this->actingAs($this->manager())->postJson("/api/admin/products/{$product->id}/restore");

        $response->assertOk()
            ->assertJsonPath('data.deleted_at', null);
        $this->assertNotSoftDeleted($product);
    }

    public function test_index_filters_by_status(): void
    {
        $draft = Product::factory()->draft()->create();
        Product::factory()->published()->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/products?status=draft');

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$draft->id]);
    }

    public function test_index_filters_by_family(): void
    {
        $woody = FragranceFamily::factory()->create();
        $cedar = Product::factory()->for($woody, 'family')->create();
        Product::factory()->create();

        $response = $this->actingAs($this->manager())->getJson("/api/admin/products?family={$woody->id}");

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$cedar->id]);
    }

    public function test_index_filters_by_collection(): void
    {
        $collection = Collection::factory()->create();
        $member = Product::factory()->create();
        $collection->products()->attach($member);
        Product::factory()->create();

        $response = $this->actingAs($this->manager())->getJson("/api/admin/products?collection={$collection->id}");

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$member->id]);
    }

    public function test_index_filters_featured_products(): void
    {
        $featured = Product::factory()->featured()->create();
        Product::factory()->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/products?featured=1');

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$featured->id]);
    }

    #[TestWith(['sacré'])]
    #[TestWith(['BOI-5'])]
    public function test_index_search_matches_product_names_and_skus(string $term): void
    {
        $match = Product::factory()->named('Bois Sacré')->create();
        ProductVariant::factory()->for($match)->create(['sku' => 'BOI-50']);
        $other = Product::factory()->named('Ambre Nuit')->create();
        ProductVariant::factory()->for($other)->create(['sku' => 'AMB-50']);

        $response = $this->actingAs($this->manager())->getJson('/api/admin/products?search='.urlencode($term));

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$match->id]);
    }

    #[TestWith(['', 'live'])]
    #[TestWith(['?trashed=only', 'archived'])]
    public function test_index_lists_archived_products_only_on_request(string $query, string $expected): void
    {
        $products = [
            'live' => Product::factory()->create(),
            'archived' => Product::factory()->trashed()->create(),
        ];

        $response = $this->actingAs($this->manager())->getJson('/api/admin/products'.$query);

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$products[$expected]->id]);
    }

    public function test_options_returns_the_reference_data_of_the_catalog_forms(): void
    {
        $family = FragranceFamily::factory()->named('Boisé')->create();
        $collection = Collection::factory()->named('Signatures')->create();
        Note::create(['name' => 'Vétiver', 'slug' => 'vetiver']);
        $product = Product::factory()->for($family, 'family')->named('Cèdre Blanc')->create();
        $variant = ProductVariant::factory()->for($product)->create(['size_ml' => 100, 'sku' => 'CED-100', 'price' => 52000, 'stock' => 7]);

        $response = $this->actingAs($this->manager())->getJson('/api/admin/catalog/options');

        $response->assertOk()
            ->assertExactJson([
                'families' => [['id' => $family->id, 'name' => 'Boisé']],
                'collections' => [['id' => $collection->id, 'name' => 'Signatures']],
                'notes' => ['Vétiver'],
                'sizes' => [100],
                'products' => [[
                    'id' => $product->id,
                    'name' => 'Cèdre Blanc',
                    'status' => 'active',
                    'variants' => [['id' => $variant->id, 'label' => '100 ml', 'sku' => 'CED-100', 'price' => 52000, 'stock' => 7, 'is_active' => true]],
                ]],
                'badges' => ['new', 'bestseller', 'limited'],
                'genders' => ['feminin', 'masculin', 'mixte'],
            ]);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'name' => 'Ambre Nocturne',
            'status' => 'active',
            'tagline' => 'Ambre, vanille et bois de oud',
            'is_featured' => true,
            'variants' => [
                ['size_ml' => 50, 'sku' => 'amb-50', 'price' => 45000, 'stock' => 12],
                ['size_ml' => 100, 'sku' => 'amb-100', 'price' => 80000, 'compare_at_price' => 95000, 'stock' => 0],
            ],
            'notes' => ['top' => ['Bergamote'], 'heart' => ['Rose de Damas', 'Jasmin'], 'base' => ['Ambre gris']],
            ...$overrides,
        ];
    }
}
