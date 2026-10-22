<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Collection;
use App\Models\Pack;
use App\Models\Page;
use App\Models\Product;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class SeoControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_robots_keeps_crawlers_out_of_private_pages_and_points_them_to_the_sitemap(): void
    {
        $response = $this->get('/robots.txt');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->assertSeeInOrder(['User-agent: *', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /panier', 'Disallow: /commande', 'Disallow: /compte'])
            ->assertSee('Sitemap: '.config('app.url').'/sitemap.xml');
    }

    public function test_sitemap_lists_every_page_a_customer_can_open(): void
    {
        $this->travelTo('2026-10-21 09:30:00');
        Product::factory()->published()->create(['slug' => 'nuit-d-ambre']);
        Collection::factory()->create(['slug' => 'nocturne']);
        Pack::factory()->create(['slug' => 'coffret-decouverte']);
        Page::create(['slug' => 'livraison', 'title' => 'Livraison', 'body' => 'Délais.', 'is_published' => true]);
        $base = config('app.url');

        $response = $this->get('/sitemap.xml');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee("<loc>{$base}</loc>", false)
            ->assertSee("<loc>{$base}/boutique</loc>", false)
            ->assertSee("<loc>{$base}/coffrets</loc>", false)
            ->assertSee("<loc>{$base}/parfums/nuit-d-ambre</loc>", false)
            ->assertSee("<loc>{$base}/collections/nocturne</loc>", false)
            ->assertSee("<loc>{$base}/coffrets/coffret-decouverte</loc>", false)
            ->assertSee("<loc>{$base}/pages/livraison</loc>", false)
            ->assertSee('<lastmod>2026-10-21T09:30:00+01:00</lastmod>', false);
    }

    public function test_sitemap_lists_each_page_in_both_languages_linked_to_each_other(): void
    {
        Product::factory()->published()->create(['slug' => 'nuit-d-ambre']);
        $base = config('app.url');

        $response = $this->get('/sitemap.xml');

        $response->assertOk()
            ->assertSee("<loc>{$base}/parfums/nuit-d-ambre</loc>", false)
            ->assertSee("<loc>{$base}/ar/parfums/nuit-d-ambre</loc>", false)
            ->assertSee("<loc>{$base}/ar</loc>", false)
            ->assertSee('<xhtml:link rel="alternate" hreflang="ar" href="'.$base.'/ar/parfums/nuit-d-ambre"/>', false);
    }

    public function test_sitemap_leaves_out_what_customers_cannot_open(): void
    {
        Product::factory()->draft()->create(['slug' => 'brouillon-de-parfum']);
        Product::factory()->scheduled()->create(['slug' => 'parfum-a-venir']);
        Collection::factory()->hidden()->create(['slug' => 'collection-cachee']);
        Pack::factory()->inactive()->create(['slug' => 'coffret-retire']);
        Page::create(['slug' => 'retours', 'title' => 'Retours', 'body' => 'À venir.', 'is_published' => false]);

        $response = $this->get('/sitemap.xml');

        $response->assertOk()
            ->assertDontSee('brouillon-de-parfum')
            ->assertDontSee('parfum-a-venir')
            ->assertDontSee('collection-cachee')
            ->assertDontSee('coffret-retire')
            ->assertDontSee('/pages/retours')
            ->assertDontSee('/coffrets</loc>', false);
    }
}
