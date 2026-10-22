<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\Settings\StoreSettings;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class SettingsControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_manager_gets_403_on_settings(): void
    {
        $response = $this->actingAs(User::factory()->manager()->create())->getJson('/api/admin/settings');

        $response->assertForbidden();
    }

    public function test_show_lists_every_setting_with_its_current_value_and_the_published_products(): void
    {
        app(StoreSettings::class)->put(['announcement.text' => 'Livraison offerte dès 1 000 DH']);
        $published = Product::factory()->published()->named('Ambre Nuit')->create();
        Product::factory()->draft()->create();

        $response = $this->actingAs($this->admin())->getJson('/api/admin/settings');

        $response->assertOk()
            ->assertJsonFragment([
                'key' => 'announcement.text',
                'group' => 'announcement',
                'type' => 'string',
                'label' => 'Texte de l’annonce',
                'value' => 'Livraison offerte dès 1 000 DH',
            ])
            ->assertJsonFragment(['key' => 'payment.cod_enabled', 'group' => 'payment', 'type' => 'boolean', 'label' => 'Paiement à la livraison', 'value' => true])
            ->assertJsonPath('products', [['id' => $published->id, 'name' => 'Ambre Nuit']]);
    }

    public function test_update_persists_each_value_with_its_declared_type(): void
    {
        $response = $this->actingAs($this->admin())->putJson('/api/admin/settings', ['values' => [
            'payment.cod_enabled' => '0',
            'checkout.email_required' => 1,
            'home.story_product_id' => '12',
            'store.name' => 'Maison Redone',
            'contact.phone' => '',
        ]]);

        $response->assertOk();
        $this->assertSame(false, $this->storedValue('payment.cod_enabled'));
        $this->assertSame(true, $this->storedValue('checkout.email_required'));
        $this->assertSame(12, $this->storedValue('home.story_product_id'));
        $this->assertSame('Maison Redone', $this->storedValue('store.name'));
        $this->assertNull($this->storedValue('contact.phone'));
    }

    public function test_update_rejects_an_external_announcement_link_with_422(): void
    {
        $response = $this->actingAs($this->admin())->putJson('/api/admin/settings', ['values' => [
            'announcement.link' => 'https://evil.example/promo',
        ]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['values.announcement.link' => 'Le lien doit être un chemin interne commençant par « / ».']);
        $this->assertDatabaseCount('store_settings', 0);
    }

    public function test_update_accepts_an_internal_announcement_link(): void
    {
        $response = $this->actingAs($this->admin())->putJson('/api/admin/settings', ['values' => [
            'announcement.link' => '/coffrets?tri=nouveautes',
        ]]);

        $response->assertOk();
        $this->assertSame('/coffrets?tri=nouveautes', $this->storedValue('announcement.link'));
    }

    public function test_update_requires_social_links_to_use_https_with_422(): void
    {
        $response = $this->actingAs($this->admin())->putJson('/api/admin/settings', ['values' => [
            'social.instagram' => 'http://instagram.com/redone',
        ]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['values.social.instagram' => 'Le champ Instagram doit être une URL valide.']);
        $this->assertDatabaseCount('store_settings', 0);
    }

    public function test_update_names_each_invalid_setting_by_its_label(): void
    {
        $response = $this->actingAs($this->admin())->putJson('/api/admin/settings', ['values' => [
            'contact.email' => 'pas-une-adresse',
            'home.story_product_id' => 'douze',
        ]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors([
                'values.contact.email' => 'Le champ E-mail de contact doit être une adresse e-mail valide.',
                'values.home.story_product_id' => 'Le champ Récit — parfum mis en avant doit être un nombre entier.',
            ]);
        $this->assertDatabaseCount('store_settings', 0);
    }

    public function test_update_requires_the_orders_inbox_to_be_an_email_address_with_422(): void
    {
        $response = $this->actingAs($this->admin())->putJson('/api/admin/settings', ['values' => [
            'notifications.orders_email' => 'commandes-myperfum',
        ]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors([
                'values.notifications.orders_email' => 'Le champ E-mail qui reçoit les nouvelles commandes (par défaut : e-mail de contact) doit être une adresse e-mail valide.',
            ]);
        $this->assertDatabaseCount('store_settings', 0);
    }

    public function test_update_ignores_keys_that_are_not_store_settings(): void
    {
        $response = $this->actingAs($this->admin())->putJson('/api/admin/settings', ['values' => [
            'store.name' => 'Maison Redone',
            'app.key' => 'base64:injected',
            'mail.password' => 'secret',
        ]]);

        $response->assertOk();
        $this->assertSame(['store.name'], StoreSetting::query()->pluck('key')->all());
    }

    public function test_storefront_config_reflects_a_saved_setting_immediately(): void
    {
        $this->actingAs($this->admin())->putJson('/api/admin/settings', ['values' => [
            'payment.cod_enabled' => false,
            'announcement.text' => 'Nouvelle collection disponible',
        ]])->assertOk();

        $response = $this->getJson('/api/storefront');

        $response->assertOk()
            ->assertJsonPath('payment_methods', [])
            ->assertJsonPath('announcement.text', 'Nouvelle collection disponible');
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    private function storedValue(string $key): mixed
    {
        return StoreSetting::query()->where('key', $key)->sole()->value;
    }
}
