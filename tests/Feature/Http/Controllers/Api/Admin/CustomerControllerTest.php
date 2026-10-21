<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CustomerControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_only_customers_with_totals_that_exclude_cancelled_orders(): void
    {
        $customer = User::factory()->customer()->withPhone('+212612345678')->create(['name' => 'Salma Benali']);
        Order::factory()->for($customer)->amounts(45000)->placedAt('2026-10-01 10:00:00')->create();
        Order::factory()->for($customer)->amounts(80000)->placedAt('2026-10-10 10:00:00')->create();
        Order::factory()->for($customer)->cancelled()->amounts(100000)->placedAt('2026-10-15 10:00:00')->create();
        User::factory()->support()->create();
        User::factory()->admin()->create();

        $response = $this->actingAs($this->support())->getJson('/api/admin/customers');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Salma Benali')
            ->assertJsonPath('data.0.phone', '06 12 34 56 78')
            ->assertJsonPath('data.0.orders_count', 2)
            ->assertJsonPath('data.0.total_spent', 131000)
            ->assertJsonPath('data.0.last_order_at', '2026-10-15T10:00:00+01:00');
    }

    /**
     * @return array<string, array{string}>
     */
    public static function searchTerms(): array
    {
        return [
            'name' => ['benali'],
            'email' => ['salma.b@'],
            'phone typed in national format' => ['06 12 34 56 78'],
        ];
    }

    #[DataProvider('searchTerms')]
    public function test_index_search_finds_the_customer(string $term): void
    {
        $salma = User::factory()->customer()->withPhone('+212612345678')->create(['name' => 'Salma Benali', 'email' => 'salma.b@example.com']);
        User::factory()->customer()->withPhone('+212698765432')->create(['name' => 'Karim Idrissi', 'email' => 'karim@example.com']);

        $response = $this->actingAs($this->support())->getJson('/api/admin/customers?search='.urlencode($term));

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$salma->id]);
    }

    public function test_show_returns_the_customer_with_their_orders(): void
    {
        $customer = User::factory()->customer()->create();
        $order = Order::factory()->for($customer)->create();
        Order::factory()->create();

        $response = $this->actingAs($this->support())->getJson("/api/admin/customers/{$customer->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $customer->id)
            ->assertJsonPath('data.orders_count', 1)
            ->assertJsonPath('data.orders.*.reference', [$order->reference]);
    }

    public function test_show_of_a_staff_account_returns_404(): void
    {
        $manager = User::factory()->manager()->create();

        $response = $this->actingAs($this->support())->getJson("/api/admin/customers/{$manager->id}");

        $response->assertNotFound();
    }

    private function support(): User
    {
        return User::factory()->support()->create();
    }
}
