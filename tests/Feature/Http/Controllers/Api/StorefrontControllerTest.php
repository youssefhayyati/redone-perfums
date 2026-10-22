<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Models\City;
use App\Models\Collection;
use App\Models\DeliveryZone;
use App\Models\Pack;
use App\Models\Page;
use App\Models\Product;
use App\Services\Settings\StoreSettings;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class StorefrontControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * @param  list<array<string, string>>  $expected
     */
    #[TestWith([true, [['code' => 'cod', 'label' => 'Paiement à la livraison', 'description' => 'Réglez en espèces à la réception de votre commande.']]])]
    #[TestWith([false, []])]
    public function test_config_offers_cash_on_delivery_only_while_it_is_enabled(bool $enabled, array $expected): void
    {
        app(StoreSettings::class)->put(['payment.cod_enabled' => $enabled]);

        $response = $this->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('payment_methods', $expected);
    }

    public function test_config_promises_no_benefit_that_is_not_configured(): void
    {
        app(StoreSettings::class)->put(['payment.cod_enabled' => false]);

        $response = $this->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('benefits', []);
    }

    public function test_config_derives_each_benefit_from_the_store_configuration(): void
    {
        $zone = DeliveryZone::factory()->create();
        City::factory()->count(2)->for($zone, 'zone')->create();
        City::factory()->inactive()->for($zone, 'zone')->create();
        City::factory()->for(DeliveryZone::factory()->inactive(), 'zone')->create();
        Pack::factory()->create();
        app(StoreSettings::class)->put([
            'benefits.gift_packaging' => true,
            'benefits.gift_packaging_text' => 'Écrin noir et ruban satiné offerts.',
            'contact.phone' => '05 22 00 00 00',
            'contact.hours' => 'du lundi au samedi, 10 h – 19 h',
        ]);

        $response = $this->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('benefits', [
                ['icon' => 'truck', 'title' => 'Livraison au Maroc', 'text' => 'Livraison dans 2 villes, frais calculés selon votre ville avant validation.'],
                ['icon' => 'banknote', 'title' => 'Paiement à la livraison', 'text' => 'Vous réglez en espèces à la réception de votre commande.'],
                ['icon' => 'layers', 'title' => 'Coffrets à composer', 'text' => 'Réunissez vos parfums préférés dans un coffret au prix avantageux.'],
                ['icon' => 'gift', 'title' => 'Écrin cadeau', 'text' => 'Écrin noir et ruban satiné offerts.'],
                ['icon' => 'message-circle', 'title' => 'Conseil personnalisé', 'text' => 'Une question sur un parfum ? Écrivez-nous — du lundi au samedi, 10 h – 19 h.'],
            ]);
    }

    public function test_config_delivery_benefit_counts_a_single_city_in_the_singular(): void
    {
        City::factory()->create();
        app(StoreSettings::class)->put(['payment.cod_enabled' => false]);

        $response = $this->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('benefits.*.text', ['Livraison dans 1 ville, frais calculés selon votre ville avant validation.']);
    }

    public function test_config_gift_benefit_falls_back_to_a_default_text(): void
    {
        app(StoreSettings::class)->put(['payment.cod_enabled' => false, 'benefits.gift_packaging' => true]);

        $response = $this->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('benefits.*.text', ['Un emballage cadeau est proposé pour vos commandes.']);
    }

    public function test_config_lists_published_pages_visible_collections_and_filled_social_links(): void
    {
        Page::create(['slug' => 'livraison', 'title' => 'Livraison', 'body' => 'Délais.', 'is_published' => true, 'sort_order' => 2]);
        Page::create(['slug' => 'retours', 'title' => 'Retours', 'body' => 'Conditions.', 'is_published' => true, 'sort_order' => 1]);
        Page::create(['slug' => 'brouillon', 'title' => 'Brouillon', 'body' => 'À venir.', 'is_published' => false]);
        Collection::factory()->named('Signatures')->create();
        Collection::factory()->hidden()->create();
        app(StoreSettings::class)->put([
            'social.instagram' => 'https://instagram.com/redone',
            'checkout.email_required' => true,
        ]);

        $response = $this->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('pages', [['slug' => 'retours', 'title' => 'Retours'], ['slug' => 'livraison', 'title' => 'Livraison']])
            ->assertJsonPath('collections', [['name' => 'Signatures', 'slug' => 'signatures']])
            ->assertJsonPath('social', ['instagram' => 'https://instagram.com/redone'])
            ->assertJsonPath('checkout', ['email_required' => true])
            ->assertJsonPath('has_packs', false);
    }

    public function test_config_never_publishes_the_orders_inbox(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@myperfum.ma', 'notifications.orders_email' => 'commandes@myperfum.ma']);

        $response = $this->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('contact.email', 'contact@myperfum.ma')
            ->assertDontSee('commandes@myperfum.ma');
    }

    public function test_config_loads_no_tracker_until_one_is_configured(): void
    {
        $this->getJson('/api/storefront')->assertOk()->assertJsonPath('analytics', []);
    }

    public function test_config_shows_no_store_location_until_its_coordinates_are_filled(): void
    {
        app(StoreSettings::class)->put(['location.hours' => 'Du lundi au samedi, 10 h – 20 h']);

        $this->getJson('/api/storefront')->assertOk()->assertJsonPath('location', null);
    }

    public function test_arabic_config_describes_the_store_location_in_arabic(): void
    {
        app(StoreSettings::class)->put([
            'location.coordinates' => '34.0209, -6.8416',
            'location.hours' => 'Du lundi au samedi, 10 h – 20 h',
            'location.hours_ar' => 'من الاثنين إلى السبت، 10 – 20',
        ]);

        $response = $this->withHeader('X-Locale', 'ar')->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('location.lat', 34.0209)
            ->assertJsonPath('location.zoom', 16)
            ->assertJsonPath('location.title', 'تعالوا لاكتشاف عطورنا')
            ->assertJsonPath('location.hours', 'من الاثنين إلى السبت، 10 – 20');
    }

    public function test_arabic_config_speaks_arabic(): void
    {
        City::factory()->count(3)->for(DeliveryZone::factory(), 'zone')->create();
        app(StoreSettings::class)->put(['announcement.text_ar' => 'شحن مجاني هذا الأسبوع']);

        $response = $this->withHeader('X-Locale', 'ar')->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('store.descriptor', 'دار عطور')
            ->assertJsonPath('announcement.text', 'شحن مجاني هذا الأسبوع')
            ->assertJsonPath('payment_methods.0.label', 'الدفع عند الاستلام')
            ->assertJsonPath('benefits.0.text', 'التوصيل إلى 3 مدن، وتُحتسب رسوم التوصيل حسب مدينتك قبل تأكيد الطلب.');
    }

    public function test_arabic_home_uses_the_arabic_hero_texts(): void
    {
        $response = $this->withHeader('X-Locale', 'ar')->getJson('/api/home');

        $response->assertOk()
            ->assertJsonPath('hero.title', 'الساعة التي يتجلّى فيها العطر.')
            ->assertJsonPath('hero.eyebrow', 'دار عطور · مجموعة الليل');
    }

    public function test_home_features_published_featured_products_in_their_manual_order(): void
    {
        $second = Product::factory()->published()->featured()->withVariant()->create(['sort_order' => 2]);
        $first = Product::factory()->published()->featured()->withVariant()->create(['sort_order' => 1]);
        Product::factory()->draft()->featured()->withVariant()->create();
        Product::factory()->published()->featured()->create();
        Product::factory()->published()->withVariant()->create(['sales_count' => 500]);

        $response = $this->getJson('/api/home');

        $response->assertOk()
            ->assertJsonPath('featured.*.slug', [$first->slug, $second->slug]);
    }

    public function test_home_falls_back_to_best_sellers_if_nothing_is_featured(): void
    {
        $steady = Product::factory()->published()->withVariant()->create(['sales_count' => 5]);
        $bestSeller = Product::factory()->published()->withVariant()->create(['sales_count' => 50]);
        $runnerUp = Product::factory()->published()->withVariant()->create(['sales_count' => 20]);
        Product::factory()->draft()->withVariant()->create(['sales_count' => 100]);

        $response = $this->getJson('/api/home');

        $response->assertOk()
            ->assertJsonPath('featured.*.slug', [$bestSeller->slug, $runnerUp->slug, $steady->slug]);
    }

    public function test_home_tells_the_story_of_the_configured_product(): void
    {
        $story = Product::factory()->published()->withVariant()->named('Cèdre Blanc')->create([
            'inspiration' => 'Une forêt de l’Atlas au petit matin.',
        ]);
        Product::factory()->published()->featured()->withVariant()->create(['inspiration' => 'Un autre récit.']);
        app(StoreSettings::class)->put(['home.story_product_id' => $story->id]);

        $response = $this->getJson('/api/home');

        $response->assertOk()
            ->assertJsonPath('story.eyebrow', 'Le récit')
            ->assertJsonPath('story.title', 'Cèdre Blanc')
            ->assertJsonPath('story.body', 'Une forêt de l’Atlas au petit matin.')
            ->assertJsonPath('story.product.slug', 'cedre-blanc');
    }

    public function test_home_story_falls_back_to_a_featured_product_with_an_inspiration(): void
    {
        Product::factory()->published()->withVariant()->create(['inspiration' => 'Un récit discret.', 'sort_order' => 1]);
        $featured = Product::factory()->published()->featured()->withVariant()->create(['inspiration' => 'Le récit vedette.', 'sort_order' => 2]);

        $response = $this->getJson('/api/home');

        $response->assertOk()
            ->assertJsonPath('story.product.slug', $featured->slug)
            ->assertJsonPath('story.body', 'Le récit vedette.');
    }
}
