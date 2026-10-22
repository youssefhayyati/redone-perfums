<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Collection;
use App\Models\Pack;
use App\Models\Page;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Closure;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SpaControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * @return array<string, array{string}>
     */
    public static function publicRoutes(): array
    {
        return [
            'home' => ['/'],
            'shop' => ['/boutique'],
            'collections' => ['/collections'],
            'discovery guide' => ['/decouvrir'],
            'packs' => ['/coffrets'],
        ];
    }

    #[DataProvider('publicRoutes')]
    public function test_public_storefront_routes_render_with_200_and_stay_indexable(string $path): void
    {
        $response = $this->get($path);

        $response->assertOk()
            ->assertSee('<div id="app"></div>', false)
            ->assertDontSee('noindex', false);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function privateRoutes(): array
    {
        return [
            'cart' => ['/panier'],
            'checkout' => ['/commande'],
            'order confirmation' => ['/commande/confirmation/RP-261021-ABC234'],
            'account' => ['/compte'],
            'sign in' => ['/compte/connexion'],
            'order history entry' => ['/compte/commandes/RP-261021-ABC234'],
        ];
    }

    #[DataProvider('privateRoutes')]
    public function test_private_routes_render_with_200_but_are_not_indexed(string $path): void
    {
        $response = $this->get($path);

        $response->assertOk()
            ->assertSee('noindex', false);
    }

    public function test_unknown_path_returns_404_and_is_not_indexed(): void
    {
        $response = $this->get('/page-qui-n-existe-pas');

        $response->assertNotFound()
            ->assertSee('noindex', false);
    }

    public function test_unpublished_product_page_returns_404_and_is_not_indexed(): void
    {
        Product::factory()->draft()->withVariant()->named('Ambre Secret')->create();

        $response = $this->get('/parfums/ambre-secret');

        $response->assertNotFound()
            ->assertSee('noindex', false);
    }

    public function test_product_page_renders_its_meta_and_aggregate_offer_in_dirhams(): void
    {
        $product = Product::factory()->published()->named('Aurore')->create([
            'tagline' => 'Ambre et fleur d’oranger',
            'meta_title' => null,
            'meta_description' => null,
        ]);
        ProductVariant::factory()->for($product)->create(['size_ml' => 50, 'price' => 45000, 'sku' => 'AUR-50', 'sort_order' => 0]);
        ProductVariant::factory()->for($product)->outOfStock()->create(['size_ml' => 100, 'price' => 80000, 'sku' => 'AUR-100', 'sort_order' => 1]);
        ProductVariant::factory()->for($product)->inactive()->create(['size_ml' => 200, 'price' => 150000]);
        ProductImage::factory()->for($product)->create(['path' => 'products/aurore.webp']);

        $response = $this->get('/parfums/aurore');

        $response->assertOk()
            ->assertSee('<title>Aurore — Myperfum</title>', false)
            ->assertDontSee('noindex', false);
        $meta = $response->viewData('meta');
        $this->assertSame('Ambre et fleur d’oranger', $meta['description']);
        $this->assertSame('product', $meta['type']);
        $this->assertStringEndsWith('/storage/products/aurore.webp', $meta['image']);
        $jsonLd = $this->jsonLd($response);
        $this->assertSame('Product', $jsonLd['@type']);
        $this->assertSame('Aurore', $jsonLd['name']);
        $this->assertSame('AUR-50', $jsonLd['sku']);
        $this->assertSame([
            '@type' => 'AggregateOffer',
            'priceCurrency' => 'MAD',
            'lowPrice' => '450.00',
            'highPrice' => '800.00',
            'offerCount' => 2,
            'availability' => 'https://schema.org/InStock',
        ], $jsonLd['offers']);
    }

    public function test_product_structured_data_reports_out_of_stock_once_no_bottle_is_left(): void
    {
        $product = Product::factory()->published()->named('Aurore')->create();
        ProductVariant::factory()->for($product)->outOfStock()->create();

        $response = $this->get('/parfums/aurore');

        $response->assertOk();
        $this->assertSame('https://schema.org/OutOfStock', $this->jsonLd($response)['offers']['availability']);
    }

    public function test_product_name_cannot_break_out_of_the_title_or_the_structured_data(): void
    {
        $name = 'Nuit </script><script>alert(1)</script>';
        $product = Product::factory()->published()->named($name)->create(['tagline' => 'Cuir & "encens"']);
        ProductVariant::factory()->for($product)->create();

        $response = $this->get('/parfums/'.$product->slug);

        $response->assertOk()
            ->assertDontSee('<script>alert(1)</script>', false)
            ->assertSee('<title>Nuit &lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt; — Myperfum</title>', false)
            ->assertDontSee('Cuir & "encens"', false)
            ->assertSee('Cuir &amp; &quot;encens&quot;', false);
        $this->assertSame($name, $this->jsonLd($response)['name']);
    }

    public function test_collection_name_cannot_break_out_of_the_inline_storefront_config(): void
    {
        $name = 'Soirées </script><script>alert(1)</script>';
        Collection::factory()->named($name)->create();

        $response = $this->get('/');

        $response->assertOk()
            ->assertDontSee('<script>alert(1)</script>', false);
        $this->assertSame($name, $this->inlineConfig($response)['collections'][0]['name']);
    }

    public function test_collection_page_uses_the_collection_name_and_tagline(): void
    {
        Collection::factory()->named('Nuits d’Orient')->create(['tagline' => 'Oud, ambre et safran.']);

        $response = $this->get('/collections/nuits-dorient');

        $response->assertOk()
            ->assertSee('<title>Nuits d’Orient — Myperfum</title>', false);
        $this->assertSame('Oud, ambre et safran.', $response->viewData('meta')['description']);
    }

    public function test_pack_page_uses_the_pack_name_tagline_and_image(): void
    {
        Pack::factory()->named('Coffret Nuit Blanche')->create([
            'tagline' => 'Trois parfums du soir à composer.',
            'image_path' => '/images/packs/nuit-blanche.webp',
        ]);

        $response = $this->get('/coffrets/coffret-nuit-blanche');

        $response->assertOk()
            ->assertSee('<title>Coffret Nuit Blanche — Myperfum</title>', false)
            ->assertDontSee('noindex', false);
        $meta = $response->viewData('meta');
        $this->assertSame('Trois parfums du soir à composer.', $meta['description']);
        $this->assertStringEndsWith('/images/packs/nuit-blanche.webp', $meta['image']);
    }

    public function test_svg_artwork_is_replaced_by_the_default_share_image(): void
    {
        Pack::factory()->named('Coffret Nuit Blanche')->create(['image_path' => '/images/demo/coffret-nuit.svg']);

        $response = $this->get('/coffrets/coffret-nuit-blanche');

        $response->assertOk();
        $this->assertStringEndsWith('/images/og-default.jpg', $response->viewData('meta')['image']);
    }

    public function test_pack_page_without_tagline_describes_the_pack_in_at_most_155_characters(): void
    {
        Pack::factory()->named('Coffret Nuit Blanche')->create(['tagline' => null, 'description' => str_repeat('a', 200), 'image_path' => null]);

        $response = $this->get('/coffrets/coffret-nuit-blanche');

        $response->assertOk();
        $meta = $response->viewData('meta');
        $this->assertSame(str_repeat('a', 155).'...', $meta['description']);
        $this->assertStringEndsWith('/images/og-default.jpg', $meta['image']);
    }

    public function test_pack_page_without_tagline_or_description_falls_back_to_the_store_description(): void
    {
        Pack::factory()->named('Coffret Nuit Blanche')->create(['tagline' => null, 'description' => null]);

        $response = $this->get('/coffrets/coffret-nuit-blanche');

        $response->assertOk();
        $this->assertSame(
            'Parfums de niche et coffrets composés à la main. Livraison au Maroc selon votre ville.',
            $response->viewData('meta')['description'],
        );
    }

    /**
     * @return array<string, array{Closure(): ?Pack}>
     */
    public static function unavailablePacks(): array
    {
        return [
            'pack that does not exist' => [fn () => null],
            'pack no longer offered' => [fn () => Pack::factory()->inactive()->named('Coffret Retiré')->create()],
        ];
    }

    /**
     * @param  Closure(): ?Pack  $arrange
     */
    #[DataProvider('unavailablePacks')]
    public function test_unavailable_pack_page_returns_404_and_is_not_indexed(Closure $arrange): void
    {
        $arrange();

        $response = $this->get('/coffrets/coffret-retire');

        $response->assertNotFound()
            ->assertSee('noindex', false);
    }

    public function test_hidden_collection_page_returns_404(): void
    {
        Collection::factory()->hidden()->named('Avant-première')->create();

        $response = $this->get('/collections/avant-premiere');

        $response->assertNotFound()
            ->assertSee('noindex', false);
    }

    public function test_published_page_uses_its_title_and_meta_description(): void
    {
        Page::create([
            'slug' => 'livraison', 'title' => 'Livraison', 'body' => 'Délais.',
            'meta_description' => 'Délais et frais de livraison au Maroc.', 'is_published' => true,
        ]);

        $response = $this->get('/pages/livraison');

        $response->assertOk()
            ->assertSee('<title>Livraison — Myperfum</title>', false);
        $this->assertSame('Délais et frais de livraison au Maroc.', $response->viewData('meta')['description']);
    }

    public function test_unpublished_page_returns_404(): void
    {
        Page::create(['slug' => 'retours', 'title' => 'Retours', 'body' => 'À venir.', 'is_published' => false]);

        $response = $this->get('/pages/retours');

        $response->assertNotFound();
    }

    /**
     * @return array<string, array{string}>
     */
    public static function adminPaths(): array
    {
        return [
            'dashboard' => ['/admin'],
            'deep link' => ['/admin/commandes/RP-261021-ABC234'],
        ];
    }

    public function test_arabic_pages_render_right_to_left_with_arabic_metadata(): void
    {
        $product = Product::factory()->published()->create(['name' => 'Aurore', 'slug' => 'aurore', 'name_ar' => 'الفجر', 'tagline_ar' => 'عنبر وزهر البرتقال']);
        ProductVariant::factory()->for($product)->create();

        $response = $this->get('/ar/parfums/aurore');

        $response->assertOk()
            ->assertSee('<html lang="ar" dir="rtl"', false)
            ->assertSee('<title>الفجر — Myperfum</title>', false)
            ->assertSee('<meta property="og:locale" content="ar_MA">', false);
        $this->assertSame('عنبر وزهر البرتقال', $response->viewData('meta')['description']);
        $this->assertSame('الفجر', $this->jsonLd($response)['name']);
    }

    public function test_pages_link_to_their_version_in_each_language(): void
    {
        $response = $this->get('/boutique');

        $response->assertOk()
            ->assertSee('<html lang="fr" dir="ltr"', false)
            ->assertSee('hreflang="fr" href="'.config('app.url').'/boutique"', false)
            ->assertSee('hreflang="ar" href="'.config('app.url').'/ar/boutique"', false)
            ->assertSee('hreflang="en" href="'.config('app.url').'/en/boutique"', false)
            ->assertSee('hreflang="x-default" href="'.config('app.url').'/boutique"', false);
    }

    public function test_english_pages_render_left_to_right_with_english_metadata(): void
    {
        $product = Product::factory()->published()->create(['name' => 'Aurore', 'slug' => 'aurore', 'name_en' => 'Dawn', 'tagline_en' => 'Amber and orange blossom']);
        ProductVariant::factory()->for($product)->create();

        $response = $this->get('/en/parfums/aurore');

        $response->assertOk()
            ->assertSee('<html lang="en" dir="ltr"', false)
            ->assertSee('<title>Dawn — Myperfum</title>', false)
            ->assertSee('<meta property="og:locale" content="en_GB">', false)
            ->assertSee('<meta property="og:locale:alternate" content="fr_MA">', false)
            ->assertSee('<meta property="og:locale:alternate" content="ar_MA">', false);
        $this->assertSame('Amber and orange blossom', $response->viewData('meta')['description']);
        $this->assertSame('Dawn', $this->jsonLd($response)['name']);
    }

    public function test_english_pages_keep_the_french_text_where_no_english_is_written(): void
    {
        $product = Product::factory()->published()->create(['name' => 'Nuit d’Ambre', 'slug' => 'nuit-d-ambre', 'name_en' => null]);
        ProductVariant::factory()->for($product)->create();

        $this->get('/en/parfums/nuit-d-ambre')
            ->assertOk()
            ->assertSee('<title>Nuit d’Ambre — Myperfum</title>', false);
    }

    public function test_english_home_page_renders_with_200(): void
    {
        $response = $this->get('/en');

        $response->assertOk()
            ->assertSee('<html lang="en" dir="ltr"', false)
            ->assertSee('<title>Myperfum — Perfume house</title>', false);
    }

    public function test_unknown_english_path_returns_404_and_is_not_indexed(): void
    {
        $this->get('/en/page-qui-n-existe-pas')
            ->assertNotFound()
            ->assertSee('noindex', false);
    }

    public function test_arabic_home_page_renders_with_200(): void
    {
        $response = $this->get('/ar');

        $response->assertOk()
            ->assertSee('<html lang="ar" dir="rtl"', false)
            ->assertSee('<title>Myperfum — دار عطور</title>', false);
    }

    public function test_unknown_arabic_path_returns_404_and_is_not_indexed(): void
    {
        $response = $this->get('/ar/page-qui-n-existe-pas');

        $response->assertNotFound()
            ->assertSee('noindex', false);
    }

    public function test_private_arabic_pages_are_not_indexed_nor_offered_in_other_languages(): void
    {
        $response = $this->get('/ar/panier');

        $response->assertOk()
            ->assertSee('noindex', false)
            ->assertDontSee('hreflang', false);
    }

    #[DataProvider('adminPaths')]
    public function test_admin_shell_renders_with_200_and_is_never_indexed(string $path): void
    {
        $response = $this->get($path);

        $response->assertOk()
            ->assertSee('<title>Administration — Myperfum</title>', false)
            ->assertSee('noindex', false);
    }

    /**
     * @return array<string, mixed>
     */
    private function jsonLd(TestResponse $response): array
    {
        $this->assertSame(1, preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $response->getContent(), $matches));

        return json_decode($matches[1], true, flags: JSON_THROW_ON_ERROR);
    }

    /**
     * @return array<string, mixed>
     */
    private function inlineConfig(TestResponse $response): array
    {
        $this->assertSame(1, preg_match('#window\.__STOREFRONT__ = (.*?);</script>#s', $response->getContent(), $matches));

        return json_decode($matches[1], true, flags: JSON_THROW_ON_ERROR);
    }
}
