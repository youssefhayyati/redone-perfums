<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\FragranceFamily;
use App\Models\Note;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class FamilyControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_families_in_display_order_with_their_product_count(): void
    {
        $woody = FragranceFamily::factory()->named('Boisé')->create(['sort_order' => 2]);
        FragranceFamily::factory()->named('Floral')->create(['sort_order' => 1]);
        Product::factory()->count(2)->for($woody, 'family')->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/families');

        $response->assertOk()
            ->assertJsonPath('data.*.name', ['Floral', 'Boisé'])
            ->assertJsonPath('data.*.products_count', [0, 2]);
    }

    public function test_store_derives_the_slug_from_the_name_and_returns_201(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/families', [
            'name' => 'Boisé Ambré',
            'description' => 'Bois chauds et résines.',
            'sort_order' => 3,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'boise-ambre');
        $this->assertDatabaseHas('fragrance_families', [
            'name' => 'Boisé Ambré', 'slug' => 'boise-ambre', 'description' => 'Bois chauds et résines.', 'sort_order' => 3,
        ]);
    }

    public function test_store_with_an_empty_sort_order_files_the_family_first(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/families', [
            'name' => 'Hespéridé',
            'sort_order' => null,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.sort_order', 0);
        $this->assertDatabaseHas('fragrance_families', ['slug' => 'hesperide', 'sort_order' => 0]);
    }

    public function test_store_with_a_slug_already_in_use_returns_422(): void
    {
        FragranceFamily::factory()->named('Boisé')->create();

        $response = $this->actingAs($this->manager())->postJson('/api/admin/families', ['name' => 'Boisé']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['slug' => 'La valeur du champ identifiant d’URL est déjà utilisée.']);
        $this->assertDatabaseCount('fragrance_families', 1);
    }

    public function test_update_renames_the_family_and_keeps_its_own_slug_available(): void
    {
        $family = FragranceFamily::factory()->named('Boisé')->create();

        $response = $this->actingAs($this->manager())->putJson("/api/admin/families/{$family->id}", [
            'name' => 'Boisé sec',
            'slug' => 'boise',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Boisé sec');
        $this->assertDatabaseHas('fragrance_families', ['id' => $family->id, 'name' => 'Boisé sec', 'slug' => 'boise']);
    }

    public function test_destroy_keeps_the_products_of_the_family_without_a_family(): void
    {
        $family = FragranceFamily::factory()->create();
        $product = Product::factory()->for($family, 'family')->create();

        $response = $this->actingAs($this->manager())->deleteJson("/api/admin/families/{$family->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Famille supprimée.']);
        $this->assertModelMissing($family);
        $this->assertNull($product->fresh()->fragrance_family_id);
    }

    public function test_notes_autocomplete_returns_matching_names_alphabetically(): void
    {
        foreach (['Vanille bourbon', 'Bergamote', 'Vanille', 'Vétiver'] as $name) {
            Note::findOrCreateByName($name);
        }

        $response = $this->actingAs($this->manager())->getJson('/api/admin/notes?search=vanil');

        $response->assertOk()
            ->assertExactJson(['data' => ['Vanille', 'Vanille bourbon']]);
    }

    public function test_notes_autocomplete_returns_at_most_twenty_names(): void
    {
        foreach (range(1, 25) as $index) {
            Note::findOrCreateByName('Note '.str_pad((string) $index, 2, '0', STR_PAD_LEFT));
        }

        $response = $this->actingAs($this->manager())->getJson('/api/admin/notes');

        $response->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('data.0', 'Note 01');
    }

    public function test_notes_autocomplete_treats_a_wildcard_as_a_literal_character(): void
    {
        Note::findOrCreateByName('Vanille');

        $response = $this->actingAs($this->manager())->getJson('/api/admin/notes?search='.urlencode('%'));

        $response->assertOk()
            ->assertExactJson(['data' => []]);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
