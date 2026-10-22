<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Enums\InventoryReason;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class InventoryControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_adjust_in_set_mode_sets_the_stock_and_logs_the_difference(): void
    {
        $manager = $this->manager();
        $variant = ProductVariant::factory()->create(['stock' => 10, 'low_stock_threshold' => 5]);

        $response = $this->actingAs($manager)->postJson("/api/admin/inventory/{$variant->id}/adjust", [
            'mode' => 'set', 'quantity' => 4, 'note' => 'Inventaire annuel',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.stock', 4)
            ->assertJsonPath('data.availability', 'low_stock');
        $this->assertSame(4, $variant->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $variant->id, 'change' => -6, 'stock_after' => 4,
            'reason' => 'adjustment', 'user_id' => $manager->id, 'note' => 'Inventaire annuel',
        ]);
    }

    public function test_adjust_in_add_mode_records_a_restock(): void
    {
        $variant = ProductVariant::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->manager())->postJson("/api/admin/inventory/{$variant->id}/adjust", [
            'mode' => 'add', 'quantity' => 5,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.stock', 15);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $variant->id, 'change' => 5, 'stock_after' => 15, 'reason' => 'restock',
        ]);
    }

    public function test_adjust_in_remove_mode_records_a_negative_adjustment(): void
    {
        $variant = ProductVariant::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->manager())->postJson("/api/admin/inventory/{$variant->id}/adjust", [
            'mode' => 'remove', 'quantity' => 3, 'note' => 'Flacons cassés',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.stock', 7);
        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $variant->id, 'change' => -3, 'stock_after' => 7, 'reason' => 'adjustment', 'note' => 'Flacons cassés',
        ]);
    }

    public function test_adjust_removing_more_than_the_stock_returns_422_and_changes_nothing(): void
    {
        $variant = ProductVariant::factory()->create(['stock' => 2]);

        $response = $this->actingAs($this->manager())->postJson("/api/admin/inventory/{$variant->id}/adjust", [
            'mode' => 'remove', 'quantity' => 3,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['stock' => 'Le stock ne peut pas devenir négatif.']);
        $this->assertSame(2, $variant->fresh()->stock);
        $this->assertDatabaseCount('inventory_movements', 0);
    }

    public function test_adjust_setting_the_current_level_writes_no_movement(): void
    {
        $variant = ProductVariant::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->manager())->postJson("/api/admin/inventory/{$variant->id}/adjust", [
            'mode' => 'set', 'quantity' => 10,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.stock', 10);
        $this->assertDatabaseCount('inventory_movements', 0);
    }

    public function test_adjust_adding_zero_bottles_returns_422(): void
    {
        $variant = ProductVariant::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->manager())->postJson("/api/admin/inventory/{$variant->id}/adjust", [
            'mode' => 'add', 'quantity' => 0,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity' => 'Le champ quantité doit être supérieur ou égal à 1.']);
        $this->assertDatabaseCount('inventory_movements', 0);
    }

    #[TestWith(['low', 'low'])]
    #[TestWith(['out', 'out'])]
    public function test_index_filters_low_and_sold_out_variants(string $filter, string $expected): void
    {
        $variants = [
            'low' => ProductVariant::factory()->lowStock()->create(),
            'out' => ProductVariant::factory()->outOfStock()->create(),
            'comfortable' => ProductVariant::factory()->create(['stock' => 40]),
        ];

        $response = $this->actingAs($this->manager())->getJson("/api/admin/inventory?filter={$filter}");

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$variants[$expected]->id])
            ->assertJsonPath('counts', ['low' => 1, 'out' => 1]);
    }

    public function test_index_ignores_variants_of_archived_products(): void
    {
        $live = ProductVariant::factory()->outOfStock()->create();
        ProductVariant::factory()->outOfStock()->for(Product::factory()->trashed())->create();

        $response = $this->actingAs($this->manager())->getJson('/api/admin/inventory');

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$live->id])
            ->assertJsonPath('counts.out', 1);
    }

    public function test_movements_lists_the_variant_history_newest_first(): void
    {
        $manager = User::factory()->manager()->create(['name' => 'Yasmine Alaoui']);
        $variant = ProductVariant::factory()->create(['stock' => 9]);
        $order = Order::factory()->create();
        InventoryMovement::create([
            'product_variant_id' => $variant->id, 'change' => 10, 'stock_after' => 10, 'reason' => InventoryReason::Initial, 'user_id' => $manager->id,
        ]);
        InventoryMovement::create([
            'product_variant_id' => $variant->id, 'change' => -1, 'stock_after' => 9, 'reason' => InventoryReason::Sale, 'order_id' => $order->id,
        ]);

        $response = $this->actingAs($manager)->getJson("/api/admin/inventory/{$variant->id}/movements");

        $response->assertOk()
            ->assertJsonPath('data.*.reason', ['sale', 'initial'])
            ->assertJsonPath('data.*.order', [$order->reference, null])
            ->assertJsonPath('data.*.user', [null, 'Yasmine Alaoui']);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
