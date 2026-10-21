<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AccountControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * @return array<string, array{string, string}>
     */
    public static function accountRoutes(): array
    {
        return [
            'order history' => ['get', '/api/account/orders'],
            'order detail' => ['get', '/api/account/orders/RP-261021-ABC234'],
            'profile' => ['put', '/api/account/profile'],
            'password' => ['put', '/api/account/password'],
        ];
    }

    #[DataProvider('accountRoutes')]
    public function test_account_routes_return_401_without_a_session(string $method, string $uri): void
    {
        $response = $this->json($method, $uri);

        $response->assertUnauthorized();
    }

    public function test_orders_lists_only_the_customer_s_own_orders_newest_first(): void
    {
        $customer = User::factory()->customer()->create();
        $older = Order::factory()->for($customer)->placedAt(now()->subDays(3))->create();
        $newer = Order::factory()->for($customer)->placedAt(now()->subDay())->create();
        Order::factory()->for(User::factory()->customer())->create();
        Order::factory()->create();

        $response = $this->actingAs($customer)->getJson('/api/account/orders');

        $response->assertOk()
            ->assertJsonPath('data.*.reference', [$newer->reference, $older->reference]);
    }

    public function test_order_detail_returns_the_customer_s_order_with_its_lines(): void
    {
        $customer = User::factory()->customer()->create();
        $variant = ProductVariant::factory()->for(Product::factory()->state(['name' => 'Ambre Nuit']))->create(['price' => 45000]);
        $order = Order::factory()->for($customer)->withItem($variant, 2)->create();

        $response = $this->actingAs($customer)->getJson("/api/account/orders/{$order->reference}");

        $response->assertOk()
            ->assertJsonPath('data.reference', $order->reference)
            ->assertJsonPath('data.items.0.name', 'Ambre Nuit')
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.line_total', 90000);
    }

    public function test_order_detail_of_another_customer_returns_404(): void
    {
        $order = Order::factory()->for(User::factory()->customer())->create();

        $response = $this->actingAs(User::factory()->customer()->create())->getJson("/api/account/orders/{$order->reference}");

        $response->assertNotFound();
    }

    public function test_profile_update_stores_the_phone_in_e164_and_returns_it_formatted(): void
    {
        $customer = User::factory()->customer()->create(['name' => 'Salma']);

        $response = $this->actingAs($customer)->putJson('/api/account/profile', [
            'name' => 'Salma Benali',
            'phone' => '+212 6 98 76 54 32',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.name', 'Salma Benali')
            ->assertJsonPath('user.phone', '06 98 76 54 32');
        $this->assertDatabaseHas('users', ['id' => $customer->id, 'name' => 'Salma Benali', 'phone' => '+212698765432']);
    }

    public function test_profile_update_with_a_foreign_phone_returns_422(): void
    {
        $customer = User::factory()->customer()->withPhone('+212612345678')->create();

        $response = $this->actingAs($customer)->putJson('/api/account/profile', [
            'name' => 'Salma Benali',
            'phone' => '+33 6 12 34 56 78',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'Saisissez un numéro marocain valide (ex. 06 12 34 56 78).']);
        $this->assertSame('+212612345678', $customer->fresh()->phone);
    }

    public function test_profile_update_can_remove_the_phone(): void
    {
        $customer = User::factory()->customer()->withPhone('+212612345678')->create();

        $response = $this->actingAs($customer)->putJson('/api/account/profile', ['name' => 'Salma Benali', 'phone' => null]);

        $response->assertOk()
            ->assertJsonPath('user.phone', null);
        $this->assertNull($customer->fresh()->phone);
    }

    public function test_password_update_with_a_wrong_current_password_returns_422(): void
    {
        $customer = User::factory()->customer()->create();

        $response = $this->actingAs($customer)->putJson('/api/account/password', [
            'current_password' => 'not-the-password',
            'password' => 'Parfum2026',
            'password_confirmation' => 'Parfum2026',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'Le mot de passe est incorrect.']);
        $this->assertTrue(Hash::check('password', $customer->fresh()->password));
    }

    public function test_password_update_replaces_the_password(): void
    {
        $customer = User::factory()->customer()->create();

        $response = $this->actingAs($customer)->putJson('/api/account/password', [
            'current_password' => 'password',
            'password' => 'Parfum2026',
            'password_confirmation' => 'Parfum2026',
        ]);

        $response->assertOk()
            ->assertExactJson(['message' => 'Mot de passe mis à jour.']);
        $this->assertTrue(Hash::check('Parfum2026', $customer->fresh()->password));
    }
}
