<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class PageControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_support_staff_gets_403_on_content(): void
    {
        $response = $this->actingAs(User::factory()->support()->create())->getJson('/api/admin/pages');

        $response->assertForbidden();
    }

    public function test_store_derives_the_slug_from_the_title_and_returns_201(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/pages', [
            'title' => 'Conditions générales de vente',
            'body' => "## Article 1\nObjet du contrat.",
            'meta_description' => 'Nos conditions de vente.',
            'is_published' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'conditions-generales-de-vente')
            ->assertJsonPath('data.is_published', true);
        $this->assertDatabaseHas('pages', [
            'slug' => 'conditions-generales-de-vente',
            'title' => 'Conditions générales de vente',
            'body' => "## Article 1\nObjet du contrat.",
            'is_published' => true,
        ]);
    }

    public function test_store_with_an_empty_sort_order_files_the_page_first(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/pages', [
            'title' => 'Livraison',
            'body' => 'Délais et frais.',
            'sort_order' => null,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.sort_order', 0);
        $this->assertDatabaseHas('pages', ['slug' => 'livraison', 'sort_order' => 0]);
    }

    public function test_store_with_a_slug_already_in_use_returns_422(): void
    {
        Page::create(['slug' => 'livraison', 'title' => 'Livraison', 'body' => 'Délais.']);

        $response = $this->actingAs($this->manager())->postJson('/api/admin/pages', ['title' => 'Livraison', 'body' => 'Autre texte.']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['slug' => 'La valeur du champ identifiant d’URL est déjà utilisée.']);
        $this->assertDatabaseCount('pages', 1);
    }

    public function test_update_without_the_publish_flag_unpublishes_the_page(): void
    {
        $page = Page::create(['slug' => 'retours', 'title' => 'Retours', 'body' => 'Sous 14 jours.', 'is_published' => true]);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/pages/{$page->id}", [
            'title' => 'Retours et échanges',
            'slug' => 'retours',
            'body' => 'Sous 14 jours, flacon non ouvert.',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.is_published', false);
        $this->assertDatabaseHas('pages', ['id' => $page->id, 'title' => 'Retours et échanges', 'is_published' => false]);
    }

    public function test_index_lists_pages_in_display_order(): void
    {
        Page::create(['slug' => 'livraison', 'title' => 'Livraison', 'body' => 'Délais.', 'sort_order' => 2]);
        Page::create(['slug' => 'retours', 'title' => 'Retours', 'body' => 'Conditions.', 'sort_order' => 1]);

        $response = $this->actingAs($this->manager())->getJson('/api/admin/pages');

        $response->assertOk()
            ->assertJsonPath('data.*.slug', ['retours', 'livraison']);
    }

    public function test_destroy_deletes_the_page(): void
    {
        $page = Page::create(['slug' => 'retours', 'title' => 'Retours', 'body' => 'Conditions.']);

        $response = $this->actingAs($this->manager())->deleteJson("/api/admin/pages/{$page->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Page supprimée.']);
        $this->assertModelMissing($page);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
