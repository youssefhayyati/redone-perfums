<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Models\Page;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class PageControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_show_returns_a_published_page(): void
    {
        $this->travelTo('2026-10-01 10:00:00');
        Page::create([
            'slug' => 'livraison',
            'title' => 'Livraison',
            'body' => "## Délais\n- Casablanca : 24 h",
            'meta_description' => 'Délais et frais de livraison.',
            'is_published' => true,
        ]);

        $response = $this->getJson('/api/pages/livraison');

        $response->assertOk()
            ->assertExactJson(['data' => [
                'slug' => 'livraison',
                'title' => 'Livraison',
                'body' => "## Délais\n- Casablanca : 24 h",
                'meta_description' => 'Délais et frais de livraison.',
                'updated_at' => '2026-10-01T10:00:00+01:00',
            ]]);
    }

    public function test_show_returns_404_for_an_unpublished_page(): void
    {
        Page::create(['slug' => 'retours', 'title' => 'Retours', 'body' => 'En cours de rédaction.', 'is_published' => false]);

        $response = $this->getJson('/api/pages/retours');

        $response->assertNotFound();
    }
}
