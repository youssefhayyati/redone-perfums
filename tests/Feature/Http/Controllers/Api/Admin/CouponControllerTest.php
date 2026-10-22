<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CouponControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_support_staff_gets_403_on_promotions(): void
    {
        $response = $this->actingAs(User::factory()->support()->create())->getJson('/api/admin/coupons');

        $response->assertForbidden();
    }

    public function test_store_uppercases_the_code_and_returns_201(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/coupons', [
            'code' => ' bienvenue10 ',
            'description' => 'Première commande',
            'type' => 'percent',
            'value' => 10,
            'min_subtotal' => 30000,
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'BIENVENUE10')
            ->assertJsonPath('data.used_count', 0)
            ->assertJsonPath('data.is_currently_valid', true);
        $this->assertDatabaseHas('coupons', [
            'code' => 'BIENVENUE10', 'type' => 'percent', 'value' => 10, 'min_subtotal' => 30000, 'is_active' => true,
        ]);
    }

    public function test_store_rejects_a_percentage_above_90_with_422(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/coupons', [
            'code' => 'MOINS95',
            'type' => 'percent',
            'value' => 95,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['value' => 'Le champ valeur ne doit pas être supérieur à 90.']);
        $this->assertDatabaseCount('coupons', 0);
    }

    public function test_store_accepts_a_fixed_amount_above_90(): void
    {
        $response = $this->actingAs($this->manager())->postJson('/api/admin/coupons', [
            'code' => 'CADEAU150',
            'type' => 'fixed',
            'value' => 15000,
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.value', 15000);
    }

    public function test_store_rejects_a_code_already_in_use_whatever_its_case_with_422(): void
    {
        Coupon::factory()->create(['code' => 'BIENVENUE10']);

        $response = $this->actingAs($this->manager())->postJson('/api/admin/coupons', [
            'code' => 'bienvenue10',
            'type' => 'percent',
            'value' => 15,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'La valeur du champ code est déjà utilisée.']);
        $this->assertDatabaseCount('coupons', 1);
    }

    public function test_index_flags_the_codes_usable_right_now(): void
    {
        $this->freezeTime();
        Coupon::factory()->create(['code' => 'VALIDE', 'created_at' => now()->subDays(4)]);
        Coupon::factory()->expired()->create(['code' => 'EXPIRE', 'created_at' => now()->subDays(3)]);
        Coupon::factory()->inactive()->create(['code' => 'INACTIF', 'created_at' => now()->subDays(2)]);
        Coupon::factory()->exhausted()->create(['code' => 'EPUISE', 'created_at' => now()->subDay()]);

        $response = $this->actingAs($this->manager())->getJson('/api/admin/coupons');

        $response->assertOk()
            ->assertJsonPath('data.*.code', ['EPUISE', 'INACTIF', 'EXPIRE', 'VALIDE'])
            ->assertJsonPath('data.*.is_currently_valid', [false, false, false, true]);
    }

    public function test_update_changes_the_coupon_terms(): void
    {
        $coupon = Coupon::factory()->percent(10)->create(['code' => 'BIENVENUE10']);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/coupons/{$coupon->id}", [
            'code' => 'BIENVENUE10',
            'type' => 'percent',
            'value' => 15,
            'max_uses' => 100,
            'is_active' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.value', 15)
            ->assertJsonPath('data.max_uses', 100);
        $this->assertDatabaseHas('coupons', ['id' => $coupon->id, 'value' => 15, 'max_uses' => 100]);
    }

    public function test_destroy_keeps_the_code_on_past_orders(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'BIENVENUE10']);
        $order = Order::factory()->create(['coupon_id' => $coupon->id, 'coupon_code' => 'BIENVENUE10']);

        $response = $this->actingAs($this->manager())->deleteJson("/api/admin/coupons/{$coupon->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Code supprimé.']);
        $this->assertModelMissing($coupon);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'coupon_id' => null, 'coupon_code' => 'BIENVENUE10']);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}
