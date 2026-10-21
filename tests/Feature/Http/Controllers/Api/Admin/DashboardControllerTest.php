<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Enums\CartItemType;
use App\Models\City;
use App\Models\Order;
use App\Models\Page;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Settings\StoreSettings;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_customer_session_gets_403(): void
    {
        $response = $this->actingAs(User::factory()->customer()->create())->getJson('/api/admin/dashboard');

        $response->assertForbidden();
    }

    public function test_support_staff_sees_order_counts_but_no_revenue(): void
    {
        $this->travelTo('2026-10-21 12:00:00');
        Order::factory()->amounts(45000)->placedAt(now()->subDays(2))->create();

        $response = $this->actingAs(User::factory()->support()->create())->getJson('/api/admin/dashboard?days=7');

        $response->assertOk()
            ->assertJsonPath('kpis.orders', 1)
            ->assertJsonPath('kpis.revenue', null)
            ->assertJsonPath('kpis.revenue_previous', null)
            ->assertJsonPath('kpis.average_order_value', null)
            ->assertJsonPath('trend.4.orders', 1)
            ->assertJsonPath('trend.4.revenue', null);
    }

    public function test_revenue_excludes_cancelled_orders(): void
    {
        $this->travelTo('2026-10-21 12:00:00');
        Order::factory()->amounts(45000)->placedAt(now()->subDays(2))->create();
        Order::factory()->amounts(80000)->placedAt(now()->subDays(5))->create();
        Order::factory()->cancelled()->amounts(100000)->placedAt(now()->subDays(3))->create();
        Order::factory()->amounts(30000)->placedAt(now()->subDays(40))->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard?days=30');

        $response->assertOk()
            ->assertJsonPath('kpis.revenue', 131000)
            ->assertJsonPath('kpis.orders', 2)
            ->assertJsonPath('kpis.average_order_value', 65500)
            ->assertJsonPath('kpis.cancelled_orders', 1)
            ->assertJsonPath('kpis.revenue_previous', 33000)
            ->assertJsonPath('kpis.orders_previous', 1);
    }

    public function test_current_period_counts_an_order_placed_right_now(): void
    {
        $this->travelTo('2026-10-21 12:00:00');
        Order::factory()->amounts(45000)->placedAt(now())->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard?days=7');

        $response->assertOk()
            ->assertJsonPath('kpis.orders', 1)
            ->assertJsonPath('kpis.revenue', 48000)
            ->assertJsonPath('trend.6.orders', 1);
    }

    public function test_an_order_placed_as_the_period_starts_counts_in_the_current_period_only(): void
    {
        $this->travelTo('2026-10-21 12:00:00');
        Order::factory()->amounts(45000)->placedAt('2026-10-15 00:00:00')->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard?days=7');

        $response->assertOk()
            ->assertJsonPath('kpis.orders', 1)
            ->assertJsonPath('kpis.orders_previous', 0)
            ->assertJsonPath('kpis.revenue_previous', 0);
    }

    public function test_trend_has_one_point_per_day_of_the_range(): void
    {
        $this->travelTo('2026-10-21 12:00:00');
        Order::factory()->amounts(45000)->placedAt('2026-10-20 18:30:00')->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard?days=7');

        $response->assertOk()
            ->assertJsonPath('range', ['days' => 7, 'from' => '2026-10-15', 'to' => '2026-10-21'])
            ->assertJsonCount(7, 'trend')
            ->assertJsonPath('trend.5', ['date' => '2026-10-20', 'revenue' => 48000, 'orders' => 1])
            ->assertJsonPath('trend.6', ['date' => '2026-10-21', 'revenue' => 0, 'orders' => 0]);
    }

    public function test_unsupported_range_falls_back_to_thirty_days(): void
    {
        $this->travelTo('2026-10-21 12:00:00');
        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard?days=12');

        $response->assertOk()
            ->assertJsonPath('range', ['days' => 30, 'from' => '2026-09-22', 'to' => '2026-10-21']);
    }

    public function test_best_sellers_count_bottles_sold_alone_and_inside_packs(): void
    {
        $this->travelTo('2026-10-21 12:00:00');
        $amber = ProductVariant::factory()->for(Product::factory()->state(['name' => 'Ambre Nuit']))->create();
        $oud = ProductVariant::factory()->for(Product::factory()->state(['name' => 'Oud Royal']))->create();
        Order::factory()->withItem($amber, 2)->placedAt(now()->subDay())->create();
        $packLine = Order::factory()->placedAt(now()->subDay())->create()->items()->create([
            'type' => CartItemType::Pack, 'name' => 'Duo du Soir', 'unit_price' => 80000, 'quantity' => 1, 'line_total' => 80000,
        ]);
        foreach ([$amber, $oud] as $position => $variant) {
            $packLine->selections()->create([
                'product_id' => $variant->product_id, 'product_variant_id' => $variant->id, 'product_name' => 'Parfum',
                'size_ml' => 50, 'sku' => $variant->sku, 'unit_price' => $variant->price, 'position' => $position + 1,
            ]);
        }
        Order::factory()->cancelled()->withItem($oud, 5)->placedAt(now()->subDay())->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard');

        $response->assertOk()
            ->assertJsonPath('best_sellers', [
                ['product_id' => $amber->product_id, 'name' => 'Ambre Nuit', 'units' => 3],
                ['product_id' => $oud->product_id, 'name' => 'Oud Royal', 'units' => 1],
            ]);
    }

    public function test_low_stock_lists_active_variants_at_or_below_their_threshold(): void
    {
        $low = ProductVariant::factory()->lowStock()->create();
        $soldOut = ProductVariant::factory()->outOfStock()->create();
        ProductVariant::factory()->create(['stock' => 40]);
        ProductVariant::factory()->lowStock()->inactive()->create();
        ProductVariant::factory()->lowStock()->for(Product::factory()->trashed())->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard');

        $response->assertOk()
            ->assertJsonPath('low_stock.*.variant_id', [$soldOut->id, $low->id])
            ->assertJsonPath('low_stock.1.stock', 2)
            ->assertJsonPath('low_stock.1.threshold', 5);
    }

    public function test_setup_checklist_lists_what_remains_to_configure(): void
    {
        Product::factory()->demo()->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard');

        $response->assertOk()
            ->assertJsonPath('setup.*.done', [false, false, false, false])
            ->assertJsonPath('setup.2.label', 'Publier les pages légales (0/4)');
    }

    public function test_setup_checklist_is_complete_once_the_store_is_configured(): void
    {
        app(StoreSettings::class)->put(['contact.email' => 'contact@redone.ma']);
        City::factory()->create();
        foreach (['livraison', 'retours', 'conditions-generales-de-vente', 'confidentialite'] as $slug) {
            Page::create(['slug' => $slug, 'title' => ucfirst($slug), 'body' => 'Contenu.', 'is_published' => true]);
        }
        Product::factory()->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/dashboard');

        $response->assertOk()
            ->assertJsonPath('setup.*.done', [true, true, true, true])
            ->assertJsonPath('setup.2.label', 'Publier les pages légales (4/4)');
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
